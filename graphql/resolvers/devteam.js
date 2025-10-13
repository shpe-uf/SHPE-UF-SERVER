const DevTeamMember = require('../../models/DevTeamMember');
const { handleInputError, handleGeneralError } = require('../../util/error-handling');

require('dotenv').config();

module.exports = {
  Query: {
    async getDevTeam() {
      try {
        const members = await DevTeamMember.find().sort({ createdAt: 1 });
        return members;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },
  },

  Mutation: {
    async createDevTeamMember(_, { createDevTeamInput: { name, position, team, picture } }) {
      const errors = {};

      if (!name || !name.trim()) errors.name = 'Name is required.';
      if (!position || !position.trim()) errors.position = 'Position is required.';
      if (!team || !team.trim()) errors.team = 'Team is required.';
      if (!picture || !picture.trim()) errors.picture = 'Picture URL is required.';

      if (Object.keys(errors).length > 0) handleInputError(errors);

      try {
        const newMember = new DevTeamMember({
          name,
          position,
          team,
          picture,
          createdAt: new Date().toISOString(),
        });

        await newMember.save();

        const all = await DevTeamMember.find();
        return all;
      } catch (err) {
        handleGeneralError(err, err.message);
      }
    },

    async updateDevTeamMember(_, { updateDevTeamInput: { id, name, position, team, active, picture } }) {
      try {
        const member = await DevTeamMember.findById(id);
        if (!member) {
          const errors = { general: 'Dev team member not found.' };
          handleInputError(errors);
        }

        if (name !== undefined) member.name = name;
        if (position !== undefined) member.position = position;
        if (team !== undefined) member.team = team;
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
