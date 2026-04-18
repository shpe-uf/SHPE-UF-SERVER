const Event = require("../../models/Event.js");
const User = require("../../models/User.js");
const { handleGeneralError } = require("../../util/error-handling.js");

module.exports = {
  Query: {
    async IsShpewrappedtime() {
      const lastmonthofyear = new Date();
      console.log(lastmonthofyear.getMonth());
      if (lastmonthofyear.getMonth() == 12 || lastmonthofyear.getMonth() == 4) {
        return true;
      }
      return false;
    },
    async getMostActiveMonth(_, { userId }) {
      var user = await User.findById(userId);
      if (user) {
        var events = user.events;
        var monthFrenquency = new Map();
        var counter = 0;
        var MostActiveMonth = 0;
        events.map((event) => {
          var month = event.createdAt.substring(5, 7);
          monthFrenquency.set(month, (monthFrenquency.get(month) || 0) + 1);
          /*if two months have the same amount of events, this will return the first month*/
          if (counter < monthFrenquency.get(month)) {
            MostActiveMonth = month;
            counter = monthFrenquency.get(month);
          }
        });
        return MostActiveMonth;
      } else {
        handleGeneralError({}, "User not found.");
      }
    },
    async getTopCategory(_, { userId }) {
      var user = await User.findById(userId);
      if (user) {
        var events = user.events;
        var categoryFrequency = new Map();
        var counter = 0;
        var TopCategory = " ";
        events.map((event) => {
          var category = event.category;
          categoryFrequency.set(
            category,
            (categoryFrequency.get(category) || 0) + 1
          );
          /*if two categories have the same frequency, this will return the first category*/
          if (counter < categoryFrequency.get(category)) {
            TopCategory = category;
            counter = categoryFrequency.get(category);
          }
        });
        return TopCategory;
      } else {
        handleGeneralError({}, "User not found.");
      }
    },
    async getYearsBeingShpeMember(_, { userId }) {
      var user = await User.findById(userId);
      if (user) {
        var createdAt = user.createdAt;
        console.log(createdAt.substring(0, 4));
        var currentDate = new Date();
        var totalTime = currentDate.getFullYear() - createdAt.substring(0, 4);
        return totalTime;
      } else {
        handleGeneralError({}, "User not found.");
      }
    },
  },
};
