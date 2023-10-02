const LeadController = require("../../controllers/lead_controller");

module.exports = function (router) {
  // CRUD
  router.post("/lead", LeadController.create);
  router.get("/lead", LeadController.getAll);
  router.get("/lead/:id", LeadController.get);
  router.put("/lead/:id", LeadController.update);
  router.delete("/lead/:id", LeadController.delete);
};
