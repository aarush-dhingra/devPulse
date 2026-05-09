import api from "./axiosInstance";

export const mediaApi = {
  /**
   * Upload a single File to Cloudinary via the server.
   * Returns { url, type }
   */
  upload: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post("/media/upload", form, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },
};
