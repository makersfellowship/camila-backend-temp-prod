const CompanyController = require("../../controllers/company_controller");

module.exports = function (router) {
  // CRUD
  router.post("/company", CompanyController.create);
  router.post("/company/valid-or-create", CompanyController.validOrCreate);
  router.get("/company", CompanyController.getAll);
  router.get("/company/detail/:id", CompanyController.getDetail);
  router.get("/company/:id", CompanyController.get);
  router.put("/company/:id", CompanyController.update);
  router.delete("/company/:id", CompanyController.delete);
};
