const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" } // পরে নির্দিষ্ট করো
});

app.use(express.static(path.join(__dirname, 'public'))); 

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


io.on('connection', (socket,req) => {
  console.log('User connected:', req);

  // নতুন ইউজার জয়েন → সবাইকে জানাও
  io.emit('user-joined', `User ${socket.id.slice(0,6)} joined`);

  // মেসেজ পেলে সবাইকে পাঠাও
  socket.on('chat message', (msg) => {
    io.emit('chat message', {
      text: msg,
      from: socket.id.slice(0,6),
      time: new Date().toLocaleTimeString()
    });
  });

  // টাইপিং ইন্ডিকেটর (অপশনাল)
  socket.on('typing', () => {
    socket.broadcast.emit('typing', socket.id.slice(0,6));
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    io.emit('user-left', `User ${socket.id.slice(0,6)} left`);
  });
});

const PORT = 8080;
httpServer.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
