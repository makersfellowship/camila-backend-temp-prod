"use strict";
const Reference = require("../models/reference_model");
const User = require("../models/user_model");

exports.create = function (req, res) {
	Reference.create(req.body, function (err, result) {
		if (!err) {
			return res.json(result);
		} else {
			return res.send(err); // 500 error
		}
	});
};

exports.get = function (req, res) {
	Reference.get({ _id: req.params.id }, function (err, result) {
		if (!err) {
			return res.json(result);
		} else {
			return res.send(err); // 500 error
		}
	});
};

exports.getByEmail = function (req, res) {
	Reference.get({ email: req.params.email }, function (err, result) {
		if (!err) {
			return res.json(result);
		} else {
			return res.send(err); // 500 error
		}
	});
};

exports.getAll = function (req, res) {
	Reference.getAll({}, function (err, result) {
		if (!err) {
			return res.json(result);
		} else {
			return res.send(err); // 500 error
		}
	});
};

exports.update = function (req, res) {
	Reference.updateById(req.params.id, req.body, function (err, result) {
		if (!err) {
			return res.json(result);
		} else {
			return res.send(err); // 500 error
		}
	});
};

exports.confirmReferenceInformation = async function (req, res) {
	try {
		const reference = req.body;
		const infoToUpdate = {
			firstName: reference.firstName,
			lastName: reference.lastName,
			email: reference.email.toLowerCase(),
			emailValidation: true,
			numberValidation: true,
			linkedin: reference.linkedin.toLowerCase(),
			_id: reference.evaluatorId,
		};
		await User.findOneAndUpdate(
			{ _id: infoToUpdate._id },
			{ $set: infoToUpdate },
			{ new: true }
		).exec();
		return res.status(200).json({
			success: true,
		});
	} catch (error) {
		console.error(error);
		return res.status(400).json({ success: false, error });
	}
};

exports.delete = function (req, res) {
	Reference.removeById({ _id: req.params.id }, function (err, result) {
		if (!err) {
			return res.json(result);
		} else {
			console.error(err);
			return res.send(err); // 500 error
		}
	});
};
