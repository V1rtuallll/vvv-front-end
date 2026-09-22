import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/request", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import request from "@/utils/request";
import { getPlayerPlaylist } from "@/modules/player/api/playerApi";

describe("playerApi", () => {
  it("曲目表走公开的 /player/playlist", () => {
    getPlayerPlaylist();

    expect(request.get).toHaveBeenCalledWith("/player/playlist");
  });
});
