
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
require("dotenv").config();

const initDb = require("./config/initDb")
const authRoutes = require("./routes/auth.routes")


const app = express();

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/auth", authRoutes)

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Insighta Labs+ API is running 🚀",
  });
});

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