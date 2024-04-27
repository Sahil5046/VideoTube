import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { deleteFile, uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from 'jsonwebtoken'
import mongoose from "mongoose";
// import cookieParser from "cookie-parser";


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        console.log("accessToken", accessToken, "refreshToken", refreshToken)

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false }); // To bypass the validation for saving token to DB

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, 'something went wrong while generating refresh and access tokens')
    }
}


const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, password, username } = req.body;
    console.log("email: ", email);

    if (
        [fullname, email, password, username].some((field) => {
            field?.trim() === ""
        })
    ) {
        throw new ApiError(400, "All fildes are required")
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    console.log("existingUser: ", existingUser)

    if (existingUser) {
        throw new ApiError(409, "Email or username already Exist");
    }

    const avatarLocalFilePath = req.files?.avatar[0]?.path;
    // const coverImageLocalFilePath = req.files?.coverImage[0]?.path;
    let coverImageLocalFilePath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) coverImageLocalFilePath = req.files.coverImage[0].path

    console.log("avatarLocalFilePath", avatarLocalFilePath)

    if (!avatarLocalFilePath) {
        throw new ApiError(400, "Avatar File is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalFilePath);
    const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);

    if (!avatar) {
        throw new ApiError(400, "Avatar File is required")
    }

    const user = await User.create({
        username: username.toLowerCase(),
        fullname,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    console.log("User: ", user);

    const createUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    console.log("createUser: ", createUser);

    if (!createUser) throw new ApiError(500, "Something went wrong while registring the User. Please try again later.")


    return res.status(201).json(
        new ApiResponse(200, createUser, "User register successfully...")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body

    if (!username || !email) throw new ApiError(404, 'invalid username or email')

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    console.log(user)

    if (!user) {
        throw new ApiError(400, "Username or Email does not exist.")
    }

    const passwordValid = await user.isPasswordCorrect(password)

    if (!passwordValid) throw new ApiError(401, "Invalid Password!")

    // Return jsonwebtoken and access token 

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                'Logged In User Successfully.'
            )
        )
})


const logOutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            refreshToken: undefined
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.body.refreshToken || req.cookie.refreshToken

    if (!incomingRefreshToken) throw new ApiError(401, "Unauthorize request");

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findOne(decodedToken?._id);

        if (!user) throw new ApiError(401, "Invalid token")

        if (user?.refreshToken !== incomingRefreshToken) throw new ApiError(401, 'Your refresh token is expire or already used')

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user?._id)

        const option = {
            httpOnly: true,
            secure: true
        }

        res.status(200)
            .cookie("accessToken", accessToken, option)
            .cookie("refreshToken", newRefreshToken, option)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "AccessToken refreshed successfully.."
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh Token")
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;


    // if you want to give a confirm password section then
    // const {oldPassword, newPassword, confirmPassword} = req.body;
    // if(!(newPassword === confirmPassword)) throw new ApiError(401, "New Password and Confirm Password doesn't match");

    const user = await User.findById(req.user?._id);

    const passwordIsCorrect = await user.isPasswordCorrect(oldPassword)
    if (!passwordIsCorrect) throw new ApiError(401, "Wrong Password!")

    console.log(user.password);
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})


const getCurrentUser = asyncHandler(async (req, res) => {
    res.status(200)
        .json(200, res.user, "Current user fatched successfully");
})


const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;

    if (!fullname || !email) {
        throw new ApiError(401, "All fildes are required.")
    }

    const user = await User.findByIdAndUpdate(
        req.body?._id,
        {
            $set: {
                fullname,
                email: email
            }
        },
        {
            new: true
        }
    ).select('-password')

    return res.status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) throw new ApiError(400, "No Avatar image provided")


    //delete  old avatar from the server folder
    const deleteResponse = await deleteFile(req.user?.avatar)
    if (!deleteResponse) throw new ApiError(400, "Could not remove the previous avatar")

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    console.log(avatar.url)
    if (!avatar.url) throw new ApiError(400, "Error while uploading the avatar")

    // Update the current users data with the new avatar url
    let user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")


    res.status(200)
        .json(new ApiResponse(200, "Your Avatar Image has been updated successfully", user))
})

const updateUsercoverImage = asyncHandler(async (req, res) => {
    const coverLocalPath = req.file?.path

    if (!coverLocalPath) throw new ApiError(400, "No Cover image provided")

    const coverImage = await uploadOnCloudinary(coverLocalPath);

    console.log(coverImage.url)
    if (!coverImage.url) throw new ApiError(400, "Error while uploading the coverImage")

    // Update the current users data with the new coverImage url
    let user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")


    res.status(200)
        .json(new ApiResponse(200, "Your cover Image has been updated successfully", user))

})


const getWatchHistory = asyncHandler(async (req, res) => {
    const user = User.aggregate([
        {
            $match: {
                _id: new mongoose.Schema.Types.ObjectId(req.use?._id)
            }
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'watchHistory',
                foreignField: '_id',
                as: 'watchHistory',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'owner',
                            foreignField: '_id',
                            as: 'owner',
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watched history fetched successfully"
            )
        )
})


export { registerUser, loginUser, logOutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUsercoverImage, getWatchHistory }