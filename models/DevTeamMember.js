const { model, Schema } = require('mongoose');

const TEAM_NAMES = ['iOS Team', 'Website Team', 'Android Team'];
const DEV_POSITIONS = ['Scrum Master', 'Project Manager', 'Junior Project Manager', 'Senior Developer', 'Junior Developer'];

const devTeamSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    enum: DEV_POSITIONS,
    required: true,
  },
  team: {
    type: String,
    enum: TEAM_NAMES,
    required: true,
  },
  picture: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
    required: true,
  },
  createdAt: {
    type: String,
    default: () => new Date().toISOString(),
  },
});

module.exports = model('DevTeamMember', devTeamSchema);
