const EboardMember = require('../../models/EboardMember');
const { handleInputError, handleGeneralError } = require('../../util/error-handling');

require('dotenv').config();

module.exports = {
  Query: {
    async getEboard() {
      try {
        const members = await EboardMember.find().sort({ createdAt: 1 });
        return members;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
  },

  Mutation: {
    async createEboardMember(_, { createEboardInput: { position, name, picture } }) {
      const errors = {};

      if (!position || !position.trim()) errors.position = 'Position is required.';
      if (!name || !name.trim()) errors.name = 'Name is required.';
      if (!picture || !picture.trim()) errors.picture = 'Picture URL is required.';

      if (Object.keys(errors).length > 0) handleInputError(errors);

      try {
        const newMember = new EboardMember({
          position,
          name,
          picture,
          createdAt: new Date().toISOString(),
        });

        await newMember.save();

        const all = await EboardMember.find();
        return all;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },

    async updateEboardMember(_, { updateEboardInput: { id, position, name, active, picture } }) {
      try {
        const member = await EboardMember.findById(id);
        if (!member) {
          const errors = { general: 'Eboard member not found.' };
          handleInputError(errors);
        }

        if (position !== undefined) member.position = position;
        if (name !== undefined) member.name = name;
        if (active !== undefined) member.active = active;
        if (picture !== undefined) member.picture = picture;

        await member.save();

        return member;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
  },
};
