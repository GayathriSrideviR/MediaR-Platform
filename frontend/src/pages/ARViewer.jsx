import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "aframe";

const ARViewer = () => {
  const { state } = useLocation();

  const rawImage = state?.imageBase64;
  const result = state?.result;
  const confidence = Number(state?.confidence || 0);
  const incomingAsthmaRisk = Number(state?.asthmaMucusRisk);
  const incomingPrecision = Number(state?.precision || 0);
  const incomingRecall = Number(state?.recall || 0);
  const incomingF1 = Number(state?.f1Score || 0);
  const incomingClassProbabilities = state?.classProbabilities || {};
  const incomingHotspots = state?.hotspots;

  const entityRef = useRef(null);
  const [showHotspots, setShowHotspots] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [hotspots, setHotspots] = useState([]);

  const image =
    rawImage?.startsWith("data:image")
      ? rawImage
      : rawImage
      ? `data:image/png;base64,${rawImage}`
      : null;

  useEffect(() => {
    const el = entityRef.current;
    if (!el) return undefined;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseUp = () => {
      dragging = false;
    };

    const onMouseMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;

      el.object3D.rotation.y += dx * 0.005;
      el.object3D.rotation.x += dy * 0.005;

      lastX = e.clientX;
      lastY = e.clientY;
    };

    const canvas = document.querySelector("canvas");
    if (!canvas) return undefined;

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  useEffect(() => {
    const el = entityRef.current;
    if (!el) return undefined;

    if (!autoRotate) return undefined;

    const timer = setInterval(() => {
      if (el.object3D) {
        el.object3D.rotation.y += 0.01;
      }
    }, 16);

    return () => clearInterval(timer);
  }, [autoRotate]);

  useEffect(() => {
    if (Array.isArray(incomingHotspots) && incomingHotspots.length > 0) {
      const mapped = incomingHotspots.map((h, idx) => ({
        x: ((Number.parseFloat(String(h.x).replace("%", "")) / 100) * 1.8 - 0.9).toFixed(2),
        y: (0.9 - (Number.parseFloat(String(h.y).replace("%", "")) / 100) * 1.8).toFixed(2),
        z: 0.26 + idx * 0.01,
      }));
      setHotspots(mapped);
      return;
    }

    const diagnosis = String(result || "").toLowerCase();
    if (diagnosis.includes("covid")) {
      setHotspots([
        { x: "0.34", y: "0.24", z: 0.26 },
        { x: "0.08", y: "-0.12", z: 0.26 },
      ]);
      return;
    }
    if (diagnosis.includes("pneumonia")) {
      setHotspots([
        { x: "0.28", y: "0.06", z: 0.26 },
        { x: "-0.02", y: "-0.36", z: 0.26 },
      ]);
      return;
    }
    setHotspots([]);
  }, [incomingHotspots, result]);

  const getMucusAsthmaRisk = () => {
    if (!Number.isNaN(incomingAsthmaRisk) && incomingAsthmaRisk > 0) {
      return incomingAsthmaRisk;
    }
    if (!result) return 0;
    if (result.toLowerCase().includes("pneumonia")) return Math.max(20, 100 - confidence);
    if (result.toLowerCase().includes("covid")) return Math.max(15, 100 - confidence * 0.9);
    return Math.max(5, 100 - confidence);
  };

  if (!image) return <h2 className="p-6">No image provided</h2>;

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 10,
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setShowHotspots((p) => !p)}
          style={{
            padding: "10px 16px",
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {showHotspots ? "Hide AI Hotspots" : "Show AI Hotspots"}
        </button>

        <button
          onClick={() => setAutoRotate((p) => !p)}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {autoRotate ? "Stop 360 Rotation" : "Start 360 Rotation"}
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 10,
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "10px 12px",
          borderRadius: "8px",
          fontSize: "14px",
        }}
      >
        <div>Diagnosis: {result}</div>
        <div>Model confidence: {confidence.toFixed(2)}%</div>
        <div>Precision: {incomingPrecision.toFixed(2)}%</div>
        <div>Recall: {incomingRecall.toFixed(2)}%</div>
        <div>F1-score: {incomingF1.toFixed(2)}%</div>
        <div>Mucus/Asthma risk: {getMucusAsthmaRisk().toFixed(2)}%</div>
        <div style={{ marginTop: "6px", fontSize: "12px", opacity: 0.9 }}>
          P(COVID): {Number(incomingClassProbabilities["COVID-19"] || 0).toFixed(2)}% | P(Viral Pneumonia):{" "}
          {Number(incomingClassProbabilities["Viral Pneumonia"] || 0).toFixed(2)}% | P(Normal):{" "}
          {Number(incomingClassProbabilities.Normal || 0).toFixed(2)}%
        </div>
      </div>

      <a-scene
        embedded
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
        style={{ width: "100vw", height: "100vh", background: "black" }}
      >
        <a-camera
          position="0 0 6"
          look-controls="enabled: false"
          wasd-controls="enabled: false"
        />

        <a-entity ref={entityRef} position="0 0 -2" scale="1.6 1.6 1.6">
          <a-box
            width="2.4"
            height="3.2"
            depth="0.5"
            src={image}
            material="shader: flat; side: double"
          />

          {showHotspots &&
            hotspots.map((spot, i) => (
              <a-sphere
                key={i}
                position={`${spot.x} ${spot.y} ${spot.z}`}
                radius="0.08"
                color="red"
                animation="property: scale; dir: alternate; dur: 800; to: 1.4 1.4 1.4; loop: true"
              />
            ))}
        </a-entity>

        <a-text
          value={`Diagnosis: ${result}`}
          position="0 -3.6 -2.6"
          align="center"
          color="yellow"
          width="7"
        />
      </a-scene>
    </>
  );
};

export default ARViewer;
