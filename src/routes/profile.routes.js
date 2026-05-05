const express = require("express");
const axios = require("axios");
const { v7: uuidv7 } = require("uuid");
const pool = require("../config/db");
const requireRole = require("../middleware/role.middleware");

const router = express.Router();
const {parser} = require("json2csv");
const { default: rateLimit } = require("express-rate-limit");


function getAgeGroup(age) {
  if (age <= 12) return "child";
  if (age <= 19) return "teenager";
  if (age <= 59) return "adult";
  return "senior";
}

// GET /api/profiles
router.get("/", requireRole("admin", "analyst"), async (req, res) => {
  try {
    const {
      gender,
      country_id,
      age_group,
      min_age,
      max_age,
      min_gender_probability,
      min_country_probability,
      sort_by = "created_at",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const allowedSort = ["age", "created_at", "gender_probability"];
    const allowedOrder = ["asc", "desc"];

    if (!allowedSort.includes(sort_by) || !allowedOrder.includes(order.toLowerCase())) {
      return res.status(400).json({
        status: "error",
        message: "Invalid query parameters",
      });
    }

    const conditions = [];
    const values = [];
    let index = 1;

    if (gender) {
      conditions.push(`LOWER(gender) = LOWER($${index++})`);
      values.push(gender);
    }

    if (country_id) {
      conditions.push(`LOWER(country_id) = LOWER($${index++})`);
      values.push(country_id);
    }

    if (age_group) {
      conditions.push(`LOWER(age_group) = LOWER($${index++})`);
      values.push(age_group);
    }

    if (min_age) {
      conditions.push(`age >= $${index++}`);
      values.push(Number(min_age));
    }

    if (max_age) {
      conditions.push(`age <= $${index++}`);
      values.push(Number(max_age));
    }

    if (min_gender_probability) {
      conditions.push(`gender_probability >= $${index++}`);
      values.push(Number(min_gender_probability));
    }

    if (min_country_probability) {
      conditions.push(`country_probability >= $${index++}`);
      values.push(Number(min_country_probability));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 50);
    const offset = (pageNumber - 1) * limitNumber;

    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM profiles ${whereClause}`,
      values
    );

    const total = Number(totalResult.rows[0].count);
    const totalPages = Math.ceil(total / limitNumber);

    const dataResult = await pool.query(
      `
      SELECT id, name, gender, gender_probability, age, age_group,
             country_id, country_name, country_probability, created_at
      FROM profiles
      ${whereClause}
      ORDER BY ${sort_by} ${order.toUpperCase()}
      LIMIT $${index++} OFFSET $${index++}
      `,
      [...values, limitNumber, offset]
    );

    return res.json({
      status: "success",
      page: pageNumber,
      limit: limitNumber,
      total,
      total_pages: totalPages,
      links: {
        self: `/api/profiles?page=${pageNumber}&limit=${limitNumber}`,
        next: pageNumber < totalPages ? `/api/profiles?page=${pageNumber + 1}&limit=${limitNumber}` : null,
        prev: pageNumber > 1 ? `/api/profiles?page=${pageNumber - 1}&limit=${limitNumber}` : null,
      },
      data: dataResult.rows,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

// GET /api/profiles/search?q=young males from nigeria
router.get("/search", requireRole("admin", "analyst"), async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Unable to interpret query",
      });
    }

    const text = q.toLowerCase();
    const conditions = [];
    const values = [];
    let index = 1;

    if (text.includes("female")) {
      conditions.push(`gender = $${index++}`);
      values.push("female");
    } else if (text.includes("male")) {
      conditions.push(`gender = $${index++}`);
      values.push("male");
    }

    if (text.includes("young")) {
      conditions.push(`age BETWEEN 16 AND 24`);
    } else if (text.includes("teen")) {
      conditions.push(`age_group = $${index++}`);
      values.push("teenager");
    } else if (text.includes("adult")) {
      conditions.push(`age_group = $${index++}`);
      values.push("adult");
    } else if (text.includes("senior")) {
      conditions.push(`age_group = $${index++}`);
      values.push("senior");
    } else if (text.includes("child")) {
      conditions.push(`age_group = $${index++}`);
      values.push("child");
    }

    if (text.includes("nigeria")) {
      conditions.push(`country_id = $${index++}`);
      values.push("NG");
    } else if (text.includes("kenya")) {
      conditions.push(`country_id = $${index++}`);
      values.push("KE");
    } else if (text.includes("angola")) {
      conditions.push(`country_id = $${index++}`);
      values.push("AO");
    }

    if (conditions.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Unable to interpret query",
      });
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 50);
    const offset = (pageNumber - 1) * limitNumber;

    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM profiles ${whereClause}`,
      values
    );

    const total = Number(totalResult.rows[0].count);
    const totalPages = Math.ceil(total / limitNumber);

    const dataResult = await pool.query(
      `
      SELECT id, name, gender, gender_probability, age, age_group,
             country_id, country_name, country_probability, created_at
      FROM profiles
      ${whereClause}
      LIMIT $${index++} OFFSET $${index++}
      `,
      [...values, limitNumber, offset]
    );

    return res.json({
      status: "success",
      page: pageNumber,
      limit: limitNumber,
      total,
      total_pages: totalPages,
      links: {
        self: `/api/profiles/search?q=${encodeURIComponent(q)}&page=${pageNumber}&limit=${limitNumber}`,
        next: pageNumber < totalPages ? `/api/profiles/search?q=${encodeURIComponent(q)}&page=${pageNumber + 1}&limit=${limitNumber}` : null,
        prev: pageNumber > 1 ? `/api/profiles/search?q=${encodeURIComponent(q)}&page=${pageNumber - 1}&limit=${limitNumber}` : null,
      },
      data: dataResult.rows,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});



// POST /api/profiles admin only
router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Name is required",
      });
    }

    if (typeof name !== "string") {
      return res.status(422).json({
        status: "error",
        message: "Name must be a string",
      });
    }

    const existing = await pool.query(
      "SELECT * FROM profiles WHERE LOWER(name) = LOWER($1)",
      [name]
    );

    if (existing.rows.length > 0) {
      return res.json({
        status: "success",
        message: "Profile already exists",
        data: existing.rows[0],
      });
    }

    const [genderRes, ageRes, countryRes] = await Promise.all([
      axios.get(`https://api.genderize.io?name=${encodeURIComponent(name)}`),
      axios.get(`https://api.agify.io?name=${encodeURIComponent(name)}`),
      axios.get(`https://api.nationalize.io?name=${encodeURIComponent(name)}`),
    ]);

    const { gender, probability, count } = genderRes.data;
    const { age } = ageRes.data;
    const countries = countryRes.data.country;

    if (!gender || count === 0) {
      return res.status(502).json({
        status: "error",
        message: "Genderize returned an invalid response",
      });
    }

    if (age === null || age === undefined) {
      return res.status(502).json({
        status: "error",
        message: "Agify returned an invalid response",
      });
    }

    if (!countries || countries.length === 0) {
      return res.status(502).json({
        status: "error",
        message: "Nationalize returned an invalid response",
      });
    }

    const bestCountry = countries.reduce((a, b) =>
      b.probability > a.probability ? b : a
    );

    const profile = {
      id: uuidv7(),
      name: name.toLowerCase(),
      gender,
      gender_probability: probability,
      sample_size: count,
      age,
      age_group: getAgeGroup(age),
      country_id: bestCountry.country_id,
      country_name: "Unknown",
      country_probability: bestCountry.probability,
    };

    const result = await pool.query(
      `
      INSERT INTO profiles (
        id, name, gender, gender_probability, sample_size,
        age, age_group, country_id, country_name, country_probability
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        profile.id,
        profile.name,
        profile.gender,
        profile.gender_probability,
        profile.sample_size,
        profile.age,
        profile.age_group,
        profile.country_id,
        profile.country_name,
        profile.country_probability,
      ]
    );

    return res.status(201).json({
      status: "success",
      data: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

// export route for csv
router.get(
    "/export",
    requireRole("admin", "analyst"),
    async (req, res) => {
      try {
        const result = await pool.query(`
          SELECT
            id,
            name,
            gender,
            gender_probability,
            age,
            age_group,
            country_id,
            country_name,
            country_probability,
            created_at
          FROM profiles
          ORDER BY created_at DESC
        `);
  
        const profiles = result.rows;
  
        if (profiles.length === 0) {
          return res.status(404).json({
            status: "error",
            message: "No profiles found",
          });
        }
  
        // ✅ CSV HEADER
        const headers = [
          "id",
          "name",
          "gender",
          "gender_probability",
          "age",
          "age_group",
          "country_id",
          "country_name",
          "country_probability",
          "created_at"
        ];
  
        // ✅ CSV ROWS
        const rows = profiles.map(profile =>
          headers.map(field => `"${profile[field] ?? ""}"`).join(",")
        );
  
        // ✅ FINAL CSV
        const csv = [headers.join(","), ...rows].join("\n");
  
        // ✅ RESPONSE HEADERS
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=profiles.csv"
        );
  
        return res.status(200).send(csv);
  
      } catch (error) {
        console.error("CSV EXPORT ERROR:", error);
  
        return res.status(500).json({
          status: "error",
          message: error.message,
        });
      }
    }
  );

// id
// GET /api/profiles/:id
router.get("/:id", requireRole("admin", "analyst"), async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM profiles WHERE id = $1", [
        req.params.id,
      ]);
  
      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Profile not found",
        });
      }
  
      return res.json({
        status: "success",
        data: result.rows[0],
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Server error",
      });
    }
  });

// DELETE /api/profiles/:id admin only
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM profiles WHERE id = $1", [
      req.params.id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found",
      });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
});

module.exports = router;