const mongoose = require("mongoose");
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const budgetSchema = new mongoose.Schema(
  {
    budgetId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expenseAppUserId: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    categoryId: {
      type: String,
      default: null, // Will be set for custom categories, null for default categories
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Budget amount is required"],
      min: [0, "Budget amount cannot be negative"],
    },
    period: {
      type: String,
      enum: ["Monthly", "Yearly", "Weekly", "Custom"],
      default: "Monthly",
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    rollover: {
      type: Boolean,
      default: false,
    },
    alertThreshold: {
      type: Number,
      default: 80, // Alert when 80% of budget is used
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    template: {
      type: String,
      default: null, // e.g., "Student Budget", "Family Budget"
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  { timestamps: true }
);

// Compound index to ensure unique budget per category and period per user
budgetSchema.index(
  { expenseAppUserId: 1, category: 1, period: 1, startDate: 1 },
  { unique: true }
);

// Pre-save hook to generate budgetId if it doesn't exist
budgetSchema.pre("save", async function (next) {
  if (this.isNew && !this.budgetId) {
    const nanoid = customAlphabet(alphabet, 10);
    this.budgetId = nanoid();
  }
  next();
});

// Validate that endDate is after startDate
budgetSchema.pre("save", function (next) {
  if (this.endDate < this.startDate) {
    next(new Error("End date must be after start date"));
  } else {
    next();
  }
});

const budgetModel = mongoose.model("budgets", budgetSchema);
module.exports = budgetModel;
