// SCRUM-11 — As a student, I want to register and log in, so that my
// lectures and study kits are saved to my account.
//
// Acceptance criteria covered here:
//  - Registering with a valid email creates an account and hashes the
//    password (bcrypt, cost >= 10)
//  - Logging in with correct credentials returns a JWT that expires
//    after 24 hours
//  - Logging in with incorrect credentials is rejected with a clear error

const express = require("express");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function issueToken(student) {
  return jwt.sign({ sub: student._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(422).json({ error: "name, email, and password are all required" });
  }
  if (!isValidEmail(email)) {
    return res.status(422).json({ error: "Please provide a valid email address" });
  }
  if (password.length < 8) {
    return res.status(422).json({ error: "Password must be at least 8 characters" });
  }

  const existing = await Student.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await Student.hashPassword(password);
  const student = await Student.create({ name, email, passwordHash });

  const token = issueToken(student);
  return res.status(201).json({ student, token });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).json({ error: "email and password are required" });
  }

  const student = await Student.findOne({ email: email.toLowerCase() });
  if (!student) {
    // Deliberately vague — don't reveal whether the email exists.
    return res.status(401).json({ error: "Incorrect email or password" });
  }
  if (!student.isActive) {
    return res.status(403).json({ error: "This account has been deactivated" });
  }

  const passwordMatches = await student.checkPassword(password);
  if (!passwordMatches) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }

  const token = issueToken(student);
  return res.status(200).json({ student, token });
});

module.exports = router;
