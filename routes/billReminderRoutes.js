const express = require("express");
const {
  createBillReminder,
  getAllBillReminders,
  getBillReminderById,
  updateBillReminder,
  deleteBillReminder,
  markBillAsPaid,
  markBillAsUnpaid,
  getUpcomingBills,
} = require("../controllers/billReminderController");
const { checkAndSendReminders } = require("../services/billReminderScheduler");
const checkUserAuth = require("../middleware/userAuth");

const router = express.Router();

// All bill reminder routes require user authentication
router.use(checkUserAuth);

// Create a new bill reminder
router.post("/create", createBillReminder);

// Get all bill reminders for the user
router.get("/all", getAllBillReminders);

// Get upcoming bills (due within next 7 days)
router.get("/upcoming", getUpcomingBills);

// Test endpoint to manually trigger reminder check (for testing only)
// Uncomment this route for testing purposes
// router.post("/test-send-reminders", async (req, res) => {
//   try {
//     console.log("Manual reminder test triggered by user:", req.user.expenseAppUserId);
//     await checkAndSendReminders();
//     res.status(200).json({
//       status: "success",
//       message: "Reminder check completed. Check your email if you have bills due soon.",
//     });
//   } catch (error) {
//     console.error("Error in test reminder endpoint:", error);
//     res.status(500).json({
//       status: "failed",
//       message: "Failed to send test reminders",
//       error: error.message,
//     });
//   }
// });

// Get a single bill reminder by ID
router.get("/:reminderId", getBillReminderById);

// Update a bill reminder by ID
router.put("/:reminderId", updateBillReminder);

// Mark bill as paid
router.patch("/:reminderId/mark-paid", markBillAsPaid);

// Mark bill as unpaid
router.patch("/:reminderId/mark-unpaid", markBillAsUnpaid);

// Delete a bill reminder by ID (soft delete)
router.delete("/:reminderId", deleteBillReminder);

module.exports = router;
