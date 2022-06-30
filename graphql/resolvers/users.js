const { UserInputError } = require("apollo-server");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const nodemailerSendgrid = require("nodemailer-sendgrid");

const User = require("../../models/User.js");
const Event = require("../../models/Event.js");
const Request = require("../../models/Request.js");
const Task = require("../../models/Task.js");

require("dotenv").config();

const transport = nodemailer.createTransport(
  nodemailerSendgrid({
    apiKey: process.env.SENDGRID_API_KEY,
  })
);

const {
  validateRegisterInput,
  validateLoginInput,
  validateRedeemPointsInput,
  validateEmailInput,
  validatePasswordInput,
  validateEditUserProfile,
} = require("../../util/validators");

function generateToken(user, time) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    process.env.SECRET,
    {
      expiresIn: time,
    }
  );
}

module.exports = {
  Query: {
    async getUsers() {
      try {
        const users = await User.find().sort({
          lastName: 1,
          firstName: 1,
        });
        return users;
      } catch (err) {
        throw new Error(err);
      }
    },

    async getUser(_, { userId }) {
      try {
        var user = await User.findById(userId);
        if (user) {
          const users = await User.find();
          const fallBelowUsers = await User.find()
            .where("fallPoints")
            .lt(user.fallPoints);
          const springBelowUsers = await User.find()
            .where("springPoints")
            .lt(user.springPoints);
          const summerBelowUsers = await User.find()
            .where("summerPoints")
            .lt(user.summerPoints);

          const fallPercentile = Math.trunc(
            (fallBelowUsers.length / users.length) * 100
          );
          const springPercentile = Math.trunc(
            (springBelowUsers.length / users.length) * 100
          );
          const summerPercentile = Math.trunc(
            (summerBelowUsers.length / users.length) * 100
          );

          var newUser = {
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            photo: user.photo,
            email: user.email,
            major: user.major,
            year: user.year,
            graduating: user.graduating,
            country: user.country,
            ethnicity: user.ethnicity,
            sex: user.sex,
            points: user.points,
            fallPoints: user.fallPoints,
            springPoints: user.springPoints,
            summerPoints: user.summerPoints,
            fallPercentile: fallPercentile,
            springPercentile: springPercentile,
            summerPercentile: summerPercentile,
            createdAt: user.createdAt,
            permission: user.permission,
            listServ: user.listServ,
            events: user.events,
            tasks: user.tasks,
            bookmarkedTasks: user.bookmarkedTasks,
            bookmarks: user.bookmarks,
            classes: user.classes,
            internships: user.internships,
            socialMedia: user.socialMedia,
          };

          return newUser;
        } else {
          throw new Error("User not found.");
        }
      } catch (err) {
        throw new Error(err);
      }
    },

    async getMajorStat() {
      try {
        const data = await User.aggregate([
          {
            $group: {
              _id: "$major",
              value: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              value: -1,
            },
          },
        ]);

        if (data) {
          return data;
        } else {
          throw new Error("Data not found.");
        }
      } catch (err) {
        throw new Error(err);
      }
    },

    async getYearStat() {
      try {
        const data = await User.aggregate([
          {
            $group: {
              _id: "$year",
              value: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
        ]);

        if (data) {
          return data;
        } else {
          throw new Error("Data not found.");
        }
      } catch (err) {
        throw new Error(err);
      }
    },

    async getCountryStat() {
      try {
        const data = await User.aggregate([
          {
            $group: {
              _id: "$country",
              value: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              value: -1,
            },
          },
        ]);

        if (data) {
          return data;
        } else {
          throw new Error("Data not found.");
        }
      } catch (err) {
        throw new Error(err);
      }
    },

    async getSexStat() {
      try {
        const data = await User.aggregate([
          {
            $group: {
              _id: "$sex",
              value: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              value: -1,
            },
          },
        ]);

        if (data) {
          return data;
        } else {
          throw new Error("Data not found.");
        }
      } catch (err) {
        throw new Error(err);
      }
    },

    async getEthnicityStat() {
      try {
        const data = await User.aggregate([
          {
            $group: {
              _id: "$ethnicity",
              value: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              value: -1,
            },
          },
        ]);

        if (data) {
          return data;
        } else {
          throw new Error("Data not found.");
        }
      } catch (err) {
        throw new Error(err);
      }
    },
  },

  Mutation: {
    async login(_, { username, password, remember }) {
      username = username.toLowerCase();

      const { errors, valid } = validateLoginInput(username, password);

      if (!valid) {
        throw new UserInputError("Errors", {
          errors,
        });
      }

      const user = await User.findOne({
        username,
      });

      if (!user) {
        errors.general = "User not found.";
        throw new UserInputError("User not found.", {
          errors,
        });
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        errors.general = "Wrong credentials.";
        throw new UserInputError("Wrong credentials.", {
          errors,
        });
      }

      const isConfirmed = user.confirmed;

      if (!isConfirmed) {
        errors.general = "User not confirmed.";
        throw new UserInputError("User not confirmed.", {
          errors,
        });
      }

      time = remember === "true" || remember === true ? "30d" : "24h";
      const token = generateToken(user, time);

      return {
        ...user._doc,
        id: user._id,
        token,
      };
    },

    async register(
      _,
      {
        registerInput: {
          firstName,
          lastName,
          major,
          year,
          graduating,
          country,
          ethnicity,
          sex,
          username,
          email,
          password,
          confirmPassword,
          listServ,
        },
      }
    ) {
      firstName = firstName.trim();
      lastName = lastName.trim();
      email = email.toLowerCase();
      username = username.toLowerCase();

      const { valid, errors } = validateRegisterInput(
        firstName,
        lastName,
        major,
        year,
        graduating,
        country,
        ethnicity,
        sex,
        username,
        email,
        password,
        confirmPassword
      );

      if (!valid) {
        throw new UserInputError("Errors", {
          errors,
        });
      }

      const isUsernameDuplicate = await User.findOne({
        username,
      });

      if (isUsernameDuplicate) {
        throw new UserInputError(
          "An account with that username already exists.",
          {
            errors: {
              username: "An account with that username already exists.",
            },
          }
        );
      }

      const isEmailDuplicate = await User.findOne({
        email,
      });

      if (isEmailDuplicate) {
        throw new UserInputError(
          "An account with that e-mail already exists.",
          {
            errors: {
              email: "An account with that email already exists.",
            },
          }
        );
      }

      password = await bcrypt.hash(password, 12);
      listServ = listServ === "true" || listServ === true ? true : false;

      const newUser = new User({
        firstName,
        lastName,
        major,
        year,
        graduating,
        country,
        ethnicity,
        sex,
        username,
        email,
        password,
        createdAt: new Date().toISOString(),
        points: 0,
        fallPoints: 0,
        springPoints: 0,
        summerPoints: 0,
        permission: "member",
        listServ,
        events: [],
        tasks: [],
        bookmarkedTasks: [],
        bookmarks: [],
        classes: [],
        internships: [],
        socialMedia: [],
      });

      const res = await newUser.save();

      const user = await User.findOne({
        email,
      });

      transport
        .sendMail({
          from: process.env.EMAIL,
          to: email,
          subject: "Confirm Email",
          html:
            "Thank you for registering, please click on the link below to complete your registration\n\n" +
            `${process.env.CLIENT_ORIGIN}/confirm/${user._id}\n\n`,
        })
        .then(() => {
          res.status(200).json("confirmation email sent");
        })
        .catch(() => {
          console.error("there was an error: ", err);
        });

      return {
        ...res._doc,
        id: res._id,
      };
    },

    async redeemPoints(_, { redeemPointsInput: { code, username } }) {
      code = code.toLowerCase().trim().replace(/ /g, "");

      const { valid, errors } = validateRedeemPointsInput(code);

      if (!valid) {
        throw new UserInputError("Errors", {
          errors,
        });
      }

      const event = await Event.findOne({
        code,
      });

      const user = await User.findOne({
        username,
      });

      if (!event) {
        errors.general = "Event not found.";
        throw new UserInputError("Event not found.", {
          errors,
        });
      }

      if (!user) {
        errors.general = "User not found.";
        throw new UserInputError("User not found.", {
          errors,
        });
      }

      if (Date.parse(event.expiration) < Date.now()) {
        errors.general = "Event code expired";
        throw new UserInputError("Event code expired", {
          errors,
        });
      }

      user.events.map((userEvent) => {
        if (String(userEvent.name) == String(event.name)) {
          errors.general = "Event code already redeemed.";
          throw new UserInputError("Event code already redeemed.", {
            errors,
          });
        }
      });

      if (event.request) {
        const request = await Request.findOne({
          name: event.name,
          username: user.username,
        });

        if (request) {
          errors.general = "Event code already sent for approval.";
          throw new UserInputError("Event code already sent for approval.", {
            errors,
          });
        }

        const newRequest = new Request({
          name: event.name,
          type: event.category,
          points: event.points,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          createdAt: new Date().toISOString(),
        });

        const res = await newRequest.save();

        var newUser = {
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          email: user.email,
          major: user.major,
          year: user.year,
          graduating: user.graduating,
          country: user.country,
          ethnicity: user.ethnicity,
          sex: user.sex,
          ethnicity: user.ethnicity,
          points: user.points,
          fallPoints: user.fallPoints,
          springPoints: user.springPoints,
          summerPoints: user.summerPoints,
          createdAt: user.createdAt,
          permission: user.permission,
          listServ: user.listServ,
          classes: user.classes,
          internships: user.internships,
          socialMedia: user.socialMedia,
          events: user.events,
          tasks: user.tasks,
          bookmarkedTasks: user.bookmarkedTasks,
          bookmarks: user.bookmarks,
          message: "Event code has been sent for approval.",
        };

        return newUser;
      } else {
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
          throw new UserInputError("Invalid event.", {
            errors,
          });
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
                $sort: {
                  createdAt: 1,
                },
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
            code,
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
                $sort: {
                  lastName: 1,
                  firstName: 1,
                },
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

        return updatedUser;
      }
    },

    async bookmarkTask(_, { bookmarkTaskInput: { name, username } }) {
      var errors = {};

      const task = await Task.findOne({
        name,
      });

      var updatedUser = await User.findOneAndUpdate(
        {
          username,
        },
        {
          $push: {
            bookmarkedTasks: task.name,
          },
        },
        {
          new: true,
        }
      );

      return updatedUser;
    },

    async unBookmarkTask(_, { unBookmarkTaskInput: { name, username } }) {
      var errors = {};

      const task = await Task.findOne({
        name,
      });

      var updatedUser = await User.findOneAndUpdate(
        {
          username,
        },
        {
          $pull: {
            bookmarkedTasks: task.name,
          },
        },
        {
          new: true,
        }
      );

      return updatedUser;
    },

    async redeemTasksPoints(_, { redeemTasksPointsInput: { name, username } }) {
      var errors = {};

      const user = await User.findOne({
        username,
      });

      const task = await Task.findOne({
        name,
      });

      const currentdate = new Date(); //gets ouput in UTC timezone
      //convert the end date string to a proper date object
      const temp = new Date(Date.parse(task.endDate));
      /*
      Set the end date until this end of this day. Because UTC is 4 hours ahead, that means that the end date
      will be 4hrs after midnight of the day specified by the deadline
      */
      const endDate = new Date(
        temp.getFullYear(),
        temp.getMonth(),
        temp.getDate(),
        23,
        59,
        59,
        999
      );

      if (endDate < currentdate) {
        errors.general = "Task Expired";
        throw new UserInputError("Task Expired", {
          errors,
        });
      }

      user.tasks.map((userTask) => {
        if (String(userTask.name) == String(task.name)) {
          errors.general = "Task already redeeemed by the user.";
          throw new UserInputError("Task already redeemed by the user.", {
            errors,
          });
        }
      });

      const request = await Request.findOne({
        name: task.name,
        username: user.username,
      });

      if (request) {
        errors.general = "Task already sent for approval.";
        throw new UserInputError("Task already sent for approval.", {
          errors,
        });
      }

      const newTaskRequest = new Request({
        name: task.name,
        type: "Task",
        points: task.points,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        createdAt: new Date().toISOString(),
      });

      await newTaskRequest.save();

      var newUser = {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        major: user.major,
        year: user.year,
        graduating: user.graduating,
        country: user.country,
        ethnicity: user.ethnicity,
        sex: user.sex,
        ethnicity: user.ethnicity,
        points: user.points,
        fallPoints: user.fallPoints,
        springPoints: user.springPoints,
        summerPoints: user.summerPoints,
        createdAt: user.createdAt,
        permission: user.permission,
        listServ: user.listServ,
        classes: user.classes,
        internships: user.internships,
        socialMedia: user.socialMedia,
        events: user.events,
        tasks: user.tasks,
        bookmarkedtasks: user.bookmarkedTasks,
        message: "Task has been sent for approval.",
      };
      return newUser;
    },

    async confirmUser(_, { id }) {
      const user = await User.findOneAndUpdate(
        {
          _id: id,
        },
        {
          confirmed: true,
        }
      );

      if (!user) {
        errors.general = "User not found.";
        throw new UserInputError("User not found.", {
          errors,
        });
      }

      return user;
    },

    async forgotPassword(_, { email }) {
      const { errors, valid } = validateEmailInput(email);
      if (!valid) {
        throw new UserInputError("Errors", {
          errors,
        });
      }

      const user = await User.findOne({
        email,
      });
      if (!user) {
        errors.general = "User not found.";
        throw new UserInputError("User not found.", {
          errors,
        });
      }

      var time = "24h";
      var token = generateToken(user, time);
      var uniqueToken = false;

      while (!uniqueToken) {
        const user = await User.findOne({
          token,
        });
        if (user) {
          token = generateToken(user, time);
        } else {
          uniqueToken = true;
        }
      }

      const newUser = await User.findOneAndUpdate(
        {
          email,
        },
        {
          token,
        }
      );

      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      transport
        .sendMail({
          from: process.env.EMAIL,
          to: email,
          subject: "Reset Password",
          html:
            "You have requested the reset of the password for your account for shpe.com\n\n" +
            "Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\n" +
            `${process.env.CLIENT_ORIGIN}/reset/${token}\n\n` +
            "If you did not request this, please ignore this email and your password will remain unchanged.\n",
        })
        .then(() => {
          res.status(200).json("Reset password email sent");
        })
        .catch(() => {
          console.error("there was an error: ", err);
        });

      return {
        ...newUser._doc,
        id: newUser._id,
        token,
      };
    },

    async resetPassword(_, { password, confirmPassword, token }) {
      const { errors, valid } = validatePasswordInput(
        password,
        confirmPassword
      );

      if (!valid) {
        throw new UserInputError("Errors", {
          errors,
        });
      }

      const user = await User.findOne({
        token,
      });
      if (!user) {
        errors.general = "Invalid Token";
        throw new UserInputError("Invalid Token", {
          errors,
        });
      }

      password = await bcrypt.hash(password, 12);

      const newUser = await User.findOneAndUpdate(
        {
          email: user.email,
        },
        {
          password,
          token: "",
        }
      );

      var Token = {
        token: token,
      };
      return Token;
    },

    async bookmark(_, { company, username }) {
      var updatedUser = await User.findOneAndUpdate(
        {
          username,
        },
        {
          $push: {
            bookmarks: company,
          },
        },
        {
          new: true,
        }
      );

      return updatedUser;
    },

    async deleteBookmark(_, { company, username }) {
      var updatedUser = await User.findOneAndUpdate(
        {
          username,
        },
        {
          $pull: {
            bookmarks: company,
          },
        },
        {
          new: true,
        }
      );

      return updatedUser;
    },

    async editUserProfile(
      _,
      {
        editUserProfileInput: {
          email,
          firstName,
          lastName,
          photo,
          major,
          year,
          graduating,
          country,
          ethnicity,
          sex,
          classes,
          internships,
          socialMedia,
        },
      }
    ) {
      const { errors, valid } = validateEditUserProfile(
        firstName,
        lastName,
        photo,
        major,
        year,
        graduating,
        country,
        ethnicity,
        sex,
        classes,
        internships,
        socialMedia
      );

      if (!valid) {
        throw new UserInputError("Errors", {
          errors,
        });
      }

      const user = await User.findOne({ email });

      if (user) {
        const updatedUser = await User.findOneAndUpdate(
          { email },
          {
            firstName,
            lastName,
            photo,
            major,
            year,
            graduating,
            country,
            ethnicity,
            sex,
            classes,
            internships,
            socialMedia,
          },
          {
            new: true,
          }
        );

        return updatedUser;
      } else {
        throw new Error("User not found.");
      }
    },

    async changePermission(_, { email, currentEmail, permission }) {
      let { errors, valid } = validateEmailInput(email);

      if (!valid) {
        throw new UserInputError("Errors.", {
          errors,
        });
      }

      if (email === currentEmail) {
        valid = false;
        errors.general = "Can't change your own permissions";
        throw new UserInputError("Can't change your own permissions", {
          errors,
        });
      }

      //loggedInUser is the current user that's trying to change another user's permissions
      const loggedInUser = await User.findOne({
        email: currentEmail,
      });

      if (!loggedInUser) {
        errors.general = "User not found";
        throw new UserInputError("User not found", {
          errors,
        });
      }

      if (!loggedInUser.permission.includes("admin")) {
        valid = false;
        errors.general = "Must be an admin to change permission";
        throw new UserInputError("Must be an admin to change permission", {
          errors,
        });
      }

      const options = { new: true };

      const user = await User.findOneAndUpdate(
        {
          email,
        },
        {
          permission,
        },
        options
      );
      if (!user) {
        errors.general = "User not found";
        throw new UserInputError("User not found", {
          errors,
        });
      } else {
        return user;
      }
    },
  },
};
