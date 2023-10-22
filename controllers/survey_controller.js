"use strict";
require("dotenv").config();
const Survey = require("../models/survey_model");
const SurveyTemplate = require("../models/survey_template_model");
const User = require("../models/user_model");
const Response = require("../models/response_model");
const Reference = require("../models/reference_model");
const Question = require("../models/question_model");
const SES = require("../controllers/ses_controller");
const UserHelper = require("../helpers/user_helper");
const ReportHelper = require("../helpers/report_generator");
const moment = require("moment");
const { ObjectId } = require("mongodb");
const CloudApiController = require("../controllers/cloud_api_controller");
const template_track_evaluator = process.env.TEMPLATE_TRACK_EVALUATOR;
const template_evaluator = process.env.TEMPLATE_EVALUATOR;

/**
 * Function to register references check
 * - Create or updated each evaluator and candidate
 * - send emails for each evaluator
 * - 2. Second step of flow, send link to candidate to follow up the progress of his survey
 * - Calls evaluatorsTemplate function that implement the third step of the flow
 */
exports.registerReferenceCheck = async function (req, res) {
	try {
		let userTemplate = await UserHelper.createUserTemplate({
			user: req.body.user,
			roles: ["Candidate"],
			companiesApplied: [req.body.company],
			subType: "Reference Check",
		});
		// User validation
		let { success, error, user } = await UserHelper.userCreateOrUpdated({
			user: userTemplate,
		});
		// Condition to return if exist error
		if (!success) return res.status(400).json({ success: false, error });
		// Template of survey
		let surveyDraft = {
			surveyTemplate: req.body.surveyTemplate,
			company: req.body.company,
			postion: req.body.position,
			candidate: user._id,
		};
		// Create survey
		let survey = new Survey(surveyDraft);
		await survey.save();
		//Responses template
		let responsesTemplate = await formatResponses({
			responses: req.body.responses,
			survey: survey,
			user: user,
			type: "Candidate",
		});
		//Insert responses in DB
		await Response.insertMany(responsesTemplate);

		// Send emails to candidate - Emails flow
		let encodeEmail = Buffer.from(user.email).toString("base64");
		let encodeId = Buffer.from(survey._id).toString("base64");
		let customlink = `www.camila.build/survey?survey=${encodeId}&candidate=${encodeEmail}`;

		// Email to candidate to get information about the filling from his references
		// let msg = {
		// 	Destination: {
		// 		ToAddresses: [user.email],
		// 	},
		// 	ReplyToAddresses: ["team@camila.build"],
		// 	Source: "team@camila.build",
		// 	Template:
		// 		req.body.surveyTemplate == "6294c4db037b2c370f2b5198"
		// 			? "EmailCandidatePivot"
		// 			: "Email_for_canidate_after_applying",
		// 	TemplateData: JSON.stringify({
		// 		candidateName: `${user.firstName} ${user.lastName}`,
		// 		candidateFirstName: user.firstName,
		// 		linkReference: customlink,
		// 	}),
		// };

		// Send WhatsApp to candidate to track
		CloudApiController.sendMessageWithLinkCandidateEvaluator({
			fullNameCandidate: `${user.firstName} ${user.lastName}`,
			phoneNumberCandidate: user.phoneNumber,
			customUrl: customlink,
			templateNameFacebook: template_track_evaluator,
		});

		// Send Email message
		// SES.sendTemplateEmail(msg);

		// Calls the function evaluatorsTemplate to implement the third step of the flow
		// Evaluator template
		let { references } = await UserHelper.evaluatorsTemplate({
			evaluatorsArray: req.body.evaluators,
			candidate: user,
			surveyEncodeId: encodeId,
			surveyTemplate: req.body.surveyTemplate,
			company: req.body.company,
		});
		let surveyUpdated = await Survey.findOneAndUpdate(
			{ _id: survey._id },
			{ $set: { references } },
			{ new: true }
		).exec();
		return res.status(200).json({
			success: true,
			surveyUpdated,
			trackReferenceLink: customlink,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, error });
	}
};

exports.getSurveyByCandidateEmailAndId = async function (req, res) {
	try {
		let decodeSurvey = Buffer.from(req.params.id, "base64").toString();
		let decodeEmail = Buffer.from(req.params.email, "base64").toString();
		let candidate = await User.findOne({ email: decodeEmail }).exec();
		if (candidate == null)
			return res
				.status(400)
				.json({ success: false, error: { msg: "User not found." } });
		let survey = await Survey.findOne({
			candidate: candidate._id,
			_id: decodeSurvey,
		})
			.populate("candidate")
			.populate({
				path: "references",
				populate: { path: "evaluator" },
			})
			.exec();
		let responses = await Response.find({
			survey: survey._id,
			type: "Candidate",
		})
			.populate("question")
			.exec();
		let responsesEvaluators = await Response.find({
			survey: survey._id,
			type: "Evaluator",
		})
			.populate("question")
			.exec();
		let evaluators = await assignResponsesForEachEvaluator({
			evaluators: JSON.parse(JSON.stringify(survey.references)),
			responses: JSON.parse(JSON.stringify(responsesEvaluators)),
		});
		// sort questions for candidate and evaluator
		responses.sort(function (a, b) {
			return a.question.viewPosition - b.question.viewPosition;
		});
		evaluators.forEach((value) => {
			value?.responses?.sort(function (a, b) {
				return a.question.viewPosition - b.question.viewPosition;
			});
		});
		return res.status(200).json({
			success: true,
			survey,
			candidate,
			evaluators,
			responses,
		});
	} catch (error) {
		console.error(error);
		return res.status(400).json({ success: false, error });
	}
};

/**
 * Function to register the response of evalutors
 */
exports.registerEvaluatorResponse = async function (req, res) {
	// User template
	let decodeSurvey = Buffer.from(req.body.survey, "base64").toString();
	let decodeEmail = Buffer.from(req.body.evaluatorEmail, "base64").toString();
	try {
		// Get survey
		let survey = await Survey.aggregateOne([
			// Join references
			{
				$lookup: {
					from: "references",
					localField: "references",
					foreignField: "_id",
					pipeline: [
						//Join evaluator
						{
							$lookup: {
								from: "users",
								localField: "evaluator",
								foreignField: "_id",
								as: "evaluator",
							},
						},
						{
							$unwind: "$evaluator",
						},
						{
							$match: {
								"evaluator.email": decodeEmail.trim(),
							},
						},
					],
					as: "references",
				},
			},
			// Filter by survey id and evaluator email
			{
				$match: {
					_id: ObjectId(decodeSurvey),
					references: {
						$elemMatch: { "evaluator.email": decodeEmail.trim() },
					},
				},
			},
		]);
		// Get evaluator
		let evaluator = await User.findOne({ email: decodeEmail.trim() }).exec();
		// Create draft of responses
		let responsesTemplate = await formatResponses({
			responses: req.body.responses,
			survey: survey,
			user: evaluator,
			type: "Evaluator",
		});
		await Reference.findOneAndUpdate(
			{ _id: survey.references[0]._id },
			{ $set: { status: "Completed", responseDate: Date.now() } },
			{ new: true }
		).exec();
		Response.insertMany(responsesTemplate);
		//TODO NEW EMAIL, THANKS FOR RESPONSE
		return res
			.status(201)
			.json({ success: true, msg: "Survey register successfully" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, error });
	}
};

/**
 * Function to register the response of evalutors V2
 */
exports.createResponseEvaluator = async function (req, res) {
	// User template
	const { evaluator } = req.body;
	let decodeSurvey = Buffer.from(req.body.survey, "base64").toString();
	let decodeEmail = Buffer.from(req.body.evaluatorEmail, "base64").toString();
	try {
		// Get survey
		let survey = await Survey.aggregateOne([
			// Join references
			{
				$lookup: {
					from: "references",
					localField: "references",
					foreignField: "_id",
					pipeline: [
						//Join evaluator
						{
							$lookup: {
								from: "users",
								localField: "evaluator",
								foreignField: "_id",
								as: "evaluator",
							},
						},
						{
							$unwind: "$evaluator",
						},
						{
							$match: {
								"evaluator.email": decodeEmail.trim(),
							},
						},
					],
					as: "references",
				},
			},
			// Filter by survey id and evaluator email
			{
				$match: {
					_id: ObjectId(decodeSurvey),
					references: {
						$elemMatch: { "evaluator.email": decodeEmail.trim() },
					},
				},
			},
		]);
		// Get evaluator
		let evaluatorDB = await User.findOne({ email: decodeEmail.trim() }).exec();
		// Create draft of responses
		let responsesTemplate = await formatResponses({
			responses: req.body.responses,
			survey: survey,
			user: evaluatorDB,
			type: "Evaluator",
		});
		await User.findOneAndUpdate(
			{ _id: evaluatorDB._id },
			{ $set: evaluator },
			{ new: true }
		).exec();
		await Reference.findOneAndUpdate(
			{ _id: survey.references[0]._id },
			{ $set: { status: "Completed", responseDate: Date.now() } },
			{ new: true }
		).exec();
		Response.insertMany(responsesTemplate);
		//TODO NEW EMAIL, THANKS FOR RESPONSE
		return res
			.status(201)
			.json({ success: true, msg: "Survey register successfully" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, error });
	}
};

/**
 * Function to get question of evalutors
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getSurveyEvaluatorEncode = async function (req, res) {
	try {
		//Decode survey ID
		let decodeSurvey = Buffer.from(req.params.id, "base64").toString();

		//Decode evaluator email
		let decodeEvaluator = Buffer.from(
			req.params.evaluator,
			"base64"
		).toString();

		//
		let survey = await Survey.aggregateOne([
			// Join references
			{
				$lookup: {
					from: "references",
					localField: "references",
					foreignField: "_id",
					pipeline: [
						//Join evaluator
						{
							$lookup: {
								from: "users",
								localField: "evaluator",
								foreignField: "_id",
								as: "evaluator",
							},
						},
						{
							$unwind: "$evaluator",
						},
					],
					as: "references",
				},
			},
			// Filter by survey id and evaluator email
			{
				$match: {
					_id: ObjectId(decodeSurvey),
					references: {
						$elemMatch: { "evaluator.email": decodeEvaluator.trim() },
					},
				},
			},
		]);

		const surveyTemplate = await SurveyTemplate.findOne({
			_id: survey.surveyTemplate,
		})
			.populate("company")
			.exec();

		//Verify if the survey exist
		if (survey == null)
			return res
				.status(400)
				.json({ success: false, msg: "The survey does not exist" });

		// Get reference/evaluator info
		let referenceInfo = survey.references.find(
			(r) => r.evaluator.email == decodeEvaluator.trim()
		);

		//Get question to evaluator
		let questions = await Question.find({
			$and: [
				{
					$or: [
						{ surveyTemplate: surveyTemplate._id },
						{
							$and: [
								{ cluster: { $exists: true } },
								{ cluster: { $in: surveyTemplate.clusters } },
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
		let evaluatorInfo = {
			firstName: referenceInfo.evaluator.firstName,
			lastName: referenceInfo.evaluator.lastName,
			countryCode: referenceInfo.evaluator.phoneNumber.trim().split(/\s+/)[0],
			phoneNumber: referenceInfo.evaluator.phoneNumber,
			viewPhoneNumber: referenceInfo.evaluator.phoneNumber
				.trim()
				.split(/\s+/)[1],
			email: referenceInfo.evaluator.email,
			emailValidation: true,
			numberValidation: true,
			linkedin: referenceInfo.evaluator.linkedin,
			evaluatorId: referenceInfo.evaluator._id,
			referenceId: referenceInfo._id,
		};
		//Response 200 SUCCESS
		return res.status(200).json({
			success: true,
			survey,
			questions,
			surveyTemplate,
			evaluator: evaluatorInfo,
		});
	} catch (error) {
		//ERROR
		console.error(error);
		//Default error 400
		return res.status(400).json({ success: false, error });
	}
};

/**
 * Function to get tracking of references
 */
exports.getSurveyCandidateEncode = async function (req, res) {
	//Decode string
	try {
		let decodeSurvey = Buffer.from(req.params.id, "base64").toString();
		let decodeCandidate = Buffer.from(
			req.params.candidate,
			"base64"
		).toString();
		let candidate = await User.findOne({
			email: decodeCandidate,
		}).exec();
		let survey = await Survey.findOne({
			$and: [
				{ _id: decodeSurvey.trim() },
				{
					candidate: candidate._id,
				},
			],
		})
			.populate({
				path: "references",
				populate: { path: "evaluator" },
			})
			.exec();
		let responses = await Response.find({
			survey: survey._id,
			user: candidate._id,
		})
			.sort({ viewPosition: 1 })
			.exec();
		return res.status(200).json({
			success: true,
			survey,
			responses,
		});
	} catch (error) {
		console.error(error);
		return res.status(400).json({ success: false, error });
	}
};

exports.getReferencesTracking = async function (req, res) {
	//Decode string
	try {
		const decodeSurvey = Buffer.from(req.params.id, "base64").toString();
		const decodeCandidate = Buffer.from(
			req.params.candidate,
			"base64"
		).toString();
		const candidate = await User.findOne({
			email: decodeCandidate,
		}).exec();
		const survey = await Survey.findOne({
			$and: [
				{ _id: decodeSurvey.trim() },
				{
					candidate: candidate._id,
				},
			],
		})
			.populate({
				path: "surveyTemplate",
				populate: { path: "company" },
			})
			.populate({
				path: "references",
				populate: { path: "evaluator" },
			})
			.exec();
		return res.status(200).json({
			success: true,
			surveyTemplate: survey.surveyTemplate,
			references: survey.references,
		});
	} catch (error) {
		console.error(error);
		return res.status(400).json({ success: false, error });
	}
};

exports.addEvaluatorsSurvey = async function (req, res) {
	try {
		//Decode string
		let decodedString = Buffer.from(req.params.idSurvey, "base64").toString();
		let survey = await Survey.findOne({ _id: decodedString })
			.populate("candidate surveyTemplate")
			.exec();
		// Evaluator template
		// Sending the durvey id as a parameter
		let { evaluators, evaluatorsStatus } = await evaluatorsTemplate({
			evaluatorsArray: req.body.evaluators,
			candidate: survey.candidate,
			survey,
			surveyEncodeId: req.params.idSurvey,
			company: survey.company,
		});
		let surveyUpdated = await Survey.findOneAndUpdate(
			{ _id: decodedString.trim() },
			{ $set: { evaluators, evaluatorsStatus } },
			{ new: true }
		).exec();
		return res.status(200).json({
			success: true,
			surveyUpdated,
		});
	} catch (error) {
		console.error(error);
		return res.status(400).json({ success: false, error });
	}
};

/**
 * Function to send reminder to pending references
 * - Get pending evaluators for each survey
 * - Send email
 * !only of the pending references of the last 7 days
 */
exports.sendRemindersToPendingReferences = async function () {
	try {
		console.info("Running");
		let initialDate = moment().subtract(7, "d");
		let finalDate = moment();
		// Query to get references pending to answer
		let surveys = await Survey.aggregate([
			// Join references
			{
				$lookup: {
					from: "references",
					localField: "references",
					foreignField: "_id",
					pipeline: [
						//Join evaluator
						{
							$lookup: {
								from: "users",
								localField: "evaluator",
								foreignField: "_id",
								as: "evaluator",
							},
						},
						{
							$unwind: "$evaluator",
						},
						// Remove answered references
						{
							$match: {
								status: "Pending",
							},
						},
					],
					as: "references",
				},
			},
			// Join Users to get candidate
			{
				$lookup: {
					from: "users",
					localField: "candidate",
					foreignField: "_id",
					as: "candidate",
				},
			},
			{
				$unwind: "$candidate",
			},
			// Join to get survey template
			{
				$lookup: {
					from: "surveytemplates",
					localField: "surveyTemplate",
					foreignField: "_id",
					as: "surveyTemplate",
				},
			},
			{
				$unwind: "$surveyTemplate",
			},
			{
				$match: {
					references: { $elemMatch: { status: "Pending" } },
					createdAt: { $gte: new Date(initialDate), $lt: new Date(finalDate) },
				},
			},
		]);
		for (let survey of surveys) {
			let encodeId = Buffer.from(survey._id).toString("base64");
			for (let reference of survey.references) {
				let encodeEmail = Buffer.from(reference.evaluator.email).toString(
					"base64"
				);
				let customlink = `www.camila.build/survey?survey=${encodeId}&evaluator=${encodeEmail}`;
				let msg = {
					Destination: {
						ToAddresses: [reference.evaluator.email],
					},
					ReplyToAddresses: ["team@camila.build"],
					Source: "team@camila.build",
					Template: "Email_for_references_to_evaluate",
					TemplateData: JSON.stringify({
						candidateName: `${survey.candidate.firstName} ${survey.candidate.lastName}`,
						referenceName: reference.evaluator.firstName,
						linkReference: customlink,
					}),
				};
				await SES.sendTemplateEmail(msg);
				CloudApiController.sendMessageWithLinkCandidateEvaluator({
					fullNameCandidate: `${survey.candidate.firstName} ${survey.candidate.lastName}`,
					fullNameEvaluator: `${reference.evaluator.firstName} ${reference.evaluator.lastName}`,
					phoneNumberCandidate: survey.candidate.phoneNumber,
					phoneNumberEvaluator: reference.evaluator.phoneNumber,
					customUrl: customlink,
					templateNameFacebook: template_evaluator,
				});
			}
		}
	} catch (error) {
		console.error(error);
	}
};

exports.sendOneReminder = async (req, res) => {
	//survey de la referencia
	try {
		const { reference_id } = req.body;
		const reference = await Reference.findOne({ _id: reference_id })
			.populate("evaluator")
			.exec();
		const survey = await Survey.findOne({ references: { $in: reference_id } })
			.populate("candidate surveyTemplate")
			.exec();
		let encodeId = Buffer.from(survey._id).toString("base64");
		// let reference = survey.references.find((r) => r._id == reference_id);
		let encodeEmail = Buffer.from(reference.evaluator.email).toString("base64");
		let customlink = `www.camila.build/survey?survey=${encodeId}&evaluator=${encodeEmail}`;
		let msg = {
			Destination: {
				ToAddresses: [reference.evaluator.email],
			},
			ReplyToAddresses: ["team@camila.build"],
			Source: "team@camila.build",
			Template: "Email_for_references_to_evaluate",
			TemplateData: JSON.stringify({
				candidateName: `${survey.candidate.firstName} ${survey.candidate.lastName}`,
				referenceName: reference.evaluator.firstName,
				linkReference: customlink,
			}),
		};
		await SES.sendTemplateEmail(msg);
		CloudApiController.sendMessageWithLinkCandidateEvaluator({
			fullNameCandidate: `${survey.candidate.firstName} ${survey.candidate.lastName}`,
			fullNameEvaluator: `${reference.evaluator.firstName} ${reference.evaluator.lastName}`,
			phoneNumberCandidate: survey.candidate.phoneNumber,
			phoneNumberEvaluator: reference.evaluator.phoneNumber,
			customUrl: customlink,
			templateNameFacebook: template_evaluator,
		});
		return res.status(200).json({ success: true });
	} catch (error) {
		return res.status(400).json({ success: false, error });
	}
};

exports.getBycompany = async function (req, res) {
	try {
		let surveys = await Survey.find({ company: req.params.company })
			.populate("surveyTemplate candidate")
			.sort({ createdAt: -1 })
			.exec();
		let formatSurveys = await formatSurvey(surveys);
		return res.status(200).json({
			success: true,
			surveys: formatSurveys,
		});
	} catch (error) {
		return res.status(400).json({ success: false, error });
	}
};

/**
 * Function to get detail of survey
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getSurveyDetail = async function (req, res) {
	try {
		let survey = await Survey.findOne({ _id: req.params.id })
			.populate("candidate surveyTemplate")
			.populate({
				path: "references",
				populate: { path: "evaluator" },
			})
			.exec();
		let responses = await Response.find({
			survey: req.params.id,
			type: "Candidate",
		})
			.populate("question")
			.exec();
		let responsesEvaluators = await Response.find({
			survey: req.params.id,
			type: "Evaluator",
		})
			.populate("question")
			.exec();
		let evaluators = await assignResponsesForEachEvaluator({
			evaluators: survey.references,
			responses: responsesEvaluators,
		});
		return res.status(200).json({
			success: true,
			survey,
			evaluators,
			responses,
		});
	} catch (error) {
		return res.status(400).json({ success: false, error });
	}
};

/**
 * Function to get detail of survey
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getReportInformation = async function (req, res) {
	try {
		//
		const surveyId = req.params.id;
		//Get survey information
		let survey = await Survey.findOne({ _id: surveyId })
			.populate("candidate surveyTemplate")
			.populate({
				path: "references",
				populate: { path: "evaluator" },
			})
			.exec();
		//Candidate and references information
		const { candidate, references } = survey;
		// responses of candidate
		let candidateResponses = await Response.find({
			survey: surveyId,
			type: "Candidate",
		})
			.populate("user")
			.exec();

		let responsesEvaluators = await Response.find({
			survey: surveyId,
			type: "Evaluator",
		})
			.populate("user")
			.exec();

		let topQuestion = await ReportHelper.assignTopQuestion({
			candidateResponse: candidateResponses,
			referencesResponse: responsesEvaluators,
		});
		let buildTeam = await ReportHelper.buildTeam({
			candidateResponse: candidateResponses,
		});
		let { firstSoftSkils, secondSoftSkils } = await ReportHelper.softSkills({
			candidateResponse: candidateResponses,
			referencesResponse: responsesEvaluators,
		});
		let thirdSoftSkils = await ReportHelper.softSkillsTwo({
			candidateResponse: candidateResponses,
			referencesResponse: responsesEvaluators,
		});
		let experienceAndWorkAgain = await ReportHelper.experienceAndWorkAgain({
			referencesResponse: responsesEvaluators,
		});
		let investInThem = await ReportHelper.investInThem({
			referencesResponse: responsesEvaluators,
		});
		let evaluators = await assignResponsesForEachEvaluator({
			evaluators: survey.references,
			responses: responsesEvaluators,
		});

		return res.status(200).json({
			success: true,
			survey,
			evaluators,
			candidateResponses,
			candidate,
			references,
			formatResponses: {
				topQuestion,
				experienceAndWorkAgain,
				firstSoftSkils,
				secondSoftSkils,
				thirdSoftSkils,
				buildTeam,
				investInThem,
			},
		});
	} catch (error) {
		return res.status(400).json({ success: false, error });
	}
};

exports.getTemplateResponses = async function (req, res) {
	try {
		let survey_template = await SurveyTemplate.findOne({
			_id: req.params.template,
		});
		let responses = await Survey.find({ surveyTemplate: req.params.template })
			.populate("candidate references")
			.exec();
		let validateResponse = await getCompletedResponses({
			responses: JSON.parse(JSON.stringify(responses)),
		});
		return res.status(200).json({
			success: true,
			responses: validateResponse,
			survey_template,
		});
	} catch (error) {
		return res.status(400).json({ success: false, error });
	}
};

// * Helper funtions
const formatResponses = async ({ responses, survey, user, type }) => {
	return new Promise((resolve) => {
		let responsesTemplate = [];
		for (let response of responses) {
			let draft = {
				question: response._id,
				result: response.response,
				user: user._id,
				survey: survey._id,
				type: type,
			};
			responsesTemplate.push(draft);
		}
		resolve(responsesTemplate);
	});
};

function assignResponsesForEachEvaluator({ evaluators, responses }) {
	return new Promise((resolve) => {
		let evaluatorsWithResponses = JSON.parse(JSON.stringify(evaluators));
		for (let i in evaluatorsWithResponses) {
			evaluatorsWithResponses[i].responses = responses.filter(
				(r) => r.user == evaluatorsWithResponses[i].evaluator._id
			);
			evaluatorsWithResponses[i].firstName =
				evaluatorsWithResponses[i].evaluator.firstName;
			evaluatorsWithResponses[i].lastName =
				evaluatorsWithResponses[i].evaluator.lastName;
			evaluatorsWithResponses[i].email =
				evaluatorsWithResponses[i].evaluator.email;
			evaluatorsWithResponses[i].phoneNumber =
				evaluatorsWithResponses[i].evaluator.phoneNumber;
			evaluatorsWithResponses[i].linkedin =
				evaluatorsWithResponses[i].evaluator.linkedin;
		}
		resolve(evaluatorsWithResponses);
	});
}

function formatSurvey(array) {
	return new Promise((resolve) => {
		let formatArray = [];
		array.forEach((survey) => {
			let newFormat = JSON.parse(JSON.stringify(survey));
			newFormat.email = survey.candidate.email;
			newFormat.firstName = survey.candidate.firstName;
			newFormat.lastName = survey.candidate.lastName;
			newFormat.linkedin = survey.candidate.linkedin;
			newFormat.phoneNumber = survey.candidate.phoneNumber;
			newFormat.position = survey.candidate.position;
			formatArray.push(newFormat);
		});
		resolve(formatArray);
	});
}

function getCompletedResponses({ responses }) {
	return new Promise((resolve) => {
		for (let i = 0; i < responses.length; i++) {
			responses[i]["totalReferences"] = responses[i]["references"].length;
			responses[i]["totalCompleted"] = responses[i]["references"].filter(
				(r) => r.status == "Completed"
			).length;
		}
		resolve(responses);
	});
}
