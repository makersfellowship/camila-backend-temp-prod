const ReferenceController = require("../../controllers/reference_controller");

module.exports = function (router) {
  // CRUD
  router.post("/reference", ReferenceController.create);
  router.post(
    "/reference/confirm-information",
    ReferenceController.confirmReferenceInformation
  );
  router.get("/reference", ReferenceController.getAll);
  router.get("/reference/:id", ReferenceController.get);
  router.put("/reference/:id", ReferenceController.update);
  router.delete("/reference/:id", ReferenceController.delete);
};
