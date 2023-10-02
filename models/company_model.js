const mongoose = require("mongoose");

const CompanySchema = mongoose.Schema({
  name: { type: String, required: true },
  // Sector economico
  // Numeron de empleados
  // Future properties: number of actived templates,
  email: { type: String, required: false },
  status: { type: String, required: false },
  createdAt: { type: Date, required: false, default: Date.now },
});

CompanySchema.statics = {
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
    const company = new this(data);
    company.save(callback);
  },
  createPromise: async function (data) {
    try {
      const newCompany = new this(data);
      let company = await newCompany.save();
      return { success: true, company };
    } catch (error) {
      return { success: false, error };
    }
  },
};

const Company = (module.exports = mongoose.model("Company", CompanySchema));
