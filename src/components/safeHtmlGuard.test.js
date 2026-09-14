import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = join(process.cwd(), "src");
const ALLOWED_FILE = "components/SafeHtml.vue";

function vueFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return vueFiles(full);
    return entry.name.endsWith(".vue") ? [full] : [];
  });
}

/**
 * v-html 是唯一能把字符串变成 DOM 的出口，绕开 sanitizeHtml 就是 XSS。
 * 这条测试守住「全仓库只有一个出口」这个不变量 ——
 * 以后想直接写 v-html 的人会在这里被拦下。
 */
describe("v-html 出口的唯一性", () => {
  it("只有 SafeHtml.vue 允许使用 v-html", () => {
    const offenders = vueFiles(SRC_DIR)
      .filter((file) => readFileSync(file, "utf8").includes("v-html"))
      .map((file) => relative(SRC_DIR, file).split(sep).join("/"));

    expect(offenders).toEqual([ALLOWED_FILE]);
  });
});
