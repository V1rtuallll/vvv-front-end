import request from "@/utils/request";

export const login = (credentials) => request.post("/auth/login", credentials);
