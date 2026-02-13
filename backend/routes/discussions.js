const express = require('express');
const router = express.Router();
const Discussion = require('../models/discussion');
const Event = require('../models/event');
const Registration = require('../models/registration');
const { auth, allowRoles } = require('../middleware/auth');

// GET ALL DISCUSSIONS FOR AN EVENT
router.get('/event/:eventId', auth, async (req, res) => {
    try {
        const discussions = await Discussion.find({ 
            eventId: req.params.eventId,
            isHidden: false
        })
        .populate('authorId', 'firstName lastName email organizerName')
        .populate('replies.authorId', 'firstName lastName email organizerName')
        .sort({ isPinned: -1, createdAt: -1 });

        res.json({ discussions });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// CREATE DISCUSSION POST (registered participants + organizer only)
router.post('/', auth, async (req, res) => {
    try {
        const { eventId, title, content } = req.body;

        if (!eventId || !title || !content) {
            return res.status(400).json({ message: 'Event ID, title, and content required' });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // check if user is organizer of event or registered participant
        const isOrganizer = String(event.organizerId) === String(req.user.id);
        
        let isRegistered = false;
        if (!isOrganizer) {
            const registration = await Registration.findOne({
                eventId,
                participantId: req.user.id
            });
            isRegistered = !!registration;
        }

        if (!isOrganizer && !isRegistered) {
            return res.status(403).json({ message: 'Only registered participants and event organizer can post' });
        }

        const discussion = new Discussion({
            eventId,
            authorId: req.user.id,
            authorRole: req.user.role,
            title,
            content
        });

        await discussion.save();

        // re-fetch with full populate so socket data serializes correctly
        const populated = await Discussion.findById(discussion._id)
            .populate('authorId', 'firstName lastName email organizerName')
            .populate('replies.authorId', 'firstName lastName email organizerName');

        // real-time broadcast
        req.app.get('io').to(`event:${eventId}`).emit('discussion:new', { discussion: populated });

        res.status(201).json({ message: 'Discussion created', discussion: populated });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ADD REPLY TO DISCUSSION
router.post('/:id/reply', auth, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ message: 'Reply content required' });
        }

        const discussion = await Discussion.findById(req.params.id);
        if (!discussion) {
            return res.status(404).json({ message: 'Discussion not found' });
        }

        // check if user can reply (organizer or registered participant)
        const event = await Event.findById(discussion.eventId);
        const isOrganizer = String(event.organizerId) === String(req.user.id);
        
        let isRegistered = false;
        if (!isOrganizer) {
            const registration = await Registration.findOne({
                eventId: discussion.eventId,
                participantId: req.user.id
            });
            isRegistered = !!registration;
        }

        if (!isOrganizer && !isRegistered) {
            return res.status(403).json({ message: 'Only registered participants and event organizer can reply' });
        }

        discussion.replies.push({
            authorId: req.user.id,
            authorRole: req.user.role,
            content
        });

        await discussion.save();

        // re-fetch with full populate so parent authorId is included correctly
        const populated = await Discussion.findById(discussion._id)
            .populate('authorId', 'firstName lastName email organizerName')
            .populate('replies.authorId', 'firstName lastName email organizerName');

        // real-time broadcast
        req.app.get('io').to(`event:${populated.eventId}`).emit('discussion:reply', { discussion: populated });

        res.json({ message: 'Reply added', discussion: populated });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ADD REACTION TO DISCUSSION
router.post('/:id/react', auth, async (req, res) => {
    try {
        const { type } = req.body;

        if (!['like', 'helpful', 'agree'].includes(type)) {
            return res.status(400).json({ message: 'Invalid reaction type' });
        }

        const discussion = await Discussion.findById(req.params.id);
        if (!discussion) {
            return res.status(404).json({ message: 'Discussion not found' });
        }

        const existingReaction = discussion.reactions.find(r => String(r.userId) === String(req.user.id));
        
        if (existingReaction) {
            existingReaction.type = type;
        } else {
            discussion.reactions.push({ userId: req.user.id, type });
        }

        await discussion.save();
        res.json({ message: 'Reaction added', discussion });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// REMOVE REACTION
router.delete('/:id/react', auth, async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);
        if (!discussion) {
            return res.status(404).json({ message: 'Discussion not found' });
        }

        discussion.reactions = discussion.reactions.filter(r => String(r.userId) !== String(req.user.id));
        await discussion.save();

        res.json({ message: 'Reaction removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PIN/UNPIN DISCUSSION (organizer only)
router.patch('/:id/pin', auth, allowRoles('organizer'), async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id).populate('eventId');
        if (!discussion) {
            return res.status(404).json({ message: 'Discussion not found' });
        }

        if (String(discussion.eventId.organizerId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Only event organizer can pin discussions' });
        }

        discussion.isPinned = !discussion.isPinned;
        await discussion.save();

        req.app.get('io').to(`event:${discussion.eventId._id}`).emit('discussion:updated', { discussion });

        res.json({ message: `Discussion ${discussion.isPinned ? 'pinned' : 'unpinned'}`, discussion });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// HIDE/UNHIDE DISCUSSION (organizer only - moderation)
router.patch('/:id/hide', auth, allowRoles('organizer'), async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id).populate('eventId');
        if (!discussion) {
            return res.status(404).json({ message: 'Discussion not found' });
        }

        if (String(discussion.eventId.organizerId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Only event organizer can moderate discussions' });
        }

        discussion.isHidden = !discussion.isHidden;
        await discussion.save();

        req.app.get('io').to(`event:${discussion.eventId._id}`).emit('discussion:hidden', { discussionId: discussion._id, isHidden: discussion.isHidden });

        res.json({ message: `Discussion ${discussion.isHidden ? 'hidden' : 'visible'}`, discussion });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
