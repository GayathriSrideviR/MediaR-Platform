const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  date: String,
  time: String,
  reason: String,

  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "rescheduled"],
    default: "pending"
  },

  rescheduledDate: String,
  rescheduledTime: String

}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);
