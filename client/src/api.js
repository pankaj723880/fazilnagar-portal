import axios from "axios";

let rawUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
rawUrl = rawUrl.trim().replace(/\/+$/, "");
const baseURL = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;

const API = axios.create({
  baseURL,
});

// Named export used by NewsDetail
export const fetchNewsById = async (id) => {
  const response = await API.get(`/news/${id}`);
  return response.data;
};

export default API;