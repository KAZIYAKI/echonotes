// SCRUM-11 — As a student, I want to register and log in, so that my
// lectures and study kits are saved to my account.
//
// Matches the Class Diagram: Person (abstract) -> Student.

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10; // meets NFR-03: bcrypt cost factor >= 10

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: true }, // used by admin activate/deactivate (SCRUM-12)
    courses: [{ type: String }],
  },
  { timestamps: true }
);

// Hash a plaintext password before saving. Never store plaintext (NFR-03).
studentSchema.statics.hashPassword = async function (plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

// Compare a plaintext password against the stored hash at login time.
studentSchema.methods.checkPassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Never leak the password hash in API responses.
studentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model("Student", studentSchema);
