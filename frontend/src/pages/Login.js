import { useState } from 'react'; //remembers state
import { 
    Box, 
    Button, 
    Input, 
    Heading, 
    Text, 
    VStack,
    HStack, 
    useToast, 
    Container, 
    FormControl, 
    FormLabel 
} from '@chakra-ui/react'; // chakra elements to use
import { useNavigate } from 'react-router-dom'; // allows browser to switch URLs
import api from '../utils/api';

const Login = () => {
    // its the variable and the function which will update it
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // if i just did let email = "" then react wouldnt
    // know when to redraw the screen

    const toast = useToast();
    // call toast() to pop up messages
    const navigate = useNavigate();
    // call navigate() to change pages

    const handleLogin = async () => {
        try {
            // send email pwd to backend, data is token and role
            const { data } = await api.post('/auth/login', {
                email,
                password
            });

            // success notification
            toast({
                title: "Login Successful",
                description: `Welcome back, ${data.role}!`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });

            // save token and role for later
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            // localStorage is browser memory (you can refresh)

            // redirect (placeholder for now)
            // this is why data also has role along with jwt token
            if (data.role === 'admin') {
                navigate('/admin/dashboard');
            } else if (data.role === 'participant') {
                navigate('/participant/dashboard');
            } else if (data.role === 'organizer') {
                navigate('/organizer/dashboard');
            } else {
                navigate('/');
            }

        } catch (error) {
            // error notifixation
            toast({
                title: "Login Failed",
                description: error.response?.data?.message || "womp womp",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    return (
        <Container centerContent maxW="container.sm" h="100vh" justifyContent="center">
            <Box p={8} bg="white" w="100%" boxShadow="lg" borderRadius="lg" border="1px" borderColor="gray.200">
                <VStack spacing={6}>
                    <Heading size="lg">Sign In</Heading>
                    <Text color="gray.500">Welcome to Felicity Management</Text>
                    
                    <FormControl>
                        <FormLabel>Email Address</FormLabel>
                        <Input 
                            type="email"  
                            placeholder="Enter Email"
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                        />
                    </FormControl>

                    <FormControl>
                        <FormLabel>Password</FormLabel>
                        <Input 
                            type="password" 
                            placeholder="Enter password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                        />
                    </FormControl>
                    <HStack width="100%" spacing={4}> {/* <--- Removed the closing tag here */}
                        <Button 
                            colorScheme="blue" 
                            width="50%" // side by side
                            onClick={handleLogin}
                        >
                            Login
                        </Button>
                        <Button 
                            colorScheme="gray" 
                            variant="outline"
                            width="50%" 
                            onClick={() => navigate('/register')}
                        >
                            Register
                        </Button>
                    </HStack>
                </VStack>
            </Box>
        </Container>
    );
};

export default Login;