/**
 * Email template for bill reminder notifications
 * @param {Object} user - User object with name and email
 * @param {Object} billReminder - Bill reminder object
 * @param {String} daysUntilDue - Number of days until due (e.g., "7", "1", "0")
 * @param {String} EMAIL_FROM - Sender email address
 * @returns {String} HTML email template
 */
const billReminderEmail = (user, billReminder, daysUntilDue, EMAIL_FROM) => {
  const dueDate = new Date(billReminder.dueDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let urgencyMessage = "";
  let urgencyColor = "#6366f1";
  let urgencyIcon = "📅";
  let headerGradient = "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)";

  if (daysUntilDue === "0") {
    urgencyMessage = "⚠️ This bill is due TODAY!";
    urgencyColor = "#ef4444";
    urgencyIcon = "🚨";
    headerGradient = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
  } else if (daysUntilDue === "1") {
    urgencyMessage = "⚠️ This bill is due TOMORROW!";
    urgencyColor = "#f59e0b";
    urgencyIcon = "⚠️";
    headerGradient = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
  } else if (daysUntilDue === "7") {
    urgencyMessage = "📅 This bill is due in 7 days";
    urgencyColor = "#f59e0b";
    urgencyIcon = "📅";
    headerGradient = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Bill Reminder - Expense Management System</title>
    <style>
        @media only screen and (max-width: 600px) {
            .email-container { width: 100% !important; max-width: 100% !important; }
            .email-content { padding: 20px !important; }
            .header-title { font-size: 24px !important; }
            .content-title { font-size: 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background: linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Header -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin-bottom: 30px;">
                    <tr>
                        <td align="center" style="padding: 0 0 20px 0;">
                            <h1 class="header-title" style="margin: 0; color: #6366f1; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                                Expense Management System
                            </h1>
                        </td>
                    </tr>
                </table>

                <!-- Main Email Container -->
                <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; box-shadow: 0 20px 60px rgba(99, 102, 241, 0.15); overflow: hidden;">
                    <!-- Gradient Header -->
                    <tr>
                        <td style="background: ${headerGradient}; padding: 30px 40px; text-align: center;">
                            <h2 class="content-title" style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">
                                ${urgencyIcon} Bill Reminder
                            </h2>
                        </td>
                    </tr>

                    <!-- Content Area -->
                    <tr>
                        <td class="email-content" style="padding: 40px;">
                            <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                                Hi <strong style="color: #6366f1;">${user.name}</strong>,
                            </p>

                            <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.7;">
                                This is a friendly reminder about an upcoming bill payment. Please review the details below and make sure to pay it before the due date to avoid any late fees or penalties.
                            </p>

                            <!-- Urgency Alert -->
                            <div style="background: ${urgencyColor === "#ef4444" ? "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)" : urgencyColor === "#f59e0b" ? "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)" : "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%)"}; border: 2px solid ${urgencyColor === "#ef4444" ? "rgba(239, 68, 68, 0.2)" : urgencyColor === "#f59e0b" ? "rgba(245, 158, 11, 0.2)" : "rgba(99, 102, 241, 0.2)"}; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                                <p style="margin: 0; color: ${urgencyColor}; font-size: 48px; line-height: 1;">${urgencyIcon}</p>
                                <p style="margin: 12px 0 0 0; color: ${urgencyColor === "#ef4444" ? "#dc2626" : urgencyColor === "#f59e0b" ? "#d97706" : "#4f46e5"}; font-size: 18px; font-weight: 600;">
                                    ${urgencyMessage}
                                </p>
                            </div>

                            <!-- Bill Details -->
                            <div style="background: #f3f4f6; border-radius: 10px; padding: 20px; margin: 24px 0;">
                                <p style="margin: 0 0 12px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                                    💳 Bill Details:
                                </p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                        <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong>Bill Name:</strong></td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: 600;">${billReminder.billName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong>Amount:</strong></td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: 600;">₹${parseFloat(billReminder.amount).toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong>Due Date:</strong></td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: 600;">${dueDate}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong>Category:</strong></td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${billReminder.category}</td>
                                    </tr>
                                    ${billReminder.frequency !== "One-time" ? `
                                    <tr>
                                        <td style="padding: 8px 0; color: #4b5563; font-size: 14px;"><strong>Frequency:</strong></td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${billReminder.frequency}</td>
                                    </tr>
                                    ` : ""}
                                </table>
                            </div>

                            ${billReminder.notes ? `
                            <!-- Notes -->
                            <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(79, 70, 229, 0.05) 100%); border-left: 4px solid #6366f1; border-radius: 8px; padding: 20px; margin: 24px 0;">
                                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                                    📝 Notes:
                                </p>
                                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.7;">
                                    ${billReminder.notes}
                                </p>
                            </div>
                            ` : ""}

                            <!-- Action Reminder -->
                            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                                    💡 <strong>Tip:</strong> If you have already paid this bill, please mark it as paid in your dashboard to stop receiving reminders.
                                </p>
                            </div>

                            <!-- App Link -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="https://expense-management-system-prakash.netlify.app/user/bills" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
                                            📋 View Bill Details
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Support -->
                            <p style="margin: 32px 0 0 0; color: #4b5563; font-size: 14px; line-height: 1.7;">
                                If you have any questions, feel free to contact us at <a href="mailto:${EMAIL_FROM}" style="color: #6366f1; text-decoration: none; font-weight: 600;">${EMAIL_FROM}</a>
                            </p>

                            <p style="margin: 24px 0 0 0; color: #1f2937; font-size: 15px; line-height: 1.7;">
                                Best regards,<br>
                                <strong style="color: #6366f1;">Expense Management System Team</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 40px; text-align: center;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 16px;">
                                        <a href="https://www.linkedin.com/in/prakash-saw-5b1215220/" style="display: inline-block; margin: 0 12px; text-decoration: none;">
                                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" width="32" height="32" style="border-radius: 6px;">
                                        </a>
                                        <a href="https://github.com/Prakashsaw" style="display: inline-block; margin: 0 12px; text-decoration: none;">
                                            <img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" alt="GitHub" width="32" height="32" style="border-radius: 6px;">
                                        </a>
                                        <a href="https://prakashsawportfolio.netlify.app/" style="display: inline-block; margin: 0 12px; text-decoration: none;">
                                            <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" width="32" height="32" style="border-radius: 6px;">
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                                This message was sent from Prakash & Company Pvt. Ltd<br>
                                BCIT Park, Bangalore, Karnataka, India 560064
                            </p>
                            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                                This is an automated reminder. If you have already paid this bill, please mark it as paid in your dashboard.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

module.exports = billReminderEmail;
