const  mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    fullName: {             // human readable name
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {         // hashed password
      type: String,
      required: true
    },

    // optional: roles, avatar, lastSeen etc.
  },
  { timestamps: true }      // adds createdAt and updatedAt automatically
);

const User = mongoose.model("User", UserSchema);

module.exports = User;
