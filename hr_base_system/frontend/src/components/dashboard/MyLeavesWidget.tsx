
import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    LinearProgress,
    Grid,
    Skeleton,
} from '@mui/material';
import { Add as AddIcon, EventAvailable as LeaveIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSelfLeaveBalance } from '../../lib/api/hooks';
import type { SelfLeaveBalance } from '../../lib/api/leave';

interface MyLeavesWidgetProps {
    onApplyLeave?: () => void;
}

const BALANCE_COLORS = ['primary', 'warning', 'success', 'info', 'error'] as const;

const MyLeavesWidget: React.FC<MyLeavesWidgetProps> = ({ onApplyLeave }) => {
    const theme = useTheme();
    const { data: balances, isLoading } = useSelfLeaveBalance();

    return (
        <Card elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 2,
                                bgcolor: theme.palette.primary.light + '20',
                                color: theme.palette.primary.main
                            }}
                        >
                            <LeaveIcon />
                        </Box>
                        <Typography variant="h6" fontWeight="600">
                            My Leaves
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={onApplyLeave}
                        size="small"
                    >
                        Apply Leave
                    </Button>
                </Box>

                {isLoading ? (
                    <Grid container spacing={3}>
                        {[1, 2, 3].map((i) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={i}>
                                <Skeleton variant="rounded" height={90} />
                            </Grid>
                        ))}
                    </Grid>
                ) : !balances || balances.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                        No leave balances configured yet.
                    </Typography>
                ) : (
                    <Grid container spacing={3}>
                        {balances.map((balance: SelfLeaveBalance, index: number) => {
                            const total = balance.accrued + balance.carriedForward;
                            const used = balance.used;
                            const remaining = total - used;
                            const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
                            const colorKey = BALANCE_COLORS[index % BALANCE_COLORS.length];
                            const color = theme.palette[colorKey].main;

                            return (
                                <Grid size={{ xs: 12, sm: 6 }} key={balance.leaveTypeId}>
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 3,
                                            border: `1px solid ${theme.palette.divider}`,
                                            bgcolor: theme.palette.background.default
                                        }}
                                    >
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                {balance.leaveTypeName}
                                            </Typography>
                                            <Typography variant="h6" fontWeight="700">
                                                {remaining}
                                            </Typography>
                                        </Box>

                                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                            <Typography variant="caption" color="text.secondary">
                                                Used: {used}/{total}
                                            </Typography>
                                        </Box>

                                        <LinearProgress
                                            variant="determinate"
                                            value={pct}
                                            sx={{
                                                height: 6,
                                                borderRadius: 3,
                                                bgcolor: theme.palette.grey[200],
                                                '& .MuiLinearProgress-bar': {
                                                    borderRadius: 3,
                                                    bgcolor: color
                                                }
                                            }}
                                        />
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </CardContent>
        </Card>
    );
};

export default MyLeavesWidget;
