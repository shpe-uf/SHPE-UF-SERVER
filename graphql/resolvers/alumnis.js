const nodegeocoder = require("node-geocoder");

const Alumni = require("../../models/Alumni.js");

require("dotenv").config();

const { validateRegisterAlumniInput } = require("../../util/validators");

const {
  handleInputError,
  handleGeneralError,
} = require("../../util/error-handling");

module.exports = {
  Query: {
    async getAlumnis() {
      try {
        const alumni = await Alumni.find().sort({ lastName: 1, firstName: 1 });
        return alumni;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
  },

  Mutation: {
    async registerAlumni(
      _,
      {
        registerAlumniInput: {
          firstName,
          lastName,
          email,
          undergrad,
          grad,
          employer,
          position,
          location,
          linkedin,
        },
      }
    ) {
      const { valid, errors } = validateRegisterAlumniInput(
        firstName,
        lastName,
        email,
        undergrad,
        grad,
        employer,
        position,
        location,
        linkedin
      );

      var coordinates = {
        latitude: 0,
        longitude: 0,
      };

      if (!valid) {
        handleInputError(errors);
      }

      grad.year = grad.year === "" ? 0 : grad.year;

      const isEmailDuplicate = await Alumni.findOne({ email });

      if (isEmailDuplicate) {
        errors.general = "that email already exists.";
        handleInputError(errors);
      }

      const alumniLocation =
        location.city +
        ", " +
        (location.state ? location.state + ", " : "") +
        location.country;

      var ngcOptions = {
        provider: "mapquest",
        httpAdapter: "https",
        apiKey: process.env.MQ_KEY,
        formatter: null,
      };

      var geocoder = nodegeocoder(ngcOptions);

      await geocoder
        .geocode(alumniLocation)
        .then(function (res) {
          var north = Math.random() * 0.007;
          var south = -1 * Math.random() * 0.007;
          var east = Math.random() * 0.007;
          var west = -1 * Math.random() * 0.007;
          coordinates.latitude = res[0].latitude + north + south;
          coordinates.longitude = res[0].longitude + east + west;
        })
        .catch(function (err) {
          errors.general =
            "Invalid location, please check city, state and/or country.";
          handleInputError(errors);
        });

      const newAlumni = new Alumni({
        firstName,
        lastName,
        email,
        undergrad,
        grad,
        employer,
        position,
        location,
        coordinates,
        linkedin,
      });

      await newAlumni.save();

      return newAlumni;
    },
  },
};
