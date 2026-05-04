// const jwt = require("jsonwebtoken");
// const pool = require("../config/db");

// async function requireAuth(req, res, next) {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({
//         status: "error",
//         message: "Authentication required",
//       });
//     }

//     const token = authHeader.split(" ")[1];

//     const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

//     const result = await pool.query(
//       "SELECT * FROM users WHERE id = $1",
//       [decoded.id]
//     );

//     const user = result.rows[0];

//     if (!user) {
//       return res.status(401).json({
//         status: "error",
//         message: "Invalid authentication token",
//       });
//     }

//     if (!user.is_active) {
//       return res.status(403).json({
//         status: "error",
//         message: "User account is inactive",
//       });
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     return res.status(401).json({
//       status: "error",
//       message: "Invalid or expired token",
//     });
//   }
// }

// function requireRole(...allowedRoles) {
//   return (req, res, next) => {
//     if (!req.user || !allowedRoles.includes(req.user.role)) {
//       return res.status(403).json({
//         status: "error",
//         message: "Forbidden",
//       });
//     }

//     next();
//   };
// }

// module.exports = {
//   requireAuth,
//   requireRole,
// };

const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function requireAuth(req, res, next) {
  try {
    let token;

    // Web portal cookie auth
    if (req.cookies?.access_token) {
      token = req.cookies.access_token;
    }

    // CLI/API bearer token auth
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const userResult = await pool.query(
      "SELECT id, username, role, is_active FROM users WHERE id = $1",
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "User not found",
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        status: "error",
        message: "User account is inactive",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
    });
  }
}

module.exports = requireAuth;