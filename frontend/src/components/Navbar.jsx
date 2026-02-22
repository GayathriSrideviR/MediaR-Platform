import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="glass-panel mx-5 mt-5 rounded-2xl px-6 py-4 shadow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-teal-700">MediAR Health</h1>

        <div className="flex gap-4 text-slate-700 text-sm md:text-base">
          <Link className="hover:text-teal-700 transition" to="/home">
            Home
          </Link>
          <Link className="hover:text-teal-700 transition" to="/analysis">
            AI Analysis
          </Link>
          <Link className="hover:text-teal-700 transition" to="/book-appointment">
            Appointment
          </Link>
          <Link className="hover:text-teal-700 transition" to="/consultation">
            Consultation
          </Link>
        </div>

        <div className="flex gap-3">
          <Link
            to="/login"
            className="px-4 py-2 border border-slate-200 rounded-lg hover-lift"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}
