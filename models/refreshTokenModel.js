const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    expenseAppUserId: {
      type: String,
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deviceInfo: {
      type: String,
      default: null, // Optional: Store device/browser info
    },
    ipAddress: {
      type: String,
      default: null, // Optional: Store IP address
    },
  },
  { timestamps: true }
);

// Compound index for faster lookups
refreshTokenSchema.index({ expenseAppUserId: 1, isActive: 1 });
refreshTokenSchema.index({ refreshToken: 1, isActive: 1 });

// TTL index for auto-deleting expired tokens (MongoDB will delete documents after expiresAt date)
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook to set expiration to 7 days from now
refreshTokenSchema.pre("save", function (next) {
  if (this.isNew && !this.expiresAt) {
    // Set expiration to 7 days from now
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);
    this.expiresAt = expirationDate;
  }
  next();
});

const refreshTokenModel = mongoose.model("refreshTokens", refreshTokenSchema);
module.exports = refreshTokenModel;
