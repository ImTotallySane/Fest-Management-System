import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Button, Container, Heading, Text, VStack, useToast, HStack, Select
} from '@chakra-ui/react';
import api from '../utils/api';

const OrganizerFeedbackView = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [feedback, setFeedback] = useState(null);
    const [selectedRating, setSelectedRating] = useState('all');

    useEffect(() => {
        const loadFeedback = async () => {
            try {
                const params = selectedRating === 'all' ? {} : { rating: selectedRating };
                const { data } = await api.get(`/feedback/event/${eventId}`, { params });
                setFeedback(data);
            } catch (error) {
                toast({ title: 'Error', description: error.response?.data?.message || 'Failed to load feedback', status: 'error', duration: 3000, isClosable: true });
            }
        };
        loadFeedback();
    }, [eventId, selectedRating]);

    if (!feedback) return <Container py={8}><Text>Loading...</Text></Container>;

    return (
        <Container maxW="container.lg" py={8}>
            <Button mb={4} onClick={() => navigate(-1)}>Back</Button>
            <Heading mb={6}>Event Feedback</Heading>

            <Box bg="white" p={6} borderRadius="md" shadow="sm" mb={6}>
                <Heading size="md" mb={4}>Summary</Heading>
                <Text fontSize="2xl" fontWeight="bold" color="blue.600" mb={2}>
                    Average Rating: {feedback.averageRating} / 5
                </Text>
                <Text color="gray.600" mb={4}>Total Responses: {feedback.totalRatings}</Text>
            </Box>

            <Box bg="white" p={6} borderRadius="md" shadow="sm">
                <HStack justifyContent="space-between" mb={4}>
                    <Heading size="md">
                        Comments ({feedback.filteredCommentCount ?? feedback.comments.length})
                    </Heading>
                    <HStack>
                        <Text fontSize="sm" color="gray.600">Filter by rating</Text>
                        <Select size="sm" value={selectedRating} onChange={(e) => setSelectedRating(e.target.value)} w="140px">
                            <option value="all">All</option>
                            <option value="5">5 stars</option>
                            <option value="4">4 stars</option>
                            <option value="3">3 stars</option>
                            <option value="2">2 stars</option>
                            <option value="1">1 star</option>
                        </Select>
                    </HStack>
                </HStack>
                <VStack align="stretch" spacing={4}>
                    {feedback.comments.map((c, idx) => (
                        <Box key={idx} bg="gray.50" p={4} borderRadius="md">
                            <Text fontWeight="bold" color="blue.600" mb={1}>Rating: {c.rating} / 5</Text>
                            <Text fontSize="sm" color="gray.600" mb={2}>{new Date(c.createdAt).toLocaleString()}</Text>
                            <Text>{c.comment}</Text>
                        </Box>
                    ))}
                    {feedback.comments.length === 0 && (
                        <Text color="gray.500">No written comments yet.</Text>
                    )}
                </VStack>
            </Box>
        </Container>
    );
};

export default OrganizerFeedbackView;
