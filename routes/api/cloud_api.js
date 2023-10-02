const {
  verifyWebhookToken,
  sendMessagesWebhook,
  sendMessageWithLink,
} = require('../../controllers/cloud_api_controller');

module.exports = function (router) {
  router.post('/cloud-api', sendMessagesWebhook);
  router.get('/cloud-api', verifyWebhookToken);
  router.post('/cloud-api/flow', sendMessageWithLink);
};
