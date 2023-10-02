const mongoose = require("mongoose");

const CloudApiSchema = mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  message: { type: String, required: false },
  createdAt: { type: Date, required: false, default: Date.now },
});

CloudApiSchema.statics = {
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
    const cloudApi = new this(data);
    cloudApi.save(callback);
  },
};

const CloudApi = (module.exports = mongoose.model("CloudApi", CloudApiSchema));
