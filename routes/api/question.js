const QuestionController = require("../../controllers/question_controller");

module.exports = function (router) {
  // CRUD
  router.post("/question", QuestionController.create);
  router.get("/question", QuestionController.getAll);
  // Endpoint to get questions by survey
  router.get(
    "/question/survey-template/encode/:id",
    QuestionController.getSurveyEncode
  );
  router.get("/question/:id", QuestionController.get);
  router.put("/question/:id", QuestionController.update);
  router.delete("/question/:id", QuestionController.delete);
};
