const AWS = require("aws-sdk");
// const ses = new AWS.SES({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

//TODO create ENV
const ses = new AWS.SES({
  accessKeyId: "AKIASSOI4T2AN5XDUEOQ",
  secretAccessKey: "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",
  region: "us-east-1",
});

// AWS template
const sendTemplateEmail = (params) => {
  return ses.sendTemplatedEmail(params).promise();
};

module.exports = { sendTemplateEmail };
