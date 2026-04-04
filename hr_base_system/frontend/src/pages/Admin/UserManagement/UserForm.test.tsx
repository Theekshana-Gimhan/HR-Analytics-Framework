import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserForm from './UserForm';
import * as hooks from '../../../lib/api/hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FeedbackProvider from '../../../app/providers/FeedbackProvider';
import React from 'react';

// Mock hooks
vi.mock('../../../lib/api/hooks', () => ({
    useCreateUser: vi.fn(),
    useUpdateUser: vi.fn(),
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const renderWithClient = (ui: React.ReactElement) => {
    return render(
        <QueryClientProvider client={queryClient}>
            <FeedbackProvider>
                {ui}
            </FeedbackProvider>
        </QueryClientProvider>
    );
};

describe('UserForm Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(hooks.useCreateUser).mockReturnValue({
            mutate: vi.fn(),
            isPending: false,
        } as Partial<ReturnType<typeof hooks.useCreateUser>> as ReturnType<typeof hooks.useCreateUser>);
        vi.mocked(hooks.useUpdateUser).mockReturnValue({
            mutate: vi.fn(),
            isPending: false,
        } as Partial<ReturnType<typeof hooks.useUpdateUser>> as ReturnType<typeof hooks.useUpdateUser>);
    });

    it('renders create user form correctly', () => {
        renderWithClient(<UserForm open={true} onClose={vi.fn()} />);

        expect(screen.getByText('Create User')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        // MUI Select uses role="combobox" and aria-labelledby or label
        // Sometimes it's hard to get by label text directly if htmlFor is slightly off in test env
        // We can try getByRole('combobox') or just check if "Role" text is present as label
        expect(screen.getByRole('combobox', { name: /role/i })).toBeInTheDocument();
        expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('renders edit user form correctly', () => {
        const user = { id: 1, email: 'test@example.com', role: 'ADMIN' as const, isActive: true, companyId: 1 };
        renderWithClient(<UserForm open={true} onClose={vi.fn()} user={user} />);

        expect(screen.getByText('Edit User')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
        expect(screen.queryByLabelText('Password')).not.toBeInTheDocument(); // Password field hidden in edit
        expect(screen.getByLabelText('Active')).toBeInTheDocument();
        expect(screen.getByText('Update')).toBeInTheDocument();
    });

    // Add more interaction tests if needed, but basic rendering is good for now
});
