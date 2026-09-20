import { computed, getCurrentInstance, onBeforeUnmount, ref } from "vue";

/**
 * 每个任务的状态。成功或失败之后不会再被自动重投，
 * 失败要重试必须显式调用 retry()。
 */
export const UPLOAD_STATUS = {
  QUEUED: "queued",
  UPLOADING: "uploading",
  SUCCESS: "success",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

/** 任务种类：标签与取消语义不同，但共用同一个队列与同一套进度展示 */
export const TASK_KIND = {
  UPLOAD: "upload",
  EDIT: "edit",
  REPLACE: "replace",
};

/**
 * 任务队列：每个任务一个请求、最多同时进行 maxConcurrent 个。
 *
 * 默认走文件上传（传 file 就够）；需要别的行为时，用 meta.execute 自带一个执行函数，
 * 例如编辑元数据、替换资源文件。
 *
 * 取消的语义分两层：
 *   1. 中止在途请求
 *   2. 请求彻底结束后再调 meta.onCancel（清理服务端已经产生的副作用）
 * 第 2 步等第 1 步落定才做，否则可能在上传刚提交、清理先跑到的竞态下留下垃圾。
 *
 * @param upload (formData, onUploadProgress, signal) => Promise
 * @param options.maxConcurrent 同时进行的任务数
 * @param options.titleFromFile 由文件名生成标题
 */
export function useUploadQueue(upload, options = {}) {
  const maxConcurrent = options.maxConcurrent ?? 3;
  const titleFromFile = options.titleFromFile ?? ((file) => file.name.split(".").slice(0, -1).join("."));

  const items = ref([]);
  const running = ref(false);
  const controllers = new Map();
  const inFlight = new Map();
  let nextKey = 1;

  const makeClientUploadId = () => `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  const countByStatus = (status) => items.value.filter((item) => item.status === status).length;

  const activeCount = computed(() => countByStatus(UPLOAD_STATUS.UPLOADING));
  const successCount = computed(() => countByStatus(UPLOAD_STATUS.SUCCESS));
  const failedCount = computed(() => countByStatus(UPLOAD_STATUS.FAILED));

  /** 还有排队或正在进行的任务：关闭页面前要提醒 */
  const hasUnfinished = computed(
    () => countByStatus(UPLOAD_STATUS.QUEUED) + activeCount.value > 0,
  );

  /** 真正在跑（不是仅仅排着队）：按钮文案与面板显隐都看它 */
  const isBusy = computed(() => running.value && hasUnfinished.value);

  const totalBytes = computed(() => items.value.reduce((sum, item) => sum + (item.size || 0), 0));

  /**
   * 总进度按文件大小加权。按任务数量平均会让「传完一个大文件」看起来像只完成了一小半。
   * 没有体积信息的任务（比如编辑）按「完成即 100%」计入。
   */
  const overallProgress = computed(() => {
    if (items.value.length === 0) return 0;
    if (totalBytes.value === 0) {
      const done = items.value.filter((item) => item.status === UPLOAD_STATUS.SUCCESS).length;
      return Math.round((done / items.value.length) * 100);
    }
    const loaded = items.value.reduce(
      (sum, item) => sum + (item.size || 0) * ((item.progress || 0) / 100),
      0,
    );
    return Math.round((loaded / totalBytes.value) * 100);
  });

  /**
   * @param file 上传/替换任务要传文件；编辑任务传 null
   * @param meta.kind      任务种类，只用于展示与取消语义
   * @param meta.execute   自定义执行函数 (item, { onProgress, signal }) => Promise
   * @param meta.onCancel  请求落定后的清理回调，例如撤销已入库的上传
   */
  const add = (file, meta = {}) => {
    const item = {
      key: nextKey++,
      kind: meta.kind ?? TASK_KIND.UPLOAD,
      clientUploadId: makeClientUploadId(),
      file: file ?? null,
      name: meta.name ?? file?.name ?? "",
      size: file?.size ?? 0,
      preview: meta.preview ?? null,
      title: meta.title ?? (file ? titleFromFile(file) : ""),
      description: meta.description ?? "",
      /** 随图一起提交的背景音乐 { src, type }；不配时为 null */
      bgm: meta.bgm ?? null,
      targetId: meta.targetId ?? null,
      status: UPLOAD_STATUS.QUEUED,
      progress: 0,
      error: null,
      resource: null,
      execute: meta.execute ?? null,
      onCancel: meta.onCancel ?? null,
      /** 有没有真的发出过请求。没发过就不必去服务端清理，那边什么都没产生 */
      started: false,
    };
    items.value.push(item);
    return item;
  };

  const buildFormData = (item) => {
    const formData = new FormData();
    formData.append("file", item.file);
    if (item.kind === TASK_KIND.UPLOAD) {
      formData.append("title", item.title);
      formData.append("description", item.description);
      formData.append("clientUploadId", item.clientUploadId);
      // 背景音乐跟着同一次请求走：两个字段要么都带、要么都不带 ——
      // 只带一个会被服务端当成参数不完整而拒绝整个上传
      if (item.bgm?.src) {
        formData.append("bgmSrc", item.bgm.src);
        formData.append("bgmType", item.bgm.type);
      }
    }
    return formData;
  };

  const runItem = async (item) => {
    item.status = UPLOAD_STATUS.UPLOADING;
    item.progress = 0;
    item.error = null;
    item.started = true;

    const controller = new AbortController();
    controllers.set(item.clientUploadId, controller);
    const onProgress = (event) => {
      if (event?.total) item.progress = Math.round((event.loaded / event.total) * 100);
    };

    try {
      const res = item.execute
        ? await item.execute(item, { onProgress, signal: controller.signal })
        : await upload(buildFormData(item), onProgress, controller.signal);
      item.status = UPLOAD_STATUS.SUCCESS;
      item.progress = 100;
      item.resource = res?.data ?? null;
    } catch (err) {
      if (controller.signal.aborted) {
        item.status = UPLOAD_STATUS.CANCELLED;
      } else {
        item.status = UPLOAD_STATUS.FAILED;
        item.error = err?.response?.data?.msg || err?.message || "上传失败";
      }
    } finally {
      controllers.delete(item.clientUploadId);
      pump();
    }
  };

  /** 有空闲并发位就继续投递排队中的任务 */
  const pump = () => {
    if (!running.value) return;
    while (activeCount.value < maxConcurrent) {
      const next = items.value.find((item) => item.status === UPLOAD_STATUS.QUEUED);
      if (!next) break;
      const promise = runItem(next);
      inFlight.set(next.clientUploadId, promise);
    }
  };

  const start = () => {
    running.value = true;
    pump();
  };

  /** 只重投这一个任务；已经成功的不会被再次提交 */
  const retry = (item) => {
    if (item.status === UPLOAD_STATUS.UPLOADING || item.status === UPLOAD_STATUS.SUCCESS) return;
    item.status = UPLOAD_STATUS.QUEUED;
    item.progress = 0;
    item.error = null;
    start();
  };

  const retryAllFailed = () => {
    items.value
      .filter((item) => item.status === UPLOAD_STATUS.FAILED || item.status === UPLOAD_STATUS.CANCELLED)
      .forEach((item) => {
        item.status = UPLOAD_STATUS.QUEUED;
        item.progress = 0;
        item.error = null;
      });
    start();
  };

  /**
   * 取消：先中止请求，等它彻底落定之后再跑清理回调。
   * 顺序反过来会在「上传刚提交、清理请求先到」时漏掉已经入库的那一份。
   */
  const cancel = async (item) => {
    const controller = controllers.get(item.clientUploadId);
    const promise = inFlight.get(item.clientUploadId);
    if (controller) {
      controller.abort();
    } else if (item.status === UPLOAD_STATUS.QUEUED) {
      item.status = UPLOAD_STATUS.CANCELLED;
    }
    if (promise) {
      await promise.catch(() => {});
      inFlight.delete(item.clientUploadId);
    }
    if (item.onCancel) await item.onCancel(item);
  };

  const remove = (item) => {
    if (item.status === UPLOAD_STATUS.UPLOADING) return;
    items.value = items.value.filter((candidate) => candidate !== item);
  };

  const reset = () => {
    items.value.forEach((item) => controllers.get(item.clientUploadId)?.abort());
    items.value = [];
    inFlight.clear();
    running.value = false;
  };

  // 关闭页面前提醒还在跑的任务
  const handleBeforeUnload = (event) => {
    if (!hasUnfinished.value) return;
    event.preventDefault();
    event.returnValue = "";
    return "";
  };
  if (getCurrentInstance()) {
    window.addEventListener("beforeunload", handleBeforeUnload);
    onBeforeUnmount(() => window.removeEventListener("beforeunload", handleBeforeUnload));
  }

  return {
    items,
    running,
    isBusy,
    activeCount,
    successCount,
    failedCount,
    hasUnfinished,
    overallProgress,
    totalBytes,
    add,
    start,
    retry,
    retryAllFailed,
    cancel,
    remove,
    reset,
  };
}
