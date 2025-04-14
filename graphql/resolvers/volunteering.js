const Event = require("../../models/Event");
const User = require("../../models/User");
const VolunteeringAttendance = require("../../models/VolunteeringAttendance");
const {
  handleInputError,
  handleGeneralError,
} = require("../../util/error-handling");
require("dotenv").config();

const validateVolunteeringInputs = (user, code) => {
  const errors = {};
  if (!user) errors.user = "Username is required.";
  if (!code) errors.code = "Event code is required.";
  if (Object.keys(errors).length > 0) handleInputError(errors);
};

const getEvent = async (code) => {
  const event = await Event.findOne({ code });

  if (!event) handleInputError({ code: "Event not found." });
  if (event.category !== "Volunteering") {
    handleInputError({ code: "This event is not a volunteering event." });
  }

  return event;
};

const updateEventUsersArray = async (userDoc, event) => {
  const alreadyInEvent = event.users.some(
    (u) => u.username === userDoc.username
  );

  if (!alreadyInEvent) {
    await Event.updateOne(
      { _id: event._id },
      {
        $push: {
          users: {
            firstName: userDoc.firstName,
            lastName: userDoc.lastName,
            username: userDoc.username,
            email: userDoc.email,
          },
        },
        $inc: { attendance: 1 },
      }
    );
  }
};

const addPointsToUser = async (userDoc, event) => {
  const pointsUpdate = { points: event.points };

  if (event.semester === "Fall Semester")
    pointsUpdate.fallPoints = event.points;
  else if (event.semester === "Spring Semester")
    pointsUpdate.springPoints = event.points;
  else if (event.semester === "Summer Semester")
    pointsUpdate.summerPoints = event.points;

  await User.updateOne(
    { _id: userDoc._id },
    {
      $inc: pointsUpdate,
      $push: {
        events: {
          name: event.name,
          category: event.category,
          createdAt: new Date().toISOString(),
          points: event.points,
        },
      },
    }
  );
};

module.exports = {
  Mutation: {
    async submitVolunteeringCode(_, { input: { user, code, timestamp } }) {
      try {
        validateVolunteeringInputs(user, code);

        const userDoc = await User.findOne({ username: user });
        if (!userDoc) handleInputError({ user: "User not found." });

        const event = await getEvent(code);
        const currentTime = new Date(timestamp);
        const expiration = new Date(event.expiration);

        let attendance = await VolunteeringAttendance.findOne({
          user,
          event: code,
        });

        if (!attendance) {
          if (currentTime > expiration) {
            handleInputError({
              time: "You cannot check in after the event has expired.",
            });
          }

          attendance = new VolunteeringAttendance({
            user,
            event: code,
            checkInTime: currentTime,
          });

          await attendance.save();
          await updateEventUsersArray(userDoc, event);

          return attendance;
        }

        if (attendance.checkInTime && !attendance.checkOutTime) {
          const validCheckOutTime =
            currentTime > expiration ? expiration : currentTime;

          attendance.checkOutTime = validCheckOutTime;

          const totalMinutes =
            (validCheckOutTime - attendance.checkInTime) / 60000;
          let hours = Math.floor(totalMinutes / 60);
          if (totalMinutes % 60 >= 30) hours += 1;

          attendance.hoursVolunteered = hours;
          await attendance.save();
          await addPointsToUser(userDoc, event);

          return attendance;
        }

        handleInputError({
          general:
            "You have already checked in and checked out for this event.",
        });
      } catch (err) {
        handleGeneralError(
          err,
          "There was an error processing your check-in/out."
        );
      }
    },
  },
};
