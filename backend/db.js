const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(path.join(__dirname, "../db/agri_sakthi.db"), (err) => {
  if (err) console.error("DB Error:", err.message);
  else console.log("DB Connected ✔");
});

module.exports = db;
