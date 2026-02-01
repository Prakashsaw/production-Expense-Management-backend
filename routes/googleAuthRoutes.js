// routes/googleAuthRoutes.js
const express = require("express");
const passport = require("../controllers/auth.googleAuth");
const CLIENT_URL = require("../utils/baseURL");
const refreshTokenModel = require("../models/refreshTokenModel");
const crypto = require("crypto");
const GoogleAuthRoutes = express.Router();

// Helper function to create refresh token
const createRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

// Helper function to save refresh token
const saveRefreshToken = async (expenseAppUserId, refreshToken, req = null) => {
  try {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // 7 days from now

    const refreshTokenDoc = new refreshTokenModel({
      expenseAppUserId,
      refreshToken,
      expiresAt: expirationDate,
      isActive: true,
      deviceInfo: req?.headers["user-agent"] || null,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
    });

    await refreshTokenDoc.save();
    return refreshTokenDoc;
  } catch (error) {
    console.error("Error saving refresh token:", error);
    throw error;
  }
};

// Redirect to Google OAuth
GoogleAuthRoutes.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback
GoogleAuthRoutes.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    try {
      // Ensure user and token are correctly set
      if (!req.user) {
        return res.redirect(`${CLIENT_URL}/login?error=auth_failed`);
      }

      const { user, token } = req.user;

      // Generate refresh token for Google auth users
      const refresh_token = createRefreshToken();
      await saveRefreshToken(user.expenseAppUserId, refresh_token, req);

      // Redirect with the user token, refresh token, and details
      res.redirect(
        `${CLIENT_URL}/google-auth-success?token=${token}&refreshToken=${refresh_token}&expenseAppUserId=${
          user.expenseAppUserId
        }&name=${encodeURIComponent(user.name)}&isVerified=${user.isVerified}`
      );
    } catch (error) {
      console.error("Google callback error:", error);
      res.redirect(`${CLIENT_URL}/login?error=server_error`);
    }
  }
);

module.exports = GoogleAuthRoutes;
