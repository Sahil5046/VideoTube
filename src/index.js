import { app } from "./app.js";
import connnectDB from "./db/index.js";
import dotenv from 'dotenv'

dotenv.config({
    path: "./.env"
})

connnectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`your server is connected on port ${process.env.PORT}`)
        })
    })
    .catch(err => {
        console.log("Here you have error in mongodb connect ", err);
    })