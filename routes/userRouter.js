import express from "express"
import { createUser, getAllUsers, getUser, googleLogin, loginUser, resetPassword, sendOTP } from "../controllers/userController.js"

const userRouter = express.Router()

userRouter.post("/",createUser)
userRouter.post("/login",loginUser)
userRouter.get("/",getUser)
userRouter.post("/google-login",googleLogin)
userRouter.get("/send-otp/:email" , sendOTP)
userRouter.post("/reset-password", resetPassword);
userRouter.get("/all", getAllUsers)


export default userRouter