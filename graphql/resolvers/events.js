const { GraphQLError } = require("graphql");
const { ApolloServerErrorCode } = require("@apollo/server/errors");
const Event = require("../../models/Event.js");
const User = require("../../models/User.js");
const Request = require("../../models/Request.js");

const {
  validateCreateEventInput,
  validateManualInputInput,
} = require("../../util/validators");

const categoryOptions = require("../../json/category.json");
const monthOptions = require("../../json/month.json");
var { events } = require("react-mapbox-gl/lib/map-events");

const {
  handleInputError,
  handleGeneralError,
} = require("../../util/error-handling");

module.exports = {
  Query: {
    async getEvents() {
      try {
        const events = await Event.find().sort({ createdAt: 1 });
        return events;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
    async getEventsReversed() {
      try {
        const events = await Event.find().sort({ createdAt: -1 });
        return events;
      } catch (err) {
        throw new Error(err);
      }
    },
  },

  Mutation: {
    async createEvent(
      _,
      {
        createEventInput: { name, code, category, expiration, request, points },
      }
    ) {
      const { valid, errors } = validateCreateEventInput(
        name,
        code,
        category,
        points,
        expiration
      );

      if (!valid) {
        handleInputError(errors);
      }

      const findPoints = categoryOptions.find(({ key }) => key === category);
      const month = new Date().getMonth();

      code = code.toLowerCase().trim().replace(/ /g, "");
      points = category === "Miscellaneous" ? points : findPoints.points;

      semester = monthOptions[month].value;
      expiration = new Date(
        new Date().getTime() + parseInt(expiration, 10) * 60 * 60 * 1000
      );
      request = request === "true" || request === true ? true : false;

      isEventNameDuplicate = await Event.findOne({ name });

      if (isEventNameDuplicate) {
        errors.general = "An event with that name already exists.";
        handleInputError(errors);
      }

      isEventCodeDuplicate = await Event.findOne({ code });

      if (isEventCodeDuplicate) {
        errors.general = "An event with that code already exists.";
        handleInputError(errors);
      }

      const newEvent = new Event({
        name,
        code,
        category,
        points,
        attendance: 0,
        expiration,
        semester,
        request,
        users: [],
        createdAt: new Date().toISOString(),
      });

      await newEvent.save();

      const updatedEvents = await Event.find();

      return updatedEvents;
    },

    async manualInput(_, { manualInputInput: { username, eventName } }) {
      const { valid, errors } = validateManualInputInput(username);

      if (!valid) {
        handleInputError(errors);
      }

      const user = await User.findOne({
        username,
      });

      const event = await Event.findOne({
        name: eventName,
      });

      const request = await Request.findOne({
        username: username,
        eventName: eventName,
      });

      if (!user) {
        errors.general = "User not found.";
        handleInputError(errors);
      }

      if (!event) {
        errors.general = "Event not found.";
        handleInputError(errors);
      }

      if (request) {
        errors.general =
          "This member has sent a request for this event code. Check the Requests tab.";
        handleInputError(errors);
      }

      user.events.map((userEvent) => {
        if (String(userEvent.name) == String(event.name)) {
          errors.general = "Event code already redeemed by the user.";
          handleInputError(errors);
        }
      });

      var pointsIncrease = {};

      if (event.semester === "Fall Semester") {
        pointsIncrease = {
          points: event.points,
          fallPoints: event.points,
        };
      } else if (event.semester === "Spring Semester") {
        pointsIncrease = {
          points: event.points,
          springPoints: event.points,
        };
      } else if (event.semester === "Summer Semester") {
        pointsIncrease = {
          points: event.points,
          summerPoints: event.points,
        };
      } else {
        errors.general = "Invalid event.";
        handleInputError(errors);
      }

      var updatedUser = await User.findOneAndUpdate(
        {
          username,
        },
        {
          $push: {
            events: {
              $each: [
                {
                  name: event.name,
                  category: event.category,
                  createdAt: event.createdAt,
                  points: event.points,
                },
              ],
              $sort: { createdAt: 1 },
            },
          },
          $inc: pointsIncrease,
        },
        {
          new: true,
        }
      );

      updatedUser.message = "";

      await Event.findOneAndUpdate(
        {
          name: eventName,
        },
        {
          $push: {
            users: {
              $each: [
                {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  username: user.username,
                  email: user.email,
                },
              ],
              $sort: { lastName: 1, firstName: 1 },
            },
          },
          $inc: {
            attendance: 1,
          },
        },
        {
          new: true,
        }
      );

      const updatedEvents = await Event.find();

      return updatedEvents;
    },
    async removeUserFromEvent(
      _,
      { manualInputInput: { username, eventName } }
    ) {
      const { valid, errors } = validateManualInputInput(username);

      if (!valid) {
        handleInputError(errors);
      }

      const user = await User.findOne({
        username,
      });

      const event = await Event.findOne({
        name: eventName,
      });

      if (!user) {
        errors.general = "User not found.";
        handleInputError(errors);
      }

      if (!event) {
        errors.general = "Event not found.";
        handleInputError(errors);
      }

      if (!user.events.map((e) => e.name).includes(event.name)) {
        errors.general = "User is not member of event.";
        handleInputError(errors);
      }

      newEvents = user.events.filter((e) => e.name !== event.name);
      newUsers = event.users.filter((e) => e.username !== user.username);

      if (event.semester === "Fall Semester") {
        await User.findOneAndUpdate(
          { username },
          {
            events: newEvents,
            points: user.points - event.points,
            fallPoints: user.fallPoints - event.points,
          }
        );
      } else if (event.semester === "Spring Semester") {
        await User.findOneAndUpdate(
          { username },
          {
            events: newEvents,
            points: user.points - event.points,
            springPoints: user.springPoints - event.points,
          }
        );
      } else if (event.semester === "Summer Semester") {
        await User.findOneAndUpdate(
          { username },
          {
            events: newEvents,
            points: user.points - event.points,
            summerPoints: user.summerPoints - event.points,
          }
        );
      } else {
        errors.general = "Invalid event.";
        handleInputError(errors);
      }

      newEvent = await Event.findOneAndUpdate(
        { name: eventName },
        { users: newUsers, attendance: event.attendance - 1 },
        { new: true }
      );

      return newEvent;
    },
    async deleteEvent(_, { eventName }) {
      const errors = {};
      const users = await User.find();
      const event = await Event.findOne({
        name: eventName,
      });

      if (!users || !users.length || users.length === 0) {
        errors.general = "User not found.";
        throw new GraphQLError("User not found.", {
          extensions: {
            exception: {
              code: ApolloServerErrorCode.BAD_USER_INPUT,
              errors,
            },
          },
        });
      }

      if (!event) {
        errors.general = "Event not found.";
        handleInputError(errors);
      }

      var pointsDecrease = {};

      if (event.semester === "Fall Semester") {
        pointsDecrease = {
          points: -event.points,
          fallPoints: -event.points,
        };
      } else if (event.semester === "Spring Semester") {
        pointsDecrease = {
          points: -event.points,
          springPoints: -event.points,
        };
      } else if (event.semester === "Summer Semester") {
        pointsDecrease = {
          points: -event.points,
          summerPoints: -event.points,
        };
      } else {
        errors.general = "Invalid event.";
        handleInputError(errors);
      }

      await Event.deleteOne({ name: eventName });

      await User.updateMany(
        {
          events: {
            $elemMatch: {
              name: eventName,
            },
          },
        },
        {
          $pull: {
            events: {
              name: eventName,
            },
          },
          $inc: pointsDecrease,
        }
      );

      events = await Event.find();

      return events;
    },
  },
};
