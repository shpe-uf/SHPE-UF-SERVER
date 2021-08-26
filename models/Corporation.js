const { model, Schema } = require("mongoose");
const mongoose = require("mongoose");
const User = require("./User");

const corporationSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  logo: {
    type: String,
    required: true
  },
  slogan: {
    type: String,
    required: true
  },
  majors: [{
    type: String,
    required: true
  }],
  industries: [{
    type: String,
    required: true
  }],
  overview: {
    type: String,
    required: true
  },
  mission: {
    type: String,
    required: true
  },
  goals: {
    type: String,
    required: true
  },
  businessModel: {
    type: String,
    required: true
  },
  newsLink: {
    type: String,
    required: true
  },
  applyLink: {
    type: String,
    required: true
  },
  academia: {
    type: Boolean,
    required: true
  },
  govContractor: {
    type: Boolean,
    required: true
  },
  nonProfit: {
    type: Boolean,
    required: true
  },
  visaSponsor: {
    type: Boolean,
    required: true
  },
  shpeSponsor: {
    type: Boolean,
    required: true
  },
  industryPartnership: {
    type: Boolean,
    required: true
  },
  fallBBQ: {
    type: Boolean,
    required: true
  },
  springBBQ: {
    type: Boolean,
    required: true
  },
  nationalConvention: {
    type: Boolean,
    required: true
  },
  interns: {
    type: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  }
});

module.exports = model("Corporation", corporationSchema);
