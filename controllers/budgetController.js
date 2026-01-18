const budgetModel = require("../models/budgetModel");
const transectionModel = require("../models/transectionModel");
const moment = require("moment");
const { customAlphabet } = require("nanoid");
const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Create a new budget
const createBudget = async (req, res) => {
  try {
    const { category, categoryId, amount, period, startDate, endDate, rollover, alertThreshold, template, notes } = req.body;

    // Validate required fields
    if (!category || !amount || !period || !startDate || !endDate) {
      return res.status(400).json({
        status: "failed",
        message: "Category, amount, period, start date, and end date are required",
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        status: "failed",
        message: "Budget amount must be greater than 0",
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({
        status: "failed",
        message: "End date must be after start date",
      });
    }

    // Check if budget already exists for this category and period
    const existingBudget = await budgetModel.findOne({
      expenseAppUserId: req.user.expenseAppUserId,
      category: category.trim(),
      period: period,
      startDate: start,
      endDate: end,
      isActive: true,
    });

    if (existingBudget) {
      return res.status(400).json({
        status: "failed",
        message: "Budget already exists for this category and period",
      });
    }

    // Generate unique budgetId
    const nanoid = customAlphabet(alphabet, 10);
    let budgetId;
    let isUnique = false;

    // Ensure budgetId is unique
    while (!isUnique) {
      budgetId = nanoid();
      const existingId = await budgetModel.findOne({ budgetId });
      if (!existingId) {
        isUnique = true;
      }
    }

    // Create new budget
    const newBudget = new budgetModel({
      budgetId,
      expenseAppUserId: req.user.expenseAppUserId,
      category: category.trim(),
      categoryId: categoryId || null, // Store categoryId if provided (for custom categories)
      amount: Number(amount),
      period: period,
      startDate: start,
      endDate: end,
      rollover: rollover || false,
      alertThreshold: alertThreshold || 80,
      template: template || null,
      notes: notes || null,
      isActive: true,
    });

    await newBudget.save();

    res.status(201).json({
      status: "success",
      message: "Budget created successfully",
      budget: newBudget,
    });
  } catch (error) {
    console.error("Error creating budget:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to create budget",
      error: error.message,
    });
  }
};

// Get all budgets for a user
const getAllBudgets = async (req, res) => {
  try {
    const { period, isActive } = req.query;

    const query = {
      expenseAppUserId: req.user.expenseAppUserId,
    };

    if (period) {
      query.period = period;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const budgets = await budgetModel.find(query).sort({ createdAt: -1 });

    // Calculate actual spending for each budget
    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget) => {
        const actualSpending = await transectionModel.aggregate([
          {
            $match: {
              expenseAppUserId: req.user.expenseAppUserId,
              category: budget.category,
              type: "Expense",
              date: {
                $gte: new Date(budget.startDate),
                $lte: new Date(budget.endDate),
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]);

        const spent = actualSpending.length > 0 ? actualSpending[0].total : 0;
        const remaining = budget.amount - spent;
        const percentageUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
        const isOverBudget = spent > budget.amount;
        const alertStatus = percentageUsed >= budget.alertThreshold ? "alert" : "normal";

        return {
          ...budget.toObject(),
          spent: spent,
          remaining: remaining,
          percentageUsed: Math.round(percentageUsed * 100) / 100,
          isOverBudget: isOverBudget,
          alertStatus: alertStatus,
        };
      })
    );

    res.status(200).json({
      status: "success",
      message: "Budgets fetched successfully",
      budgets: budgetsWithSpending,
    });
  } catch (error) {
    console.error("Error fetching budgets:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch budgets",
      error: error.message,
    });
  }
};

// Get a single budget by ID
const getBudgetById = async (req, res) => {
  try {
    const { budgetId } = req.params;

    const budget = await budgetModel.findOne({
      budgetId: budgetId,
      expenseAppUserId: req.user.expenseAppUserId,
    });

    if (!budget) {
      return res.status(404).json({
        status: "failed",
        message: "Budget not found or you don't have access to this budget",
      });
    }

    // Calculate actual spending
    const actualSpending = await transectionModel.aggregate([
      {
        $match: {
          expenseAppUserId: req.user.expenseAppUserId,
          category: budget.category,
          type: "Expense",
          date: {
            $gte: new Date(budget.startDate),
            $lte: new Date(budget.endDate),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const spent = actualSpending.length > 0 ? actualSpending[0].total : 0;
    const remaining = budget.amount - spent;
    const percentageUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    const isOverBudget = spent > budget.amount;
    const alertStatus = percentageUsed >= budget.alertThreshold ? "alert" : "normal";

    res.status(200).json({
      status: "success",
      message: "Budget fetched successfully",
      budget: {
        ...budget.toObject(),
        spent: spent,
        remaining: remaining,
        percentageUsed: Math.round(percentageUsed * 100) / 100,
        isOverBudget: isOverBudget,
        alertStatus: alertStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching budget:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch budget",
      error: error.message,
    });
  }
};

// Update a budget
const updateBudget = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const { category, categoryId, amount, period, startDate, endDate, rollover, alertThreshold, template, notes, isActive } = req.body;

    // Find the budget and verify ownership
    const budget = await budgetModel.findOne({
      budgetId: budgetId,
      expenseAppUserId: req.user.expenseAppUserId,
    });

    if (!budget) {
      return res.status(404).json({
        status: "failed",
        message: "Budget not found or you don't have access to this budget",
      });
    }

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        return res.status(400).json({
          status: "failed",
          message: "End date must be after start date",
        });
      }
    }

    // Update budget
    const updateData = {};
    if (category !== undefined) updateData.category = category.trim();
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (amount !== undefined) updateData.amount = Number(amount);
    if (period !== undefined) updateData.period = period;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (rollover !== undefined) updateData.rollover = rollover;
    if (alertThreshold !== undefined) updateData.alertThreshold = alertThreshold;
    if (template !== undefined) updateData.template = template;
    if (notes !== undefined) updateData.notes = notes;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedBudget = await budgetModel.findOneAndUpdate(
      { budgetId, expenseAppUserId: req.user.expenseAppUserId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: "success",
      message: "Budget updated successfully",
      budget: updatedBudget,
    });
  } catch (error) {
    console.error("Error updating budget:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to update budget",
      error: error.message,
    });
  }
};

// Delete a budget (soft delete)
const deleteBudget = async (req, res) => {
  try {
    const { budgetId } = req.params;

    // Find the budget and verify ownership
    const budget = await budgetModel.findOne({
      budgetId: budgetId,
      expenseAppUserId: req.user.expenseAppUserId,
    });

    if (!budget) {
      return res.status(404).json({
        status: "failed",
        message: "Budget not found or you don't have access to this budget",
      });
    }

    // Soft delete (set isActive to false): Will do this later while budget delettion as this will increate data base size
    // await budgetModel.findOneAndUpdate(
    //   { budgetId, expenseAppUserId: req.user.expenseAppUserId },
    //   { $set: { isActive: false } },
    //   { new: true }
    // );

    // Permanent delete
    await budgetModel.findOneAndDelete({
      budgetId,
      expenseAppUserId: req.user.expenseAppUserId,
    });

    res.status(200).json({
      status: "success",
      message: "Budget deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting budget:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to delete budget",
      error: error.message,
    });
  }
};

// Get budget summary/dashboard data
const getBudgetSummary = async (req, res) => {
  try {
    const { period } = req.query;
    const currentPeriod = period || "Monthly";

    // Get current period dates
    let startDate, endDate;
    if (currentPeriod === "Monthly") {
      startDate = moment().startOf("month").toDate();
      endDate = moment().endOf("month").toDate();
    } else if (currentPeriod === "Yearly") {
      startDate = moment().startOf("year").toDate();
      endDate = moment().endOf("year").toDate();
    } else if (currentPeriod === "Weekly") {
      startDate = moment().startOf("week").toDate();
      endDate = moment().endOf("week").toDate();
    }

    // Get active budgets for current period
    const budgets = await budgetModel.find({
      expenseAppUserId: req.user.expenseAppUserId,
      period: currentPeriod,
      isActive: true,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    });

    // Calculate totals
    let totalBudget = 0;
    let totalSpent = 0;
    const budgetsWithSpending = [];

    for (const budget of budgets) {
      const actualSpending = await transectionModel.aggregate([
        {
          $match: {
            expenseAppUserId: req.user.expenseAppUserId,
            category: budget.category,
            type: "Expense",
            date: {
              $gte: new Date(budget.startDate),
              $lte: new Date(budget.endDate),
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      const spent = actualSpending.length > 0 ? actualSpending[0].total : 0;
      totalBudget += budget.amount;
      totalSpent += spent;

      budgetsWithSpending.push({
        ...budget.toObject(),
        spent: spent,
        remaining: budget.amount - spent,
        percentageUsed: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
        isOverBudget: spent > budget.amount,
      });
    }

    const totalRemaining = totalBudget - totalSpent;
    const overallPercentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    res.status(200).json({
      status: "success",
      message: "Budget summary fetched successfully",
      summary: {
        period: currentPeriod,
        totalBudget: totalBudget,
        totalSpent: totalSpent,
        totalRemaining: totalRemaining,
        overallPercentageUsed: Math.round(overallPercentageUsed * 100) / 100,
        budgets: budgetsWithSpending,
      },
    });
  } catch (error) {
    console.error("Error fetching budget summary:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch budget summary",
      error: error.message,
    });
  }
};

module.exports = {
  createBudget,
  getAllBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  getBudgetSummary,
};
