const { getAdmin } = require("../services/authService");

function checkForAuthentication(req , res , next){
    const getTokenFromAuthHeader = req.headers["authorization"];
    if (!getTokenFromAuthHeader || !getTokenFromAuthHeader.startsWith("Bearer ")) return res.status(401).json({msg:"NOT AUTHENTICATED"});

    const token = getTokenFromAuthHeader.split(" ")[1];
    const admin = getAdmin(token);
    if (admin.tokenStatus === "EXPIRED" || admin.tokenStatus === "NOT_FOUND") {
        return res.status(401).json({msg: "Your Session has expired\nkindly login to your admin account."});
    }
    next();
}


module.exports = {
    checkForAuthentication
}