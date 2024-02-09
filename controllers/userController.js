const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const  transporter  = require("../config/emailConfig");

const createToken = (_id) => {
  const jwtSecreteKey = process.env.JWT_SECRETE_KEY;

  return jwt.sign({ _id }, jwtSecreteKey, { expiresIn: process.env.EXPIRE_IN });
};

//Register Callback: Login not required
const registerController = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Ckeck that any field not be empty
    if (!name || !email || !password) {
      console.log("All fields are required!");
      return res.status(400).json({
        Status: "failed",
        message: "All fields are required...!",
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
        message: "Password must be a strong password...",
      });
    }

    // Creating a hashCode for password and keep this hashcode in database
    // instead of actual password
    const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT));
    const passwordHashingCode = await bcrypt.hash(password, salt);

    const newUser = new userModel({
      name: name,
      email: email,
      password: passwordHashingCode,
    });
    await newUser.save();

    // For jwt token
    const jwt_token = createToken(newUser._id);

    res.status(200).json({
      success: true,
      newUser,
      Status: "Success",
      message: "Successfully Registered...!",
      _id: newUser._id,
      name,
      email,
      jwt_token,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: "failed",
      message: "Unable to register...!",
    });
  }
};

// Login Callback: Login not required
const loginController = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Ckeck that any field not be empty
    if (!email || !password) {
      console.log("All fields are required!");
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
    const jwt_token = createToken(user._id);

    res.status(200).json({
      success: true,
      user,
      Status: "Success",
      message: "Successfully LoggedIn...!",
      _id: user._id,
      name: user.name,
      email,
      jwt_token,
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
  res.send({ user: req.user });
};

// Reset User Password : Login required
// MiddlwWare: checkUserAuth is used here
// This is for if user is logged in then he can reset his password
const changePassword = async (req, res) => {
  const { password, confirmPassword } = req.body;
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

    const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT));
    const newHashPassword = await bcrypt.hash(password, salt);

    const result = await userModel.findByIdAndUpdate(req.user._id, {
      $set: { password: newHashPassword },
    });

    res.status(200).json({
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

// Send User Password Reset Email: Login not required
const sendUserPasswordResetEmail = async (req, res) => {
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
    const secrete = user._id + process.env.JWT_SECRETE_KEY;
    const token = jwt.sign({ _id: user._id }, secrete, { expiresIn: "60m" });

    const reset_password_link = `http://localhost:3000/reset-password/${user._id}/${token}`;

    // Now Send Email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject:
        "You Requested for password reset so this email is regarding password reset.",
      html: `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="X-UA-Compatible" content="IE=edge">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Document</title>
                    <style>
                        *{
                            box-sizing: border-box;
                        }
                        table{
                            border: transparent;
                            background-color: rgb(220, 216, 216);
                            border: none;
                            border-spacing: 0px;
                            border-radius: 0.25rem; 
                            /* box-shadow: 2px 3px 10px;  */
                        
                        }
                        body{
                            /* background-color: rgb(248, 225, 217); */
                            display: flex;
                            flex-direction: column-reverse;
                            justify-content: center;
                            align-items: center;
                            font-size: 16px;
                        }
                        .title{
                            margin-bottom: 1rem;
                            overflow: hidden;
                            color: rgb(4, 55, 150);
                            font-size: 2em;
                            font-weight: bolder;
                        
                            font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            padding-top: 1rem;
                            padding-bottom: 1rem;
                        }
                        tr{
                            text-align: center;
                        }
                        
                        .top{
                            background-color: rgb(4, 55, 150);
                            color: white;
                            padding-bottom: 1rem;
                        }
                        .msg{
                            font-size: large;
                            margin-top: 1.5rem;
                            margin-bottom: 1.5rem;
                        }
                
                        
                        .code{
                            border-radius: 4px;
                            color: white;
                            font-size: 2em;
                            display: initial;
                            padding-left: 1rem;
                            padding-right: 1rem;
                            font-family:'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif ;
                
                        }
                
                        .contactus{
                            margin-top: 1rem;
                            padding-top: 1rem;
                            /* line-height: 30px; */
                            font-size: 1.5rem;
                            padding-bottom: 1rem;
                        
                        }
                        .copywrite{
                            background-color: rgb(4, 55, 150);
                            color: white;
                            width: 100%;
                            padding-left: 0px;
                            padding-right: 0px;
                            height: 1.75rem;
                            text-align: center;
                            padding-top: 5px;
                            border-bottom-left-radius: 0.25rem; 
                            border-bottom-right-radius: 0.25rem;
                        }
                    
                    </style>
                </head>
                <body>
                    <table  style="background-color: rgb(237, 242, 243);">
                        <th class="title"> Prakash & Company</th>
                        <tbody>
                            <tr class="top">
                                <td>
                                    <img src="https://drive.google.com/uc?export=view&id=1GhR10Ud4KMVY5dHahmrCQMzGRATkZGtk" alt="" width="150">
                                    <p>Welcome To Prakash and Company!<br><br>
                                        <span style="font-size: 2rem;">Reset Your Password</span>
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div class="msg">Hi, ${user.name}<br>Please Click Below Link to Reset Your Password! This will redirect to reset form where you will have to give new password.</div>
                                    <div class="code"><a href=${reset_password_link}>Click here</a></div>
                                    <div><br></div>
                                </td>
                            </tr>
                        <tr>
                        
                        </tr>
                            <tr class="footer">
                                <td style=" background-color: rgb(217, 223, 228);">
                                    <div class="contactus"><span style="color: rgb(4, 55, 150);  font-weight: bold;">Get in touch</span><br>Phone: +91-8873323323<br>Email: ${process.env.EMAIL_FROM}</div>
                                    <div class="copywrite">Copyrights © Prakash & Company || All Rights Reserved</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </body>
                </html>`, // Html Body Ending Here
    });

    // console.log(info);

    res.status(200).json({
      status: "success",
      message: "Password Reset Email Sent. Please Check Your Email...!",
      "Sent Email Info": info,
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
  const { _id, token } = req.params; // by params we get things which is in links
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

    const user = await userModel.findById(_id);

    const new_secrete = user._id + process.env.JWT_SECRETE_KEY;
    const payload = jwt.verify(token, new_secrete);

    if (!payload) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid or Expired Token...!",
      });
    }
    console.log(payload);

    // Now hash password and update in database
    const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT));
    const newHashPassword = await bcrypt.hash(password, salt);

    const result = await userModel.findByIdAndUpdate(user._id, {
      $set: { password: newHashPassword },
    });

    res.status(200).json({
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

module.exports = {
  registerController,
  loginController,
  changePassword,
  sendUserPasswordResetEmail,
  loggedUser,
  resetUserPasswordThroughForgotPassword,
};
