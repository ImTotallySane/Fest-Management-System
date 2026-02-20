import { useEffect, useState } from 'react';
import {
    Box, Button, Container, Heading, HStack, SimpleGrid, Text, VStack, useToast, Badge
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const OnboardingClubs = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [organizers, setOrganizers] = useState([]);
    const [profile, setProfile] = useState(null);

    const fetchData = async () => {
        try {
            const [organizersRes, profileRes] = await Promise.all([
                api.get('/users/organizers'),
                api.get('/users/profile')
            ]);
            setOrganizers(organizersRes.data || []);
            setProfile(profileRes.data);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load clubs', status: 'error', duration: 3000, isClosable: true });
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleFollowToggle = async (id) => {
        try {
            const followed = (profile?.followedClubs || []).map((clubId) => String(clubId));
            const isFollowing = followed.includes(String(id));
            if (isFollowing) {
                await api.delete(`/users/organizers/${id}/follow`);
            } else {
                await api.post(`/users/organizers/${id}/follow`);
            }
            fetchData();
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Action failed', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const followedIds = (profile?.followedClubs || []).map((id) => String(id));

    const handleContinue = () => {
        navigate('/participant/dashboard');
    };

    return (
        <Container maxW="container.lg" py={10}>
            <Box p={8} bg="white" boxShadow="lg" borderRadius="lg" border="1px" borderColor="gray.200">
                <VStack spacing={6} align="stretch">
                    <Box>
                        <Heading size="lg" mb={1}>Follow Clubs &amp; Organizers</Heading>
                        <Text color="gray.500">Follow clubs to see their events first. You can change this anytime from your profile.</Text>
                    </Box>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        {organizers.map((org) => {
                            const following = followedIds.includes(String(org._id));
                            return (
                                <Box key={org._id} border="1px" borderColor={following ? 'blue.300' : 'gray.200'} borderRadius="md" p={4} bg={following ? 'blue.50' : 'white'}>
                                    <HStack justify="space-between" mb={1}>
                                        <Heading size="sm">{org.organizerName}</Heading>
                                        {following && <Badge colorScheme="blue">Following</Badge>}
                                    </HStack>
                                    <Text fontSize="sm" color="gray.600" mb={1}>{org.category}</Text>
                                    <Text fontSize="sm" color="gray.500" mb={3}>{org.description || ''}</Text>
                                    <Button size="sm" colorScheme={following ? 'red' : 'blue'} variant={following ? 'outline' : 'solid'} onClick={() => handleFollowToggle(org._id)}>
                                        {following ? 'Unfollow' : 'Follow'}
                                    </Button>
                                </Box>
                            );
                        })}
                    </SimpleGrid>

                    {organizers.length === 0 && (
                        <Text color="gray.500" textAlign="center">No clubs available yet.</Text>
                    )}

                    <Box pt={2}>
                        <Button colorScheme="blue" onClick={handleContinue}>
                            Continue to Dashboard
                        </Button>
                    </Box>
                </VStack>
            </Box>
        </Container>
    );
};

export default OnboardingClubs;
