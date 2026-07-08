import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
});

export function getApiErrorMessage(error) {
  if (!error?.isAxiosError && !error?.response) {
    return error.message || "Something went wrong. Please try again.";
  }

  if (error.response?.status === 401) {
    return "Your login session expired. Please log in again as a creator, then upload the will.";
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.code === "ERR_NETWORK" || !error.response) {
    return "Network error: cannot reach the backend server. Check your connection and make sure the API is running.";
  }

  return error.message || "Something went wrong. Please try again.";
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("scw_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("scw_token");
      localStorage.removeItem("scw_user");
      window.dispatchEvent(new Event("scw:session-expired"));
    }
    return Promise.reject(error);
  }
);

export default api;
