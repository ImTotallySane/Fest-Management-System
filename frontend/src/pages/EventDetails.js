import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Button, Container, FormControl, FormLabel,
    Input, Select, SimpleGrid, Text, VStack, useToast, Tabs, TabList, TabPanels, Tab, TabPanel,
    Textarea, HStack, Badge, Divider, useDisclosure, Modal, ModalOverlay, ModalContent,
    ModalHeader, ModalCloseButton, ModalBody, Image
} from '@chakra-ui/react';
import { io } from 'socket.io-client';
import api from '../utils/api';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://127.0.0.1:6767';

const EventDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const [event, setEvent] = useState(null);
    const [blocking, setBlocking] = useState({
        deadlinePassed: false,
        registrationLimitReached: false,
        outOfStock: false,
        notEligible: false
    });

    const [discussions, setDiscussions] = useState([]);
    const [newDiscussion, setNewDiscussion] = useState({ title: '', content: '' });
    const [replyContent, setReplyContent] = useState({});
    const [activeTab, setActiveTab] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const socketRef = useRef(null);
    const activeTabRef = useRef(0);

    const [canSubmitFeedback, setCanSubmitFeedback] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
    const [myRegistration, setMyRegistration] = useState(null);
    const { isOpen, onOpen, onClose } = useDisclosure();

    const loadEvent = async () => {
        try {
            const { data } = await api.get(`/events/${id}`);
            setEvent(data.event);
            setMyRegistration(data.myRegistration || null);
            setBlocking(data.blocking || {});
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to load event', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const loadDiscussions = async () => {
        try {
            const { data } = await api.get(`/discussions/event/${id}`);
            setDiscussions(data.discussions);
        } catch {
            console.error('Failed to load discussions');
        }
    };

    const checkFeedbackEligibility = async () => {
        try {
            const { data } = await api.get(`/feedback/can-submit/${id}`);
            setCanSubmitFeedback(data.canSubmit);
            setFeedbackSubmitted(data.alreadySubmitted);
        } catch {
            console.error('Failed to check feedback eligibility');
        }
    };

    useEffect(() => {
        loadEvent();
        loadDiscussions();
        checkFeedbackEligibility();

        // socket.io real-time
        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join-event', id);
        });

        socket.on('discussion:new', ({ discussion }) => {
            setDiscussions(prev => {
                // keep pinned at top, new post at top of unpinned
                const pinned = prev.filter(d => d.isPinned);
                const unpinned = prev.filter(d => !d.isPinned);
                const updated = [...pinned, discussion, ...unpinned];
                return updated;
            });
            if (activeTabRef.current !== 1) {
                setUnreadCount(c => c + 1);
            }
        });

        socket.on('discussion:reply', ({ discussion }) => {
            setDiscussions(prev => prev.map(d => d._id === discussion._id ? discussion : d));
            if (activeTabRef.current !== 1) {
                setUnreadCount(c => c + 1);
            }
        });

        socket.on('discussion:updated', ({ discussion }) => {
            setDiscussions(prev => {
                const updated = prev.map(d => d._id === discussion._id ? discussion : d);
                return [...updated.filter(d => d.isPinned), ...updated.filter(d => !d.isPinned)];
            });
        });

        socket.on('discussion:hidden', ({ discussionId }) => {
            setDiscussions(prev => prev.filter(d => d._id !== discussionId));
        });

        return () => {
            socket.emit('leave-event', id);
            socket.disconnect();
        };
    }, [id]);

    const handlePostDiscussion = async () => {
        if (!newDiscussion.title || !newDiscussion.content) {
            toast({ title: 'Error', description: 'Title and content required', status: 'error', duration: 2000, isClosable: true });
            return;
        }
        try {
            await api.post('/discussions', { eventId: id, ...newDiscussion });
            setNewDiscussion({ title: '', content: '' });
            // no need to reload — socket will push the new discussion
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to post', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const handleReply = async (discussionId) => {
        const content = replyContent[discussionId];
        if (!content) return;
        try {
            await api.post(`/discussions/${discussionId}/reply`, { content });
            setReplyContent({ ...replyContent, [discussionId]: '' });
            // no need to reload — socket will push the update
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to reply', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const handleSubmitFeedback = async () => {
        try {
            await api.post('/feedback', { eventId: id, ...feedback });
            toast({ title: 'Success', description: 'Feedback submitted!', status: 'success', duration: 2500, isClosable: true });
            setFeedbackSubmitted(true);
            setCanSubmitFeedback(false);
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to submit feedback', status: 'error', duration: 3000, isClosable: true });
        }
    };

    if (!event) return <Container py={8}><Text>Loading...</Text></Container>;

    const isBlocked = blocking.deadlinePassed || blocking.registrationLimitReached || blocking.outOfStock || blocking.notEligible;

    return (
        <Container maxW="container.xl" py={8}>
            <Button mb={4} onClick={() => navigate(-1)}>Back</Button>

            <Tabs variant="enclosed" colorScheme="blue" index={activeTab} onChange={(i) => {
                setActiveTab(i);
                activeTabRef.current = i;
                if (i === 1) setUnreadCount(0);
            }}>
                <TabList>
                    <Tab>Event Details</Tab>
                    <Tab>
                        Discussion Forum
                        {unreadCount > 0 && (
                            <Badge ml={2} colorScheme="red" borderRadius="full">{unreadCount}</Badge>
                        )}
                    </Tab>
                    <Tab>Feedback</Tab>
                </TabList>

                <TabPanels>
                    <TabPanel>
                        <VStack align="stretch" spacing={3}>
                            <Text fontSize="lg" fontWeight="semibold">{event.eventName}</Text>
                            <Text color="gray.600" fontSize="sm">{event.eventDescription}</Text>

                            <Box borderTop="1px solid" borderColor="gray.100" pt={3}>
                                <Button size="sm" mb={3} onClick={() => navigate(`/participant/teams?eventId=${event._id}`)}>
                                    Manage Team For This Event
                                </Button>
                                <SimpleGrid columns={2} spacing={2}>
                                    <Text fontSize="sm" color="gray.500">Event ID</Text>
                                    <Text fontSize="sm" fontFamily="mono">{event._id}</Text>
                                    <Text fontSize="sm" color="gray.500">Organizer</Text>
                                    <Text fontSize="sm">{event.organizerId?.organizerName || 'N/A'}</Text>
                                    <Text fontSize="sm" color="gray.500">Type</Text>
                                    <Text fontSize="sm" textTransform="capitalize">{event.eventType}</Text>
                                    <Text fontSize="sm" color="gray.500">Eligibility</Text>
                                    <Text fontSize="sm">{event.eligibility || 'All'}</Text>
                                    <Text fontSize="sm" color="gray.500">Fee</Text>
                                    <Text fontSize="sm">{event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}</Text>
                                    <Text fontSize="sm" color="gray.500">Starts</Text>
                                    <Text fontSize="sm">{new Date(event.eventStartDate).toLocaleString()}</Text>
                                    <Text fontSize="sm" color="gray.500">Ends</Text>
                                    <Text fontSize="sm">{new Date(event.eventEndDate).toLocaleString()}</Text>
                                    <Text fontSize="sm" color="gray.500">Deadline</Text>
                                    <Text fontSize="sm">{new Date(event.registrationDeadline).toLocaleString()}</Text>
                                    {myRegistration?.ticketId && <>
                                        <Text fontSize="sm" color="gray.500">Ticket ID</Text>
                                        <Button variant="link" size="sm" justifyContent="flex-start" onClick={onOpen}>
                                            {myRegistration.ticketId}
                                        </Button>
                                    </>}
                                    {myRegistration?.teamName && <>
                                        <Text fontSize="sm" color="gray.500">Team</Text>
                                        <Text fontSize="sm">{myRegistration.teamName}</Text>
                                    </>}
                                    {(event.eventTags || []).length > 0 && <>
                                        <Text fontSize="sm" color="gray.500">Tags</Text>
                                        <Text fontSize="sm">{event.eventTags.join(', ')}</Text>
                                    </>}
                                </SimpleGrid>
                            </Box>

                            {isBlocked && (
                                <Box p={3} borderRadius="md" border="1px solid" borderColor="red.200" bg="red.50">
                                    <Text color="red.600" fontSize="sm">
                                        {blocking.deadlinePassed && 'Registration deadline has passed. '}
                                        {blocking.registrationLimitReached && 'Registration limit reached. '}
                                        {blocking.outOfStock && 'Out of stock. '}
                                        {blocking.notEligible && `This event is for ${event.eligibility} participants only.`}
                                    </Text>
                                </Box>
                            )}
                        </VStack>
                    </TabPanel>

                    <TabPanel>
                        <VStack align="stretch" spacing={4}>
                            <Box>
                                <Input
                                    placeholder="Title"
                                    value={newDiscussion.title}
                                    onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
                                    mb={2}
                                    size="sm"
                                />
                                <Textarea
                                    placeholder="Write a post…"
                                    value={newDiscussion.content}
                                    onChange={(e) => setNewDiscussion({ ...newDiscussion, content: e.target.value })}
                                    size="sm"
                                    mb={2}
                                    rows={3}
                                />
                                <Button size="sm" colorScheme="blue" onClick={handlePostDiscussion}>Post</Button>
                            </Box>

                            <Divider />

                            {discussions.length === 0 && (
                                <Text color="gray.400" fontSize="sm">No posts yet.</Text>
                            )}

                            {discussions.map((disc) => (
                                <Box key={disc._id} border="1px solid" borderColor="gray.200" borderRadius="md" p={4}>
                                    {disc.isPinned && <Text fontSize="xs" color="purple.500" fontWeight="semibold" mb={1}>Pinned</Text>}
                                    <Text fontWeight="medium" mb={1}>{disc.title}</Text>
                                    <Text fontSize="xs" color="gray.400" mb={2}>
                                        {disc.authorRole === 'organizer' ? disc.authorId?.organizerName : `${disc.authorId?.firstName} ${disc.authorId?.lastName}`} · {new Date(disc.createdAt).toLocaleString()}
                                    </Text>
                                    <Text fontSize="sm" mb={3}>{disc.content}</Text>

                                    {disc.replies.length > 0 && (
                                        <VStack align="stretch" spacing={2} mb={3} pl={3} borderLeft="2px solid" borderColor="gray.100">
                                            <Text fontSize="xs" color="gray.400" fontWeight="semibold">Replies ({disc.replies.length})</Text>
                                            {disc.replies.map((reply) => (
                                                <Box key={reply._id}>
                                                    <Text fontSize="xs" color="gray.400">
                                                        {reply.authorRole === 'organizer' ? reply.authorId?.organizerName : `${reply.authorId?.firstName} ${reply.authorId?.lastName}`} · {new Date(reply.createdAt).toLocaleString()}
                                                    </Text>
                                                    <Text fontSize="sm">{reply.content}</Text>
                                                </Box>
                                            ))}
                                        </VStack>
                                    )}

                                    <HStack mt={2}>
                                        <Input
                                            size="sm"
                                            placeholder="Write a reply…"
                                            value={replyContent[disc._id] || ''}
                                            onChange={(e) => setReplyContent({ ...replyContent, [disc._id]: e.target.value })}
                                        />
                                        <Button size="sm" onClick={() => handleReply(disc._id)}>Reply</Button>
                                    </HStack>
                                </Box>
                            ))}
                        </VStack>
                    </TabPanel>

                    <TabPanel>
                        {feedbackSubmitted ? (
                            <Text color="green.600" fontSize="sm">Feedback submitted. Thank you!</Text>
                        ) : canSubmitFeedback ? (
                            <VStack align="stretch" spacing={3} maxW="400px">
                                <Text fontWeight="medium">Submit Anonymous Feedback</Text>
                                <FormControl>
                                    <FormLabel fontSize="sm">Rating</FormLabel>
                                    <Select size="sm" value={feedback.rating} onChange={(e) => setFeedback({ ...feedback, rating: Number(e.target.value) })}>
                                        <option value={5}>5 — Excellent</option>
                                        <option value={4}>4 — Good</option>
                                        <option value={3}>3 — Average</option>
                                        <option value={2}>2 — Below average</option>
                                        <option value={1}>1 — Poor</option>
                                    </Select>
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontSize="sm">Comments (optional)</FormLabel>
                                    <Textarea size="sm" value={feedback.comment} onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })} placeholder="Share your experience" rows={3} />
                                </FormControl>
                                <Button size="sm" colorScheme="blue" onClick={handleSubmitFeedback}>Submit</Button>
                            </VStack>
                        ) : (
                            <Text color="gray.500" fontSize="sm">Feedback can be submitted after registering for this event.</Text>
                        )}
                    </TabPanel>
                </TabPanels>
            </Tabs>

            <Modal isOpen={isOpen} onClose={onClose} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Ticket QR</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <VStack spacing={3}>
                            <Text fontSize="sm" color="gray.500">{myRegistration?.ticketId}</Text>
                            {myRegistration?.qrCodeDataUrl && (
                                <Image src={myRegistration.qrCodeDataUrl} alt="Ticket QR" boxSize="280px" objectFit="contain" />
                            )}
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Container>
    );
};

export default EventDetails;
