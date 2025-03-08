const resetPasswordEmail = (user, resetPasswordLink, EMAIL_FROM) => {
  return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password - Expense Management System</title>
            </head>
            <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9;">

                <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f9f9f9">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <h1 style="color: #2A2A2A;">Expense Management System</h1>
                            <table width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                                <tr>
                                    <td align="center" style="padding: 40px;">

                                        <h2 style="color: #2A2A2A;">Action Required: Reset Your Password</h2>

                                        <p style="color: #4A4A4A; font-size: 14px;">Hi, <span style="font-weight: bold;">${user.name}</span>,</p>

                                        <p style="color: #4A4A4A; font-size: 14px;">You are receiving this because you (or someone else) requested the reset of your <a href="https://expense-management-system-prakash.netlify.app/" style="color: #4CAF50; text-decoration: none;">Expense Management System</a> user account password.</p>

                                        <p style="color: #4A4A4A; font-size: 14px;">Click the below button to reset your password.</p>

                                        <a href="${resetPasswordLink}" style="background-color: #04AA6D; color: white; padding: 12px 24px; text-decoration: none; font-size: 16px; border-radius: 8px; display: inline-block; margin: 20px 0;">Reset Password</a>

                                        <p style="color: #4A4A4A; font-size: 14px;">If this was you, you can continue with the reset password link.<br>
                                        If not, please reach out to us at <a href="mailto:${EMAIL_FROM}" style="color: #4CAF50; text-decoration: none;">email us</a> for help.</p>

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
            </html>`; // Html Body Ending Here;
};

module.exports = resetPasswordEmail;
