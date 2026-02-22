import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config/api";

export default function DoctorAppointment() {
  const [appointments, setAppointments] = useState([]);
  const [xrayLoadingId, setXrayLoadingId] = useState("");
  const doctorId = localStorage.getItem("user_id");
  const navigate = useNavigate();

  const fetchAppointments = useCallback(async () => {
    const res = await axios.get(`${API_BASE}/api/appointment/doctor/${doctorId}`);
    setAppointments(res.data);
  }, [doctorId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const acceptAppointment = async (id) => {
    await axios.put(`${API_BASE}/api/appointment/accept/${id}`);
    fetchAppointments();
  };

  const rejectAppointment = async (id) => {
    await axios.put(`${API_BASE}/api/appointment/reject/${id}`);
    fetchAppointments();
  };

  const rescheduleAppointment = async (id) => {
    const newDate = prompt("Enter new date (YYYY-MM-DD)");
    const newTime = prompt("Enter new time (HH:MM)");

    if (!newDate || !newTime) return;

    await axios.put(`${API_BASE}/api/appointment/reschedule/${id}`, {
      date: newDate,
      time: newTime,
    });

    fetchAppointments();
  };

  const openSharedXray = async (appointmentId) => {
    try {
      setXrayLoadingId(appointmentId);
      await axios.get(`${API_BASE}/api/appointment/shared-xray/${appointmentId}`);
      navigate(`/consultation?room=${appointmentId}&role=doctor&model=1`);
    } catch (err) {
      alert("No X-ray has been shared yet for this appointment.");
    } finally {
      setXrayLoadingId("");
    }
  };

  const openConsultation = (appointmentId) => {
    navigate(`/consultation?room=${appointmentId}&role=doctor`);
  };

  return (
    <div className="p-8 min-h-screen bg-slate-100">
      <h2 className="text-3xl font-bold mb-6">Manage Appointments</h2>

      {appointments.map((appt) => (
        <div key={appt._id} className="border p-4 mb-4 rounded shadow bg-white">
          <p>
            <strong>Patient:</strong> {appt.patientId?.name || appt.patientName || "Patient"}
          </p>
          <p>
            <strong>Date:</strong> {appt.date}
          </p>
          <p>
            <strong>Time:</strong> {appt.time}
          </p>
          <p>
            <strong>Status:</strong> {appt.status}
          </p>

          {appt.status === "rescheduled" && (
            <>
              <p>
                <strong>New Date:</strong> {appt.rescheduledDate}
              </p>
              <p>
                <strong>New Time:</strong> {appt.rescheduledTime}
              </p>
            </>
          )}

          {appt.status === "pending" && (
            <div className="flex gap-3 mt-3 flex-wrap">
              <button
                onClick={() => acceptAppointment(appt._id)}
                className="bg-green-500 text-white px-3 py-1 rounded"
              >
                Accept
              </button>

              <button
                onClick={() => rejectAppointment(appt._id)}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                Reject
              </button>

              <button
                onClick={() => rescheduleAppointment(appt._id)}
                className="bg-yellow-500 text-white px-3 py-1 rounded"
              >
                Reschedule
              </button>
            </div>
          )}

          {appt.status === "accepted" && (
            <div className="flex gap-3 mt-3 flex-wrap">
              <button
                onClick={() => openConsultation(appt._id)}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Start Video Consultation
              </button>

              <button
                onClick={() => openSharedXray(appt._id)}
                disabled={xrayLoadingId === appt._id}
                className="bg-cyan-600 text-white px-3 py-1 rounded disabled:opacity-60"
              >
                {xrayLoadingId === appt._id
                  ? "Loading X-ray..."
                  : "Open Shared X-ray in Live 3D"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
