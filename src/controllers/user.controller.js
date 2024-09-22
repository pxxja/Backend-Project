import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser= asyncHandler(async (req,res)=>{
     // get user detail from frontend
     // validation - not empty
     // check if user already exist: username,email
     // check for images, check for avatar
     // upload them to cloudinary, cheack avatar
     // create user object- create entry in db
     // remove password and refresh token field from response
     // check for user creation
     // return response
     const {fullName,email,username,password} =req.body
     console.log("Email :",email);

     //validations
     //beginners code
    //  if(fullName===""){
    //     throw new apiError(400,"fullName is required")
    //  }

    if (
        [fullName,email,username,password].some((field)=>
            field?.trim() ==="")
    ) {
        throw new apiError(400,"All fields are required")
    }

    const existedUser=User.findOne({
        $or:[{ username },{ email }]
    })

    if (existedUser) {
        throw new apiError(409,"User with email or userName already exits")
    }
     
    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new apiError(400,"Avatar file is required")
    }

    //upload on cloudinary
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    //check avatar
    if (!avatar) {
        throw new apiError(400,"Avatar file is required")
    }

    // create user object- create entry in db
    const user =await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
    
    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new apiError(500,"Something went wrong while registering the user")
    }

    //return response
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )
})
export {registerUser}