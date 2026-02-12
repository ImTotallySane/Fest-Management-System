const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorRole: { type: String, enum: ['participant', 'organizer'], required: true },
    content: { type: String, required: true },
    reactions: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        type: { type: String, enum: ['like', 'helpful', 'agree'] }
    }],
    createdAt: { type: Date, default: Date.now }
}, { _id: true });

const discussionSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorRole: { type: String, enum: ['participant', 'organizer'], required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    isPinned: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    replies: [replySchema],
    reactions: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        type: { type: String, enum: ['like', 'helpful', 'agree'] }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Discussion', discussionSchema);
