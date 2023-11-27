const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/User.js');
const jwt = require("jsonwebtoken");
require('dotenv').config();
const Message = require('./models/Message.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
      origin: 'http://192.168.1.8:3000',
      methods: ['GET', 'POST'],
    },
  });
const port = process.env.PORT || 3001;
const cors = require('cors');


mongoose.connect(process.env.DATABASE_URL);

app.use(cors());
app.use(express.json());

const users = {};

io.on('connection', (socket) => {
  //console.log('A user has connected');

  // Handle user initialization
  socket.on('init', (user, recipient) => {
    users[socket.id] = user;
  
    // Emit the list of users to all clients
    io.emit('userList', Object.values(users));
  
    const currentUser = user;
    const selectedRecipient = recipient;
  
    // Fetch initial messages between the current user and selected recipient
    
  });

  socket.on('joinRoom', (data) => {
    const room = getRoomName(data.sender, data.recipient);
    socket.join(room);
  })

  // Handle incoming messages
  socket.on('message', (data) => {
    const room = getRoomName(data.sender, data.recipient);
    io.to(room).emit('message', {
        sender: users[socket.id],
        content: data.content
    })
    if (typeof data === 'object' && data.user && data.content && data.recipient) {
      const newMessage = new Message({
        user: data.user,
        content: data.content,
        recipient: data.recipient
      });

      newMessage
        .save()
        .then(() => {
          io.emit('message', newMessage);
        })
        .catch((error) => {
          console.error('Error saving message:', error);
        });
    } else {
      console.error('Invalid message data format:', data);
    }
  });

  function getRoomName(sender, recipient) {
    return [sender, recipient].sort().join('-');
  }

  // Handle disconnection
  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('userList', Object.values(users));
  });
});


app.get('/', (req, res) => {
    res.send("backend up")
})

app.post("/api/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      // Check if the username is already taken
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      // Create a new user
      const newUser = new User({ username, password });
      // Save the new user to the database
      await newUser.save();
      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "An error occurred while registering the user" });
    }
  });

 
  
  
  // handle authentication
  app.post("/api/auth", async (req, res) => {
    const { username, password } = req.body;
    //console.log(process.env.JWT_SECRET)
  
    const user = await User.findOne({ username });
  
    if (!user) return res.status(400).send("User not found or does not exist");
  
    if (user.password !== password)
      return res.status(400).send("Incorrect password");
  
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.send({ token });
  
  });

  // Add this endpoint to fetch the list of users
app.get('/api/users', async (req, res) => {
    try {
      const users = await User.find({}, 'username');
      res.json({ users });
      //console.log("worked supposedly")
    } catch (error) {
      console.error('Error fetching user list:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/messages/:user/:recipient', async (req, res) => {
    try {
      const { user, recipient } = req.params;
      const messages = await Message.find({
        $or: [
          { user, recipient },
          { user: recipient, recipient: user },
        ],
      }).sort({ createdAt: -1 });
  
      res.json({ messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

server.listen(port, (req, res) => {
    console.log("working on port " + port)
})
