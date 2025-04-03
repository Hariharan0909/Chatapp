const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: ["http://10.16.49.151:5500", "http://localhost:5500"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const users = {};
const bullyingCount = {};
const bannedUsers = {};

io.on('connection', socket => {
  console.log('New user connected');

  socket.on('new-user', name => {
    users[socket.id] = name;
    socket.broadcast.emit('user-connected', name);
  });

  socket.on('send-chat-message', async message => {
    if (bannedUsers[socket.id]) {
      return;
    }

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://10.16.49.151:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: message })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      if (data.is_bullying) {
        bullyingCount[socket.id] = (bullyingCount[socket.id] || 0) + 1;

        if (bullyingCount[socket.id] <= 3) {
          socket.emit('warning', `Warning! This is your ${bullyingCount[socket.id]}${bullyingCount[socket.id] === 1 ? 'st' : bullyingCount[socket.id] === 2 ? 'nd' : 'rd'} warning for cyberbullying.`);
        }

        if (bullyingCount[socket.id] > 3) {
          bannedUsers[socket.id] = true;
          socket.emit('banned', 'You are temporarily banned for 2 minutes due to repeated cyberbullying.');
          socket.emit('black-screen', true);

          setTimeout(() => {
            delete bannedUsers[socket.id];
            delete bullyingCount[socket.id];
            socket.emit('unbanned', 'You have been unbanned. Please be respectful!');
          }, 2 * 60 * 1000);
          return;
        } else {
          const blurredMessage = '*'.repeat(message.length);
          socket.broadcast.emit('chat-message', { message: blurredMessage, name: users[socket.id] });
        }
      } else {
        socket.broadcast.emit('chat-message', { message: message, name: users[socket.id] });
      }
    } catch (error) {
      console.error('Error analyzing message:', error);
    }
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit('user-disconnected', users[socket.id]);
    delete users[socket.id];
    delete bullyingCount[socket.id];
    delete bannedUsers[socket.id];
  });
});

const PORT = 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
