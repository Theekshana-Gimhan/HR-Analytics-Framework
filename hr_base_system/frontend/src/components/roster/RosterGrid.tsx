
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    IconButton,
    CircularProgress,
    useTheme,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Card,
    CardContent,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Today, DragIndicator } from '@mui/icons-material';
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addWeeks,
    subWeeks,
    isSameDay,
    parseISO,
    subDays
} from 'date-fns';
import { rosterApi, employeesApi, shiftTemplatesApi, Employee, EmployeeShift, ShiftTemplate } from '../../lib/api';
import AssignShiftDialog from './AssignShiftDialog';
import { checkRestViolation } from '../../lib/rosterValidation';

const RosterGrid: React.FC = () => {
    const theme = useTheme();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shifts, setShifts] = useState<EmployeeShift[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [loading, setLoading] = useState(false);

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<{ id: number, name: string } | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Confirmation Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAssignment, setPendingAssignment] = useState<{ employeeId: number, date: string, templateId: number } | null>(null);
    const [validationWarning, setValidationWarning] = useState<string | null>(null);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [empData, rosterData, templateData] = await Promise.all([
                employeesApi.list({ limit: 100 }), // Fetch first 100 employees for roster view
                rosterApi.getRoster(format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')),
                shiftTemplatesApi.list()
            ]);
            setEmployees(empData.data);
            setShifts(rosterData);
            setTemplates(templateData);
        } catch (error) {
            console.error('Failed to load roster data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const handleToday = () => setCurrentDate(new Date());

    const handleCellClick = (employee: Employee, date: Date) => {
        setSelectedEmployee({ id: employee.id, name: `${employee.first_name} ${employee.last_name}` });
        setSelectedDate(format(date, 'yyyy-MM-dd'));
        setDialogOpen(true);
    };

    const getShiftForCell = (employeeId: number, date: Date) => {
        return shifts.find(s =>
            s.employeeId === employeeId &&
            isSameDay(parseISO(s.date), date)
        );
    };

    // --- Drag and Drop Logic ---

    const handleDragStart = (e: React.DragEvent, template: ShiftTemplate) => {
        e.dataTransfer.setData('application/json', JSON.stringify(template));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = async (e: React.DragEvent, employee: Employee, date: Date) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const templateData = e.dataTransfer.getData('application/json');

        if (!templateData) return;

        const template = JSON.parse(templateData) as ShiftTemplate;
        const dateStr = format(date, 'yyyy-MM-dd');

        // Validation Check
        // Find previous shift (Simple check: Shift on previous day)
        // Ideally we check specific times, but fetching specific previous shift might need optim.
        // We will check shifts in current view. If prev day is out of view, we might miss it in this client-side check.
        // For MVP, we check shifts loaded in `shifts` state.

        const prevDate = subDays(date, 1);
        const prevShift = getShiftForCell(employee.id, prevDate);

        const validation = checkRestViolation(prevShift, dateStr, template);

        if (!validation.valid) {
            setValidationWarning(validation.message || 'Rest violation detected.');
            setPendingAssignment({ employeeId: employee.id, date: dateStr, templateId: template.id });
            setConfirmOpen(true);
            return;
        }

        await assignShift(employee.id, dateStr, template.id);
    };

    const assignShift = async (employeeId: number, date: string, templateId: number) => {
        try {
            await rosterApi.assignShift({
                employeeId,
                date,
                shiftTemplateId: templateId
            });
            // Optimistic update or refetch
            fetchData();
        } catch (error) {
            console.error('Failed to assign shift', error);
            alert('Failed to assign shift');
        }
    };

    const handleConfirmAssignment = async () => {
        if (pendingAssignment) {
            await assignShift(pendingAssignment.employeeId, pendingAssignment.date, pendingAssignment.templateId);
            setConfirmOpen(false);
            setPendingAssignment(null);
            setValidationWarning(null);
        }
    };

    return (
        <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Shift Templates Sidebar */}
            <Paper sx={{ width: 250, p: 2, flexShrink: 0, height: 'fit-content' }}>
                <Typography variant="h6" gutterBottom>Shift Templates</Typography>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
                    Drag templates to grid
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {templates.map(template => (
                        <Card
                            key={template.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, template)}
                            sx={{
                                cursor: 'grab',
                                borderLeft: `4px solid ${template.color || theme.palette.primary.main}`,
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                        >
                            <CardContent sx={{ p: 1, '&:last-child': { p: 1 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" fontWeight="bold">{template.name}</Typography>
                                    <DragIndicator fontSize="small" color="action" />
                                </Box>
                                <Typography variant="caption" color="textSecondary">
                                    {template.startTime} - {template.endTime}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                    {templates.length === 0 && (
                        <Typography variant="body2" color="textSecondary" align="center">
                            No templates found. Create some in "Shift Templates" tab.
                        </Typography>
                    )}
                </Box>
            </Paper>

            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                {/* Header Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h5">
                        {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                    </Typography>
                    <Box>
                        <IconButton onClick={handlePrevWeek}><ChevronLeft /></IconButton>
                        <Button startIcon={<Today />} onClick={handleToday}>Today</Button>
                        <IconButton onClick={handleNextWeek}><ChevronRight /></IconButton>
                    </Box>
                </Box>

                {/* Grid Container */}
                <Paper sx={{ overflowX: 'auto' }}>
                    <Box sx={{ minWidth: 800 }}>
                        {/* Header Row */}
                        <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider' }}>
                            <Box sx={{ width: 200, p: 2, fontWeight: 'bold', borderRight: 1, borderColor: 'divider', position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                                Employee
                            </Box>
                            {weekDays.map(day => (
                                <Box key={day.toString()} sx={{ flex: 1, p: 1, textAlign: 'center', borderRight: 1, borderColor: 'divider', minWidth: 100 }}>
                                    <Typography variant="subtitle2">{format(day, 'EEE')}</Typography>
                                    <Typography variant="body2" color="textSecondary">{format(day, 'd')}</Typography>
                                </Box>
                            ))}
                        </Box>

                        {/* Body Rows */}
                        {loading ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
                        ) : (
                            employees.map(emp => (
                                <Box key={emp.id} sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
                                    <Box sx={{ width: 200, p: 2, borderRight: 1, borderColor: 'divider', position: 'sticky', left: 0, bgcolor: 'background.paper' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{emp.first_name} {emp.last_name}</Typography>
                                        <Typography variant="caption" color="textSecondary">{emp.job_title}</Typography>
                                    </Box>
                                    {weekDays.map(day => {
                                        const shift = getShiftForCell(emp.id, day);
                                        return (
                                            <Box
                                                key={day.toString()}
                                                onClick={() => handleCellClick(emp, day)}
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, emp, day)}
                                                sx={{
                                                    flex: 1,
                                                    p: 0.5,
                                                    borderRight: 1,
                                                    borderColor: 'divider',
                                                    minWidth: 100,
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.2s',
                                                    '&.drag-over': {
                                                        bgcolor: 'primary.light',
                                                        opacity: 0.5
                                                    }
                                                }}
                                            >
                                                {shift && shift.shiftTemplate ? (
                                                    <Box
                                                        sx={{
                                                            bgcolor: shift.shiftTemplate.color || theme.palette.primary.main,
                                                            color: '#fff',
                                                            p: 1,
                                                            borderRadius: 1,
                                                            height: '100%',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            justifyContent: 'center',
                                                            fontSize: '0.75rem'
                                                        }}
                                                    >
                                                        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
                                                            {shift.shiftTemplate.name}
                                                        </Typography>
                                                        <Typography variant="caption">
                                                            {shift.shiftTemplate.startTime}-{shift.shiftTemplate.endTime}
                                                        </Typography>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}>
                                                        <Typography variant="caption" color="textSecondary">+</Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            ))
                        )}
                    </Box>
                </Paper>
            </Box>

            {/* Assign Dialog */}
            {selectedEmployee && selectedDate && (
                <AssignShiftDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSuccess={fetchData}
                    employeeId={selectedEmployee.id}
                    employeeName={selectedEmployee.name}
                    date={selectedDate}
                />
            )}

            {/* Validation Warning Dialog */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle sx={{ color: 'warning.main' }}>Warning: Rest Violation</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {validationWarning}
                        <br />
                        Do you want to proceed with this assignment?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirmAssignment} color="warning" variant="contained">Proceed</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RosterGrid;
