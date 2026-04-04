import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, AUTH_TOKEN_KEY, AUTH_REFRESH_TOKEN_KEY } from '../config/constants';
import { clearSession } from './auth';

// Custom error class for API errors with user-friendly messages
export class ApiError extends Error {
  status: number;
  userMessage: string;
  
  constructor(status: number, message: string, userMessage: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.userMessage = userMessage;
  }
}

// Helper to get user-friendly error messages
const getUserFriendlyMessage = (status: number, serverMessage?: string): string => {
  // If server provided a message, use it (unless it's a generic 500)
  if (serverMessage && status !== 500) {
    return serverMessage;
  }

  switch (status) {
    case 400:
      return serverMessage || 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You don\'t have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return serverMessage || 'This action conflicts with existing data.';
    case 422:
      return serverMessage || 'The submitted data is invalid.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'An unexpected server error occurred. Our team has been notified. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'The server is temporarily unavailable. Please try again in a few moments.';
    default:
      if (status >= 500) {
        return 'A server error occurred. Please try again later.';
      }
      return serverMessage || 'An unexpected error occurred. Please try again.';
  }
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (token) {
    const headers =
      config.headers instanceof AxiosHeaders
        ? config.headers
        : new AxiosHeaders(config.headers);

    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});

export default apiClient;

// Track whether a token refresh is already in progress to avoid concurrent refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Simple retry-once for GET requests on network errors or 5xx
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { __retried?: boolean; __refreshRetried?: boolean };
    const status = error.response?.status;

    // Handle network errors (no response)
    if (!error.response) {
      const isGet = (originalRequest?.method || 'get').toLowerCase() === 'get';
      const networkError = new ApiError(
        0,
        'Network error',
        'Unable to connect to the server. Please check your internet connection.'
      );
      
      // Retry logic for GET requests when offline
      if (isGet && !originalRequest?.__retried) {
        originalRequest.__retried = true;
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          await new Promise<void>((resolve) => {
            const handler = () => {
              window.removeEventListener('online', handler);
              resolve();
            };
            window.addEventListener('online', handler);
            // Timeout after 30 seconds to avoid hanging indefinitely
            setTimeout(() => {
              window.removeEventListener('online', handler);
              resolve();
            }, 30000);
          });
        } else {
          await new Promise((r) => setTimeout(r, 400));
        }
        return apiClient.request(originalRequest);
      }
      
      return Promise.reject(networkError);
    }

    // Handle 401 Unauthorized — attempt token refresh before logging out
    if (status === 401 && originalRequest && !originalRequest.__refreshRetried) {
      // Don't try to refresh if the failing request was itself the refresh call
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        clearSession();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Another refresh is in progress — queue this request
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            const headers = originalRequest.headers instanceof AxiosHeaders
              ? originalRequest.headers
              : new AxiosHeaders(originalRequest.headers);
            headers.set('Authorization', `Bearer ${token}`);
            originalRequest.headers = headers;
            return apiClient.request(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      originalRequest.__refreshRetried = true;

      const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        isRefreshing = false;
        processQueue(error, null);
        clearSession();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<{
          accessToken: string;
          refreshToken: string;
        }>(`${API_BASE_URL}/auth/refresh`, { refreshToken });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem(AUTH_TOKEN_KEY, newAccessToken);
        localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, newRefreshToken);

        isRefreshing = false;
        processQueue(null, newAccessToken);

        // Retry the original request with the new token
        const headers = originalRequest.headers instanceof AxiosHeaders
          ? originalRequest.headers
          : new AxiosHeaders(originalRequest.headers);
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        originalRequest.headers = headers;
        return apiClient.request(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        clearSession();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Extract server message if available
    const serverMessage = (error.response?.data as { message?: string } | undefined)?.message;
    const userMessage = getUserFriendlyMessage(status || 500, serverMessage);

    // Retry logic for 5xx errors on GET requests
    const isGet = (originalRequest?.method || 'get').toLowerCase() === 'get';
    const networkOr5xx = status !== undefined && status >= 500 && status < 600;
    if (isGet && networkOr5xx && !originalRequest?.__retried) {
      originalRequest.__retried = true;
      await new Promise((r) => setTimeout(r, 400));
      return apiClient.request(originalRequest);
    }

    // Enhance the error with user-friendly message
    const enhancedError = error as AxiosError & { userMessage?: string };
    enhancedError.userMessage = userMessage;
    
    return Promise.reject(enhancedError);
  }
);

/**
 * Helper function to extract user-friendly error message from any error
 * Use this in catch blocks to get a message suitable for displaying to users
 */
export const getErrorMessage = (error: unknown): string => {
  // Check for our enhanced error with userMessage
  if (error && typeof error === 'object' && 'userMessage' in error) {
    return (error as { userMessage: string }).userMessage;
  }
  
  // Check for ApiError
  if (error instanceof ApiError) {
    return error.userMessage;
  }
  
  // Check for Axios error with response
  if (axios.isAxiosError(error)) {
    const serverMessage = error.response?.data?.message;
    const status = error.response?.status || 500;
    return getUserFriendlyMessage(status, serverMessage);
  }
  
  // Check for standard Error
  if (error instanceof Error) {
    return error.message;
  }
  
  // Fallback
  return 'An unexpected error occurred. Please try again.';
};
