import { mongoose } from "mongoose";



// Create a Mongoose model for the OTPs
// const OtpModel = mongoose.model('Otp', {
//     email: String,
//     otp: String,
//   });

  const OtpSchema = new mongoose.Schema({
    email:{type: String},
    otp:{type: String},
});

const Otp = mongoose.model("otps", OtpSchema)

export {Otp as OtpModel}
