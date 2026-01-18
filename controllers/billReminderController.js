const billReminderModel = require("../models/billReminderModel");
const { customAlphabet } = require("nanoid");
const moment = require("moment");
const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Create a new bill reminder
const createBillReminder = async (req, res) => {
  try {
    const { billName, amount, dueDate, frequency, category, notes } = req.body;

    // Validate required fields
    if (!billName || !billName.trim()) {
      return res.status(400).json({
        status: "failed",
        message: "Bill name is required",
      });
    }

    if (!amount || amount < 0) {
      return res.status(400).json({
        status: "failed",
        message: "Valid bill amount is required",
      });
    }

    if (!dueDate) {
      return res.status(400).json({
        status: "failed",
        message: "Due date is required",
      });
    }

    // Generate unique reminderId
    const nanoid = customAlphabet(alphabet, 10);
    let reminderId;
    let isUnique = false;

    while (!isUnique) {
      reminderId = nanoid();
      const existingId = await billReminderModel.findOne({ reminderId });
      if (!existingId) {
        isUnique = true;
      }
    }

    // Create new bill reminder
    const newBillReminder = new billReminderModel({
      reminderId,
      expenseAppUserId: req.user.expenseAppUserId,
      billName: billName.trim(),
      amount: Number(amount),
      dueDate: new Date(dueDate),
      frequency: frequency || "One-time",
      category: category || "Other",
      notes: notes || null,
      isPaid: false,
      isActive: true,
      reminderSent: {
        "24h": false,
        "7d": false,
        "1d": false,
      },
    });

    await newBillReminder.save();

    res.status(201).json({
      status: "success",
      message: "Bill reminder created successfully",
      billReminder: newBillReminder,
    });
  } catch (error) {
    console.error("Error creating bill reminder:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to create bill reminder",
      error: error.message,
    });
  }
};

// Get all bill reminders for a user
const getAllBillReminders = async (req, res) => {
  try {
    const { isPaid, category, upcoming } = req.query;

    const query = {
      expenseAppUserId: req.user.expenseAppUserId,
      isActive: true,
    };

    if (isPaid !== undefined) {
      query.isPaid = isPaid === "true";
    }

    if (category) {
      query.category = category;
    }

    if (upcoming === "true") {
      query.dueDate = { $gte: new Date() };
      query.isPaid = false;
    }

    const billReminders = await billReminderModel
      .find(query)
      .sort({ dueDate: 1 });

    res.status(200).json({
      status: "success",
      message: "Bill reminders fetched successfully",
      billReminders,
    });
  } catch (error) {
    console.error("Error fetching bill reminders:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch bill reminders",
      error: error.message,
    });
  }
};

// Get upcoming bills (due within next 7 days)
const getUpcomingBills = async (req, res) => {
  try {
    const today = moment().startOf("day").toDate();
    const nextWeek = moment().add(7, "days").endOf("day").toDate();

    const upcomingBills = await billReminderModel.find({
      expenseAppUserId: req.user.expenseAppUserId,
      dueDate: {
        $gte: today,
        $lte: nextWeek,
      },
      isPaid: false,
      isActive: true,
    }).sort({ dueDate: 1 });

    res.status(200).json({
      status: "success",
      message: "Upcoming bills fetched successfully",
      bills: upcomingBills,
    });
  } catch (error) {
    console.error("Error fetching upcoming bills:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch upcoming bills",
      error: error.message,
    });
  }
};

// Get a single bill reminder by ID
const getBillReminderById = async (req, res) => {
  try {
    const { reminderId } = req.params;

    const billReminder = await billReminderModel.findOne({
      reminderId: reminderId,
      expenseAppUserId: req.user.expenseAppUserId,
    });

    if (!billReminder) {
      return res.status(404).json({
        status: "failed",
        message: "Bill reminder not found or you don't have access to this reminder",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Bill reminder fetched successfully",
      billReminder,
    });
  } catch (error) {
    console.error("Error fetching bill reminder:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch bill reminder",
      error: error.message,
    });
  }
};

// Update a bill reminder
const updateBillReminder = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const { billName, amount, dueDate, frequency, category, notes, isActive } =
      req.body;

    // Find the bill reminder and verify ownership
    const billReminder = await billReminderModel.findOne({
      reminderId: reminderId,
      expenseAppUserId: req.user.expenseAppUserId,
    });

    if (!billReminder) {
      return res.status(404).json({
        status: "failed",
        message: "Bill reminder not found or you don't have access to this reminder",
      });
    }

    // Update bill reminder
    const updateData = {};
    if (billName !== undefined) updateData.billName = billName.trim();
    if (amount !== undefined) updateData.amount = Number(amount);
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (frequency !== undefined) updateData.frequency = frequency;
    if (category !== undefined) updateData.category = category;
    if (notes !== undefined) updateData.notes = notes;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Reset reminder sent flags if due date changes
    if (dueDate !== undefined) {
      updateData.reminderSent = {
        "24h": false,
        "7d": false,
        "1d": false,
      };
    }

    const updatedBillReminder = await billReminderModel.findOneAndUpdate(
      { reminderId, expenseAppUserId: req.user.expenseAppUserId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: "success",
      message: "Bill reminder updated successfully",
      billReminder: updatedBillReminder,
    });
  } catch (error) {
    console.error("Error updating bill reminder:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to update bill reminder",
      error: error.message,
    });
  }
};

// Mark bill as paid
const markBillAsPaid = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const { paidDate } = req.body;

    // Find the bill reminder and verify ownership
    const billReminder = await billReminderModel.findOne({
      reminderId: reminderId,
      expenseAppUserId: req.user.expenseAppUserId,
    });

    if (!billReminder) {
      return res.status(404).json({
        status: "failed",
        message: "Bill reminder not found or you don't have access to this reminder",
      });
    }

    if (billReminder.isPaid) {
      return res.status(400).json({
        status: "failed",
        message: "Bill is already marked as paid",
      });
    }

    // Update bill reminder
    const updateData = {
      isPaid: true,
      paidDate: paidDate ? new Date(paidDate) : new Date(),
    };

    // If it's a recurring bill, create a new reminder for the next due date
    if (billReminder.frequency !== "One-time" && billReminder.nextDueDate) {
      const nanoid = customAlphabet(alphabet, 10);
      let newReminderId;
      let isUnique = false;

      while (!isUnique) {
        newReminderId = nanoid();
        const existingId = await billReminderModel.findOne({
          reminderId: newReminderId,
        });
        if (!existingId) {
          isUnique = true;
        }
      }

      // Create new reminder for next period
      const newBillReminder = new billReminderModel({
        reminderId: newReminderId,
        expenseAppUserId: req.user.expenseAppUserId,
        billName: billReminder.billName,
        amount: billReminder.amount,
        dueDate: billReminder.nextDueDate,
        frequency: billReminder.frequency,
        category: billReminder.category,
        notes: billReminder.notes,
        isPaid: false,
        isActive: true,
        reminderSent: {
          "24h": false,
          "7d": false,
          "1d": false,
        },
      });

      await newBillReminder.save();
    }

    const updatedBillReminder = await billReminderModel.findOneAndUpdate(
      { reminderId, expenseAppUserId: req.user.expenseAppUserId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: "success",
      message: "Bill marked as paid successfully",
      billReminder: updatedBillReminder,
    });
  } catch (error) {
    console.error("Error marking bill as paid:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to mark bill as paid",
      error: error.message,
    });
  }
};

// Mark bill as unpaid (undo payment)
const markBillAsUnpaid = async (req, res) => {
  try {
    const { reminderId } = req.params;

    const billReminder = await billReminderModel.findOne({
      reminderId: reminderId,
      expenseAppUserId: req.user.expenseAppUserId,
    });

    if (!billReminder) {
      return res.status(404).json({
        status: "failed",
        message: "Bill reminder not found or you don't have access to this reminder",
      });
    }

    const updatedBillReminder = await billReminderModel.findOneAndUpdate(
      { reminderId, expenseAppUserId: req.user.expenseAppUserId },
      {
        $set: {
          isPaid: false,
          paidDate: null,
        },
      },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      message: "Bill marked as unpaid successfully",
      billReminder: updatedBillReminder,
    });
  } catch (error) {
    console.error("Error marking bill as unpaid:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to mark bill as unpaid",
      error: error.message,
    });
  }
};

// Delete a bill reminder (soft delete)
const deleteBillReminder = async (req, res) => {
  try {
    const { reminderId } = req.params;

    // Find the bill reminder and verify ownership
    const billReminder = await billReminderModel.findOne({
      reminderId: reminderId,
      expenseAppUserId: req.user.expenseAppUserId,
    });

    if (!billReminder) {
      return res.status(404).json({
        status: "failed",
        message: "Bill reminder not found or you don't have access to this reminder",
      });
    }

    // Soft delete (set isActive to false)
    await billReminderModel.findOneAndUpdate(
      { reminderId, expenseAppUserId: req.user.expenseAppUserId },
      { $set: { isActive: false } },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      message: "Bill reminder deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bill reminder:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to delete bill reminder",
      error: error.message,
    });
  }
};

module.exports = {
  createBillReminder,
  getAllBillReminders,
  getBillReminderById,
  updateBillReminder,
  deleteBillReminder,
  markBillAsPaid,
  markBillAsUnpaid,
  getUpcomingBills,
};
