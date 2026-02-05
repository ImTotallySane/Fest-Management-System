const mongoose = require('mongoose');
const { ALLOWED_INTERESTS } = require('../constants/interests');

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String,
        enum: ['participant', 'organizer', 'admin'],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },

    // participant specific fields
    firstName: { type: String },
    lastName: { type: String },
    participantType: { 
        type: String, 
        enum: ['IIIT', 'Non-IIIT'] 
    },
    collegeName: { type: String },
    interests: [{ type: String, enum: ALLOWED_INTERESTS }],
    followedClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ORGANIZER SPECIFIC FIELDS
    organizerName: { type: String },
    category: { type: String },
    description: { type: String },
    discordNotificationsEnabled: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);