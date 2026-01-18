const express = require("express");
const {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  getCategoryById,
} = require("../controllers/categoryController");
const checkUserAuth = require("../middleware/userAuth");

// Router object
const router = express.Router();

// All routes are protected (require authentication)
// POST: Create a new custom category
router.post("/create", checkUserAuth, createCategory);

// GET: Get all categories (default + custom)
router.get("/all", checkUserAuth, getAllCategories);

// GET: Get a single category by ID
router.get("/:categoryId", checkUserAuth, getCategoryById);

// PUT: Update a custom category
router.put("/:categoryId", checkUserAuth, updateCategory);

// DELETE: Delete a custom category (soft delete)
router.delete("/:categoryId", checkUserAuth, deleteCategory);

// Export the router
module.exports = router;
