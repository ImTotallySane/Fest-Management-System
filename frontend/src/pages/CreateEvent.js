import { useState, useEffect } from 'react';
import {
    Box, Button, Checkbox, CheckboxGroup, Container, FormControl, FormLabel, Heading,
    HStack, Input, Select, SimpleGrid, Switch, Textarea, Text, VStack, useToast, IconButton
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ALLOWED_INTERESTS } from '../constants/interests';

const CreateEvent = () => {
    const navigate = useNavigate();
    const toast = useToast();

    const [form, setForm] = useState({
        eventName: '',
        eventDescription: '',
        eventType: 'normal',
        eligibility: 'All',
        registrationDeadline: '',
        eventStartDate: '',
        eventEndDate: '',
        registrationLimit: 50,
        registrationFee: 0,
        eventTags: [],
        status: 'draft'
    });

    const [customFormFields, setCustomFormFields] = useState([
        { label: 'Roll Number', type: 'text', required: true }
    ]);

    useEffect(() => {
        if (form.eventType === 'merchandise') {
            setCustomFormFields(prev => {
                if (!prev.find(f => f.label === 'Color')) {
                    return [...prev, { label: 'Color', type: 'text', required: true }];
                }
                return prev;
            });
        }
    }, [form.eventType]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const addField = () => {
        setCustomFormFields([...customFormFields, { label: '', type: 'text', required: false }]);
    };

    const removeField = (index) => {
        setCustomFormFields(customFormFields.filter((_, i) => i !== index));
    };

    const updateField = (index, key, value) => {
        const updated = [...customFormFields];
        updated[index] = { ...updated[index], [key]: value };
        setCustomFormFields(updated);
    };

    const handleSubmit = async () => {
        const invalidField = customFormFields.find(f => !f.label.trim());
        if (invalidField) {
            toast({ title: 'Error', description: 'All form fields must have a name', status: 'error', duration: 3000, isClosable: true });
            return;
        }
        try {
            const payload = {
                eventName: form.eventName,
                eventDescription: form.eventDescription,
                eventType: form.eventType,
                eligibility: form.eligibility,
                registrationDeadline: form.registrationDeadline,
                eventStartDate: form.eventStartDate,
                eventEndDate: form.eventEndDate,
                registrationLimit: Number(form.registrationLimit),
                registrationFee: Number(form.registrationFee),
                eventTags: form.eventTags,
                status: form.status,
                customFormFields
            };

            await api.post('/events', payload);
            toast({ title: 'Success', description: 'Event created', status: 'success', duration: 2500, isClosable: true });
            navigate('/organizer/dashboard');
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create event', status: 'error', duration: 3500, isClosable: true });
        }
    };

    return (
        <Container maxW="container.md" py={8}>
            <HStack justifyContent="space-between" mb={6}>
                <Heading size="lg">Create Event</Heading>
                <Button onClick={() => navigate('/organizer/dashboard')}>Back</Button>
            </HStack>

            <VStack align="stretch" spacing={4}>
                <FormControl isRequired><FormLabel>Event Name</FormLabel><Input name="eventName" value={form.eventName} onChange={handleChange} /></FormControl>
                <FormControl isRequired><FormLabel>Description</FormLabel><Textarea name="eventDescription" value={form.eventDescription} onChange={handleChange} /></FormControl>
                <HStack>
                    <FormControl><FormLabel>Type</FormLabel><Select name="eventType" value={form.eventType} onChange={handleChange}><option value="normal">Normal</option><option value="merchandise">Merchandise</option></Select></FormControl>
                    <FormControl><FormLabel>Eligibility</FormLabel><Select name="eligibility" value={form.eligibility} onChange={handleChange}><option value="All">All</option><option value="IIIT only">IIIT only</option></Select></FormControl>
                </HStack>
                <HStack>
                    <FormControl><FormLabel>Registration Deadline</FormLabel><Input type="datetime-local" name="registrationDeadline" value={form.registrationDeadline} onChange={handleChange} /></FormControl>
                    <FormControl><FormLabel>Start Date</FormLabel><Input type="datetime-local" name="eventStartDate" value={form.eventStartDate} onChange={handleChange} /></FormControl>
                </HStack>
                <HStack>
                    <FormControl><FormLabel>End Date</FormLabel><Input type="datetime-local" name="eventEndDate" value={form.eventEndDate} onChange={handleChange} /></FormControl>
                    <FormControl><FormLabel>Registration Limit</FormLabel><Input type="number" name="registrationLimit" value={form.registrationLimit} onChange={handleChange} /></FormControl>
                </HStack>
                <HStack>
                    <FormControl><FormLabel>Registration Fee</FormLabel><Input type="number" name="registrationFee" value={form.registrationFee} onChange={handleChange} /></FormControl>
                    <FormControl><FormLabel>Status</FormLabel><Select name="status" value={form.status} onChange={handleChange}><option value="draft">Draft</option><option value="published">Published</option></Select></FormControl>
                </HStack>
                <FormControl><FormLabel>Event Tags (select all that apply)</FormLabel><CheckboxGroup value={form.eventTags} onChange={(values) => setForm({ ...form, eventTags: values })}><SimpleGrid columns={[2, 3, 4]} spacing={2}>{ALLOWED_INTERESTS.map((interest) => (<Checkbox key={interest} value={interest}>{interest}</Checkbox>))}</SimpleGrid></CheckboxGroup></FormControl>

                <Box border="1px" borderColor="gray.200" borderRadius="md" p={4}>
                    <HStack justifyContent="space-between" mb={3}>
                        <Heading size="sm">Registration Form Fields</Heading>
                        <Button size="sm" leftIcon={<AddIcon />} onClick={addField}>Add Field</Button>
                    </HStack>
                    <Text fontSize="sm" color="gray.500" mb={3}>Participants must fill these fields when registering.</Text>
                    <VStack align="stretch" spacing={3}>
                        {customFormFields.map((field, index) => (
                            <HStack key={index} spacing={3} align="center">
                                <FormControl>
                                    <Input
                                        placeholder="Field name (e.g. Roll Number)"
                                        value={field.label}
                                        onChange={(e) => updateField(index, 'label', e.target.value)}
                                    />
                                </FormControl>
                                <FormControl maxW="160px">
                                    <Select value={field.type} onChange={(e) => updateField(index, 'type', e.target.value)}>
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="textarea">Long Text</option>
                                    </Select>
                                </FormControl>
                                <HStack spacing={1} minW="90px">
                                    <Switch isChecked={field.required} onChange={(e) => updateField(index, 'required', e.target.checked)} />
                                    <Text fontSize="sm">Required</Text>
                                </HStack>
                                <IconButton icon={<DeleteIcon />} size="sm" colorScheme="red" variant="ghost" onClick={() => removeField(index)} aria-label="Remove field" />
                            </HStack>
                        ))}
                        {customFormFields.length === 0 && <Text fontSize="sm" color="gray.400">No fields added. Click "Add Field" to create one.</Text>}
                    </VStack>
                </Box>

                <Button colorScheme="blue" onClick={handleSubmit}>Save Event</Button>
            </VStack>
        </Container>
    );
};

export default CreateEvent;
