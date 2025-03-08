const changedPasswordSuccess = (user, EMAIL_FROM) => {
  return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset Successful</title>
            </head>
            <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9;">

                <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f9f9f9">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <h1 style="color: #2A2A2A;">Expense Management System</h1>
                            <table width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                                <tr>
                                    <td align="center" style="padding: 40px;">

                                        <h2 style="color: #2A2A2A;">Password Reset Successful</h2>

                                        <p style="color: #4A4A4A; font-size: 14px;">Hi, <span style="font-weight: bold;">{{user_name}}</span>,</p>

                                        <p style="color: #4A4A4A; font-size: 14px;">You are receiving this because you have changed the password of your <a href="https://expense-management-system-prakash.netlify.app/" style="color: #4CAF50; text-decoration: none;">Expense Management System</a> user account.</p>

                                        <p style="color: #4A4A4A; font-size: 14px;">If this was you, you can safely ignore this email.<br>
                                        If not, please reach out to us at <a href="mailto:{{email_from}}" style="color: #4CAF50; text-decoration: none;">email us</a> for help.</p>

                                        <p style="color: #4A4A4A; font-size: 14px;">Thanks & Regards,<br>
                                        Expense Management System and Team.</p>

                                    </td>
                                </tr>
                            </table>

                            <p style="color: #9A9A9A; font-size: 12px; margin-top: 20px;">This message was sent from Prakash & Company Pvt. Ltd, BCIT Park, Bangalore, Karnataka, India 560064</p>

                        </td>
                    </tr>
                </table>

            </body>
            </html>`; // Html Body Ending Here.
};

module.exports = changedPasswordSuccess;
