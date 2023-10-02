const mongoose = require("mongoose");

const ClusterSchema = mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: false },
  contentType: {
    type: String,
    required: false,
    default: "Private",
    enum: ["Private", "Public"],
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: false,
  },
  type: {
    type: String,
    required: false,
    enum: ["Role", "Skill"],
  },
  updatedAt: { type: Date, required: false, default: Date.now },
  createdAt: { type: Date, required: false, default: Date.now },
});

ClusterSchema.statics = {
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
    const cluster = new this(data);
    cluster.save(callback);
  },
  createPromise: async function (data) {
    try {
      const newCluster = new this(data);
      let cluster = await newCluster.save();
      return { success: true, cluster };
    } catch (error) {
      return { success: false, error };
    }
  },
};

const Cluster = (module.exports = mongoose.model("Cluster", ClusterSchema));
