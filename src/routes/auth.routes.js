
const express = require("express")
const router = express.Router()
const axios = require("axios")
const pool = require("../config/db")

const {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    getRefreshTokenExpiry,
} = require("../config/utils/tokens")
const {v7:uuidv7} = require("uuid")
// router.get("/github",(req,res)=>{
//     res.json({
//         status:"success",
//         message:"Github auth route ready"
//     })
// })

router.get("/github", (req, res) => {
  const client_id = process.env.GITHUB_CLIENT_ID;
  const redirect_uri = `${process.env.APP_BASE_URL}/auth/github/callback`;

  const githubAuthUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${client_id}` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&scope=read:user user:email`;

  res.redirect(githubAuthUrl);
});
// router.get("/github/callback",(req,res)=>{
//     res.json({
//         status:"success",
//         message:"Github callback is ready",
//     })
// })

// callback
router.get("/github/callback", async (req, res) => {
    try {
      const { code } = req.query;
  
      if (!code) {
        return res.status(400).json({
          status: "error",
          message: "GitHub authorization code is required",
        });
      }
  
      const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        {
          headers: {
            Accept: "application/json",
          },
        }
      );
      console.log("GithHub token response:", tokenResponse.data);
      
      const githubAccessToken = tokenResponse.data.access_token;
  
      if (!githubAccessToken) {
        return res.status(502).json({
          status: "error",
          message: "Failed to get GitHub access token",
        });
      }
  
      const userResponse = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
        },
      });
  
      const githubUser = userResponse.data;
  
      const existingUser = await pool.query(
        "SELECT * FROM users WHERE github_id = $1",
        [String(githubUser.id)]
      );
  
      let user;
  
      if (existingUser.rows.length > 0) {
        const updatedUser = await pool.query(
          `UPDATE users
           SET username = $1,
               avatar_url = $2,
               last_login_at = CURRENT_TIMESTAMP
           WHERE github_id = $3
           RETURNING *`,
          [githubUser.login, githubUser.avatar_url, String(githubUser.id)]
        );
  
        user = updatedUser.rows[0];
      } else {
        const createdUser = await pool.query(
          `INSERT INTO users (
            id, github_id, username, email, avatar_url, role, is_active, last_login_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
          RETURNING *`,
          [
            uuidv7(),
            String(githubUser.id),
            githubUser.login,
            githubUser.email,
            githubUser.avatar_url,
            "analyst",
            true,
          ]
        );
  
        user = createdUser.rows[0];
      }
  
      if (!user.is_active) {
        return res.status(403).json({
          status: "error",
          message: "User account is inactive",
        });
      }
  
      const accessToken = generateAccessToken(user);
      
      const refresh = generateRefreshToken();
      const refreshTokenHash = hashToken(refresh.token);
      const expiresAt = getRefreshTokenExpiry();
  
      await pool.query(
        `INSERT INTO refresh_tokens (
          id, user_id, token_hash, expires_at
        )
        VALUES ($1, $2, $3, $4)`,
        [refresh.id, user.id, refreshTokenHash, expiresAt]
      );

      res.cookie("access_token",accessToken,{
        httpOnly:true,
        secure:true,
        sameSite:"none",
        maxAge:3 * 60 * 1000,
      })

      res.cookie("refresh_token", refresh.token, {
        httpOnly:true,
        secure:true,
        sameSite:"none",
        maxAge:5 * 60 *1000,
      })

      return res.json({
        status:"success",
        message:"Login successful",
        user:{
          id:user.id,
          username:user.username,
          role:user.role
        },
        access_token:accessToken,
        refresh_token:refresh.token
      })
  
      // return res.json({
      //   status: "success",
      //   user: {
      //     id: user.id,
      //     username: user.username,
      //     role: user.role,
      //     avatar_url: user.avatar_url,
      //   },
      //   access_token: accessToken,
      //   refresh_token: refresh.token,
      // });
    } catch (error) {
      console.log(error.response?.data || error.message);
  
      return res.status(500).json({
        status: "error",
        message: "GitHub authentication failed",
      });
    }
  });

router.post("/logout",(req,res)=>{
    res.json({
        status:"success",
        message:"Logout route ready"
    })
})

module.exports = router