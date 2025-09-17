const GbmSlide = require("../../models/GbmSlide.js");

require("dotenv").config();

const {
  validateCreateEditGbmSlideInput: validateCreateEditGbmSlideInput,
} = require("../../util/validators");

const {
  handleInputError,
  handleGeneralError,
} = require("../../util/error-handling");


module.exports = {
  Query: {
    async getGbmSlides() {
      try {
        const gbmSlides = await GbmSlide.find().sort({ title: 1 });
        return gbmSlides
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
  },

  Mutation: {
    async createGbmSlide(_, { createGbmSlideInput: {title, link, thumbnail, },}) {
      const { valid, errors } = validateCreateEditGbmSlideInput(
        title,
        link,
        thumbnail,
      );
      if (!valid) {
        handleInputError(errors);
      }

      isGbmSlideNameDuplicate = await GbmSlide.findOne({ title });

      if (isGbmSlideNameDuplicate) {
        errors.general = "This Gbm Slide is already in our database.";
        handleInputError(errors);
      }

      const newGbmSlide = new GbmSlide({
        title,
        link,
        thumbnail,
      });


      const savedGbmSlide = await newGbmSlide.save();

      return savedGbmSlide;
    },
  },
};
