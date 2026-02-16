const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/user');
const Event = require('../models/event');
const Registration = require('../models/registration');
const Discussion = require('../models/discussion');
const Feedback = require('../models/feedback');
const Team = require('../models/team');
const PasswordResetRequest = require('../models/passwordResetRequest');
const { auth, allowRoles } = require('../middleware/auth');

router.use(auth, allowRoles('admin'));

// list all organizers
router.get('/organizers', async (req, res) => {
    try {
        const organizers = await User.find({ role: 'organizer' })
            .select('organizerName category email contactNumber isActive createdAt');
        res.json(organizers);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// disable organizer account
router.patch('/organizers/:id/disable', async (req, res) => {
    try {
        const organizer = await User.findOne({ _id: req.params.id, role: 'organizer' });
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        organizer.isActive = false;
        await organizer.save();

        res.json({ message: 'Organizer disabled' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// permanently delete organizer
router.delete('/organizers/:id', async (req, res) => {
    try {
        const organizer = await User.findOne({ _id: req.params.id, role: 'organizer' });
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        const events = await Event.find({ organizerId: organizer._id }).select('_id');
        const eventIds = events.map((event) => event._id);

        if (eventIds.length > 0) {
            await Promise.all([
                Registration.deleteMany({ eventId: { $in: eventIds } }),
                Discussion.deleteMany({ eventId: { $in: eventIds } }),
                Feedback.deleteMany({ eventId: { $in: eventIds } }),
                Team.deleteMany({ eventId: { $in: eventIds } }),
                Event.deleteMany({ _id: { $in: eventIds } })
            ]);
        }

        await PasswordResetRequest.deleteMany({ organizerId: organizer._id });
        await User.updateMany(
            { role: 'participant', followedClubs: organizer._id },
            { $pull: { followedClubs: organizer._id } }
        );
        await User.deleteOne({ _id: organizer._id, role: 'organizer' });

        res.json({ message: 'Organizer deleted permanently' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// list password reset requests
router.get('/password-reset-requests', async (req, res) => {
    try {
        const requests = await PasswordResetRequest.find()
            .populate('organizerId', 'organizerName email')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// approve / reject request
router.patch('/password-reset-requests/:id', async (req, res) => {
    try {
        const { action, adminComment } = req.body;
        const request = await PasswordResetRequest.findById(req.params.id).populate('organizerId');

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request already processed' });
        }

        let generatedPassword = null;
        if (action === 'approve') {
            generatedPassword = require('crypto').randomBytes(8).toString('hex');

            const salt = await bcrypt.genSalt(10);
            request.organizerId.password = await bcrypt.hash(generatedPassword, salt);
            await request.organizerId.save();
            request.status = 'approved';
        } else if (action === 'reject') {
            request.status = 'rejected';
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        request.adminComment = adminComment || '';
        request.resolvedAt = new Date();
        await request.save();

        res.json({ message: `Request ${request.status}`, generatedPassword });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
