import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Container, Heading, HStack, SimpleGrid, Stat, StatLabel, StatNumber, Text, VStack, useToast } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const OrganizerDashboard = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [events, setEvents] = useState([]);
    const [analytics, setAnalytics] = useState([]);

    const loadData = async () => {
        try {
            const { data } = await api.get('/events/organizer/my-events/all');
            setEvents(data.events || []);
            setAnalytics(data.analytics || []);
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to load dashboard', status: 'error', duration: 3000, isClosable: true });
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const totals = useMemo(() => {
        const analyticsMap = new Map(analytics.map((item) => [String(item._id), item]));
        return events.reduce((acc, event) => {
            const stat = analyticsMap.get(String(event._id));
            acc.registrations += stat?.registrations || 0;
            acc.revenue += stat?.revenue || 0;
            return acc;
        }, { registrations: 0, revenue: 0 });
    }, [events, analytics]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <Container maxW="container.xl" py={8}>
            <HStack justifyContent="space-between" mb={6}>
                <VStack align="start" spacing={0}>
                    <Heading size="lg">Organizer Dashboard</Heading>
                    <Text color="gray.500">Events overview and analytics</Text>
                </VStack>
                <HStack>
                    <Button onClick={() => navigate('/organizer/create-event')}>Create Event</Button>
                    <Button onClick={() => navigate('/organizer/profile')}>Profile</Button>
                    <Button colorScheme="red" variant="outline" onClick={handleLogout}>Logout</Button>
                </HStack>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
                <Stat border="1px" borderColor="gray.200" borderRadius="md" p={4}><StatLabel>Registrations</StatLabel><StatNumber>{totals.registrations}</StatNumber></Stat>
                <Stat border="1px" borderColor="gray.200" borderRadius="md" p={4}><StatLabel>Revenue</StatLabel><StatNumber>₹{totals.revenue}</StatNumber></Stat>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {events.map((event) => (
                    <Box key={event._id} border="1px" borderColor="gray.200" borderRadius="md" p={4}>
                        <Heading size="sm">{event.eventName}</Heading>
                        <Text fontSize="sm">Type: {event.eventType}</Text>
                        <Text fontSize="sm">Status: {event.status}</Text>
                        <Text fontSize="sm">Start: {new Date(event.eventStartDate).toLocaleDateString()}</Text>
                        <HStack mt={3}>
                            <Button size="sm" onClick={() => navigate(`/organizer/events/${event._id}`)}>Manage</Button>
                        </HStack>
                    </Box>
                ))}
            </SimpleGrid>
        </Container>
    );
};

export default OrganizerDashboard;
