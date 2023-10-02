"use strict";
const SurveyTemplate = require("../models/survey_template_model");
const Question = require("../models/question_model");

// default questions setup
let defaultQuestionsTemplate = [
  {
    title: "First Name",
    questionType: "text",
    subType: "firstName",
    options: [],
    viewPosition: 1,
    description: "",
  },
  {
    title: "Last Name",
    questionType: "text",
    subType: "lastName",
    options: [],
    viewPosition: 2,
    description: "",
  },
  {
    title: "Email",
    questionType: "text",
    subType: "email",
    regex: "email",
    options: [],
    viewPosition: 3,
    description: "",
  },
  {
    title: "Linkedin",
    questionType: "text",
    subType: "url",
    regex: "url",
    options: [],
    viewPosition: 4,
    description: "",
  },
  {
    title: "Phone number",
    questionType: "text",
    subType: "phoneNumber",
    regex: "phone",
    options: [],
    viewPosition: 4,
    description: "",
  },
];
// define questions for candidate and evaluator
const defaultQuestionsCandidate = defaultQuestionsTemplate.map((value) => {
  return { ...value, publishTo: "Candidate" };
});
const defaultQuestionsEvaluators = defaultQuestionsTemplate.map((value) => {
  return { ...value, publishTo: "Evaluator" };
});

// * CRUD
exports.create = async function (req, res) {
  try {
    let { success, error, survey } = await SurveyTemplate.createPromise(
      req.body
    );
    // Condition to return if exist error
    if (!success) return res.status(400).json({ success: false, error });
    survey.customLink = Buffer.from(survey._id).toString("base64");
    let updatedSurvey = await SurveyTemplate.findOneAndUpdate(
      { _id: survey._id },
      { $set: survey },
      { new: true }
    ).exec();
    // default candidate questions
    onCreateQuestions({
      questions: defaultQuestionsCandidate,
      survey: updatedSurvey,
    });
    // default evaluators questions
    onCreateQuestions({
      questions: defaultQuestionsEvaluators,
      survey: updatedSurvey,
    });
    return res.status(200).json({
      success: true,
      survey: updatedSurvey,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error });
  }
};

exports.get = async function (req, res) {
  try {
    const template = await SurveyTemplate.findOne({
      _id: req.params.id,
    }).exec();
    let questionsCandidate = await Question.find({
      $and: [
        {
          $or: [
            { surveyTemplate: template._id },
            {
              $and: [
                { cluster: { $exists: true } },
                { cluster: { $in: template.clusters } },
              ],
            },
          ],
        },
        {
          publishTo: "Candidate",
        },
      ],
    })
      .sort({ viewPosition: 1 })
      .exec();
    let questionsEvaluator = await Question.find({
      $and: [
        {
          $or: [
            { surveyTemplate: template._id },
            {
              $and: [
                { cluster: { $exists: true } },
                { cluster: { $in: template.clusters } },
              ],
            },
          ],
        },
        {
          publishTo: "Evaluator",
        },
      ],
    })
      .sort({ viewPosition: 1 })
      .exec();
    return res.status(200).json({
      success: true,
      template,
      questionsEvaluator,
      questionsCandidate,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, error });
  }
};

exports.getAll = function (req, res) {
  SurveyTemplate.getAll({}, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.getBycompany = async function (req, res) {
  const { company } = req.params;
  try {
    const surveys = await SurveyTemplate.find({
      company: company,
    })
      .sort({ createdAt: -1 })
      .exec();
    return res.json(surveys);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, error });
  }
};

exports.update = async function (req, res) {
  try {
    req.body.survey.customLink = Buffer.from(req.params.id).toString("base64");
    const template = await SurveyTemplate.findOneAndUpdate(
      { _id: req.params.id },
      { $set: req.body.survey },
      { new: true }
    ).exec();
    let { newQuestions, updatedQuestions } = await validateQuestions({
      questions: req.body.questions,
    });
    await onCreateQuestions({
      questions: newQuestions,
      survey: template,
    });
    await onUpdatedQuestions({ questions: updatedQuestions });
    let questionsCandidate = await Question.find({
      $and: [
        {
          $or: [
            ({ surveyTemplate: template._id },
            { cluster: { $in: template.clusters } }),
          ],
        },
        {
          publishTo: "Candidate",
        },
      ],
    })
      .sort({ viewPosition: 1 })
      .exec();
    let questionsEvaluator = await Question.find({
      $and: [
        {
          $or: [
            ({ surveyTemplate: template._id },
            { cluster: { $in: template.clusters } }),
          ],
        },
        {
          publishTo: "Evaluator",
        },
      ],
    })
      .sort({ viewPosition: 1 })
      .exec();
    return res.status(200).json({
      success: true,
      msg: "Survey updated successfully",
      survey: template,
      questionsEvaluator,
      questionsCandidate,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: e });
  }
};

exports.delete = function (req, res) {
  SurveyTemplate.removeById({ _id: req.params.id }, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

async function validateQuestions({ questions }) {
  return new Promise((resolve) => {
    let newQuestions = questions.filter((q) => !q._id);
    let updatedQuestions = questions.filter((q) => q._id);
    resolve({ newQuestions, updatedQuestions });
  });
}

function onCreateQuestions({ questions, survey }) {
  return new Promise(async (resolve) => {
    let newQuestions = JSON.parse(JSON.stringify(questions));
    for (let question of newQuestions) {
      question.company = survey.company;
      question.surveyTemplate = survey._id;
    }
    let newQuestionsDB = await Question.insertMany(newQuestions);
    resolve({ newQuestionsDB });
  });
}

function onUpdatedQuestions({ questions }) {
  return new Promise(async (resolve) => {
    let newQuestions = JSON.parse(JSON.stringify(questions));
    let bulkUpdated = [];
    for (let question of newQuestions) {
      let x = {
        updateOne: {
          filter: { _id: question._id },
          update: { $set: question },
        },
      };
      bulkUpdated.push(x);
    }
    let newQuestionsDB = await Question.bulkWrite(bulkUpdated);
    resolve({ newQuestionsDB });
  });
}
