import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken"
import userRouter from "./routes/userRouter.js";
import productRouter from "./routes/productRouter.js";
import orderRouter from "./routes/orderRouter.js"
import cors from "cors";
import dotenv from "dotenv"

dotenv.config()

const mongoURI = process.env.MONGO_URL

mongoose
  .connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 10000 })
  .then(() => console.log("Connected to the database"))
  .catch((error) => {
    console.log("Database connection failed:", error.message);
  });


const app = express()

app.use(cors())


app.use(express.json())


app.use(
    (req,res,next)=>{

        const authorizationHeader = req.header("Authorization")

        if(authorizationHeader != null){

            const token = authorizationHeader.replace("Bearer ", "")
 

            jwt.verify(token, process.env.JWT_SECRET,
                (error, content)=>{

                    if(content == null){

                        console.log("invalid token")

                        res.json({
                            message : "invalid token"
                        })

                    }else{
                        
                        req.user = content

                        next()
                    }
                }
            )
        }else{
            next()
        }

    }
)




app.use("/api/users",userRouter)
app.use("/api/products",productRouter)
app.use("/api/orders", orderRouter);


app.listen(3000 , 
    ()=>{
        console.log("server is running")
    }
)