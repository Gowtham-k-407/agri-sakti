const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");
const router = express.Router();

// All listings
router.get("/listings", auth, (req, res) => {
  db.all(
    `SELECT listings.*, users.name AS farmer_name FROM listings
     JOIN users ON users.id = listings.farmer_id`,
    [],
    (_, rows) => res.json(rows)
  );
});

// Create listing (farmer & admin)
router.post("/listings", auth, (req, res) => {
  if (req.user.role !== "farmer" && req.user.role !== "admin")
    return res.status(403).json({ message: "Only farmers/admins can create listings" });

  const { crop_name, quantity_kg, price_per_kg } = req.body;

  db.run(
    `INSERT INTO listings (farmer_id, crop_name, quantity_kg, price_per_kg, status)
     VALUES (?, ?, ?, ?, 'OPEN')`,
    [req.user.id, crop_name, quantity_kg, price_per_kg],
    () => res.json({ message: "Created" })
  );
});

// Buy with quantity reduce
router.post("/buy", auth, (req, res) => {
  const { listing_id, quantity } = req.body;

  db.get(`SELECT * FROM listings WHERE id=?`, [listing_id], (_, listing) => {
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.status !== "OPEN") return res.status(400).json({ message: "Listing closed" });
    if (listing.quantity_kg < quantity) return res.status(400).json({ message: "Not enough stock" });

    const newQty = listing.quantity_kg - quantity;
    const newStatus = newQty === 0 ? "CLOSED" : "OPEN";

    db.run(`UPDATE listings SET quantity_kg=?, status=? WHERE id=?`, [newQty, newStatus, listing_id]);
    db.run(`INSERT INTO contracts (listing_id, buyer_name) VALUES (?, ?)`, [listing_id, req.user.phone]);

    res.json({ message: "Purchase successful", remaining: newQty });
  });
});

// Admin delete listing
router.delete("/delete/:id", auth, (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" });

  db.run(`DELETE FROM listings WHERE id=?`, [req.params.id], () => res.json({ message: "Deleted" }));
});

module.exports = router;
