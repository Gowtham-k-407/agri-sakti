require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const farmerRoutes = require("./routes/farmer");
const marketplaceRoutes = require("./routes/marketplace");
const expertRoutes = require("./routes/experts");
const aiRoutes = require("./routes/ai");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://localhost:3000",
      "https://agri-sakti-nv48.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use(express.json());

// =============== API ROUTES (MUST COME FIRST) ===============
app.use("/api/auth", authRoutes);
app.use("/api/farmer", farmerRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/experts", expertRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// =============== STATIC FRONTEND FILES ===============
app.use(express.static(path.join(__dirname, "../frontend")));

// =============== FRONTEND FALLBACK (EXPRESS V5 SAFE) ===============
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
