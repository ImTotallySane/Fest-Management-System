const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
require('dotenv').config();

const seedAdmin = async() => {
    try {
        const exists = await User.findOne({ 
            role: 'admin'
        })

        if(exists)
            {
                console.log(`Admin already exists lil bro`);
                return;
            }
        // hashing
        const noise = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, noise);
        const admin = new User(
            {
                email: process.env.ADMIN_EMAIL,
                password: hash,
                role: 'admin',
                firstName: "Girish",
                lastName: "Varma",
                interests: ["administration"]
            }         
        )
    // sends to the db
    await admin.save()
    console.log(`Dictator created`);
    }
    catch (error)
        {
            console.log(`Error making admin: `, error.message);
        }
};

module.exports = seedAdmin;