const { GraphQLError } = require("graphql");
const { ApolloServerErrorCode } = require("@apollo/server/errors");
const Rentable = require("../../models/Rentable.js");
const Receipt = require("../../models/Receipt.js");
const User = require("../../models/User.js");
const nodemailer = require("nodemailer");

require("dotenv").config();

const { validateRentalRequest } = require("../../util/validators");

const {
  handleInputError,
  handleGeneralError,
} = require("../../util/error-handling");

module.exports = {
  Query: {
    async getInventory() {
      try {
        const inventory = await Rentable.find();
        return inventory;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },

    async getItem(_, { item }) {
      try {
        const rentable = await Rentable.findOne({ item: item });
        return rentable;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },

    async getReceipts(_, { item }) {
      try {
        const receipts = await Receipt.find();
        return receipts;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
  },

  Mutation: {
    //=====================================================================
    //========================= Checking out an item ======================
    //=====================================================================

    async checkOutItem(_, data) {
      try {
        //fixes bug where Object Null is received
        const { item, username, numberOfItems, email } = JSON.parse(
          JSON.stringify(data)
        ).data;

        const rentable = await Rentable.findOne({ item: item });
        const user = await User.findOne({ username: username });

        if (!user) {
          errors.general = "That's not a valid user.";
          handleInputError(errors);
        }

        if (!rentable) {
          erorrs.general = "That's not a valid rental item.";
          handleInputError(errors);
        }

        let { errors, valid } = validateRentalRequest(
          numberOfItems,
          rentable.quantity,
          rentable.renters
        );

        if (!valid) {
          handleInputError(errors);
        }

        for (var i = 1; i <= numberOfItems; i++) {
          if (rentable.renters) {
            rentable.renters.push(username);
          } else {
            rentable.renters = [username];
          }
        }

        await rentable.save();

        const newDate = JSON.stringify(new Date());
        const receipt = new Receipt({
          username: username,
          item: item,
          quantity: numberOfItems,
          email: email,
          dateCheckedOut: newDate,
        });
        await receipt.save();

        const transporter = nodemailer.createTransport({
          service: process.env.EMAIL_SERVICE,
          auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
          },
        });

        const requesterMail = {
          from: process.env.EMAIL,
          to: `${email}`,
          subject: "Rental Request",
          text:
            "You made a request to rent from SHPE UF.\n\n" +
            `Username: ${username}\n` +
            `Email: ${email}\n` +
            `Item: ${item}\n` +
            `Quantity: ${numberOfItems}\n` +
            `Date: ${newDate}\n` +
            `\n` +
            `In order to pick up your item, please visit a SHPE Rentals director in the SHPE Office in Weil Hall in room 276A\n\n` +
            `SHPE Rentals directors are in the office on Mondays 10:00 am - 12:00 pm or Thursdays 1:00 pm - 3:00 pm.\n\n` +
            `If this is an urgent request you can contact a SHPE Rentals director directly at juansuhr@ufl.edu or rolando.angulo@ufl.edu`,
        };

        transporter.sendMail(requesterMail, (err, response) => {
          if (err) {
            console.error("there was an error: ", err);
          } else {
            res.status(200).json("recovery email sent");
          }
        });

        const rentalAdminMail = {
          from: process.env.EMAIL,
          to: `juansuhr@ufl.edu`,
          subject: "Rental Request - " + `${username} ${item}`,
          text:
            "There is a new request for rental.\n\n" +
            `Username: ${username}\n` +
            `Email: ${email}\n` +
            `Item: ${item}\n` +
            `Quantity: ${numberOfItems}\n` +
            `Date: ${newDate}\n`,
        };

        transporter.sendMail(rentalAdminMail, (err, response) => {
          if (err) {
            console.error("there was an error: ", err);
          } else {
            res.status(200).json("recovery email sent");
          }
        });

        return await Rentable.find();
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },

    //=====================================================================
    //========================= Picking up an item =========================
    //=====================================================================

    async pickUpItem(_, { receiptID }) {
      try {
        const receipt = await Receipt.findOne({ _id: receiptID });

        if (!receipt) {
          errors.general = "That's not a valid receipt.";
          handleInputError(errors);
        }

        const newReceipt = await Receipt.findOneAndUpdate(
          { _id: receiptID },
          {
            datePickedUp: JSON.stringify(new Date()),
          },
          { new: true }
        );

        return newReceipt;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },

    //=====================================================================
    //========================= Returning an item =========================
    //=====================================================================

    async returnItem(_, { receiptID }) {
      try {
        const receipt = await Receipt.findById(receiptID);

        if (!receipt) {
          errors.general = "That's not a valid receipt.";
          handleInputError(errors);
        }

        const item = receipt.item;
        const username = receipt.username;

        const rentable = await Rentable.findOne({ item: item });
        const user = await User.findOne({ username: username });

        if (!rentable) {
          errors.general = "Receipt contained an invalid rental item.";
          handleInputError(errors);
        }

        if (!user) {
          errors.general = "Receipt contained an invalid user.";
          handleInputError(errors);
        }

        let newRenters = rentable.renters;
        for (let i = 0; i < receipt.quantity; i++) {
          newRenters.splice(
            rentable.renters.findIndex((e) => e === receipt.username),
            1
          );
        }

        await Rentable.findOneAndUpdate(
          { item: item },
          {
            renters: newRenters,
          }
        );

        const newReceipt = await Receipt.findOneAndUpdate(
          { _id: receiptID },
          {
            dateClosed: JSON.stringify(new Date()),
          },
          { new: true }
        );

        return newReceipt;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
    //=====================================================================
    //========================= unPicking up an item =======================
    //=====================================================================

    async unPickUpItem(_, { receiptID }) {
      try {
        const receipt = await Receipt.findOne({ _id: receiptID });

        if (!receipt) {
          errors.general = "That's not a valid receipt.";
          handleInputError(errors);
        }

        if (!receipt.datePickedUp) {
          errors.general = "That's not a valid receipt.";
          handleInputError(errors);
        }

        const newReceipt = await Receipt.findOneAndUpdate(
          { _id: receiptID },
          {
            datePickedUp: null,
          },
          { new: true }
        );

        return newReceipt;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },

    //=====================================================================
    //========================= unReturning an item =======================
    //=====================================================================

    async unReturnItem(_, { receiptID }) {
      try {
        const receipt = await Receipt.findById(receiptID);

        if (!receipt) {
          errors.general = "That's not a valid receipt.";
          handleInputError(errors);
        }

        if (!receipt.dateClosed) {
          errors.general = "That's not a closed receipt.";
          handleInputError(errors);
        }

        const item = receipt.item;
        const username = receipt.username;

        const rentable = await Rentable.findOne({ item: item });
        const user = await User.findOne({ username: username });

        if (!rentable) {
          errors.general = "Receipt contained an invalid rental item.";
          handleInputError(errors);
        }

        if (!user) {
          errors.general = "Receipt contained an invalid user.";
          handleInputError(errors);
        }

        const users = [];
        for (let i = 0; i < receipt.quantity; i++) {
          users.push(receipt.username);
        }

        await Rentable.findOneAndUpdate(
          { item: item },
          {
            $push: {
              renters: users,
            },
          }
        );

        const newReceipt = await Receipt.findOneAndUpdate(
          { _id: receiptID },
          {
            dateClosed: null,
          },
          { new: true }
        );

        return newReceipt;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
    //=====================================================================
    //========================= deleting a receipt =======================
    //=====================================================================

    async deleteReceipt(_, { receiptID }) {
      try {
        const receipt = await Receipt.findById(receiptID);

        if (!receipt) {
          errors.general = "That's not a valid receipt.";
          handleInputError(errors);
        }

        if (!receipt.dateClosed) {
          const item = receipt.item;
          const username = receipt.username;

          const rentable = await Rentable.findOne({ item: item });
          const user = await User.findOne({ username: username });

          if (!rentable) {
            errors.general = "Receipt contained an invalid rental item.";
            handleInputError(errors);
          }

          if (!user) {
            errors.general = "Receipt contained an invalid user.";
            handleInputError(errors);
          }

          let newRenters = rentable.renters;
          for (let i = 0; i < receipt.quantity; i++) {
            newRenters.splice(
              rentable.renters.findIndex((e) => e === receipt.username),
              1
            );
          }

          await Rentable.findOneAndUpdate(
            { item: item },
            {
              renters: newRenters,
            }
          );
        }

        const newReceipt = await Receipt.findOneAndUpdate(
          { _id: receiptID },
          {
            deleted: true,
          },
          { new: true }
        );

        return newReceipt;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
  },
};
