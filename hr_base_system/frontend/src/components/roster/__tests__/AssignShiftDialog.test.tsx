import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AssignShiftDialog from '../AssignShiftDialog';
import { rosterApi, shiftTemplatesApi } from '../../../lib/api';

// Mock API
vi.mock('../../../lib/api', () => ({
    rosterApi: {
        assignShift: vi.fn(),
    },
    shiftTemplatesApi: {
        list: vi.fn(),
    },
}));

describe('AssignShiftDialog', () => {
    const mockTemplates = [
        { id: 1, name: 'Morning', startTime: '08:00', endTime: '16:00', color: '#ff0000' },
        { id: 2, name: 'Night', startTime: '20:00', endTime: '04:00', color: '#0000ff' },
    ];

    const defaultProps = {
        open: true,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        employeeId: 101,
        employeeName: 'John Doe',
        date: '2023-10-27',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // @ts-expect-error - mock setup uses loose typing
        (shiftTemplatesApi.list).mockResolvedValue(mockTemplates);
    });

    it('renders with employee name and date', async () => {
        render(<AssignShiftDialog {...defaultProps} />);

        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
        expect(screen.getByText(/2023-10-27/)).toBeInTheDocument();
        expect(screen.getByText('Assign Shift')).toBeInTheDocument();
    });

    it('loads and displays shift templates', async () => {
        render(<AssignShiftDialog {...defaultProps} />);

        // Open select dropdown. Material UI Select uses a hidden input and a display element.
        // We usually click the label or the select display area.
        const selectLabel = screen.getByLabelText('Shift Template');
        fireEvent.mouseDown(selectLabel); // Material UI Select often responds to mouseDown

        await waitFor(() => {
            expect(screen.getByText('Morning (08:00 - 16:00)')).toBeInTheDocument();
            expect(screen.getByText('Night (20:00 - 04:00)')).toBeInTheDocument();
        });
    });

    it('validates form on submit without selection', async () => {
        render(<AssignShiftDialog {...defaultProps} />);

        fireEvent.click(screen.getByText('Assign'));

        await waitFor(() => {
            // The schema says: z.number().min(1, 'Shift template is required')
            // The default value is 0.
            expect(screen.getByText('Shift template is required')).toBeInTheDocument();
        });
    });

    it('submits form successfully when template selected', async () => {
        // @ts-expect-error - mock setup uses loose typing
        (rosterApi.assignShift).mockResolvedValue({});

        render(<AssignShiftDialog {...defaultProps} />);

        // Select a template
        const selectLabel = screen.getByLabelText('Shift Template');
        fireEvent.mouseDown(selectLabel);

        await waitFor(() => {
            screen.getByText('Morning (08:00 - 16:00)').click();
        });

        fireEvent.click(screen.getByText('Assign'));

        await waitFor(() => {
            expect(rosterApi.assignShift).toHaveBeenCalledWith({
                employeeId: 101,
                shiftTemplateId: 1,
                date: '2023-10-27',
            });
            expect(defaultProps.onSuccess).toHaveBeenCalled();
            expect(defaultProps.onClose).toHaveBeenCalled();
        });
    });
});
