const express = require('express');
const router = express.Router();
const Feedback = require('../models/feedback');
const Event = require('../models/event');
const Registration = require('../models/registration');
const { auth, allowRoles } = require('../middleware/auth');

// SUBMIT FEEDBACK (participants only, for registered events)
router.post('/', auth, allowRoles('participant'), async (req, res) => {
    try {
        const { eventId, rating, comment } = req.body;

        if (!eventId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Event ID and valid rating (1-5) required' });
        }

        const registration = await Registration.findOne({
            eventId,
            participantId: req.user.id
        });

        if (!registration) {
            return res.status(403).json({ message: 'You can only submit feedback for events you registered for' });
        }

        // check if feedback already exists
        const existingFeedback = await Feedback.findOne({
            eventId,
            participantId: req.user.id
        });

        if (existingFeedback) {
            return res.status(400).json({ message: 'Feedback already submitted for this event' });
        }

        const feedback = new Feedback({
            eventId,
            participantId: req.user.id,
            rating,
            comment: comment || '',
            isAnonymous: true
        });

        await feedback.save();
        res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET FEEDBACK FOR EVENT (organizer only - aggregated view)
router.get('/event/:eventId', auth, allowRoles('organizer'), async (req, res) => {
    try {
        const ratingFilter = Number(req.query.rating || 0);
        if (req.query.rating && (!Number.isInteger(ratingFilter) || ratingFilter < 1 || ratingFilter > 5)) {
            return res.status(400).json({ message: 'rating must be an integer between 1 and 5' });
        }

        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (String(event.organizerId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Only event organizer can view feedback' });
        }

        const feedbacks = await Feedback.find({ eventId: req.params.eventId });

        const totalRatings = feedbacks.length;
        const averageRating = totalRatings > 0 
            ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalRatings).toFixed(2)
            : 0;

        const comments = feedbacks.filter(f => f.comment).map(f => ({
            rating: f.rating,
            comment: f.comment,
            createdAt: f.createdAt
        }));

        const filteredComments = ratingFilter
            ? comments.filter((item) => item.rating === ratingFilter)
            : comments;

        res.json({
            totalRatings,
            averageRating,
            comments: filteredComments,
            selectedRating: ratingFilter || null,
            filteredCommentCount: filteredComments.length,
            totalCommentCount: comments.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// CHECK IF PARTICIPANT CAN SUBMIT FEEDBACK
router.get('/can-submit/:eventId', auth, allowRoles('participant'), async (req, res) => {
    try {
        const registration = await Registration.findOne({
            eventId: req.params.eventId,
            participantId: req.user.id
        });

        const existingFeedback = await Feedback.findOne({
            eventId: req.params.eventId,
            participantId: req.user.id
        });

        res.json({
            canSubmit: !!registration && !existingFeedback,
            alreadySubmitted: !!existingFeedback
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
