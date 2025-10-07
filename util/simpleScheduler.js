const User = require('../models/User.js');

/**
 * Simple scheduler for automatic year progression
 */
class SimpleScheduler {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * Add a job that runs at specified intervals
   */
  addJob(name, jobFunction, intervalMs) {
    if (this.jobs.has(name)) {
      console.warn(`Job ${name} already exists. Stopping previous instance.`);
      this.stopJob(name);
    }

    const jobId = setInterval(jobFunction, intervalMs);
    this.jobs.set(name, jobId);
    console.log(`Job ${name} scheduled to run every ${intervalMs}ms`);
  }

  /**
   * Stop a specific job
   */
  stopJob(name) {
    const jobId = this.jobs.get(name);
    if (jobId) {
      clearInterval(jobId);
      this.jobs.delete(name);
      console.log(`Job ${name} stopped`);
    }
  }

  /**
   * Stop all jobs
   */
  stopAll() {
    for (const [name, jobId] of this.jobs) {
      clearInterval(jobId);
      console.log(`Job ${name} stopped`);
    }
    this.jobs.clear();
  }
}

// Create global scheduler instance
const scheduler = new SimpleScheduler();

/**
 * Update all users' years using simple Date() logic
 */
async function updateAllUsersYears() {
  try {
    console.log('Starting automatic year update...');
    
    const users = await User.find();
    let updatedCount = 0;

    for (const user of users) {
      const now = new Date();
      const lastUpdate = user.updatedAt ? new Date(user.updatedAt) : now;
      const yearsDiff = now.getFullYear() - lastUpdate.getFullYear();

      if (yearsDiff >= 1) {
        let newYear = user.year;
        
        // Simple year progression
        if (user.year === "1st Year") newYear = "2nd Year";
        else if (user.year === "2nd Year") newYear = "3rd Year";
        else if (user.year === "3rd Year") newYear = "4th Year";
        else if (user.year === "4th Year") newYear = "5th Year or Higher";

        if (newYear !== user.year) {
          await User.findOneAndUpdate(
            { email: user.email },
            {
              year: newYear,
              updatedAt: now.toISOString(),
            },
            { new: true }
          );
          updatedCount++;
          console.log(`Updated ${user.email} from ${user.year} to ${newYear}`);
        }
      }
    }

    console.log(`Year update completed. Updated ${updatedCount} users.`);
  } catch (error) {
    console.error('Error in automatic year update:', error);
  }
}

/**
 * Initialize the year update job to run daily
 */
function initializeYearUpdate() {
  // Run every 24 hours (24 * 60 * 60 * 1000 ms)
  const dailyMs = 24 * 60 * 60 * 1000;
  scheduler.addJob('yearUpdate', updateAllUsersYears, dailyMs);
  
  console.log('Year update scheduler initialized');
}

module.exports = {
  scheduler,
  updateAllUsersYears,
  initializeYearUpdate
};
