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
    async createGbmSlide(
      _,
      {
        createGbmSlideInput: {
            title,
            link,
            thumbnail,
        },
      }
    ) {
      const { valid, errors } = validateCreateEditGbmSlideInput(
        title,
        link,
        thumbnail,
      );
      console.log("1")
      if (!valid) {
        handleInputError(errors);
      }

      isGbmSlideNameDuplicate = await GbmSlide.findOne({ title });
      console.log("2")

      if (isGbmSlideNameDuplicate) {
        errors.general = "This Gbm Slide is already in our database.";
        handleInputError(errors);
      }
      console.log("3")

      const newGbmSlide = new GbmSlide({
        title,
        link,
        thumbnail,
      });
      console.log("4")


      const savedGbmSlide = await newGbmSlide.save();
      console.log("5")

      return savedGbmSlide;
    },
  },
};
