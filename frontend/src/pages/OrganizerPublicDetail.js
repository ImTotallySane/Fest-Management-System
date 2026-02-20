import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Container, Heading, HStack, SimpleGrid, Text, VStack, useToast } from '@chakra-ui/react';
import api from '../utils/api';

const OrganizerPublicDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const [data, setData] = useState({ organizer: null, upcomingEvents: [], pastEvents: [] });

    const fetchData = async () => {
        try {
            const response = await api.get(`/users/organizers/${id}`);
            setData(response.data);
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to load organizer', status: 'error', duration: 3000, isClosable: true });
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    return (
        <Container maxW="container.lg" py={8}>
            <HStack justifyContent="space-between" mb={6}>
                <Heading size="lg">Organizer Details</Heading>
                <Button onClick={() => navigate('/participant/clubs')}>Back</Button>
            </HStack>

            {data.organizer && (
                <Box border="1px" borderColor="gray.200" borderRadius="md" p={4} mb={5}>
                    <Text fontWeight="bold">{data.organizer.organizerName}</Text>
                    <Text>Category: {data.organizer.category}</Text>
                    <Text>Description: {data.organizer.description || 'N/A'}</Text>
                    <Text>Contact: {data.organizer.contactEmail || data.organizer.contactNumber || 'N/A'}</Text>
                </Box>
            )}

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <VStack align="stretch">
                    <Heading size="sm">Upcoming Events</Heading>
                    {data.upcomingEvents.map((item) => (
                        <Box key={item._id} border="1px" borderColor="gray.200" borderRadius="md" p={3}>
                            <Text>{item.eventName}</Text>
                            <Text fontSize="sm">{item.eventType} | {new Date(item.eventStartDate).toLocaleDateString()}</Text>
                        </Box>
                    ))}
                </VStack>
                <VStack align="stretch">
                    <Heading size="sm">Past Events</Heading>
                    {data.pastEvents.map((item) => (
                        <Box key={item._id} border="1px" borderColor="gray.200" borderRadius="md" p={3}>
                            <Text>{item.eventName}</Text>
                            <Text fontSize="sm">{item.eventType} | {new Date(item.eventStartDate).toLocaleDateString()}</Text>
                        </Box>
                    ))}
                </VStack>
            </SimpleGrid>
        </Container>
    );
};

export default OrganizerPublicDetail;
