
import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, Paper } from '@mui/material';
import { CalendarMonth, AccessTime } from '@mui/icons-material';
import RosterGrid from '../../components/roster/RosterGrid';
import ShiftTemplateManager from '../../components/roster/ShiftTemplateManager';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`roster-tabpanel-${index}`}
            aria-labelledby={`roster-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const RosterPage: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 4 }}>Roster Management</Typography>

            <Paper sx={{ width: '100%', mb: 2 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    aria-label="roster management tabs"
                >
                    <Tab icon={<CalendarMonth />} iconPosition="start" label="Roster View" />
                    <Tab icon={<AccessTime />} iconPosition="start" label="Shift Templates" />
                </Tabs>
            </Paper>

            <TabPanel value={tabValue} index={0}>
                <RosterGrid />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
                <ShiftTemplateManager />
            </TabPanel>
        </Box>
    );
};

export default RosterPage;
