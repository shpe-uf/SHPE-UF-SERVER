const { geocodeAlumni } = require("../../util/geocode-alumni");

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

      try {
        coordinates = await geocodeAlumni(location);
        // Keep nearby alumni markers from completely overlapping.
        coordinates.latitude = Math.max(-90, Math.min(90,
          coordinates.latitude + (Math.random() - Math.random()) * 0.007));
        coordinates.longitude = ((coordinates.longitude +
          (Math.random() - Math.random()) * 0.007 + 540) % 360) - 180;
      } catch (err) {
        if (err.code === "LOCATION_NOT_FOUND") {
          errors.general =
            "Location not found. Please check city, state and country.";
          handleInputError(errors);
        }
        console.error("Alumni geocoding failed", {
          code: err.code || "UNKNOWN_ERROR",
          status: err.status,
        });
        handleGeneralError(
          { general: "Location lookup is temporarily unavailable." },
          "Location lookup is temporarily unavailable. Please try again later."
        );
      }

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
