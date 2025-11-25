const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");
const router = express.Router();

router.get("/users", auth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });

  db.all(`SELECT id, name, phone, role, land_area, location, experience_years FROM users`, [], (_, rows) => {
    res.json(rows);
  });
});

router.post("/block", auth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });

  const { id } = req.body;
  db.run(`UPDATE users SET role='blocked' WHERE id=?`, [id], () => res.json({ message: "Blocked" }));
});

module.exports = router;
