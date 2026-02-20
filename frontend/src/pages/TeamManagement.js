import { useEffect, useState } from 'react';
import {
    Box, Button, Container, FormControl, FormLabel, Heading,
    HStack, Input, SimpleGrid, Text, VStack, useToast, Badge, IconButton
} from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CopyIcon } from '@chakra-ui/icons';
import api from '../utils/api';

const TeamManagement = () => {
    const [teams, setTeams] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ eventId: '', teamName: '', teamSize: 2 });
    const [inviteCode, setInviteCode] = useState('');
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const loadTeams = async () => {
        try {
            const { data } = await api.get('/teams/my-teams');
            setTeams(data.teams);
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to load teams', status: 'error', duration: 3000, isClosable: true });
        }
    };

    useEffect(() => {
        loadTeams();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const eventIdFromQuery = params.get('eventId');
        if (eventIdFromQuery) {
            setForm((prev) => ({ ...prev, eventId: eventIdFromQuery }));
            setShowCreate(true);
        }
    }, [location.search]);

    const handleCreate = async () => {
        try {
            await api.post('/teams/create', form);
            toast({ title: 'Success', description: 'Team created!', status: 'success', duration: 2500, isClosable: true });
            setShowCreate(false);
            setForm({ eventId: '', teamName: '', teamSize: 2 });
            loadTeams();
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create team', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const handleJoin = async () => {
        try {
            await api.post('/teams/join', { inviteCode });
            toast({ title: 'Success', description: 'Joined team!', status: 'success', duration: 2500, isClosable: true });
            setInviteCode('');
            loadTeams();
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to join team', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const handleLeave = async (teamId) => {
        try {
            await api.delete(`/teams/${teamId}/leave`);
            toast({ title: 'Success', description: 'Left team', status: 'success', duration: 2500, isClosable: true });
            loadTeams();
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to leave team', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const handleDelete = async (teamId) => {
        try {
            await api.delete(`/teams/${teamId}`);
            toast({ title: 'Success', description: 'Team deleted', status: 'success', duration: 2500, isClosable: true });
            loadTeams();
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete team', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const copyInviteCode = (code) => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copied!', description: 'Invite code copied to clipboard', status: 'info', duration: 2000, isClosable: true });
    };

    return (
        <Container maxW="container.lg" py={8}>
            <Heading mb={6}>Team Management</Heading>
            <HStack spacing={4} mb={6}>
                <Button colorScheme="blue" onClick={() => setShowCreate(!showCreate)}>
                    {showCreate ? 'Cancel' : 'Create Team'}
                </Button>
                <Button colorScheme="teal" onClick={() => navigate('/participant/dashboard')}>
                    Back to Dashboard
                </Button>
            </HStack>

            {showCreate && (
                <Box bg="gray.50" p={6} borderRadius="md" mb={6}>
                    <Heading size="md" mb={4}>Create New Team</Heading>
                    <VStack spacing={4}>
                        <FormControl isRequired>
                            <FormLabel>Event ID</FormLabel>
                            <Input value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })} placeholder="Event ID from event details page" />
                        </FormControl>
                        <FormControl isRequired>
                            <FormLabel>Team Name</FormLabel>
                            <Input value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })} />
                        </FormControl>
                        <FormControl isRequired>
                            <FormLabel>Team Size</FormLabel>
                            <Input type="number" value={form.teamSize} onChange={(e) => setForm({ ...form, teamSize: Number(e.target.value) })} min={2} />
                        </FormControl>
                        <Button colorScheme="green" onClick={handleCreate} w="full">Create Team</Button>
                    </VStack>
                </Box>
            )}

            <Box bg="white" p={6} borderRadius="md" shadow="sm" mb={6}>
                <Heading size="md" mb={4}>Join Team via Invite Code</Heading>
                <HStack>
                    <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Enter invite code" />
                    <Button colorScheme="purple" onClick={handleJoin}>Join</Button>
                </HStack>
            </Box>

            <Heading size="md" mb={4}>My Teams</Heading>
            <SimpleGrid columns={[1, 2]} spacing={6}>
                {teams.map((team) => {
                    const userId = localStorage.getItem('userId');
                    const isLeader = String(team.leaderId._id) === userId;
                    const acceptedMembers = team.members.filter(m => m.status === 'accepted');

                    return (
                        <Box key={team._id} bg="white" p={6} borderRadius="md" shadow="md">
                            <HStack justify="space-between" mb={3}>
                                <Heading size="sm">{team.teamName}</Heading>
                                <Badge colorScheme={team.isComplete ? 'green' : 'yellow'}>
                                    {team.isComplete ? 'Complete' : 'Forming'}
                                </Badge>
                            </HStack>
                            <Text fontSize="sm" color="gray.600" mb={2}>Event: {team.eventId?.eventName || 'Unknown'}</Text>
                            <Text fontSize="sm" mb={2}>Members: {acceptedMembers.length} / {team.teamSize}</Text>
                            <Text fontSize="sm" fontWeight="bold" mb={1}>Invite Code:</Text>
                            <HStack mb={4}>
                                <Text fontSize="lg" fontFamily="mono" color="blue.600">{team.inviteCode}</Text>
                                <IconButton size="sm" icon={<CopyIcon />} onClick={() => copyInviteCode(team.inviteCode)} aria-label="Copy invite code" />
                            </HStack>
                            <VStack align="start" spacing={1} mb={4}>
                                <Text fontSize="sm" fontWeight="bold">Team Members:</Text>
                                {acceptedMembers.map((m, idx) => (
                                    <Text key={idx} fontSize="sm">
                                        {m.participantId?.firstName} {m.participantId?.lastName} 
                                        {String(m.participantId?._id) === String(team.leaderId._id) && ' (Leader)'}
                                    </Text>
                                ))}
                            </VStack>

                            {!team.isComplete && (
                                <HStack spacing={2}>
                                    {isLeader ? (
                                        <Button size="sm" colorScheme="red" onClick={() => handleDelete(team._id)}>Delete Team</Button>
                                    ) : (
                                        <Button size="sm" colorScheme="orange" onClick={() => handleLeave(team._id)}>Leave Team</Button>
                                    )}
                                </HStack>
                            )}
                            {team.isComplete && (
                                <Text fontSize="sm" color="green.600" fontWeight="bold">✅ Tickets generated for all members!</Text>
                            )}
                        </Box>
                    );
                })}
            </SimpleGrid>
            {teams.length === 0 && (
                <Text color="gray.500" textAlign="center" py={8}>No teams yet. Create or join a team!</Text>
            )}
        </Container>
    );
};

export default TeamManagement;
