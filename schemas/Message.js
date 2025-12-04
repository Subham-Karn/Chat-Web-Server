const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  senderName: { type: String },
  text: { type: String, required: true }
}, { timestamps: true });

const Messsage = mongoose.model("Message", MessageSchema);

module.exports = Messsage;
