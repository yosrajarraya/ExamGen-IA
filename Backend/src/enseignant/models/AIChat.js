// models/AIChat.js
const mongoose = require('mongoose');

const aiChatSchema = new mongoose.Schema({
    enseignant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 100
    },
    messages: [{
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        questions: [{
            text: String,
            type: { type: String },
            points: Number,
            options: [{
                id: String,
                text: String,
                correct: Boolean
            }],
            answerLines: Number,
            imageUrl: String
        }],
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUpdate: {
        type: Date,
        default: Date.now
    }
});

aiChatSchema.index({ enseignant: 1, lastUpdate: -1 });

module.exports = mongoose.model('AIChat', aiChatSchema);