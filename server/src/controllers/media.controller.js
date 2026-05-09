"use strict";

/**
 * POST /media/upload
 * Accepts a single file (field name: "file") via multer-cloudinary.
 * Returns { url, type } where type is "image" or "video".
 */
async function uploadMedia(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const resourceType = req.file.mimetype?.startsWith("video/") ? "video" : "image";

    return res.status(201).json({
      url: req.file.path,
      type: resourceType,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadMedia };
