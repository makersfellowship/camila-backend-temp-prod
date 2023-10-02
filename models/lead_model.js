const mongoose = require("mongoose");

const LeadSchema = mongoose.Schema({
  email: { type: String, required: true },
  createdAt: { type: Date, required: false, default: Date.now },
});

LeadSchema.statics = {
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
    const lead = new this(data);
    lead.save(callback);
  },
};

const Lead = (module.exports = mongoose.model("Lead", LeadSchema));
