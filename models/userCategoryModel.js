const mongoose = require("mongoose");
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const userCategorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expenseAppUserId: {
      type: String,
      required: true,
      index: true, // Add index for faster queries
    },
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    icon: {
      type: String,
      default: "FolderOutlined", // Default Ant Design icon name
    },
    color: {
      type: String,
      default: "#667eea", // Default color (purple)
      validate: {
        validator: function (v) {
          // Validate hex color format
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: "Color must be a valid hex color code",
      },
    },
    type: {
      type: String,
      enum: ["Income", "Expense", "Both"],
      default: "Both",
      required: true,
    },
    parentCategory: {
      type: String,
      default: null, // For future category grouping
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index to ensure unique category names per user
userCategorySchema.index({ expenseAppUserId: 1, name: 1 }, { unique: true });

// Pre-save hook to generate categoryId if it doesn't exist
userCategorySchema.pre("save", async function (next) {
  if (this.isNew && !this.categoryId) {
    const nanoid = customAlphabet(alphabet, 10);
    this.categoryId = nanoid();
  }
  next();
});

// Export
const userCategoryModel = mongoose.model("userCategories", userCategorySchema);
module.exports = userCategoryModel;
