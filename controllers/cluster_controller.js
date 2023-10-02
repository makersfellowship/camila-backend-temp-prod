"use strict";
const Cluster = require("../models/cluster_model");
const Question = require("../models/question_model");

exports.create = function (req, res) {
	Cluster.create(req.body, function (err, result) {
		if (!err) {
			return res.json(result);
		} else {
			return res.send(err); // 500 error
		}
	});
};

exports.get = function (req, res) {
	Cluster.get({ _id: req.params.id }, function (err, result) {
		if (!err) {
			return res.json(result);
		} else {
			return res.send(err); // 500 error
		}
	});
};

exports.getClusterQuestions = async function (req, res) {
	const clusterId = req.params.id;
	try {
		let questionsReference = await Question.find({
			$and: [
				{ $and: [{ cluster: { $exists: true } }, { cluster: clusterId }] },
				{ publishTo: "Evaluator" },
			],
		})
			.sort({ viewPosition: 1 })
			.exec();
		let questionsCandidate = await Question.find({
			$and: [
				{ $and: [{ cluster: { $exists: true } }, { cluster: clusterId }] },
				{ publishTo: "Candidate" },
			],
		})
			.sort({ viewPosition: 1 })
			.exec();
		return res.status(200).json({
			success: true,
			questionsReference,
			questionsCandidate,
		});
	} catch (error) {
		console.error(error);
		return res.status(400).json({ success: false, error });
	}
};

exports.getAll = function (req, res) {
	Cluster.getAll({}, function (err, result) {
		if (!err) {
			return res.json(result);
		} else {
			return res.send(err); // 500 error
		}
	});
};

exports.getPublic = function (req, res) {
	Cluster.getAll({ contentType: "Public" }, function (err, result) {
		if (!err) {
			return res.json(result);
		} else {
			return res.send(err); // 500 error
		}
	});
};

exports.update = function (req, res) {
	Cluster.updateById(req.params.id, req.body, function (err, result) {
		if (!err) {
			return res.json(result);
		} else {
			return res.send(err); // 500 error
		}
	});
};

exports.delete = function (req, res) {
	Cluster.removeById({ _id: req.params.id }, function (err, result) {
		if (!err) {
			return res.json(result);
		} else {
			console.error(err);
			return res.send(err); // 500 error
		}
	});
};
