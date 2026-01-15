const express = require("express");
const {
  requestAdminAccess,
  adminLogin,
  getDashboardData,
  getAdminProfile,
  updateAdminPhone,
  deactivateAdminAccount,
} = require("../controllers/adminController");

//router object
const router = express.Router();

//routes
// POST: Request Admin Access
router.post("/request-access", requestAdminAccess);

// POST: Admin Login
router.post("/login", adminLogin);

// POST: Get Dashboard Data
router.post("/dashboard", getDashboardData);

// POST: Get Admin Profile
router.post("/profile", getAdminProfile);

// PUT: Update Admin Phone Number
router.put("/update-phone", updateAdminPhone);

// PUT: Deactivate Admin Account
router.put("/deactivate", deactivateAdminAccount);

module.exports = router;
