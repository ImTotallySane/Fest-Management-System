const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventType: { type: String, enum: ['normal', 'merchandise'], required: true },
    participationStatus: {
        type: String,
        enum: ['upcoming', 'completed', 'cancelled', 'rejected'],
        default: 'upcoming'
    },
    paymentStatus: {
        type: String,
        enum: ['not-required', 'pending', 'approved', 'rejected', 'successful'],
        default: 'not-required'
    },
    amountPaid: { type: Number, default: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    formAnswers: { type: mongoose.Schema.Types.Mixed },
    ticketId: { type: String, required: true, unique: true },
    qrCodeText: { type: String, required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    teamName: { type: String },
    selectedVariant: { type: String },
    paymentProof: { type: String },
    organizerComment: { type: String }
}, { timestamps: true });

// non-unique index for query performance (merchandise allows multiple orders per participant)
registrationSchema.index({ eventId: 1, participantId: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
