

const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const {v7:uuidv7} = require("uuid")

function generateAccessToken(user){
    return jwt.sign(
        {
            id:user.id,
            username:user.username,
            role:user.role,
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn:"3m"
        }
    )
}

function generateRefreshToken(){
    return{
        id:uuidv7(),
        token:
        crypto.randomBytes(64).toString("hex"),
    };
}

function hashToken(token){
    return crypto.createHash("sha256").update(token).digest("hex")
}

function getRefreshTokenExpiry(){
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 5)
    return expiresAt
}


module.exports = {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    getRefreshTokenExpiry,
} 