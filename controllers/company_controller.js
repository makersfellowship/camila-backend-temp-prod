"use strict";
const Company = require("../models/company_model");
const User = require("../models/user_model");

exports.validOrCreate = async function (req, res) {
  try {
    let currentCompany = await Company.findOne({
      email: req.body.email,
    }).exec();
    if (currentCompany != null)
      return res.status(200).json({ success: true, company: currentCompany });
    let companyDraft = {
      name: req.body.name,
      email: req.body.email,
      status: "Disabled",
    };
    let company = new Company(companyDraft);
    await company.save();
    return res.status(200).json({ success: true, company });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, error });
  }
};

exports.create = function (req, res) {
  Company.create(req.body, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.getDetail = async function (req, res) {
  try {
    const { id } = req.params;
    // Get company of DB
    let company = await Company.findOne({ _id: id }).exec();
    // Nullish Validation
    if (company == null)
      return res.status(400).json({ msg: "Company not found." });
    let administrators = await User.find({ companiesAdministried: id }).exec();
    return res.status(200).json({
      success: true,
      company,
      administrators,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Server error", error });
  }
};

exports.get = function (req, res) {
  Company.get({ _id: req.params.id }, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.getByEmail = function (req, res) {
  Company.get({ email: req.params.email }, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.getAll = function (req, res) {
  Company.getAll({}, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.update = function (req, res) {
  Company.updateById(req.params.id, req.body, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.delete = function (req, res) {
  Company.removeById({ _id: req.params.id }, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      console.error(err);
      return res.send(err); // 500 error
    }
  });
};
