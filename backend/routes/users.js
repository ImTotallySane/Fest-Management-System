const express = require('express');
const router = express.Router();
const User = require('../models/user');
const PasswordResetRequest = require('../models/passwordResetRequest');
const Event = require('../models/event');
const { auth, allowRoles } = require('../middleware/auth');
const { ALLOWED_INTERESTS } = require('../constants/interests');

// get my profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// update profile fields (role based)
router.put('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'participant') {
            const { firstName, lastName, contactNumber, collegeName, interests, followedClubs } = req.body;
            user.firstName = firstName ?? user.firstName;
            user.lastName = lastName ?? user.lastName;
            user.contactNumber = contactNumber ?? user.contactNumber;
            user.collegeName = collegeName ?? user.collegeName;
            if (Array.isArray(interests)) {
                const invalidInterests = interests.filter((item) => !ALLOWED_INTERESTS.includes(item));
                if (invalidInterests.length > 0) {
                    return res.status(400).json({ message: 'Invalid interest values provided' });
                }
                user.interests = interests;
            }
            user.followedClubs = Array.isArray(followedClubs) ? followedClubs : user.followedClubs;
        }

        if (user.role === 'organizer') {
            const { organizerName, category, description, discordNotificationsEnabled } = req.body;
            user.organizerName = organizerName ?? user.organizerName;
            user.category = category ?? user.category;
            user.description = description ?? user.description;
            if (typeof discordNotificationsEnabled === 'boolean') {
                user.discordNotificationsEnabled = discordNotificationsEnabled;
            }
        }

        await user.save();
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// post registration onboarding for participant interests
router.put('/participant-interests', auth, allowRoles('participant'), async (req, res) => {
    try {
        const { interests } = req.body;

        if (!Array.isArray(interests) || interests.length === 0) {
            return res.status(400).json({ message: 'Select at least one interest' });
        }

        const invalidInterests = interests.filter((item) => !ALLOWED_INTERESTS.includes(item));
        if (invalidInterests.length > 0) {
            return res.status(400).json({ message: 'Invalid interest values provided' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.interests = interests;
        await user.save();

        res.json({ message: 'Interests updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// list all active organizers for participants
router.get('/organizers', auth, async (req, res) => {
    try {
        const organizers = await User.find({ role: 'organizer', isActive: true })
            .select('organizerName category description contactEmail contactNumber');
        res.json(organizers);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// organizer detail page for participants
router.get('/organizers/:id', auth, async (req, res) => {
    try {
        const organizer = await User.findOne({ _id: req.params.id, role: 'organizer' })
            .select('organizerName category description contactEmail contactNumber');

        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        const now = new Date();
        const upcomingEvents = await Event.find({ organizerId: req.params.id, eventStartDate: { $gte: now } })
            .select('eventName eventType eventStartDate status')
            .sort({ eventStartDate: 1 });

        const pastEvents = await Event.find({ organizerId: req.params.id, eventStartDate: { $lt: now } })
            .select('eventName eventType eventStartDate status')
            .sort({ eventStartDate: -1 });

        res.json({ organizer, upcomingEvents, pastEvents });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// follow organizer
router.post('/organizers/:id/follow', auth, allowRoles('participant'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const organizer = await User.findOne({ _id: req.params.id, role: 'organizer' });

        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        if (!user.followedClubs.map((id) => id.toString()).includes(req.params.id)) {
            user.followedClubs.push(req.params.id);
            await user.save();
        }

        res.json({ message: 'Followed organizer' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// unfollow organizer
router.delete('/organizers/:id/follow', auth, allowRoles('participant'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.followedClubs = user.followedClubs.filter((id) => id.toString() !== req.params.id);
        await user.save();

        res.json({ message: 'Unfollowed organizer' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// organizer can request reset from admin
router.post('/password-reset-request', auth, allowRoles('organizer'), async (req, res) => {
    try {
        const existing = await PasswordResetRequest.findOne({ organizerId: req.user.id, status: 'pending' });
        if (existing) {
            return res.status(400).json({ message: 'A pending request already exists' });
        }

        const request = new PasswordResetRequest({
            organizerId: req.user.id,
            reason: req.body.reason || ''
        });

        await request.save();
        res.status(201).json({ message: 'Password reset request submitted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
