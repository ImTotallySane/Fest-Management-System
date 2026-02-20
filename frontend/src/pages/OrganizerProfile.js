import { useEffect, useState } from 'react';
import { Box, Button, Container, FormControl, FormLabel, Heading, Input, Switch, Text, Textarea, VStack, useToast } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const OrganizerProfile = () => {
    const navigate = useNavigate();
    const toast = useToast();

    const [form, setForm] = useState({
        organizerName: '',
        category: '',
        description: '',
        discordNotificationsEnabled: false,
        reason: ''
    });

    const loadProfile = async () => {
        try {
            const { data } = await api.get('/users/profile');
            setForm((prev) => ({
                ...prev,
                organizerName: data.organizerName || '',
                category: data.category || '',
                description: data.description || '',
                discordNotificationsEnabled: Boolean(data.discordNotificationsEnabled)
            }));
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load profile', status: 'error', duration: 3000, isClosable: true });
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const saveProfile = async () => {
        try {
            await api.put('/users/profile', {
                organizerName: form.organizerName,
                category: form.category,
                description: form.description,
                discordNotificationsEnabled: form.discordNotificationsEnabled
            });
            toast({ title: 'Saved', status: 'success', duration: 2500, isClosable: true });
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Save failed', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const requestPasswordReset = async () => {
        try {
            await api.post('/users/password-reset-request', { reason: form.reason });
            toast({ title: 'Request Sent', description: 'Admin will review your reset request', status: 'success', duration: 2500, isClosable: true });
            setForm({ ...form, reason: '' });
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Request failed', status: 'error', duration: 3000, isClosable: true });
        }
    };

    return (
        <Container maxW="container.md" py={8}>
            <Heading size="lg" mb={6}>Organizer Profile</Heading>
            <VStack spacing={4} align="stretch">
                <FormControl><FormLabel>Name</FormLabel><Input name="organizerName" value={form.organizerName} onChange={handleChange} /></FormControl>
                <FormControl><FormLabel>Category</FormLabel><Input name="category" value={form.category} onChange={handleChange} /></FormControl>
                <FormControl><FormLabel>Description</FormLabel><Textarea name="description" value={form.description} onChange={handleChange} /></FormControl>
                <FormControl display="flex" alignItems="center" justifyContent="space-between" p={3} border="1px" borderColor="gray.200" borderRadius="md">
                    <Box>
                        <FormLabel mb={0}>Discord Messages</FormLabel>
                        <Text fontSize="sm" color="gray.500">Toggle event publish notifications to Discord</Text>
                    </Box>
                    <Switch
                        isChecked={form.discordNotificationsEnabled}
                        onChange={(e) => setForm({ ...form, discordNotificationsEnabled: e.target.checked })}
                        colorScheme="blue"
                    />
                </FormControl>
                <Button colorScheme="blue" onClick={saveProfile}>Save Profile</Button>

                <Box border="1px" borderColor="gray.200" borderRadius="md" p={4}>
                    <FormControl><FormLabel>Password Reset Request Reason</FormLabel><Textarea name="reason" value={form.reason} onChange={handleChange} /></FormControl>
                    <Button mt={3} onClick={requestPasswordReset}>Request Password Reset (Admin)</Button>
                </Box>

                <Button variant="outline" onClick={() => navigate('/organizer/dashboard')}>Back to Dashboard</Button>
            </VStack>
        </Container>
    );
};

export default OrganizerProfile;
