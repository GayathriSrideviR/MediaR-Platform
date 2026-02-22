const express = require("express");
const router = express.Router();
const { all } = require("../config/sqlite");

router.get("/doctors", async (req, res) => {
  try {
    const doctors = await all(
      `SELECT id, name, email FROM users WHERE role = 'doctor' ORDER BY name ASC`
    );

    res.json(
      doctors.map((doc) => ({
        _id: String(doc.id),
        name: doc.name,
        email: doc.email,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
