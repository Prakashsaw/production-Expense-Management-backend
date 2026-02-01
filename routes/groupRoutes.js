const express = require("express");
const {
  // Group management
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  addMembers,
  removeMember,
  deleteGroup,
  // Expense management
  addExpense,
  getGroupExpenses,
  updateExpense,
  deleteExpense,
  approveExpense,
  // Settlement management
  calculateSettlements,
  createSettlement,
  getSettlements,
  updateSettlementStatus,
  // Dashboard
  getGroupDashboard,
} = require("../controllers/groupController");
const checkUserAuth = require("../middleware/userAuth");

const router = express.Router();

// All group routes require user authentication
router.use(checkUserAuth);

// ==================== GROUP MANAGEMENT ROUTES ====================

// Create a new group
router.post("/create", createGroup);

// Get all groups for the user
router.get("/all", getAllGroups);

// Get group dashboard/summary
router.get("/:groupId/dashboard", getGroupDashboard);

// Get a single group by ID
router.get("/:groupId", getGroupById);

// Update a group
router.put("/:groupId", updateGroup);

// Add members to a group
router.post("/:groupId/members", addMembers);

// Remove member from group
router.delete("/:groupId/members/:memberId", removeMember);

// Delete a group
router.delete("/:groupId", deleteGroup);

// ==================== EXPENSE MANAGEMENT ROUTES ====================

// Add expense to a group
router.post("/:groupId/expenses", addExpense);

// Get all expenses for a group
router.get("/:groupId/expenses", getGroupExpenses);

// Update an expense
router.put("/expenses/:expenseId", updateExpense);

// Delete an expense
router.delete("/expenses/:expenseId", deleteExpense);

// Approve an expense
router.post("/expenses/:expenseId/approve", approveExpense);

// ==================== SETTLEMENT MANAGEMENT ROUTES ====================

// Calculate settlements (who owes whom)
router.get("/:groupId/settlements/calculate", calculateSettlements);

// Get all settlements for a group
router.get("/:groupId/settlements", getSettlements);

// Create a settlement
router.post("/:groupId/settlements", createSettlement);

// Update settlement status
router.put("/settlements/:settlementId", updateSettlementStatus);

module.exports = router;
