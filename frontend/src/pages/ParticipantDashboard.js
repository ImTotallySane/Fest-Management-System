import { useEffect, useState } from 'react';
import {
    Box, Button, Container, HStack, Heading, SimpleGrid,
    Tab, TabList, TabPanel, TabPanels, Tabs, Text, VStack, useToast
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const ParticipantDashboard = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [records, setRecords] = useState({
        all: [], upcoming: [], completed: [], cancelledRejected: [], normal: [], merchandise: []
    });

    const fetchDashboard = async () => {
        try {
            const { data } = await api.get('/events/my-registrations');
            setRecords(data);
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to load dashboard',
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const renderCard = (record) => (
        <Box key={record._id} border="1px" borderColor="gray.200" borderRadius="md" p={4}>
            <Text fontWeight="bold">{record.eventId?.eventName}</Text>
            <Text fontSize="sm">Type: {record.eventType}</Text>
            <Text fontSize="sm">Organizer: {record.eventId?.organizerId?.organizerName || 'N/A'}</Text>
            <Text fontSize="sm">Status: {record.participationStatus}</Text>
            <Text fontSize="sm">Ticket ID: {record.ticketId}</Text>
            <Button mt={3} size="sm" onClick={() => navigate(`/participant/events/${record.eventId?._id}`)}>
                View Event
            </Button>
        </Box>
    );

    return (
        <Container maxW="container.xl" py={8}>
            <HStack justifyContent="space-between" mb={6}>
                <VStack align="start" spacing={0}>
                    <Heading size="lg">Participant Dashboard</Heading>
                    <Text color="gray.500">My events and participation history</Text>
                </VStack>
                <HStack>
                    <Button onClick={() => navigate('/participant/browse')}>Browse Events</Button>
                    <Button onClick={() => navigate('/participant/teams')}>Teams</Button>
                    <Button onClick={() => navigate('/participant/clubs')}>Clubs/Organizers</Button>
                    <Button onClick={() => navigate('/participant/profile')}>Profile</Button>
                    <Button colorScheme="red" variant="outline" onClick={handleLogout}>Logout</Button>
                </HStack>
            </HStack>

            <Tabs variant="enclosed">
                <TabList>
                    <Tab>Upcoming</Tab>
                    <Tab>Normal</Tab>
                    <Tab>Merchandise</Tab>
                    <Tab>Completed</Tab>
                    <Tab>Cancelled/Rejected</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel><SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>{records.upcoming.map(renderCard)}</SimpleGrid></TabPanel>
                    <TabPanel><SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>{records.normal.map(renderCard)}</SimpleGrid></TabPanel>
                    <TabPanel><SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>{records.merchandise.map(renderCard)}</SimpleGrid></TabPanel>
                    <TabPanel><SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>{records.completed.map(renderCard)}</SimpleGrid></TabPanel>
                    <TabPanel><SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>{records.cancelledRejected.map(renderCard)}</SimpleGrid></TabPanel>
                </TabPanels>
            </Tabs>
        </Container>
    );
};

export default ParticipantDashboard;
