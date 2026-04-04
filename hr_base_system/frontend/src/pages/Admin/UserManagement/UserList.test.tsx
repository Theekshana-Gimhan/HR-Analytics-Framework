import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserList from './UserList';
import * as hooks from '../../../lib/api/hooks';
import { UsersResponse } from '../../../lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FeedbackProvider from '../../../app/providers/FeedbackProvider';
import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

// Mock @mui/x-data-grid to avoid CSS import error in test environment
vi.mock('@mui/x-data-grid', () => ({
    DataGrid: ({ rows, columns, loading }: { rows: AnyRecord[]; columns: AnyRecord[]; loading?: boolean }) => (
        <div data-testid="data-grid">
            {loading ? <span>Loading...</span> : rows.map((row) => (
                <div key={row.id} data-testid={`row-${row.id}`}>
                    {columns.map((col) => {
                        const field = col.field as string;
                        if (col.renderCell) {
                            return <span key={field}>{col.renderCell({ value: row[field], row })}</span>;
                        }
                        if (col.valueGetter) {
                            return <span key={field}>{col.valueGetter(null, row)}</span>;
                        }
                        return <span key={field}>{String(row[field] ?? '')}</span>;
                    })}
                </div>
            ))}
        </div>
    ),
}));

// Mock hooks
vi.mock('../../../lib/api/hooks', () => ({
    useUsers: vi.fn(),
    useDeleteUser: vi.fn(),
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

describe('UserList Component', () => {
    const mockUsers: UsersResponse = {
        data: [
            { id: 1, email: 'test@example.com', role: 'ADMIN', isActive: true, companyId: 1 },
            { id: 2, email: 'user@example.com', role: 'EMPLOYEE', isActive: false, companyId: 1, employee: { id: 100, first_name: 'John', last_name: 'Doe' } },
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(hooks.useUsers).mockReturnValue({
            data: mockUsers,
            isLoading: false,
            error: null,
        } as Partial<ReturnType<typeof hooks.useUsers>> as ReturnType<typeof hooks.useUsers>);
        vi.mocked(hooks.useDeleteUser).mockReturnValue({
            mutate: vi.fn(),
            isPending: false,
        } as Partial<ReturnType<typeof hooks.useDeleteUser>> as ReturnType<typeof hooks.useDeleteUser>);
    });

    it('renders user list correctly', async () => {
        renderWithClient(<UserList onEdit={vi.fn()} onCreate={vi.fn()} />);

        expect(screen.getByText('Users')).toBeInTheDocument();
        expect(screen.getByText('Create User')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('test@example.com')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Active')).toBeInTheDocument();
            expect(screen.getByText('Inactive')).toBeInTheDocument();
        });
    });

    it('calls onCreate when create button is clicked', async () => {
        const onCreate = vi.fn();
        renderWithClient(<UserList onEdit={vi.fn()} onCreate={onCreate} />);

        fireEvent.click(screen.getByText('Create User'));
        expect(onCreate).toHaveBeenCalled();
    });
});
