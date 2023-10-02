"use strict";
const Question = require("../models/question_model");
const SurveyTemplate = require("../models/survey_template_model");

exports.create = function (req, res) {
  Question.create(req.body, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.get = function (req, res) {
  Question.get({ _id: req.params.id }, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.getByEmail = function (req, res) {
  Question.get({ email: req.params.email }, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.getAll = function (req, res) {
  Question.getAll({}, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.getSurveyEncode = async function (req, res) {
  let decodeSurvey = Buffer.from(req.params.id, "base64").toString();
  try {
    let surveyTemplate = await SurveyTemplate.findOne({
      _id: decodeSurvey,
    })
      .populate("company")
      .exec();
    let questions = await Question.find({
      $and: [
        {
          $or: [
            { surveyTemplate: decodeSurvey },
            {
              $and: [
                { cluster: { $exists: true } },
                { cluster: { $in: surveyTemplate.clusters } },
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
    return res.status(200).json({ questions, surveyTemplate });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error });
  }
};

exports.update = function (req, res) {
  Question.updateById(req.params.id, req.body, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      return res.send(err); // 500 error
    }
  });
};

exports.delete = function (req, res) {
  Question.removeById({ _id: req.params.id }, function (err, result) {
    if (!err) {
      return res.json(result);
    } else {
      console.error(err);
      return res.send(err); // 500 error
    }
  });
};
