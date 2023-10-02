const ClusterController = require("../../controllers/cluster_controller");

module.exports = function (router) {
  // CRUD
  router.post("/cluster", ClusterController.create);
  router.get("/cluster", ClusterController.getAll);
  router.get("/cluster/public", ClusterController.getPublic);
  router.get("/cluster/:id", ClusterController.get);
  router.get(
    "/cluster/query-questions/:id",
    ClusterController.getClusterQuestions
  );
  router.put("/cluster/:id", ClusterController.update);
  router.delete("/cluster/:id", ClusterController.delete);
};
