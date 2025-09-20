const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    username:{
        type:String,
        unique:true,
        required:true
    },
    adminId:{
        type:String,
        required:true
    },
    role : {
        type: String,
        required: true,
        default: "ADMIN"
    }
});

const adminModel = mongoose.model("admins" , adminSchema);

module.exports = adminModel;