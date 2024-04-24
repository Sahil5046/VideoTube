import mongoose, {Schema} from "mongoose";

const subscriptionModel = new Schema({
    susubscriber:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
},{timestamps: true})

export const Subscription = mongoose.model('subscription', subscriptionModel);