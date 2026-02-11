const express = require('express');
const router = express.Router();
const Team = require('../models/team');
const Event = require('../models/event');
const User = require('../models/user');
const Registration = require('../models/registration');
const { auth, allowRoles } = require('../middleware/auth');
const crypto = require('crypto');
const { sendTeamTicketEmail } = require('../config/mailer');

// CREATE TEAM (leader creates team for an event)
router.post('/create', auth, allowRoles('participant'), async (req, res) => {
    try {
        const { eventId, teamName, teamSize } = req.body;

        if (!eventId || !teamName || !teamSize || teamSize < 2) {
            return res.status(400).json({ message: 'Valid event ID, team name, and team size (min 2) required' });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // check if user already in a team for this event
        const existingTeam = await Team.findOne({
            eventId,
            $or: [
                { leaderId: req.user.id },
                { 'members.participantId': req.user.id }
            ]
        });

        if (existingTeam) {
            return res.status(400).json({ message: 'You are already part of a team for this event' });
        }

        const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

        const team = new Team({
            eventId,
            teamName,
            leaderId: req.user.id,
            teamSize,
            inviteCode,
            members: [{ 
                participantId: req.user.id, 
                status: 'accepted', 
                joinedAt: new Date() 
            }]
        });

        await team.save();
        res.status(201).json({ message: 'Team created successfully', team });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET MY TEAMS (participant view)
router.get('/my-teams', auth, allowRoles('participant'), async (req, res) => {
    try {
        const teams = await Team.find({
            $or: [
                { leaderId: req.user.id },
                { 'members.participantId': req.user.id }
            ]
        }).populate('eventId', 'eventName eventStartDate').populate('leaderId', 'firstName lastName email').populate('members.participantId', 'firstName lastName email');

        res.json({ teams });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET TEAM DETAIL
router.get('/:id', auth, allowRoles('participant'), async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('eventId', 'eventName eventStartDate teamSize')
            .populate('leaderId', 'firstName lastName email')
            .populate('members.participantId', 'firstName lastName email');

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        res.json({ team });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// JOIN TEAM VIA INVITE CODE
router.post('/join', auth, allowRoles('participant'), async (req, res) => {
    try {
        const { inviteCode } = req.body;

        if (!inviteCode) {
            return res.status(400).json({ message: 'Invite code required' });
        }

        const team = await Team.findOne({ inviteCode });
        if (!team) {
            return res.status(404).json({ message: 'Invalid invite code' });
        }

        // normalize legacy pending members to accepted (approval flow removed)
        team.members.forEach((member) => {
            if (member.status === 'pending') {
                member.status = 'accepted';
                if (!member.joinedAt) member.joinedAt = new Date();
            }
        });

        if (team.isComplete) {
            return res.status(400).json({ message: 'Team is already complete' });
        }

        // check if user already in team
        const alreadyMember = team.members.some(m => String(m.participantId) === String(req.user.id));
        if (alreadyMember) {
            return res.status(400).json({ message: 'You are already in this team' });
        }

        // check if user in another team for same event
        const otherTeam = await Team.findOne({
            eventId: team.eventId,
            _id: { $ne: team._id },
            $or: [
                { leaderId: req.user.id },
                { 'members.participantId': req.user.id }
            ]
        });

        if (otherTeam) {
            return res.status(400).json({ message: 'You are already part of another team for this event' });
        }

        // check team size limit
        const currentMemberCount = team.members.filter(m => m.status === 'accepted').length;
        if (currentMemberCount >= team.teamSize) {
            return res.status(400).json({ message: 'Team is full' });
        }

        team.members.push({ 
            participantId: req.user.id, 
            status: 'accepted',
            joinedAt: new Date()
        });

        const newAcceptedCount = team.members.filter(m => m.status === 'accepted').length;
        if (newAcceptedCount === team.teamSize) {
            team.isComplete = true;
            team.completedAt = new Date();

            const event = await Event.findById(team.eventId);
            if (event) {
                for (const acceptedMember of team.members) {
                    if (acceptedMember.status === 'accepted') {
                        const existingReg = await Registration.findOne({
                            eventId: team.eventId,
                            participantId: acceptedMember.participantId
                        });

                        if (!existingReg) {
                            const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                            const qrCodeText = `EVENT:${team.eventId}|USER:${acceptedMember.participantId}|TICKET:${ticketId}|TEAM:${team._id}`;

                            const registration = new Registration({
                                eventId: team.eventId,
                                participantId: acceptedMember.participantId,
                                eventType: event.eventType,
                                ticketId,
                                qrCodeText,
                                paymentStatus: event.registrationFee > 0 ? 'successful' : 'not-required',
                                amountPaid: event.registrationFee || 0,
                                teamId: team._id,
                                teamName: team.teamName
                            });

                            await registration.save();

                            const memberUser = await User.findById(acceptedMember.participantId).select('email firstName lastName');
                            if (memberUser) {
                                sendTeamTicketEmail({
                                    to: memberUser.email,
                                    name: `${memberUser.firstName} ${memberUser.lastName}`,
                                    teamName: team.teamName,
                                    eventName: event.eventName,
                                    eventStart: event.eventStartDate,
                                    ticketId,
                                    qrCodeText
                                });
                            }
                        }
                    }
                }
            }
        }

        await team.save();
        res.json({ message: 'Joined team successfully', team });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// LEAVE TEAM (before completion only)
router.delete('/:id/leave', auth, allowRoles('participant'), async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        if (team.isComplete) {
            return res.status(400).json({ message: 'Cannot leave a completed team' });
        }

        if (String(team.leaderId) === String(req.user.id)) {
            return res.status(400).json({ message: 'Leader cannot leave team. Delete the team instead.' });
        }

        team.members = team.members.filter(m => String(m.participantId) !== String(req.user.id));
        await team.save();

        res.json({ message: 'Left team successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE TEAM (leader only, before completion)
router.delete('/:id', auth, allowRoles('participant'), async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        if (String(team.leaderId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Only team leader can delete the team' });
        }

        if (team.isComplete) {
            return res.status(400).json({ message: 'Cannot delete a completed team' });
        }

        await Team.findByIdAndDelete(req.params.id);
        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
