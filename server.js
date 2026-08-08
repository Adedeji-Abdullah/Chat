import mongoose from 'mongoose';
import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import Auth from './model/Auth.js';
import Message from './model/Message.js';


dotenv.config();

const app = express();
app.use(cors({
    origin: 'https://chat-tau-mauve-70.vercel.app',
    origin: 'https://chat-comm.vercel.app/'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 4000;
const CONNECTION = process.env.CONNECTION

// create HTTP server and socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.post('/register', async (req, res) => {
    try {
        const body = await new Auth(req.body);
        const result = await body.save();
        res.json(result);
        console.log(result)
    } catch (error) {
        console.error('Error registering user', error);
        res.status(500).send('Error registering user');
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await Auth.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        res.json({ message: 'Login successful' });
    } catch (error) {
        console.error('Error logging in user', error);
        res.status(500).json({ error: 'Error logging in user' });
    }
});

app.get("/Info/:email", async(req, res) => {
    try {
        const data = await Auth.findOne({ email: req.params.email });
        console.log({ data })
        if (!data) {
           return res.status(404).json("Error: user not found")
        }
        res.json({ data })
    } catch (error) {
        console.log("An error occur in displaying logged in users", error)
        res.status(500).json({error: "Something went wrong"})
    }
})

app.get('/users', async (req, res) => {
    try {
        const { search } = req.query;
        let filter = {};

        if (search) {
            const searchRegex = new RegExp(search.toString(), 'i');
            filter = {
                $or: [
                    { name: { $regex: searchRegex } },
                    { email: { $regex: searchRegex } }
                ]
            };
        }

        const users = await Auth.find(filter).select('name email role -_id');
        res.json({ users });
    } catch (error) {
        console.error('Error searching users', error);
        res.status(500).json({ error: 'Error searching users' });
    }
})
// Save a message between users (HTTP fallback)
app.post('/messages', async (req, res) => {
    try {
        const from = String(req.body.from || '').trim().toLowerCase()
        const to = String(req.body.to || '').trim().toLowerCase()
        const { text, clientId } = req.body;
        if (!from || !to || !text) return res.status(400).json({ error: 'from, to and text are required' });

        const msg = new Message({ from, to, text });
        const saved = await msg.save();
        const emitted = { ...saved.toObject(), clientId };
        try {
            io.to(from).emit('new_message', emitted);
            io.to(to).emit('new_message', emitted);
        } catch (e) {
            console.error('emit error', e);
        }
        res.json(emitted);
    } catch (error) {
        console.error('Error saving message', error);
        res.status(500).json({ error: 'Error saving message' });
    }
});

// Get messages between two users (or all messages for a user if peer is omitted)
app.get('/messages', async (req, res) => {
    try {
        const { user, peer } = req.query;
        if (!user) return res.status(400).json({ error: 'user query parameter is required' });

        let filter;
        if (peer) {
            filter = { $or: [ { from: user, to: peer }, { from: peer, to: user } ] };
        } else {
            filter = { $or: [ { from: user }, { to: user } ] };
        }

        const msgs = await Message.find(filter).sort({ time: 1 }).lean();
        res.json(msgs);
    } catch (error) {
        console.error('Error fetching messages', error);
        res.status(500).json({ error: 'Error fetching messages' });
    }
});

// Socket.IO handling for real-time messages
io.on('connection', (socket) => {
  console.log(`Socket connected ${socket.id}`)

  socket.on('join', (email) => {
    try {
      const cleanedEmail = String(email).trim().toLowerCase()
      socket.join(cleanedEmail)
      console.log(`Socket ${socket.id} joined room ${cleanedEmail}`)
    } catch (e) {
      console.error('join error', e)
    }
  })

  socket.on('private_message', async (payload) => {
    try {
      const from = String(payload.from || '').trim().toLowerCase()
      const to = String(payload.to || '').trim().toLowerCase()
      const { text, clientId } = payload
      if (!from || !to || !text) return
      const msg = new Message({ from, to, text })
      const saved = await msg.save()
      const emitted = { ...saved.toObject(), clientId }
      io.to(from).emit('new_message', emitted)
      io.to(to).emit('new_message', emitted)
    } catch (err) {
      console.error('private_message error', err)
    }
  })
})

server.listen(PORT, async () => {
    try {
        await mongoose.connect(CONNECTION);
        console.log(`Server (with Socket.IO) is running on port ${PORT}`);
    } catch (error) {
        console.error('Error connecting to the database', error);
    }
});