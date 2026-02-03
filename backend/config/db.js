const mongoose = require('mongoose');

const DB_Connect = async () => {
    try {
        const ret=await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB connected LFG: ${ret.connection.host}`);
    }
    catch (error) {
        console.error(`Connection failed L: ${error.message}`);
        process.exit(1);
    }
}

// this is how code is shared between files
module.exports = DB_Connect;