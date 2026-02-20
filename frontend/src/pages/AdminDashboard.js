import { 
    Box, Heading, Text, Button, Container, VStack, 
    FormControl, FormLabel, Input, useToast, HStack, Divider, Select,
    SimpleGrid, Textarea, Alert, AlertIcon, AlertTitle, AlertDescription, CloseButton
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const toast = useToast();

    // Form State for new Organizer
    const [formData, setFormData] = useState({
        organizerName: '',
        category: 'Technical',
        description: ''
    });
    const [generatedCredentials, setGeneratedCredentials] = useState(null);
    const [generatedResetCredentials, setGeneratedResetCredentials] = useState(null);

    const [organizers, setOrganizers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [requestAction, setRequestAction] = useState({});

    const loadAdminData = async () => {
        try {
            const [organizersRes, requestsRes] = await Promise.all([
                api.get('/admin/organizers'),
                api.get('/admin/password-reset-requests')
            ]);
            setOrganizers(organizersRes.data || []);
            setRequests(requestsRes.data || []);
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to load admin data',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };

    useEffect(() => {
        loadAdminData();
    }, []);

    // Handle logout
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/');
    };

    // Handle Input Changes
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle Form Submit
    const handleAddOrganizer = async () => {
        try {
            // Call the new backend route
            const { data } = await api.post('/auth/add-organizer', formData);
            setGeneratedCredentials({
                organizerName: formData.organizerName,
                email: data.generatedEmail,
                password: data.generatedPassword
            });

            toast({
                title: "Organizer Added",
                description: `${formData.organizerName} created successfully`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });

            // Clear form
            setFormData({
                organizerName: '',
                category: 'Technical', description: ''
            });

            loadAdminData();

        } catch (error) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to create organizer",
                status: "error",
                duration: 3000,
                isClosable: true,
            });

            loadAdminData();
        }
    };

    // Handle organizer actions
    const handleOrganizerAction = async (id, action) => {
        try {
            if (action === 'disable') await api.patch(`/admin/organizers/${id}/disable`);
            if (action === 'delete') await api.delete(`/admin/organizers/${id}`);

            toast({ title: 'Success', description: `Organizer ${action}d`, status: 'success', duration: 2500, isClosable: true });
            loadAdminData();
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Action failed', status: 'error', duration: 3000, isClosable: true });
        }
    };

    // Handle password reset request decision
    const handleRequestDecision = async (request, action) => {
        try {
            const requestId = request._id;
            const payload = {
                action,
                adminComment: requestAction[requestId]?.adminComment || ''
            };

            const { data } = await api.patch(`/admin/password-reset-requests/${requestId}`, payload);

            if (action === 'approve' && data?.generatedPassword) {
                setGeneratedResetCredentials({
                    organizerName: request.organizerId?.organizerName || request.organizerId?.email || 'Organizer',
                    email: request.organizerId?.email || 'N/A',
                    password: data.generatedPassword
                });
            }

            toast({ title: 'Done', description: `Request ${action}d`, status: 'success', duration: 2500, isClosable: true });
            loadAdminData();
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to process request', status: 'error', duration: 3000, isClosable: true });
        }
    };

    return (
        <Container maxW="container.lg" py={10}>
            {/* Header Section */}
            <HStack justifyContent="space-between" mb={8}>
                <Box>
                    <Heading color="blue.600">Admin Dashboard</Heading>
                    <Text color="gray.500">System Control Center</Text>
                </Box>
                <Button colorScheme="red" variant="outline" onClick={handleLogout}>
                    Logout
                </Button>
            </HStack>

            <Divider mb={8} />

            {/* Create Organizer Form */}
            <Box p={8} bg="white" boxShadow="md" borderRadius="lg" border="1px" borderColor="gray.200">
                <Heading size="md" mb={6}>Add New Event Organizer</Heading>

                {generatedCredentials && (
                    <Alert status="success" variant="left-accent" mb={6} alignItems="start">
                        <AlertIcon mt={1} />
                        <Box flex="1">
                            <AlertTitle>Organizer Credentials Generated</AlertTitle>
                            <AlertDescription>
                                <Text fontSize="sm">Organizer: {generatedCredentials.organizerName}</Text>
                                <Text fontSize="sm">Email: {generatedCredentials.email}</Text>
                                <Text fontSize="sm">Password: {generatedCredentials.password}</Text>
                            </AlertDescription>
                        </Box>
                        <CloseButton position="relative" right={-1} top={-1} onClick={() => setGeneratedCredentials(null)} />
                    </Alert>
                )}
                
                <VStack spacing={4}>
                    <HStack width="100%">
                        <FormControl isRequired>
                            <FormLabel>Organizer/Club Name</FormLabel>
                            <Input name="organizerName" placeholder="e.g. Coding Club" value={formData.organizerName} onChange={handleChange} />
                        </FormControl>
                        <FormControl isRequired>
                            <FormLabel>Category</FormLabel>
                            <Select name="category" value={formData.category} onChange={handleChange}>
                                <option value="Technical">Technical</option>
                                <option value="Cultural">Cultural</option>
                                <option value="Sports">Sports</option>
                            </Select>
                        </FormControl>
                    </HStack>

                    <FormControl>
                        <FormLabel>Description</FormLabel>
                        <Input name="description" placeholder="Brief description of the club/organizer" value={formData.description} onChange={handleChange} />
                    </FormControl>

                    <Button colorScheme="blue" width="100%" onClick={handleAddOrganizer}>
                        Create Organizer Account
                    </Button>
                </VStack>
            </Box>

            <Box p={8} mt={8} bg="white" boxShadow="md" borderRadius="lg" border="1px" borderColor="gray.200">
                <Heading size="md" mb={6}>Manage Clubs / Organizers</Heading>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {organizers.map((org) => (
                        <Box key={org._id} border="1px" borderColor="gray.200" borderRadius="md" p={4}>
                            <Text fontWeight="bold">{org.organizerName || org.email}</Text>
                            <Text fontSize="sm">Category: {org.category || 'N/A'}</Text>
                            <Text fontSize="sm">Email: {org.email}</Text>
                            <Text fontSize="sm">Status: {org.isActive ? 'Active' : 'Disabled'}</Text>
                            <HStack mt={3}>
                                <Button size="sm" onClick={() => handleOrganizerAction(org._id, 'disable')}>Disable</Button>
                                <Button size="sm" colorScheme="red" onClick={() => handleOrganizerAction(org._id, 'delete')}>Delete</Button>
                            </HStack>
                        </Box>
                    ))}
                </SimpleGrid>
            </Box>

            <Box p={8} mt={8} bg="white" boxShadow="md" borderRadius="lg" border="1px" borderColor="gray.200">
                <Heading size="md" mb={6}>Password Reset Requests</Heading>

                {generatedResetCredentials && (
                    <Alert status="success" variant="left-accent" mb={6} alignItems="start">
                        <AlertIcon mt={1} />
                        <Box flex="1">
                            <AlertTitle>New Password Generated</AlertTitle>
                            <AlertDescription>
                                <Text fontSize="sm">Organizer: {generatedResetCredentials.organizerName}</Text>
                                <Text fontSize="sm">Email: {generatedResetCredentials.email}</Text>
                                <Text fontSize="sm">New Password: {generatedResetCredentials.password}</Text>
                            </AlertDescription>
                        </Box>
                        <CloseButton position="relative" right={-1} top={-1} onClick={() => setGeneratedResetCredentials(null)} />
                    </Alert>
                )}

                <VStack spacing={4} align="stretch">
                    {requests.map((request) => (
                        <Box key={request._id} border="1px" borderColor="gray.200" borderRadius="md" p={4}>
                            <Text fontWeight="bold">{request.organizerId?.organizerName || request.organizerId?.email}</Text>
                            <Text fontSize="sm">Status: {request.status}</Text>
                            <Text fontSize="sm">Reason: {request.reason || 'N/A'}</Text>
                            <Text fontSize="sm">Admin Comment: {request.adminComment || 'N/A'}</Text>

                            {request.status === 'pending' && (
                                <>
                                    <FormControl mt={3}>
                                        <FormLabel>Admin Comment</FormLabel>
                                        <Textarea
                                            value={requestAction[request._id]?.adminComment || ''}
                                            onChange={(e) => setRequestAction({
                                                ...requestAction,
                                                [request._id]: { ...(requestAction[request._id] || {}), adminComment: e.target.value }
                                            })}
                                        />
                                    </FormControl>

                                    <HStack mt={3}>
                                        <Button size="sm" colorScheme="green" onClick={() => handleRequestDecision(request, 'approve')}>Approve</Button>
                                        <Button size="sm" colorScheme="red" onClick={() => handleRequestDecision(request, 'reject')}>Reject</Button>
                                    </HStack>
                                </>
                            )}
                        </Box>
                    ))}
                </VStack>
            </Box>
        </Container>
    );
};

export default AdminDashboard;