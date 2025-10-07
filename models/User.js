const { model, Schema } = require('mongoose');

// Helper function to calculate year progression using JavaScript Date
function calculateYearProgression(currentYear, lastUpdated) {
  const now = new Date();
  const lastUpdate = lastUpdated ? new Date(lastUpdated) : now;
  
  // Calculate years difference
  const yearsDiff = now.getFullYear() - lastUpdate.getFullYear();
  
  // If a full year has passed, advance the year
  if (yearsDiff >= 1) {
    const yearProgression = {
      "1st Year": "2nd Year",
      "2nd Year": "3rd Year", 
      "3rd Year": "4th Year",
      "4th Year": "5th Year or Higher"
    };
    
    return yearProgression[currentYear] || currentYear;
  }
  
  return currentYear;
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
    type: String,
    required: true,
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
  bookmarks: [String],
});

// Pre-save middleware to automatically update year progression
userSchema.pre('save', function(next) {
  const newYear = calculateYearProgression(this.year, this.updatedAt);
  if (newYear !== this.year) {
    this.year = newYear;
    this.updatedAt = new Date().toISOString();
  }
  next();
});

module.exports = model('User', userSchema);
