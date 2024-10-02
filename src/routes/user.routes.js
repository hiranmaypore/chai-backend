import { Router } from "express";
import { loginUser,
        registerUser, 
        logoutUser, 
        refreshAccessToken,
        changeCurrentPassword, 
        getCurrentUser, 
        updateAccountDetails, 
        updateAccountAvatar, 
        updateUserCoverImage, 
        getUserChannelProfile, 
        getWatchHistory } from "../controllers/user.controller.js";
import {upload} from "../middlewares/muter.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route('/register').post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1,
        },
        {
            name:'coverImage',
            maxCount: 3,
        }
    ]),
    registerUser
)

router.route('/login').post(loginUser)

// secured routes
router.route('/logout').post(verifyJWT, logoutUser)

router.route('/refresh-token').post(refreshAccessToken)

router.route('/change-password').post(verifyJWT,changeCurrentPassword)

router.route('/current-user').get(verifyJWT,getCurrentUser)

router.route('/update-account').patch(verifyJWT,updateAccountDetails)

router.route('/avatar').patch(verifyJWT,upload.single('avatar'),updateAccountAvatar)

router.route('/cover-image').patch(verifyJWT,upload.single('/coverImage'),updateUserCoverImage)

router.route('/channel/:username').get(verifyJWT,getUserChannelProfile)

router.route('/watch-history').get(verifyJWT,getWatchHistory)


export default router