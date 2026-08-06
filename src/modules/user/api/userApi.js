import request from "@/utils/request";

export const getCurrentUser = () => request.get("/user/info");
export const getUserCount = () => request.get("/user/count");
export const getPublicUser = (username) => request.get(`/user/info/${username}`);
export const uploadAvatar = (formData) => request.post("/user/uploadAvatar", formData);
export const updateUsername = (username) => request.post("/user/updateUsername", { username });
export const updatePassword = (password) => request.post("/user/updatePassword", { password });
export const updateProfile = (payload) => request.put("/user/updateInfo", payload);
