const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

// Store connected users: { socketId: { name: string } }
const users = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // When a user joins with a name
  socket.on('join', (userName) => {
    users[socket.id] = { name: userName || `User ${socket.id.slice(0, 4)}` };
    
    // Broadcast to everyone that a new user joined
    io.emit('user-joined', {
      message: `${users[socket.id].name} joined the chat`,
      users: Object.keys(users).map(id => ({ id, name: users[id].name }))
    });
    
    // Send the current user list to the new user
    io.emit('update-user-list', Object.keys(users).map(id => ({ id, name: users[id].name })));
  });

  // Handle chat messages (both global and private)
  socket.on('chat message', (data) => {
    if (users[socket.id]) {
      const messagePayload = {
        text: data.text,
        from: users[socket.id].name,
        fromId: socket.id,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isPrivate: !!data.toId
      };

      if (data.toId) {
        // Private message
        // Send to recipient
        io.to(data.toId).emit('chat message', messagePayload);
        // Also send back to sender so they can see it in their private thread
        socket.emit('chat message', messagePayload);
      } else {
        // Global message
        io.emit('chat message', messagePayload);
      }
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    if (users[socket.id]) {
      if (data.toId) {
        // Private typing
        io.to(data.toId).emit('typing', {
          user: users[socket.id].name,
          isTyping: data.isTyping,
          fromId: socket.id,
          isPrivate: true
        });
      } else {
        // Global typing
        socket.broadcast.emit('typing', {
          user: users[socket.id].name,
          isTyping: data.isTyping,
          isPrivate: false
        });
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const userName = users[socket.id].name;
      delete users[socket.id];
      
      io.emit('user-left', {
        message: `${userName} left the chat`,
        users: Object.keys(users).map(id => ({ id, name: users[id].name }))
      });
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
