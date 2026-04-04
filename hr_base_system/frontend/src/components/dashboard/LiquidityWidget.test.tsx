import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LiquidityWidget from './LiquidityWidget';
import { useLiquidityMetrics } from '../../lib/api/hooks';

// Mock the hook
vi.mock('../../lib/api/hooks');

const mockUseLiquidityMetrics = useLiquidityMetrics as ReturnType<typeof vi.fn>;

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('LiquidityWidget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state', () => {
        mockUseLiquidityMetrics.mockReturnValue({
            isLoading: true,
            data: undefined,
            error: null,
        });

        render(<LiquidityWidget />, { wrapper });
        // Skeleton should be present (detected by structure or class, but here we can check if content is absent)
        expect(screen.queryByText('Est. Month Cost')).toBeNull();
    });

    it('renders error state', () => {
        mockUseLiquidityMetrics.mockReturnValue({
            isLoading: false,
            data: undefined,
            error: new Error('Failed'),
        });

        render(<LiquidityWidget />, { wrapper });
        expect(screen.getByText(/Failed to load liquidity metrics/i)).toBeInTheDocument();
    });

    it('renders data correctly', () => {
        const mockData = {
            totalCost: 156000,
            breakdown: {
                accruedBasic: 120000,
                epfEtf: 36000,
            },
        };

        mockUseLiquidityMetrics.mockReturnValue({
            isLoading: false,
            data: mockData,
            error: null,
        });

        render(<LiquidityWidget />, { wrapper });

        expect(screen.getByText('Est. Month Cost')).toBeInTheDocument();
        // Currency formatting might vary by locale, so check for partial match or specific digits
        expect(screen.getByText(/156,000/)).toBeInTheDocument();
        expect(screen.getByText(/120,000/)).toBeInTheDocument();
        expect(screen.getByText(/36,000/)).toBeInTheDocument();
    });
});
