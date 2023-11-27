const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  user: String,
  content: String,
  recipient: String,
  createdAt: {type: Date, default: Date.now}
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;