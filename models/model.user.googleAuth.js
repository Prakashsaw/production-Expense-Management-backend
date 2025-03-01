// models/model.user.googleAuth.js
const mongoose = require("mongoose");

const googleAuthUserSchema = new mongoose.Schema(
  {
    expenseAppUserId: {
      type: String,
      required: true,
      unique: true,
      ref: "users",
    },
    googleId: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const GoogleAuthUserModel = mongoose.model(
  "GoogleAuthUser",
  googleAuthUserSchema
);

module.exports = GoogleAuthUserModel;
