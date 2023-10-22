const bcrypt = require("bcryptjs");
const User = require("../models/user_model");
const SES = require("../controllers/ses_controller");
const Reference = require("../models/reference_model");
const CloudApiController = require("../controllers/cloud_api_controller");
const template_evaluator = process.env.TEMPLATE_EVALUATOR;

/**
 * Function to create or update an user
 * @param {Object} user
 * @returns
 */
const createOrUpdated = ({ user }) => {
  return new Promise(async (resolve) => {
    //Validate if user exist
    let validationUser = await User.findOne({ email: user.email }).exec();
    if (validationUser == null) {
      resolve(await User.createPromise(user));
      return;
    }
    let updateUser = await verifyRolesAndCompanies({
      newUser: user,
      userDB: validationUser,
    });
    if (validationUser.password && updateUser.password)
      delete updateUser.password;
    let response = await User.findOneAndUpdate(
      { email: updateUser.email },
      { $set: updateUser },
      { new: true }
    ).exec();
    resolve({ success: true, user: response });
  });
};

/**
 * Function to encrypt password
 * @param {string} password
 * @returns
 */
const encryptPassword = ({ password }) => {
  return new Promise((resolve) => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    resolve(hash);
  });
};

/**
 * Function to create template of user
 * TODO:
 * Review this function
 * @param {String} user
 * @param {String[]} roles
 * @param {String[]} companiesApplied
 * @param {String} subType
 * @returns
 */
const createTemplate = async ({ user, roles, companiesApplied, subType }) => {
  return new Promise((resolve) => {
    // User template
    let userTemplate = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      companiesApplied,
      roles,
      subType,
    };

    if (user.linkedin) userTemplate.linkedin = user.linkedin;
    if (user.position) userTemplate.position = user.position;
    if (user.phoneNumber) userTemplate.phoneNumber = user.phoneNumber;
    resolve(userTemplate);
  });
};

const verifyRolesAndCompanies = ({ newUser, userDB }) => {
  return new Promise(async (resolve) => {
    //Validate if the user is an administrator to search in managed companies.
    let companiesValidation =
      // Return admin companies
      newUser["roles"][0] == "Administrator"
        ? "companiesAdministried"
        : newUser["roles"][0] == "Evaluator"
        ? // Return evaluated companies
          "companiesEvaluated"
        : // Return applied companies
          "companiesApplied";
    //Companies
    newUser[companiesValidation] = await findAndReplaceOrUpdateArray({
      stringToFind: newUser[companiesValidation][0],
      currentArray: userDB[companiesValidation],
    });
    //Roles
    newUser["roles"] = await findAndReplaceOrUpdateArray({
      stringToFind: newUser["roles"][0],
      currentArray: userDB.roles,
    });
    resolve(newUser);
  });
};

const findAndReplaceOrUpdateArray = ({ stringToFind, currentArray }) => {
  return new Promise((resolve) => {
    if (!currentArray || !currentArray.length) {
      resolve([stringToFind]);
      return;
    }
    if (currentArray.some((c) => c == stringToFind)) {
      resolve(currentArray);
      return;
    }
    let newArray = [...currentArray];
    newArray.push(stringToFind);
    resolve(newArray);
  });
};

const getRandomString = (length) => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};

/**
 * Function to get reference array to add in survey log
 * @param evaluatorsArray // Evaluator array draft
 * @param candidate //Candidate registered in the survey
 * @param surveyEncodeId //Encode id of survey
 * @param surveyTemplate //Survey Template id
 * @param company //Company id
 * @returns
 */

/**
 * Function to send email and WhatsApp to evaluators
 * - Create or updated each evaluator
 * - send emails for each evaluator with the link of the survey and information about the candidate
 * - send WhatsApp for each evaluator with the link of the survey and information about the candidate
 * - 3. Third step of flow, send link to evaluator to fill out the survey
 */
const evaluatorsTemplate = ({
  evaluatorsArray,
  candidate,
  surveyEncodeId,
  surveyTemplate,
  company,
}) => {
  return new Promise(async (resolve) => {
    // Declare the array to storage the draft of references
    let referencesDraft = [];
    for (let evaluator of evaluatorsArray) {
      // Creation of custom link to fill the references
      let encodeEmail = Buffer.from(evaluator.email).toString("base64");
      let customlink = `www.camila.build/survey?survey=${surveyEncodeId}&evaluator=${encodeEmail}`;
      // Mesage template
      let msg = {
        Destination: {
          ToAddresses: [evaluator.email],
        },
        ReplyToAddresses: ["team@camila.build"],
        Source: "team@camila.build",
        Template:
          surveyTemplate == "6294c4db037b2c370f2b5198"
            ? "PivotEmailReferences"
            : "Email_for_references_to_evaluate",
        TemplateData: JSON.stringify({
          organizationName: "Camila",
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          referenceName: evaluator.firstName,
          linkReference: customlink,
        }),
      };

      // Send WhatsApp
      CloudApiController.sendMessageWithLinkCandidateEvaluator({
        fullNameCandidate: `${candidate.firstName} ${candidate.lastName}`,
        fullNameEvaluator: `${evaluator.firstName} ${evaluator.lastName}`,
        phoneNumberCandidate: candidate.phoneNumber,
        phoneNumberEvaluator: evaluator.phoneNumber,
        customUrl: customlink,
        templateNameFacebook: template_evaluator,
      });

      // Sending the email
      // SES.sendTemplateEmail(msg);

      // Evaluator draft
      let draftEvaluator = {
        firstName: evaluator.firstName,
        lastName: evaluator.lastName,
        email: evaluator.email,
        linkedin: evaluator.linkedin,
        roles: ["Evaluator"],
        companiesEvaluated: [company],
        phoneNumber: evaluator.phoneNumber,
      };
      let { user } = await userCreateOrUpdated({ user: draftEvaluator });
      //Reference draft
      referencesDraft.push({
        relation: evaluator.relation ? evaluator.relation : "",
        company: evaluator.company ? evaluator.company : "",
        position: evaluator.position,
        status: "Pending",
        evaluator: user._id,
        candidate: candidate._id,
      });
    }
    // Bulk insert of references in DB
    let references = await Reference.insertMany(referencesDraft, {
      forceServerObjectId: true,
    });
    // Create array with only the ids o each reference
    let referencesIds = references.map((d) => d["_id"]);
    resolve({ references: referencesIds });
  });
};

const userCreateOrUpdated = ({ user }) => {
  return new Promise(async (resolve) => {
    //Validate if user exist
    let validationUser = await User.findOne({ email: user.email }).exec();
    if (validationUser == null) resolve(await User.createPromise(user));
    else {
      let updateUser = await verifyRolesAndCompanies({
        newUser: user,
        userDB: validationUser,
      });
      let response = await User.findOneAndUpdate(
        { email: updateUser.email },
        { $set: updateUser },
        { new: true }
      ).exec();
      resolve({ success: true, user: response });
    }
  });
};

const createUserTemplate = async ({
  user,
  roles,
  companiesApplied,
  subType,
}) => {
  return new Promise((resolve) => {
    // User template
    let userTemplate = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      companiesApplied,
      roles,
      subType,
    };

    if (user.linkedin) userTemplate.linkedin = user.linkedin;
    if (user.position) userTemplate.position = user.position;
    if (user.phoneNumber) userTemplate.phoneNumber = user.phoneNumber;
    resolve(userTemplate);
  });
};

module.exports = {
  createOrUpdated,
  createTemplate,
  encryptPassword,
  getRandomString,
  evaluatorsTemplate,
  userCreateOrUpdated,
  createUserTemplate,
};
