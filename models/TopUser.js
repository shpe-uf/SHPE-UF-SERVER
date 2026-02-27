const { model, Schema } = require('mongoose');

const topUserSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    semester: {
        type: String,
        required: true,
    },
    year: {
        type: Number,
        required: true,
    },
    points: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: String,
        required: true,
    },
});

topUserSchema.index({ user: 1, semester: 1, year: 1 }, { unique: true });

module.exports = model("TopUser", topUserSchema);
