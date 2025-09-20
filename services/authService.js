const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET;

function createAdminToken(adminPayload){
    const payload = {
        username:adminPayload.username,
        role:adminPayload.role
    }
    return jwt.sign(payload , secret , {
        expiresIn: "3m"
    });
}

function getAdmin(token){
    if(!token) return {tokenStatus : "NOT_FOUND"};
    try{
        const decoded = jwt.verify(token, secret);
        return { tokenStatus: "VALID", data: decoded };
    }catch(err){
        return {tokenStatus : "EXPIRED"};
    }
}

module.exports = {
    createAdminToken,
    getAdmin
}