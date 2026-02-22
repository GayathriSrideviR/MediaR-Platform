import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";

export default function UploadXray() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [appointmentId, setAppointmentId] = useState("");
  const [sharing, setSharing] = useState(false);

  const patientId = localStorage.getItem("user_id");

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/appointment/patient/${patientId}`);
        const accepted = res.data.filter((a) => a.status === "accepted");
        setAppointments(accepted);
      } catch (err) {
        console.log("Appointment fetch error:", err);
      }
    };

    if (patientId) fetchAppointments();
  }, [patientId]);

  const toBase64 = (inputFile) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(inputFile);
    });

  const handleUpload = async () => {
    if (!file) {
      alert("Please select an image");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("patient_id", patientId);

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/api/ai/predict`, formData);
      setResult(res.data);
    } catch (error) {
      console.log(error);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const shareWithDoctor = async () => {
    if (!result || !appointmentId || !file) {
      alert("Analyze an image and choose an accepted appointment first.");
      return;
    }

    try {
      setSharing(true);
      const selected = appointments.find((a) => a._id === appointmentId);
      const imageBase64 = await toBase64(file);

      await axios.post(`${API_BASE}/api/appointment/share-xray`, {
        appointmentId: selected._id,
        patientId,
        doctorId: selected.doctorId?._id,
        imageBase64,
        prediction: result.prediction,
        confidence: result.confidence,
        precision: result.precision,
        recall: result.recall,
        f1_score: result.f1_score,
        asthma_mucus_risk: result.asthma_mucus_risk,
        class_probabilities: result.class_probabilities,
        hotspots: result.hotspots,
      });

      alert("X-ray shared with doctor for 3D visualization.");
    } catch (err) {
      console.log(err);
      alert("Unable to share with doctor");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow mb-6 max-w-2xl mx-auto mt-10">
      <h2 className="text-xl font-semibold mb-4">Upload Chest X-Ray</h2>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Analyzing..." : "Upload and Predict"}
      </button>

      {result && (
        <div className="mt-4">
          <p>
            <strong>Prediction:</strong> {result.prediction}
          </p>
          <p>
            <strong>Confidence:</strong> {result.confidence}%
          </p>

          <select
            value={appointmentId}
            onChange={(e) => setAppointmentId(e.target.value)}
            className="border p-2 w-full rounded mt-4"
          >
            <option value="">Select accepted appointment to share</option>
            {appointments.map((appt) => (
              <option key={appt._id} value={appt._id}>
                {appt.date} {appt.time} - Dr. {appt.doctorId?.name || "Doctor"}
              </option>
            ))}
          </select>

          <button
            onClick={shareWithDoctor}
            disabled={sharing}
            className="bg-blue-600 text-white px-4 py-2 rounded mt-3 disabled:opacity-60"
          >
            {sharing ? "Sharing..." : "Share X-ray with Doctor"}
          </button>
        </div>
      )}
    </div>
  );
}
