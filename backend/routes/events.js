const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Event = require('../models/event');
const User = require('../models/user');
const Registration = require('../models/registration');
const QRCode = require('qrcode');
const { auth, allowRoles } = require('../middleware/auth');
const { sendTicketEmail, sendMerchandiseConfirmationEmail, sendMerchandiseApprovalEmail, sendMerchandiseRejectionEmail } = require('../config/mailer');

// multer setup for payment proof image uploads
const uploadDir = path.join(__dirname, '..', 'uploads', 'payment-proofs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

const makeTicketId = () => `TICKET-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const normalizeSearchText = (value = '') => value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const levenshteinDistance = (a = '', b = '') => {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

    for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
    for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

    for (let i = 1; i < rows; i += 1) {
        for (let j = 1; j < cols; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[a.length][b.length];
};

const similarityScore = (query, target) => {
    if (!query || !target) return 0;

    if (target.includes(query)) return 1;

    const maxLen = Math.max(query.length, target.length);
    if (!maxLen) return 0;

    const distance = levenshteinDistance(query, target);
    return 1 - (distance / maxLen);
};

const computeFuzzyScore = (query, event) => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return 1;

    const eventName = normalizeSearchText(event.eventName || '');
    const organizerName = normalizeSearchText(event.organizerId?.organizerName || '');
    const eventTokens = eventName.split(' ').filter(Boolean);
    const organizerTokens = organizerName.split(' ').filter(Boolean);

    const fullScore = Math.max(
        similarityScore(normalizedQuery, eventName),
        similarityScore(normalizedQuery, organizerName)
    );

    const tokenScore = Math.max(
        0,
        ...eventTokens.map((token) => similarityScore(normalizedQuery, token)),
        ...organizerTokens.map((token) => similarityScore(normalizedQuery, token))
    );

    return Math.max(fullScore, tokenScore);
};

const canParticipantRegister = (event, participantType) => {
    if (!event.eligibility || event.eligibility === 'All') return true;
    if (event.eligibility === 'IIIT only') return participantType === 'IIIT';
    return true;
};

// participant browse page + filters + trending
router.get('/browse', auth, allowRoles('participant'), async (req, res) => {
    try {
        const { search = '', eventType, eligibility, followedOnly, dateFrom, dateTo } = req.query;
        const participant = await User.findById(req.user.id).select('followedClubs interests');

        const query = { status: { $in: ['published', 'ongoing'] } };

        if (eventType) query.eventType = eventType;
        if (eligibility) query.eligibility = eligibility;
        if (followedOnly === 'true') {
            const followed = participant.followedClubs || [];
            query.organizerId = { $in: followed };
        }
        if (dateFrom || dateTo) {
            query.eventStartDate = {};
            if (dateFrom) query.eventStartDate.$gte = new Date(dateFrom);
            if (dateTo) query.eventStartDate.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
        }

        const baseEvents = await Event.find(query)
            .populate('organizerId', 'organizerName')
            .sort({ createdAt: -1 });

        const searchText = String(search || '').trim();
        const events = searchText
            ? baseEvents
                .map((event) => ({ event, fuzzyScore: computeFuzzyScore(searchText, event) }))
                .filter((item) => item.fuzzyScore >= 0.45)
                .sort((a, b) => {
                    if (b.fuzzyScore !== a.fuzzyScore) return b.fuzzyScore - a.fuzzyScore;
                    return new Date(b.event.createdAt) - new Date(a.event.createdAt);
                })
                .map((item) => item.event)
            : baseEvents;

        // trending top 5 last 24h by registration count
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const trending = await Registration.aggregate([
            { $match: { createdAt: { $gte: oneDayAgo } } },
            { $group: { _id: '$eventId', registrations: { $sum: 1 } } },
            { $sort: { registrations: -1 } },
            { $limit: 5 }
        ]);

        const trendingEventIds = trending.map((t) => t._id);
        const trendingEvents = await Event.find({ _id: { $in: trendingEventIds }, status: { $in: ['published', 'ongoing'] } })
            .select('eventName eventType eventStartDate registrationDeadline registrationFee eligibility')
            .populate('organizerId', 'organizerName');

        const participantInterests = participant?.interests || [];
        const recommendedEvents = events
            .map((event) => {
                const tags = event.eventTags || [];
                const score = tags.filter((tag) => participantInterests.includes(tag)).length;
                return { event, score };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((item) => item.event);

        res.json({ events, trendingEvents, recommendedEvents });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// participant dashboard records
router.get('/my-registrations', auth, allowRoles('participant'), async (req, res) => {
    try {
        const records = await Registration.find({ participantId: req.user.id })
            .populate({ path: 'eventId', select: 'eventName eventType eventStartDate eventEndDate organizerId', populate: { path: 'organizerId', select: 'organizerName' } })
            .sort({ createdAt: -1 });

        const upcoming = records.filter((r) => r.participationStatus === 'upcoming');
        const completed = records.filter((r) => r.participationStatus === 'completed');
        const cancelledRejected = records.filter((r) =>
            ['cancelled', 'rejected'].includes(r.participationStatus) ||
            r.paymentStatus === 'rejected'
        );
        const normal = records.filter((r) => r.eventType === 'normal');
        const merchandise = records.filter((r) => r.eventType === 'merchandise');

        res.json({ all: records, upcoming, completed, cancelledRejected, normal, merchandise });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// event detail for participant and organizer
router.get('/:id', auth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('organizerId', 'organizerName category contactEmail');
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const totalRegistered = await Registration.countDocuments({ eventId: event._id });
        const outOfStock = false;

        let notEligible = false;
        let myRegistration = null;
        if (req.user.role === 'participant') {
            const participant = await User.findById(req.user.id).select('participantType');
            notEligible = !canParticipantRegister(event, participant?.participantType);

            const registration = await Registration.findOne({ eventId: event._id, participantId: req.user.id })
                .sort({ createdAt: -1 })
                .select('ticketId teamName participationStatus qrCodeText');

            if (registration) {
                const qrCodeDataUrl = await QRCode.toDataURL(registration.qrCodeText, { width: 280 });
                myRegistration = {
                    _id: registration._id,
                    ticketId: registration.ticketId,
                    teamName: registration.teamName,
                    participationStatus: registration.participationStatus,
                    qrCodeDataUrl
                };
            }
        }

        res.json({
            event,
            myRegistration,
            blocking: {
                deadlinePassed: new Date(event.registrationDeadline) < new Date(),
                registrationLimitReached: totalRegistered >= event.registrationLimit,
                outOfStock,
                notEligible
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// participant registration / purchase
router.post('/:id/register', auth, allowRoles('participant'), upload.single('paymentProof'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        const participant = await User.findById(req.user.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (!canParticipantRegister(event, participant.participantType)) {
            return res.status(403).json({ message: 'You are not eligible for this event' });
        }

        if (new Date(event.registrationDeadline) < new Date()) {
            return res.status(400).json({ message: 'Registration deadline has passed' });
        }

        // only block duplicate registrations for normal events; merchandise allows reorders
        if (event.eventType !== 'merchandise') {
            const existing = await Registration.findOne({ eventId: event._id, participantId: req.user.id });
            if (existing) {
                return res.status(400).json({ message: 'Already registered for this event' });
            }
        }

        const count = await Registration.countDocuments({
            eventId: event._id,
            paymentStatus: { $in: ['not-required', 'successful', 'approved'] }
        });
        if (count >= event.registrationLimit) {
            return res.status(400).json({ message: 'Registration limit reached' });
        }

        const ticketId = makeTicketId();
        const qrCodeText = `EVENT:${event._id}|USER:${participant._id}|TICKET:${ticketId}`;

        // merchandise with fee requires payment approval
        let paymentStatus = 'not-required';
        if (event.registrationFee > 0) {
            if (event.eventType === 'merchandise') {
                paymentStatus = 'pending'; // requires organizer approval
            } else {
                paymentStatus = 'successful'; // auto-approve for normal events
            }
        }

        const formAnswers = req.body.formAnswers
            ? (typeof req.body.formAnswers === 'string' ? JSON.parse(req.body.formAnswers) : req.body.formAnswers)
            : {};
        const paymentProofPath = req.file ? `/uploads/payment-proofs/${req.file.filename}` : null;

        const registration = new Registration({
            eventId: event._id,
            participantId: participant._id,
            eventType: event.eventType,
            paymentStatus,
            amountPaid: event.registrationFee,
            quantity: 1,
            formAnswers,
            ticketId,
            qrCodeText,
            paymentProof: paymentProofPath
        });

        await registration.save();

        const participantName = `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || participant.email;

        // send confirmation email
        if (event.eventType === 'normal') {
            sendTicketEmail({
                to: participant.email,
                name: participantName,
                eventName: event.eventName,
                eventStart: event.eventStartDate,
                ticketId,
                qrCodeText
            }).catch((mailError) => {
                console.error('[Mailer] Ticket email failed:', mailError.message);
            });
        } else if (event.eventType === 'merchandise') {
            sendMerchandiseConfirmationEmail({
                to: participant.email,
                name: participantName,
                eventName: event.eventName,
                ticketId,
                variantLabel: req.body.variantLabel || registration.selectedVariant || '',
                quantity: registration.quantity,
                fee: registration.amountPaid
            }).catch((mailError) => {
                console.error('[Mailer] Merchandise confirmation email failed:', mailError.message);
            });
        }

        res.status(201).json({ message: 'Registration successful', registration });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Already registered for this event' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// organizer create event
router.post('/', auth, allowRoles('organizer'), async (req, res) => {
    try {
        const payload = {
            ...req.body,
            organizerId: req.user.id
        };

        const event = new Event(payload);
        await event.save();

        // Discord Webhook - auto-post new published events using env webhook URL
        if (event.status === 'published') {
            try {
                const organizer = await User.findById(req.user.id).select('organizerName discordNotificationsEnabled');
                const webhookUrl = process.env.WEBHOOK || process.env.DISCORD_WEBHOOK_URL;
                if (organizer?.discordNotificationsEnabled && webhookUrl) {
                    const webhookBody = {
                        content: `🎉 **New Event Published!**\n\n**${event.eventName}**\n${event.eventDescription.substring(0, 200)}...\n\n📅 Start: ${new Date(event.eventStartDate).toLocaleDateString()}\n🎫 Fee: ₹${event.registrationFee}\n👤 Organizer: ${organizer?.organizerName || 'Unknown'}\n🔗 Event ID: ${event._id}`
                    };
                    await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(webhookBody)
                    });
                }
            } catch (webhookError) {
                console.error('Discord webhook failed:', webhookError.message);
            }
        }

        res.status(201).json({ message: 'Event created successfully', event });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// organizer event list (dashboard)
router.get('/organizer/my-events/all', auth, allowRoles('organizer'), async (req, res) => {
    try {
        const events = await Event.find({ organizerId: req.user.id }).sort({ createdAt: -1 });

        const eventIds = events.map((event) => event._id);
        const analytics = await Registration.aggregate([
            { $match: { eventId: { $in: eventIds } } },
            {
                $group: {
                    _id: '$eventId',
                    registrations: { $sum: 1 },
                    revenue: { $sum: '$amountPaid' }
                }
            }
        ]);

        res.json({ events, analytics });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// organizer event detail + participants list
router.get('/organizer/:id/detail', auth, allowRoles('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizerId: req.user.id });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const participants = await Registration.find({ eventId: event._id })
            .populate('participantId', 'firstName lastName email')
            .sort({ createdAt: -1 });

        const stats = {
            registrations: participants.length,
            revenue: participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
            sales: participants.filter((p) => p.eventType === 'merchandise').length
        };

        res.json({ event, participants, stats });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// organizer status update (draft/publish/close/complete)
router.patch('/organizer/:id/status', auth, allowRoles('organizer'), async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['draft', 'published', 'ongoing', 'completed', 'closed'];

        if (!allowed.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const event = await Event.findOne({ _id: req.params.id, organizerId: req.user.id });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        event.status = status;
        await event.save();

        res.json({ message: 'Status updated', event });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// organizer edit event based on status rules
router.put('/organizer/:id', auth, allowRoles('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizerId: req.user.id });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.status === 'completed' || event.status === 'ongoing') {
            const allowedUpdates = ['status'];
            const keys = Object.keys(req.body);
            const hasInvalid = keys.some((key) => !allowedUpdates.includes(key));
            if (hasInvalid) {
                return res.status(400).json({ message: 'Only status can be changed for ongoing/completed events' });
            }
        }

        if ((event.status === 'published' || event.status === 'draft') && req.body.customFormFields) {
            const hasRegistrations = await Registration.exists({ eventId: event._id });
            if (hasRegistrations) {
                return res.status(400).json({ message: 'Form is locked after first registration' });
            }
        }

        Object.keys(req.body).forEach((key) => {
            event[key] = req.body[key];
        });

        await event.save();
        res.json({ message: 'Event updated', event });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// export CSV for organizer participants list
router.get('/organizer/:id/participants.csv', auth, allowRoles('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizerId: req.user.id });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const participants = await Registration.find({ eventId: event._id })
            .populate('participantId', 'firstName lastName email')
            .sort({ createdAt: -1 });

        const header = 'Name,Email,RegDate,Payment,TicketId';
        const rows = participants.map((p) => {
            const name = `${p.participantId?.firstName || ''} ${p.participantId?.lastName || ''}`.trim();
            const email = p.participantId?.email || '';
            const regDate = new Date(p.createdAt).toISOString();
            const payment = p.paymentStatus;
            return `${name},${email},${regDate},${payment},${p.ticketId}`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${event.eventName}-participants.csv"`);
        res.send([header, ...rows].join('\n'));
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// MERCHANDISE PAYMENT APPROVAL - organizer approves payment proof
router.patch('/organizer/:eventId/payment/:registrationId/approve', auth, allowRoles('organizer'), async (req, res) => {
    try {
        const { eventId, registrationId } = req.params;
        const { organizerComment } = req.body;

        const event = await Event.findOne({ _id: eventId, organizerId: req.user.id });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        const registration = await Registration.findOne({ _id: registrationId, eventId });
        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        if (registration.paymentStatus !== 'pending') {
            return res.status(400).json({ message: 'Payment is not pending approval' });
        }

        registration.paymentStatus = 'approved';
        registration.organizerComment = organizerComment || 'Approved';
        await registration.save();

        // send approval email
        const approvedParticipant = await User.findById(registration.participantId).select('email firstName lastName');
        if (approvedParticipant) {
            sendMerchandiseApprovalEmail({
                to: approvedParticipant.email,
                name: `${approvedParticipant.firstName} ${approvedParticipant.lastName}`,
                eventName: event.eventName,
                ticketId: registration.ticketId,
                qrCodeText: registration.qrCodeText,
                organizerComment: registration.organizerComment
            });
        }

        res.json({ message: 'Payment approved successfully', registration });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// MERCHANDISE PAYMENT REJECTION - organizer rejects payment proof
router.patch('/organizer/:eventId/payment/:registrationId/reject', auth, allowRoles('organizer'), async (req, res) => {
    try {
        const { eventId, registrationId } = req.params;
        const { organizerComment } = req.body;

        const event = await Event.findOne({ _id: eventId, organizerId: req.user.id });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        const registration = await Registration.findOne({ _id: registrationId, eventId });
        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        if (registration.paymentStatus !== 'pending') {
            return res.status(400).json({ message: 'Payment is not pending approval' });
        }

        registration.paymentStatus = 'rejected';
        registration.organizerComment = organizerComment || 'Payment proof rejected';
        await registration.save();

        // send rejection email
        const rejectedParticipant = await User.findById(registration.participantId).select('email firstName lastName');
        if (rejectedParticipant) {
            sendMerchandiseRejectionEmail({
                to: rejectedParticipant.email,
                name: `${rejectedParticipant.firstName} ${rejectedParticipant.lastName}`,
                eventName: event.eventName,
                organizerComment: registration.organizerComment
            });
        }

        res.json({ message: 'Payment rejected', registration });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

