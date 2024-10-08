import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave : false })

        return {accessToken,refreshToken}

    } catch (error) {
        throw new apiError(500,"something went wrong while generating refresh and access token")
    }
}

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

    // validation - not empty
    if (
        [fullName,email,username,password].some((field)=>
            field?.trim() ==="")
    ) {
        throw new apiError(400,"All fields are required")
    }
  
    // check if user already exist: username,email
    const existedUser= await User.findOne({
        $or:[{ username },{ email }]
    })

    if (existedUser) {
        throw new apiError(409,"User with email or userName already exits")
    }
     
    // check for images, check for avatar
    const avatarLocalPath=req.files?.avatar[0]?.path;
    // const coverImageLocalPath=req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath=req.files.coverImage[0].path
    }

    console.log(req.files);

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

//video no 16
//user Login
const loginUser= asyncHandler(async(req,res)=>{
    // get data from req.body
    // username or email based access
    // find the user
    // password check , if password match then 
    // access and refresh token
    // send cookie
    const {username,password,email} = req.body;

    if (!email && !username) {
        throw new apiError(400,"username or email is required")   
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if (!user) {
        throw new apiError(404,"User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new apiError(401,"Invalid user credentials")
    }

    const {accessToken , refreshToken} = await generateAccessAndRefreshToken(user._id)

   const loggedInUser = await User.findById(user._id).
   select("-password  -refreshToken")

   const options = {
    httpOnly : true,
    secure : true
   }

   return res
   .status(200)
   .cookie("accessToken" , accessToken , options)
   .cookie("refreshToken" , refreshToken , options)
   .json(
    new ApiResponse(
        200,
        {
            user : loggedInUser , accessToken , refreshToken
        },
        "User logged In successfully"
    )
   )
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
             }
        },
        {
            new:true
        }
    )
    const options = {
        httpOnly : true, //cookies are modify only on server side
        secure : true
       }
       return res
       .status(200)
       .clearCookie("accessToken",options)
       .clearCookie("refreshToken",options)
       .json(new ApiResponse(200,{},"User logged out"))


})

const refreshAccessToken = asyncHandler(async(req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
 
   
   if (! incomingRefreshToken) {
    throw new apiError(401,"unauthorized request")
   }

   try {
    const decodedToken= jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRETE)
 
    const user = await User.findById(decodedToken?._id)
 
    if (!user) {
     throw new apiError(401,"Invalid refresh token ")
    }
 
    if (incomingRefreshToken !== user?.refreshToken) {
     throw new apiError(401,"Refresh token is expired or used")
    }
 
    const options = {
     httpOnly: true,
     secure: true
    }
 
   const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
 
   return res
   .status(200)
   .cookie("accessToken" , accessToken , options)
   .cookie("refreshtoken" , newRefreshToken , options)
   .json(
     new ApiResponse(
         200,
         {accessToken, refreshToken : newRefreshToken},
         "Access token refreshed"
     )
   )
   } catch (error) {
     throw new apiError(401, error?.message || "Invalid refresh token")
   }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword , newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (! isPasswordCorrect) {
        throw new apiError(400,"Invalid Password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed successfully"))


})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(200,req.user, "Current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new apiError(400,"All Fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set :{
                fullName,
                email
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user , "Accounts details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = res.file?.path

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar file is missing")
    }

     const avatar = await uploadOnCloudinary(avatarLocalPath)

     if (!avatar.url) {
        throw new apiError(400, "Error while uploading on avatar")
     }

     const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {new :true}
     ).select("-password")

     return res
     .status(200)
     .json(
        new ApiResponse(200, user , "Avatar image updated successfully")
     )
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = res.file?.path

    if (!coverImageLocalPath) {
        throw new apiError(400, "Cover Image file is missing")
    }

     const coverImage = await uploadOnCloudinary(coverImageLocalPath)

     if (!coverImage.url) {
        throw new apiError(400, "Error while uploading on coverImage")
     }

     const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        {new :true}
     ).select("-password")

     return res
     .status(200)
     .json(
        new ApiResponse(200, user , "Cover image updated successfully")
     )
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}