import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async  ()=> {
    try {
        const uri = `${process.env.MONGODB_URI}/${DB_NAME}`;
        if (!uri) {
            throw new Error('Mongo Uri is not defined');
        }
        const connectionInstant  = await mongoose.connect(uri);
        console.log(`MongoDB connected successfully. DB HOST: ${connectionInstant.connection.host}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }

    console.log('This is the uri',process.env.MONGODB_URI);
    

}
export default connectDB