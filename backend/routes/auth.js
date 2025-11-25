const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

// TEMP MEMORY STORAGE FOR ADMIN OTP
let adminOtps = {};

// ================= REGISTER =================
router.post("/register", (req, res) => {
  const { name, phone, password, role } = req.body;

  if (!name || !phone || !password || !role) {
    return res.status(400).json({ message: "All fields required" });
  }

  const hash = bcrypt.hashSync(password, 10);

  const sql = `INSERT INTO users (name, phone, password_hash, role)
               VALUES (?, ?, ?, ?)`;

  db.run(sql, [name, phone, hash, role], function (err) {
    if (err) {
      console.error("DB INSERT ERROR:", err.message);
      return res.status(400).json({ message: "Phone already registered" });
    }

    res.json({ message: "Registration success", id: this.lastID });
  });
});


// ================= LOGIN =================
router.post("/login", (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ message: "Phone & password required" });
  }

  const sql = `SELECT * FROM users WHERE phone = ?`;
  db.get(sql, [phone], (err, user) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!user) return res.status(401).json({ message: "User not found" });

    bcrypt.compare(password, user.password_hash, (err, ok) => {
      if (!ok) return res.status(401).json({ message: "Wrong password" });

      // FIX: Include name in token
      const token = jwt.sign(
        { id: user.id, name: user.name, phone: user.phone, role: user.role },
        process.env.JWT_SECRET || "devsecret",
        { expiresIn: "7d" }
      );

      res.json({ message: "OK", token });
    });
  });
});


// ================= PROFILE =================
router.get("/profile", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    res.json(payload);
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});


// ================= SEND ADMIN OTP =================
router.post("/send-admin-otp", (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: "Phone required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  adminOtps[phone] = otp;

  console.log("ADMIN OTP GENERATED:", otp);

  res.json({ message: "OTP generated", otp: otp }); // SHOW real OTP
});


// ================= VERIFY ADMIN OTP =================
router.post("/verify-admin-otp", (req, res) => {
  const { phone, otp } = req.body;

  if (adminOtps[phone] !== otp) {
    return res.status(401).json({ message: "Invalid OTP" });
  }

  delete adminOtps[phone];
  res.json({ message: "OTP verified" });
});


// ================= ADMIN REGISTER =================
router.post("/admin-register", (req, res) => {
  const { name, phone, password } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  const hash = bcrypt.hashSync(password, 10);

  const sql = `INSERT INTO users (name, phone, password_hash, role)
               VALUES (?, ?, ?, 'admin')`;

  db.run(sql, [name, phone, hash], function (err) {
    if (err) return res.status(400).json({ message: "Phone already used" });

    res.json({ message: "Admin registered", id: this.lastID });
  });
});

module.exports = router;
