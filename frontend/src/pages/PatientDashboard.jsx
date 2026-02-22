import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config/api";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const patientId = localStorage.getItem("user_id");
  const rawName = localStorage.getItem("name") || "";
  const patientName =
    rawName.trim().toLowerCase() === "ravi kumar" ? "Patient" : rawName || "Patient";

  useEffect(() => {
    if (rawName.trim().toLowerCase() === "ravi kumar") {
      localStorage.setItem("name", "Patient");
    }
  }, [rawName]);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const previousStatusRef = useRef({});

  useEffect(() => {
    const fetchAppointments = async (silent = false) => {
      try {
        const res = await axios.get(`${API_BASE}/api/appointment/patient/${patientId}`);
        const incoming = res.data || [];
        setAppointments(incoming);

        incoming.forEach((appt) => {
          const prevStatus = previousStatusRef.current[appt._id];
          const currentStatus = appt.status;

          if (prevStatus && prevStatus !== currentStatus && currentStatus === "accepted") {
            alert(
              `Your appointment on ${appt.date} at ${appt.time} with Dr. ${appt.doctorId?.name || "Doctor"} was accepted. Join consultation now.`
            );

            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Appointment Accepted", {
                body: `Dr. ${appt.doctorId?.name || "Doctor"} accepted your appointment.`,
              });
            }
          }

          previousStatusRef.current[appt._id] = currentStatus;
        });

        if (!silent && "Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
      } catch (err) {
        console.log("Patient dashboard error:", err);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    };

    if (patientId) {
      fetchAppointments();
      const poller = setInterval(() => fetchAppointments(true), 10000);
      return () => clearInterval(poller);
    }
  }, [patientId]);

  const accepted = appointments.filter((a) => a.status === "accepted").length;
  const pending = appointments.filter((a) => a.status === "pending").length;

  const deleteAppointment = async (appointmentId) => {
    const yes = window.confirm(
      "Delete this appointment? This will remove it from both patient and doctor portals."
    );
    if (!yes) return;

    try {
      setDeletingId(appointmentId);
      await axios.delete(`${API_BASE}/api/appointment/patient/${appointmentId}`, {
        data: { patientId },
      });
      setAppointments((prev) => prev.filter((a) => a._id !== appointmentId));
      delete previousStatusRef.current[appointmentId];
      alert("Appointment deleted.");
    } catch (err) {
      alert(err.response?.data?.message || "Unable to delete appointment");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="min-h-screen p-5 md:p-8 fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-teal-700 uppercase text-sm font-semibold tracking-wide">
                Patient Health Command Center
              </p>
              <h1 className="text-3xl md:text-4xl font-bold mt-1">
                Welcome back, {patientName}
              </h1>
              <p className="text-slate-600 mt-2">
                Book appointments, upload X-rays, get AI analysis, and consult your
                doctor online.
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total Appointments" value={appointments.length} />
          <StatCard title="Accepted Appointments" value={accepted} />
          <StatCard title="Pending Requests" value={pending} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/book-appointment")}
            className="glass-panel rounded-2xl p-5 text-left hover-lift"
          >
            <p className="text-xs text-teal-700 font-semibold uppercase">Module</p>
            <h3 className="text-xl font-semibold mt-1">Book Appointment</h3>
            <p className="text-slate-600 mt-2">
              Select doctor, date/time, symptoms, and optionally attach your X-ray.
            </p>
          </button>

          <button
            onClick={() => navigate("/analysis")}
            className="glass-panel rounded-2xl p-5 text-left hover-lift"
          >
            <p className="text-xs text-teal-700 font-semibold uppercase">Module</p>
            <h3 className="text-xl font-semibold mt-1">AI Analysis</h3>
            <p className="text-slate-600 mt-2">
              Detect COVID, pneumonia patterns, and estimated mucus risk indicators.
            </p>
          </button>
        </div>

        <div className="glass-panel rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-bold mb-4">Appointment Timeline</h2>
          {loading ? (
            <p>Loading appointments...</p>
          ) : appointments.length === 0 ? (
            <p className="text-slate-500">No appointments yet.</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => (
                <div
                  key={appt._id}
                  className="bg-white rounded-xl p-4 border border-slate-100 hover-lift"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        Dr. {appt.doctorId?.name || appt.doctorName || "Doctor"}
                      </p>
                      <p className="text-sm text-slate-600">
                        {appt.date} at {appt.time}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        appt.status === "accepted"
                          ? "bg-emerald-100 text-emerald-700"
                          : appt.status === "rejected"
                          ? "bg-rose-100 text-rose-700"
                          : appt.status === "rescheduled"
                          ? "bg-cyan-100 text-cyan-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>

                  {appt.status === "accepted" && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button
                        onClick={() =>
                          navigate(`/consultation?room=${appt._id}&role=patient`)
                        }
                        className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
                      >
                        Join Video Consultation
                      </button>
                      <button
                        onClick={() => deleteAppointment(appt._id)}
                        disabled={deletingId === appt._id}
                        className="bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition disabled:opacity-60"
                      >
                        {deletingId === appt._id ? "Deleting..." : "Delete Appointment"}
                      </button>
                    </div>
                  )}

                  {appt.status !== "accepted" && (
                    <button
                      onClick={() => deleteAppointment(appt._id)}
                      disabled={deletingId === appt._id}
                      className="mt-3 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition disabled:opacity-60"
                    >
                      {deletingId === appt._id ? "Deleting..." : "Delete Appointment"}
                    </button>
                  )}
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
