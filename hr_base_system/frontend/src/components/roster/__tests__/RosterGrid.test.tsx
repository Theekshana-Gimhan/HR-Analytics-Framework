
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import RosterGrid from '../RosterGrid';
import { rosterApi, employeesApi, shiftTemplatesApi } from '../../../lib/api';

// Mock @mui/icons-material to avoid EMFILE error from barrel import
vi.mock('@mui/icons-material', () => ({
    ChevronLeft: () => <span data-testid="icon-chevron-left" />,
    ChevronRight: () => <span data-testid="icon-chevron-right" />,
    Today: () => <span data-testid="icon-today" />,
    DragIndicator: () => <span data-testid="icon-drag" />,
}));

// Mock API modules
vi.mock('../../../lib/api', () => ({
    rosterApi: {
        getRoster: vi.fn(),
        assignShift: vi.fn(),
    },
    employeesApi: {
        list: vi.fn(),
    },
    shiftTemplatesApi: {
        list: vi.fn(),
    },
}));

// Mock child components to isolate RosterGrid logic or keep them if integration is desired.
// For unit testing RosterGrid, we might want to mock AssignShiftDialog to avoid its internal logic.
vi.mock('../AssignShiftDialog', () => ({
    default: ({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) => (
        open ? (
            <div data-testid="assign-shift-dialog">
                <button onClick={onClose}>Close</button>
                <button onClick={onSuccess}>Assign</button>
            </div>
        ) : null
    ),
}));

describe('RosterGrid', () => {
    const mockEmployees = [
        { id: 1, first_name: 'John', last_name: 'Doe', job_title: 'Developer' },
        { id: 2, first_name: 'Jane', last_name: 'Smith', job_title: 'Designer' },
    ];

    const mockShifts = [
        {
            id: 1,
            employeeId: 1,
            shiftTemplateId: 101,
            date: new Date().toISOString().split('T')[0], // Today
            shiftTemplate: {
                id: 101,
                name: 'Morning',
                startTime: '08:00',
                endTime: '16:00',
                color: '#ff0000',
            },
        },
    ];

    const mockTemplates = [
        { id: 101, name: 'Morning', startTime: '08:00', endTime: '16:00' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // @ts-expect-error - mock setup uses loose typing
        vi.mocked(employeesApi.list).mockResolvedValue({ data: mockEmployees });
        // @ts-expect-error - mock setup uses loose typing
        vi.mocked(rosterApi.getRoster).mockResolvedValue(mockShifts);
        // @ts-expect-error - mock setup uses loose typing
        vi.mocked(shiftTemplatesApi.list).mockResolvedValue(mockTemplates);
    });

    it('renders employee names', async () => {
        render(<RosterGrid />);

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });
    });

    it('renders shifts correctly', async () => {
        render(<RosterGrid />);

        await waitFor(() => {
            expect(screen.getAllByText('Morning').length).toBeGreaterThan(0);
            expect(screen.getByText('08:00-16:00')).toBeInTheDocument();
        });
    });

    it('opens assign dialog on cell click', async () => {
        render(<RosterGrid />);

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        // Find a cell. In the real component, cells are clickable. 
        // We might need a more specific selector or add data-testid to cells in the source if possible.
        // For now, let's try to find the cell by its content or structure.
        // The empty cells display "+" with opacity 0.
        const cells = screen.getAllByText('+');
        // Click the first one (John Doe's first day)
        cells[0].click();

        await waitFor(() => {
            expect(screen.getByTestId('assign-shift-dialog')).toBeInTheDocument();
        });
    });
});
