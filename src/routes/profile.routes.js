const express = require("express");
const router = express.Router();
const requireRole = require("../middleware/role.middleware");

// GET /api/profiles
// admin + analyst
router.get("/", requireRole("admin", "analyst"), async (req, res) => {
  res.json({
    status: "success",
    message: "Get all profiles route protected",
    user: req.user,
  });
});

// GET /api/profiles/search
// admin + analyst
router.get("/search", requireRole("admin", "analyst"), async (req, res) => {
  res.json({
    status: "success",
    message: "Search profiles route protected",
    user: req.user,
  });
});

// GET /api/profiles/export
// admin + analyst
router.get("/export", requireRole("admin", "analyst"), async (req, res) => {
  res.json({
    status: "success",
    message: "Export profiles route protected",
    user: req.user,
  });
});

// GET /api/profiles/:id
// admin + analyst
router.get("/:id", requireRole("admin", "analyst"), async (req, res) => {
  res.json({
    status: "success",
    message: "Get single profile route protected",
    user: req.user,
  });
});

// POST /api/profiles
// admin only
router.post("/", requireRole("admin"), async (req, res) => {
  res.json({
    status: "success",
    message: "Create profile route protected for admin only",
    user: req.user,
  });
});

// DELETE /api/profiles/:id
// admin only
router.delete("/:id", requireRole("admin"), async (req, res) => {
  res.json({
    status: "success",
    message: "Delete profile route protected for admin only",
    user: req.user,
  });
});

module.exports = router;