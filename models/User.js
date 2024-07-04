import mongoose from "mongoose";
import AutoIncrementFactory from 'mongoose-sequence';

const connection = mongoose.createConnection('mongodb+srv://pramodyadav3142:root@web.kbznxes.mongodb.net/ETPLData');
const AutoIncrement = AutoIncrementFactory(connection);

const UserSchema = new mongoose.Schema({
    _id: { type: Number }, // Use this field for auto-incremented ID
    name: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImage: { type: String },
    createdAt: { type: Date, default: Date.now } // Default value set to current timestamp
});

// Virtual for IST time
UserSchema.virtual('createdAtIST').get(function() {
    return this.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
});

// Apply the auto-increment plugin to the UserSchema
UserSchema.plugin(AutoIncrement, { id: 'user_seq', inc_field: '_id' });

const UserModel = connection.model("User", UserSchema);

export { UserModel as User };
