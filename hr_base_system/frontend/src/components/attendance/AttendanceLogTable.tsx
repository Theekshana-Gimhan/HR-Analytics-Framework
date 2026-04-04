
import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Alert,
    Tooltip,
} from '@mui/material';
import { AccessTime as TimeIcon } from '@mui/icons-material';

interface DailyLogItem {
    employeeId: number;
    firstName: string;
    lastName: string;
    department: string;
    jobTitle: string;
    shiftStartTime: string | null;
    shiftEndTime: string | null;
    checkInTime: string | null;
    checkOutTime: string | null;
    status: string;
    isLate: boolean;
    attendanceId?: number;
}

interface AttendanceLogTableProps {
    data?: DailyLogItem[];
}

const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const AttendanceLogTable: React.FC<AttendanceLogTableProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <Alert severity="info" sx={{ mt: 2 }}>
                No records found for this date.
            </Alert>
        );
    }

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Shift Start</TableCell>
                        <TableCell>Check In</TableCell>
                        <TableCell>Check Out</TableCell>
                        <TableCell>Status</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((row) => (
                        <TableRow key={row.employeeId} hover>
                            <TableCell sx={{ fontWeight: 500 }}>
                                {row.firstName} {row.lastName}
                                <br />
                                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{row.jobTitle}</span>
                            </TableCell>
                            <TableCell>{row.department}</TableCell>
                            <TableCell>{row.shiftStartTime || '-'}</TableCell>
                            <TableCell>
                                <span style={{
                                    color: row.isLate ? '#EF4444' : 'inherit',
                                    fontWeight: row.isLate ? 600 : 400
                                }}>
                                    {formatTime(row.checkInTime)}
                                </span>
                            </TableCell>
                            <TableCell>{formatTime(row.checkOutTime)}</TableCell>
                            <TableCell>
                                {row.isLate ? (
                                    <Tooltip title="Checked in after grace period">
                                        <Chip
                                            icon={<TimeIcon />}
                                            label="LATE"
                                            color="error"
                                            size="small"
                                            variant="outlined"
                                        />
                                    </Tooltip>
                                ) : (
                                    <Chip
                                        label={row.status}
                                        color={
                                            row.status === 'PRESENT' ? 'success' :
                                                row.status === 'ABSENT' ? 'error' :
                                                    row.status === 'ON_LEAVE' ? 'info' :
                                                        'default'
                                        }
                                        size="small"
                                    />
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default AttendanceLogTable;
