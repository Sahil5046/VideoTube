import mongoose from 'mongoose'
import { DBName } from '../constants.js'


const connnectDB = async () => {
    try {
        const connectionURL = await mongoose.connect(`${process.env.MONGO_URL}/${DBName}`);
        console.log(`your mongoose is connnected... DB Host: ${connectionURL.connection.host}`);
    } catch (error) {
        console.log("your error in mongodb is  ", error);
        process.exit(1)
    }
}

export default connnectDB