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

const users = {};

io.on('connection', (socket) => {
  socket.on('join', (userName) => {
    users[socket.id] = { name: userName || `User ${socket.id.slice(0, 4)}` };
    
    io.emit('user-joined', {
      message: `${users[socket.id].name} joined the chat`,
      users: Object.keys(users).map(id => ({ id, name: users[id].name }))
    });
    
    io.emit('update-user-list', Object.keys(users).map(id => ({ id, name: users[id].name })));
  });

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
        io.to(data.toId).emit('chat message', messagePayload);
        socket.emit('chat message', messagePayload);
      } else {
        io.emit('chat message', messagePayload);
      }
    }
  });

  socket.on('typing', (data) => {
    if (users[socket.id]) {
      if (data.toId) {
        io.to(data.toId).emit('typing', {
          user: users[socket.id].name,
          isTyping: data.isTyping,
          fromId: socket.id,
          isPrivate: true
        });
      } else {
        socket.broadcast.emit('typing', {
          user: users[socket.id].name,
          isTyping: data.isTyping,
          isPrivate: false
        });
      }
    }
  });

  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const userName = users[socket.id].name;
      delete users[socket.id];
      
      io.emit('user-left', {
        message: `${userName} left the chat`,
        users: Object.keys(users).map(id => ({ id, name: users[id].name }))
      });
    }
  });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
