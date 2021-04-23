// Import and configure dotenv to enable use of environmental variable
const dotenv = require("dotenv");
dotenv.config();

// Imports from express validator to validate user input
const { validationResult } = require("express-validator");

// Import User model
const User = require("../models/user.js");

// Import JWT for authentication process
const jwt = require("jsonwebtoken");

// Import Bcrypt to hash users password
const bcrypt = require("bcryptjs");

// Controller to sign up a new user
const signup = async (req, res, next) => {
  // Validating User Inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new Error("Invalid input passed, please check it", 422));
  }

  // Defining User Inputs
  const { email, password } = req.body;

  // Check if user with email address already exists
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email.toLowerCase() });
  } catch (err) {
    const error = new Error("Signing up failed, please try again.", 500);
    return next(error);
  }

  // Answer if user already exists
  if (existingUser) {
    const error = new Error("User exists already, please login instead.", 422);
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new Error("Could not create user, please try again.", 500);
    return next(error);
  }

  const emailLowerCase = email.toLowerCase();

  const createdUser = new User({
    email: emailLowerCase,
    password: hashedPassword,
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new Error("Signing up failed, please try again later.", 500);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY
    );
  } catch (err) {
    const error = new Error(err.message, 500);
    return next(error);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

exports.signup = signup;
