const Corporation = require("../../models/Corporation.js");

require("dotenv").config();

const {
  validateCreateEditCorporationInput: validateCreateEditCorporationInput,
} = require("../../util/validators");

const {
  handleInputError,
  handleGeneralError,
} = require("../../util/error-handling");

module.exports = {
  Query: {
    async getCorporations() {
      try {
        const corporations = await Corporation.find().sort({ name: 1 });
        return corporations;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
  },
  Mutation: {
    async createCorporation(
      _,
      {
        createCorporationInput: {
          name,
          logo,
          slogan,
          majors,
          industries,
          overview,
          mission,
          goals,
          businessModel,
          newsLink,
          applyLink,
          academia,
          govContractor,
          nonProfit,
          visaSponsor,
          shpeSponsor,
          industryPartnership,
          fallBBQ,
          springBBQ,
          nationalConvention,
          recruitmentDay,
          signUpLink,
        },
      }
    ) {
      const { valid, errors } = validateCreateEditCorporationInput(
        name,
        logo,
        slogan,
        majors,
        industries,
        overview,
        mission,
        goals,
        businessModel,
        newsLink,
        applyLink,
      );

      if (!valid) {
        handleInputError(errors);
      }

      isCorporationNameDuplicate = await Corporation.findOne({ name });

      if (isCorporationNameDuplicate) {
        errors.general = "This corporation is already in our database.";
        handleInputError(errors);
      }

      academia = academia === "true" || academia === true ? true : false;
      govContractor =
        govContractor === "true" || govContractor === true ? true : false;
      nonProfit = nonProfit === "true" || nonProfit === true ? true : false;
      visaSponsor =
        visaSponsor === "true" || visaSponsor === true ? true : false;
      shpeSponsor =
        shpeSponsor === "true" || shpeSponsor === true ? true : false;
      industryPartnership =
        industryPartnership === "true" || industryPartnership === true
          ? true
          : false;
      fallBBQ = fallBBQ === "true" || fallBBQ === true ? true : false;
      springBBQ = springBBQ === "true" || springBBQ === true ? true : false;
      nationalConvention =
        nationalConvention === "true" || nationalConvention === true
          ? true
          : false;
      recruitmentDay = recruitmentDay === "true" || recruitmentDay === true ? true : false;

      const newCorporation = new Corporation({
        name,
        logo,
        slogan,
        majors,
        industries,
        overview,
        mission,
        goals,
        businessModel,
        newsLink,
        applyLink,
        academia,
        govContractor,
        nonProfit,
        visaSponsor,
        shpeSponsor,
        industryPartnership,
        fallBBQ,
        springBBQ,
        nationalConvention,
        recruitmentDay,
        signUpLink,
      });

      await newCorporation.save();


      const corporations = await Corporation.find();

      return corporations;
    },

    async editCorporation(
      _,
      {
        editCorporationInput: {
          id,
          name,
          logo,
          slogan,
          majors,
          industries,
          overview,
          mission,
          goals,
          businessModel,
          newsLink,
          applyLink,
          academia,
          govContractor,
          nonProfit,
          visaSponsor,
          shpeSponsor,
          industryPartnership,
          fallBBQ,
          springBBQ,
          nationalConvention,
          recruitmentDay,
          signUpLink,
        },
      }
    ) {
      const { valid, errors } = validateCreateEditCorporationInput(
        name,
        logo,
        slogan,
        majors,
        industries,
        overview,
        mission,
        goals,
        businessModel,
        newsLink,
        applyLink,
        signUpLink
      );

      if (!valid) {
        handleInputError(errors);
      }

      academia = academia === "true" || academia === true ? true : false;
      govContractor =
        govContractor === "true" || govContractor === true ? true : false;
      nonProfit = nonProfit === "true" || nonProfit === true ? true : false;
      visaSponsor =
        visaSponsor === "true" || visaSponsor === true ? true : false;
      shpeSponsor =
        shpeSponsor === "true" || shpeSponsor === true ? true : false;
      industryPartnership =
        industryPartnership === "true" || industryPartnership === true
          ? true
          : false;
      fallBBQ = fallBBQ === "true" || fallBBQ === true ? true : false;
      springBBQ = springBBQ === "true" || springBBQ === true ? true : false;
      nationalConvention =
        nationalConvention === "true" || nationalConvention === true
          ? true
          : false;
      recruitmentDay = recruitmentDay === "true" || recruitmentDay === true ? true : false;

      const companyExists = await Corporation.findOne({ _id: id });

      if (companyExists) {
        const updatedCorporation = await Corporation.findOneAndUpdate(
          { _id: id },
          {
            id,
            name,
            logo,
            slogan,
            majors,
            industries,
            overview,
            mission,
            goals,
            businessModel,
            newsLink,
            applyLink,
            academia,
            govContractor,
            nonProfit,
            visaSponsor,
            shpeSponsor,
            industryPartnership,
            fallBBQ,
            springBBQ,
            nationalConvention,
            recruitmentDay,
            signUpLink,
          },
          {
            //Returns the updated object, instead of the old one
            new: true,
          }
        );
        return updatedCorporation;
      } else {
        handleGeneralError({}, "Company not found.");
      }
    },

    async deleteCorporation(_, { corporationId }) {
      try{
        await Corporation.deleteOne({ _id: corporationId });
      }catch(err){
        handleGeneralError(err, err.message);
      }
      const corporations = await Corporation.find();

      return corporations;
    },
  },
};
