const mongoose = require("mongoose");
const flowsType = ["Custom flow", "Reference check"];
const SurveyTemplateSchema = mongoose.Schema({
  name: { type: String, required: false },
  position: { type: String, required: false },
  description: { type: String, required: false },
  customLink: { type: String, required: false },
  maxNumberReferences: { type: Number, required: false, default: 10 },
  minNumberReferences: { type: Number, required: false, default: 1 },
  customTemplate: { type: String, required: false },
  flow: {
    type: String,
    required: false,
    enum: flowsType,
    default: "Reference check",
  },
  status: {
    type: String,
    required: true,
    default: "Draft",
    enum: ["Draft", "Publish"],
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  clusters: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cluster",
      required: true,
    },
  ],
  createdAt: { type: Date, required: false, default: Date.now },
});

SurveyTemplateSchema.statics = {
  get: function (query, callback) {
    this.findOne(query).exec(callback);
  },
  getAll: function (query, callback) {
    this.find(query).populate("company").exec(callback);
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
    const surveyTemplate = new this(data);
    surveyTemplate.save(callback);
  },
  createPromise: async function (data) {
    try {
      const surveyTemplate = new this(data);
      let survey = await surveyTemplate.save();
      return { success: true, survey };
    } catch (error) {
      return { success: false, error };
    }
  },
};

const SurveyTemplate = (module.exports = mongoose.model(
  "SurveyTemplate",
  SurveyTemplateSchema
));
