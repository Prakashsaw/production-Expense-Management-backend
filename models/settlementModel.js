const mongoose = require("mongoose");
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const settlementSchema = new mongoose.Schema(
  {
    settlementId: {
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
    fromUser: {
      expenseAppUserId: {
        type: String,
        required: true,
        index: true,
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
    toUser: {
      expenseAppUserId: {
        type: String,
        required: true,
        index: true,
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
    amount: {
      type: Number,
      required: [true, "Settlement amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    currency: {
      type: String,
      default: "INR",
      maxlength: [3, "Currency code must be 3 characters"],
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Cancelled"],
      default: "Pending",
    },
    settledAt: {
      type: Date,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Bank Transfer", "UPI", "Credit Card", "Debit Card", "Other"],
      default: null,
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },
    expenseIds: [
      {
        type: String, // Array of expenseIds that this settlement covers
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for faster queries
settlementSchema.index({ groupId: 1, status: 1, createdAt: -1 });
settlementSchema.index({ "fromUser.expenseAppUserId": 1, status: 1 });
settlementSchema.index({ "toUser.expenseAppUserId": 1, status: 1 });
settlementSchema.index({ groupId: 1, "fromUser.expenseAppUserId": 1, "toUser.expenseAppUserId": 1 });

// Pre-save hook to generate settlementId if it doesn't exist
settlementSchema.pre("save", async function (next) {
  if (this.isNew && !this.settlementId) {
    const nanoid = customAlphabet(alphabet, 12);
    let isUnique = false;
    let generatedId;

    while (!isUnique) {
      generatedId = nanoid();
      const existingSettlement = await this.constructor.findOne({ settlementId: generatedId });
      if (!existingSettlement) {
        isUnique = true;
      }
    }
    this.settlementId = generatedId;
  }
  next();
});

// Validate that fromUser and toUser are different
settlementSchema.pre("save", function (next) {
  if (this.fromUser.expenseAppUserId === this.toUser.expenseAppUserId) {
    return next(new Error("From user and To user cannot be the same"));
  }
  next();
});

// Auto-update settledAt when status changes to Completed
settlementSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "Completed" && !this.settledAt) {
    this.settledAt = new Date();
  }
  next();
});

const settlementModel = mongoose.model("settlements", settlementSchema);
module.exports = settlementModel;
