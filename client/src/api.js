import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Named export used by NewsDetail
export const fetchNewsById = async (id) => {
  const response = await API.get(`/news/${id}`);
  return response.data;
};

export default API;