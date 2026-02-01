const mongoose = require("mongoose");
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const expenseGroupSchema = new mongoose.Schema(
  {
    groupId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    groupName: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      maxlength: [100, "Group name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    groupType: {
      type: String,
      enum: ["Family", "Roommates", "Travel", "Friends", "Other"],
      default: "Other",
      required: true,
    },
    createdBy: {
      type: String, // expenseAppUserId of the creator
      required: true,
      index: true,
    },
    members: [
      {
        expenseAppUserId: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          enum: ["Owner", "Admin", "Member"],
          default: "Member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    currency: {
      type: String,
      default: "INR",
      maxlength: [3, "Currency code must be 3 characters"],
    },
    defaultSplitMethod: {
      type: String,
      enum: ["Equal", "Custom", "Percentage", "Exact"],
      default: "Equal",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      allowMemberAddExpense: {
        type: Boolean,
        default: true,
      },
      requireApprovalForExpense: {
        type: Boolean,
        default: false,
      },
      autoSettle: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

// Compound index for faster queries
expenseGroupSchema.index({ createdBy: 1, isActive: 1 });
expenseGroupSchema.index({ "members.expenseAppUserId": 1, isActive: 1 });

// Note: groupId generation and creator addition are handled in the controller
// to avoid validation issues and ensure proper error handling

const expenseGroupModel = mongoose.model("expenseGroups", expenseGroupSchema);
module.exports = expenseGroupModel;
