import mongoose from 'mongoose';
import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import Auth from './model/Auth.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3005;
const CONNECTION = process.env.CONNECTION || 'mongodb://localhost:27017/';

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

app.listen(PORT, async () => {
    try {
        await mongoose.connect(CONNECTION);
        console.log(`Server is running on port ${PORT}`);
    } catch (error) {
        console.error('Error connecting to the database', error);
    }
});