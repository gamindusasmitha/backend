import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import axios from "axios";
import crypto from "crypto";

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

