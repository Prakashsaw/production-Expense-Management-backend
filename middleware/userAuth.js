const GoogleAuthUserModel = require("../models/model.user.googleAuth");
const userModel = require("../models/userModel");
const jwt = require("jsonwebtoken");

const checkUserAuth = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith("Bearer")) {
    return res.status(401).send({
      status: "failed",
      message: "Unauthorized: No token provided, login again...!",
    });
  }

  try {
    // Extract token from header
    const token = authorization.split(" ")[1];

    // Verify token
    const { expenseAppUserId } = jwt.verify(token, process.env.JWT_SECRETE_KEY);

    // Find user in both collections using $or
    const user =
      (await userModel
        .findOne({ expenseAppUserId })
        .select("-password")
        .lean()) ||
      (await GoogleAuthUserModel.findOne({ expenseAppUserId })
        .select("-googleId")
        .lean());

    if (!user) {
      return res.status(401).send({
        status: "failed",
        message: "Unauthorized: User not found, login again...!",
      });
    }

    // Attach user object to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).send({
      status: "failed",
      message: "Unauthorized: Invalid or expired token, login again...!",
    });
  }
};

module.exports = checkUserAuth;
