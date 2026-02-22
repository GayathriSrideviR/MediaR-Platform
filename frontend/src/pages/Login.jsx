import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config/api";

const DOCTOR_DEMO = {
  email: "doctor@mediarhealth.com",
  password: "Doctor@123",
};

const PATIENT_DEMO = {
  email: "patient@mediarhealth.com",
  password: "Patient@123",
};

export default function Login() {
  const [portalRole, setPortalRole] = useState("patient");
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const applyDemo = () => {
    setForm(portalRole === "doctor" ? DOCTOR_DEMO : PATIENT_DEMO);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/api/login`, form);
      const user = res.data.user;

      if (user.role !== portalRole) {
        alert(`This portal is for ${portalRole} sign-in. Switch portal role.`);
        return;
      }

      const safeName =
        String(user.name || "").trim().toLowerCase() === "ravi kumar"
          ? "Patient"
          : user.name;

      localStorage.setItem("user_id", user._id);
      localStorage.setItem("role", user.role);
      localStorage.setItem("name", safeName);

      if (user.role === "doctor") {
        window.location.href = "/doctor";
      } else {
        window.location.href = "/patient-dashboard";
      }
    } catch (error) {
      alert(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-5 md:p-10 fade-in">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="glass-panel rounded-3xl p-8 lg:p-10 shadow-xl slide-up relative overflow-hidden">
          <div className="absolute w-56 h-56 rounded-full bg-cyan-200/50 -top-20 -left-16 floating" />
          <div className="absolute w-64 h-64 rounded-full bg-teal-200/40 -bottom-24 -right-20 floating" />

          <div className="relative">
            <p className="text-sm font-semibold text-teal-700 tracking-wide uppercase">
              MediAR Health Intelligence
            </p>
            <h1 className="text-4xl lg:text-5xl font-bold mt-3 leading-tight">
              Real-time care for doctors and patients.
            </h1>
            <p className="text-slate-600 mt-5 leading-relaxed">
              AI chest X-ray analysis, appointment workflow, secure video
              consultation, and doctor-side 3D scan visualization in one platform.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-8">
              <div className="bg-white rounded-2xl p-4 border border-teal-100 hover-lift">
                <p className="text-3xl font-bold text-teal-700">24/7</p>
                <p className="text-sm text-slate-500">Digital triage availability</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-teal-100 hover-lift">
                <p className="text-3xl font-bold text-teal-700">3D</p>
                <p className="text-sm text-slate-500">Interactive imaging review</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 shadow-xl slide-up">
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setPortalRole("patient")}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                portalRole === "patient"
                  ? "bg-teal-600 text-white pulse-soft"
                  : "bg-white border border-slate-200 text-slate-700 hover-lift"
              }`}
            >
              Patient Sign In
            </button>
            <button
              onClick={() => setPortalRole("doctor")}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                portalRole === "doctor"
                  ? "bg-teal-600 text-white pulse-soft"
                  : "bg-white border border-slate-200 text-slate-700 hover-lift"
              }`}
            >
              Doctor Sign In
            </button>
          </div>

          <h2 className="text-2xl font-bold">
            {portalRole === "doctor" ? "Doctor Console Login" : "Patient Portal Login"}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Enter your credentials or use standard demo credentials.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-300"
              placeholder={portalRole === "doctor" ? "Doctor Email" : "Patient Email"}
              required
            />

            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-300"
              placeholder="Password"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 text-white py-3 rounded-xl hover:bg-teal-700 transition disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={applyDemo}
              className="border border-teal-200 text-teal-700 py-2 rounded-xl hover-lift"
            >
              Use {portalRole === "doctor" ? "Doctor" : "Patient"} Demo
            </button>
            <Link
              to="/register"
              className="text-center border border-slate-200 py-2 rounded-xl hover-lift"
            >
              New User Register
            </Link>
          </div>

          <div className="mt-5 p-4 bg-white rounded-xl border border-teal-100 text-sm">
            <p className="font-semibold text-teal-700">Standard Demo Credentials</p>
            <p className="mt-2">
              Doctor: <span className="font-medium">{DOCTOR_DEMO.email}</span> /{" "}
              <span className="font-medium">{DOCTOR_DEMO.password}</span>
            </p>
            <p>
              Patient: <span className="font-medium">{PATIENT_DEMO.email}</span> /{" "}
              <span className="font-medium">{PATIENT_DEMO.password}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
