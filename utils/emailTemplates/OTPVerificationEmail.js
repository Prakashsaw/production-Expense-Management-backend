const OTPVerificationEmail = (user, OTP, EMAIL_FROM) => {
  return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>OTP Verification - Expense Management System</title>
            </head>
            <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9;">

                <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f9f9f9">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <h1 style="color: #2A2A2A;">Expense Management System</h1>
                            <table width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                                <tr>
                                    <td align="center" style="padding: 40px;">

                                        <h2 style="color: #2A2A2A;">Action Required: OTP Verification</h2>

                                        <p style="color: #4A4A4A; font-size: 14px;">Hi, <span style="font-weight: bold;">${user.name}!</span>, Welcome to Expense Management System.</p>

                                        <p style="color: #4A4A4A; font-size: 14px;">You are receiving this because you have created a new user account on our <a href="https://expense-management-system-prakash.netlify.app/" style="color: #4CAF50; text-decoration: none;">Expense Management System</a>.<br>
                                        Please enter the one-time password (OTP) provided below to verify your identity.<br>
                                        Your OTP will expire in <span style="font-weight: bold;">10 minutes.</span></p>

                                        <p style="font-weight: bold; font-size: 20px; letter-spacing: 4px; color: #2A2A2A; margin: 20px 0;">${OTP}</p>

                                        <p style="color: #4A4A4A; font-size: 14px;">For any queries, please reach out to us at <a href="mailto:${EMAIL_FROM}" style="color: #4CAF50; text-decoration: none;">email us</a>.</p>

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

module.exports = OTPVerificationEmail;
