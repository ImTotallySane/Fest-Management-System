const mongoose = require('mongoose');
const { ALLOWED_INTERESTS } = require('../constants/interests');

const customFieldSchema = new mongoose.Schema({
    label: { type: String, required: true },
    type: {
        type: String,
        enum: ['text', 'dropdown', 'checkbox', 'file', 'number'],
        required: true
    },
    required: { type: Boolean, default: false },
    options: [{ type: String }]
}, { _id: false });

const variantSchema = new mongoose.Schema({
    variantLabel: { type: String },
    size: { type: String },
    color: { type: String },
    stock: { type: Number, default: 0, min: 0 }
}, { _id: false });

const eventSchema = new mongoose.Schema({
    eventName: { type: String, required: true },
    eventDescription: { type: String, required: true },
    eventType: { type: String, enum: ['normal', 'merchandise'], required: true },
    eligibility: { type: String, default: 'All' },
    registrationDeadline: { type: Date, required: true },
    eventStartDate: { type: Date, required: true },
    eventEndDate: { type: Date, required: true },
    registrationLimit: { type: Number, required: true, min: 1 },
    registrationFee: { type: Number, default: 0, min: 0 },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventTags: [{ type: String, enum: ALLOWED_INTERESTS }],
    status: {
        type: String,
        enum: ['draft', 'published', 'ongoing', 'completed', 'closed'],
        default: 'draft'
    },
    customFormFields: [customFieldSchema],
    merchandiseDetails: {
        variants: [variantSchema],
        purchaseLimitPerParticipant: { type: Number, default: 1, min: 1 }
    }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
