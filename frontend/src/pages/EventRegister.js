import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Button, Container, FormControl, FormLabel, Heading,
    Input, Text, VStack, Textarea, useToast
} from '@chakra-ui/react';
import api from '../utils/api';

const EventRegister = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const [event, setEvent] = useState(null);
    const [formAnswers, setFormAnswers] = useState({});
    const [paymentProofFile, setPaymentProofFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get(`/events/${id}`);
                setEvent(data.event);
            } catch {
                toast({ title: 'Error', description: 'Failed to load event', status: 'error', duration: 3000, isClosable: true });
                navigate(-1);
            }
        };
        load();
    }, [id]);

    const handleSubmit = async () => {
        // validate required fields
        for (const field of (event.customFormFields || [])) {
            if (field.required && !formAnswers[field.label]?.toString().trim()) {
                toast({ title: 'Error', description: `"${field.label}" is required`, status: 'error', duration: 3000, isClosable: true });
                return;
            }
        }
        if (event.eventType === 'merchandise' && !paymentProofFile) {
            toast({ title: 'Error', description: 'Payment proof image is required', status: 'error', duration: 3000, isClosable: true });
            return;
        }

        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append('formAnswers', JSON.stringify(formAnswers));
            if (paymentProofFile) {
                formData.append('paymentProof', paymentProofFile);
            }
            await api.post(`/events/${id}/register`, formData);
            toast({
                title: 'Success',
                description: event.eventType === 'merchandise' ? 'Order placed! Awaiting organizer approval.' : 'Registration successful!',
                status: 'success',
                duration: 3000,
                isClosable: true
            });
            navigate('/participant/dashboard');
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Registration failed', status: 'error', duration: 3000, isClosable: true });
        } finally {
            setSubmitting(false);
        }
    };

    if (!event) return <Container py={8}><Text>Loading...</Text></Container>;

    const isMerch = event.eventType === 'merchandise';

    return (
        <Container maxW="container.sm" py={8}>
            <Button mb={4} onClick={() => navigate(-1)}>Back</Button>
            <Heading size="lg" mb={1}>{isMerch ? 'Purchase' : 'Register for'} {event.eventName}</Heading>
            <Text color="gray.500" mb={6}>Fill in the details below to complete your {isMerch ? 'purchase' : 'registration'}.</Text>

            <Box border="1px" borderColor="gray.200" borderRadius="md" p={6}>
                <VStack align="stretch" spacing={4}>

                    {isMerch && (
                        <FormControl isRequired>
                            <FormLabel>Payment Proof</FormLabel>
                            <Box
                                border="2px dashed"
                                borderColor={paymentProofFile ? 'green.400' : 'gray.300'}
                                borderRadius="md"
                                p={4}
                                textAlign="center"
                                cursor="pointer"
                                onClick={() => document.getElementById('paymentProofInput').click()}
                            >
                                <input
                                    id="paymentProofInput"
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={(e) => setPaymentProofFile(e.target.files[0] || null)}
                                />
                                {paymentProofFile ? (
                                    <Text color="green.600" fontSize="sm">✓ {paymentProofFile.name}</Text>
                                ) : (
                                    <Text color="gray.500" fontSize="sm">Click to upload a screenshot or photo of your payment</Text>
                                )}
                            </Box>
                            <Text fontSize="xs" color="gray.500" mt={1}>Organizer will verify before confirming your registration.</Text>
                        </FormControl>
                    )}

                    {(event.customFormFields || []).map((field) => (
                        <FormControl key={field.label} isRequired={field.required}>
                            <FormLabel>{field.label}{!field.required ? ' (optional)' : ''}</FormLabel>
                            {field.type === 'textarea' ? (
                                <Textarea
                                    value={formAnswers[field.label] || ''}
                                    onChange={(e) => setFormAnswers({ ...formAnswers, [field.label]: e.target.value })}
                                    placeholder={`Enter ${field.label}`}
                                />
                            ) : (
                                <Input
                                    type={field.type || 'text'}
                                    value={formAnswers[field.label] || ''}
                                    onChange={(e) => setFormAnswers({ ...formAnswers, [field.label]: e.target.value })}
                                    placeholder={`Enter ${field.label}`}
                                />
                            )}
                        </FormControl>
                    ))}

                    <Button colorScheme="green" onClick={handleSubmit} isLoading={submitting}>
                        {isMerch ? 'Confirm Purchase' : 'Confirm Registration'}
                    </Button>
                </VStack>
            </Box>
        </Container>
    );
};

export default EventRegister;
