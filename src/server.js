
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
require("dotenv").config();

const initDb = require("./config/initDb")
const authRoutes = require("./routes/auth.routes")
const requireAuth = require("./middleware/auth.middleware")
const profileRoutes = require("./routes/profile.routes")

const requireApiVersion = require("./middleware/version.middleware")
const rateLimit = require("express-rate-limit")

const appLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:60,
  message:{
      status:"error",
      message:"Too many requests, slow down"
  }
})

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max:10, // 10 requests per minute
  message:{
    status:"error",
    message: "Too many requests, try again later"
  }
})



const app = express();

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/auth", authLimiter)

app.use("/api", requireApiVersion)
app.use("/api", appLimiter)
app.use("/api", requireAuth)

app.use("/api/profiles", profileRoutes)

app.use("/auth", authRoutes)

// protect all APIs
// app.use("/api", requireAuth)
// app.use("/api/profiles", profileRoutes)

// last middleware
app.use((err,req,res,next)=>{
  console.error(err.stack);

  res.status(err.status || 500).json({
    status:"error",
    message:err.message || "internal Server Error"
  })
})

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Insighta Labs+ API is running 🚀",
  });
});

app.get("/auth/me", requireAuth, (req,res)=>{
  res.json({
    status:"success",
    user:req.user
  })
})

const PORT = process.env.PORT || 3000;


// this replaced app.listen()
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });