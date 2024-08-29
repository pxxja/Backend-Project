//require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path:'./env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running on port ${process.env.PORT}`);
        app.on("error",(error)=>{
            console.log("Errr",error);
        })
    })
})
.catch((err)=>{
    console.log("MONGO db connection failed",err);
})


// (async()=>{
//     try {
//       await  mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//     } catch (error) {
//         console.error("ERROR",error);
//         throw error;
//     }
// })()