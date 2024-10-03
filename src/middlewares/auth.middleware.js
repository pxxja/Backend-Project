import { User } from "../models/user.model.js";
import { apiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";


export const verifyJWT = asyncHandler( async(req, _, next)=>{
     try {
        const token = req.cookies?.accessToken ||
         req.header("Authorization")?.replace("Bearer", "")
   
         if (!token) {
           throw new apiError(401, "unauthorized request")
         }
   
       //verify if the token is correct or not
       const decodedToken =  jwt.verify(   token , process.env.ACCESS_TOKEN_SECRET)
   
       const user = await User.findById(decodedToken?._id)
       .select("-password -refreshToken")
   
       if (!user) {
           throw new apiError(401, "Invalid Access Token")
       }
   
       req.user = user;
       next()
     } catch (error) {
        throw new apiError(401, error?.message || "Invalid access token")
     }
})