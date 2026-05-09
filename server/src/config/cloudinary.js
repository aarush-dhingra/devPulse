"use strict";

const { v2: cloudinary } = require("cloudinary");

// Reads CLOUDINARY_URL from environment automatically
cloudinary.config();

module.exports = cloudinary;
