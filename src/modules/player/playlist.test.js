import { describe, expect, it } from "vitest";

import { playableTracks } from "@/modules/player/playlist";

describe("playableTracks", () => {
  const AVAILABLE = ["a.mp3", "b.mp3", "c.flac"];

  it("只放构建期清单里有的那些", () => {
    expect(playableTracks(["b.mp3", "a.mp3"], AVAILABLE)).toEqual(["b.mp3", "a.mp3"]);
  });

  /**
   * 配置存进库之后，文件仍可能从 public/music 里被删掉（删完要重新构建才生效，
   * 但库里的配置不会被那次构建动过）。这一层把这类条目消化掉，
   * 免得一轮随机播放里混进一首永远不响的死曲目。
   */
  it("配置里指向已删文件的条目被丢掉", () => {
    expect(playableTracks(["a.mp3", "gone.mp3"], AVAILABLE)).toEqual(["a.mp3"]);
  });

  it("只做减法：清单里有但配置里没有的不会加进来", () => {
    expect(playableTracks(["a.mp3"], AVAILABLE)).toEqual(["a.mp3"]);
  });

  it("配置为空时结果为空", () => {
    expect(playableTracks([], AVAILABLE)).toEqual([]);
  });

  it("清单取不到时结果为空", () => {
    expect(playableTracks(["a.mp3"], [])).toEqual([]);
  });

  it("拿到非数组时按空处理，不抛", () => {
    expect(playableTracks(null, AVAILABLE)).toEqual([]);
    expect(playableTracks(["a.mp3"], null)).toEqual([]);
  });
});
