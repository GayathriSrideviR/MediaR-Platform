import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";

export default function PatientAppointments() {

  const [appointments, setAppointments] = useState([]);
  const patientId = localStorage.getItem("user_id");

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    const res = await axios.get(`${API_BASE}/api/appointment/patient/${patientId}`);
    setAppointments(res.data);
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">My Appointments</h2>

      {appointments.map((appt) => (
        <div key={appt._id} className="border p-4 mb-4 rounded shadow">
          <p><strong>Doctor:</strong> {appt.doctorId?.name}</p>
          <p><strong>Date:</strong> {appt.date}</p>
          <p><strong>Time:</strong> {appt.time}</p>
          <p><strong>Status:</strong> {appt.status}</p>

          {appt.status === "rescheduled" && (
            <p>
              <strong>New Date:</strong> {appt.rescheduledDate} <br />
              <strong>New Time:</strong> {appt.rescheduledTime}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
