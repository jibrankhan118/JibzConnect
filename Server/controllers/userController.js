const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const User = require("../models/User");
const Channel = require("../models/Channel");
const ChannelMember = require("../models/ChannelMember");

const validateUsername = (username) => {
  if (!username) return "Username is required";
  if (username.length < 3 || username.length > 20) return "Username must be between 3 and 20 characters";
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return "Username can only contain letters, numbers, and underscores";
  return null;
};

const validateEmail = (email) => {
  if (!email) return "Email is required";
  const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email) || email.includes("..")) return "Please enter a valid email address";
  return null;
};

const validatePassword = (password) => {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters long";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  return null;
};

const register = async (req, res) => {
  try {
    let { username, email, password } = req.body;
    username = username?.trim();
    email = email?.trim().toLowerCase();
    if (!username || !email || !password) return res.status(400).json({ success: false, message: "Username, email, and password are required" });
    const usernameError = validateUsername(username);
    if (usernameError) return res.status(400).json({ success: false, message: usernameError });
    const emailError = validateEmail(email);
    if (emailError) return res.status(400).json({ success: false, message: emailError });
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });
    const existingUser = await User.findOne({ where: { [Op.or]: [{ email }, { username }] } });
    if (existingUser) {
      if (existingUser.email === email) return res.status(400).json({ success: false, message: "An account with this email already exists" });
      if (existingUser.username === username) return res.status(400).json({ success: false, message: "This username is already taken" });
      return res.status(400).json({ success: false, message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashedPassword });
    const generalChannel = await Channel.findOne({ where: { name: "General" } });
    if (generalChannel) await ChannelMember.create({ userId: user.id, channelId: generalChannel.id, role: "member" });
    return res.status(201).json({ success: true, message: "User registered successfully", user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ success: false, message: "Server error while registering user" });
  }
};

const login = async (req, res) => {
  try {
    let { email, password } = req.body;
    email = email?.trim().toLowerCase();
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required" });
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, "your_secret_key", { expiresIn: "1d" });
    return res.status(200).json({ success: true, message: "Login successful", token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error while logging in" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ["id", "username", "email"], where: { id: { [Op.ne]: req.user.id } } });
    return res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Server error fetching users." });
  }
};

module.exports = { register, login, getAllUsers };
