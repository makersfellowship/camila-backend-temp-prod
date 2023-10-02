const mongoose = require("mongoose");

const ReferenceSchema = mongoose.Schema({
  status: {
    type: String,
    required: true,
    default: "Pending",
    enum: ["Pending", "Completed"],
  },
  relation: { type: String, required: false }, //Select of relations type
  company: { type: String, required: false }, // open Value
  position: { type: String, required: false }, // open Value
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  evaluator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  responseDate: { type: Date, required: false },
  lastReminder: { type: Date, required: false, default: Date.now },
  createdAt: { type: Date, required: false, default: Date.now },
});

ReferenceSchema.statics = {
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
    const reference = new this(data);
    reference.save(callback);
  },
};

const Reference = (module.exports = mongoose.model(
  "Reference",
  ReferenceSchema
));
