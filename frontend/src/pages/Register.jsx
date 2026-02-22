import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config/api";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient",
    specialization: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/register`, form);
      alert("Registration successful. Please login.");
      window.location.href = "/login";
    } catch (error) {
      alert(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-panel rounded-3xl shadow-xl p-8 w-full max-w-lg slide-up">
        <h2 className="text-3xl font-bold mb-2 text-slate-900">Create Account</h2>
        <p className="text-slate-600 mb-6">Register as patient or doctor.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            onChange={handleChange}
            value={form.name}
            className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300"
            placeholder="Full Name"
            required
          />

          <input
            name="email"
            type="email"
            onChange={handleChange}
            value={form.email}
            className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300"
            placeholder="Email"
            required
          />

          <select
            name="role"
            onChange={handleChange}
            value={form.role}
            className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300"
          >
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
          </select>

          {form.role === "doctor" && (
            <input
              name="specialization"
              onChange={handleChange}
              value={form.specialization}
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300"
              placeholder="Doctor Specialization"
              required
            />
          )}

          <input
            name="password"
            type="password"
            onChange={handleChange}
            value={form.password}
            className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300"
            placeholder="Password"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 text-white py-3 rounded-xl hover:bg-teal-700 transition disabled:opacity-70"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="text-sm mt-5 text-slate-600">
          Already registered?{" "}
          <Link className="text-teal-700 font-semibold" to="/login">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
