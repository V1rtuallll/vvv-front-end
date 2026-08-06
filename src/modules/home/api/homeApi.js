import request from "@/utils/request";

export const getHomeConfig = () => request.get("/home/config");
export const getRandomGalleries = () => request.get("/home/eight-random-galleries");
export const getFullMediaItem = (params) => request.get("/home/full-item", { params });
