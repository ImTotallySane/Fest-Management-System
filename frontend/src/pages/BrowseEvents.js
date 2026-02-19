import { useEffect, useState } from 'react';
import {
    Box, Button, Container, Heading,
    HStack, SimpleGrid, Text
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const EventCard = ({ event, navigate }) => (
    <Box
        border="1px"
        borderColor="gray.200"
        borderRadius="lg"
        p={5}
        shadow="sm"
        _hover={{ shadow: 'md', borderColor: 'blue.300' }}
        transition="all 0.15s"
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        minH="160px"
    >
        <Box>
            <HStack mb={1} justifyContent="space-between">
                <Heading size="sm" noOfLines={1}>{event.eventName}</Heading>
                <Text fontSize="xs" color="gray.500" textTransform="capitalize">{event.eventType}</Text>
            </HStack>
            <Text fontSize="sm" color="gray.600">
                {event.organizerId?.organizerName || 'N/A'}
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
                Deadline: {new Date(event.registrationDeadline).toLocaleDateString()}
            </Text>
            {event.registrationFee > 0 && (
                <Text fontSize="xs" color="gray.500" mt={1}>₹{event.registrationFee}</Text>
            )}
        </Box>
        <HStack mt={4} spacing={2}>
            <Button size="sm" variant="outline" onClick={() => navigate(`/participant/events/${event._id}`)}>
                Details
            </Button>
            <Button size="sm" colorScheme="green" onClick={() => navigate(`/participant/events/${event._id}/register`)}>
                {event.eventType === 'merchandise' ? 'Purchase' : 'Register'}
            </Button>
        </HStack>
    </Box>
);

const BrowseEvents = () => {
    const navigate = useNavigate();
    const [trending, setTrending] = useState([]);
    const [recommended, setRecommended] = useState([]);

    useEffect(() => {
        const fetchBrowse = async () => {
            try {
                const { data } = await api.get('/events/browse', { params: {} });
                setTrending(data.trendingEvents || []);
                setRecommended(data.recommendedEvents || []);
            } catch {
                // silently fail
            }
        };
        fetchBrowse();
    }, []);

    return (
        <Container maxW="container.xl" py={8}>
            <HStack justify="space-between" mb={8}>
                <Text fontSize="xl" fontWeight="semibold">Events</Text>
                <HStack spacing={2}>
                    <Button size="sm" variant="outline" onClick={() => navigate('/participant/search')}>Search</Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate('/participant/dashboard')}>Dashboard</Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate('/participant/profile')}>Profile</Button>
                </HStack>
            </HStack>

            <Box mb={10}>
                <Text fontSize="xs" fontWeight="semibold" color="gray.400" mb={3} textTransform="uppercase" letterSpacing="wider">Trending</Text>
                {trending.length === 0 ? (
                    <Text color="gray.400" fontSize="sm">Nothing trending right now.</Text>
                ) : (
                    <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={3}>
                        {trending.map((event) => <EventCard key={event._id} event={event} navigate={navigate} />)}
                    </SimpleGrid>
                )}
            </Box>

            <Box>
                <Text fontSize="xs" fontWeight="semibold" color="gray.400" mb={3} textTransform="uppercase" letterSpacing="wider">Recommended for you</Text>
                {recommended.length === 0 ? (
                    <Text color="gray.400" fontSize="sm">Update your interests in your profile to get recommendations.</Text>
                ) : (
                    <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={3}>
                        {recommended.map((event) => <EventCard key={event._id} event={event} navigate={navigate} />)}
                    </SimpleGrid>
                )}
            </Box>
        </Container>
    );
};

export default BrowseEvents;
