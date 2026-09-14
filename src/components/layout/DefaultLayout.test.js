import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/user/api/userApi", () => ({
  getUserCount: vi.fn().mockResolvedValue({ data: 1 }),
}));

// 播放器在 onMounted 里挂了一堆 DOM 事件，这里只关心导航，所以整体换掉
vi.mock("@/modules/player/composables/useAudioPlayer", async () => {
  const { ref } = await import("vue");
  return {
    useAudioPlayer: () => ({
      audioEl: ref(null),
      playPauseBtn: ref(null),
      prevBtn: ref(null),
      nextBtn: ref(null),
      progressBar: ref(null),
      volumeSlider: ref(null),
      trackName: ref(null),
      volumeDisplay: ref(null),
    }),
  };
});

import DefaultLayout from "@/components/layout/DefaultLayout.vue";

const stubs = {
  "router-link": { props: ["to"], template: '<a :href="to"><slot /></a>' },
  "router-view": true,
};

describe("左侧导航", () => {
  it("有 About 入口，指向 /about", () => {
    const wrapper = mount(DefaultLayout, { global: { stubs } });

    const links = wrapper.findAll(".vf-nav a").map((a) => [a.text(), a.attributes("href")]);

    expect(links).toContainEqual(["About", "/about"]);
  });

  it("原有的三个入口顺序不变", () => {
    const wrapper = mount(DefaultLayout, { global: { stubs } });

    const labels = wrapper.findAll(".vf-nav a").map((a) => a.text());

    expect(labels.slice(0, 3)).toEqual(["Home", "Profile", "Gallery"]);
  });
});
