"use strict";
require("dotenv").config();
const axios = require("axios").default;
const token = process.env.WHATSAPP_TOKEN;
const phone_number_id = process.env.PHONE_NUMBER_ID;
const template_send_survey_candidate =
	process.env.TEMPLATE_SEND_SURVEY_CANDIDATE;
const template_track_evaluator = process.env.TEMPLATE_TRACK_EVALUATOR;
const template_evaluator = process.env.TEMPLATE_EVALUATOR;
const CloudApi = require("../models/cloud_api_model");

const newAdministratorRegister = ({ fullName, phoneNumber }) => {
	return new promise(async (resolve) => {
		await createMessage({
			from: phone_number_id,
			to: phoneNumber,
			message: "Administrator is available",
		});
		axios({
			method: "POST",
			url: `https://graph.facebook.com/v12.0/${phone_number_id}/messages?access_token=${token}`,
			data: {
				messaging_product: "whatsapp",
				to: phoneNumber,
				type: "template",
				template: {
					name: "TEMPLATE_NAME", // Template: your user is available, do you want to ask some reference?
					language: { code: "LANGUAGE_AND_LOCALE_CODE" }, // Language Code
					components: [
						{
							type: "body",
							parameters: [{ type: "text", text: fullName }],
						},
						{
							type: "button",
							sub_type: "quick_reply",
							index: "0",
							parameters: [
								{
									type: "payload",
									payload: "Yes, I want to ask for some reference.",
								},
							],
						},
						{
							type: "button",
							sub_type: "quick_reply",
							index: "1",
							parameters: [
								{
									type: "payload",
									payload: "No, remind me later.",
								},
							],
						},
					],
				},
			},
			headers: { "Content-Type": "application/json" },
		});
		resolve({ success: true });
	});
};

const sendMessagesWebhook = async (req, res) => {
	if (!req.body.object) return res.sendStatus(404);
	if (
		!req.body.entry &&
		!req.body.entry[0].changes &&
		!req.body.entry[0].changes[0] &&
		!req.body.entry[0].changes[0].value.messages &&
		!req.body.entry[0].changes[0].value.messages[0]
	)
		return res.sendStatus(404);

	let phone_number_id =
		req.body.entry[0].changes[0].value.metadata.phone_number_id;
	let from = req.body.entry[0].changes[0].value.messages[0].from;
	let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body;

	// storage message
	await createMessage({
		from: phoneNumber,
		to: phone_number_id,
		message: msg_body,
	});

	axios({
		method: "POST",
		url: `https://graph.facebook.com/v12.0/${phone_number_id}/messages?access_token=${token}`,
		data: {
			messaging_product: "whatsapp",
			to: from,
			text: { body: "Ack: " + msg_body },
		},
		headers: { "Content-Type": "application/json" },
	});

	return res.sendStatus(200);
};

const createMessage = ({ from, to, message }) => {
	return new Promise(async (resolve) => {
		let draftLog = { from, to, message };
		let messageLog = new CloudApi(draftLog);
		await messageLog.save();
	});
};

const verifyFlow = ({ message, clientNumber, numberIdCamila }) => {
	return new Promise(async (resolve) => {
		let messages = await CloudApi.find({
			$or: [
				{ to: numberIdCamila, from: clientNumber },
				{ to: clientNumber, from: numberIdCamila },
			],
		})
			.sort({ createdAt: 1 })
			.limit(10)
			.exec();
		switch (message) {
			case "Yes, I want to ask for some reference.":
				await createAndSendMessage({
					from: phone_number_id,
					to: phoneNumber,
					message: "Please send us the candidate full name",
					phoneNumber: clientNumber,
				});
				break;
			case "Yes, I want to ask for one more reference.":
				// Sent info
				break;
			case "No, remind me later.":
				// Reminder in 12 hours
				break;

			default:
				// Verificar si se han enviado la info del usuario

				// Sent hola soy camila quieres hacer x referencias
				// o este numero no esta asociado a ninguna cuenta por favor consulta con suporte
				break;
		}
	});
};

const verifyIfIsUserInformation = async ({ messageLog }) => {
	let lastCamilaMessage = messageLog.find((m) => m.from == phone_number_id);
	if (lastCamilaMessage == "Please send us the candidate full name") {
	}
};

const createAndSendMessage = async ({ from, to, message, phoneNumber }) => {
	await createMessage({
		from,
		to,
		message,
	});
	await sendTextMessage({
		message,
		phoneNumber,
	});
};

const sendTextMessage = ({ message, phoneNumber }) => {
	return new Promise((resolve) => {
		axios({
			method: "POST",
			url: `https://graph.facebook.com/v12.0/${phone_number_id}/messages?access_token=${token}`,
			data: {
				messaging_product: "whatsapp",
				recipient_type: "individual",
				to: phoneNumber,
				type: "text",
				text: {
					// the text object
					preview_url: false,
					body: message,
				},
			},
			headers: { "Content-Type": "application/json" },
		});
		resolve({ success: true });
	});
};

const verifyWebhookToken = (req, res) => {
	const localToken = process.env.VERIFY_TOKEN;
	let { mode, verify_token, challenge } = req.query.hub;
	if (!mode && !verify_token) return res.sendStatus(403);
	if (mode === "subscribe" && verify_token === localToken)
		return res.status(200).send(challenge);
	else return res.sendStatus(403);
};

/**
 * Function sendMessageWithLinkCandidateEvaluator
 * Send messages taking the fullName, the phoneNumber, customUrl and templateName from Facebook
 * There are three types of templates, templateNameFacebook can be:
 * - template_send_survey_candidate : To ask the candidate to fill out the survey
 * - template_track_evaluator : Allows the candidate to track the progress of the surveys
 * - template_evaluator : Ask the evaluator to fill out the survey with his reference
 */

const sendMessageWithLink = async (req, res) => {
	const { body } = req;
	if (
		!body.messaging_product ||
		!body.recipient_type ||
		!body.to ||
		!body.type ||
		!body.template ||
		!body.template.name ||
		!body.template.language ||
		!body.template.language.code ||
		!body.template.components
	) {
		res.status(400).send({
			status: "FAILED",
			data: {
				error: "There are keys missing",
			},
		});
		return;
	}

	try {
		const components = body.template.components;
		let fullNameCandidate = "";
		let fullNameEvaluator = "";
		let phoneNumberCandidate = "";
		let phoneNumberEvaluator = "";
		let customUrl = "";
		let companyName = "";
		let templateNameFacebook = body.template.name;

		if (templateNameFacebook === template_send_survey_candidate) {
			fullNameCandidate = components[0].parameters[0].text;
			phoneNumberCandidate = body.to;
			companyName = components[1].parameters[0].text;
			customUrl = components[1].parameters[1].text;
		}

		if (templateNameFacebook === template_track_evaluator) {
			fullNameCandidate = components[0].parameters[0].text;
			phoneNumberCandidate = body.to;
			customUrl = components[1].parameters[0].text;
		}

		if (templateNameFacebook === template_evaluator) {
			fullNameEvaluator = components[0].parameters[0].text;
			fullNameCandidate = components[1].parameters[0].text;
			customUrl = components[1].parameters[1].text;
			phoneNumberEvaluator = body.to;
		}

		const data = await sendMessageWithLinkCandidateEvaluator({
			fullNameCandidate,
			fullNameEvaluator,
			phoneNumberCandidate,
			phoneNumberEvaluator,
			companyName,
			customUrl,
			templateNameFacebook,
		});
		res.status(201).send({ status: "OK", msg: "Messages sent", data: data });
	} catch (e) {
		res.status(e?.status || 500).send({
			status: "FAILED",
			msg: e?.message || "",
			reason: e?.response.headers || "",
		});
	}
};

const sendMessageWithLinkCandidateEvaluator = async ({
	fullNameCandidate,
	fullNameEvaluator,
	phoneNumberCandidate,
	phoneNumberEvaluator,
	companyName,
	customUrl,
	templateNameFacebook,
}) => {
	try {
		if (templateNameFacebook === template_send_survey_candidate) {
			const { data } = await axios({
				method: "POST",
				url: `https://graph.facebook.com/v12.0/${phone_number_id}/messages?access_token=${token}`,
				data: dataFirstTemplate(
					fullNameCandidate,
					formatPhone(phoneNumberCandidate),
					companyName,
					customUrl,
					templateNameFacebook
				),
				headers: { "Content-Type": "application/json" },
			});
			return data;
		}

		if (templateNameFacebook === template_track_evaluator) {
			const { data } = await axios({
				method: "POST",
				url: `https://graph.facebook.com/v12.0/${phone_number_id}/messages?access_token=${token}`,
				data: dataSecondTemplate(
					fullNameCandidate,
					formatPhone(phoneNumberCandidate),
					customUrl,
					templateNameFacebook
				),
				headers: { "Content-Type": "application/json" },
			});
			return data;
		}

		if (templateNameFacebook === template_evaluator) {
			const { data } = await axios({
				method: "POST",
				url: `https://graph.facebook.com/v12.0/${phone_number_id}/messages?access_token=${token}`,
				data: dataThirdTemplate(
					fullNameCandidate,
					fullNameEvaluator,
					formatPhone(phoneNumberEvaluator),
					customUrl,
					templateNameFacebook
				),
				headers: { "Content-Type": "application/json" },
			});

			return data;
		}
	} catch (e) {
		throw e;
	}
};

const dataFirstTemplate = (
	fullNameCandidate,
	phoneNumberCadidate,
	companyName,
	customUrl,
	templateNameFacebook
) => {
	return {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: phoneNumberCadidate,
		type: "template",
		template: {
			name: templateNameFacebook,
			language: { code: "en_US" }, // LANGUAGE_AND_LOCALE_CODE because of how I created the templates
			components: [
				{
					type: "header",
					parameters: [
						{
							type: "text",
							text: fullNameCandidate,
						},
					],
				},
				{
					type: "body",
					parameters: [
						{
							type: "text",
							text: companyName,
						},
						{
							type: "text",
							text: customUrl,
						},
					],
				},
			],
		},
	};
};

const dataSecondTemplate = (
	fullNameCandidate,
	phoneNumberCadidate,
	customUrl,
	templateNameFacebook
) => {
	return {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: phoneNumberCadidate,
		type: "template",
		template: {
			name: templateNameFacebook,
			language: { code: "en_US" }, // LANGUAGE_AND_LOCALE_CODE because of how I created the templates
			components: [
				{
					type: "header",
					parameters: [
						{
							type: "text",
							text: fullNameCandidate,
						},
					],
				},
				{
					type: "body",
					parameters: [
						{
							type: "text",
							text: customUrl,
						},
					],
				},
			],
		},
	};
};

const dataThirdTemplate = (
	fullNameCandidate,
	fullNameEvaluator,
	phoneNumberEvaluator,
	customUrl,
	templateNameFacebook
) => {
	return {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: phoneNumberEvaluator,
		type: "template",
		template: {
			name: templateNameFacebook,
			language: { code: "en_US" }, // LANGUAGE_AND_LOCALE_CODE because of how I created the templates
			components: [
				{
					type: "body",
					parameters: [
						{
							type: "text",
							text: fullNameCandidate,
						},
						{
							type: "text",
							text: customUrl,
						},
					],
				},
			],
		},
	};
};

const formatPhone = (phoneNumber) => {
	console.log(phoneNumber);
	return phoneNumber.replace(/[+|-| ]/g, "");
};

module.exports = {
	verifyWebhookToken,
	sendMessagesWebhook,
	newAdministratorRegister,
	sendMessageWithLink,
	sendMessageWithLinkCandidateEvaluator,
};
