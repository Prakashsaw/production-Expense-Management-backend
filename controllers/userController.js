const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const transporter = require("../config/emailConfig");
const CLIENT_URL = require("../utils/baseURL");
const UserTokenModel = require("../models/userTokenModel");
const emailVerificationEmail = require("../utils/emailTemplates/emailVerificationEmail");
const resetPasswordEmail = require("../utils/emailTemplates/resetPasswordEmail");
const resetPasswordSuccess = require("../utils/emailTemplates/resetPasswordSuccess");
const changedPasswordSuccess = require("../utils/emailTemplates/changedPasswordSuccess");
const UserOTPModel = require("../models/userOTPModel");
const OTPVerificationEmail = require("../utils/emailTemplates/OTPVerificationEmail");
const axios = require("axios");
const UserPhoneNumberModel = require("../models/userPhoneNumberModel");

const { customAlphabet } = require("nanoid");
const GoogleAuthUserModel = require("../models/model.user.googleAuth");
const sendMailThroughBrevo = require("../services/brevoEmailService");
const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const createToken = (expenseAppUserId) => {
  const jwtSecreteKey = process.env.JWT_SECRETE_KEY;

  return jwt.sign({ expenseAppUserId }, jwtSecreteKey, {
    expiresIn: process.env.EXPIRE_IN,
  });
};

//Register Callback: Login not required
const registerController = async (req, res) => {
  const { name, email, phoneNumber, password } = req.body;

  try {
    // Ckeck for any field should not be empty
    if (!name || !email || !password) {
      console.log("All fields are required!");
      return res.status(400).json({
        Status: "failed",
        message: "All fields are required...!",
      });
    }

    // Validate the email that email entered is in correct email format
    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ Status: "failed", message: "Email must be a valid email..." });
    }

    // For strong password
    if (!validator.isStrongPassword(password)) {
      return res.status(400).json({
        Status: "failed",
        message:
          "Password must be a strong password which includes capital letters, small letters and numbers...!",
      });
    }

    // Check that that user with this email already exist or not
    const user = await userModel.findOne({ email: email });
    if (user) {
      return res.status(400).json({
        status: "failed",
        message: "User already exists...",
      });
    }

    // Check if user has already signed up with Google using the same email
    // Note: Email/password users and Google users are separate, but we prevent duplicate emails
    const googleUser = await GoogleAuthUserModel.findOne({ email: email });
    if (googleUser) {
      return res.status(400).json({
        status: "failed",
        message: "This email is already registered with Google Sign-In. Please use Google Sign-In to login.",
      });
    }

    // Creating a hashCode for password and keep this hashcode in database
    // instead of actual password
    const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT));
    const passwordHashingCode = await bcrypt.hash(password, salt);

    // Generate a Nano ID for user
    const nanoid = customAlphabet(alphabet, 10); // 10 is the length of the Nano ID
    const nanoId = nanoid();

    // Now create and save the user in database
    const newUser = new userModel({
      expenseAppUserId: nanoId,
      name: name,
      email: email,
      phoneNumber: phoneNumber,
      password: passwordHashingCode,
    });

    await newUser.save();

    // For jwt token
    const jwt_token = createToken(newUser.expenseAppUserId);

    // Now create model in UserTokenModel for verification of email and save it
    const userToken = new UserTokenModel({
      expenseAppUserId: newUser.expenseAppUserId,
      token: jwt_token,
    });

    await userToken.save();

    const emailVerificationLink = `${CLIENT_URL}/email-verification/${newUser.expenseAppUserId}/${jwt_token}`;
    // Now Send Email

    try {
      info = await sendMailThroughBrevo({
        to: newUser.email,
        subject: "Welcome! Please verify your email",
        html: emailVerificationEmail(newUser, emailVerificationLink, process.env.EMAIL_FROM) // Your HTML generator
      });
    } catch (error) {
      console.error("Email verifications mail failed to send...! Error:", error);
      return res.status(400).json({
        status: "failed",
        message: "Email verifications mail failed to send...!",
      });
    }

    // try {
    //   await transporter.sendMail({
    //     from: {
    //       name: "Expense Management System",
    //       address: process.env.EMAIL_FROM,
    //     },
    //     to: newUser.email,
    //     subject: "Please verify your email address",
    //     html: emailVerificationEmail(
    //       newUser,
    //       emailVerificationLink,
    //       process.env.EMAIL_FROM
    //     ),
    //   });
    // } catch (error) {
    //   console.error("Email verifications mail failed to send...! Error:", error);
    //   return res.status(400).json({
    //     status: "failed",
    //     message: "Email verifications mail failed to send...!",
    //   });
    // }
    
    return res.status(200).json({
      success: true,
      registeredWith: "EMAIL", // Flag to identify email/password users
      newUser: {
        expenseAppUserId: newUser.expenseAppUserId,
        name: newUser.name,
        token: jwt_token,
        isVerified: newUser.isVerified,
      },
      Status: "Success",
      message: "Successfully Registered...!",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: "failed",
      message: "Unable to register...!",
    });
  }
};

const verifyEmail = async (req, res) => {
  const { expenseAppUserId, token } = req.params;
  try {
    const user = await UserTokenModel.findOne({
      expenseAppUserId: expenseAppUserId,
    });
    if (!user) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or Expired Token (Token not found)...!",
      });
    }

    const paramsToken = String(token);

    if (user.token !== paramsToken) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or Expired Token...!",
      });
    }

    const result = await userModel.findOneAndUpdate(
      { expenseAppUserId: expenseAppUserId },
      {
        $set: { isVerified: true },
      }
    );

    // Now delete the token from UserTokenModel
    await UserTokenModel.findOneAndDelete({
      expenseAppUserId: user.expenseAppUserId,
    });

    return res.status(200).json({
      status: "success",
      message: "Email verified successfully",
      result,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: "failed",
      message: "Something went wrong in email verification...!",
    });
  }
};

// Send Email vefication for OTP verification: Login not required
const sendEmailForOTPVerification = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res
        .status(400)
        .json({ status: "failed", message: "Email field required...!" });
    }

    const user = await userModel.findOne({ email: email });
    if (!user) {
      return res
        .status(400)
        .json({ status: "failed", message: "User doesn't exist...!" });
    }

    // Generate OTP: 6 digit random number
    const OTP = Math.floor(100000 + Math.random() * 900000);

    // Now send the OTP to user's email
    try {
      info = await sendMailThroughBrevo({
        to: user.email,
        subject: "OTP for Email Verification",
        html: OTPVerificationEmail(user, OTP, process.env.EMAIL_FROM) // Your HTML generator
      });
    } catch (error) {
      console.error("OTP verification mail failed to send...! Error:", error);
      return res.status(400).json({
        status: "failed",
        message: "OTP verification mail failed to send...!",
      });
    }

    const userOTP = await UserOTPModel.findOne({
      expenseAppUserId: user.expenseAppUserId,
    });
    // If user is already created then update the OTP in database
    if (userOTP) {
      const updatedOTP = await UserOTPModel.findOneAndUpdate(
        { expenseAppUserId: userOTP.expenseAppUserId },
        {
          $set: { otp: String(OTP) },
        }
      );
    } else {
      // Now create model in UserOTPModel for verification of email and save it
      const newUserOTP = new UserOTPModel({
        expenseAppUserId: user.expenseAppUserId,
        otp: String(OTP),
      });
      await newUserOTP.save();
    }

    return res.status(200).json({
      status: "success",
      message: "OTP sent successfully. Please Check Your Email...!",
      email: user.email,
      expenseAppUserId: user.expenseAppUserId,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: "failed",
      message: "Something went wrong in sending OTP for email verification...!",
    });
  }
};

//Verify Email through OTP: Login not required
const verifyEmailThroughOTP = async (req, res) => {
  const { expenseAppUserId } = req.params;
  const { otp } = req.body;
  try {
    const user = await userModel.findOne({
      expenseAppUserId: expenseAppUserId,
    });
    if (!user) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or Expired OTP...!",
      });
    }

    const userOTP = await UserOTPModel.findOne({
      expenseAppUserId: expenseAppUserId,
    });
    if (!userOTP) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or Expired OTP...!",
      });
    }

    const OTP = String(otp);
    // console.log("OTP: ", OTP);
    // console.log("userOTP: ", userOTP.otp);
    if (userOTP.otp !== OTP) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or Expired OTP, Problem in otp...!",
      });
    }

    const result = await userModel.findOneAndUpdate(
      { expenseAppUserId: expenseAppUserId },
      {
        $set: { isVerified: true },
      }
    ); // Update the isVerified field in userModel

    // Now delete the OTP from UserOTPModel
    await UserOTPModel.findOneAndDelete({
      expenseAppUserId: userOTP.expenseAppUserId,
    });

    return res.status(200).json({
      status: "success",
      message:
        "Email verification through OTP has been verified successfully...!",
      result,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: "failed",
      message: "Something went wrong in email verification through OTP...!",
    });
  }
};

// Login Callback: Login not required
const loginControllerThroughEmail = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Ckeck that any field not be empty
    if (!email || !password) {
      return res.status(400).json({
        Status: "failed",
        message: "All fields are required...!",
      });
    }

    const user = await userModel.findOne({ email: email });
    if (!user) {
      return res
        .status(400)
        .json({ Status: "failed", message: "Invalid email or password...!" });
    }

    // Validate user password
    const validatePassword = await bcrypt.compare(password, user.password);
    if (user.email !== email || !validatePassword) {
      return res.status(400).json({
        Status: "failed",
        message: "Invalid email or Password...!",
      });
    }

    // Now start the JWT process here
    const jwt_token = createToken(user.expenseAppUserId);

    // If user is not verified then send email verification link again
    if (!user.isVerified) {
      const result = await UserTokenModel.findOne({
        expenseAppUserId: user.expenseAppUserId,
      });
      if (result) {
        // Update the token in UserTokenModel
        const newToken = jwt_token;
        const updatedToken = await UserTokenModel.findOneAndUpdate(
          { expenseAppUserId: user.expenseAppUserId },
          {
            $set: { token: newToken },
          }
        );
      } else {
        // Now create model in UserTokenModel for verification of email and save it
        const userToken = new UserTokenModel({
          expenseAppUserId: user.expenseAppUserId,
          token: jwt_token,
        });
        await userToken.save();
      }

      const emailVerificationLink = `${CLIENT_URL}/email-verification/${user.expenseAppUserId}/${jwt_token}`;
      // Now Send Email
      try {
        info = await sendMailThroughBrevo({
          to: user.email,
          subject: "Welcome! Please verify your email",
          html: emailVerificationEmail(user, emailVerificationLink, process.env.EMAIL_FROM) // Your HTML generator
        });
      } catch (error) {
        console.error("Email verifications mail failed to send...! Error:", error);
        return res.status(400).json({
          status: "failed",
          message: "Email verifications mail failed to send...!",
        });
      }

      return res.status(400).json({
        status: "failed",
        message:
          "Email not verified. Please check your email (in spam folder also) and verify your email...!",
      });
    }

    return res.status(200).json({
      success: true,
      registeredWith: "EMAIL", // Flag to identify email/password users
      user: {
        expenseAppUserId: user.expenseAppUserId,
        name: user.name,
        token: jwt_token,
        isVerified: user.isVerified,
      },
      Status: "Success",
      message: "Successfully LoggedIn...!",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: "failed",
      message: "Unable to login. Please try again..!",
    });
  }
};

// Controller for fetching details of Logged User: Login required
const loggedUser = async (req, res) => {
  const user = req.user;

  res.send({
    user: {
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber ?? "Not Provided",
      isPhoneVerified: user.isPhoneVerified ?? false,
      address: user.address ?? "Not Provided",
      favouriteSport: user.favouriteSport ?? "Not Provided",
      birthDate: user.birthDate ?? "",
      gender: user.gender ?? "Prefer not to say",
      isVerified: user.isVerified ?? false,
      secondaryEmail: user.secondaryEmail ?? null,
      isSecondaryEmailVerified: user.isSecondaryEmailVerified ?? false,
      createdAt: user.createdAt,
    },
  });
};


// Controller for user profile update: Login required
const updateUserProfile = async (req, res) => {
  const { name, email, phoneNumber, address, birthDate, favouriteSport, gender } =
    req.body;

  console.log("Req body: ", req.body);
  try {
    if (
      !name ||
      !email ||
      !phoneNumber ||
      !address ||
      !birthDate ||
      !favouriteSport ||
      !gender
    ) {
      return res
        .status(400)
        .json({ status: "failed", message: "All fields are required...!" });
    }

    // Check if user exists in regular userModel or GoogleAuthUserModel
    const user = await userModel.findOne({ expenseAppUserId: req.user.expenseAppUserId });
    const googleUser = await GoogleAuthUserModel.findOne({ expenseAppUserId: req.user.expenseAppUserId });

    if (!user && !googleUser) {
      return res.status(400).json({
        status: "failed",
        message: "User doesn't exist or Unauthorize user...!",
      });
    }

    // Update regular user if exists
    if (user) {
      const updateData = {
        name: name,
        email: email,
        address: address,
        birthDate: String(birthDate),
        favouriteSport: favouriteSport,
        gender: gender,
      };
      
      // Only update phoneNumber if it's different, and preserve isPhoneVerified status
      // If phone number is being changed, isPhoneVerified should be handled by phone OTP verification endpoint
      if (String(phoneNumber) !== user.phoneNumber) {
        updateData.phoneNumber = String(phoneNumber);
        // If phone number is changed, reset verification status (will be set to true after OTP verification)
        updateData.isPhoneVerified = false;
      } else {
        // Keep existing phone number and verification status
        updateData.phoneNumber = user.phoneNumber;
        // Don't update isPhoneVerified if phone number hasn't changed
      }

      await userModel.findOneAndUpdate(
        { expenseAppUserId: req.user.expenseAppUserId },
        { $set: updateData }
      );
    }

    // Update Google auth user if exists
    if (googleUser) {
      const updateData = {
        name: name,
        email: email,
        address: address,
        birthDate: String(birthDate),
        favouriteSport: favouriteSport,
        gender: gender,
      };
      
      // Only update phoneNumber if it's different, and preserve isPhoneVerified status
      if (String(phoneNumber) !== googleUser.phoneNumber) {
        updateData.phoneNumber = String(phoneNumber);
        updateData.isPhoneVerified = false;
      } else {
        updateData.phoneNumber = googleUser.phoneNumber;
      }

      await GoogleAuthUserModel.findOneAndUpdate(
        { expenseAppUserId: req.user.expenseAppUserId },
        { $set: updateData }
      );
    }

    return res.status(200).json({
      status: "success",
      message: "User profile updated successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: "failed",
      message: "Something went wrong in updating user profile...!",
    });
  }
};

// Reset User Password : Login required
// MiddlwWare: checkUserAuth is used here
// This is for if user is logged in then he can reset his password
const changePassword = async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  try {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ status: "failed", message: "All fields are required...!" });
    }

    // BTW No need of this validation because user is already logged in
    if (!req.user) {
      return res.status(400).json({
        status: "failed",
        message: "Unauthorize user...!",
      });
    }

    // Check if user is a Google auth user - they cannot change password
    const googleUser = await GoogleAuthUserModel.findOne({
      expenseAppUserId: req.user.expenseAppUserId,
    });
    if (googleUser) {
      return res.status(400).json({
        status: "failed",
        message: "Password change is not available for Google Sign-In users. Please use Google to manage your account.",
      });
    }

    // Validate user password first - only for email/password users
    const user = await userModel.findOne({
      expenseAppUserId: req.user.expenseAppUserId,
    });
    
    if (!user) {
      return res.status(400).json({
        status: "failed",
        message: "User not found...!",
      });
    }

    const validatePassword = await bcrypt.compare(oldPassword, user.password);
    if (!validatePassword) {
      return res.status(400).json({
        Status: "failed",
        message: "Incorrect old password...!",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: "failed",
        message: "Password and confirm password mismatched...!",
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        status: "failed",
        message: "Old Password and New Password should not be same...!",
      });
    }

    const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT));
    const newHashPassword = await bcrypt.hash(newPassword, salt);

    const result = await userModel.findOneAndUpdate(
      { expenseAppUserId: req.user.expenseAppUserId },
      {
        $set: { password: newHashPassword },
      }
    );

    // Send the mail to user that his password has been changed successfully.
    try {
      info = await sendMailThroughBrevo({
        to: user.email,
        subject: "Congratulation! Your password has been changed successfully",
        html: changedPasswordSuccess(user, process.env.EMAIL_FROM) // Your HTML generator
      });
    } catch (error) {
      console.error("Password changed success mail failed to send...! Error:", error);
      return res.status(400).json({
        status: "failed",
        message: "Password changed success mail failed to send...!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "User password changed successfully",
      result,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: "failed",
      message: "Something went wrong in reset user password...!",
    });
  }
};

// Send User Password Reset Email: Login not required
const sendUserPasswordResetEmail = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res
        .status(400)
        .json({ status: "failed", message: "Email field required...!" });
    }

    // Check if user is a Google auth user - they cannot reset password
    const googleUser = await GoogleAuthUserModel.findOne({ email: email });
    if (googleUser) {
      return res.status(400).json({
        status: "failed",
        message: "This email is registered with Google Sign-In. Password reset is not available. Please use Google Sign-In to access your account.",
      });
    }

    const user = await userModel.findOne({ email: email });
    if (!user) {
      return res
        .status(400)
        .json({ status: "failed", message: "User doesn't exist...!" });
    }
    const secrete = user.expenseAppUserId + process.env.JWT_SECRETE_KEY;
    const token = jwt.sign(
      { expenseAppUserId: user.expenseAppUserId },
      secrete,
      {
        expiresIn: "60m",
      }
    );

    const reset_password_link = `${CLIENT_URL}/reset-password/${user.expenseAppUserId}/${token}`;

    // Now Send Email
    try {
      info = await sendMailThroughBrevo({
        to: user.email,
        subject: "Reset your Expense Management System account password",
        html: resetPasswordEmail(user,reset_password_link, process.env.EMAIL_FROM) // Your HTML generator
      });
    } catch (error) {
      console.error("Password reset mail failed to send...! Error:", error);
      return res.status(400).json({
        status: "failed",
        message: "Password reset mail failed to send...!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Password Reset Email Sent. Please Check Your Email...!",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: "failed",
      message: "Something went wrong in sending user password reset email...!",
    });
  }
};

const resetUserPasswordThroughForgotPassword = async (req, res) => {
  const { password, confirmPassword } = req.body;
  const { expenseAppUserId, token } = req.params; // by params we get things which is in links
  try {
    if (!password || !confirmPassword) {
      return res
        .status(400)
        .json({ status: "failed", message: "All fields are required...!" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: "failed",
        message: "Password and confirm password mismatched...!",
      });
    }

    const user = await userModel.findOne({
      expenseAppUserId: expenseAppUserId,
    });

    const new_secrete = user.expenseAppUserId + process.env.JWT_SECRETE_KEY;
    const payload = jwt.verify(token, new_secrete);

    if (!payload) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or Expired Token...!",
      });
    }

    // Now hash password and update in database
    const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT));
    const newHashPassword = await bcrypt.hash(password, salt);

    const result = await userModel.findOneAndUpdate(
      { expenseAppUserId: user.expenseAppUserId },
      {
        $set: { password: newHashPassword },
      }
    );

    // Send the mail to user that his password has been reset successfully.
    try {
      info = await sendMailThroughBrevo({
        to: user.email,
        subject: "Congratulations! Your password has been reset successfully",
        html: resetPasswordSuccess(user, process.env.EMAIL_FROM) // Your HTML generator
      });
    } catch (error) {
      console.error("Password reset success mail failed to send...! Error:", error);
      return res.status(400).json({
        status: "failed",
        message: "Password reset success mail failed to send...!",
      });
    }
    
    return res.status(200).json({
      status: "success",
      message: "User password reset successfully",
      result,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: "failed",
      message: "Something went wrong in reset user password...!",
    });
  }
};

// Fot OTP Verification through Mobile Number
const sendOTPForMobileVerification = async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    if (!phoneNumber) {
      return res.status(400).json({
        status: "failed",
        message: "Phone number field required...!",
      });
    }

    // Generate OTP: 6 digit random number
    const OTP = Math.floor(100000 + Math.random() * 900000);

    // Now check that user with this mobile number already exist or not
    const user = await UserPhoneNumberModel.findOne({
      phoneNumber: phoneNumber,
    });

    // If user with this mobile number already exist then update the OTP in database
    // and then sent SMS for OTP verification.
    // If user is not created then create the user and save the OTP in database
    // and then sent SMS for OTP verification.
    if (user) {
      // Now send the OTP to user's mobile number
      // const info = await sendSMS(mobileNumber, OTP);
      // const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      //   params: {
      //     authorization: process.env.FAST2SMS_API_KEY,
      //     variables_values: `${OTP}`,
      //     route: "otp",
      //     numbers: Number(phoneNumber),
      //   },
      // });

      const messageData = {
        sender_id: "FSTSMS",
        message: `Your OTP for phone number verification is ${OTP} - Expense Management System.`,
        language: "english",
        route: "q",
        numbers: phoneNumber,
      };

      const response = await axios.post(
        "https://www.fast2sms.com/dev/bulkV2",
        messageData,
        {
          headers: {
            Authorization: process.env.FAST2SMS_API_KEY,
          },
        }
      );

      console.log("SMS Response: ", response);

      const updatedOTP = await UserPhoneNumberModel.findByIdAndUpdate(
        user._id,
        {
          $set: { otp: String(OTP) },
        }
      );

      res.json({
        success: true,
        message:
          "OTP sent successfully. Check your phone and verify with your OTP...!",
      });
    } else {
      // Now send the OTP to user's mobile number
      // const info = await sendSMS(mobileNumber, OTP);
      // const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      //   params: {
      //     authorization: process.env.FAST2SMS_API_KEY,
      //     variables_values: `${OTP}`,
      //     route: "otp",
      //     numbers: Number(phoneNumber),
      //   },
      // });

      const messageData = {
        sender_id: "FSTSMS",
        message: `Your OTP for phone number verification is ${OTP} - Expense Management System.`,
        language: "english",
        route: "q",
        numbers: phoneNumber,
      };

      const response = await axios.post(
        "https://www.fast2sms.com/dev/bulkV2",
        messageData,
        {
          headers: {
            Authorization: process.env.FAST2SMS_API_KEY,
          },
        }
      );

      console.log("SMS Response: ", response);

      // Now create model in UserMobileNumberModel for verification of mobile number and save it
      const newUserPhoneNumber = new UserPhoneNumberModel({
        phoneNumber: phoneNumber,
        otp: String(OTP),
      });
      await newUserPhoneNumber.save();

      res.json({
        success: true,
        message:
          "OTP sent successfully. Check your phone and verify with your OTP...!",
        phoneNumber: phoneNumber,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: "failed",
      message:
        "Something went wrong in sending OTP for phone number verification...!",
    });
  }
};

// Verify Mobile Number through OTP: Login not required
const verifyMobileNumberThroughOTP = async (req, res) => {
  const { phoneNumber } = req.body;
  const { otp } = req.body;
  try {
    const user = await UserPhoneNumberModel.findOne({
      phoneNumber: phoneNumber,
    });
    if (!user) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or Expired OTP...!",
      });
    }

    if (user.otp !== String(otp)) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or Expired OTP...!",
      });
    }

    // Update the OTP in data base with null and isVerified to true.
    user.otp = "null";
    user.isVerified = true;
    await user.save();

    return res.status(200).json({
      status: "success",
      message:
        "Phone number verification through OTP has been verified successfully...!",
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: "failed",
      message:
        "Something went wrong in phone number verification through OTP...!",
    });
  }
};

// Send OTP for phone verification during profile update: Login required
const sendPhoneOTPForProfileUpdate = async (req, res) => {
  const { phoneNumber } = req.body;
  const expenseAppUserId = req.user.expenseAppUserId;

  try {
    if (!phoneNumber) {
      return res.status(400).json({
        status: "failed",
        message: "Phone number field required...!",
      });
    }

    // Generate OTP: 6 digit random number
    const OTP = Math.floor(100000 + Math.random() * 900000);

    // Send OTP via SMS
    const messageData = {
      sender_id: "FSTSMS",
      message: `Your OTP for phone number verification is ${OTP} - Expense Management System.`,
      language: "english",
      route: "q",
      numbers: phoneNumber,
    };

    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      messageData,
      {
        headers: {
          Authorization: process.env.FAST2SMS_API_KEY,
        },
      }
    );

    console.log("SMS Response: ", response);

    // Check if phone number already exists in UserPhoneNumberModel
    const existingPhone = await UserPhoneNumberModel.findOne({
      phoneNumber: phoneNumber,
    });

    if (existingPhone) {
      // Update OTP
      existingPhone.otp = String(OTP);
      existingPhone.isVerified = false;
      existingPhone.expenseAppUserId = expenseAppUserId;
      await existingPhone.save();
    } else {
      // Create new entry
      const newUserPhoneNumber = new UserPhoneNumberModel({
        phoneNumber: phoneNumber,
        otp: String(OTP),
        expenseAppUserId: expenseAppUserId,
        isVerified: false,
      });
      await newUserPhoneNumber.save();
    }

    return res.status(200).json({
      status: "success",
      message: "OTP sent successfully. Check your phone and verify with your OTP...!",
      phoneNumber: phoneNumber,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      status: "failed",
      message: "Something went wrong in sending OTP for phone number verification...!",
    });
  }
};

// Verify phone OTP and update user profile: Login required
const verifyPhoneOTPAndUpdateProfile = async (req, res) => {
  const { phoneNumber, otp } = req.body;
  const expenseAppUserId = req.user.expenseAppUserId;

  try {
    if (!phoneNumber || !otp) {
      return res.status(400).json({
        status: "failed",
        message: "Phone number and OTP are required...!",
      });
    }

    const phoneRecord = await UserPhoneNumberModel.findOne({
      phoneNumber: phoneNumber,
      expenseAppUserId: expenseAppUserId,
    });

    if (!phoneRecord) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or Expired OTP...!",
      });
    }

    if (phoneRecord.otp !== String(otp)) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or Expired OTP...!",
      });
    }

    // Check if user exists in regular userModel or GoogleAuthUserModel
    const user = await userModel.findOne({ expenseAppUserId: expenseAppUserId });
    const googleUser = await GoogleAuthUserModel.findOne({ expenseAppUserId: expenseAppUserId });

    if (!user && !googleUser) {
      return res.status(400).json({
        status: "failed",
        message: "User doesn't exist or Unauthorized user...!",
      });
    }

    // Update phone number and verification status
    if (user) {
      await userModel.findOneAndUpdate(
        { expenseAppUserId: expenseAppUserId },
        {
          $set: {
            phoneNumber: phoneNumber,
            isPhoneVerified: true,
          },
        }
      );
    }

    if (googleUser) {
      await GoogleAuthUserModel.findOneAndUpdate(
        { expenseAppUserId: expenseAppUserId },
        {
          $set: {
            phoneNumber: phoneNumber,
            isPhoneVerified: true,
          },
        }
      );
    }

    // Mark phone as verified in UserPhoneNumberModel
    phoneRecord.isVerified = true;
    phoneRecord.otp = "null";
    await phoneRecord.save();

    return res.status(200).json({
      status: "success",
      message: "Phone number verified and updated successfully...!",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      status: "failed",
      message: "Something went wrong in verifying phone number...!",
    });
  }
};

// Send OTP for secondary email verification: Login required
const sendSecondaryEmailOTP = async (req, res) => {
  const { secondaryEmail } = req.body;
  const expenseAppUserId = req.user.expenseAppUserId;

  try {
    if (!secondaryEmail) {
      return res.status(400).json({
        status: "failed",
        message: "Secondary email field required...!",
      });
    }

    // Check if secondary email is same as primary email
    const user = await userModel.findOne({ expenseAppUserId: expenseAppUserId });
    const googleUser = await GoogleAuthUserModel.findOne({ expenseAppUserId: expenseAppUserId });
    const currentUser = user || googleUser;

    if (currentUser && currentUser.email === secondaryEmail) {
      return res.status(400).json({
        status: "failed",
        message: "Secondary email cannot be same as primary email...!",
      });
    }

    // Generate OTP: 6 digit random number
    const OTP = Math.floor(100000 + Math.random() * 900000);

    // Send OTP via email
    try {
      const info = await sendMailThroughBrevo({
        to: secondaryEmail,
        subject: "OTP for Secondary Email Verification - Expense Management System",
        html: OTPVerificationEmail({ name: currentUser?.name || "User", email: secondaryEmail }, OTP, process.env.EMAIL_FROM)
      });
    } catch (error) {
      console.error("OTP verification mail failed to send...! Error:", error);
      return res.status(400).json({
        status: "failed",
        message: "OTP verification mail failed to send...!",
      });
    }

    // Check if user OTP record exists
    const userOTP = await UserOTPModel.findOne({
      expenseAppUserId: expenseAppUserId,
      emailType: "secondary",
    });

    if (userOTP) {
      // Update OTP
      await UserOTPModel.findOneAndUpdate(
        { expenseAppUserId: expenseAppUserId, emailType: "secondary" },
        {
          $set: {
            otp: String(OTP),
            email: secondaryEmail,
          },
        }
      );
    } else {
      // Create new OTP record
      const newUserOTP = new UserOTPModel({
        expenseAppUserId: expenseAppUserId,
        otp: String(OTP),
        email: secondaryEmail,
        emailType: "secondary",
      });
      await newUserOTP.save();
    }

    return res.status(200).json({
      status: "success",
      message: "OTP sent successfully. Please Check Your Email...!",
      secondaryEmail: secondaryEmail,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      status: "failed",
      message: "Something went wrong in sending OTP for secondary email verification...!",
    });
  }
};

// Verify secondary email OTP and update profile: Login required
const verifySecondaryEmailOTP = async (req, res) => {
  const { secondaryEmail, otp } = req.body;
  const expenseAppUserId = req.user.expenseAppUserId;

  try {
    if (!secondaryEmail || !otp) {
      return res.status(400).json({
        status: "failed",
        message: "Secondary email and OTP are required...!",
      });
    }

    const userOTP = await UserOTPModel.findOne({
      expenseAppUserId: expenseAppUserId,
      email: secondaryEmail,
      emailType: "secondary",
    });

    if (!userOTP) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or Expired OTP...!",
      });
    }

    if (userOTP.otp !== String(otp)) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or Expired OTP...!",
      });
    }

    // Check if user exists
    const user = await userModel.findOne({ expenseAppUserId: expenseAppUserId });
    const googleUser = await GoogleAuthUserModel.findOne({ expenseAppUserId: expenseAppUserId });

    if (!user && !googleUser) {
      return res.status(400).json({
        status: "failed",
        message: "User doesn't exist or Unauthorized user...!",
      });
    }

    // Update secondary email and verification status
    if (user) {
      await userModel.findOneAndUpdate(
        { expenseAppUserId: expenseAppUserId },
        {
          $set: {
            secondaryEmail: secondaryEmail,
            isSecondaryEmailVerified: true,
          },
        }
      );
    }

    if (googleUser) {
      await GoogleAuthUserModel.findOneAndUpdate(
        { expenseAppUserId: expenseAppUserId },
        {
          $set: {
            secondaryEmail: secondaryEmail,
            isSecondaryEmailVerified: true,
          },
        }
      );
    }

    // Delete OTP record
    await UserOTPModel.findOneAndDelete({
      expenseAppUserId: expenseAppUserId,
      emailType: "secondary",
    });

    return res.status(200).json({
      status: "success",
      message: "Secondary email verified and added successfully...!",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      status: "failed",
      message: "Something went wrong in verifying secondary email...!",
    });
  }
};

// Remove secondary email: Login required
const removeSecondaryEmail = async (req, res) => {
  const expenseAppUserId = req.user.expenseAppUserId;

  try {
    const user = await userModel.findOne({ expenseAppUserId: expenseAppUserId });
    const googleUser = await GoogleAuthUserModel.findOne({ expenseAppUserId: expenseAppUserId });

    if (!user && !googleUser) {
      return res.status(400).json({
        status: "failed",
        message: "User doesn't exist or Unauthorized user...!",
      });
    }

    // Remove secondary email
    if (user) {
      await userModel.findOneAndUpdate(
        { expenseAppUserId: expenseAppUserId },
        {
          $set: {
            secondaryEmail: null,
            isSecondaryEmailVerified: false,
          },
        }
      );
    }

    if (googleUser) {
      await GoogleAuthUserModel.findOneAndUpdate(
        { expenseAppUserId: expenseAppUserId },
        {
          $set: {
            secondaryEmail: null,
            isSecondaryEmailVerified: false,
          },
        }
      );
    }

    return res.status(200).json({
      status: "success",
      message: "Secondary email removed successfully...!",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      status: "failed",
      message: "Something went wrong in removing secondary email...!",
    });
  }
};

module.exports = {
  registerController,
  verifyEmail,
  loginControllerThroughEmail,
  updateUserProfile,
  changePassword,
  sendUserPasswordResetEmail,
  loggedUser,
  resetUserPasswordThroughForgotPassword,
  sendEmailForOTPVerification,
  verifyEmailThroughOTP,
  sendOTPForMobileVerification,
  verifyMobileNumberThroughOTP,
  sendPhoneOTPForProfileUpdate,
  verifyPhoneOTPAndUpdateProfile,
  sendSecondaryEmailOTP,
  verifySecondaryEmailOTP,
  removeSecondaryEmail,
};
