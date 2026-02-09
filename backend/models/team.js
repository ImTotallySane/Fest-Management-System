const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
        type: String, 
        enum: ['pending', 'accepted'], 
        default: 'pending' 
    },
    joinedAt: { type: Date }
}, { _id: false });

const teamSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    teamName: { type: String, required: true },
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teamSize: { type: Number, required: true, min: 2 },
    members: [teamMemberSchema],
    inviteCode: { type: String, unique: true, required: true },
    isComplete: { type: Boolean, default: false },
    completedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
