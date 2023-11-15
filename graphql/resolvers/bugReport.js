const BugReport = require("../../models/BugReport.js"); 

module.exports = {
  Query: {
    // READ ALL: Get all bug reports
    async bugReports() {
      try {
        const reports = await BugReport.find().sort({ created_at: -1 });
        return reports;
      } catch (err) {
        throw new Error(err);
      }
    },

    // READ ONE: Get a single bug report by ID
    async bugReport(_, { id }) {
      try {
        const report = await BugReport.findById(id);
        if (!report) {
          throw new Error('BugReport not found');
        }
        return report;
      } catch (err) {
        throw new Error(err);
      }
    },
  },

  Mutation: {
    // CREATE: Submit a new bug report
    async createBugReport(_, { input }) {
      const newBugReport = new BugReport({
        ...input, // spread the input fields
        created_at: new Date().toISOString(),
      });

      const report = await newBugReport.save();
      return report;
    },

    // UPDATE: Update an existing bug report
    async updateBugReport(_, { input }) {
      const { id, ...update } = input;
      try {
        const report = await BugReport.findByIdAndUpdate(id, update, { new: true });
        if (!report) {
          throw new Error('BugReport not found');
        }
        return report;
      } catch (err) {
        throw new Error(err);
      }
    },

    // DELETE: Delete a bug report
    async deleteBugReport(_, { id }) {
      try {
        const report = await BugReport.findByIdAndRemove(id);
        if (!report) {
          throw new Error('BugReport not found');
        }
        return true;
      } catch (err) {
        throw new Error(err);
        return false;
      }
    },
  },
};
