import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box, Button, Container, FormControl, FormLabel, Heading,
    HStack, Input, Select, SimpleGrid, Text, VStack, useToast,
    Badge, Textarea, Divider, Checkbox
} from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../utils/api';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://127.0.0.1:6767';

const OrganizerEventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const socketRef = useRef(null);

    const [data, setData] = useState({ event: null, participants: [], stats: { registrations: 0, revenue: 0, sales: 0 } });
    const [status, setStatus] = useState('draft');
    const [searchText, setSearchText] = useState('');
    const [discussions, setDiscussions] = useState([]);
    const [newDiscussion, setNewDiscussion] = useState({ title: '', content: '', isAnnouncement: false });
    const [replyContent, setReplyContent] = useState({});
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchDetail = async () => {
        try {
            const { data: response } = await api.get(`/events/organizer/${id}/detail`);
            setData(response);
            setStatus(response.event?.status || 'draft');
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to load event detail', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const loadDiscussions = async () => {
        try {
            const { data: response } = await api.get(`/discussions/event/${id}`);
            setDiscussions(response.discussions || []);
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to load discussions', status: 'error', duration: 3000, isClosable: true });
        }
    };

    useEffect(() => {
        fetchDetail();
        loadDiscussions();

        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join-event', id);
        });

        socket.on('discussion:new', ({ discussion }) => {
            setDiscussions((prev) => {
                const pinned = prev.filter((d) => d.isPinned);
                const unpinned = prev.filter((d) => !d.isPinned);
                return [...pinned, discussion, ...unpinned];
            });
            setUnreadCount((count) => count + 1);
        });

        socket.on('discussion:reply', ({ discussion }) => {
            setDiscussions((prev) => prev.map((d) => d._id === discussion._id ? discussion : d));
            setUnreadCount((count) => count + 1);
        });

        socket.on('discussion:updated', ({ discussion }) => {
            setDiscussions((prev) => {
                const updated = prev.map((d) => d._id === discussion._id ? { ...d, ...discussion } : d);
                return [...updated.filter((d) => d.isPinned), ...updated.filter((d) => !d.isPinned)];
            });
        });

        socket.on('discussion:hidden', ({ discussionId }) => {
            setDiscussions((prev) => prev.filter((d) => d._id !== discussionId));
        });

        return () => {
            socket.emit('leave-event', id);
            socket.disconnect();
        };
    }, [id]);

    const filteredParticipants = useMemo(() => {
        return data.participants.filter((item) => {
            const name = `${item.participantId?.firstName || ''} ${item.participantId?.lastName || ''}`.toLowerCase();
            const email = (item.participantId?.email || '').toLowerCase();
            const q = searchText.toLowerCase();
            return name.includes(q) || email.includes(q);
        });
    }, [data.participants, searchText]);

    const handleStatusUpdate = async () => {
        try {
            await api.patch(`/events/organizer/${id}/status`, { status });
            toast({ title: 'Success', description: 'Status updated', status: 'success', duration: 2500, isClosable: true });
            fetchDetail();
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Update failed', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const exportCSV = async () => {
        try {
            const response = await api.get(`/events/organizer/${id}/participants.csv`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `event-${id}-participants.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'CSV export failed', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const handlePostDiscussion = async () => {
        if (!newDiscussion.title.trim() || !newDiscussion.content.trim()) {
            toast({ title: 'Error', description: 'Title and content are required', status: 'error', duration: 2500, isClosable: true });
            return;
        }

        try {
            const title = newDiscussion.isAnnouncement && !newDiscussion.title.startsWith('[Announcement]')
                ? `[Announcement] ${newDiscussion.title}`
                : newDiscussion.title;

            const { data: response } = await api.post('/discussions', {
                eventId: id,
                title,
                content: newDiscussion.content
            });

            if (newDiscussion.isAnnouncement && response?.discussion?._id) {
                await api.patch(`/discussions/${response.discussion._id}/pin`);
            }

            setNewDiscussion({ title: '', content: '', isAnnouncement: false });
            toast({ title: 'Posted', description: 'Message posted successfully', status: 'success', duration: 2000, isClosable: true });
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to post message', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const handleReply = async (discussionId) => {
        const content = (replyContent[discussionId] || '').trim();
        if (!content) return;

        try {
            await api.post(`/discussions/${discussionId}/reply`, { content });
            setReplyContent((prev) => ({ ...prev, [discussionId]: '' }));
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to reply', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const handleTogglePin = async (discussionId) => {
        try {
            await api.patch(`/discussions/${discussionId}/pin`);
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to pin/unpin', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const handleHideDiscussion = async (discussionId) => {
        try {
            await api.patch(`/discussions/${discussionId}/hide`);
            toast({ title: 'Removed', description: 'Discussion hidden from forum', status: 'info', duration: 2000, isClosable: true });
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to hide discussion', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const handleReact = async (discussionId, type) => {
        try {
            const { data: response } = await api.post(`/discussions/${discussionId}/react`, { type });
            setDiscussions((prev) => prev.map((disc) => {
                if (disc._id !== discussionId) return disc;
                return { ...disc, reactions: response.discussion?.reactions || disc.reactions };
            }));
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to react', status: 'error', duration: 3000, isClosable: true });
        }
    };

    const reactionCount = (discussion, type) => (discussion.reactions || []).filter((r) => r.type === type).length;
    const myReactionType = (discussion) => {
        const userId = localStorage.getItem('userId');
        return (discussion.reactions || []).find((r) => String(r.userId) === String(userId))?.type;
    };

    if (!data.event) return <Container py={8}><Text>Loading...</Text></Container>;

    return (
        <Container maxW="container.xl" py={8}>
            <HStack justifyContent="space-between" mb={6}>
                <Heading size="lg">Organizer Event Detail</Heading>
                <HStack>
                    <Button onClick={() => navigate(`/organizer/events/${id}/feedback`)}>View Feedback</Button>
                    <Button onClick={() => navigate('/organizer/dashboard')}>Back</Button>
                </HStack>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
                <Box border="1px" borderColor="gray.200" borderRadius="md" p={4}>
                    <Heading size="sm" mb={2}>Overview</Heading>
                    <Text>Name: {data.event.eventName}</Text>
                    <Text>Type: {data.event.eventType}</Text>
                    <Text>Status: {data.event.status}</Text>
                    <Text>Dates: {new Date(data.event.eventStartDate).toLocaleDateString()} - {new Date(data.event.eventEndDate).toLocaleDateString()}</Text>
                    <Text>Eligibility: {data.event.eligibility}</Text>
                    <Text>Pricing: ₹{data.event.registrationFee}</Text>
                    <HStack mt={3}>
                        <FormControl><FormLabel>Status</FormLabel><Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="closed">Closed</option></Select></FormControl>
                        <Button mt={8} onClick={handleStatusUpdate}>Update</Button>
                    </HStack>
                </Box>

                <Box border="1px" borderColor="gray.200" borderRadius="md" p={4}>
                    <Heading size="sm" mb={2}>Analytics</Heading>
                    <Text>Registrations: {data.stats.registrations}</Text>
                    <Text>Sales: {data.stats.sales}</Text>
                    <Text>Revenue: ₹{data.stats.revenue}</Text>
                </Box>
            </SimpleGrid>

            <Box border="1px" borderColor="gray.200" borderRadius="md" p={4}>
                <HStack justifyContent="space-between" mb={3}>
                    <Heading size="sm">Participants</Heading>
                    <HStack>
                        <Input placeholder="Search by name/email" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                        <Button onClick={exportCSV}>Export CSV</Button>
                    </HStack>
                </HStack>

                <VStack align="stretch" spacing={2}>
                    {filteredParticipants.map((item) => (
                        <Box key={item._id} border="1px" borderColor="gray.100" borderRadius="md" p={3}>
                            <Text fontWeight="bold">{item.participantId?.firstName} {item.participantId?.lastName}</Text>
                            <Text fontSize="sm">{item.participantId?.email}</Text>
                            <Text fontSize="sm">Reg Date: {new Date(item.createdAt).toLocaleString()}</Text>
                            <Text fontSize="sm">Payment: {item.paymentStatus}</Text>
                            {item.paymentProof && (
                                <Box mt={1}>
                                    <Text fontSize="sm" fontWeight="medium">Payment Proof:</Text>
                                    <a href={`http://127.0.0.1:6767${item.paymentProof}`} target="_blank" rel="noreferrer">
                                        <img
                                            src={`http://127.0.0.1:6767${item.paymentProof}`}
                                            alt="Payment proof"
                                            style={{ maxWidth: 160, maxHeight: 120, marginTop: 4, borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer' }}
                                        />
                                    </a>
                                </Box>
                            )}
                            <Text fontSize="sm">Ticket: {item.ticketId}</Text>
                            {item.formAnswers && Object.keys(item.formAnswers).length > 0 && (
                                <Box mt={2} p={2} bg="gray.50" borderRadius="md" border="1px" borderColor="gray.200">
                                    <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={1}>Form Answers</Text>
                                    {Object.entries(item.formAnswers).map(([key, value]) => (
                                        <Text key={key} fontSize="sm"><strong>{key}:</strong> {value}</Text>
                                    ))}
                                </Box>
                            )}
                            {item.paymentStatus === 'pending' && (
                                <HStack mt={2} spacing={2}>
                                    <Button size="sm" colorScheme="green" onClick={async () => {
                                        try {
                                            await api.patch(`/events/organizer/${id}/payment/${item._id}/approve`, { organizerComment: 'Approved' });
                                            toast({ title: 'Success', description: 'Payment approved', status: 'success', duration: 2000, isClosable: true });
                                            fetchDetail();
                                        } catch (error) {
                                            toast({ title: 'Error', description: error.response?.data?.message || 'Failed', status: 'error', duration: 3000, isClosable: true });
                                        }
                                    }}>Approve</Button>
                                    <Button size="sm" colorScheme="red" onClick={async () => {
                                        try {
                                            await api.patch(`/events/organizer/${id}/payment/${item._id}/reject`, { organizerComment: 'Rejected' });
                                            toast({ title: 'Success', description: 'Payment rejected', status: 'success', duration: 2000, isClosable: true });
                                            fetchDetail();
                                        } catch (error) {
                                            toast({ title: 'Error', description: error.response?.data?.message || 'Failed', status: 'error', duration: 3000, isClosable: true });
                                        }
                                    }}>Reject</Button>
                                </HStack>
                            )}
                        </Box>
                    ))}
                </VStack>
            </Box>

            <Box border="1px" borderColor="gray.200" borderRadius="md" p={4} mt={6}>
                <HStack justifyContent="space-between" mb={3}>
                    <Heading size="sm">Discussion Forum (Real-time)</Heading>
                    <HStack>
                        {unreadCount > 0 && <Badge colorScheme="red" borderRadius="full">{unreadCount} new</Badge>}
                        <Button size="xs" onClick={() => setUnreadCount(0)}>Mark Read</Button>
                    </HStack>
                </HStack>

                <Box mb={4} p={3} border="1px" borderColor="gray.100" borderRadius="md" bg="gray.50">
                    <Input
                        size="sm"
                        placeholder="Title"
                        value={newDiscussion.title}
                        onChange={(e) => setNewDiscussion((prev) => ({ ...prev, title: e.target.value }))}
                        mb={2}
                    />
                    <Textarea
                        size="sm"
                        placeholder="Write an announcement, answer, or moderation note..."
                        value={newDiscussion.content}
                        onChange={(e) => setNewDiscussion((prev) => ({ ...prev, content: e.target.value }))}
                        mb={2}
                    />
                    <HStack justifyContent="space-between">
                        <Checkbox
                            isChecked={newDiscussion.isAnnouncement}
                            onChange={(e) => setNewDiscussion((prev) => ({ ...prev, isAnnouncement: e.target.checked }))}
                        >
                            Post as announcement (auto-pin)
                        </Checkbox>
                        <Button size="sm" colorScheme="blue" onClick={handlePostDiscussion}>Post</Button>
                    </HStack>
                </Box>

                <Divider mb={4} />

                <VStack align="stretch" spacing={3}>
                    {discussions.length === 0 && <Text color="gray.500" fontSize="sm">No messages yet.</Text>}

                    {discussions.map((disc) => {
                        const currentReaction = myReactionType(disc);
                        return (
                            <Box key={disc._id} border="1px" borderColor="gray.100" borderRadius="md" p={3}>
                                <HStack justifyContent="space-between" alignItems="start" mb={1}>
                                    <VStack align="start" spacing={0}>
                                        <HStack>
                                            {disc.isPinned && <Badge colorScheme="purple">Pinned</Badge>}
                                            {String(disc.title || '').startsWith('[Announcement]') && <Badge colorScheme="orange">Announcement</Badge>}
                                        </HStack>
                                        <Text fontWeight="semibold">{disc.title}</Text>
                                        <Text fontSize="xs" color="gray.500">
                                            {disc.authorRole === 'organizer'
                                                ? (disc.authorId?.organizerName || 'Organizer')
                                                : `${disc.authorId?.firstName || ''} ${disc.authorId?.lastName || ''}`.trim()
                                            } · {new Date(disc.createdAt).toLocaleString()}
                                        </Text>
                                    </VStack>
                                    <HStack>
                                        <Button size="xs" onClick={() => handleTogglePin(disc._id)}>
                                            {disc.isPinned ? 'Unpin' : 'Pin'}
                                        </Button>
                                        <Button size="xs" colorScheme="red" variant="outline" onClick={() => handleHideDiscussion(disc._id)}>
                                            Delete
                                        </Button>
                                    </HStack>
                                </HStack>

                                <Text fontSize="sm" mb={2}>{disc.content}</Text>

                                <HStack spacing={2} mb={2}>
                                    <Button size="xs" variant={currentReaction === 'like' ? 'solid' : 'outline'} onClick={() => handleReact(disc._id, 'like')}>
                                        Like ({reactionCount(disc, 'like')})
                                    </Button>
                                    <Button size="xs" variant={currentReaction === 'helpful' ? 'solid' : 'outline'} onClick={() => handleReact(disc._id, 'helpful')}>
                                        Helpful ({reactionCount(disc, 'helpful')})
                                    </Button>
                                    <Button size="xs" variant={currentReaction === 'agree' ? 'solid' : 'outline'} onClick={() => handleReact(disc._id, 'agree')}>
                                        Agree ({reactionCount(disc, 'agree')})
                                    </Button>
                                </HStack>

                                {Array.isArray(disc.replies) && disc.replies.length > 0 && (
                                    <VStack align="stretch" spacing={1} mb={2} pl={3} borderLeft="2px solid" borderColor="gray.100">
                                        {disc.replies.map((reply) => (
                                            <Box key={reply._id}>
                                                <Text fontSize="xs" color="gray.500">
                                                    {reply.authorRole === 'organizer'
                                                        ? (reply.authorId?.organizerName || 'Organizer')
                                                        : `${reply.authorId?.firstName || ''} ${reply.authorId?.lastName || ''}`.trim()
                                                    } · {new Date(reply.createdAt).toLocaleString()}
                                                </Text>
                                                <Text fontSize="sm">{reply.content}</Text>
                                            </Box>
                                        ))}
                                    </VStack>
                                )}

                                <HStack>
                                    <Input
                                        size="sm"
                                        placeholder="Reply to this message..."
                                        value={replyContent[disc._id] || ''}
                                        onChange={(e) => setReplyContent((prev) => ({ ...prev, [disc._id]: e.target.value }))}
                                    />
                                    <Button size="sm" onClick={() => handleReply(disc._id)}>Reply</Button>
                                </HStack>
                            </Box>
                        );
                    })}
                </VStack>
            </Box>
        </Container>
    );
};

export default OrganizerEventDetail;
