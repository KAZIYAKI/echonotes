// SCRUM-11 — protects any route that needs a logged-in student.
// Also enforces the "deactivated account is rejected" part of SCRUM-12.

const jwt = require("jsonwebtoken");
const Student = require("../models/Student");

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const student = await Student.findById(payload.sub);

    if (!student) {
      return res.status(401).json({ error: "Account no longer exists" });
    }
    if (!student.isActive) {
      // SCRUM-12 acceptance criterion: a deactivated student's next request is rejected.
      return res.status(403).json({ error: "This account has been deactivated" });
    }

    req.student = student;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = requireAuth;
