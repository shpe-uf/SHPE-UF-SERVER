const { model, Schema } = require('mongoose');

function coerceBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === '' || v === 'not graduating') return false;
    if (v === 'false' || v === 'no' || v === 'n' || v === '0') return false;
    if (v === 'true' || v === 'yes' || v === 'y' || v === '1') return true;

    return true;
  }
  return Boolean(value);
}

const userSchema = new Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
    default: '',
  },
  major: {
    type: String,
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  graduating: {
    type: Boolean,
    required: true,
    default: false,
    set: coerceBoolean,
  },
  country: {
    type: String,
    required: true,
  },
  ethnicity: {
    type: String,
    required: true,
  },
  sex: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: String,
    required: true,
  },
  yearSetAt: {
    type: String,
  },
  points: {
    type: Number,
    default: 0,
  },
  fallPoints: {
    type: Number,
    default: 0,
  },
  springPoints: {
    type: Number,
    default: 0,
  },
  summerPoints: {
    type: Number,
    default: 0,
  },
  fallPercentile: {
    type: Number,
    default: 0,
  },
  springPercentile: {
    type: Number,
    default: 0,
  },
  summerPercentile: {
    type: Number,
    default: 0,
  },
  permission: {
    type: String,
    default: 'member',
  },
  listServ: Boolean,
  internships: {
    type: [String],
  },
  socialMedia: {
    type: [String],
  },
  events: [
    {
      name: String,
      category: String,
      createdAt: String,
      points: Number,
    },
  ],
  tasks: [
    {
      name: String,
      startDate: String,
      points: Number,
    },
  ],
  bookmarkedTasks: [String],
  classes: {
    type: [String],
  },
  token: {
    type: String,
  },
  confirmed: {
    type: Boolean,
    default: false,
  },
  alumniConversionEmailSentAt: {
    type: String,
  },
  bookmarks: [String],
});

module.exports = model('User', userSchema);
