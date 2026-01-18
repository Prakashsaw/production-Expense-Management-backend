const userCategoryModel = require("../models/userCategoryModel");
const { customAlphabet } = require("nanoid");
const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Create a new custom category
const createCategory = async (req, res) => {
  try {
    const { name, icon, color, type, parentCategory } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        status: "failed",
        message: "Category name is required",
      });
    }

    // Check if category with same name already exists for this user (only active categories)
    const existingCategory = await userCategoryModel.findOne({
      expenseAppUserId: req.user.expenseAppUserId,
      name: name.trim(),
      isActive: true,
    });

    if (existingCategory) {
      return res.status(400).json({
        status: "failed",
        message: "Category with this name already exists",
      });
    }

    // Generate unique categoryId
    const nanoid = customAlphabet(alphabet, 10);
    let categoryId;
    let isUnique = false;
    
    // Ensure categoryId is unique
    while (!isUnique) {
      categoryId = nanoid();
      const existingId = await userCategoryModel.findOne({ categoryId });
      if (!existingId) {
        isUnique = true;
      }
    }

    // Create new category
    const newCategory = new userCategoryModel({
      categoryId,
      expenseAppUserId: req.user.expenseAppUserId,
      name: name.trim(),
      icon: icon || "FolderOutlined",
      color: color || "#667eea",
      type: type || "Both",
      parentCategory: parentCategory || null,
      isDefault: false,
      isActive: true,
    });

    await newCategory.save();

    res.status(201).json({
      status: "success",
      message: "Category created successfully",
      category: newCategory,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to create category",
      error: error.message,
    });
  }
};

// Get all categories for a user (default + custom)
const getAllCategories = async (req, res) => {
  try {
    // Get user's custom categories
    const customCategories = await userCategoryModel.find({
      expenseAppUserId: req.user.expenseAppUserId,
      isActive: true,
    }).sort({ createdAt: -1 });

    // Default categories (these are the predefined ones)
    const defaultCategories = [
      { name: "Income in Salary", type: "Income", isDefault: true },
      { name: "Income in Part Time", type: "Income", isDefault: true },
      { name: "Income in Project", type: "Income", isDefault: true },
      { name: "Income in Freelancing", type: "Income", isDefault: true },
      { name: "Income in Tip", type: "Income", isDefault: true },
      { name: "Expense in Stationary", type: "Expense", isDefault: true },
      { name: "Expense in Food", type: "Expense", isDefault: true },
      { name: "Expense in Movie", type: "Expense", isDefault: true },
      { name: "Expense in Bills", type: "Expense", isDefault: true },
      { name: "Expense in Medical", type: "Expense", isDefault: true },
      { name: "Expense in Fees", type: "Expense", isDefault: true },
      { name: "Expense in TAX", type: "Expense", isDefault: true },
    ];

    res.status(200).json({
      status: "success",
      message: "Categories fetched successfully",
      categories: {
        default: defaultCategories,
        custom: customCategories,
        all: [
          ...defaultCategories.map(cat => ({
            name: cat.name,
            type: cat.type,
            icon: "FolderOutlined",
            color: "#667eea",
            isDefault: true,
          })),
          ...customCategories.map(cat => ({
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            color: cat.color,
            isDefault: false,
            categoryId: cat.categoryId,
          }))
        ],
      },
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

// Update a custom category
const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, icon, color, type, parentCategory, isActive } = req.body;

    // Find the category and verify ownership
    const category = await userCategoryModel.findOne({
      categoryId: categoryId,
      expenseAppUserId: req.user.expenseAppUserId,
    });

    if (!category) {
      return res.status(404).json({
        status: "failed",
        message: "Category not found or you don't have access to this category",
      });
    }

    // If name is being updated, check for duplicates
    if (name && name.trim() !== category.name) {
      const existingCategory = await userCategoryModel.findOne({
        expenseAppUserId: req.user.expenseAppUserId,
        name: name.trim(),
        categoryId: { $ne: categoryId },
      });

      if (existingCategory) {
        return res.status(400).json({
          status: "failed",
          message: "Category with this name already exists",
        });
      }
    }

    // Update category
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (type !== undefined) updateData.type = type;
    if (parentCategory !== undefined) updateData.parentCategory = parentCategory;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCategory = await userCategoryModel.findOneAndUpdate(
      { categoryId, expenseAppUserId: req.user.expenseAppUserId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: "success",
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to update category",
      error: error.message,
    });
  }
};

// Delete a custom category
const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Find the category and verify ownership
    const category = await userCategoryModel.findOne({
      categoryId: categoryId,
      expenseAppUserId: req.user.expenseAppUserId,
    });

    if (!category) {
      return res.status(404).json({
        status: "failed",
        message: "Category not found or you don't have access to this category",
      });
    }

    // Soft delete (set isActive to false) instead of hard delete
    // This preserves data integrity for existing transactions
    await userCategoryModel.findOneAndUpdate(
      { categoryId, expenseAppUserId: req.user.expenseAppUserId },
      { $set: { isActive: false } },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to delete category",
      error: error.message,
    });
  }
};

// Get a single category by ID
const getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await userCategoryModel.findOne({
      categoryId: categoryId,
      expenseAppUserId: req.user.expenseAppUserId,
    });

    if (!category) {
      return res.status(404).json({
        status: "failed",
        message: "Category not found or you don't have access to this category",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Category fetched successfully",
      category: category,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch category",
      error: error.message,
    });
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  getCategoryById,
};
