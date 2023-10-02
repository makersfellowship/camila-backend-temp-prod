const mongoose = require("mongoose");
const reponseType = ["Evaluator", "Candidate"];

const ResponseSchema = mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
    required: true,
  },
  result: { type: String, required: true },
  score: { type: Number, required: false },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  survey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Survey",
    required: true,
  },
  type: { type: String, required: false, enum: reponseType },
  createdAt: { type: Date, required: false, default: Date.now },
});

ResponseSchema.statics = {
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
    const response = new this(data);
    response.save(callback);
  },
};

const Response = (module.exports = mongoose.model("Response", ResponseSchema));
