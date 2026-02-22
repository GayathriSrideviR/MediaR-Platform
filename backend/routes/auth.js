const express = require("express");
const bcrypt = require("bcryptjs");
const { run, get } = require("../config/sqlite");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, specialization } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All required fields are needed" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await get(`SELECT id FROM users WHERE email = ?`, [normalizedEmail]);

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await run(
      `INSERT INTO users (name, email, password, role, specialization)
       VALUES (?, ?, ?, ?, ?)`,
      [name, normalizedEmail, hashedPassword, role, role === "doctor" ? specialization || "" : null]
    );

    await run(
      `INSERT OR REPLACE INTO users_mirror
       (mongo_user_id, name, email, role, specialization)
       VALUES (?, ?, ?, ?, ?)`,
      [String(insertResult.id), name, normalizedEmail, role, role === "doctor" ? specialization || "" : null]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await get(
      `SELECT id, name, email, password, role FROM users WHERE email = ?`,
      [email.toLowerCase().trim()]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        _id: String(user.id),
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;
