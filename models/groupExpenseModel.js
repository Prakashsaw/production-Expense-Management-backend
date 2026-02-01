const mongoose = require("mongoose");
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const groupExpenseSchema = new mongoose.Schema(
  {
    expenseId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    groupId: {
      type: String,
      required: true,
      index: true,
    },
    addedBy: {
      type: String, // expenseAppUserId
      required: true,
      index: true,
    },
    expenseName: {
      type: String,
      required: [true, "Expense name is required"],
      trim: true,
      maxlength: [200, "Expense name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    currency: {
      type: String,
      default: "INR",
      maxlength: [3, "Currency code must be 3 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    splitMethod: {
      type: String,
      enum: ["Equal", "Custom", "Percentage", "Exact"],
      default: "Equal",
      required: true,
    },
    splits: [
      {
        expenseAppUserId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: [0, "Split amount cannot be negative"],
        },
        percentage: {
          type: Number,
          default: 0,
          min: [0, "Percentage cannot be negative"],
          max: [100, "Percentage cannot exceed 100"],
        },
        isPaid: {
          type: Boolean,
          default: false,
        },
        paidAt: {
          type: Date,
          default: null,
        },
      },
    ],
    paidBy: {
      expenseAppUserId: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
    },
    isSettled: {
      type: Boolean,
      default: false,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    approvedBy: [
      {
        expenseAppUserId: {
          type: String,
          required: true,
        },
        approvedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    receipt: {
      url: {
        type: String,
        default: null,
      },
      uploadedAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
);

// Compound indexes for faster queries
groupExpenseSchema.index({ groupId: 1, isActive: 1, date: -1 });
groupExpenseSchema.index({ groupId: 1, isSettled: 1 });
groupExpenseSchema.index({ "splits.expenseAppUserId": 1, isSettled: 1 });

// Pre-save hook to generate expenseId if it doesn't exist
groupExpenseSchema.pre("save", async function (next) {
  if (this.isNew && !this.expenseId) {
    const nanoid = customAlphabet(alphabet, 12);
    let isUnique = false;
    let generatedId;

    while (!isUnique) {
      generatedId = nanoid();
      const existingExpense = await this.constructor.findOne({ expenseId: generatedId });
      if (!existingExpense) {
        isUnique = true;
      }
    }
    this.expenseId = generatedId;
  }
  next();
});

// Validate that splits total equals amount
groupExpenseSchema.pre("save", function (next) {
  if (this.splits && this.splits.length > 0) {
    const totalSplit = this.splits.reduce((sum, split) => sum + split.amount, 0);
    const difference = Math.abs(totalSplit - this.amount);
    
    // Allow small rounding differences (0.01)
    if (difference > 0.01) {
      return next(new Error(`Split amounts (${totalSplit}) must equal total amount (${this.amount})`));
    }
  }
  next();
});

// Validate that percentages sum to 100 for percentage split
groupExpenseSchema.pre("save", function (next) {
  if (this.splitMethod === "Percentage" && this.splits && this.splits.length > 0) {
    const totalPercentage = this.splits.reduce((sum, split) => sum + (split.percentage || 0), 0);
    const difference = Math.abs(totalPercentage - 100);
    
    // Allow small rounding differences (0.1%)
    if (difference > 0.1) {
      return next(new Error(`Split percentages (${totalPercentage}%) must sum to 100%`));
    }
  }
  next();
});

const groupExpenseModel = mongoose.model("groupExpenses", groupExpenseSchema);
module.exports = groupExpenseModel;
