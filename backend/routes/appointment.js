const express = require("express");
const router = express.Router();
const { run, get, all } = require("../config/sqlite");

router.post("/book", async (req, res) => {
  try {
    const { patientId, doctorId, date, time, reason, patientName } = req.body;

    if (!patientId || !doctorId || !date || !time) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const [patient, doctor] = await Promise.all([
      get(`SELECT id, name FROM users WHERE id = ? AND role = 'patient'`, [patientId]),
      get(`SELECT id, name FROM users WHERE id = ? AND role = 'doctor'`, [doctorId]),
    ]);

    if (!patient || !doctor) {
      return res.status(400).json({ message: "Invalid patient or doctor id" });
    }

    const safePatientName = String(patientName || "").trim();
    if (safePatientName) {
      await run(`UPDATE users SET name = ? WHERE id = ? AND role = 'patient'`, [
        safePatientName,
        patientId,
      ]);
      patient.name = safePatientName;
      await run(
        `UPDATE users_mirror SET name = ? WHERE mongo_user_id = ?`,
        [safePatientName, String(patientId)]
      );
    }

    const insertResult = await run(
      `INSERT INTO appointments
      (patient_id, doctor_id, appointment_date, appointment_time, reason, status, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
      [patientId, doctorId, date, time, reason || ""]
    );

    await run(
      `INSERT OR REPLACE INTO appointments_sqlite
      (mongo_appointment_id, patient_id, doctor_id, patient_name, doctor_name,
      appointment_date, appointment_time, reason, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        String(insertResult.id),
        String(patientId),
        String(doctorId),
        patient.name,
        doctor.name,
        date,
        time,
        reason || "",
        "pending",
      ]
    );

    res.status(201).json({
      message: "Appointment request sent successfully",
      appointment: {
        _id: String(insertResult.id),
        patientId: String(patientId),
        doctorId: String(doctorId),
        date,
        time,
        reason: reason || "",
        status: "pending",
      },
    });
  } catch (err) {
    console.error("Book Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/share-xray", async (req, res) => {
  try {
    const {
      appointmentId,
      patientId,
      doctorId,
      imageBase64,
      prediction,
      confidence,
      precision,
      recall,
      f1_score,
      asthma_mucus_risk,
      class_probabilities,
      hotspots,
    } = req.body;

    if (!appointmentId || !patientId || !doctorId || !imageBase64 || !prediction) {
      return res.status(400).json({ message: "Missing required X-ray sharing fields" });
    }

    await run(
      `INSERT INTO xray_shares
      (appointment_id, patient_id, doctor_id, image_base64, prediction, confidence,
      precision, recall, f1_score, asthma_mucus_risk, class_probabilities, hotspots)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(appointmentId),
        String(patientId),
        String(doctorId),
        imageBase64,
        prediction,
        Number(confidence || 0),
        Number(precision || 0),
        Number(recall || 0),
        Number(f1_score || 0),
        Number(asthma_mucus_risk || 0),
        JSON.stringify(class_probabilities || {}),
        JSON.stringify(hotspots || []),
      ]
    );

    res.status(201).json({ message: "X-ray shared with doctor successfully" });
  } catch (err) {
    console.error("Share Xray Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/shared-xray/:appointmentId", async (req, res) => {
  try {
    const row = await get(
      `SELECT id, appointment_id as appointmentId, patient_id as patientId,
      doctor_id as doctorId, image_base64 as imageBase64, prediction, confidence,
      precision, recall, f1_score as f1Score, asthma_mucus_risk as asthmaMucusRisk,
      class_probabilities as classProbabilities, hotspots,
      created_at as createdAt
      FROM xray_shares
      WHERE appointment_id = ?
      ORDER BY id DESC
      LIMIT 1`,
      [String(req.params.appointmentId)]
    );

    if (!row) {
      return res.status(404).json({ message: "No shared X-ray found" });
    }

    const safeParse = (value, fallback) => {
      if (!value) return fallback;
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    };

    res.json({
      ...row,
      classProbabilities: safeParse(row.classProbabilities, {}),
      hotspots: safeParse(row.hotspots, []),
    });
  } catch (err) {
    console.error("Shared Xray Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/doctor/:doctorId", async (req, res) => {
  try {
    const rows = await all(
      `SELECT a.id, a.appointment_date, a.appointment_time, a.reason, a.status,
      a.rescheduled_date, a.rescheduled_time,
      p.id as patient_id, p.name as patient_name, p.email as patient_email
      FROM appointments a
      JOIN users p ON p.id = a.patient_id
      WHERE a.doctor_id = ?
      ORDER BY a.created_at DESC`,
      [req.params.doctorId]
    );

    res.json(
      rows.map((r) => ({
        _id: String(r.id),
        date: r.appointment_date,
        time: r.appointment_time,
        reason: r.reason || "",
        status: r.status,
        rescheduledDate: r.rescheduled_date,
        rescheduledTime: r.rescheduled_time,
        patientName: r.patient_name,
        patientId: {
          _id: String(r.patient_id),
          name: r.patient_name,
          email: r.patient_email,
        },
      }))
    );
  } catch (err) {
    console.error("Doctor Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/patient/:patientId", async (req, res) => {
  try {
    const rows = await all(
      `SELECT a.id, a.appointment_date, a.appointment_time, a.reason, a.status,
      a.rescheduled_date, a.rescheduled_time,
      d.id as doctor_id, d.name as doctor_name, d.email as doctor_email, d.specialization as doctor_specialization
      FROM appointments a
      JOIN users d ON d.id = a.doctor_id
      WHERE a.patient_id = ?
      ORDER BY a.created_at DESC`,
      [req.params.patientId]
    );

    res.json(
      rows.map((r) => ({
        _id: String(r.id),
        date: r.appointment_date,
        time: r.appointment_time,
        reason: r.reason || "",
        status: r.status,
        rescheduledDate: r.rescheduled_date,
        rescheduledTime: r.rescheduled_time,
        doctorName: r.doctor_name,
        doctorId: {
          _id: String(r.doctor_id),
          name: r.doctor_name,
          email: r.doctor_email,
          specialization: r.doctor_specialization,
        },
      }))
    );
  } catch (err) {
    console.error("Patient Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
});

const updateStatusInSqlite = async (appointmentId, status, date = null, time = null) => {
  await run(
    `UPDATE appointments_sqlite
     SET status = ?,
         rescheduled_date = ?,
         rescheduled_time = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE mongo_appointment_id = ?`,
    [status, date, time, String(appointmentId)]
  );
};

router.put("/accept/:id", async (req, res) => {
  try {
    const appointment = await get(`SELECT id FROM appointments WHERE id = ?`, [req.params.id]);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    await run(
      `UPDATE appointments SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.params.id]
    );
    await updateStatusInSqlite(req.params.id, "accepted");

    res.json({ message: "Appointment accepted", appointment: { _id: String(req.params.id), status: "accepted" } });
  } catch (err) {
    console.error("Accept Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/reject/:id", async (req, res) => {
  try {
    const appointment = await get(`SELECT id FROM appointments WHERE id = ?`, [req.params.id]);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    await run(
      `UPDATE appointments SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.params.id]
    );
    await updateStatusInSqlite(req.params.id, "rejected");

    res.json({ message: "Appointment rejected", appointment: { _id: String(req.params.id), status: "rejected" } });
  } catch (err) {
    console.error("Reject Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/reschedule/:id", async (req, res) => {
  try {
    const { date, time } = req.body;
    if (!date || !time) {
      return res.status(400).json({ message: "New date and time required" });
    }

    const appointment = await get(`SELECT id FROM appointments WHERE id = ?`, [req.params.id]);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    await run(
      `UPDATE appointments
       SET status = 'rescheduled', rescheduled_date = ?, rescheduled_time = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [date, time, req.params.id]
    );
    await updateStatusInSqlite(req.params.id, "rescheduled", date, time);

    res.json({
      message: "Appointment rescheduled",
      appointment: {
        _id: String(req.params.id),
        status: "rescheduled",
        rescheduledDate: date,
        rescheduledTime: time,
      },
    });
  } catch (err) {
    console.error("Reschedule Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/patient/:id", async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: "patientId is required" });
    }

    const appointment = await get(
      `SELECT id, patient_id FROM appointments WHERE id = ?`,
      [req.params.id]
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (String(appointment.patient_id) !== String(patientId)) {
      return res.status(403).json({ message: "Not allowed to delete this appointment" });
    }

    await run(`DELETE FROM appointments WHERE id = ?`, [req.params.id]);
    await run(`DELETE FROM appointments_sqlite WHERE mongo_appointment_id = ?`, [
      String(req.params.id),
    ]);
    await run(`DELETE FROM xray_shares WHERE appointment_id = ?`, [String(req.params.id)]);

    return res.json({ message: "Appointment deleted successfully" });
  } catch (err) {
    console.error("Delete Appointment Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
