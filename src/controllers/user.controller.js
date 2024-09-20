import { asyncHandler } from "../utils/asyncHandler.js";
import{Apierror} from "../utils/Apierror.js"
import {User} from "../models/user.model.js"

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
    const {fullname, email, username, password} =  req.body
    console.log("email:",email);
    if (
        [fullname, email, username, password].some((field) => field?.trim() === ''))
        {
            throw new Apierror(400,'All fields are required')
        }
    const existedUser = User.findOne({
        $or: [{username},{email}]
    })

    if(existedUser){
        throw new Apierror(409,'User already exist')
    }

    req.files?.avatar[0]?.path
} )

export{registerUser,}