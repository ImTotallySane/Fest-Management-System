require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const DB_Connect = require('./config/db');
const seedAdmin = require('./config/admin');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const adminRoutes = require('./routes/admin');
const teamRoutes = require('./routes/teams');
const discussionRoutes = require('./routes/discussions');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: '*' }
});

// make io accessible in route files
app.set('io', io);

io.on('connection', (socket) => {
    socket.on('join-event', (eventId) => {
        socket.join(`event:${eventId}`);
    });
    socket.on('leave-event', (eventId) => {
        socket.leave(`event:${eventId}`);
    });
});

DB_Connect().then(() => {
    seedAdmin(); 
}); 

// allows react app to access this API ig
app.use(cors());
// allows server to read JSON data sent in requests
app.use(express.json());
// serve uploaded payment proof images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', authRoutes); 
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/feedback', feedbackRoutes);
// // if a user visits ANY URL starting with /api/auth, let the authRoutes file handle it"

app.get('/test', (req, res) => {
    res.json({
        message: "Sigma (working)"
    });
});

const PORT = process.env.PORT;
server.listen(PORT, () => {
    console.log(`Server is on port ${PORT}`);
})


