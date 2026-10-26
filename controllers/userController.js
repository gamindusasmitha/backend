import "dotenv/config";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import crypto from "crypto";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: "gamindusasmitha2@gmail.com",
		pass: process.env.GMAIL_APP_PASSWORD,
	},
});

export function createUser(req, res) {
	const data = req.body;

	const hashedPassword = bcrypt.hashSync(data.password, 10);

	const user = new User({
		email: data.email,
		firstName: data.firstName,
		lastName: data.lastName,
		password: hashedPassword,
		role: data.role,
	});

	user.save().then(() => {
		res.json({
			message: "User created successfully",
		});
	});
}

export function loginUser(req, res) {
	const email = req.body.email;
	const password = req.body.password;

	User.find({ email: email }).then((users) => {
		if (users[0] == null) {
			res.json({
				message: "User not found",
			});
		} else {
			const user = users[0];

			const isPasswordCorrect = bcrypt.compareSync(password, user.password);

			if (isPasswordCorrect) {
				const payload = {
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					role: user.role,
					isEmailVerified: user.isEmailVerified,
					image: user.image,
				};

				const token = jwt.sign(payload, process.env.JWT_SECRET, {
					expiresIn: "150h",
				});

				res.json({
					message: "Login successful",
					token: token,
					role :user.role
				});
			} else {
				res.status(401).json({
					message: "Invalid password",
				});
			}
		}
	});
}

export function isAdmin(req) {
	if (req.user == null) {
		return false;
	}
	if (req.user.role != "admin") {
		return false;
	}

	return true;
}

export function getUser(req, res) {
	if (req.user == null) {
		res.status(401).json({
			message: "Unauthorized",
		});
		return;
	}

	res.json(req.user);
}

export async function googleLogin(req, res) {
	try {
		const accessToken = req.body.accessToken || req.body.token;

		if (!accessToken) {
			res.status(400).json({ message: "Access token is required" });
			return;
		}

		// 1. Ask Google who this person is
		const response = await axios.get(
			"https://www.googleapis.com/oauth2/v3/userinfo",
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		const googleUser = response.data;

		// 2. Find the user, or create a new one
		let user = await User.findOne({ email: googleUser.email });

		if (user == null) {
			user = new User({
				email: googleUser.email,
				firstName: googleUser.given_name || "Google",
				lastName: googleUser.family_name || "User",
				password: bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 10),
				role: "customer",
				isEmailVerified: true,
				image: googleUser.picture,
			});

			await user.save();
		}

		// 3. Make our own token (same for old and new users)
		const payload = {
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
			isEmailVerified: user.isEmailVerified,
			image: user.image,
		};

		const token = jwt.sign(payload, process.env.JWT_SECRET, {
			expiresIn: "150h",
		});

		res.json({
			message: "Login successful",
			token: token,
			role: user.role,
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Google login failed",
			error: error.message,
		});
	}
}

export async function resetPassword(req, res) {
	try {
		const { email, otp, newPassword } = req.body;

		// 1. Check that everything was sent
		if (!email || !otp || !newPassword) {
			res.status(400).json({
				message: "Email, OTP and new password are required",
			});
			return;
		}

		if (newPassword.length < 6) {
			res.status(400).json({
				message: "Password must be at least 6 characters",
			});
			return;
		}

		// 2. Find the saved code
		const otpRecord = await Otp.findOne({ email: email });

		if (otpRecord == null) {
			res.status(400).json({
				message: "No OTP found. Please request a new one.",
			});
			return;
		}

		// 3. Is it still fresh?
		if (otpRecord.expiresAt < new Date()) {
			await Otp.deleteMany({ email: email });
			res.status(400).json({
				message: "OTP has expired. Please request a new one.",
			});
			return;
		}

		// 4. Too many wrong tries?
		if (otpRecord.attempts >= 5) {
			await Otp.deleteMany({ email: email });
			res.status(400).json({
				message: "Too many wrong tries. Please request a new OTP.",
			});
			return;
		}

		// 5. Does the code match?
		if (otpRecord.otp !== String(otp).trim()) {
			otpRecord.attempts += 1;
			await otpRecord.save();
			res.status(400).json({ message: "Invalid OTP" });
			return;
		}

		// 6. Change the password
		const user = await User.findOne({ email: email });

		if (user == null) {
			res.status(400).json({ message: "User not found" });
			return;
		}

		user.password = bcrypt.hashSync(newPassword, 10);
		await user.save();

		// 7. Tear up the used code
		await Otp.deleteMany({ email: email });

		res.json({ message: "Password updated successfully" });
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Failed to reset password",
			error: error.message,
		});
	}
}

export async function sendOTP(req, res) {
	try {
		const email = req.params.email;

		const user = await User.findOne({ email: email });

		if (user == null) {
			res.status(400).json({ message: "User not found" });
			return;
		}

		// 1. Make a 6 digit code
		const otp = crypto.randomInt(100000, 1000000).toString();

		// 2. Save it (remove old codes first), valid for 10 minutes
		await Otp.deleteMany({ email: email });
		await new Otp({
			email: email,
			otp: otp,
			expiresAt: new Date(Date.now() + 10 * 60 * 1000),
		}).save();

		// 3. Send it by email
		await transporter.sendMail({
			from: "gamindusasmitha2@gmail.com",
			to: email,
			subject: "Your OTP code",
			text: "Your OTP code is " + otp + ". It is valid for 10 minutes.",
		});

		res.json({ message: "OTP sent successfully" });
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Failed to send OTP",
			error: error.message,
		});
	}
}


export async function getAllUsers(req,res) {
	
	if (!isAdmin(req)){
		res.status(401).json({
			message : "Unauthorized"
		})
	}return

	try {
		const users = await User.find()
		res.json(users)
	}catch(error){
		res.status(500).json({
			message : "Error fetching users",
			error : error.message
		})
	}
}