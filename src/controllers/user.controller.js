import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiError } from "../utils/Apierror.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { isPasswordCorrect } from "../utils/general.js"; //not needed actually
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async(userId) => {  //generating accessToken and refreshToken
    try {
        const user = await User.findById(userId)
        if (!user) {
          throw new ApiError(404, 'User not found');
      }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}


    } catch (error) {
      console.log(error);
      throw new ApiError(500,'Something went wrong while generating refresh and access token')
    }
}

const registerUser = asyncHandler( async (req,res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exist: through username and email
    // check for images
    // check for avatar
    // upload them to cloudinary,avatar
    // remove password and refresh token field from response 
    // check for user creation
    // return response
    const {fullName, email, username, password} =  req.body
    // console.log("email:",email);
    if (
        [fullName, email, username, password].some((field) => field?.trim() === ''))
        {
            throw new ApiError(404,'All fields are required')
        }
    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,'User already exist')
    }
    // console.log(req.files)

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    

    if(!avatarLocalPath){
        throw new ApiError(404,'Avatar files is required')
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatarLocalPath) {
        throw new ApiError(404,'Avatar file is required')
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url ||"", //check coverImage path
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        '-password -refreshToken'
    )

    if (!createdUser) {
        throw new ApiError(500,'something went wrong while registering the user')
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser,'User registered successfully')

    )

} )

const loginUser = asyncHandler(async (req, res) => {
    try {
      const { email, username, password } = req.body;
        // console.log(req.body);
      if (!username && !email) {
        throw new ApiError(404, 'username or email is required');
      }
  
      const user = await User.findOne({
        $or: [{ username }, { email }],
      });
    //   console.log(user);
      
      if (!user) {
        throw new ApiError(404, 'User not found');
      }
  
    //   const isPasswordValid = isPasswordCorrect(user.password,password)
    const isPasswordValid = await user.isPasswordCorrect(password)
      
      if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid user credentials');
      }
  
      const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
      
      const loggedInUser = await User.findById(user._id).select('-password -refreshToken')
 
      const options = {
        httpOnly: true,
        secure: true //process.env.NODE_ENV === 'production', // adjust based on environment or true
      };
  
      return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(
          new ApiResponse(200, {
            user: loggedInUser,//user.toObject(), // use toObject() to exclude password and refreshToken
            accessToken,
            refreshToken,
          }, 'User logged in successfully')
        // loggedInUser
        );
    } catch (error) {
    //   console.error(error); // log the error
      throw new ApiError(500, 'Internal Server Error'); // handle error properly
    }
  });

const logoutUser = asyncHandler(async(req,res) =>{
    try {
      User.findByIdAndUpdate(
          req.user._id,{
              $set:{
                  refreshToken: undefined
              }
          },
          {
              new: true
          }
      )
  
      const options = {
          httpOnly: true,
          secure:true
      }
  
      return res.status(200).clearCookie('accessToken', options).clearCookie('refreshToken', options).json(new ApiResponse(200,'User logged out'))
    } catch (error) {
        throw new ApiError(401,"internal server error");
        
    }
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorized request");
  }
  // verify  token
 try {
   const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
 
   const user = await User.findById(decodedToken._id)
   if (!user) {
     throw new ApiError(401,"Invalid refresh token");
   }
 
   if(incomingRefreshToken !== user?.refreshToken){
     throw new ApiError(401,"Refresh token is expired or used");
     
   }
 
   const options = {
     httpOnly: true,
     secure:true
   }
   const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
 
   return res.status(200).cookie('accessToken',accessToken,options)
   .cookie('refreshToken',newRefreshToken,options).json(new ApiResponse(200,{accessToken, refreshToken: newRefreshToken},'AccessToken refreshed'))
 
 
 } catch (error) {
  throw new ApiError(401, error?.message || "Invalid refresh token");
  
 }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
  const {oldPassword, newPassword, conformPassword} = req.body

  const user = await User.findById(req.user?._id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
  if (!isPasswordCorrect) {
    throw new ApiError(401,"Incorrect old password");
  }
  user.password = newPassword
  await user.save({validateBeforeSave: false})

  if(!(newPassword === conformPassword)){
      throw new ApiError(200,"Don't match with new password");
      
  }

  return res.status(200).json(200,{},'Password changed successfully')
  
})

const getCurrentUser = asyncHandler(async(req, res)=>{
  return res.status(200).json(200,req.user,new ApiResponse('Current user fetched successfully'))
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
  const {fullName,email,username} = req.body
  if (!fullName) {
    throw new ApiError(404,'Fullname is required')
    
  }
  if (!email) {
    throw new ApiError(404,"Email is required");
    
  }
  if (!username) {
    throw new ApiError(404,new ApiResponse("Username is required"));
    
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName,
        email: email,
        username
      }
    },
    {new: true}
  ).select('-password')

  return res.status(200).json(new ApiResponse(200, user, 'Avatar updated successfully'))
})

const updateAccountAvatar = asyncHandler(async(req, res)=>{
  const avatarLocalPath = req.file?.path
  if (!avatarLocalPath) {
    throw new ApiError(404,'Avatar is required')
    
  }
  const avatar = await uploadOnCloudinary
  if (!avatar.url) {
    throw new ApiError(401,"Error while uploading avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar: avatar.url
      }
    },
    {new: true}
  ).select('-password')



  return res.status(200).json(new ApiResponse(200, user, 'Account details updated successfully'))

})

const updateUserCoverImage = asyncHandler(async(req, res)=>{
  const coverImageLocalPath = req.file?.path
  if (!coverImageLocalPath) {
    throw new ApiError(404,'Coverimage is required')
    
  }
  const coverImage = await uploadOnCloudinary
  if (!coverImage.url) {
    throw new ApiError(401,"Error while uploading Coverimage");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverImage: coverImage.url
      }
    },
    {new: true}
  ).select('-password')



  return res.status(200).json(new ApiResponse(200, user, 'Coverimage updated successfully'))

})

const getUserChannelProfile = asyncHandler(async(req, res)=>{
  const {username} = req.params

  if (!username) {
    throw new ApiError(401,"Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup:{
        from: 'subscription',
        localField:'_id',
        foreignField: 'channel',
        as: 'subscribers'
      }
    },
    {
      $lookup:{
        from: 'subscription',
        localField:'_id',
        foreignField: 'subscribers',
        as: 'subscribedTo'
      }
    },
    {
      $addFields:{
        subscribersCount:{
          size: '$subscribers'
        },
        channelSubscribedToCount:{
          size: '$subscribedTo'
        },
        isSubscribed:{
          $cond:{
            if: {$in: [req.user?._id,'$subscribers.subscriber']},
            then: true, //subscribed
            else: false  //not subscribed
          }
        }
      }
    },
    {
      project:{
        fullName: 1,
        username: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
        createdAt: 1
      }
    }
  ])

  if (!channel) {
    throw new ApiError(404,"channel doesn't exist");
  }

  return res.status(200).json(new ApiResponse(200,channel[0], 'User channel fetch successfully'))
})

const getWatchHistory = asyncHandler(async(req, res)=>{
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup:{
        from: 'video',
        localField: 'watchHistory',
        foreignField: 'watchHistory',
        as: 'watchHistory',
        pipeline:[{  // subpipeline
          $lookup:{
            from: 'users',
            localField: 'owner',
            foreignField: '-id',
            as: 'owner',
            pipeline:[{
              $project:{
                fullName: 1,
                username: 1,
                avatar: 1
              },
            }]
          }
        },
        {
          $addFields:{
            owner:{
              $first: '$owner'
            }
          }
        }]
      }
    }
  ])

  if (!user) {
    throw new ApiError(401,"Cannot find watch history");
  }

  return res.status(200).json(new ApiResponse(200,user[0].watchHistory,'Watch history fetched successfully'))
})


export{registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAccountAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
}