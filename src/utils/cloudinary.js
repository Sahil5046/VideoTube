import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" });

        //file uploaded successfully
        console.log("you file is successfully upload on cloudinary ", response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); //// remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}


export {uploadOnCloudinary}