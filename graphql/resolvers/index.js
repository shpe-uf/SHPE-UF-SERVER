const usersResolvers = require("./users.js");
const eventsResolvers = require("./events.js");
const requestsResolvers = require("./requests.js");
const tasksResolvers = require("./tasks.js");
const corporationResolvers = require("./corporations.js");
const alumnisResolvers = require("./alumnis.js");
const reimbursementsResolvers = require("./reimbursements.js");
const shpeRentalsResolvers = require("./rentables.js")
const bugReportResolvers = require("./reportBug.js")

module.exports = {
  Query: {
    ...usersResolvers.Query,
    ...eventsResolvers.Query,
    ...requestsResolvers.Query,
    ...tasksResolvers.Query,
    ...corporationResolvers.Query,
    ...alumnisResolvers.Query,
    ...reimbursementsResolvers.Query,
    ...shpeRentalsResolvers.Query
  },

  Mutation: {
    ...usersResolvers.Mutation,
    ...eventsResolvers.Mutation,
    ...requestsResolvers.Mutation,
    ...tasksResolvers.Mutation,
    ...corporationResolvers.Mutation,
    ...alumnisResolvers.Mutation,
    ...reimbursementsResolvers.Mutation,
    ...shpeRentalsResolvers.Mutation,
    ...bugReportResolvers.Mutation
  }
};
