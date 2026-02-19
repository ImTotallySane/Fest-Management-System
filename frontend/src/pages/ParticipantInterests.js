import { useState } from 'react';
import {
    Box,
    Button,
    Checkbox,
    CheckboxGroup,
    Container,
    Heading,
    SimpleGrid,
    Text,
    VStack,
    useToast
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ALLOWED_INTERESTS } from '../constants/interests';

const ParticipantInterests = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [interests, setInterests] = useState([]);

    const handleSubmit = async () => {
        try {
            if (interests.length > 0) {
                await api.put('/users/participant-interests', { interests });
                toast({
                    title: 'Saved',
                    description: 'Interests saved successfully',
                    status: 'success',
                    duration: 2000,
                    isClosable: true,
                });
            }
            navigate('/participant/onboarding/clubs');
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to save interests',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const handleSkip = () => {
        navigate('/participant/onboarding/clubs');
    };

    return (
        <Container centerContent maxW="container.md" py={10}>
            <Box p={8} bg="white" w="100%" boxShadow="lg" borderRadius="lg" border="1px" borderColor="gray.200">
                <VStack spacing={5} align="stretch">
                    <Heading size="lg">Choose Your Interests</Heading>
                    <Text color="gray.500">This helps us recommend relevant events.</Text>

                    <CheckboxGroup value={interests} onChange={setInterests}>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                            {ALLOWED_INTERESTS.map((interest) => (
                                <Checkbox key={interest} value={interest}>{interest}</Checkbox>
                            ))}
                        </SimpleGrid>
                    </CheckboxGroup>

                    <Button colorScheme="blue" onClick={handleSubmit}>Save &amp; Continue</Button>
                    <Button variant="ghost" colorScheme="gray" onClick={handleSkip}>Skip for now</Button>
                </VStack>
            </Box>
        </Container>
    );
};

export default ParticipantInterests;
