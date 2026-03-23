const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { run, get } = require("./config/sqlite");

const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patient");
const doctorRoutes = require("./routes/doctor");
const appointmentRoutes = require("./routes/appointment");
const userRoutes = require("./routes/users");
const aiRoutes = require("./routes/ai");

const PORT = Number(process.env.PORT || 5000);

const normalizeOrigin = (origin) => String(origin || "").trim().replace(/\/+$/, "");
const configuredOrigins = String(process.env.CLIENT_ORIGIN || "*")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const allowAnyOrigin =
  configuredOrigins.length === 0 ||
  configuredOrigins.includes("*");

const isAllowedOrigin = (origin) => {
  if (allowAnyOrigin) return true;
  if (!origin) return true;
  return configuredOrigins.includes(normalizeOrigin(origin));
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.use(cors(corsOptions));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "mediar-backend",
  });
});
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "mediar-backend",
    allowedOrigins: allowAnyOrigin ? ["*"] : configuredOrigins,
  });
});
app.use("/api/patient", patientRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api", authRoutes);

const roomMembers = new Map();

const getRoomList = (room) => {
  const roomMap = roomMembers.get(room);
  if (!roomMap) return [];
  return Array.from(roomMap.entries()).map(([socketId, info]) => ({
    socketId,
    role: info.role,
    name: info.name,
  }));
};

io.on("connection", (socket) => {
  socket.on("join-room", ({ room, role, name }) => {
    if (!room) return;

    socket.join(room);
    socket.data.room = room;
    socket.data.role = role || "patient";

    if (!roomMembers.has(room)) {
      roomMembers.set(room, new Map());
    }
    roomMembers.get(room).set(socket.id, {
      role: role || "patient",
      name: name || "User",
    });

    io.to(room).emit("participants", getRoomList(room));
  });

  socket.on("webrtc-offer", ({ target, sdp }) => {
    if (!target || !sdp) return;
    io.to(target).emit("webrtc-offer", { from: socket.id, sdp });
  });

  socket.on("webrtc-answer", ({ target, sdp }) => {
    if (!target || !sdp) return;
    io.to(target).emit("webrtc-answer", { from: socket.id, sdp });
  });

  socket.on("webrtc-ice", ({ target, candidate }) => {
    if (!target || !candidate) return;
    io.to(target).emit("webrtc-ice", { from: socket.id, candidate });
  });

  socket.on("model-toggle", ({ room, visible }) => {
    if (!room) return;
    socket.to(room).emit("model-toggle", { visible: Boolean(visible) });
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    if (!room || !roomMembers.has(room)) return;

    const roomMap = roomMembers.get(room);
    roomMap.delete(socket.id);
    if (roomMap.size === 0) {
      roomMembers.delete(room);
    } else {
      io.to(room).emit("participants", getRoomList(room));
    }
  });
});

const ensureDemoUsers = async () => {
  const demoUsers = [
    {
      name: "Asha Menon",
      email: "doctor@mediarhealth.com",
      password: "Doctor@123",
      role: "doctor",
      specialization: "Pulmonology",
    },
    {
      name: "Patient User",
      email: "patient@mediarhealth.com",
      password: "Patient@123",
      role: "patient",
      specialization: null,
    },
  ];

  for (const demo of demoUsers) {
    const existing = await get(`SELECT id, name FROM users WHERE email = ?`, [demo.email]);
    let userId = existing?.id;

    if (!existing) {
      const hashedPassword = await bcrypt.hash(demo.password, 10);
      const result = await run(
        `INSERT INTO users (name, email, password, role, specialization)
         VALUES (?, ?, ?, ?, ?)`,
        [demo.name, demo.email, hashedPassword, demo.role, demo.specialization]
      );
      userId = result.id;
    } else if (
      demo.email === "patient@mediarhealth.com" &&
      String(existing.name || "").trim().toLowerCase() === "ravi kumar"
    ) {
      await run(`UPDATE users SET name = ? WHERE id = ?`, [demo.name, existing.id]);
    }

    const currentUser = await get(`SELECT name FROM users WHERE id = ?`, [userId]);
    const mirrorName = currentUser?.name || demo.name;

    await run(
      `INSERT OR REPLACE INTO users_mirror
      (mongo_user_id, name, email, role, specialization)
      VALUES (?, ?, ?, ?, ?)`,
      [String(userId), mirrorName, demo.email, demo.role, demo.specialization]
    );
  }
};

ensureDemoUsers()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`SQLite backend + signaling running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Startup error:", err);
    process.exit(1);
  });
