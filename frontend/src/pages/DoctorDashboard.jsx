import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config/api";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const doctorId = localStorage.getItem("user_id");
  const doctorName = localStorage.getItem("name") || "Doctor";

  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/appointment/doctor/${doctorId}`);
        setAppointments(res.data || []);
      } catch (err) {
        console.log("Doctor dashboard error:", err);
      }
    };

    if (doctorId) fetchAppointments();
  }, [doctorId]);

  const today = new Date().toISOString().split("T")[0];
  const todaySchedule = appointments.filter(
    (appt) => appt.date === today && appt.status === "accepted"
  );
  const confirmed = appointments.filter((appt) => appt.status === "accepted").length;
  const pending = appointments.filter((appt) => appt.status === "pending").length;
  const rejected = appointments.filter((appt) => appt.status === "rejected").length;

  return (
    <div className="min-h-screen p-5 md:p-8 fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide font-semibold text-teal-700">
                Doctor Operations Console
              </p>
              <h1 className="text-3xl md:text-4xl font-bold mt-1">
                Dr. {doctorName}
              </h1>
              <p className="text-slate-600 mt-2">
                Manage appointments, review AI-assisted scans, and run live video
                consultations.
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                navigate("/login");
              }}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total" value={appointments.length} />
          <StatCard title="Confirmed" value={confirmed} />
          <StatCard title="Pending" value={pending} />
          <StatCard title="Rejected" value={rejected} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/doctor/appointments")}
            className="glass-panel rounded-2xl p-5 text-left hover-lift"
          >
            <p className="text-xs text-teal-700 font-semibold uppercase">Module</p>
            <h3 className="text-xl font-semibold mt-1">Appointment Triage</h3>
            <p className="text-slate-600 mt-2">
              Accept, reject, reschedule, and open patient shared X-rays in 3D.
            </p>
          </button>

          <button
            onClick={() => navigate("/analysis")}
            className="glass-panel rounded-2xl p-5 text-left hover-lift"
          >
            <p className="text-xs text-teal-700 font-semibold uppercase">Module</p>
            <h3 className="text-xl font-semibold mt-1">AI Diagnostics</h3>
            <p className="text-slate-600 mt-2">
              Run chest X-ray AI prediction for COVID, pneumonia, and mucus-risk cue.
            </p>
          </button>

          <button
            onClick={() => navigate("/consultation?room=mediar-doctor-room&role=doctor")}
            className="glass-panel rounded-2xl p-5 text-left hover-lift"
          >
            <p className="text-xs text-teal-700 font-semibold uppercase">Module</p>
            <h3 className="text-xl font-semibold mt-1">Video Consultation</h3>
            <p className="text-slate-600 mt-2">
              Start secure teleconsultation sessions with camera and microphone.
            </p>
          </button>
        </div>

        <div className="glass-panel rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-bold mb-4">Today&apos;s Consultation Queue</h2>
          {todaySchedule.length === 0 ? (
            <p className="text-slate-500">No accepted appointments scheduled today.</p>
          ) : (
            <div className="space-y-3">
              {todaySchedule.map((appt) => (
                <div
                  key={appt._id}
                  className="bg-white rounded-xl border border-slate-100 p-4 hover-lift"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-semibold">{appt.patientId?.name || appt.patientName || "Unknown"}</p>
                      <p className="text-sm text-slate-600">{appt.date} at {appt.time}</p>
                    </div>
                    <button
                      onClick={() =>
                        navigate(`/consultation?room=${appt._id}&role=doctor`)
                      }
                      className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
                    >
                      Start Session
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="glass-panel rounded-2xl p-5 shadow hover-lift">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-3xl font-bold mt-1 text-teal-800">{value}</p>
    </div>
  );
}
