import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken"
import userRouter from "./routes/userRouter.js";
import productRouter from "./routes/productRouter.js";

const mongoURI = "mongodb://gamindusasmitha1_db_user:1234@ac-b828ynv-shard-00-00.bkknx24.mongodb.net:27017,ac-b828ynv-shard-00-01.bkknx24.mongodb.net:27017,ac-b828ynv-shard-00-02.bkknx24.mongodb.net:27017/?ssl=true&replicaSet=atlas-q3g7cz-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(mongoURI).then(
    ()=>{
        console.log("Connected to MongoDB Cluster")
    }
)


const app = express()


app.use(express.json())


app.use(
    (req,res,next)=>{

        const authorizationHeader = req.header("Authorization")

        if(authorizationHeader != null){

            const token = authorizationHeader.replace("Bearer ", "")
 

            jwt.verify(token, "secretKey96$2025",
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




app.use("/users",userRouter)
app.use("/products",productRouter)


app.listen(3000 , 
    ()=>{
        console.log("server is running")
    }
)