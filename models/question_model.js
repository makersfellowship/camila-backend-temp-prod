const mongoose = require("mongoose");
const questionType = [
  "single-option",
  "multiple-option",
  "slider-option",
  "text",
  "matrix",
];
const publishTo = ["Candidate", "Evaluator"];

const QuestionSchema = mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: false },
  subType: { type: String, required: false },
  step: { type: Number, required: false, default: 1 },
  questionType: { type: String, required: true, enum: questionType },
  options: { type: [String], required: false },
  rateScale: { type: [String], required: false }, // only to matrix questions
  regex: { type: String, required: false },
  maxNumberSelected: { type: Number, required: false },
  minNumberSelected: { type: Number, required: false },
  publishTo: { type: String, required: true, enum: publishTo },
  viewPosition: { type: Number, required: false }, // Order of question in form
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: false,
  },
  surveyTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SurveyTemplate",
    required: false,
  },
  cluster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cluster",
    required: false,
  },
  createdAt: { type: Date, required: false, default: Date.now },
});

QuestionSchema.statics = {
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
    const question = new this(data);
    question.save(callback);
  },
  createPromise: async function (data) {
    try {
      const question = new this(data);
      let user = await question.save();
      return { success: true, user };
    } catch (error) {
      return { success: false, error };
    }
  },
};

const Question = (module.exports = mongoose.model("Question", QuestionSchema));
