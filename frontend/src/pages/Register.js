import { useState } from 'react';
import { 
    Box, 
    Button, 
    Input, 
    Heading, 
    VStack, 
    useToast, 
    Container, 
    FormControl, 
    FormLabel,
    Select,
    HStack,
    Text
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Register = () => {
    // 1. Initialize State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        contactNumber: '',
        collegeName: '',
        participantType: 'IIIT'
    });

    const toast = useToast();
    const navigate = useNavigate();

    // change handler, avoid writing 8 different functions
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // sending to backend
    const handleRegister = async () => {
        // validating iiit mail
        if (formData.participantType === 'IIIT') {
        const domain = formData.email.split('@')[1]; // get everything after @
        if (domain !== 'students.iiit.ac.in' && domain !== 'iiit.ac.in' && domain !== 'research.iiit.ac.in') {
            toast({
                title: "Invalid Email",
                description: "IIIT participants must use an @iiit.ac.in, @students.iiit.ac.in, or @research.iiit.ac.in email.",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
            return;
        }
    }
        try {
            const { data } = await api.post('/auth/register', formData);

            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);

            toast({
                title: "Registration Successful",
                description: "Account created! Select your interests next.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });

            // redirect user to onboarding interests page
            navigate('/participant/onboarding/interests');

        } catch (error) {
            toast({
                title: "Registration Failed",
                description: error.response?.data?.message || "Something went wrong",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        }
    };

    return (
        <Container centerContent maxW="container.sm" py={10}>
            <Box p={8} bg="white" w="100%" boxShadow="lg" borderRadius="lg" border="1px" borderColor="gray.200">
                <VStack spacing={4}>
                    <Heading size="lg">Create Account</Heading>
                    <Text fontSize="sm" color="gray.500">Join the Felicity Community</Text>
                    
                    {/* First & Last Name */}
                    <HStack width="100%">
                        <FormControl isRequired>
                            <FormLabel>First Name</FormLabel>
                            <Input name="firstName" onChange={handleChange} placeholder="First Name" />
                        </FormControl>
                        <FormControl isRequired>
                            <FormLabel>Last Name</FormLabel>
                            <Input name="lastName" onChange={handleChange} placeholder="Last Name" />
                        </FormControl>
                    </HStack>

                    {/* Email */}
                    <FormControl isRequired>
                        <FormLabel>Email Address</FormLabel>
                        <Input name="email" type="email" onChange={handleChange} placeholder="Enter your email" />
                    </FormControl>

                    {/* Password */}
                    <FormControl isRequired>
                        <FormLabel>Password</FormLabel>
                        <Input name="password" type="password" onChange={handleChange} placeholder="Create a password" />
                    </FormControl>

                    <FormControl isRequired>
                        <FormLabel>Contact Number</FormLabel>
                        <Input name="contactNumber" onChange={handleChange} placeholder="e.g. +91 98765 43210" />
                    </FormControl>

                    {/* College Name */}
                    <FormControl isRequired>
                        <FormLabel>College / Institute Name</FormLabel>
                        <Input name="collegeName" onChange={handleChange} placeholder="e.g. IIIT Hyderabad" />
                    </FormControl>

                    {/* Participant Type - CRITICAL FIX */}
                    <FormControl isRequired>
                        <FormLabel>Participant Type</FormLabel>
                        {/* Values here MUST match your Schema Enum exactly */}
                        <Select name="participantType" onChange={handleChange} value={formData.participantType}>
                            <option value="IIIT">IIIT Student/Staff</option>
                            <option value="Non-IIIT">Non-IIIT (External)</option>
                        </Select>
                    </FormControl>

                    {/* Submit Button */}
                    <Button colorScheme="green" width="100%" onClick={handleRegister} mt={4}>
                        Sign Up
                    </Button>
                    
                    {/* Back to Login Link */}
                    <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                        Already have an account? Login
                    </Button>
                </VStack>
            </Box>
        </Container>
    );
};

export default Register;