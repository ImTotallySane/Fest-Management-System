import { useEffect, useState } from 'react';
import { Box, Button, Container, Heading, HStack, SimpleGrid, Text, useToast } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const ClubsOrganizers = () => {
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
            toast({ title: 'Error', description: 'Failed to load organizers', status: 'error', duration: 3000, isClosable: true });
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

    return (
        <Container maxW="container.xl" py={8}>
            <HStack justifyContent="space-between" mb={6}>
                <Heading size="lg">Clubs / Organizers</Heading>
                <Button onClick={() => navigate('/participant/dashboard')}>Dashboard</Button>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {organizers.map((org) => {
                    const following = (profile?.followedClubs || []).map((clubId) => String(clubId)).includes(String(org._id));
                    return (
                        <Box key={org._id} border="1px" borderColor="gray.200" borderRadius="md" p={4}>
                            <Heading size="sm">{org.organizerName}</Heading>
                            <Text fontSize="sm">Category: {org.category}</Text>
                            <Text fontSize="sm">Description: {org.description || 'N/A'}</Text>
                            <Text fontSize="sm">Contact: {org.contactEmail || org.contactNumber || 'N/A'}</Text>
                            <HStack mt={3}>
                                <Button size="sm" onClick={() => navigate(`/participant/organizers/${org._id}`)}>View</Button>
                                <Button size="sm" colorScheme={following ? 'red' : 'blue'} onClick={() => handleFollowToggle(org._id)}>
                                    {following ? 'Unfollow' : 'Follow'}
                                </Button>
                            </HStack>
                        </Box>
                    );
                })}
            </SimpleGrid>
        </Container>
    );
};

export default ClubsOrganizers;
