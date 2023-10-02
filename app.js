require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const cron = require("node-cron");
const passport = require("passport");
const mongoose = require("mongoose");
const config = require("./config/database");
var sessions = require("express-session");
// Connect to database
mongoose.connect(process.env.MONGOBD_CNN, { useUnifiedTopology: true });
// On db connection
mongoose.connection.on("connected", () => {
	console.info("Connected to database");
});

// On db error
mongoose.connection.on("error", (err) => {
	console.info("Database error: " + err);
});

const app = express();
const port = process.env.PORT || 8081;

// CORS Middleware
app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname, "/public")));

// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Passport Middleware
//TODO create security session
const oneDay = 1000 * 60 * 60 * 24;
app.use(
	sessions({
		secret: config["secret"],
		saveUninitialized: true,
		cookie: { maxAge: oneDay },
		resave: false,
	})
);

app.use(passport.initialize());
app.use(passport.session());
require("./config/passport")(passport);

// Use API routes
var router = express.Router();
app.use("/api", router);
app.use(function (req, res, next) {
	return res.status(404).send({ msg: "Server response: data not found" });
});

require("./routes/api/user")(router);
require("./routes/api/survey")(router);
require("./routes/api/response")(router);
require("./routes/api/question")(router);
require("./routes/api/company")(router);
require("./routes/api/lead")(router);
require("./routes/api/reference")(router);
require("./routes/api/cloud_api")(router);
require("./routes/api/survey_template")(router);
require("./routes/api/kpi")(router);
require("./routes/api/cluster")(router);

// Import other routes and paths
const users = require("./routes/users");
const email = require("./routes/email");
app.use("/users", users);
app.use("/email", email);

app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(port, () => {
	console.info("Server started on port " + port);
});

const Survey = require("./controllers/survey_controller");

cron.schedule("0 17 * * *", async () =>
	Survey.sendRemindersToPendingReferences()
);
