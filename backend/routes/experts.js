const express = require("express");
const db = require("../db");
const router = express.Router();

router.get("/", (_, res) => {
  db.all(`SELECT * FROM experts`, [], (_, rows) => res.json(rows));
});

module.exports = router;
