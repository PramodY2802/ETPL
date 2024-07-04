// oyqo ierg cspa xqmk

import express from 'express';
import dotenv from 'dotenv';
import { mongoose } from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
dotenv.config();
import { UserRouter } from './routes/user.js';
import path from 'path';

const PORT=process.env.PORT || 8000;


const app =express();
app.use(express.json());

app.use(cors({
    origin:true,
    credentials:true
}));


app.use(cookieParser())
app.use('/auth',UserRouter);

mongoose.connect('mongodb+srv://pramodyadav3142:root@web.kbznxes.mongodb.net/ETPLData');


app.listen(PORT,()=>{
    console.log(`server is running ${PORT}`)
});

