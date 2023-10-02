const SurveyTemplateController = require("../../controllers/survey_template_controller");

module.exports = function (router) {
  // CRUD
  router.post("/survey-template", SurveyTemplateController.create);
  router.get("/survey-template", SurveyTemplateController.getAll);
  router.get(
    "/survey-template/company/:company",
    SurveyTemplateController.getBycompany
  );
  router.get("/survey-template/:id", SurveyTemplateController.get);
  router.put("/survey-template/:id", SurveyTemplateController.update);
  router.delete("/survey-template/:id", SurveyTemplateController.delete);
};
