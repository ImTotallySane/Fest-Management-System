const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { auth, allowRoles } = require('../middleware/auth');

const signToken = (user) => {
    const payload = {
        user: { id: user.id, role: user.role }
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5d' });
};

router.post('/add-organizer', auth, allowRoles('admin'), async (req, res) => {
    try {
        const {
            organizerName,
            category,
            description
        } = req.body;

        if (!organizerName) {
            return res.status(400).json({ message: 'Organizer name is required' });
        }

        const slugBase = organizerName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'organizer';

        let email = `${slugBase}-iiit@clubs.iiit.ac.in`;
        let suffix = 1;
        while (await User.findOne({ email })) {
            email = `${slugBase}-${suffix}-iiit@clubs.iiit.ac.in`;
            suffix += 1;
        }

        const check = await User.findOne({ email });
        if (check) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // auto-generate a secure random password
        const rawPassword = require('crypto').randomBytes(8).toString('hex'); // 16 hex chars
        const noise = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(rawPassword, noise);

        const organizer = new User({
            email,
            password: hash,
            role: 'organizer',
            organizerName,
            category,
            contactEmail: email,
            description: description || ''
        });

        await organizer.save();

        res.status(201).json({ message: 'Organizer created successfully!', generatedEmail: email, generatedPassword: rawPassword });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

router.post('/register', async (req, res) => {
    // assigning variables in a simple way
    const { 
        firstName,
        lastName, 
        email, 
        password, 
        contactNumber,
        participantType,
        collegeName
    } = req.body;

    if (!contactNumber) {
        return res.status(400).json({ message: 'Contact number is required' });
    }

    if (participantType === 'IIIT') {
        // checking validity of iiit mail to verify against postman attackers
        const allowedDomains = ['iiit.ac.in', 'students.iiit.ac.in', 'research.iiit.ac.in'];
        const isValidDomain = allowedDomains.some(d => email.endsWith('@' + d));
        
        if (!isValidDomain) {
            return res.status(400).json({ 
                message: "IIIT participants must register with an official Institute email ID." 
            });
        }
    }
    try 
    {
        let user = await User.findOne({ email });
        if (user) 
        {
            // bad request
            return res.status(400).json({ message: 'User already exists' });
        }

        const noise = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, noise);

        // creating the user
        user = new User({
            firstName,
            lastName,
            email,
            password: hash,
            role: 'participant',  // cannot be admin or organizer (admin assigns)
            contactNumber,
            participantType,
            collegeName,
            interests: []
        });

        await user.save();

        const token = signToken(user);

        res.json({ token, role: user.role });

    }
     catch (err) 
        {
            console.error(err.message);
            res.status(500).json({ message: 'Server error' });
        }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is disabled. Contact admin.' });
        }

        // validate password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const token = signToken(user);

        res.json({ token, role: user.role });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/change-password', auth, async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Both old and new password are required' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Old password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;