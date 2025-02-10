const Partner = require("../../models/Partner.js");

require("dotenv").config();

const {
  validateCreateEditPartnerInput: validateCreateEditPartnerInput,
} = require("../../util/validators");

const {
  handleInputError,
  handleGeneralError,
} = require("../../util/error-handling");

module.exports = {
  Query: {
    async getPartners() {
      try {
        const partners = await Partner.find().sort({ name: 1 });
        return partners
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
  },

  Mutation: {
    async createPartner(
      _,
      {
        createPartnerInput: {
          name,
          photo,
          tier,
        },
      }
    ) {
      const { valid, errors } = validateCreateEditPartnerInput(
        name,
        photo,
        tier,
      );

      if (!valid) {
        handleInputError(errors);
      }

      isPartnerNameDuplicate = await Partner.findOne({ name });

      if (isPartnerNameDuplicate) {
        errors.general = "This partner is already in our database.";
        handleInputError(errors);
      }

      const newPartner = new Partner({
        name,
        photo,
        tier,
      });


      const savedPartner = await newPartner.save();

      return savedPartner;
    },
  },
};
