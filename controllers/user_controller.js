"use strict";
require("dotenv").config();
const User = require("../models/user_model");
const UserHelper = require("../helpers/user_helper");
const Company = require("../models/company_model");
const SurveyTemplate = require("../models/survey_template_model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/database");
const SES = require("../controllers/ses_controller");
const CloudApiController = require("../controllers/cloud_api_controller");
const template_send_survey_candidate =
  process.env.TEMPLATE_SEND_SURVEY_CANDIDATE;

/**
 * REGISTER ADMIN
 * @param {*} req body ...
 * @param {*} res
 */
exports.createAdministrator = async function (req, res) {
  const { email, password, company } = req.body;
  try {
    //Validation in params
    if (!email || !password || !company)
      return res
        .status(400)
        .json({ success: false, message: "Información incompleta." });
    //Template of user
    let administratorTemplate = { ...req.body };
    administratorTemplate["roles"] = ["Administrator"];
    administratorTemplate["companiesAdministried"] = [company];
    administratorTemplate["password"] = await UserHelper.encryptPassword({
      password: password,
    });
    //Resgister administrator
    let { user } = await UserHelper.createOrUpdated({
      user: administratorTemplate,
    });
    // Message to start whatsapp flow with user
    CloudApiController.newAdministratorRegister({
      fullName: `${user.firstName} ${user.lastName}`,
      phoneNumber: user.phoneNumber,
    });
    return res.status(201).json({
      success: true,
      message: "Administrador registered successfully.",
      administrator: user,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: "Server error" });
  }
};

exports.selfOnboard = async function (req, res) {
  const { companyName, firstName, lastName, phoneNumber, email } = req.body;
  try {
    //Create company
    const { success, company } = await Company.createPromise({
      name: companyName,
    });
    if (!success)
      return res
        .status(400)
        .json({ success: false, error: "Error when registering the company" });
    //Validation in params
    const password = UserHelper.getRandomString(8);
    if (!email || !password || !company)
      return res
        .status(400)
        .json({ success: false, message: "Información incompleta." });
    //Template of user
    let administratorTemplate = {
      firstName,
      lastName,
      phoneNumber,
      email,
      roles: ["Administrator"],
      companiesAdministried: [company._id],
    };
    administratorTemplate["password"] = await UserHelper.encryptPassword({
      password: password,
    });
    // Resgister administrator
    let { user } = await UserHelper.createOrUpdated({
      user: administratorTemplate,
    });
    //TODO SENT WA MSG and EMAIL
    // selfonboard_email;
    let msg = {
      Destination: {
        ToAddresses: [user.email],
      },
      ReplyToAddresses: ["team@camila.build"],
      Source: "team@camila.build",
      Template: "selfonboard_email",
      TemplateData: JSON.stringify({
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        password: password,
      }),
    };
    SES.sendTemplateEmail(msg);
    return res.status(201).json({
      success: true,
      message: "Administrador registered successfully.",
      administrator: user,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: "Server error" });
  }
};

exports.administratorAuthentication = async function (req, res) {
  try {
    const { email, password } = req.body;
    // Fields Validations
    if (!email || !password)
      return res.status(400).json({ msg: "Email and password are required." });
    // Get user of DB
    let user = await User.findOne({ email: email })
      .populate("companiesAdministried")
      .exec();
    // Nullish Validation
    if (user == null) return res.status(400).json({ msg: "User not found." });
    // Pass Validation
    let passvValidation = bcrypt.compareSync(password, user.password);
    if (!passvValidation)
      return res.status(400).json({ msg: "Password is wrong." });
    if (!user.roles.some((r) => r == "Administrator" || r == "Caministrator"))
      return res
        .status(400)
        .json({ msg: "This user is not an administrator." });
    user.companiesAdministried = user.roles.some((r) => r == "Caministrator")
      ? await Company.find({}).exec()
      : user.companiesAdministried;
    if (!user.companiesAdministried.length)
      return res
        .status(400)
        .json({ msg: "This user have not a company to administrate." });

    const token = jwt.sign({ user: user }, config.secret);

    return res.status(200).json({
      token: `JWT ${token}`,
      user: user,
      currentCompany: user.companiesAdministried[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Server error", error });
  }
};

exports.removeAdministratorFromCompany = async function (req, res) {
  try {
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: "Server error" });
  }
};

exports.bulkCreateOrUpdateReferencesCheck = async function (req, res) {
  try {
    let surveyTemplate = await SurveyTemplate.findOne({
      _id: req.body.templateId,
    }).populate("company");
    let { newUsersTemplate, UpdatedUsersTemplate } =
      await dividedUsersCreateOrUpdated({
        users: [...req.body.users],
      });
    let newUsers = await User.insertMany(newUsersTemplate);
    let { UpdatedUsers } = await onUpdatedUsers({
      users: UpdatedUsersTemplate,
    });
    sendEmailUsersSurvey({
      users: [...req.body.users],
      surveyTemplateId: req.body.templateId,
      surveyTemplate,
    });
    return res.status(201).json({ success: true, newUsers, UpdatedUsers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error });
  }
};

exports.getBycompany = async function (req, res) {
  const { company } = req.params;
  try {
    let linkCandidates = await User.find({
      companiesApplied: company,
      roles: "Candidate",
      subType: "Form",
    })
      .sort({ createdAt: -1 })
      .exec();
    let csvCandidates = await User.find({
      companiesApplied: company,
      roles: "Candidate",
      subType: "Reference Check",
    })
      .sort({ createdAt: -1 })
      .exec();
    let evaluators = await User.find({
      companiesEvaluated: company,
      roles: "Evaluator",
    })
      .sort({ createdAt: -1 })
      .exec();
    let administrators = await User.find({
      companiesAdministried: company,
      roles: "Administrator",
    })
      .sort({ createdAt: -1 })
      .exec();
    return res.status(200).json({
      success: true,
      linkCandidates,
      csvCandidates,
      evaluators,
      administrators,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e });
  }
};

exports.getByEmail = function (req, res) {
  User.get({ email: req.params.email }, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

//??CRUD
exports.create = function (req, res) {
  User.create(req.body, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.get = function (req, res) {
  User.get({ _id: req.params.id }, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.getAll = function (req, res) {
  User.getAll({}, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.update = function (req, res) {
  User.updateById(req.params.id, req.body, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.delete = function (req, res) {
  User.removeById({ _id: req.params.id }, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      console.error(err);
      return res.send(err); // 500 error
    }
  });
};

/**
 * Function sendEmailUsersSurvey to send the email and WhatsApp to the candidate
 * - send emails for each cadidate with the link of the survey
 * - send WhatsApp for each cadidate with the link of the survey
 * - 1. First step of flow, send email to candidate to request filling up the survey with information about his evaluators
 */
function sendEmailUsersSurvey({ users, surveyTemplateId, surveyTemplate }) {
  let encodeId = Buffer.from(surveyTemplateId).toString("base64");
  let customUrl = `www.camila.build/survey?frm=${encodeId}`;
  for (const user of users) {
    let msg = {
      Destination: {
        CcAddresses: ["juanluis0217@gmail.com"],
        ToAddresses: [user.email],
      },
      ReplyToAddresses: ["team@camila.build"],
      Source: "team@camila.build",
      Template: "Email_for_adding_references",
      TemplateData: JSON.stringify({
        candidateName: `${user.firstName} ${user.lastName}`,
        candidateFirstName: user.firstName,
        refencesSurvey: customUrl,
      }),
    };
    
    // Send WhatsApp to candidate
    CloudApiController.sendMessageWithLinkCandidateEvaluator({
      fullNameCandidate: `${user.firstName} ${user.lastName}`,
      phoneNumberCandidate: user.phoneNumber,
      companyName: surveyTemplate.company.name,
      customUrl: customUrl,
      templateNameFacebook: template_send_survey_candidate,
    });

    // Send Email to candidate
    // SES.sendTemplateEmail(msg);
  }
}

const dividedUsersCreateOrUpdated = ({ users }) => {
  return new Promise(async (resolve) => {
    let newUsersTemplate = [];
    let UpdatedUsersTemplate = [];
    let emailArray = users.map((u) => u.email);
    let currentUsers = await User.find({ email: { $in: emailArray } }).exec();
    for (let user of users) {
      if (currentUsers.some((cu) => cu.email == user.email)) {
        let index = currentUsers.findIndex((cu) => cu.email == user.email);
        let updateUser = await verifyRolesAndCompany({
          newUser: user,
          userDB: currentUsers[index],
        });
        UpdatedUsersTemplate.push(updateUser);
      } else newUsersTemplate.push(user);
    }
    resolve({ newUsersTemplate, UpdatedUsersTemplate });
  });
};

function onUpdatedUsers({ users }) {
  return new Promise(async (resolve) => {
    let newUsers = JSON.parse(JSON.stringify(users));
    let bulkUpdated = [];
    for (let user of newUsers) {
      let x = {
        updateOne: {
          filter: { email: user.email },
          update: { $set: user },
        },
      };
      bulkUpdated.push(x);
    }
    let updatedUsers = await User.bulkWrite(bulkUpdated);
    resolve({ updatedUsers });
  });
}

const verifyRolesAndCompany = async ({ newUser, userDB }) => {
  return new Promise((resolve) => {
    if (userDB?.companiesApplied?.length > 0) {
      if (
        !userDB.companiesApplied.some(
          (c) => c == newUser["companiesApplied"][0]
        )
      ) {
        let newCompanies = [...userDB.companiesApplied];
        newCompanies.push(newUser["companiesApplied"][0]);
        newUser["companiesApplied"] = newCompanies;
      } else newUser["companiesApplied"] = [...userDB.companiesApplied];
    }
    if (userDB?.roles?.length > 0) {
      if (!userDB.roles.some((c) => c == newUser["roles"][0])) {
        let newRoles = [...userDB.roles];
        newRoles.push(newUser["roles"][0]);
        newUser["roles"] = newRoles;
      } else newUser["roles"] = [...userDB.roles];
    }
    resolve(newUser);
  });
};
