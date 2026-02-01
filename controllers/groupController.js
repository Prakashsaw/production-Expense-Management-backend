const expenseGroupModel = require("../models/expenseGroupModel");
const groupExpenseModel = require("../models/groupExpenseModel");
const settlementModel = require("../models/settlementModel");
const userModel = require("../models/userModel");
const GoogleAuthUserModel = require("../models/model.user.googleAuth");
const mongoose = require("mongoose");
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const sendMailThroughBrevo = require("../services/brevoEmailService");
const CLIENT_URL = require("../utils/baseURL");
const groupInviteEmail = require("../utils/emailTemplates/groupInviteEmail");

// ==================== GROUP MANAGEMENT ====================

// Create a new expense group
const createGroup = async (req, res) => {
  try {
    const { groupName, description, groupType, currency, defaultSplitMethod, settings, memberEmails } = req.body;

    // Validate required fields
    if (!groupName || !groupType) {
      return res.status(400).json({
        status: "failed",
        message: "Group name and type are required",
      });
    }

    // Generate unique groupId
    const nanoid = customAlphabet(alphabet, 12);
    let groupId;
    let isUnique = false;

    // Ensure groupId is unique
    while (!isUnique) {
      groupId = nanoid();
      const existingGroup = await expenseGroupModel.findOne({ groupId });
      if (!existingGroup) {
        isUnique = true;
      }
    }

    // Validate groupId was generated
    if (!groupId) {
      return res.status(500).json({
        status: "failed",
        message: "Failed to generate group ID",
      });
    }

    // Get creator user details
    const creator = await userModel.findOne({ expenseAppUserId: req.user.expenseAppUserId });
    if (!creator) {
      return res.status(404).json({
        status: "failed",
        message: "User not found",
      });
    }

    // Prepare group data
    const groupData = {
      groupId: String(groupId), // Ensure it's a string
      groupName: groupName.trim(),
      description: description || "",
      groupType,
      createdBy: req.user.expenseAppUserId,
      currency: currency || "INR",
      defaultSplitMethod: defaultSplitMethod || "Equal",
      settings: settings || {
        allowMemberAddExpense: true,
        requireApprovalForExpense: false,
        autoSettle: false,
      },
      members: [
        {
          expenseAppUserId: req.user.expenseAppUserId,
          email: creator.email,
          name: creator.name,
          role: "Owner",
          joinedAt: new Date(),
          isActive: true,
        },
      ],
      isActive: true,
    };

    // Add members by email if provided
    const invitedUsers = [];
    const notFoundMembers = [];
    if (memberEmails && Array.isArray(memberEmails) && memberEmails.length > 0) {
      const uniqueEmails = [...new Set(memberEmails)];
      for (const email of uniqueEmails) {
        if (email === req.user.email) continue; // Skip creator as they're already added

        const trimmedEmail = email.trim();
        let user = await userModel.findOne({ email: trimmedEmail });
        if (!user) {
          user = await GoogleAuthUserModel.findOne({ email: trimmedEmail });
        }

        if (user) {
          groupData.members.push({
            expenseAppUserId: user.expenseAppUserId,
            email: user.email,
            name: user.name,
            role: "Member",
            joinedAt: new Date(),
            isActive: true,
          });
          invitedUsers.push(user);
        } else {
          notFoundMembers.push(trimmedEmail);
        }
      }
      // NOTE: Unlike addMembers, we do NOT block group creation here if all emails are invalid.
      // Group can still be created with just the owner; UI will show which emails were not found.
    }

    // Debug: Log groupData to verify groupId is present
    console.log("Creating group with groupId:", groupData.groupId);
    console.log("Group data structure:", {
      groupId: groupData.groupId,
      groupName: groupData.groupName,
      membersCount: groupData.members.length,
    });

    // Create new group using create() method which handles validation better
    const newGroup = await expenseGroupModel.create(groupData);

    // Send email notifications to invited members (best-effort, non-blocking)
    if (invitedUsers.length > 0) {
      try {
        await Promise.all(
          invitedUsers.map((member) =>
            sendMailThroughBrevo({
              to: member.email,
              subject: `You've been added to a group: ${groupData.groupName}`,
              html: groupInviteEmail(
                member,
                groupData,
                creator,
                CLIENT_URL,
                process.env.EMAIL_FROM
              ),
            })
          )
        );
      } catch (emailError) {
        console.error("Error sending group invite emails:", emailError);
        // Do not fail the response because of email issues
      }
    }

    res.status(201).json({
      status: "success",
      message:
        notFoundMembers.length > 0
          ? "Group created, but some member emails are not registered users."
          : "Group created successfully",
      group: newGroup,
      notFoundMembers,
    });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to create group",
      error: error.message,
    });
  }
};

// Get all groups for a user
const getAllGroups = async (req, res) => {
  try {
    const { isActive, groupType } = req.query;
    const userId = req.user.expenseAppUserId;

    // Find groups where user is creator or member
    const query = {
      $or: [
        { createdBy: userId },
        { "members.expenseAppUserId": userId },
      ],
    };

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    if (groupType) {
      query.groupType = groupType;
    }

    const groups = await expenseGroupModel.find(query).sort({ createdAt: -1 });

    // Calculate group statistics
    const groupsWithStats = await Promise.all(
      groups.map(async (group) => {
        const expenses = await groupExpenseModel.find({
          groupId: group.groupId,
          isActive: true,
        });

        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const unsettledExpenses = expenses.filter((exp) => !exp.isSettled).length;
        const pendingSettlements = await settlementModel.countDocuments({
          groupId: group.groupId,
          status: "Pending",
          isActive: true,
        });

        return {
          ...group.toObject(),
          stats: {
            totalExpenses,
            totalExpenseCount: expenses.length,
            unsettledExpenses,
            pendingSettlements,
          },
        };
      })
    );

    res.status(200).json({
      status: "success",
      message: "Groups fetched successfully",
      groups: groupsWithStats,
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch groups",
      error: error.message,
    });
  }
};

// Get a single group by ID
const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.expenseAppUserId;

    const group = await expenseGroupModel.findOne({ groupId });

    if (!group) {
      return res.status(404).json({
        status: "failed",
        message: "Group not found",
      });
    }

    // Check if user is a member
    const isMember = group.createdBy === userId ||
      group.members.some((m) => m.expenseAppUserId === userId && m.isActive);

    if (!isMember) {
      return res.status(403).json({
        status: "failed",
        message: "You don't have access to this group",
      });
    }

    // Get group expenses
    const expenses = await groupExpenseModel.find({
      groupId,
      isActive: true,
    }).sort({ date: -1 });

    // Get settlements
    const settlements = await settlementModel.find({
      groupId,
      isActive: true,
    }).sort({ createdAt: -1 });

    // Calculate statistics
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const unsettledExpenses = expenses.filter((exp) => !exp.isSettled).length;
    const pendingSettlementsCount = settlements.filter((s) => s.status === "Pending").length;

    // Your Balance: totalOwed - totalPaid (positive = you owe, negative = you are owed)
    const userBalance = { totalPaid: 0, totalOwed: 0, balance: 0 };
    expenses.forEach((expense) => {
      if (expense.paidBy.expenseAppUserId === userId) {
        userBalance.totalPaid += expense.amount;
      }
      const userSplit = expense.splits.find((s) => s.expenseAppUserId === userId);
      if (userSplit) {
        userBalance.totalOwed += userSplit.amount;
      }
    });
    userBalance.balance = userBalance.totalOwed - userBalance.totalPaid;

    res.status(200).json({
      status: "success",
      message: "Group fetched successfully",
      group: {
        ...group.toObject(),
        expenses,
        settlements,
        stats: {
          totalExpenses,
          totalExpenseCount: expenses.length,
          unsettledExpenses,
          pendingSettlements: pendingSettlementsCount,
        },
        userBalance,
      },
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch group",
      error: error.message,
    });
  }
};

// Update a group
const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { groupName, description, groupType, currency, defaultSplitMethod, settings } = req.body;
    const userId = req.user.expenseAppUserId;

    const group = await expenseGroupModel.findOne({ groupId });

    if (!group) {
      return res.status(404).json({
        status: "failed",
        message: "Group not found",
      });
    }

    // Check if user is owner or admin
    const isOwner = group.createdBy === userId;
    const member = group.members.find((m) => m.expenseAppUserId === userId);
    const isAdmin = member && (member.role === "Owner" || member.role === "Admin");

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: "failed",
        message: "Only owners and admins can update group",
      });
    }

    const updateData = {};
    if (groupName !== undefined) updateData.groupName = groupName.trim();
    if (description !== undefined) updateData.description = description;
    if (groupType !== undefined) updateData.groupType = groupType;
    if (currency !== undefined) updateData.currency = currency;
    if (defaultSplitMethod !== undefined) updateData.defaultSplitMethod = defaultSplitMethod;
    if (settings !== undefined) updateData.settings = settings;

    const updatedGroup = await expenseGroupModel.findOneAndUpdate(
      { groupId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: "success",
      message: "Group updated successfully",
      group: updatedGroup,
    });
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to update group",
      error: error.message,
    });
  }
};

// Add members to a group
const addMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberEmails } = req.body;
    const userId = req.user.expenseAppUserId;

    if (!memberEmails || !Array.isArray(memberEmails) || memberEmails.length === 0) {
      return res.status(400).json({
        status: "failed",
        message: "Member emails array is required",
      });
    }

    const group = await expenseGroupModel.findOne({ groupId });

    if (!group) {
      return res.status(404).json({
        status: "failed",
        message: "Group not found",
      });
    }

    // Check if user is owner or admin
    const isOwner = group.createdBy === userId;
    const member = group.members.find((m) => m.expenseAppUserId === userId);
    const isAdmin = member && (member.role === "Owner" || member.role === "Admin");

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: "failed",
        message: "Only owners and admins can add members",
      });
    }

    const uniqueEmails = [...new Set(memberEmails)];
    const addedMembers = [];
    const addedMemberUsers = [];
    const notFound = [];

    // First, find valid users without mutating the group
    for (const email of uniqueEmails) {
      const trimmedEmail = email.trim();

      // Skip if already a member
      if (group.members.some((m) => m.email === trimmedEmail)) {
        continue;
      }

      let user = await userModel.findOne({ email: trimmedEmail });
      if (!user) {
        user = await GoogleAuthUserModel.findOne({ email: trimmedEmail });
      }

      if (user) {
        addedMembers.push(user.email);
        addedMemberUsers.push(user);
      } else {
        notFound.push(trimmedEmail);
      }
    }

    // If user tried to add emails but none are registered, block the operation
    if (memberEmails.length > 0 && addedMembers.length === 0) {
      return res.status(400).json({
        status: "failed",
        message:
          "No registered users found for provided member email(s). Please invite only registered users.",
        notFound,
      });
    }

    // Now actually add the valid members to the group
    addedMemberUsers.forEach((user) => {
      group.members.push({
        expenseAppUserId: user.expenseAppUserId,
        email: user.email,
        name: user.name,
        role: "Member",
        joinedAt: new Date(),
        isActive: true,
      });
    });

    await group.save();

    // Send email notifications to newly added members (best-effort)
    if (addedMemberUsers.length > 0) {
      try {
        const inviter = await userModel.findOne({ expenseAppUserId: userId });
        await Promise.all(
          addedMemberUsers.map((member) =>
            sendMailThroughBrevo({
              to: member.email,
              subject: `You've been added to a group: ${group.groupName}`,
              html: groupInviteEmail(
                member,
                group,
                inviter,
                CLIENT_URL,
                process.env.EMAIL_FROM
              ),
            })
          )
        );
      } catch (emailError) {
        console.error("Error sending group member invite emails:", emailError);
      }
    }

    res.status(200).json({
      status: "success",
      message:
        notFound.length > 0
          ? "Some members were added, but some emails are not registered users."
          : "Members added successfully",
      addedMembers,
      notFound,
      group,
    });
  } catch (error) {
    console.error("Error adding members:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to add members",
      error: error.message,
    });
  }
};

// Remove member from group
const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.expenseAppUserId;

    const group = await expenseGroupModel.findOne({ groupId });

    if (!group) {
      return res.status(404).json({
        status: "failed",
        message: "Group not found",
      });
    }

    // Check if user is owner or admin
    const isOwner = group.createdBy === userId;
    const member = group.members.find((m) => m.expenseAppUserId === userId);
    const isAdmin = member && (member.role === "Owner" || member.role === "Admin");

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: "failed",
        message: "You don't have permission to remove members",
      });
    }

    // Cannot remove owner
    const memberToRemove = group.members.find((m) => m.expenseAppUserId === memberId);
    if (memberToRemove && memberToRemove.role === "Owner") {
      return res.status(400).json({
        status: "failed",
        message: "Cannot remove the group owner",
      });
    }

    // Remove member
    group.members = group.members.filter((m) => m.expenseAppUserId !== memberId);
    await group.save();

    res.status(200).json({
      status: "success",
      message: "Member removed successfully",
      group,
    });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to remove member",
      error: error.message,
    });
  }
};

// Delete a group (hard delete: remove group and all related data from DB)
const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.expenseAppUserId;

    const group = await expenseGroupModel.findOne({ groupId });

    if (!group) {
      return res.status(404).json({
        status: "failed",
        message: "Group not found",
      });
    }

    // Only owner can delete
    if (group.createdBy !== userId) {
      return res.status(403).json({
        status: "failed",
        message: "Only the group owner can delete the group",
      });
    }

    // Delete all related group expenses and settlements, then the group
    await groupExpenseModel.deleteMany({ groupId });
    await settlementModel.deleteMany({ groupId });
    await expenseGroupModel.deleteOne({ groupId });

    res.status(200).json({
      status: "success",
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to delete group",
      error: error.message,
    });
  }
};

// ==================== GROUP EXPENSE MANAGEMENT ====================

// Add expense to a group
const addExpense = async (req, res) => {
  try {
    const {
      groupId: groupIdFromBody,
      expenseName,
      description,
      amount,
      category,
      date,
      splitMethod,
      splits,
      paidBy,
    } = req.body;

    // Support both URL param and body for groupId
    const groupId = req.params.groupId || groupIdFromBody;

    // Validate required fields
    if (!groupId || !expenseName || !amount || !category || !paidBy) {
      return res.status(400).json({
        status: "failed",
        message: "Group ID, expense name, amount, category, and paid by are required",
      });
    }

    // Verify group exists and user is a member
    const group = await expenseGroupModel.findOne({ groupId, isActive: true });
    if (!group) {
      return res.status(404).json({
        status: "failed",
        message: "Group not found",
      });
    }

    const userId = req.user.expenseAppUserId;
    const isMember = group.createdBy === userId ||
      group.members.some((m) => m.expenseAppUserId === userId && m.isActive);

    if (!isMember) {
      return res.status(403).json({
        status: "failed",
        message: "You must be a member to add expenses",
      });
    }

    // Check if approval is required
    const requiresApproval = group.settings.requireApprovalForExpense && 
      group.createdBy !== userId && 
      !group.members.find((m) => m.expenseAppUserId === userId && m.role === "Admin");

    // Process splits based on split method
    let processedSplits = [];
    const splitMethodToUse = splitMethod || group.defaultSplitMethod;

    if (splitMethodToUse === "Equal") {
      // Equal split among all active members; put rounding remainder on last so sum === amount
      const activeMembers = group.members.filter((m) => m.isActive);
      if (activeMembers.length === 0) {
        return res.status(400).json({
          status: "failed",
          message: "Group has no active members to split expense",
        });
      }
      const numMembers = activeMembers.length;
      const perPersonAmount = Math.floor((amount / numMembers) * 100) / 100;
      const remainder = Math.round((amount - perPersonAmount * numMembers) * 100) / 100;
      processedSplits = activeMembers.map((member, index) => {
        const isLast = index === numMembers - 1;
        const splitAmount = isLast ? perPersonAmount + remainder : perPersonAmount;
        return {
          expenseAppUserId: member.expenseAppUserId,
          name: member.name,
          email: member.email,
          amount: splitAmount,
          percentage: Math.round((100 / numMembers) * 100) / 100,
          isPaid: member.expenseAppUserId === paidBy.expenseAppUserId,
          paidAt: member.expenseAppUserId === paidBy.expenseAppUserId ? new Date() : null,
        };
      });
    } else if (splitMethodToUse === "Custom" || splitMethodToUse === "Exact") {
      // Use provided splits
      if (!splits || !Array.isArray(splits) || splits.length === 0) {
        return res.status(400).json({
          status: "failed",
          message: "Splits array is required for custom/exact split method",
        });
      }
      processedSplits = splits;
    } else if (splitMethodToUse === "Percentage") {
      // Percentage split
      if (!splits || !Array.isArray(splits) || splits.length === 0) {
        return res.status(400).json({
          status: "failed",
          message: "Splits array with percentages is required",
        });
      }
      processedSplits = splits.map((split) => ({
        ...split,
        amount: Math.round((amount * split.percentage / 100) * 100) / 100,
      }));
    }

    // Generate unique expenseId (cannot rely on pre-save because of validation order)
    const nanoid = customAlphabet(alphabet, 12);
    let expenseId;
    let isUnique = false;

    while (!isUnique) {
      const candidateId = nanoid();
      const existingExpense = await groupExpenseModel.findOne({ expenseId: candidateId });
      if (!existingExpense) {
        isUnique = true;
        expenseId = candidateId;
      }
    }

    // Create new expense
    const newExpense = new groupExpenseModel({
      expenseId,
      groupId,
      addedBy: userId,
      expenseName: expenseName.trim(),
      description: description || "",
      amount: Number(amount),
      currency: group.currency,
      category: category.trim(),
      date: date ? new Date(date) : new Date(),
      splitMethod: splitMethodToUse,
      splits: processedSplits,
      paidBy: {
        expenseAppUserId: paidBy.expenseAppUserId,
        name: paidBy.name,
        email: paidBy.email,
      },
      requiresApproval,
      isActive: true,
    });

    await newExpense.save();

    res.status(201).json({
      status: "success",
      message: requiresApproval ? "Expense added and pending approval" : "Expense added successfully",
      expense: newExpense,
    });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to add expense",
      error: error.message,
    });
  }
};

// Get all expenses for a group
const getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { isSettled, dateFrom, dateTo } = req.query;
    const userId = req.user.expenseAppUserId;

    // Verify group and membership
    const group = await expenseGroupModel.findOne({ groupId, isActive: true });
    if (!group) {
      return res.status(404).json({
        status: "failed",
        message: "Group not found",
      });
    }

    const isMember = group.createdBy === userId ||
      group.members.some((m) => m.expenseAppUserId === userId && m.isActive);

    if (!isMember) {
      return res.status(403).json({
        status: "failed",
        message: "You don't have access to this group",
      });
    }

    const query = { groupId, isActive: true };
    if (isSettled !== undefined) {
      query.isSettled = isSettled === "true";
    }
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    const expenses = await groupExpenseModel.find(query).sort({ date: -1 });

    res.status(200).json({
      status: "success",
      message: "Expenses fetched successfully",
      expenses,
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch expenses",
      error: error.message,
    });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user.expenseAppUserId;

    const expense = await groupExpenseModel.findOne({ expenseId, isActive: true });
    if (!expense) {
      return res.status(404).json({
        status: "failed",
        message: "Expense not found",
      });
    }

    // Check permissions: addedBy, admin, or paidBy (for isSettled only)
    const group = await expenseGroupModel.findOne({ groupId: expense.groupId });
    const isOwner = expense.addedBy === userId;
    const member = group.members.find((m) => m.expenseAppUserId === userId);
    const isAdmin = member && (member.role === "Owner" || member.role === "Admin");
    const isPaidBy = expense.paidBy && expense.paidBy.expenseAppUserId === userId;
    const onlySettledUpdate = Object.keys(req.body).every((k) => k === "isSettled");

    const canUpdate = isOwner || isAdmin || (onlySettledUpdate && isPaidBy);
    if (!canUpdate) {
      return res.status(403).json({
        status: "failed",
        message: "You don't have permission to update this expense",
      });
    }

    // Update expense
    const updateData = {};
    const { expenseName, description, amount, category, date, splits, isSettled } = req.body;
    if (expenseName !== undefined) updateData.expenseName = expenseName.trim();
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = Number(amount);
    if (category !== undefined) updateData.category = category.trim();
    if (date !== undefined) updateData.date = new Date(date);
    if (splits !== undefined) updateData.splits = splits;
    if (isSettled !== undefined) {
      updateData.isSettled = Boolean(isSettled);
      if (isSettled) updateData.settledAt = new Date();
      else updateData.settledAt = null;
    }

    const updatedExpense = await groupExpenseModel.findOneAndUpdate(
      { expenseId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: "success",
      message: "Expense updated successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to update expense",
      error: error.message,
    });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user.expenseAppUserId;

    const expense = await groupExpenseModel.findOne({ expenseId, isActive: true });
    if (!expense) {
      return res.status(404).json({
        status: "failed",
        message: "Expense not found",
      });
    }

    // Check permissions
    const group = await expenseGroupModel.findOne({ groupId: expense.groupId });
    const isOwner = expense.addedBy === userId;
    const member = group.members.find((m) => m.expenseAppUserId === userId);
    const isAdmin = member && (member.role === "Owner" || member.role === "Admin");

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: "failed",
        message: "You don't have permission to delete this expense",
      });
    }

    // Soft delete
    await groupExpenseModel.findOneAndUpdate(
      { expenseId },
      { $set: { isActive: false } },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to delete expense",
      error: error.message,
    });
  }
};

// Approve expense
const approveExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user.expenseAppUserId;

    const expense = await groupExpenseModel.findOne({ expenseId, isActive: true });
    if (!expense) {
      return res.status(404).json({
        status: "failed",
        message: "Expense not found",
      });
    }

    const group = await expenseGroupModel.findOne({ groupId: expense.groupId });
    const member = group.members.find((m) => m.expenseAppUserId === userId);
    const isAdmin = member && (member.role === "Owner" || member.role === "Admin");

    if (!isAdmin) {
      return res.status(403).json({
        status: "failed",
        message: "Only admins can approve expenses",
      });
    }

    // Check if already approved
    const alreadyApproved = expense.approvedBy.some(
      (approval) => approval.expenseAppUserId === userId
    );

    if (!alreadyApproved) {
      expense.approvedBy.push({
        expenseAppUserId: userId,
        approvedAt: new Date(),
      });
      await expense.save();
    }

    res.status(200).json({
      status: "success",
      message: "Expense approved successfully",
      expense,
    });
  } catch (error) {
    console.error("Error approving expense:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to approve expense",
      error: error.message,
    });
  }
};

// ==================== SETTLEMENT MANAGEMENT ====================

// Calculate settlements (who owes whom)
const calculateSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.expenseAppUserId;

    // Verify group and membership
    const group = await expenseGroupModel.findOne({ groupId, isActive: true });
    if (!group) {
      return res.status(404).json({
        status: "failed",
        message: "Group not found",
      });
    }

    const isMember = group.createdBy === userId ||
      group.members.some((m) => m.expenseAppUserId === userId && m.isActive);

    if (!isMember) {
      return res.status(403).json({
        status: "failed",
        message: "You don't have access to this group",
      });
    }

    // Get all unsettled expenses
    const expenses = await groupExpenseModel.find({
      groupId,
      isActive: true,
      isSettled: false,
    });

    // Calculate balances for each member
    const balances = {};
    group.members.forEach((member) => {
      if (member.isActive) {
        balances[member.expenseAppUserId] = {
          expenseAppUserId: member.expenseAppUserId,
          name: member.name,
          email: member.email,
          totalPaid: 0,
          totalOwed: 0,
          balance: 0,
        };
      }
    });

    // Calculate balances from expenses
    expenses.forEach((expense) => {
      // Add to paidBy's totalPaid
      if (balances[expense.paidBy.expenseAppUserId]) {
        balances[expense.paidBy.expenseAppUserId].totalPaid += expense.amount;
      }

      // Add to each split's totalOwed
      expense.splits.forEach((split) => {
        if (balances[split.expenseAppUserId]) {
          balances[split.expenseAppUserId].totalOwed += split.amount;
        }
      });
    });

    // Calculate final balance (positive = owes money, negative = is owed money)
    Object.keys(balances).forEach((userId) => {
      balances[userId].balance = balances[userId].totalOwed - balances[userId].totalPaid;
    });

    // Generate settlement suggestions (simplified - who should pay whom)
    const settlements = [];
    const sortedBalances = Object.values(balances).sort((a, b) => b.balance - a.balance);

    // Simple settlement algorithm: match positive balances (owe) with negative (are owed)
    // balance = totalOwed - totalPaid → positive = debtor, negative = creditor
    let i = 0;
    let j = sortedBalances.length - 1;
    const maxIterations = sortedBalances.length * sortedBalances.length; // safety cap
    let iterations = 0;

    while (i < j && iterations < maxIterations) {
      iterations++;
      const debtor = sortedBalances[i]; // Person who owes (positive balance)
      const creditor = sortedBalances[j]; // Person who is owed (negative balance)

      if (debtor.balance <= 0 || creditor.balance >= 0) break;

      const amount = Math.min(Math.abs(debtor.balance), Math.abs(creditor.balance));
      if (amount > 0.01) {
        settlements.push({
          fromUser: {
            expenseAppUserId: debtor.expenseAppUserId,
            name: debtor.name,
            email: debtor.email,
          },
          toUser: {
            expenseAppUserId: creditor.expenseAppUserId,
            name: creditor.name,
            email: creditor.email,
          },
          amount: Math.round(amount * 100) / 100,
        });

        // After debtor pays creditor: debtor owes less, creditor is owed less
        debtor.balance -= amount;
        creditor.balance += amount;
      }

      if (Math.abs(debtor.balance) < 0.01) i++;
      if (Math.abs(creditor.balance) < 0.01) j--;
    }

    res.status(200).json({
      status: "success",
      message: "Settlements calculated successfully",
      balances: Object.values(balances),
      suggestedSettlements: settlements,
    });
  } catch (error) {
    console.error("Error calculating settlements:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to calculate settlements",
      error: error.message,
    });
  }
};

// Create a settlement
const createSettlement = async (req, res) => {
  try {
    const groupId = req.params.groupId || req.body.groupId;
    const { fromUserId, toUserId, amount, paymentMethod, notes, expenseIds } = req.body;
    const userId = req.user.expenseAppUserId;

    // Validate required fields
    if (!groupId || !fromUserId || !toUserId || amount == null || amount === "") {
      return res.status(400).json({
        status: "failed",
        message: "Group ID, from user, to user, and amount are required",
      });
    }

    // Verify group and membership
    const group = await expenseGroupModel.findOne({ groupId, isActive: true });
    if (!group) {
      return res.status(404).json({
        status: "failed",
        message: "Group not found",
      });
    }

    const isMember = group.createdBy === userId ||
      group.members.some((m) => m.expenseAppUserId === userId && m.isActive);

    if (!isMember) {
      return res.status(403).json({
        status: "failed",
        message: "You don't have access to this group",
      });
    }

    // Get user details
    const fromUser = group.members.find((m) => m.expenseAppUserId === fromUserId);
    const toUser = group.members.find((m) => m.expenseAppUserId === toUserId);

    if (!fromUser || !toUser) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid user IDs",
      });
    }

    // Generate unique settlementId (required by schema; pre-save hook may run after validation)
    const nanoid = customAlphabet(alphabet, 12);
    let settlementId;
    let isUnique = false;
    while (!isUnique) {
      const candidateId = nanoid();
      const existing = await settlementModel.findOne({ settlementId: candidateId });
      if (!existing) {
        settlementId = candidateId;
        isUnique = true;
      }
    }

    // Create settlement
    const newSettlement = new settlementModel({
      settlementId,
      groupId,
      fromUser: {
        expenseAppUserId: fromUser.expenseAppUserId,
        name: fromUser.name,
        email: fromUser.email,
      },
      toUser: {
        expenseAppUserId: toUser.expenseAppUserId,
        name: toUser.name,
        email: toUser.email,
      },
      amount: Number(amount),
      currency: group.currency,
      status: "Pending",
      paymentMethod: paymentMethod || null,
      notes: notes || "",
      expenseIds: expenseIds || [],
      isActive: true,
    });

    await newSettlement.save();

    res.status(201).json({
      status: "success",
      message: "Settlement created successfully",
      settlement: newSettlement,
    });
  } catch (error) {
    console.error("Error creating settlement:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to create settlement",
      error: error.message,
    });
  }
};

// Get all settlements for a group
const getSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { status } = req.query;
    const userId = req.user.expenseAppUserId;

    // Verify group and membership
    const group = await expenseGroupModel.findOne({ groupId, isActive: true });
    if (!group) {
      return res.status(404).json({
        status: "failed",
        message: "Group not found",
      });
    }

    const isMember = group.createdBy === userId ||
      group.members.some((m) => m.expenseAppUserId === userId && m.isActive);

    if (!isMember) {
      return res.status(403).json({
        status: "failed",
        message: "You don't have access to this group",
      });
    }

    const query = { groupId, isActive: true };
    if (status) {
      query.status = status;
    }

    const settlements = await settlementModel.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      message: "Settlements fetched successfully",
      settlements,
    });
  } catch (error) {
    console.error("Error fetching settlements:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch settlements",
      error: error.message,
    });
  }
};

// Update settlement status
const updateSettlementStatus = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const { status, paymentMethod, notes } = req.body;
    const userId = req.user.expenseAppUserId;

    const settlement = await settlementModel.findOne({ settlementId, isActive: true });
    if (!settlement) {
      return res.status(404).json({
        status: "failed",
        message: "Settlement not found",
      });
    }

    // Verify group and membership
    const group = await expenseGroupModel.findOne({ groupId: settlement.groupId, isActive: true });
    const isMember = group.createdBy === userId ||
      group.members.some((m) => m.expenseAppUserId === userId && m.isActive);

    if (!isMember) {
      return res.status(403).json({
        status: "failed",
        message: "You don't have access to this settlement",
      });
    }

    // Update settlement
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (notes !== undefined) updateData.notes = notes;

    const updatedSettlement = await settlementModel.findOneAndUpdate(
      { settlementId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // If settlement is completed, mark related expenses as settled
    if (status === "Completed" && settlement.expenseIds && settlement.expenseIds.length > 0) {
      await groupExpenseModel.updateMany(
        { expenseId: { $in: settlement.expenseIds } },
        { $set: { isSettled: true, settledAt: new Date() } }
      );
    }

    res.status(200).json({
      status: "success",
      message: "Settlement updated successfully",
      settlement: updatedSettlement,
    });
  } catch (error) {
    console.error("Error updating settlement:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to update settlement",
      error: error.message,
    });
  }
};

// Get group dashboard/summary
const getGroupDashboard = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.expenseAppUserId;

    // Verify group and membership
    const group = await expenseGroupModel.findOne({ groupId, isActive: true });
    if (!group) {
      return res.status(404).json({
        status: "failed",
        message: "Group not found",
      });
    }

    const isMember = group.createdBy === userId ||
      group.members.some((m) => m.expenseAppUserId === userId && m.isActive);

    if (!isMember) {
      return res.status(403).json({
        status: "failed",
        message: "You don't have access to this group",
      });
    }

    // Get expenses
    const expenses = await groupExpenseModel.find({
      groupId,
      isActive: true,
    }).sort({ date: -1 });

    // Get settlements
    const settlements = await settlementModel.find({
      groupId,
      isActive: true,
    }).sort({ createdAt: -1 });

    // Calculate statistics
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const settledExpenses = expenses.filter((exp) => exp.isSettled);
    const totalSettled = settledExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const pendingSettlements = settlements.filter((s) => s.status === "Pending");
    const completedSettlements = settlements.filter((s) => s.status === "Completed");

    // Calculate user's balance
    const userBalance = {
      totalPaid: 0,
      totalOwed: 0,
      balance: 0,
    };

    expenses.forEach((expense) => {
      if (expense.paidBy.expenseAppUserId === userId) {
        userBalance.totalPaid += expense.amount;
      }
      const userSplit = expense.splits.find((s) => s.expenseAppUserId === userId);
      if (userSplit) {
        userBalance.totalOwed += userSplit.amount;
      }
    });

    userBalance.balance = userBalance.totalOwed - userBalance.totalPaid;

    res.status(200).json({
      status: "success",
      message: "Group dashboard fetched successfully",
      dashboard: {
        group,
        stats: {
          totalExpenses,
          totalExpenseCount: expenses.length,
          settledExpenses: settledExpenses.length,
          totalSettled,
          pendingSettlements: pendingSettlements.length,
          completedSettlements: completedSettlements.length,
        },
        recentExpenses: expenses.slice(0, 10),
        recentSettlements: settlements.slice(0, 10),
        userBalance,
      },
    });
  } catch (error) {
    console.error("Error fetching group dashboard:", error);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch group dashboard",
      error: error.message,
    });
  }
};

module.exports = {
  // Group management
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  addMembers,
  removeMember,
  deleteGroup,
  // Expense management
  addExpense,
  getGroupExpenses,
  updateExpense,
  deleteExpense,
  approveExpense,
  // Settlement management
  calculateSettlements,
  createSettlement,
  getSettlements,
  updateSettlementStatus,
  // Dashboard
  getGroupDashboard,
};
