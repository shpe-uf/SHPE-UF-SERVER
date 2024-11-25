const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const nodemailerSendgrid = require("nodemailer-sendgrid");
const User = require("../../models/User.js");
const Event = require("../../models/Event.js");
const Request = require("../../models/Request.js");
const Task = require("../../models/Task.js");
const eventFunctions = require("./events.js");

const {
  handleInputError,
  handleGeneralError,
} = require("../../util/error-handling");

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
  validateEditUpdatedAt,
} = require("../../util/validators");

async function calculatePercentiles(user) {
  const users = await User.find({}, { _id: 1 });

  var percentileUpdate = {};

  const month = new Date().getMonth();

  var semester = "";

  if (month <= 3) {
    semester = "Spring Semester";
  } else if (month <= 6) {
    semester = "Summer Semester";
  } else if (month <= 11) {
    semester = "Fall Semester";
  }

  if (semester === "Fall Semester") {
    const fallBelowUsers = await User.find({}, { fallPoints: 1, _id: 0 })
      .where("fallPoints")
      .lt(user.fallPoints);

    const fallPercent = Math.trunc(
      (fallBelowUsers.length / users.length) * 100
    );

    percentileUpdate = {
      fallPercentile: fallPercent,
    };
  } else if (semester === "Spring Semester") {
    const springBelowUsers = await User.find({}, { springPoints: 1, _id: 0 })
      .where("springPoints")
      .lt(user.springPoints);

    const springPercent = Math.trunc(
      (springBelowUsers.length / users.length) * 100
    );

    percentileUpdate = {
      springPercentile: springPercent,
    };
  } else if (semester === "Summer Semester") {
    const summerBelowUsers = await User.find({}, { summerPoints: 1, _id: 0 })
      .where("summerPoints")
      .lt(user.summerPoints);

    const summerPercent = Math.trunc(
      (summerBelowUsers.length / users.length) * 100
    );

    percentileUpdate = {
      summerPercentile: summerPercent,
    };
  }

  var username = user.username;

  await User.findOneAndUpdate(
    {
      username,
    },
    {
      $set: percentileUpdate,
    },
    {
      new: true,
    }
  );
}

function generateToken(user, time) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      permission: user.permission,
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
        handleGeneralError(err, "Users not found!");
      }
    },

    async getUser(_, { userId },) {
      try {
        var user = await User.findById(userId);
        if (user) {
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
            fallPercentile: user.fallPercentile,
            springPercentile: user.springPercentile,
            summerPercentile: user.summerPercentile,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
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
          handleGeneralError({}, "User not found.");
        }
      } catch (err) {
        handleGeneralError(err, "Uknown user");
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
          handleGeneralError({}, "Data not found.");
        }
      } catch (err) {
        handleGeneralError(err, err.message);
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
          handleGeneralError({}, "Data not found.");
        }
      } catch (err) {
        handleGeneralError(err, err.message);
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
          handleGeneralError({}, "Data not found.");
        }
      } catch (err) {
        handleGeneralError((err, err.message));
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
          handleGeneralError({}, "Data not found.");
        }
      } catch (err) {
        handleGeneralError(err, err.message);
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
          handleGeneralError({}, "Data not found.");
        }
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
  },

  Mutation: {
    async login(_, { username, password, remember }) {
      username = username.toLowerCase();

      const { errors, valid } = validateLoginInput(username, password);

      if (!valid) {
        handleInputError(errors);
      }

      const user = await User.findOne({
        username,
      });

      if (!user) {
        errors.general = "User not found.";
        handleInputError(errors);
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        errors.general = "Wrong credentials.";
        handleInputError(errors);
      }

      const isConfirmed = user.confirmed;

      if (!isConfirmed) {
        errors.general = "User not confirmed.";
        handleInputError(errors);
      }

      time = remember === "true" || remember === true ? "30d" : "24h";
      const token = generateToken(user, time);

      calculatePercentiles(user);

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
        handleInputError(errors);
      }

      const isUsernameDuplicate = await User.findOne({
        username,
      });

      if (isUsernameDuplicate) {
        errors.general = "An account with that username already exists.";
        handleInputError(errors);
      }

      const isEmailDuplicate = await User.findOne({
        email,
      });

      if (isEmailDuplicate) {
        errors.general = "An account with that e-mail already exists.";
        handleInputError(errors);
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
        updatedAt: new Date().toISOString(),
        points: 0,
        fallPoints: 0,
        springPoints: 0,
        summerPoints: 0,
        fallPercentile: 0,
        springPercentile: 0,
        summerPercentile: 0,
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
          subject: "Confirm Your Email Address",
            html: `
              <h1 style="text-align: center;">Hi, ${newUser.firstName}!</h1>
              <p>Thank you for registering at <a href="http://shpeuf.com" style="color: blue; text-decoration: underline;">shpeuf.com</a>.</p>
              <p>To complete your registration and verify your email address, please click the button below:</p>
              <a href="${process.env.CLIENT_ORIGIN}/confirm/${user._id}" style="text-decoration: none;">
                  <p style="text-align: center; background-color: orange; color: white; padding: 10px; margin: 10px 0;">
                      Confirm Email
                  </p>
              </a>
              <p>If you did not sign up for an account, you can safely ignore this email.</p>
              <p>Thank you,</p>
              <p style="text-align: center; font-weight: bold;">The SHPE UF Team</p>
            `,
        })
        .then(() => {
          res.status(200).json("confirmation email sent");
        })
        .catch((err) => {
          console.error("there was an error: ", err);
        });

      return {
        ...res._doc,
        id: res._id,
      };
    },

    async redeemPoints(_, { redeemPointsInput: { code, username, guests } }) {
      code = code.toLowerCase().trim().replace(/ /g, "");

      const { valid, errors } = validateRedeemPointsInput(code);

      if (!valid) {
        handleInputError(errors);
      }

      const event = await Event.findOne({
        code,
      });

      const user = await User.findOne({
        username,
      });

      if (!event) {
        errors.general = "Event not found.";
        handleInputError(errors);
      }

      if (!user) {
        errors.general = "User not found.";
        handleInputError(errors);
      }

      if (guests < 0 || guests > 5) {
        errors.general = "Guests count exceeds limits.";
        handleInputError(errors);
      }

      if (Date.parse(event.expiration) < Date.now()) {
        errors.general = "Event code expired";
        handleInputError(errors);
      }

      user.events.map((userEvent) => {
        if (String(userEvent.name) == String(event.name)) {
          errors.general = "Event code already redeemed.";
          handleInputError(errors);
        }
      });

      if (event.request) {
        const request = await Request.findOne({
          name: event.name,
          username: user.username,
        });

        if (request) {
          errors.general = "Event code already sent for approval.";
          handleInputError(errors);
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
          fallPercentile: user.fallPercentile,
          springPercentile: user.springPercentile,
          summerPercentile: user.summerPercentile,
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
              attendance: 1 + guests,
            },
          },
          {
            new: true,
          }
        );

        calculatePercentiles(updatedUser);

        return updatedUser;
      }
    },

    async resetPercentile(semester) {
      const users = await User.find({}, { _id: 1 });

      var percentileUpdate = {};

      if (semester == "fallPercentile") {
        percentileUpdate = {
          fallPercentile: 0,
        };
      } else if (semester == "springPercentile") {
        percentileUpdate = {
          springPercentile: 0,
        };
      } else if (semester == "summerPercentile") {
        percentileUpdate = {
          summerPercentile: 0,
        };
      }

      for (let i = 0; i < users.length; i++) {
        var username = users[i].username;

        await User.findOneAndUpdate(
          {
            username,
          },
          {
            $set: percentileUpdate,
          },
          {
            new: true,
          }
        );
      }

      return 0;
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
        handleInputError(errors);
      }

      user.tasks.map((userTask) => {
        if (String(userTask.name) == String(task.name)) {
          errors.general = "Task already redeeemed by the user.";
          handleInputError(errors);
        }
      });

      const request = await Request.findOne({
        name: task.name,
        username: user.username,
      });

      if (request) {
        errors.general = "Task already sent for approval.";
        handleInputError(errors);
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
        fallPercentile: user.fallPercentile,
        springPercentile: user.springPercentile,
        summerPercentile: user.summerPercentile,
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
        handleInputError(errors);
      }

      return user;
    },

    async forgotPassword(_, { email }) {
      const { errors, valid } = validateEmailInput(email);
      if (!valid) {
        handleInputError(errors);
      }

      const user = await User.findOne({
        email,
      });
      if (!user) {
        errors.general = "User not found.";
        handleInputError(errors);
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

      transport
        .sendMail({
          from: process.env.EMAIL,
          to: email,
          subject: "Reset Password",
          html: `
          <h1 style="text-align: center;">Hi, ${newUser.firstName}!</h1>
          <p>You have requested the reset of the password for your account at <a href="http://shpeuf.com" style="color: blue; text-decoration: underline;">shpeuf.com</a></p>
          <p>Click below to reset your password:</p>
          <a href="${process.env.CLIENT_ORIGIN}/reset/${token}" style="text-decoration: none;">
              <p style="text-align: center; background-color: orange; color: white; padding: 10px; margin: 10px 0;">
                  Reset Password
              </p>
          </a>
          <p style="text-align:center;"><strong> NOTE! This link is active for one hour.</strong></p>
          <p>If you have not issued a password reset request, you can safely ignore this email, and your account will not be affected.</p>
          `,
        })
        .then(() => {
          res.status(200).json("Reset password email sent");
        })
        .catch((err) => {
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
        handleInputError(errors);
      }

      const user = await User.findOne({
        token,
      });
      if (!user) {
        errors.general = "Invalid Token";
        handleInputError(errors);
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
        handleInputError(errors);
      }

      const user = await User.findOne({ email });

      if (user) {
        updatedAt = user.updatedAt;
        if (user.year !== year) {
          updatedAt = new Date().toISOString();
        }
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
            updatedAt,
          },
          {
            new: true
          }
        );

        return updatedUser;
      } else {
        handleGeneralError({}, "User not found.");
      }
    },

    async editUpdatedAt(_, { editUpdatedAtInput: { email, updatedAt } }) {
      const { errors, valid } = validateEditUpdatedAt(email, updatedAt);

      if (!valid) {
        handleInputError(errors);
      }
      const user = await User.findOne({ email });
      if (user) {
        const updatedUser = await User.findOneAndUpdate(
          { email },
          {
            updatedAt,
          },
          {
            new: true
          }
        );

        return updatedUser;
      } else {
        handleGeneralError({}, "User not found.");
      }
    },

    async changePermission(_, { email, currentEmail, permission }) {
      let { errors, valid } = validateEmailInput(email);

      if (!valid) {
        handleInputError(errors);
      }

      if (email === currentEmail) {
        valid = false;
        errors.general = "Can't change your own permissions";
        handleInputError(errors);
      }

      //loggedInUser is the current user that's trying to change another user's permissions
      const loggedInUser = await User.findOne({
        email: currentEmail,
      });

      if (!loggedInUser) {
        errors.general = "User not found";
        handleInputError(errors);
      }

      if (!loggedInUser.permission.includes("admin")) {
        valid = false;
        errors.general = "Must be an admin to change permission";
        handleInputError(errors);
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
        handleInputError(errors);
      } else {
        return user;
      }
    },

    async updateYears() {
      var users = await User.find();
      users.forEach(async function (user) {
        const currDate = new Date();
        const email = user.email;
        const msPerDay = 1000 * 60 * 60 * 24;
        var updatedAt = currDate;
        var year = user.year;

        if (user.updatedAt) updatedAt = new Date(user.updatedAt);
        const difference = Math.round((currDate - updatedAt) / msPerDay);

        if (difference >= 365) {
          updatedAt = currDate;
          if (year === "1st Year") year = "2nd Year";
          else if (year === "2nd Year") year = "3rd Year";
          else if (year === "3rd Year") year = "4th Year";
          else if (year === "4th Year") year = "5th Year or Higher";
        }

        const updatedUser = await User.findOneAndUpdate(
          { email },
          {
            year: year,
            updatedAt: updatedAt.toISOString(),
          },
          {
            new: true
          }
        );
      });
      return users;
    },


    /**
     * This function removes a user from all events they have attended and deletes them
     * from our Mongodb database. Needed for our iOS user privacy concerns.
     * 
     * @param {String} email - the user's email we would like to delete.
     * @returns {Boolean} - optional return value, returns true if the user is deleted.
     * 
     * @example deleteUser(testUser@ufl.edu)
     */
    async deleteUser(_, { email }) {

      var user = await User.findOne({ email })

      if (!user) {
        errors = { email: "User not found" }
        handleInputError(errors);
      }

      user.events.forEach(async function (userEvent) {
        var event = await Event.findOne({ name: userEvent.name })
        var newUsers = event.users.filter((e) => e.username !== user.username);

        await Event.findOneAndUpdate(
          { name: event.name },
          { users: newUsers, attendance: event.attendance },
          { new: true }
        );
      });

      var user = await User.findOneAndDelete({ email });
      return true
    }
  },
};
