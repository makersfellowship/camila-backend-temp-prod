const express = require("express");
const router = express.Router();

// router.post("/sendEmail", (req, res) => {
//   const msg = {
//     to: req.body.to,
//     from: "notifications@ejemplo.com",
//     subject: req.body.subject,
//     html: req.body.html,
//   };
//   const sendEmail = sendgrid.send(msg);
//   sendEmail
//     .then(function () {
//       res.json({ success: true, msg: "Email sent" });
//     })
//     .catch(function () {
//       res.json({ success: false, msg: "Error sending email" });
//     });
// });

module.exports = router;
