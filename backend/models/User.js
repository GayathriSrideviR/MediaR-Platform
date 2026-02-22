// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema({
//   name: String,
//   email: { type: String, unique: true },
//   password: String,
//   role: { type: String, enum: ["patient", "doctor"] },
//   specialization: {
//     type: String,
//     required: function () {
//       return this.role === "doctor";
//     }
//   }
// });

// module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["patient", "doctor"],
    required: true
  },
  specialization: {
    type: String
  }
});

module.exports = mongoose.model("User", userSchema);

