const Event = require("../../models/Event.js");
const User = require("../../models/User.js");

module.exports = {
  Query: {
    async lastMontOfYear() {
      const lastmonthofyear = new Date();
      console.log(lastmonthofyear.getMonth());
      if (lastmonthofyear.getMonth() == 12) {
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
  },
};
