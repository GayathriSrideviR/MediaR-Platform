import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import AIAnalysis from "./pages/AIAnalysis";
import ARViewer from "./pages/ARViewer";
import PatientRecords from "./pages/PatientRecords";
import AIHistory from "./pages/AIHistory";
import Consultation from "./pages/Consultation";
import UploadXray from "./pages/UploadXray";
import BookAppointment from "./pages/BookAppointment";
import Records from "./pages/Records";
import DoctorAppointments from "./pages/DoctorAppointments";

function App() {
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* <Route path="/patient" element={<PatientDashboard />} /> */}
        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/doctor" element={<DoctorDashboard />} />
        <Route path="/analysis" element={<AIAnalysis />} />
        <Route path="/ar-viewer" element={<ARViewer />} />
        <Route path="/doctor/patient-records" element={<PatientRecords />} />
        <Route path="/doctor/ai-history" element={<AIHistory />} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/upload-xray" element={<UploadXray />} />
        <Route path="/book-appointment" element={<BookAppointment />} />
        {/* <Route path="/analysis" element={<Analysis />} /> */}
        <Route path="/records" element={<Records />} />
        <Route path="/doctor/appointments" element={<DoctorAppointments />}/>


      </Routes>
    </BrowserRouter>
  );
}

export default App;
