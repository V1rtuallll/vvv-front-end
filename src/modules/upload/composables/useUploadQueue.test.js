import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TASK_KIND, UPLOAD_STATUS, useUploadQueue } from "@/modules/upload/composables/useUploadQueue";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function file(name, size) {
  return { name, size };
}

async function mountQueue(upload, options) {
  let queue;
  mount({
    setup() {
      queue = useUploadQueue(upload, options);
      return () => null;
    },
  });
  await flushPromises();
  return queue;
}

describe("useUploadQueue", () => {
  let pending;

  beforeEach(() => {
    pending = [];
  });

  /** 每次调用都返回一个手动控制的 promise，方便观察并发 */
  const controlledUpload = () => vi.fn((_formData, onProgress) => {
    const d = deferred();
    pending.push({ d, onProgress });
    return d.promise;
  });

  it("按文件大小加权计算总进度，而不是按文件数量平均", async () => {
    const upload = controlledUpload();
    const queue = await mountQueue(upload);
    queue.add(file("big.mp4", 900));
    queue.add(file("small.png", 100));
    queue.start();
    await flushPromises();

    // 大文件传完，小文件没动：按数量平均是 50%，按大小加权应该是 90%
    pending[0].onProgress({ loaded: 900, total: 900 });
    await flushPromises();

    expect(queue.overallProgress.value).toBe(90);
  });

  it("最多只同时上传 3 个文件", async () => {
    const upload = controlledUpload();
    const queue = await mountQueue(upload);
    for (let i = 0; i < 5; i++) queue.add(file(`f${i}.png`, 10));
    queue.start();
    await flushPromises();

    expect(queue.activeCount.value).toBe(3);
    expect(upload).toHaveBeenCalledTimes(3);

    pending[0].d.resolve({ data: { id: 1 } });
    await flushPromises();

    // 空出一个并发位后，第 4 个才开始
    expect(upload).toHaveBeenCalledTimes(4);
  });

  it("一个文件失败不影响同批次的其他文件", async () => {
    const upload = controlledUpload();
    const queue = await mountQueue(upload);
    const first = queue.add(file("a.png", 10));
    const second = queue.add(file("b.png", 10));
    queue.start();
    await flushPromises();

    pending[0].d.reject(new Error("boom"));
    pending[1].d.resolve({ data: { id: 2 } });
    await flushPromises();

    expect(first.status).toBe(UPLOAD_STATUS.FAILED);
    expect(second.status).toBe(UPLOAD_STATUS.SUCCESS);
  });

  it("失败原因取自后端返回的 msg", async () => {
    const upload = controlledUpload();
    const queue = await mountQueue(upload);
    const item = queue.add(file("a.png", 10));
    queue.start();
    await flushPromises();

    pending[0].d.reject({ response: { data: { msg: "文件类型与扩展名不匹配或不受支持" } } });
    await flushPromises();

    expect(item.error).toBe("文件类型与扩展名不匹配或不受支持");
  });

  it("重试只重投失败的那个，成功的不重复提交", async () => {
    const upload = controlledUpload();
    const queue = await mountQueue(upload);
    const failing = queue.add(file("a.png", 10));
    const ok = queue.add(file("b.png", 10));
    queue.start();
    await flushPromises();
    pending[0].d.reject(new Error("boom"));
    pending[1].d.resolve({ data: { id: 2 } });
    await flushPromises();
    upload.mockClear();

    queue.retry(failing);
    await flushPromises();

    expect(upload).toHaveBeenCalledTimes(1);
    const resent = upload.mock.calls[0][0];
    expect(resent.get("title")).toBe("a");
    expect(ok.status).toBe(UPLOAD_STATUS.SUCCESS);
  });

  it("已成功的文件不会被 retryAllFailed 再次提交", async () => {
    const upload = controlledUpload();
    const queue = await mountQueue(upload);
    queue.add(file("a.png", 10));
    queue.add(file("b.png", 10));
    queue.start();
    await flushPromises();
    pending[0].d.resolve({ data: { id: 1 } });
    pending[1].d.reject(new Error("boom"));
    await flushPromises();
    upload.mockClear();

    queue.retryAllFailed();
    await flushPromises();

    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("每次请求都带上客户端上传 ID，供服务端幂等", async () => {
    const upload = controlledUpload();
    const queue = await mountQueue(upload);
    const item = queue.add(file("a.png", 10));
    queue.start();
    await flushPromises();

    expect(upload.mock.calls[0][0].get("clientUploadId")).toBe(item.clientUploadId);
    expect(item.clientUploadId).toBeTruthy();
  });

  it("取消后状态是 cancelled，不会算成失败", async () => {
    const upload = controlledUpload();
    const queue = await mountQueue(upload);
    const item = queue.add(file("a.png", 10));
    queue.start();
    await flushPromises();

    queue.cancel(item);
    pending[0].d.reject(new Error("aborted"));
    await flushPromises();

    expect(item.status).toBe(UPLOAD_STATUS.CANCELLED);
  });

  it("有排队或上传中的文件时提示不要关闭页面", async () => {
    const upload = controlledUpload();
    const queue = await mountQueue(upload);
    queue.add(file("a.png", 10));
    expect(queue.hasUnfinished.value).toBe(true);

    queue.start();
    await flushPromises();
    pending[0].d.resolve({ data: { id: 1 } });
    await flushPromises();

    expect(queue.hasUnfinished.value).toBe(false);
  });

  it("以服务端返回的资源为准，不用本地的成功推断", async () => {
    const upload = controlledUpload();
    const queue = await mountQueue(upload);
    const item = queue.add(file("a.png", 10));
    queue.start();
    await flushPromises();

    pending[0].d.resolve({ data: { id: 42, url: "https://example.test/a.png", status: "duplicate" } });
    await flushPromises();

    expect(item.resource).toEqual({ id: 42, url: "https://example.test/a.png", status: "duplicate" });
  });
});

describe("useUploadQueue 的忙碌状态与取消清理", () => {
  const controlled = () => vi.fn(() => {
    const d = deferred();
    controlled.last = d;
    return d.promise;
  });

  it("只是排队时不算忙碌，真正开始上传才算", async () => {
    const upload = controlled();
    const queue = await mountQueue(upload);
    queue.add(file("a.png", 10));

    // 还没点确认：按钮应该显示「确认上传」而不是「上传中」
    expect(queue.hasUnfinished.value).toBe(true);
    expect(queue.isBusy.value).toBe(false);

    queue.start();
    await flushPromises();
    expect(queue.isBusy.value).toBe(true);

    controlled.last.resolve({ data: { id: 1 } });
    await flushPromises();
    expect(queue.isBusy.value).toBe(false);
  });

  it("取消会调 onCancel，并且等请求落定之后才调", async () => {
    const upload = controlled();
    const queue = await mountQueue(upload);
    const order = [];
    const item = queue.add(file("a.png", 10), {
      onCancel: async () => { order.push("cleanup"); },
    });
    queue.start();
    await flushPromises();

    const cancelling = queue.cancel(item);
    // 请求还没落定，清理不能先跑 —— 否则会漏掉刚提交的那一份
    expect(order).toEqual([]);

    controlled.last.reject(new Error("aborted"));
    await cancelling;
    expect(order).toEqual(["cleanup"]);
    expect(item.status).toBe(UPLOAD_STATUS.CANCELLED);
  });

  it("还没发过请求就取消时不会去服务端清理", async () => {
    const upload = controlled();
    const queue = await mountQueue(upload);
    let cleaned = false;
    const item = queue.add(file("a.png", 10), {
      onCancel: async () => { cleaned = true; },
    });

    // 一直没 start()，任务停在排队状态
    await queue.cancel(item);

    expect(item.status).toBe(UPLOAD_STATUS.CANCELLED);
    expect(item.started).toBe(false);
    expect(upload).not.toHaveBeenCalled();
    expect(cleaned).toBe(true);
  });

  it("带 execute 的任务走自己的执行函数，不碰文件上传", async () => {
    const upload = controlled();
    const queue = await mountQueue(upload);
    const execute = vi.fn().mockResolvedValue({ data: { id: 9 } });
    const item = queue.add(null, { kind: "edit", name: "改标题", execute });

    queue.start();
    await flushPromises();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(upload).not.toHaveBeenCalled();
    expect(item.status).toBe(UPLOAD_STATUS.SUCCESS);
  });

  it("编辑任务没有文件体积时，总进度按完成比例算", async () => {
    const upload = controlled();
    const queue = await mountQueue(upload);
    const execute = vi.fn().mockResolvedValue({ data: {} });
    queue.add(null, { kind: "edit", execute });
    queue.add(null, { kind: "edit", execute });

    expect(queue.overallProgress.value).toBe(0);
    queue.start();
    await flushPromises();
    expect(queue.overallProgress.value).toBe(100);
  });
});

describe("上传队列随图提交背景音乐", () => {
  const controlled = () => vi.fn(() => {
    const d = deferred();
    controlled.last = d;
    return d.promise;
  });

  it("配了背景音乐时把地址与类型一起带上", async () => {
    const upload = controlled();
    const queue = await mountQueue(upload);
    const file = new File(["x"], "a.png", { type: "image/png" });

    queue.add(file, {
      kind: TASK_KIND.UPLOAD,
      title: "标题",
      bgm: { src: "https://cdn.example.test/music/a.mp3", type: "audio" },
    });
    queue.start();
    await flushPromises();

    const formData = upload.mock.calls[0][0];
    expect(formData.get("bgmSrc")).toBe("https://cdn.example.test/music/a.mp3");
    expect(formData.get("bgmType")).toBe("audio");
  });

  /**
   * 没配 BGM 时一个字段都不许带。
   *
   * 带上一个空的 bgmSrc 而没有 bgmType，服务端会判成「参数不完整」——
   * 一个本来完全正常的普通上传会因此整个失败。
   */
  it("没配背景音乐时两个字段都不出现", async () => {
    const upload = controlled();
    const queue = await mountQueue(upload);
    const file = new File(["x"], "a.png", { type: "image/png" });

    queue.add(file, { kind: TASK_KIND.UPLOAD, title: "标题" });
    queue.start();
    await flushPromises();

    const formData = upload.mock.calls[0][0];
    expect(formData.has("bgmSrc")).toBe(false);
    expect(formData.has("bgmType")).toBe(false);
  });
});
