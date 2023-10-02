const ResponseController = require("../../controllers/response_controller");

module.exports = function (router) {
  // CRUD
  router.post("/response", ResponseController.create);
  router.get("/response", ResponseController.getAll);
  router.get("/response/:id", ResponseController.get);
  router.put("/response/:id", ResponseController.update);
  router.delete("/response/:id", ResponseController.delete);
};
