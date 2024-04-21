import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js";

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

export { registerUser }