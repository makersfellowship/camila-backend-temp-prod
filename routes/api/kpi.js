const { getKpis } = require("../../controllers/kpi_controller");

module.exports = function (router) {
  router.get("/kpi", getKpis);
};
