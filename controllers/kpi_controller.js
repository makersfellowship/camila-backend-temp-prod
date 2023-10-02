const Company = require("../models/company_model");
const User = require("../models/user_model");
const Survey = require("../models/survey_model");
const moment = require("moment");

const getCompaniesAmount = () => {
  return new Promise(async (resolve) => {
    let companiesAmount = await Company.find({}).count();
    resolve({ companiesAmount });
  });
};

const getUsersAmount = () => {
  return new Promise(async (resolve) => {
    let usersAmount = await User.find({}).count();
    let evaluatorsAmount = await User.find({}).count();
    let candidatessAmount = await User.find({}).count();
    resolve({ usersAmount, evaluatorsAmount, candidatessAmount });
  });
};

const getSurveysAmount = () => {
  return new Promise(async (resolve) => {
    let surveysAmount = await Survey.find({}).count();
    resolve({ surveysAmount });
  });
};

//TODO fix response rate
const getResponseRateLastMonth = () => {
  return new Promise(async (resolve) => {
    let d = new Date();
    var from = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    var to = new Date(d.getFullYear(), d.getMonth(), 0);
    let pendingSurveys = await Survey.aggregate([
      // Join references
      {
        $lookup: {
          from: "references",
          localField: "references",
          foreignField: "_id",
          as: "references",
        },
      },
      {
        $match: {
          references: { $elemMatch: { status: "Pending" } },
          createdAt: { $gte: from, $lt: to },
        },
      },
    ]);
    let notResponseSurveys = pendingSurveys.length;
    let allsurveys = await Survey.find({
      createdAt: { $gte: from, $lt: to },
    }).count();
    let responseSurvey = allsurveys - notResponseSurveys;
    let responseRate = ((responseSurvey / allsurveys) * 100).toFixed(2);
    resolve({
      responseRate,
      allsurveys,
      responseSurvey,
      from: moment(from).format("MMM DD, YYYY"),
      to: moment(to).format("MMM DD, YYYY"),
    });
  });
};

const getKpis = async (req, res) => {
  try {
    let { companiesAmount } = await getCompaniesAmount();
    let { usersAmount } = await getUsersAmount();
    let { surveysAmount } = await getSurveysAmount();
    let { responseRate, allsurveys, responseSurvey, from, to } =
      await getResponseRateLastMonth();
    let response = {
      companiesAmount,
      usersAmount,
      surveysAmount,
      responseRate,
      allsurveys,
      responseSurvey,
      from,
      to,
    };
    return res.status(200).json({ success: true, response });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, error });
  }
};
module.exports = { getKpis };
