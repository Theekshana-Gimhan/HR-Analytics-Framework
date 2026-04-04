export const AUTH_TOKEN_KEY = import.meta.env.VITE_AUTH_STORAGE_KEY ?? 'token';
export const AUTH_REFRESH_TOKEN_KEY = 'refreshToken';
export const AUTH_ROLE_KEY = import.meta.env.VITE_AUTH_ROLE_KEY ?? 'userRole';
export const AUTH_COMPANY_ID_KEY = 'companyId';

export const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';
