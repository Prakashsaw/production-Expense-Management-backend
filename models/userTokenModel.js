const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "users",
    },
    token: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 7000,
    },
  },
  { timestamps: true }
);

const UserTokenModel = mongoose.model("tokens", tokenSchema);

module.exports = UserTokenModel;
