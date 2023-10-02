const mongoose = require("mongoose");

const SurveySchema = mongoose.Schema({
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  score: { type: Number, required: false },
  status: {
    type: String,
    required: true,
    default: "Pending",
    enum: ["Pending", "Rejected", "Accepted"],
  },
  position: { type: String, required: false },
  references: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reference",
        required: false,
      },
    ],
    required: false,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  surveyTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SurveyTemplate",
    required: true,
  },
  createdAt: { type: Date, required: false, default: Date.now },
});

SurveySchema.statics = {
  get: function (query, callback) {
    this.findOne(query).exec(callback);
  },
  getAll: function (query, callback) {
    this.find(query).exec(callback);
  },
  updateById: function (id, updateData, callback) {
    this.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { new: true },
      callback
    );
  },
  removeById: function (removeData, callback) {
    this.findOneAndRemove(removeData, callback);
  },
  create: function (data, callback) {
    const survey = new this(data);
    survey.save(callback);
  },
  aggregateOne: async function (options) {
    const items = await this.aggregate(options);
    return items.length > 0 ? items[0] : null;
  },
};

const Survey = (module.exports = mongoose.model("Survey", SurveySchema));
