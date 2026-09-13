import { computed, getCurrentInstance, onBeforeUnmount, ref } from "vue";

/**
 * 每个文件的状态。成功或失败之后不会再被自动重投，
 * 失败要重试必须显式调用 retry()。
 */
export const UPLOAD_STATUS = {
  QUEUED: "queued",
  UPLOADING: "uploading",
  SUCCESS: "success",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

/**
 * 上传队列：每个文件一个请求、最多同时进行 maxConcurrent 个。
 *
 * 单文件独立请求，所以某个文件失败不会影响同批次的其他文件。
 *
 * @param upload (formData, onUploadProgress, signal) => Promise
 * @param options.maxConcurrent 同时上传的文件数
 * @param options.defaultTitle 由文件名生成标题；默认去掉扩展名
 */
export function useUploadQueue(upload, options = {}) {
  const maxConcurrent = options.maxConcurrent ?? 3;
  const titleFromFile = options.titleFromFile ?? ((file) => file.name.split(".").slice(0, -1).join("."));

  const items = ref([]);
  const running = ref(false);
  const controllers = new Map();
  let nextKey = 1;

  const makeClientUploadId = () => `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  const countByStatus = (status) => items.value.filter((item) => item.status === status).length;

  const activeCount = computed(() => countByStatus(UPLOAD_STATUS.UPLOADING));
  const successCount = computed(() => countByStatus(UPLOAD_STATUS.SUCCESS));
  const failedCount = computed(() => countByStatus(UPLOAD_STATUS.FAILED));

  /** 还有排队或正在上传的文件：关闭页面前要提醒 */
  const hasUnfinished = computed(
    () => countByStatus(UPLOAD_STATUS.QUEUED) + activeCount.value > 0,
  );

  const totalBytes = computed(() => items.value.reduce((sum, item) => sum + (item.size || 0), 0));

  /**
   * 总进度按文件大小加权。按文件数量平均会让「传完一个大文件」看起来像只完成了一小半。
   */
  const overallProgress = computed(() => {
    if (totalBytes.value === 0) return 0;
    const loaded = items.value.reduce(
      (sum, item) => sum + (item.size || 0) * ((item.progress || 0) / 100),
      0,
    );
    return Math.round((loaded / totalBytes.value) * 100);
  });

  const add = (file, meta = {}) => {
    const item = {
      key: nextKey++,
      clientUploadId: makeClientUploadId(),
      file,
      name: file.name,
      size: file.size || 0,
      preview: meta.preview ?? null,
      title: meta.title ?? titleFromFile(file),
      description: meta.description ?? "",
      status: UPLOAD_STATUS.QUEUED,
      progress: 0,
      error: null,
      resource: null,
    };
    items.value.push(item);
    return item;
  };

  const runItem = async (item) => {
    item.status = UPLOAD_STATUS.UPLOADING;
    item.progress = 0;
    item.error = null;

    const controller = new AbortController();
    controllers.set(item.clientUploadId, controller);

    const formData = new FormData();
    formData.append("file", item.file);
    formData.append("title", item.title);
    formData.append("description", item.description);
    formData.append("clientUploadId", item.clientUploadId);

    try {
      const res = await upload(
        formData,
        (event) => {
          if (event?.total) item.progress = Math.round((event.loaded / event.total) * 100);
        },
        controller.signal,
      );
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

  /** 有空闲并发位就继续投递排队中的文件 */
  const pump = () => {
    if (!running.value) return;
    while (activeCount.value < maxConcurrent) {
      const next = items.value.find((item) => item.status === UPLOAD_STATUS.QUEUED);
      if (!next) break;
      void runItem(next);
    }
  };

  const start = () => {
    running.value = true;
    pump();
  };

  /** 只重投这一个文件；已经成功的文件不会被再次提交 */
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

  const cancel = (item) => {
    const controller = controllers.get(item.clientUploadId);
    if (controller) {
      controller.abort();
      return;
    }
    if (item.status === UPLOAD_STATUS.QUEUED) item.status = UPLOAD_STATUS.CANCELLED;
  };

  const remove = (item) => {
    if (item.status === UPLOAD_STATUS.UPLOADING) return;
    items.value = items.value.filter((candidate) => candidate !== item);
  };

  const reset = () => {
    items.value.forEach((item) => controllers.get(item.clientUploadId)?.abort());
    items.value = [];
    running.value = false;
  };

  // 关闭页面前提醒还在上传的文件
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
