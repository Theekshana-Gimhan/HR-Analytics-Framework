import React from 'react';
import { Card, CardContent, Typography, Box, Skeleton, Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useLiquidityMetrics } from '../../lib/api/hooks';

const LiquidityWidget: React.FC = () => {
    const { data: metrics, isLoading, error } = useLiquidityMetrics();

    if (isLoading) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="circular" width={24} height={24} />
                    </Box>
                    <Skeleton variant="rectangular" height={60} />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card sx={{ height: '100%', borderLeft: '4px solid #ef4444' }}>
                <CardContent>
                    <Typography color="error" variant="body2">
                        Failed to load liquidity metrics.
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <Card
            sx={{
                height: '100%',
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'visible',
            }}
        >
            <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                            Est. Month Cost
                        </Typography>
                        <Tooltip
                            title="Real-time estimated payroll cost (Basic + EPF/ETF) for the current month based on days passed."
                            arrow
                            placement="top"
                        >
                            <IconButton size="small" sx={{ color: 'white', opacity: 0.7, padding: 0 }}>
                                <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <AttachMoneyIcon sx={{ opacity: 0.3 }} />
                </Box>

                <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
                    {metrics ? formatCurrency(metrics.totalCost) : 'N/A'}
                </Typography>

                <Box display="flex" gap={2} mt={2}>
                    <Box>
                        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                            Basic
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                            {metrics ? formatCurrency(metrics.breakdown.accruedBasic) : '-'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                            EPF/ETF
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                            {metrics ? formatCurrency(metrics.breakdown.epfEtf) : '-'}
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default LiquidityWidget;
