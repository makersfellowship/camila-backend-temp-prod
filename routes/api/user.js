const UserController = require("../../controllers/user_controller");

module.exports = function (router) {
  // Bulk references
  router.post(
    "/user/bulk_references",
    UserController.bulkCreateOrUpdateReferencesCheck
  );
  // get all user in the company
  router.get("/user/company/:company", UserController.getBycompany);
  //Register administrator in a company
  router.post(
    "/user/register-administrator",
    UserController.createAdministrator
  );
  // Auth method of administrator
  router.post(
    "/user/administrator/authentication",
    UserController.administratorAuthentication
  );
  //Get by email
  router.get("/user/email/:email", UserController.getByEmail);
  // Self-onboard
  router.post("/user/self-onboard", UserController.selfOnboard);
  //CRUD
  router.post("/user", UserController.create);
  router.get("/user", UserController.getAll);
  router.get("/user/:id", UserController.get);
  router.put("/user/:id", UserController.update);
  router.delete("/user/:id", UserController.delete);
};
