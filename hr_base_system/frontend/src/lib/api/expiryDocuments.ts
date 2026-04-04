import apiClient from '../apiClient';

export interface ExpiryDocument {
  id: number;
  employeeId: number;
  documentId: number | null;
  documentType: string;
  name: string;
  issueDate: string | null;
  expiryDate: string;
  alertDaysBefore: number;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'RENEWED';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    job_title: string;
    department: string | null;
  };
}

export interface ExpiryDocumentListParams {
  employeeId?: number;
  status?: string;
  documentType?: string;
  expiringWithinDays?: number;
  limit?: number;
  offset?: number;
}

export interface ExpiryDocumentListResponse {
  documents: ExpiryDocument[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExpiryDocumentSummary {
  valid: number;
  expiringSoon: number;
  expired: number;
  total: number;
}

export interface CreateExpiryDocumentData {
  employeeId: number;
  documentType: string;
  name: string;
  issueDate?: string;
  expiryDate: string;
  alertDaysBefore?: number;
  notes?: string;
}

export interface UpdateExpiryDocumentData {
  documentType?: string;
  name?: string;
  issueDate?: string;
  expiryDate?: string;
  alertDaysBefore?: number;
  notes?: string;
  status?: string;
}

export const expiryDocumentApi = {
  list: async (params: ExpiryDocumentListParams = {}): Promise<ExpiryDocumentListResponse> => {
    const response = await apiClient.get<ExpiryDocumentListResponse>('/expiry-documents', { params });
    return response.data;
  },

  summary: async (): Promise<ExpiryDocumentSummary> => {
    const response = await apiClient.get<ExpiryDocumentSummary>('/expiry-documents/summary');
    return response.data;
  },

  getById: async (id: number): Promise<ExpiryDocument> => {
    const response = await apiClient.get<ExpiryDocument>(`/expiry-documents/${id}`);
    return response.data;
  },

  create: async (data: CreateExpiryDocumentData): Promise<ExpiryDocument> => {
    const response = await apiClient.post<ExpiryDocument>('/expiry-documents', data);
    return response.data;
  },

  update: async (id: number, data: UpdateExpiryDocumentData): Promise<ExpiryDocument> => {
    const response = await apiClient.patch<ExpiryDocument>(`/expiry-documents/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/expiry-documents/${id}`);
  },
};
