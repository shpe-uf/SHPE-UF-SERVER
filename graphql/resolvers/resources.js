const Resource = require("../../models/Resource");
const { validateCreateResourceInput } = require("../../util/validators");

require("dotenv").config();

const {
  handleInputError,
  handleGeneralError,
} = require("../../util/error-handling");

module.exports = {
  Query: {
    async getResources() {
      try {
        const resources = await Resource.find().sort({ createdAt: 1 });
        return resources;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
  },

  Mutation: {
    async createResource(
      _,
      { createResourceInput: { 
        title,
        link,
        description,
        image,
        podcast
        }, 
      }
    ) {
      const { errors, valid } = validateCreateResourceInput(
        title,
        link,
        description,
        image,
        podcast
      );

      if (!valid) {
        handleInputError(errors);
      }

      isResourceDuplicate = await Resource.findOne({ title });

      if (isResourceDuplicate) {
        errors.general = "A resource with that name already exists.";
        handleInputError(errors);
      }

      const newResource = new Resource({
        title,
        link,
        description,
        image,
        createdAt: new Date().toISOString(),
        podcast,
      });

      await newResource.save();

      const updatedResources = await Resource.find();
 
      return updatedResources;
    },

    async deleteResource(_, { resourceId }) {

      const resource = await Resource.findOne({
        _id: resourceId,
      });

      if (!resource) {
        errors.general = "Resource not found.";
        handleInputError(errors);
      }

      await Resource.deleteOne({ _id: resourceId });

      resources = await Resource.find();

      return resources;
    },
  },
};
