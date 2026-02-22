import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Home() {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <div className="px-5 py-7 md:px-8 md:py-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="glass-panel rounded-3xl p-8 shadow-xl slide-up">
            <p className="text-sm uppercase font-semibold tracking-wide text-teal-700">
              AI Telemedicine Platform
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mt-3 leading-tight">
              Hospital-grade virtual care with AI and 3D imaging.
            </h1>
            <p className="mt-5 text-slate-600 leading-relaxed">
              MediAR brings consultation, appointment triage, chest X-ray AI, and
              360-degree doctor-side scan visualization into one modern workflow.
            </p>

            <div className="flex gap-3 mt-7 flex-wrap">
              <button
                onClick={() => navigate("/login")}
                className="bg-teal-600 text-white px-5 py-3 rounded-xl hover:bg-teal-700 transition"
              >
                Enter Login Portal
              </button>
              <button
                onClick={() => navigate("/analysis")}
                className="border border-slate-200 px-5 py-3 rounded-xl hover-lift"
              >
                Explore AI Module
              </button>
            </div>
          </div>

          <div className="relative h-[360px] md:h-[420px] rounded-3xl overflow-hidden shadow-xl floating">
            <img
              src="https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=80"
              alt="Digital healthcare"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <p className="text-xs uppercase tracking-wider">Live Modules</p>
              <p className="text-2xl font-semibold mt-1">
                Appointment Booking • Video Consultation • 3D AI Viewer
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
