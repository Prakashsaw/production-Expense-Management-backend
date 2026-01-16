// controllers/auth.googleAuth.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const GoogleAuthUserModel = require("../models/model.user.googleAuth");
const dotenv = require("dotenv");
const { customAlphabet } = require("nanoid");
const userModel = require("../models/userModel");

dotenv.config();

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 10); // 10 characters length Nanoid

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // Check if the user exists in GoogleAuthUserModel by Google ID
        let user = await GoogleAuthUserModel.findOne({ googleId: profile.id });

        // If user does not exist, create a new Google auth user with separate expenseAppUserId
        // No linking with email/password users - they are completely separate
        if (!user) {
          // Create a new Google auth user with unique expenseAppUserId
          user = await GoogleAuthUserModel.create({
            expenseAppUserId: nanoid(),
            googleId: profile.id,
            name: profile.displayName,
            email,
            isVerified: true,
          });
        }

        // Generate JWT token
        const token = jwt.sign(
          { expenseAppUserId: user.expenseAppUserId },
          process.env.JWT_SECRETE_KEY,
          { expiresIn: process.env.EXPIRE_IN }
        );

        return done(null, { user, token });
      } catch (err) {
        console.error("Google Auth Error: ", err);
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
