const User = require('../schemas/User');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");


const registerUser = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    // Validation
    if ( !fullName || !email || !password) {
      return res.status(400).json({
        message: "All fields (username, fullName, email, password) are required!",
      });
    }

    // Email exists?
    const existEmail = await User.findOne({ email });
    if (existEmail) {
      return res.status(409).json({ message: `${email} is already registered!` });
    }

    // Hash password
    const hashPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      fullName: fullName,
      email,
      passwordHash: hashPassword,
    });

    // Create Token
    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "User Created Successfully!",
      token,
      user: newUser,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error!" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required!",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: `${email} is not registered!`,
      });
    }

    // Compare password
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({
        message: `Incorrect password!`,
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: `Welcome back ${user.fullName}!`,
      token,
      user,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error!" });
  }
};


module.exports = {
    registerUser,
    loginUser
}