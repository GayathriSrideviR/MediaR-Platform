import React, { useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api";
import { buildXrayFormData } from "../utils/xrayAnalysis";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement
);

const AIAnalysis = () => {
  const [file, setFile] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Upload an X-ray image");
      return;
    }

    try {
      setLoading(true);
      const formData = await buildXrayFormData(file, localStorage.getItem("user_id") || "");
      const res = await axios.post(`${API_BASE}/api/ai/predict`, formData);
      setResult(res.data);
    } catch (err) {
      console.error("AI analysis request failed:", err);
      alert(err.response?.data?.message || err.message || "AI backend error");
    } finally {
      setLoading(false);
    }
  };

  const classChartData = useMemo(() => {
    if (!result?.class_probabilities) return null;
    const p = result.class_probabilities;
    return {
      labels: ["COVID-19", "Viral Pneumonia", "Normal"],
      datasets: [
        {
          label: "Class Confidence (%)",
          data: [p["COVID-19"] || 0, p["Viral Pneumonia"] || 0, p.Normal || 0],
          backgroundColor: ["#ef4444", "#f97316", "#22c55e"],
        },
      ],
    };
  }, [result]);

  const prChartData = useMemo(() => {
    if (!result) return null;
    return {
      labels: ["Precision", "Recall", "F1-Score"],
      datasets: [
        {
          label: "Performance Metrics (%)",
          data: [result.precision || 0, result.recall || 0, result.f1_score || 0],
          borderColor: "#0d9488",
          backgroundColor: "rgba(13, 148, 136, 0.2)",
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [result]);

  return (
    <div className="p-8 min-h-screen bg-slate-50">
      <h1 className="text-3xl font-bold mb-6">AI X-Ray Analysis</h1>

      <div className="bg-white p-5 rounded-xl shadow">
        <input type="file" accept="image/*" onChange={handleFileChange} />

        <div className="mt-4 flex gap-3 flex-wrap">
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white px-6 py-2 rounded"
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>

          <button
            onClick={() =>
              navigate("/ar-viewer", {
                state: {
                  imageBase64,
                  result: result?.prediction,
                  confidence: result?.confidence,
                  asthmaMucusRisk: result?.asthma_mucus_risk,
                  precision: result?.precision,
                  recall: result?.recall,
                  f1Score: result?.f1_score,
                  classProbabilities: result?.class_probabilities,
                  hotspots: result?.hotspots,
                },
              })
            }
            disabled={!imageBase64 || !result}
            className="bg-green-600 text-white px-6 py-2 rounded"
          >
            View 3D Visualization
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-8 space-y-8">
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-xl font-semibold">Prediction: {result.prediction}</p>
            <p className="text-md mt-1">Confidence: {Number(result.confidence).toFixed(2)}%</p>
            <p className="text-md mt-1">Precision: {Number(result.precision).toFixed(2)}%</p>
            <p className="text-md mt-1">Recall: {Number(result.recall).toFixed(2)}%</p>
            <p className="text-md mt-1">F1-score: {Number(result.f1_score).toFixed(2)}%</p>
            <p className="text-md mt-1">
              Asthma/Mucus Risk: {Number(result.asthma_mucus_risk || 0).toFixed(2)}%
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="font-semibold mb-4">Disease Classification Confidence</h2>
              {classChartData && (
                <Bar
                  data={classChartData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        min: 0,
                        max: 100,
                        ticks: { callback: (value) => `${value}%` },
                      },
                    },
                  }}
                />
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="font-semibold mb-4">Precision / Recall Graph</h2>
              {prChartData && (
                <Line
                  data={prChartData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        min: 0,
                        max: 100,
                        ticks: { callback: (value) => `${value}%` },
                      },
                    },
                  }}
                />
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="font-semibold mb-4">Grad-CAM Heatmap</h2>
            <p className="text-sm text-slate-600 mb-4">
              Highlighted high-response regions on the uploaded X-ray.
            </p>
            {result.gradcam_overlay ? (
              <img
                src={`data:image/png;base64,${result.gradcam_overlay}`}
                alt="Grad-CAM heatmap"
                className="w-full max-w-2xl rounded-lg border"
              />
            ) : (
              <p>No Grad-CAM available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
