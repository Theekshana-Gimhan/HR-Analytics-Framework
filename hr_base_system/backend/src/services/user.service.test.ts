import { prisma as mockPrisma } from '../__mocks__/prisma';
import { Role } from '@prisma/client';
import { createUser, getAllUsers, getUserById, updateUser, deleteUser } from './user.service';
import bcrypt from 'bcrypt';

// Mock prismaClient
jest.mock('../prismaClient', () => ({ prisma: mockPrisma }));

// Mock bcrypt
jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashedPassword'),
    compare: jest.fn().mockResolvedValue(true),
}));

describe('UserService Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createUser', () => {
        it('should create a new user with hashed password', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'Password123!',
                role: 'ADMIN' as Role,
                companyId: 1,
            };

            const expectedUser = {
                id: 1,
                email: userData.email,
                role: userData.role,
                isActive: true,
                companyId: userData.companyId,
                password_hash: 'hashedPassword',
                created_at: new Date(),
                updated_at: new Date(),
            };

            (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            (mockPrisma.user.create as jest.Mock).mockResolvedValue(expectedUser);

            const result = await createUser(userData);

            expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
            expect(mockPrisma.user.create).toHaveBeenCalledWith({
                data: {
                    email: userData.email,
                    password_hash: 'hashedPassword',
                    role: userData.role,
                    companyId: userData.companyId,
                    isActive: true, // Should default to true or be set explicitly
                },
            });
            expect(result).toEqual(expectedUser);
        });

        it('should create a user linked to an employee', async () => {
            const userData = {
                email: 'employee@example.com',
                password: 'Password123!',
                role: 'EMPLOYEE' as Role,
                companyId: 1,
                employeeId: 100,
            };

            const expectedUser = {
                id: 2,
                email: userData.email,
                role: userData.role,
                isActive: true,
                companyId: userData.companyId,
                employeeId: userData.employeeId,
                password_hash: 'hashedPassword',
                created_at: new Date(),
                updated_at: new Date(),
            };

            (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            (mockPrisma.user.create as jest.Mock).mockResolvedValue(expectedUser);

            await createUser(userData);

            expect(mockPrisma.user.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    employee: { connect: { id: userData.employeeId } },
                }),
            });
        });
    });

    describe('getAllUsers', () => {
        it('should return paginated users', async () => {
            const users = [
                { id: 1, email: 'user1@example.com', role: 'ADMIN', isActive: true, companyId: 1, employee: null },
                { id: 2, email: 'user2@example.com', role: 'EMPLOYEE', isActive: true, companyId: 1, employee: { id: 100, first_name: 'John', last_name: 'Doe' } },
            ];

            (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(users);
            (mockPrisma.user.count as jest.Mock).mockResolvedValue(2);

            const result = await getAllUsers(1, 10, 1);

            expect(result.items).toHaveLength(2);
            expect(result.total).toBe(2);
            expect(mockPrisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
                skip: 0,
                take: 10,
                where: { companyId: 1 },
            }));
        });

        it('should filter users by query', async () => {
            const query = 'john';
            await getAllUsers(1, 10, 1, query);

            expect(mockPrisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    companyId: 1,
                    OR: [
                        { email: { contains: query, mode: 'insensitive' } },
                        { employee: { first_name: { contains: query, mode: 'insensitive' } } },
                        { employee: { last_name: { contains: query, mode: 'insensitive' } } },
                    ]
                }),
            }));
        });
    });

    describe('getUserById', () => {
        it('should return user by ID', async () => {
            const user = { id: 1, email: 'test@example.com', role: 'ADMIN', companyId: 1 };
            (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(user);

            const result = await getUserById(1);

            expect(result).toEqual(user);
            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
                include: { employee: true },
            });
        });

        it('should return null if user not found', async () => {
            (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            const result = await getUserById(999);
            expect(result).toBeNull();
        });
    });

    describe('updateUser', () => {
        it('should update user details', async () => {
            const updateData = { role: 'EMPLOYEE' as Role, isActive: false };
            const updatedUser = { id: 1, ...updateData };

            (mockPrisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

            const result = await updateUser(1, updateData);

            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: updateData,
            });
            expect(result).toEqual(updatedUser);
        });
    });

    describe('deleteUser', () => {
        it('should soft delete user by setting isActive to false', async () => {
            await deleteUser(1);
            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { isActive: false },
            });
        });
    });
});
