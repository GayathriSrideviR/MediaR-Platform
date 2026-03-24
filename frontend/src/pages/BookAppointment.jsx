import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";
import { buildXrayFormData } from "../utils/xrayAnalysis";

export default function BookAppointment() {
  const storedName = localStorage.getItem("name") || "";
  const defaultPatientName =
    storedName.trim().toLowerCase() === "ravi kumar" ? "" : storedName;
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    patientName: defaultPatientName,
    doctorId: "",
    date: "",
    time: "",
    reason: "",
  });
  const [xrayFile, setXrayFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const patientId = localStorage.getItem("user_id");

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/users/doctors`);
      setDoctors(res.data);
    } catch (err) {
      console.log("Fetch doctor error:", err);
    }
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const analyzeXray = async (file) => {
    const analysisForm = await buildXrayFormData(file, patientId);
    const res = await axios.post(`${API_BASE}/api/ai/predict`, analysisForm);
    return res.data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!patientId) {
      alert("Please login again.");
      return;
    }

    if (!/^\d+$/.test(String(patientId))) {
      alert("Session expired due to data update. Please login again.");
      localStorage.clear();
      window.location.href = "/login";
      return;
    }

    try {
      setSubmitting(true);

      const bookingRes = await axios.post(`${API_BASE}/api/appointment/book`, {
        ...form,
        patientId,
      });

      const appointment = bookingRes.data?.appointment;
      let xrayWarning = "";

      if (form.patientName?.trim()) {
        localStorage.setItem("name", form.patientName.trim());
      }

      if (xrayFile && appointment?._id) {
        try {
          const [analysis, imageBase64] = await Promise.all([
            analyzeXray(xrayFile),
            toBase64(xrayFile),
          ]);

          await axios.post(`${API_BASE}/api/appointment/share-xray`, {
            appointmentId: appointment._id,
            patientId,
            doctorId: form.doctorId,
            imageBase64,
            prediction: analysis.prediction,
            confidence: analysis.confidence,
            precision: analysis.precision,
            recall: analysis.recall,
            f1_score: analysis.f1_score,
            asthma_mucus_risk: analysis.asthma_mucus_risk,
            class_probabilities: analysis.class_probabilities,
            hotspots: analysis.hotspots,
          });
        } catch (xrayErr) {
          console.log("X-ray share during booking failed:", xrayErr);
          xrayWarning =
            " Appointment booked, but X-ray share failed. Please upload/share once from Upload X-ray page.";
        }
      }

      alert(`Appointment booked successfully.${xrayWarning}`);
      window.location.href = "/patient-dashboard";
    } catch (err) {
      console.log("Book error:", err);
      alert(err.response?.data?.message || "Unable to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow">
        <h2 className="text-2xl font-bold mb-2">Book Appointment</h2>
        <p className="text-gray-600 mb-6">
          Select a doctor, preferred slot, and optionally upload an X-ray to share
          with the doctor before consultation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            value={form.patientName}
            onChange={(e) => setForm({ ...form, patientName: e.target.value })}
            className="border p-2 w-full rounded"
            placeholder="Enter patient name"
          />

          <select
            required
            value={form.doctorId}
            onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
            className="border p-2 w-full rounded"
          >
            <option value="">Select Doctor</option>
            {doctors.map((doc) => (
              <option key={doc._id} value={doc._id}>
                Dr. {doc.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              required
              value={form.date}
              className="border p-2 w-full rounded"
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />

            <input
              type="time"
              required
              value={form.time}
              className="border p-2 w-full rounded"
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>

          <textarea
            placeholder="Symptoms / reason for appointment"
            value={form.reason}
            className="border p-2 w-full rounded"
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />

          <div className="border rounded p-3">
            <label className="block text-sm font-medium mb-2">
              Optional: Upload Chest X-ray
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setXrayFile(e.target.files?.[0] || null)}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              If uploaded, AI analysis is generated and shared with the doctor for
              3D review.
            </p>
          </div>

          <button
            disabled={submitting}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full disabled:opacity-60"
          >
            {submitting ? "Booking..." : "Book Appointment"}
          </button>
        </form>
      </div>
    </div>
  );
}
