const mongoose = require("mongoose");
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const billReminderSchema = new mongoose.Schema(
  {
    reminderId: {
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
    billName: {
      type: String,
      required: [true, "Bill name is required"],
      trim: true,
      maxlength: [100, "Bill name cannot exceed 100 characters"],
    },
    amount: {
      type: Number,
      required: [true, "Bill amount is required"],
      min: [0, "Bill amount cannot be negative"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    frequency: {
      type: String,
      enum: ["One-time", "Monthly", "Quarterly", "Yearly", "Weekly", "Bi-weekly"],
      default: "One-time",
      required: true,
    },
    category: {
      type: String,
      required: [true, "Bill category is required"],
      enum: [
        "Utilities",
        "Insurance",
        "Rent/Mortgage",
        "Credit Card",
        "Loan",
        "Subscription",
        "Medical",
        "Education",
        "Other",
      ],
      default: "Other",
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    reminderSent: {
      type: Object,
      default: {
        "24h": false,
        "7d": false,
        "1d": false,
      },
    },
    nextDueDate: {
      type: Date,
      default: null, // For recurring bills, this will be calculated
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index for faster queries
billReminderSchema.index({ expenseAppUserId: 1, dueDate: 1 });
billReminderSchema.index({ expenseAppUserId: 1, isPaid: 1, isActive: 1 });

// Pre-save hook to generate reminderId if it doesn't exist
billReminderSchema.pre("save", async function (next) {
  if (this.isNew && !this.reminderId) {
    const nanoid = customAlphabet(alphabet, 10);
    this.reminderId = nanoid();
  }

  // Calculate nextDueDate for recurring bills
  if (this.frequency !== "One-time" && this.dueDate) {
    const moment = require("moment");
    let nextDate = moment(this.dueDate);

    switch (this.frequency) {
      case "Weekly":
        nextDate.add(1, "week");
        break;
      case "Bi-weekly":
        nextDate.add(2, "weeks");
        break;
      case "Monthly":
        nextDate.add(1, "month");
        break;
      case "Quarterly":
        nextDate.add(3, "months");
        break;
      case "Yearly":
        nextDate.add(1, "year");
        break;
    }

    this.nextDueDate = nextDate.toDate();
  }

  next();
});

const billReminderModel = mongoose.model("billReminders", billReminderSchema);
module.exports = billReminderModel;
