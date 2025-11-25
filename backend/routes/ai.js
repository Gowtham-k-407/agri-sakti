const express = require("express");
const router = express.Router();
const recommend = require("../ai/recommend");

router.post("/recommend-crop", (req, res) => res.json(recommend(req.body)));

module.exports = router;
