// Server-side
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
// const io = new Server(server);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// Provide assets
app.use(express.static('public'));

app.get('/favicon.ico', (req, res) => {
    res.sendFile(__dirname + '/favicon.ico');
});

// Set up routers
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/chat', (req, res) => {
    res.sendFile(__dirname + '/chat.html');
});

// Socket.IO
const cache = {
    messages: []
};

io.on('connection', (socket) => {

    // Listen for users logging on
    console.log('a user connected');

    // Send the cached messages
    io.emit('chat cache', cache.messages);

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    // Chat messages
    socket.on('chat message', (msg) => {
        console.log('message: ' + msg);
        cache.messages.push(msg);
        io.emit('chat message', msg);
    });

    // Join battle
    socket.on('join battle', (msg) => {
        console.log('message: ' + msg);
        io.emit('join battle', msg);
    });

  // socket.broadcast.emit('hi');
});
// io.emit('some event', { someProperty: 'some value', otherProperty: 'other value' }); // This will emit the event to all connected sockets


server.listen(3000, () => {
  console.log('listening on *:3000');
});
