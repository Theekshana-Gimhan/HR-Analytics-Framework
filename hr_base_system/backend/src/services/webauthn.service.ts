import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
    type VerifiedRegistrationResponse,
    type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
    RegistrationResponseJSON,
    AuthenticationResponseJSON,
    AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { prisma } from '../prismaClient';
import logger from '../utils/logger';

// Configuration - should be set via environment variables in production
const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'Simpala HR';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generates WebAuthn registration options for a user.
 * Returns options to be passed to the browser's navigator.credentials.create()
 */
export async function getRegistrationOptions(userId: number, userEmail: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
    try {
        logger.info('getRegistrationOptions (v2) called', { userId, userEmail, RP_NAME, RP_ID, ORIGIN });

        // Fetch existing authenticators for the user to exclude them
        const existingAuthenticators = await prisma.authenticator.findMany({
            where: { userId },
            select: { credentialId: true, transports: true },
        });

        logger.info('Found existing authenticators', { count: existingAuthenticators.length });

        // Generate userID buffer specifically
        const userIdBuffer = new TextEncoder().encode(String(userId));

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID: RP_ID,
            // userID is required in @simplewebauthn/server v13+ and must be a Uint8Array
            userID: userIdBuffer,
            userName: userEmail,
            userDisplayName: userEmail,
            // Exclude already-registered credentials
            // IMPORTANT: id must be a Base64URLString, not a raw Buffer
            excludeCredentials: existingAuthenticators.map((auth) => ({
                id: Buffer.from(auth.credentialId).toString('base64url'),
                transports: (auth.transports as AuthenticatorTransportFuture[]) || ['internal', 'hybrid'],
            })),
            authenticatorSelection: {
                // Prefer platform authenticators (TouchID, FaceID, Windows Hello)
                authenticatorAttachment: 'platform',
                requireResidentKey: true,
                residentKey: 'required',
                userVerification: 'preferred',
            },
            attestationType: 'none', // We don't need attestation for this POC
        });

        logger.info('Generated registration options', { challenge: options.challenge?.substring(0, 20) + '...' });

        // Store challenge for verification
        await prisma.webAuthnChallenge.create({
            data: {
                challenge: options.challenge,
                userId,
                type: 'registration',
                expiresAt: new Date(Date.now() + CHALLENGE_EXPIRY_MS),
            },
        });

        logger.info('Challenge stored successfully');

        return options;
    } catch (error) {
        logger.error('getRegistrationOptions failed', {
            error: error instanceof Error
                ? { name: error.name, message: error.message, stack: error.stack }
                : { type: typeof error, value: String(error), keys: Object.keys(error as object) },
            userId,
            userEmail,
            rpId: RP_ID,
            origin: ORIGIN,
        });
        throw error;
    }
}

/**
 * Verifies a WebAuthn registration response and stores the new authenticator.
 */
export async function verifyAndSaveRegistration(
    userId: number,
    response: RegistrationResponseJSON,
    friendlyName?: string
): Promise<{ verified: boolean; error?: string }> {
    // Find the challenge
    const storedChallenge = await prisma.webAuthnChallenge.findFirst({
        where: {
            userId,
            type: 'registration',
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
    });

    if (!storedChallenge) {
        return { verified: false, error: 'Challenge not found or expired' };
    }

    let verification: VerifiedRegistrationResponse;
    try {
        verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: storedChallenge.challenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
        });
    } catch (error) {
        logger.error('WebAuthn registration verification failed', { error });
        return { verified: false, error: 'Verification failed' };
    }

    if (!verification.verified || !verification.registrationInfo) {
        return { verified: false, error: 'Verification failed' };
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // Store the new authenticator
    // credential.id is a Base64URLString in v13 - decode to raw bytes for consistent DB storage
    await prisma.authenticator.create({
        data: {
            userId,
            credentialId: Buffer.from(credential.id, 'base64url'),
            credentialPublicKey: Buffer.from(credential.publicKey),
            counter: BigInt(credential.counter),
            credentialDeviceType,
            credentialBackedUp,
            transports: (response.response.transports as string[]) || [],
            aaguid: verification.registrationInfo.aaguid,
            friendlyName: friendlyName || 'Passkey',
        },
    });

    // Clean up the used challenge
    await prisma.webAuthnChallenge.delete({ where: { id: storedChallenge.id } });

    logger.info(`WebAuthn authenticator registered for user ${userId}`);
    return { verified: true };
}

/**
 * Generates WebAuthn authentication options.
 * Can be used for discoverable credentials (no userId) or specific user.
 */
export async function getAuthenticationOptions(userId?: number): Promise<PublicKeyCredentialRequestOptionsJSON> {
    // Type for allowCredentials that matches the library's expectations
    type AllowCredential = {
        id: string;
        transports?: AuthenticatorTransportFuture[];
    };

    let allowCredentials: AllowCredential[] | undefined;

    if (userId) {
        const authenticators = await prisma.authenticator.findMany({
            where: { userId },
            select: { credentialId: true, transports: true },
        });

        allowCredentials = authenticators.map((auth) => ({
            id: Buffer.from(auth.credentialId).toString('base64url'),
            transports: auth.transports as AuthenticatorTransportFuture[],
        }));
    }

    const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials,
        userVerification: 'preferred',
    });

    // Store challenge
    await prisma.webAuthnChallenge.create({
        data: {
            challenge: options.challenge,
            userId: userId ?? null,
            type: 'authentication',
            expiresAt: new Date(Date.now() + CHALLENGE_EXPIRY_MS),
        },
    });

    return options;
}

/**
 * Verifies a WebAuthn authentication response.
 * Returns the authenticated user if successful.
 */
export async function verifyAuthentication(
    response: AuthenticationResponseJSON,
    userId?: number
): Promise<{ verified: boolean; userId?: number; error?: string }> {
    // Find the authenticator by credential ID
    const credentialIdBuffer = Buffer.from(response.rawId, 'base64url');
    logger.info('WebAuthn auth: looking up credential', {
        rawId: response.rawId,
        bufferHex: credentialIdBuffer.toString('hex'),
        bufferLength: credentialIdBuffer.length,
    });

    const authenticator = await prisma.authenticator.findUnique({
        where: { credentialId: credentialIdBuffer },
        include: { user: { select: { id: true, email: true, role: true, companyId: true } } },
    });

    if (!authenticator) {
        logger.warn('WebAuthn auth: Authenticator not found for credential', {
            rawId: response.rawId,
            bufferHex: credentialIdBuffer.toString('hex'),
        });
        return { verified: false, error: 'Authenticator not found' };
    }

    // Find the challenge
    const storedChallenge = await prisma.webAuthnChallenge.findFirst({
        where: {
            type: 'authentication',
            expiresAt: { gt: new Date() },
            ...(userId ? { userId } : {}),
        },
        orderBy: { createdAt: 'desc' },
    });

    if (!storedChallenge) {
        return { verified: false, error: 'Challenge not found or expired' };
    }

    let verification: VerifiedAuthenticationResponse;
    try {
        verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: storedChallenge.challenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            credential: {
                // v13 expects id as Base64URLString, publicKey as Uint8Array
                id: Buffer.from(authenticator.credentialId).toString('base64url'),
                publicKey: new Uint8Array(authenticator.credentialPublicKey),
                counter: Number(authenticator.counter),
            },
        });
    } catch (error) {
        logger.error('WebAuthn authentication verification failed', { error });
        return { verified: false, error: 'Verification failed' };
    }

    if (!verification.verified) {
        return { verified: false, error: 'Verification failed' };
    }

    // Update the counter to prevent replay attacks
    await prisma.authenticator.update({
        where: { id: authenticator.id },
        data: {
            counter: BigInt(verification.authenticationInfo.newCounter),
            lastUsedAt: new Date(),
        },
    });

    // Clean up the used challenge
    await prisma.webAuthnChallenge.delete({ where: { id: storedChallenge.id } });

    logger.info(`WebAuthn authentication successful for user ${authenticator.userId}`);
    return { verified: true, userId: authenticator.userId };
}

/**
 * Gets all authenticators for a user.
 */
export async function getUserAuthenticators(userId: number) {
    return prisma.authenticator.findMany({
        where: { userId },
        select: {
            id: true,
            friendlyName: true,
            credentialDeviceType: true,
            createdAt: true,
            lastUsedAt: true,
        },
    });
}

/**
 * Deletes an authenticator.
 */
export async function deleteAuthenticator(userId: number, authenticatorId: number): Promise<boolean> {
    const result = await prisma.authenticator.deleteMany({
        where: { id: authenticatorId, userId },
    });
    return result.count > 0;
}

// Type exports for controller usage
export type PublicKeyCredentialCreationOptionsJSON = Awaited<ReturnType<typeof generateRegistrationOptions>>;
export type PublicKeyCredentialRequestOptionsJSON = Awaited<ReturnType<typeof generateAuthenticationOptions>>;
