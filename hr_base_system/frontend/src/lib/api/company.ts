import apiClient from '../apiClient';

export interface CompanySettings {
    id: number;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    registrationNumber?: string;
    taxId?: string;
    logoUrl?: string;
    country?: string;
    currency?: string;
}

export type UpdateCompanySettingsData = Omit<CompanySettings, 'id'>;

export const companyApi = {
    getSettings: async (): Promise<CompanySettings> => {
        const response = await apiClient.get('/company/settings');
        return response.data.data.settings;
    },

    updateSettings: async (data: UpdateCompanySettingsData): Promise<CompanySettings> => {
        const response = await apiClient.put('/company/settings', data);
        return response.data.data.settings;
    },
};
