const cron = require("node-cron");
const billReminderModel = require("../models/billReminderModel");
const userModel = require("../models/userModel");
const sendMailThroughBrevo = require("./brevoEmailService");
const billReminderEmail = require("../utils/emailTemplates/billReminderEmail");
const moment = require("moment");

/**
 * Check and send bill reminders
 * This function checks for bills that need reminders and sends emails
 */
const checkAndSendReminders = async () => {
  try {
    console.log("Checking for bill reminders...", new Date().toISOString());

    const today = moment().startOf("day");
    const tomorrow = moment().add(1, "day").startOf("day");
    const nextWeek = moment().add(7, "days").startOf("day");

    // Find all unpaid, active bills that are due soon
    const billsToCheck = await billReminderModel.find({
      isPaid: false,
      isActive: true,
      dueDate: {
        $gte: today.toDate(),
        $lte: nextWeek.toDate(),
      },
    });

    console.log(`Found ${billsToCheck.length} bills to check for reminders`);

    for (const bill of billsToCheck) {
      try {
        const dueDate = moment(bill.dueDate).startOf("day");
        const daysUntilDue = dueDate.diff(today, "days");

        // Get user email
        const user = await userModel.findOne({
          expenseAppUserId: bill.expenseAppUserId,
        });

        if (!user || !user.email) {
          console.log(`User not found or no email for bill ${bill.reminderId}`);
          continue;
        }

        let shouldSend = false;
        let reminderType = null;

        // Check if we need to send a 7-day reminder
        if (daysUntilDue === 7 && !bill.reminderSent["7d"]) {
          shouldSend = true;
          reminderType = "7d";
        }
        // Check if we need to send a 1-day reminder
        else if (daysUntilDue === 1 && !bill.reminderSent["1d"]) {
          shouldSend = true;
          reminderType = "1d";
        }
        // Check if we need to send a 24-hour (same day) reminder
        else if (daysUntilDue === 0 && !bill.reminderSent["24h"]) {
          shouldSend = true;
          reminderType = "24h";
        }

        if (shouldSend && reminderType) {
          try {
            // Send email reminder
            await sendMailThroughBrevo({
              to: user.email,
              subject: `Bill Reminder: ${bill.billName} - Due ${dueDate.format("MMM DD, YYYY")}`,
              html: billReminderEmail(user, bill, daysUntilDue.toString(), process.env.EMAIL_FROM),
            });

            // Update reminder sent flag
            bill.reminderSent[reminderType] = true;
            await bill.save();

            console.log(
              `Reminder sent for bill ${bill.billName} (${bill.reminderId}) - ${reminderType} reminder`
            );
          } catch (emailError) {
            console.error(
              `Failed to send reminder email for bill ${bill.reminderId}:`,
              emailError
            );
          }
        }
      } catch (error) {
        console.error(`Error processing bill ${bill.reminderId}:`, error);
      }
    }

    console.log("Bill reminder check completed");
  } catch (error) {
    console.error("Error in bill reminder scheduler:", error);
  }
};

/**
 * Initialize the bill reminder scheduler
 * Runs every hour to check for bills that need reminders
 */
const initializeBillReminderScheduler = () => {
  // Run every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
  cron.schedule("0 * * * *", () => {
    checkAndSendReminders();
  });

  // Also run immediately on server start (optional, for testing)
  // checkAndSendReminders();

  console.log("Bill reminder scheduler initialized - running every hour");
};

module.exports = {
  checkAndSendReminders,
  initializeBillReminderScheduler,
};
