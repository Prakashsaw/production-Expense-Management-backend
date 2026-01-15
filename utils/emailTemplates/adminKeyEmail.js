const adminKeyEmail = (adminName, adminKey, EMAIL_FROM) => {
  return `<!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Admin Access Key - Expense Management System</title>
          </head>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9;">

              <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f4f3f3">
                  <tr>
                      <td align="center" style="padding: 40px 0;">
                        <h1 style="color: #2A2A2A;">Expense Management System</h1>
                          <table width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                              <tr>
                                  <td align="left" style="padding: 40px;">

                                      <h2 style="color: #2A2A2A;">Admin Access Approved</h2>

                                      <p style="color: #4A4A4A; font-size: 14px;">Hi, <span style="font-weight: bold;">${adminName}</span>,<br>
                                      Your request for admin access has been approved!</p>

                                      <p style="color: #4A4A4A; font-size: 14px;">You can now access the Admin Dashboard using the following credentials:</p>

                                      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                                          <p style="color: #2A2A2A; font-size: 14px; margin: 0 0 10px 0;"><strong>Your Admin Key:</strong></p>
                                          <p style="color: #667eea; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 0; font-family: 'Courier New', monospace;">${adminKey}</p>
                                      </div>

                                      <p style="color: #4A4A4A; font-size: 14px;"><strong>Important:</strong> Please keep this key secure and do not share it with anyone.</p>

                                      <p style="color: #4A4A4A; font-size: 14px;">To login, visit the <a href="https://expense-management-system-prakash.netlify.app/admin/login" style="color: #4CAF50; text-decoration: none;">Admin Login Page</a> and use your email address along with this admin key.</p>

                                      <p style="color: #4A4A4A; font-size: 14px;">If you need assistance, please contact us at <a href="mailto:${EMAIL_FROM}" style="color: #4CAF50; text-decoration: none;">email us</a>.</p>

                                      <p style="color: #4A4A4A; font-size: 14px;">Thanks & Regards,<br>
                                        Expense Management System and Team.</p>

                                        <!-- Divider -->
                                        <hr style="border: 0; border-top: 1px solid #ddd; margin: 30px 0; width: 100%;" />

                                        <div style="margin-top: 30px; text-align: center;">
                                            <a href="https://www.linkedin.com/in/prakash-saw-5b1215220/" style="margin: 0 10px; text-decoration: none;">
                                                <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" width="24" height="24" />
                                            </a>
                                            <a href="https://github.com/Prakashsaw" style="margin: 0 10px; text-decoration: none;">
                                                <img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" alt="GitHub" width="24" height="24" />
                                            </a>
                                            <a href="https://prakashsawportfolio.netlify.app/" style="margin: 0 10px; text-decoration: none;">
                                                <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" width="24" height="24" />
                                            </a>
                                        </div>

                                  </td>
                              </tr>
                          </table>

                          <p style="color: #9A9A9A; font-size: 12px; margin-top: 20px;">This message was sent from Prakash & Company Pvt. Ltd, BCIT Park, Bangalore, Karnataka, India 560064</p>

                      </td>
                  </tr>
              </table>

          </body>
          </html>`; // Html Body Ending Here
};

module.exports = adminKeyEmail;
