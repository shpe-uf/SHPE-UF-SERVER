const { model, Schema } = require('mongoose');

const bugReportSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'in progress', 'closed'],
    default: 'open',
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
  },
  created_at: {
    type: Date,
    required: true,
    default: Date.now,
  },
  updated_at: {
    type: Date,
  },
  closed_at: {
    type: Date,
  },
  reporter_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  assignee_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
});

module.exports = model('BugReport', bugReportSchema);
