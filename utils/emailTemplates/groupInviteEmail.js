const groupInviteEmail = (member, group, inviter, clientUrl, EMAIL_FROM) => {
  const groupName = group.groupName || "Expense Group";
  const groupType = group.groupType || "Group";
  const inviterName = inviter?.name || "A group member";
  const inviterEmail = inviter?.email || "";
  const groupsLink = `${clientUrl}/user/groups`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Group Invitation - Expense Management System</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-content { padding: 20px !important; }
      .header-title { font-size: 24px !important; }
      .content-title { font-size: 20px !important; }
      .button { padding: 14px 28px !important; font-size: 14px !important; }
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
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 40px; text-align: center;">
              <h2 class="content-title" style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">
                👥 You've Been Added to a Group
              </h2>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td class="email-content" style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Hi <strong style="color: #6366f1;">${member.name || member.email}</strong>,
              </p>

              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.7;">
                You have been added to a shared expense group on <strong style="color: #6366f1;">Expense Management System</strong>.
              </p>

              <!-- Group Details -->
              <div style="background: #f3f4f6; border-radius: 10px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                  📌 Group Details:
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding: 6px 0; color: #4b5563; font-size: 14px;"><strong>Group Name:</strong></td>
                    <td style="padding: 6px 0; color: #1f2937; font-size: 14px; text-align: right; font-weight: 600;">${groupName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #4b5563; font-size: 14px;"><strong>Group Type:</strong></td>
                    <td style="padding: 6px 0; color: #1f2937; font-size: 14px; text-align: right;">${groupType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #4b5563; font-size: 14px;"><strong>Added By:</strong></td>
                    <td style="padding: 6px 0; color: #1f2937; font-size: 14px; text-align: right;">${inviterName}${inviterEmail ? ` (${inviterEmail})` : ""}</td>
                  </tr>
                </table>
              </div>

              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.7;">
                In this group, you can:
              </p>

              <ul style="margin: 0 0 24px 20px; padding: 0; color: #4b5563; font-size: 14px; line-height: 1.8;">
                <li>View all shared expenses for <strong>${groupName}</strong></li>
                <li>Add new expenses and choose how to split them</li>
                <li>See who owes whom and settle balances</li>
              </ul>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${groupsLink}" class="button" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
                      🔍 View Group Expenses
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                If you did not expect this invitation, you can safely ignore this email.
              </p>

              <!-- Support -->
              <p style="margin: 24px 0 0 0; color: #4b5563; font-size: 14px; line-height: 1.7;">
                Need help? Contact us at 
                <a href="mailto:${EMAIL_FROM}" style="color: #6366f1; text-decoration: none; font-weight: 600;">${EMAIL_FROM}</a>
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
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

module.exports = groupInviteEmail;

