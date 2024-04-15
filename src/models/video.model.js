import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const videoSchema = new Schema({
    videoFile: {
        type: String, // cloudinary url
        require: true
    },
    thumbnail:{
        type:String,
        require : true
    },
    title : {
        type: String,
        require: true
    },
    description : {
        type: String,
        require: true
    },
    duration : {
        type: Number,
        require: true
    },
    viwes : {
        type: Number,
        default: 0
    },
    isPublic : {
        type: Boolean,
        default: true
    },
    owner : {
        type : mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    
}, {
    timestamps: true // Saves createdAt and updatedAt as dates. Creates them in ISO 8601 format yyyy-mm-ddTHH:MM:
})

videoSchema.plugin(mongooseAggregatePaginate)

export default Video = mongoose.model("Video", videoSchema)