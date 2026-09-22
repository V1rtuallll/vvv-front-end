import request from "@/utils/request";

/** 侧栏播放器当前该放哪些曲子。公开接口，未登录也能读。 */
export const getPlayerPlaylist = () => request.get("/player/playlist");
