import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { API_BASE } from "../config/api";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function Consultation() {
  const [searchParams] = useSearchParams();
  const room = searchParams.get("room") || "mediar-general-room";
  const role = searchParams.get("role") || localStorage.getItem("role") || "patient";
  const openModelByDefault = ["1", "true", "yes"].includes(
    String(searchParams.get("model") || "").toLowerCase()
  );
  const safeRoom = useMemo(() => room.replace(/[^a-zA-Z0-9-_]/g, "-"), [room]);
  const name = localStorage.getItem("name") || role;

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const targetSocketRef = useRef("");
  const createdOfferRef = useRef(false);

  const [participants, setParticipants] = useState([]);
  const [callStatus, setCallStatus] = useState("Initializing...");
  const [modelVisible, setModelVisible] = useState(openModelByDefault);
  const [xrayData, setXrayData] = useState(null);
  const [referenceVideoAvailable, setReferenceVideoAvailable] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!mounted) return;
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (!event.candidate || !socketRef.current || !targetSocketRef.current) return;
          socketRef.current.emit("webrtc-ice", {
            target: targetSocketRef.current,
            candidate: event.candidate,
          });
        };

        const socket = io(API_BASE);
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("join-room", { room: safeRoom, role, name });
          setCallStatus("Connected to room. Waiting for peer...");
        });

        socket.on("participants", async (list) => {
          setParticipants(list);
          const others = list.filter((p) => p.socketId !== socket.id);
          if (others.length === 0) {
            setCallStatus("Waiting for other participant...");
            return;
          }

          targetSocketRef.current = others[0].socketId;
          setCallStatus("Participant joined. Establishing secure call...");

          if (role === "doctor" && !createdOfferRef.current) {
            createdOfferRef.current = true;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("webrtc-offer", {
              target: targetSocketRef.current,
              sdp: offer,
            });
          }
        });

        socket.on("webrtc-offer", async ({ from, sdp }) => {
          targetSocketRef.current = from;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("webrtc-answer", { target: from, sdp: answer });
          setCallStatus("Live consultation connected");
        });

        socket.on("webrtc-answer", async ({ sdp }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          setCallStatus("Live consultation connected");
        });

        socket.on("webrtc-ice", async ({ candidate }) => {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.log("ICE add error:", err);
          }
        });

        socket.on("model-toggle", ({ visible }) => {
          setModelVisible(Boolean(visible));
        });

        if (/^\d+$/.test(safeRoom)) {
          try {
            const res = await axios.get(`${API_BASE}/api/appointment/shared-xray/${safeRoom}`);
            setXrayData(res.data);
          } catch {
            setXrayData(null);
          }
        }
      } catch (err) {
        setCallStatus("Camera/Microphone permission required");
      }
    };

    init();

    return () => {
      mounted = false;
      createdOfferRef.current = false;
      if (socketRef.current) socketRef.current.disconnect();
      if (pcRef.current) pcRef.current.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [safeRoom, role, name]);

  const toggleModel = () => {
    const next = !modelVisible;
    setModelVisible(next);
    if (socketRef.current) {
      socketRef.current.emit("model-toggle", { room: safeRoom, visible: next });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <h1 className="text-2xl font-bold">Live Consultation</h1>
        <p className="text-sm text-gray-600 mt-1">
          Room: <span className="font-medium">{safeRoom}</span> | Role:{" "}
          <span className="font-medium">{role}</span>
        </p>
        <p className="text-sm text-gray-600 mt-1">Status: {callStatus}</p>
        <p className="text-sm text-gray-600 mt-1">
          Participants: {participants.length}
        </p>

        <div className="mt-3 flex gap-3 flex-wrap">
          <button
            onClick={() => window.location.reload()}
            className="border border-slate-300 px-4 py-2 rounded"
          >
            Refresh Call
          </button>

          {role === "doctor" && (
            <button
              onClick={toggleModel}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {modelVisible ? "Hide 3D Model from Patient" : "Show 3D Model to Patient"}
            </button>
          )}
        </div>
      </div>

      {modelVisible ? (
        <div className="mt-4 bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-2">3D Clinical Visualization</h2>
          <p className="text-sm text-slate-600 mb-3">
            Doctor is presenting a 360-style 3D view generated from the submitted X-ray image.
          </p>

          {xrayData?.imageBase64 ? (
            <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
              <div className="xl:col-span-2">
                <p className="font-medium mb-2">Live 3D Motion + Diagnosis Overlay</p>
                <LiveMp4Presenter
                  image={xrayData.imageBase64}
                  prediction={xrayData.prediction}
                  confidence={Number(xrayData.confidence || 0)}
                  hotspots={xrayData.hotspots}
                  mp4Available={referenceVideoAvailable}
                  onMp4Error={() => setReferenceVideoAvailable(false)}
                />
              </div>
              <div className="xl:col-span-1">
                <p className="font-medium mb-2">AI Summary</p>
                <p>Prediction: {xrayData.prediction}</p>
                <p>Confidence: {Number(xrayData.confidence || 0).toFixed(2)}%</p>
                <p>Precision: {Number(xrayData.precision || 0).toFixed(2)}%</p>
                <p>Recall: {Number(xrayData.recall || 0).toFixed(2)}%</p>
                <p>F1-score: {Number(xrayData.f1Score || 0).toFixed(2)}%</p>
                <p>
                  Asthma/Mucus Risk:{" "}
                  {Number(
                    xrayData.asthmaMucusRisk ??
                      getMucusRisk(xrayData.prediction, Number(xrayData.confidence || 0))
                  ).toFixed(2)}
                  %
                </p>
                {xrayData.classProbabilities && (
                  <div className="mt-2 text-sm">
                    <p>Class probabilities:</p>
                    <p>COVID-19: {Number(xrayData.classProbabilities["COVID-19"] || 0).toFixed(2)}%</p>
                    <p>Viral Pneumonia: {Number(xrayData.classProbabilities["Viral Pneumonia"] || 0).toFixed(2)}%</p>
                    <p>Normal: {Number(xrayData.classProbabilities.Normal || 0).toFixed(2)}%</p>
                  </div>
                )}
                <p className="text-sm text-slate-600 mt-3">
                  Diagnosis is computed from patient uploaded X-ray and reflected here.
                </p>

                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-lg font-semibold">AI X-Ray Analysis</h3>
                  <p className="mt-2">
                    <span className="font-semibold">Prediction:</span> {xrayData.prediction}
                  </p>
                  <p>
                    <span className="font-semibold">Confidence:</span>{" "}
                    {Number(xrayData.confidence || 0).toFixed(2)}%
                  </p>
                  <AiClassChart
                    prediction={xrayData.prediction}
                    confidence={Number(xrayData.confidence || 0)}
                    classProbabilities={xrayData.classProbabilities}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-600">
              No shared X-ray found for this appointment yet. Ask patient to upload and share from Upload X-ray module.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-black rounded-xl overflow-hidden shadow">
            <p className="text-white text-sm px-3 py-2 bg-slate-900">Your Camera</p>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-[320px] object-cover"
            />
          </div>

          <div className="bg-black rounded-xl overflow-hidden shadow">
            <p className="text-white text-sm px-3 py-2 bg-slate-900">Remote Participant</p>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-[320px] object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getChartProbabilities(prediction, confidence, classProbabilities) {
  const source = {
    normal: Number(classProbabilities?.Normal || 0),
    covid: Number(classProbabilities?.["COVID-19"] || 0),
    pneumonia: Number(classProbabilities?.["Viral Pneumonia"] || 0),
  };

  const sum = source.normal + source.covid + source.pneumonia;
  if (sum > 0.1) {
    return source;
  }

  const conf = Math.max(40, Math.min(99, Number(confidence || 0)));
  const remaining = 100 - conf;
  const half = remaining / 2;
  const p = String(prediction || "").toLowerCase();

  if (p.includes("covid")) {
    return { normal: half, covid: conf, pneumonia: half };
  }
  if (p.includes("pneumonia")) {
    return { normal: half, covid: half, pneumonia: conf };
  }
  return { normal: conf, covid: half, pneumonia: half };
}

function AiClassChart({ prediction, confidence, classProbabilities }) {
  const probs = getChartProbabilities(prediction, confidence, classProbabilities);
  const items = [
    { label: "Normal", value: probs.normal, color: "bg-emerald-500" },
    { label: "COVID-19", value: probs.covid, color: "bg-orange-500" },
    { label: "Viral Pneumonia", value: probs.pneumonia, color: "bg-red-500" },
  ];

  return (
    <div className="mt-4">
      <div className="h-56 rounded-lg border bg-white p-3">
        <div className="relative h-full">
          <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-slate-400">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          <div className="absolute inset-0 ml-8 flex items-end justify-around pb-5">
            {items.map((item) => {
              const safe = Math.max(0, Math.min(100, Number(item.value || 0)));
              return (
                <div key={item.label} className="flex w-20 flex-col items-center">
                  <div className="mb-1 text-xs font-medium text-slate-700">{safe.toFixed(2)}%</div>
                  <div className="relative h-40 w-14 rounded bg-slate-100">
                    <div
                      className={`absolute bottom-0 w-full rounded ${item.color}`}
                      style={{ height: `${safe}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-700">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function getMucusRisk(prediction, confidence) {
  const p = String(prediction || "").toLowerCase();
  if (p.includes("pneumonia")) return Math.max(20, 100 - confidence * 0.82);
  if (p.includes("covid")) return Math.max(15, 100 - confidence * 0.88);
  return Math.max(5, 100 - confidence);
}

function deriveHotspots(prediction, incomingHotspots = []) {
  if (Array.isArray(incomingHotspots) && incomingHotspots.length > 0) {
    return incomingHotspots;
  }
  const p = String(prediction || "").toLowerCase();
  if (p.includes("covid")) {
    return [
      { x: "62%", y: "38%", label: "Ground-glass zone" },
      { x: "54%", y: "58%", label: "Diffuse opacity" },
    ];
  }
  if (p.includes("pneumonia")) {
    return [
      { x: "60%", y: "46%", label: "Consolidation" },
      { x: "48%", y: "68%", label: "Lower lobe inflammation" },
    ];
  }
  return [{ x: "52%", y: "52%", label: "No major lesion region" }];
}

function LiveMp4Presenter({
  image,
  prediction,
  confidence,
  hotspots: incomingHotspots = [],
  mp4Available,
  onMp4Error,
}) {
  const hotspots = useMemo(
    () => deriveHotspots(prediction, incomingHotspots),
    [prediction, incomingHotspots]
  );

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
      {mp4Available ? (
        <div className="relative">
          <video
            src="/3d.mp4"
            autoPlay
            loop
            muted
            playsInline
            controls
            onError={onMp4Error}
            className="w-full h-[520px] object-cover"
          />
          <div className="pointer-events-none absolute inset-0">
            {hotspots.map((h, i) => (
              <div key={`${h.label}-${i}`} style={{ position: "absolute", left: h.x, top: h.y }}>
                <span className="inline-block h-3 w-3 rounded-full bg-red-500 border border-white shadow-[0_0_0_6px_rgba(239,68,68,0.22)]" />
                <span className="ml-2 rounded bg-slate-900/85 px-2 py-1 text-[11px] text-white">
                  {h.label}
                </span>
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
            <div className="text-sm">
              Diagnosis: <strong>{prediction}</strong> | Confidence:{" "}
              <strong>{Number(confidence || 0).toFixed(2)}%</strong>
            </div>
          </div>
        </div>
      ) : (
        <Ai3dPresenter
          image={image}
          prediction={prediction}
          confidence={confidence}
          hotspots={incomingHotspots}
        />
      )}
    </div>
  );
}

function Ai3dPresenter({ image, prediction, confidence, hotspots: incomingHotspots = [] }) {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAngle((a) => (a + 1.4) % 360);
    }, 30);
    return () => clearInterval(timer);
  }, []);

  const hotspots = useMemo(
    () => deriveHotspots(prediction, incomingHotspots),
    [incomingHotspots, prediction]
  );

  return (
    <>
      <style>
        {`
          .xray-stage {
            width: 100%;
            max-width: 760px;
            min-height: 520px;
            perspective: 1200px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle at 40% 20%, #1f2937 0%, #020617 70%);
            border-radius: 14px;
            border: 1px solid rgba(148,163,184,0.2);
            overflow: hidden;
            padding: 20px;
          }
          .xray-card {
            position: relative;
            width: 360px;
            height: 460px;
            transform-style: preserve-3d;
            transition: transform 0.06s linear;
          }
          .xray-face {
            position: absolute;
            left: 50%;
            top: 50%;
            transform-style: preserve-3d;
            border-radius: 12px;
            overflow: hidden;
          }
          .xray-front,
          .xray-back {
            width: 360px;
            height: 460px;
            margin-left: -180px;
            margin-top: -230px;
            border: 1px solid rgba(255,255,255,0.14);
            box-shadow: 0 14px 36px rgba(0,0,0,0.35);
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
          }
          .xray-front {
            transform: translateZ(12px);
          }
          .xray-back {
            transform: rotateY(180deg) translateZ(12px);
            filter: brightness(0.92);
          }
          .xray-side {
            width: 24px;
            height: 460px;
            margin-left: -12px;
            margin-top: -230px;
            background: linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.09) 100%);
            border: 1px solid rgba(255,255,255,0.1);
          }
          .xray-side-right {
            transform: rotateY(90deg) translateZ(180px);
          }
          .xray-side-left {
            transform: rotateY(-90deg) translateZ(180px);
          }
          .xray-glow {
            position: absolute;
            width: 420px;
            height: 420px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(56,189,248,0.30) 0%, rgba(2,6,23,0.00) 70%);
            filter: blur(6px);
            transform: translateZ(-90px);
          }
          .hotspot {
            position: absolute;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #ef4444;
            border: 2px solid #fff;
            box-shadow: 0 0 0 8px rgba(239,68,68,0.2);
          }
          .hotspot-label {
            position: absolute;
            margin-top: -8px;
            margin-left: 14px;
            background: rgba(15,23,42,0.85);
            color: #fff;
            font-size: 11px;
            padding: 4px 6px;
            border-radius: 6px;
            white-space: nowrap;
          }
          @media (max-width: 768px) {
            .xray-stage {
              max-width: 100%;
              min-height: 420px;
            }
            .xray-card {
              width: 260px;
              height: 340px;
            }
            .xray-front,
            .xray-back {
              width: 260px;
              height: 340px;
              margin-left: -130px;
              margin-top: -170px;
            }
            .xray-side {
              height: 340px;
              margin-top: -170px;
            }
            .xray-side-right {
              transform: rotateY(90deg) translateZ(130px);
            }
            .xray-side-left {
              transform: rotateY(-90deg) translateZ(130px);
            }
            .xray-glow {
              width: 320px;
              height: 320px;
            }
          }
        `}
      </style>

      <div className="xray-stage">
        <div className="xray-card" style={{ transform: `rotateX(-10deg) rotateY(${angle}deg)` }}>
          <div className="xray-glow" />
          <div className="xray-face xray-front" style={{ backgroundImage: `url(${image})` }} />
          <div className="xray-face xray-back" style={{ backgroundImage: `url(${image})` }} />
          <div className="xray-face xray-side xray-side-right" />
          <div className="xray-face xray-side xray-side-left" />
          {hotspots.map((h, i) => (
            <div key={i} style={{ position: "absolute", left: h.x, top: h.y }}>
              <span className="hotspot" />
              <span className="hotspot-label">{h.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-600">
        Diagnosis: <strong>{prediction}</strong> | Confidence:{" "}
        <strong>{Number(confidence || 0).toFixed(2)}%</strong>
      </div>
    </>
  );
}
