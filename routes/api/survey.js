const SurveyController = require("../../controllers/survey_controller");

module.exports = function (router) {
	// Register survey response of candidate and alse created the references
	router.post(
		"/survey/register-references-check",
		SurveyController.registerReferenceCheck
	);

	// Register survey response of candidate and alse created the references
	router.post("/survey/send-one-reminder", SurveyController.sendOneReminder);

	// Get detail of survey
	router.get("/survey/detail/:id", SurveyController.getSurveyDetail);

	// Get report information
	router.get(
		"/survey/report/survey/:id",
		SurveyController.getReportInformation
	);

	// Get all reponses of survey template
	router.get(
		"/survey/template/:template",
		SurveyController.getTemplateResponses
	);
	// Get tracking of references by candidate
	router.get(
		"/survey/encode/survey/:id/candidate/:candidate",
		SurveyController.getSurveyCandidateEncode
	);
	// Get tracking of references by candidate V2
	router.get(
		"/survey/encode/survey/:id/candidate-v2/:candidate",
		SurveyController.getReferencesTracking
	);
	//Function to get question of evalutors
	router.get(
		"/survey/encode/survey/:id/evaluator/:evaluator",
		SurveyController.getSurveyEvaluatorEncode
	);
	// Register response of evaluator
	router.post(
		"/survey/register-evaluator",
		SurveyController.registerEvaluatorResponse
	);

	// Register response of evaluator V2
	router.post(
		"/survey/register-evaluator-v2",
		SurveyController.createResponseEvaluator
	);
	router.get("/survey/company/:company", SurveyController.getBycompany);
	// Get recomendation page
	router.get(
		"/survey/:id/candidate-email/:email",
		SurveyController.getSurveyByCandidateEmailAndId
	);
};
