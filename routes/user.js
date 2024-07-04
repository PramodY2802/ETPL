import express from 'express';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { OtpModel } from '../models/OtpModel.js'; // Assuming OtpModel is defined in ../models/OtpModel.js
import otpGenerator from 'otp-generator'; // Assuming you use otp-generator for OTP generation
import crypto from 'crypto';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// User registration endpoint
router.post('/register', upload.single('profileImage'), async (req, res) => {
    try {
        const { name, dateOfBirth, email, password } = req.body;
        const profileImage = req.file ? req.file.filename : null;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'You already have an account' });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            dateOfBirth,
            email,
            password: hashedPassword,
            profileImage
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// User login endpoint
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User does not exist' });
        }

        // Check if password is correct
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Incorrect password' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Forget password - Generate OTP and send to email
router.post('/forget-password', async (req, res) => {
    const { email } = req.body;
    const otp = otpGenerator.generate(6, { digits: true, upperCaseAlphabets: false, specialChars: false });

    try {
        // Check if a document with the provided email already exists
        const existingOtpDoc = await OtpModel.findOne({ email });

        if (existingOtpDoc) {
            // If document exists, update the OTP
            existingOtpDoc.otp = otp;
            await existingOtpDoc.save();
        } else {
            // If document doesn't exist, create a new one
            await OtpModel.create({ email, otp });
        }

        // Send OTP to user's email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'pramodyadav3142@gmail.com',
                pass: 'zpbjwbayxwdgbqvy', // Replace with your actual Gmail password or use environment variables
            },
        });

        const mailOptions = {
            from: 'pramodyadav3142@gmail.com',
            to: email,
            subject: 'Verification OTP',
            text: `Your OTP for email verification is: ${otp}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                res.status(500).send('Failed to send OTP');
            } else {
                res.status(200).send('OTP sent successfully');
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to generate OTP');
    }
});

// Verify OTP endpoint
router.post('/verify-otp-email', async (req, res) => {
    const { email, otp } = req.body;

    try {
        // Retrieve stored OTP for the email from MongoDB
        const storedOtpDoc = await OtpModel.findOne({ email });

        if (storedOtpDoc && storedOtpDoc.otp === otp) {
            // Update user status in the database to mark email as verified (You can implement this part as needed)
            res.status(200).send('OTP verified successfully');
        } else {
            res.status(400).send('Invalid OTP');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error verifying OTP');
    }
});

router.post('/reset-password', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user's password
        user.password = hashedPassword;
        await user.save();

        // Send response
        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});
router.get('/fetchAll', async (req, res) => {
    try {
        const users = await User.find(); // Fetch all users from the database
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});


export { router as UserRouter };


// Generate and send OTP using Twilio
// router.post('/send-otp-number', async (req, res) => {
//   const { mobileNumber } = req.body;

  // Generate OTP (You can use a library for this)
  // const otp = otpGenerator.generate(6, { upperCaseAlphabets:false,lowerCaseAlphabets:false,specialChars:false });

  // Save user data to MongoDB
//   try {
//     await UserData.create({ mobileNumber, otp });
//   } catch (error) {
//     console.error('Error saving user data to MongoDB:', error);
//     return res.json({ success: false, message: 'Failed to save user data' });
//   }

//   // Send OTP through Twilio
//   try {
//     await twilioClient.messages.create({
//       body: `Your OTP is: ${otp}`,
//       from: twilioPhone,
//       to: mobileNumber,
//     });
//   } catch (twilioError) {
//     console.error('Error sending OTP via Twilio:', twilioError);
//     return res.json({ success: false, message: 'Failed to send OTP' });
//   }

//   // Create a JWT token with the OTP
//   const token = jwt.sign({ otp }, secretKey, { expiresIn: '1h' });

//   res.json({ success: true, token });
// });

// // Verify OTP
// router.post('/verify-otp-number', async (req, res) => {
//   const { token, userEnteredOTP } = req.body;

//   try {
//     // Verify the JWT token
//     const decoded = jwt.verify(token, secretKey);

//     // Find user data in MongoDB based on mobile number
//     const user = await UserData.findOne({ otp: decoded.otp });

//     // Compare the OTP from the database with the user-entered OTP
//     if (user && user.otp === userEnteredOTP) {
//       res.json({ success: true, message: 'OTP verified successfully' });
//     } else {
//       res.json({ success: false, message: 'Invalid OTP' });
//     }
//   } catch (error) {
//     res.json({ success: false, message: 'Invalid token or expired OTP' });
//   }
// });






// const otpStore = {};
// // To Email Varification

// // Generate OTP and store in MongoDB
// // Generate OTP and store/update in MongoDB
// router.post('/generate-otp-email', async (req, res) => {
//   const { email } = req.body;
//   const otp = otpGenerator.generate(6, { digits: true, upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });

//   try {
//     // Check if a document with the provided email already exists
//     const existingOtpDoc = await OtpModel.findOne({ email });

//     if (existingOtpDoc) {
//       // If document exists, update the OTP
//       existingOtpDoc.otp = otp;
//       await existingOtpDoc.save();
//     } else {
//       // If document doesn't exist, create a new one
//       await OtpModel.create({ email, otp });
//     }

//     // Send OTP to user's email
//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: gmailUser,
//         pass: gmailPassword,
//       },
//     });

//     const mailOptions = {
//       from: gmailUser,
//       to: email,
//       subject: 'Verification OTP',
//       text: `Your OTP for email verification is: ${otp}`,
//     };

//     transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         console.error(error);
//         res.status(500).send('Failed to send OTP');
//       } else {
//         res.status(200).send('OTP sent successfully');
//       }
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Failed to generate OTP');
//   }
// });



// // Verify OTP from MongoDB
// router.post('/verify-otp-email', async (req, res) => {
//   const { email, otp } = req.body;

//   try {
//     // Retrieve stored OTP for the email from MongoDB
//     const storedOtpDoc = await OtpModel.findOne({ email });

//     if (storedOtpDoc && storedOtpDoc.otp === otp) {
//       // Update user status in the database to mark email as verified (You can implement this part as needed)
//       res.status(200).send('OTP verified successfully');
//     } else {
//       res.status(400).send('Invalid OTP');
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Error verifying OTP');
//   }
// });




// router.post('/signup',async (req,res)=>{
//     const { username, email, password,Bankname,number } = req.body;
//   const user = await User.findOne({ email });
//   if (user) {
//     return res.json({ message: "user already existed" });
//   }

//   const hashpassword = await bcryt.hash(password, 10);
//   const newUser = new User({
//     username,
//     Bankname,
//     email,
//     number,
//     password: hashpassword,
//   });

//   await newUser.save();
//   return res.json({ status: true, message: "record registed" });
// });


// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   const user = await User.findOne({ email });

//   if (!user) {
//     return res.status(401).json({ status: false, error: "User is not registered" });
//   }

//   const validPassword = await bcryt.compare(password, user.password);
//   if (!validPassword) {
//     return res.status(401).json({ status: false, error: "Incorrect password" });
//   }

//   const token = jwt.sign({ username: user.username }, process.env.KEY, {
//     expiresIn: "1h",
//   });
//   res.cookie("token", token, { httpOnly: true, maxAge: 360000 });
//   return res.json({ status: true, message: "Login successfully" });
// });


//   router.post("/forgot-password", async (req, res) => {
//     const { email } = req.body;
//     try {
//       const user = await User.findOne({ email });
//       if (!user) {
//         return res.json({ message: "user not registered" });
//       }
//       const token = jwt.sign({ id: user._id }, process.env.KEY, {
//         expiresIn: "5m",
//       });//9604423181
      
  
//       var transporter = nodemailer.createTransport({
//         service: "gmail",
//         auth: {
//           user: gmailUser,
//           pass: gmailPassword,
//         },
//       });
//       const encodedToken = encodeURIComponent(token).replace(/\./g, "%2E");
//       var mailOptions = {
//         from: gmailUser,
//         to: email,
//         subject: "Reset Password",
//         text: `https://stately-mermaid-8ef18e.netlify.app/resetPassword/${encodedToken}`,
//       };
  
//       transporter.sendMail(mailOptions, function (error, info) {
//         if (error) {
//           return res.json({ message: "error sending email" });
//         } else {
//           return res.json({ status: true, message: "email sent" });
//         }
//       });
//     } catch (err) {
//       console.log(err);
//     }
//   });

//   router.post("/reset-password/:token", async (req, res) => {
//     const { token } = req.params;
//     const { password } = req.body;
//     try {
//       const decoded = await jwt.verify(token, process.env.KEY);
//       const id = decoded.id;
//       const hashPassword = await bcryt.hash(password, 10);
//       await User.findByIdAndUpdate({ _id: id }, { password: hashPassword });
//       return res.json({ status: true, message: "updated password" });
//     } catch (err) {
//       return res.json("invalid token");
//     }
//   });

//   router.get("/getUser", async (req, res) => {
//       try {
//         const users=await User.find({});
//         return res.json({status:true,users})
//       } catch (error) {
        
//       }
//   });


//   //Profile page

//   // Example using Express and JWT


//   const authenticateToken = (req, res, next) => {
//     const token = req.headers['authorization']?.split(' ')[1];
//     if (!token) return res.sendStatus(401);
  
//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
//       if (err) return res.sendStatus(403);
//       req.user = user;
//       next();
//     });
//   };
  
//   router.get('/profile', authenticateToken, (req, res) => {
//     const userId = req.user.id;
//     User.findById(userId, (err, user) => {
//       if (err) return res.status(500).json({ error: err.message });
//       if (!user) return res.status(404).json({ error: 'User not found' });
  
//       res.json({
//         username: user.username,
//         email: user.email,
//         Bankname: user.bankName,
//         number: user.mobileNumber,
//       });
//     });
//   });



//   router.post('/contact', async (req, res) => {
//     const { name, email, message } = req.body;
  
//     // Validate the data
//     if (!name || !email || !message) {
//       return res.status(400).json({ status: false, error: 'All fields are required' });
//     }
  
//     try {
//       // Save the contact form data to the database
//       const newContact = new Contact({ name, email, message });
//       await newContact.save();
  
//       res.json({ status: true, message: 'Your message has been sent successfully!' });
//     } catch (error) {
//       console.error('Error saving contact form data:', error);
//       res.status(500).json({ status: false, error: 'Failed to send the message. Please try again.' });
//     }
//   });





  


// export{router as UserRouter}