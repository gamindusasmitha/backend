import express from "express"
import { createUser, deleteUser, getUser, updateUser } from "../controllers/studentController.js" 

const studentRouter = express.Router()

studentRouter.get ("/",getUser )

studentRouter.post("/",createUser)

studentRouter.delete("/",deleteUser)

studentRouter.put("/",updateUser);



export default studentRouter ;