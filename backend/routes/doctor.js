const express = require("express");
const router = express.Router();

router.get("/dashboard", (req, res) => {
  res.json({
    stats: {
      activePatients: 1,
      confirmed: 0,
      pending: 0,
      totalConsultations: 1
    },
    schedule: [
      {
        patient: "Angelin",
        date: "Jan 6, 2026",
        time: "12:08 AM"
      }
    ]
  });
});

module.exports = router;
