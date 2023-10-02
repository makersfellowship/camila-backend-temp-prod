const sendgrid = require("@sendgrid/mail");
const sendGridCredentials = require("../config/sendgrid");
sendgrid.setApiKey(sendGridCredentials.apiKey);

exports.sendEmailHTML = ({ emailTo, fromName, subject, html }) => {
  const templateEmail = {
    to: emailTo,
    from: {
      email: "team@camila.build", //TODO change burn email
      name: fromName,
    },
    subject: subject,
    html: html,
  };
  // TODO Manage error
  sendgrid
    .send(templateEmail)
    .then(response)
    .catch((error) => console.error(error));
};

exports.sendEmailWithTemplate = ({
  to,
  from,
  dynamicTemplateData,
  templateId,
}) => {
  const templateEmail = {
    to,
    from: {
      email: from,
      name: "Team Camila",
    },
    // subject:subject,
    dynamicTemplateData,
    templateId,
  };
  // TODO Manage error
  sendgrid
    .send(templateEmail)
    .then((response) => {})
    .catch((error) => console.error(error.response.body));
};
