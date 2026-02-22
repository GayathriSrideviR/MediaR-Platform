const express = require("express");
const router = express.Router();

router.get("/dashboard", async (req, res) => {

  // Dummy data for now
  res.json({
    stats: {
      consultations: 2,
      xrays: 0,
      appointments: 2,
      reports: 0
    },
    appointments: [
      {
        doctor: "Dr. Angelin",
        date: "Jan 6, 2026",
        time: "12:08 AM"
      },
      {
        doctor: "Dr. Angel",
        date: "Jan 6, 2026",
        time: "12:04 AM"
      }
    ]
  });

});

module.exports = router;
