const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const userType = ["Candidate", "Administrator", "Evaluator", "Caministrator"];
const userSubType = ["Form", "Reference Check"];

const UserSchema = mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  subType: {
    type: String,
    required: false,
    enum: userSubType,
    default: "Form",
  },
  roles: [{ type: String, required: true, enum: userType }],
  companiesAdministried: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },
  ],
  companiesApplied: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },
  ],
  companiesEvaluated: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },
  ],
  phoneNumber: { type: String, required: false },
  linkedin: { type: String, required: false },
  password: { type: String, required: false },
  createdAt: { type: Date, required: false, default: Date.now },
});

UserSchema.statics = {
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
    const user = new this(data);
    user.save(callback);
  },
  createPromise: async function (data) {
    try {
      const newUser = new this(data);
      let user = await newUser.save();
      return { success: true, user };
    } catch (error) {
      return { success: false, error };
    }
  },
  updatePromise: async function ({ query, data }) {
    try {
      let user = await User.updateOne(query, data).exec();
      return { success: true, user };
    } catch (error) {
      return { success: false, error };
    }
  },
  getWithoutCB: async function (query) {
    try {
      return await this.findOne(query);
    } catch (err) {
      return new Error(`Something went wrong get: ${err}`);
    }
  },
};

const User = (module.exports = mongoose.model("User", UserSchema));

// REGISTER ADMINS
module.exports.addUser = function (newUser, callback) {
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(newUser.password, salt, (err, hash) => {
      if (err) throw err;
      newUser.password = hash;
      var UserSchema = mongoose.model("User");
      UserSchema.find({ email: newUser.email }, (err, res) => {
        if (res.length == 0) {
          newUser.save(callback);
        } else {
          callback("User exists", null);
        }
      });
    });
  });
};

// ONLY ADMINS
module.exports.comparePassword = function (candidatePassword, hash, callback) {
  bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
    if (err) throw err;
    callback(null, isMatch);
  });
};
