const express = require("express");
const router = express.Router();
const db = require("../db");
const auth = require("../middleware/auth");

/* PROFILE */

router.get("/profile", auth, (req, res) => {
  db.get(
    "SELECT id, name, phone, role, language, land_area, location, experience_years FROM users WHERE id = ?",
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(row);
    }
  );
});

router.put("/profile", auth, (req, res) => {
  const { land_area, location, experience_years } = req.body;
  db.run(
    "UPDATE users SET land_area = ?, location = ?, experience_years = ? WHERE id = ?",
    [land_area || null, location || null, experience_years || null, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ updated: this.changes });
    }
  );
});

/* SOIL ANALYSIS – rule-based mock quantum model */

function runQuantumSoilModel(sample) {
  const ph = parseFloat(sample.ph);
  const moisture = parseFloat(sample.moisture);
  const nitrogen = parseFloat(sample.nitrogen || 0);
  const phosphorus = parseFloat(sample.phosphorus || 0);
  const potassium = parseFloat(sample.potassium || 0);

  let crop = "Paddy";
  let risk = "Medium";
  let yieldQ = 20;
  let profitScore = 7;

  if (ph >= 6 && ph <= 7.5 && moisture > 40 && nitrogen > 120) {
    crop = "Paddy (High Yield)";
    yieldQ = 25;
    profitScore = 8.5;
    risk = "Low";
  } else if (ph < 6 && moisture < 30) {
    crop = "Millets";
    yieldQ = 15;
    profitScore = 7.5;
    risk = "Low";
  } else if (ph > 7.5 && potassium > 200) {
    crop = "Groundnut";
    yieldQ = 18;
    profitScore = 7;
    risk = "Medium";
  }

  const explanation =
    "Recommendation based on soil pH, moisture and NPK levels with local price-weighted yield simulation (mock quantum optimizer).";

  return {
    recommended_crop: crop,
    expected_yield: yieldQ,
    profit_score: profitScore,
    risk_level: risk,
    explanation,
  };
}

// Create new soil test
router.post("/soil-analysis", auth, (req, res) => {
  const {
    ph,
    moisture,
    organic_carbon,
    nitrogen,
    phosphorus,
    potassium,
    notes,
  } = req.body;

  if (!ph || !moisture) {
    return res
      .status(400)
      .json({ message: "pH and moisture are required fields" });
  }

  const modelResult = runQuantumSoilModel({
    ph,
    moisture,
    nitrogen,
    phosphorus,
    potassium,
  });

  db.run(
    `INSERT INTO soil_tests 
      (user_id, ph, moisture, organic_carbon, nitrogen, phosphorus, potassium, notes,
       recommended_crop, expected_yield, profit_score, risk_level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      ph,
      moisture,
      organic_carbon || null,
      nitrogen || null,
      phosphorus || null,
      potassium || null,
      notes || null,
      modelResult.recommended_crop,
      modelResult.expected_yield,
      modelResult.profit_score,
      modelResult.risk_level,
    ],
    function (err) {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(modelResult);
    }
  );
});

// Get history for current user
router.get("/soil-analysis", auth, (req, res) => {
  db.all(
    "SELECT * FROM soil_tests WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(rows);
    }
  );
});

module.exports = router;
