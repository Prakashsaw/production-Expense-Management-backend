const express = require("express");
const {
  createBudget,
  getAllBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  getBudgetSummary,
} = require("../controllers/budgetController");
const checkUserAuth = require("../middleware/userAuth");

const router = express.Router();

// All budget routes require user authentication
router.use(checkUserAuth);

// Create a new budget
router.post("/create", createBudget);

// Get all budgets
router.get("/all", getAllBudgets);

// Get budget summary/dashboard
router.get("/summary", getBudgetSummary);

// Get a single budget by ID
router.get("/:budgetId", getBudgetById);

// Update a budget
router.put("/:budgetId", updateBudget);

// Delete a budget (soft delete)
router.delete("/:budgetId", deleteBudget);

module.exports = router;
