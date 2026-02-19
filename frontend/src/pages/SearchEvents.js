import { useState } from 'react';
import {
    Badge, Box, Button, Container, FormControl, FormLabel,
    Heading, HStack, Input, Select, SimpleGrid, Spinner,
    Switch, Tag, Text, VStack
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const EventCard = ({ event, navigate }) => (
    <Box
        border="1px"
        borderColor="gray.200"
        borderRadius="lg"
        p={5}
        shadow="sm"
        _hover={{ shadow: 'md', borderColor: 'blue.300' }}
        transition="all 0.15s"
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        minH="160px"
    >
        <Box>
            <HStack mb={1} justifyContent="space-between">
                <Heading size="sm" noOfLines={1}>{event.eventName}</Heading>
                <Tag size="sm" colorScheme={event.eventType === 'merchandise' ? 'purple' : 'blue'} textTransform="capitalize">
                    {event.eventType}
                </Tag>
            </HStack>
            <Text fontSize="sm" color="gray.600">
                {event.organizerId?.organizerName || 'N/A'}
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
                Eligibility: {event.eligibility || 'All'}
            </Text>
            <Text fontSize="xs" color="gray.500">
                Deadline: {new Date(event.registrationDeadline).toLocaleDateString()}
            </Text>
            {event.registrationFee > 0 && (
                <Badge mt={1} colorScheme="orange">₹{event.registrationFee}</Badge>
            )}
        </Box>
        <HStack mt={4} spacing={2}>
            <Button size="sm" variant="outline" onClick={() => navigate(`/participant/events/${event._id}`)}>
                Details
            </Button>
            <Button size="sm" colorScheme="green" onClick={() => navigate(`/participant/events/${event._id}/register`)}>
                {event.eventType === 'merchandise' ? 'Purchase' : 'Register'}
            </Button>
        </HStack>
    </Box>
);

const SearchEvents = () => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        search: '',
        eventType: '',
        eligibility: '',
        followedOnly: false,
        dateFrom: '',
        dateTo: ''
    });
    const [events, setEvents] = useState([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/events/browse', { params: filters });
            setEvents(data.events || []);
            setSearched(true);
        } catch {
            setEvents([]);
            setSearched(true);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <Container maxW="container.xl" py={8}>
            <HStack justify="space-between" mb={8}>
                <Text fontSize="xl" fontWeight="semibold">Search Events</Text>
                <HStack spacing={2}>
                    <Button size="sm" variant="ghost" onClick={() => navigate('/participant/browse')}>← Browse</Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate('/participant/dashboard')}>Dashboard</Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate('/participant/profile')}>Profile</Button>
                </HStack>
            </HStack>

            <VStack align="stretch" spacing={3} mb={6}>
                <HStack spacing={3} flexWrap="wrap">
                    <FormControl maxW="260px">
                        <FormLabel fontSize="sm">Search</FormLabel>
                        <Input
                            size="sm"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            onKeyDown={handleKeyDown}
                            placeholder="Event name or organizer"
                        />
                    </FormControl>
                    <FormControl maxW="160px">
                        <FormLabel fontSize="sm">Type</FormLabel>
                        <Select size="sm" value={filters.eventType} onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}>
                            <option value="">All</option>
                            <option value="normal">Normal</option>
                            <option value="merchandise">Merchandise</option>
                        </Select>
                    </FormControl>
                    <FormControl maxW="160px">
                        <FormLabel fontSize="sm">Eligibility</FormLabel>
                        <Select size="sm" value={filters.eligibility} onChange={(e) => setFilters({ ...filters, eligibility: e.target.value })}>
                            <option value="">Open to all</option>
                            <option value="IIIT only">IIIT only</option>
                        </Select>
                    </FormControl>
                    <FormControl maxW="160px">
                        <FormLabel fontSize="sm">Start from</FormLabel>
                        <Input size="sm" type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
                    </FormControl>
                    <FormControl maxW="160px">
                        <FormLabel fontSize="sm">Start to</FormLabel>
                        <Input size="sm" type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
                    </FormControl>
                    <FormControl display="flex" alignItems="center" pt={6}>
                        <Switch size="sm" isChecked={filters.followedOnly} onChange={(e) => setFilters({ ...filters, followedOnly: e.target.checked })} mr={2} />
                        <FormLabel mb="0" fontSize="sm" whiteSpace="nowrap">Followed clubs only</FormLabel>
                    </FormControl>
                </HStack>
                <HStack>
                    <Button size="sm" colorScheme="blue" onClick={handleSearch} isLoading={loading}>Search</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setFilters({ search: '', eventType: '', eligibility: '', followedOnly: false, dateFrom: '', dateTo: '' }); setEvents([]); setSearched(false); }}>Clear</Button>
                </HStack>
            </VStack>

            {loading && <HStack justify="center" py={10}><Spinner size="md" /></HStack>}

            {!loading && searched && (
                <>
                    <Text mb={4} color="gray.500" fontSize="xs">{events.length} result{events.length !== 1 ? 's' : ''}</Text>
                    {events.length === 0 ? (
                        <Text color="gray.400" fontSize="sm">No events match your filters.</Text>
                    ) : (
                        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={3}>
                            {events.map((event) => <EventCard key={event._id} event={event} navigate={navigate} />)}
                        </SimpleGrid>
                    )}
                </>
            )}

            {!loading && !searched && (
                <Text color="gray.400" fontSize="sm" mt={6}>Enter a search term or set filters, then click Search.</Text>
            )}
        </Container>
    );
};

export default SearchEvents;
