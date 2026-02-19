import { useEffect, useState } from 'react';
import {
    Box, Button, Container, FormControl, FormLabel, Heading,
    HStack, Input, Text, VStack, useToast, CheckboxGroup, Checkbox, SimpleGrid
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ALLOWED_INTERESTS } from '../constants/interests';

const Profile = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const role = localStorage.getItem('role');

    const [profile, setProfile] = useState(null);
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '' });

    const loadProfile = async () => {
        try {
            const { data } = await api.get('/users/profile');
            setProfile(data);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load profile', status: 'error', duration: 3000, isClosable: true });
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const handleChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        try {
            const payload = role === 'participant'
                ? {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    contactNumber: profile.contactNumber,
                    collegeName: profile.collegeName,
                    interests: Array.isArray(profile.interests)
                        ? profile.interests
                        : String(profile.interests || '').split(',').map((item) => item.trim()).filter(Boolean)
                }
                : {
                    organizerName: profile.organizerName,
                    category: profile.category,
                    description: profile.description,
                    contactNumber: profile.contactNumber,
                    contactEmail: profile.contactEmail
                };

            await api.put('/users/profile', payload);
            toast({ title: 'Saved', description: 'Profile updated', status: 'success', duration: 2500, isClosable: true });
            loadProfile();
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to save profile', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const handlePasswordChange = async () => {
        try {
            await api.post('/auth/change-password', passwordData);
            toast({ title: 'Success', description: 'Password changed', status: 'success', duration: 2500, isClosable: true });
            setPasswordData({ oldPassword: '', newPassword: '' });
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Password update failed', status: 'error', duration: 3000, isClosable: true });
        }
    };

    if (!profile) return <Container py={8}><Text>Loading...</Text></Container>;

    return (
        <Container maxW="container.md" py={8}>
            <HStack justifyContent="space-between" mb={6}>
                <Heading size="lg">Profile</Heading>
                <Button onClick={() => navigate(role === 'participant' ? '/participant/dashboard' : '/organizer/dashboard')}>Back</Button>
            </HStack>

            <VStack spacing={4} align="stretch">
                {role === 'participant' ? (
                    <>
                        <FormControl><FormLabel>First Name</FormLabel><Input name="firstName" value={profile.firstName || ''} onChange={handleChange} /></FormControl>
                        <FormControl><FormLabel>Last Name</FormLabel><Input name="lastName" value={profile.lastName || ''} onChange={handleChange} /></FormControl>
                        <FormControl><FormLabel>Email (Non-editable)</FormLabel><Input value={profile.email || ''} isReadOnly /></FormControl>
                        <FormControl><FormLabel>Participant Type (Non-editable)</FormLabel><Input value={profile.participantType || ''} isReadOnly /></FormControl>
                        <FormControl><FormLabel>Contact Number</FormLabel><Input name="contactNumber" value={profile.contactNumber || ''} onChange={handleChange} /></FormControl>
                        <FormControl><FormLabel>College/Organization</FormLabel><Input name="collegeName" value={profile.collegeName || ''} onChange={handleChange} /></FormControl>
                        <FormControl>
                            <FormLabel>Interests</FormLabel>
                            <CheckboxGroup
                                value={Array.isArray(profile.interests) ? profile.interests : []}
                                onChange={(values) => setProfile({ ...profile, interests: values })}
                            >
                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                                    {ALLOWED_INTERESTS.map((interest) => (
                                        <Checkbox key={interest} value={interest}>{interest}</Checkbox>
                                    ))}
                                </SimpleGrid>
                            </CheckboxGroup>
                        </FormControl>
                    </>
                ) : (
                    <>
                        <FormControl><FormLabel>Organizer Name</FormLabel><Input name="organizerName" value={profile.organizerName || ''} onChange={handleChange} /></FormControl>
                        <FormControl><FormLabel>Category</FormLabel><Input name="category" value={profile.category || ''} onChange={handleChange} /></FormControl>
                        <FormControl><FormLabel>Description</FormLabel><Input name="description" value={profile.description || ''} onChange={handleChange} /></FormControl>
                        <FormControl><FormLabel>Contact Number</FormLabel><Input name="contactNumber" value={profile.contactNumber || ''} onChange={handleChange} /></FormControl>
                        <FormControl><FormLabel>Contact Email</FormLabel><Input name="contactEmail" value={profile.contactEmail || ''} onChange={handleChange} /></FormControl>
                        <FormControl><FormLabel>Login Email (Non-editable)</FormLabel><Input value={profile.email || ''} isReadOnly /></FormControl>
                    </>
                )}

                <Button colorScheme="blue" onClick={handleSave}>Save Profile</Button>

                <Box border="1px" borderColor="gray.200" borderRadius="md" p={4}>
                    <Heading size="sm" mb={3}>Security Settings</Heading>
                    <FormControl mb={3}><FormLabel>Old Password</FormLabel><Input type="password" value={passwordData.oldPassword} onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })} /></FormControl>
                    <FormControl mb={3}><FormLabel>New Password</FormLabel><Input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} /></FormControl>
                    <Button onClick={handlePasswordChange}>Change Password</Button>
                </Box>
            </VStack>
        </Container>
    );
};

export default Profile;
