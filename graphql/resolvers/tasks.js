const { UserInputError } = require("apollo-server");
const Task = require("../../models/Task");
const User = require("../../models/User.js");
const Request = require("../../models/Request.js");

const {
  validateCreateTaskInput,
  validateManualTaskInputInput
} = require("../../util/validators");

const monthOptions = require("../../json/month.json");

module.exports = {
  Query: {
    async getTasks() {
      try {
        const tasks = await Task.find().sort({ createdAt: 1 });
        return tasks;
      } catch (err) {
        throw new Error(err);
      }
    }
  },

  Mutation: {
    async createTask(
      _,
      {
        createTaskInput: { name, startDate, endDate, description, points }
      }
    ) {

      const { errors, valid } = validateCreateTaskInput(
        name,
        startDate,
        endDate,
        description,
        points
      );

      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }

      // REVISIT THIS LATER TO DETERMINE SEMESTER EITHER WHEN TASK BEGINS OR ENDS.
      const month = new Date().getMonth();

      semester = monthOptions[month].value;

      isTaskDuplicate = await Task.findOne({ name });

      if (isTaskDuplicate) {
        throw new UserInputError("A task with that name already exists.", {
          errors: {
            name: "A task with that name already exists."
          }
        });
      }

      startDate = new Date(startDate).toDateString()
      endDate = new Date(endDate).toDateString()

      const newTask = new Task({
        name,
        startDate,
        endDate,
        type: "Task",
        description,
        points,
        attendance: 0,
        semester,
        users: [],
        createdAt: new Date().toISOString()
      });

      await newTask.save();

      const res = Task.findOne({ name })

      return res;
    },
    async manualTaskInput(
      _,
      {
        manualTaskInputInput: { username, taskName }
      }
    ) {

      const { valid, errors } = validateManualTaskInputInput(username);

      if (!valid) {
        throw new UserInputError("User input errors.", {
          errors
        });
      }

      const user = await User.findOne({
        username
      });

      const task = await Task.findOne({
        name: taskName
      });

      const request = await Request.findOne({
        username: username,
        taskName: taskName
      });

      if (!user) {
        errors.general = "User not found.";
        throw new UserInputError("User not found.", {
          errors
        });
      }

      if (!task) {
        errors.general = "Task not found.";
        throw new UserInputError("Task not found.", {
          errors
        });
      }

      if (request) {
        errors.general =
          "This member has sent a request for this task. Check the Requests tab.";
        throw new UserInputError(
          "This member has sent a request for this task. Check the Requests tab.",
          {
            errors
          }
        );
      }

      user.tasks.map(userTask => {
        if (String(userTask.name) == String(task.name)) {
          errors.general = "Task already redeemed by the user.";
          throw new UserInputError("Task already redeemed by the user.", {
            errors
          });
        }
      });

      var pointsIncrease = {};

      if (task.semester === "Fall Semester") {
        pointsIncrease = {
          points: task.points,
          fallPoints: task.points
        };
      } else if (task.semester === "Spring Semester") {
        pointsIncrease = {
          points: task.points,
          springPoints: task.points
        };
      } else if (task.semester === "Summer Semester") {
        pointsIncrease = {
          points: task.points,
          summerPoints: task.points
        };
      } else {
        errors.general = "Invalid task.";
        throw new UserInputError("Invalid task.", {
          errors
        });
      }
      
      var updatedUser = await User.findOneAndUpdate(
        {
          username
        },
        {
          $push: {
            tasks: {
              $each: [
                {
                  name: task.name,
                  createdAt: task.createdAt,
                  points: task.points
                }
              ],
              $sort: { createdAt: 1 }
            }
          },
          $inc: pointsIncrease
        },
        {
          new: true
        }
      );
      updatedUser.message = "";

      await Task.findOneAndUpdate(
        {
          name: taskName
        },
        {
          $push: {
            users: {
              $each: [
                {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  username: user.username,
                  email: user.email
                }
              ],
              $sort: { lastName: 1, firstName: 1 }
            }
          },
          $inc: {
            attendance: 1
          }
        },
        {
          new: true
        }
      );
      
      const newTask = await Task.findOne({
        name: taskName
      });

      return newTask;
    },
    async removeUserFromTask(
      _,
      {
        manualTaskInputInput: { username, taskName }
      }
    ) {

      const { valid, errors } = validateManualTaskInputInput(username);

      if (!valid) {
        throw new UserInputError("User input errors.", {
          errors
        });
      }

      const user = await User.findOne({
        username
      });

      const task = await Task.findOne({
        name: taskName
      });

      if (!user) {
        errors.general = "User not found.";
        throw new UserInputError("User not found.", {
          errors
        });
      }

      if (!task) {
        errors.general = "Task not found.";
        throw new UserInputError("Task not found.", {
          errors
        });
      }

      if(!user.tasks.map(e => e.name).includes(task.name)) {
        errors.general = "User is not member of task.";
        throw new UserInputError("User is not member of Task.", {
          errors
        });
      }

      newTasks = user.tasks.filter(e => e.name !== task.name)
      newUsers = task.users.filter(e => e.username !== user.username)

      if (task.semester === "Fall Semester") {
        await User.findOneAndUpdate({username},{
          tasks: newTasks,
          points: user.points - task.points,
          fallPoints: user.fallPoints + task.points
        });
      } else if (task.semester === "Spring Semester") {
        await User.findOneAndUpdate({username},{
          tasks: newTasks,
          points: user.points - task.points,
          springPoints: user.springPoints + task.points
        });
      } else if (task.semester === "Summer Semester") {
        await User.findOneAndUpdate({username},{
          tasks: newTasks,
          points: user.points - task.points,
          summerPoints: user.summerPoints + task.points
        });
      } else {
        errors.general = "Invalid task.";
        throw new UserInputError("Invalid task.", {
          errors
        });
      }
      
      newTask = await Task.findOneAndUpdate({name: taskName},{users: newUsers, attendance: task.attendance - 1},{new: true});

      return newTask;
    },
    async deleteTask(_,{taskId}) {

      const users = await User.find()

      const task = await Task.findOne({
        _id: taskId
      });

      if (!users || !users.length || users.length === 0) {
        errors.general = "User not found.";
        throw new UserInputError("User not found.", {
          errors
        });
      }

      if (!task) {
        errors.general = "Task not found.";
        throw new UserInputError("Task not found.", {
          errors
        });
      }

      var pointsDecrease = {};

      if (task.semester === "Fall Semester") {
        pointsDecrease = {
          points: -task.points,
          fallPoints: -task.points
        };
      } else if (task.semester === "Spring Semester") {
        pointsDecrease = {
          points: -task.points,
          springPoints: -task.points
        };
      } else if (task.semester === "Summer Semester") {
        pointsDecrease = {
          points: -task.points,
          summerPoints: -task.points
        };
      } else {
        errors.general = "Invalid task.";
        throw new UserInputError("Invalid task.", {
          errors
        });
      }

      await Task.deleteOne({_id: taskId})

      await User.updateMany({
        tasks: {
          $elemMatch: {
            name: task.name
          }
        }
      }, {
        $pull: {
          tasks: {
            name: task.name
          }
        },
        $inc: pointsDecrease
      })
      
      tasks = await Task.find();

      return tasks;
    }
  }
};
