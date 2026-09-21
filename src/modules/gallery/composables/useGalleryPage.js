import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { useAuthStore } from "@/stores/auth";
import { getPublicUser } from "@/modules/user/api/userApi";
import { isOwner } from "@/shared/auth/owner";
import { TASK_KIND, UPLOAD_STATUS, useUploadQueue } from "@/modules/upload/composables/useUploadQueue";
import { formatBytes } from "@/utils/bytes";
import { formatDate, formatShortDate } from "@/utils/DateUtil";
import {
  cancelUpload,
  deleteComment,
  deleteGallery,
  getGalleryComments,
  getGalleryPage,
  getUploadLimit,
  isGalleryLiked,
  likeGallery,
  likeGalleryComment,
  postGalleryComment,
  replaceGalleryFile,
  updateGallery,
  uploadGalleryFile,
} from "@/modules/gallery/api/galleryApi";

// 后端 ID 是 Long，序列化后可能是数字或字符串，统一转成字符串比较
const isSameId = (left, right) => left != null && right != null && String(left) === String(right);

// 发请求的方法，catch 里只做状态回滚，不弹提示：
// 请求失败时 request.js 已经弹过后端返回的 msg，这里再弹一次会出现重复提示。
export function useGalleryPage() {
  const authStore = useAuthStore();
  const page = ref(1);
  const limit = ref(4);
  const total = ref(0);
  const totalPages = computed(() => Math.ceil(total.value / limit.value));
  const galleryList = ref([]);
  const showUploadModal = ref(false);
  // 每个文件一个请求、最多 3 个并发；单文件进度与状态都由队列维护
  const uploadQueue = useUploadQueue(uploadGalleryFile, { maxConcurrent: 3 });
  const uploadLimitText = ref("");
  const currentItem = ref(null);
  const comments = ref([]);
  const newComment = ref("");
  /** 正在回复的评论 { id, username }；为空表示发的是顶层评论 */
  const replyTarget = ref(null);
  /** 展开了回复的根评论 id；默认全部折叠，评论多了也不会一屏刷不完 */
  const expandedThreads = ref(new Set());
  const showUserProfile = ref(false);
  const selectedUser = ref(null);
  const isResizing = ref(false);
  const startY = ref(0);
  const initialDescHeight = ref(0);
  const resizeTarget = ref(null);
  const editingItem = ref(null);
  /** 编辑弹窗里选好的新文件；为空表示只改元数据 */
  const replacementFile = ref(null);
  // 待删除目标：{ type: "gallery" | "comment", id, label }
  const deleteTarget = ref(null);
  const deleting = ref(false);

  const isAdmin = computed(() => isOwner(authStore.user));
  const currentUserId = computed(() => authStore.user?.id ?? null);

  // 只有上传者本人或管理员能看到编辑/删除入口：入口隐藏只是显示逻辑，
  // 接口会独立校验越权请求，前端这里不承担权限控制。
  // 列表项的上传者 ID 兼容 uploaderId 与历史字段 userId。
  const canManageItem = (item) => isAdmin.value || isSameId(item?.uploaderId ?? item?.userId, currentUserId.value);
  const canManageComment = (comment) => isAdmin.value || isSameId(comment?.userId, currentUserId.value);

  const normalizeComments = (items) => (items || []).map((comment) => ({
    ...comment,
    isLiked: comment.isLiked || false,
    likeCount: comment.likeCount || comment.likes || 0,
  }));

  const loadGallery = async () => {
    try {
      const res = await getGalleryPage({ page: page.value, limit: limit.value });
      galleryList.value = res.data.list || [];
      total.value = res.data.total || 0;
    } catch {
      // 提示由 request.js 负责
    }
  };

  // 详情弹窗只拿到 currentItem 与评论线程，失败标记随 currentItem 一起带进去。
  // currentItem 为空（详情已经关掉）时没有可标记的对象，直接跳过
  const setCommentsLoadFailed = (failed) => {
    if (currentItem.value) currentItem.value.commentsLoadFailed = failed;
  };

  /**
   * 取某个资源的评论：打开详情、发评论、点赞评论三处都会走到这里。
   * 失败时不抛异常、也不清空列表 —— 已经取到的评论是有效数据，一次刷新失败就抹掉，
   * 等于把「没取到」当成「没有评论」展示给用户。失败只做标记，由弹窗说明情况，
   * 提示由 request.js 负责。
   */
  const loadComments = async (id) => {
    try {
      const res = await getGalleryComments(id);
      comments.value = normalizeComments(res.data);
      setCommentsLoadFailed(false);
    } catch {
      setCommentsLoadFailed(true);
    }
  };

  /**
   * 评论排成两层：顶层评论各自带上自己的回复。
   * 「回复的回复」也挂到根评论下，用 replyToName 标出直接回复对象，
   * 弹窗因此不需要递归渲染。父评论不在当前列表时按顶层展示，保证内容不丢。
   */
  const commentThreads = computed(() => {
    const byId = new Map(comments.value.map((comment) => [String(comment.id), comment]));

    const findRoot = (comment) => {
      let current = comment;
      const visited = new Set([String(comment.id)]);
      while (current?.parentId != null) {
        const parentKey = String(current.parentId);
        // 数据异常成环时不要一直转下去
        if (visited.has(parentKey)) break;
        visited.add(parentKey);
        const parent = byId.get(parentKey);
        if (!parent) break;
        current = parent;
      }
      return current;
    };

    const threads = new Map();
    comments.value.forEach((comment) => {
      const root = findRoot(comment);
      const rootKey = String(root.id);
      if (!threads.has(rootKey)) threads.set(rootKey, { ...root, replies: [] });
      if (String(comment.id) === rootKey) return;
      threads.get(rootKey).replies.push({
        ...comment,
        // 回复的是直接父评论，不是根评论
        replyToName: byId.get(String(comment.parentId))?.username ?? root.username,
      });
    });

    threads.forEach((thread) => {
      // 整个列表是倒序的，但一个线程内部按时间正序读起来才像对话
      thread.replies.sort((left, right) =>
        String(left.createdAt).localeCompare(String(right.createdAt)));
    });
    return [...threads.values()];
  });

  const likeComment = async (comment) => {
    if (comment.isLiked) return window.$vmessage.info("不能重复点赞");
    try {
      await likeGalleryComment(comment.id);
      await loadComments(currentItem.value.id);
    } catch {
      // 提示由 request.js 负责
    }
  };

  /**
   * 打开某人的资料弹窗。
   * 详情读不到时只保留调用方给出的 username，并标记 loadFailed：查不到资料不等于
   * 这个人的字段就是空值，按默认值补齐会被界面当成服务器返回的事实展示出来
   * （创建时间尤其明显，填当前时间会读成「今天注册」）。
   * 提示由 request.js 负责，这里只决定弹窗拿到什么。
   */
  const openUserProfile = async (_userId, username) => {
    try {
      const res = await getPublicUser(username);
      selectedUser.value = res.data || { username };
    } catch {
      selectedUser.value = { username, loadFailed: true };
    }
    showUserProfile.value = true;
  };

  const closeDetail = () => {
    currentItem.value = null;
    comments.value = [];
    newComment.value = "";
    cancelReply();
    collapseThreads();
  };

  /** 进入回复态：输入框会显示回复对象，发送时带上这条评论的 id */
  const startReply = (comment) => {
    if (!comment) return;
    replyTarget.value = { id: comment.id, username: comment.username };
  };

  const cancelReply = () => {
    replyTarget.value = null;
  };

  // 后端 id 是 Long，前端可能拿到数字或字符串，统一按字符串判断
  const isThreadExpanded = (rootId) => expandedThreads.value.has(String(rootId));

  const toggleThread = (rootId) => {
    const key = String(rootId);
    if (expandedThreads.value.has(key)) expandedThreads.value.delete(key);
    else expandedThreads.value.add(key);
  };

  const collapseThreads = () => {
    expandedThreads.value = new Set();
  };

  /** 某条评论所属线程的根评论 id；列表里找不到时返回 null */
  const threadRootIdOf = (commentId) => {
    const key = String(commentId);
    const thread = commentThreads.value.find(
      (candidate) => String(candidate.id) === key
        || candidate.replies.some((reply) => String(reply.id) === key),
    );
    return thread ? String(thread.id) : null;
  };

  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages.value) return;
    page.value = nextPage;
    loadGallery();
  };

  const changeLimit = () => {
    page.value = 1;
    loadGallery();
  };

  const clearUploadQueue = () => {
    uploadQueue.items.value.forEach((item) => {
      if (item.preview) URL.revokeObjectURL(item.preview);
    });
    uploadQueue.reset();
  };

  // 大小上限来自后端配置，前端不另写固定值
  const loadUploadLimit = async () => {
    try {
      const res = await getUploadLimit();
      uploadLimitText.value = res.data?.maxFileSizeBytes
        ? `单个文件最大 ${formatBytes(res.data.maxFileSizeBytes)}`
        : "";
    } catch {
      // 提示由 request.js 负责
    }
  };

  const openUploadModal = () => {
    // 有任务在跑时绝不能清空队列 —— 那会把正在上传的文件连同弹窗一起取消
    if (!uploadQueue.hasUnfinished.value) clearUploadQueue();
    showUploadModal.value = true;
    if (!uploadLimitText.value) loadUploadLimit();
  };

  const closeUploadModal = () => {
    if (uploadQueue.hasUnfinished.value && !window.confirm("还有文件在上传，确定关闭吗？")) return;
    clearUploadQueue();
    showUploadModal.value = false;
  };

  /**
   * 发表一个资源：一次一个文件、一份信息，以及可选的一首背景音乐。
   * 想连发多个就再点一次「上传」，队列本身支持并发，进度在页面顶部的面板里看。
   */
  const publishOne = ({ file, title, description, bgm } = {}) => {
    if (!file) return;
    uploadQueue.add(file, {
      kind: TASK_KIND.UPLOAD,
      preview: URL.createObjectURL(file),
      // 留空时由队列按文件名兜底
      title: title || undefined,
      description: description || "",
      // 随图配的背景音乐；队列会把它拼进同一次 multipart 请求
      bgm: bgm ?? null,
      // 中途取消：把服务端已经产生的行与 OSS 对象一起清掉
      onCancel: async (item) => {
        // 没发过请求就什么都没产生，不用白跑一趟
        if (!item.started) return;
        try {
          await cancelUpload(item.clientUploadId);
          loadGallery();
        } catch {
          // 提示由 request.js 负责
        }
      },
    });
    uploadQueue.start();
    // 关掉弹窗，把舞台交给页面里的队列面板
    showUploadModal.value = false;
  };

  const cancelTask = (item) => uploadQueue.cancel(item);

  // 列表以服务端结果为准：上传跑完后重新拉一次，不用本地的成功推断。
  //
  // 触发条件不能盯 items.length —— 任务完成只改 status、数组长度不变，
  // 那样刷新永远不会发生。改成两个信号：
  //   1. 出现过成功入库的上传 → 记下「欠一次刷新」
  //   2. 队列彻底空下来 → 兑现这次刷新
  // 中间有别的任务在跑时先不动，多个并发上传因此只会刷新一次，列表也只闪一次。
  const pendingRefresh = ref(false);
  watch(
    () => uploadQueue.items.value.some(
      (item) => item.kind === TASK_KIND.UPLOAD && item.status === UPLOAD_STATUS.SUCCESS,
    ),
    (uploaded) => {
      if (uploaded) pendingRefresh.value = true;
    },
  );
  watch(
    () => uploadQueue.hasUnfinished.value,
    (unfinished) => {
      if (unfinished || !pendingRefresh.value) return;
      pendingRefresh.value = false;
      loadGallery();
    },
  );

  const toggleLike = async (item) => {
    if (item.isLiked) return window.$vmessage.info("不能重复点赞");
    const originalLikes = item.likes || 0;
    try {
      if ((await isGalleryLiked(item.id)).data) {
        item.isLiked = true;
        return window.$vmessage.info("不能重复点赞");
      }
      item.isLiked = true;
      item.likes = originalLikes + 1;
      await likeGallery(item.id);
    } catch {
      // 乐观更新回滚；提示由 request.js 负责
      item.isLiked = false;
      item.likes = originalLikes;
    }
  };

  const openDetailModal = async (item) => {
    // 评论是每次打开单独取的，失败标记跟着这一次打开一起归零
    currentItem.value = { ...item, isLiked: false, commentsLoadFailed: false };
    await loadComments(item.id);
  };

  const postComment = async () => {
    if (!newComment.value.trim()) return;
    const parentId = replyTarget.value?.id ?? null;
    // 记下回复目标属于哪条线程：请求回来会重新拉评论，那时旧的列表已经没了
    const parentThreadId = parentId == null ? null : threadRootIdOf(parentId);
    try {
      await postGalleryComment({
        target_id: currentItem.value.id,
        content: newComment.value,
        // 顶层评论不带 parent_id 这个字段
        ...(parentId == null ? {} : { parent_id: parentId }),
      });
      newComment.value = "";
      cancelReply();
      // 评论已经发出去了：刷新失败由 loadComments 在详情上标记，
      // 不能把后面的计数与展开一起吞掉
      await loadComments(currentItem.value.id);
      // 展开回复所在的线程，否则用户看不到自己刚发的那条
      if (parentThreadId != null) expandedThreads.value.add(parentThreadId);
      currentItem.value.commentCount = (currentItem.value.commentCount || 0) + 1;
    } catch {
      // 提示由 request.js 负责；失败时保留输入与回复对象，可以直接重发
    }
  };

  const openEditModal = (item) => {
    replacementFile.value = null;
    editingItem.value = item;
  };

  const closeEditModal = () => {
    editingItem.value = null;
    replacementFile.value = null;
  };

  /** 编辑弹窗里选好了用来替换当前资源的新文件 */
  const setReplacementFile = (file) => {
    replacementFile.value = file;
  };

  // 局部更新列表与详情中对应的那条，不重新拉取整页
  const applyEditedFields = (id, payload) => {
    const apply = (item) => {
      if (item && isSameId(item.id, id)) Object.assign(item, payload);
    };
    apply(currentItem.value);
    apply(galleryList.value.find((item) => isSameId(item.id, id)));
  };

  /**
   * 保存编辑。做成队列任务而不是立刻发请求：
   * 顶部队列面板会显示它，中途取消还能把已经改上去的值改回来。
   * 如果同时选了新文件，换文件与改元数据合成一个任务，一次点在一条进度里跑完。
   */
  const submitEdit = (payload) => {
    const target = editingItem.value;
    if (!target) return;
    const file = replacementFile.value;
    if (Object.keys(payload).length === 0 && !file) {
      window.$vmessage.info("未修改任何内容");
      closeEditModal();
      return;
    }
    if (payload.title !== undefined && !payload.title.trim()) {
      return window.$vmessage.warning("标题不能为空");
    }

    // 取消要能回滚：记下这几个字段改之前的值
    const before = {};
    Object.keys(payload).forEach((key) => {
      before[key] = target[key] ?? null;
    });
    const targetId = target.id;
    const targetName = payload.title ?? target.title;
    closeEditModal();

    uploadQueue.add(file, {
      kind: file ? TASK_KIND.REPLACE : TASK_KIND.EDIT,
      targetId,
      name: targetName,
      preview: file ? URL.createObjectURL(file) : null,
      execute: async (_task, { onProgress, signal }) => {
        let res = null;
        if (file) {
          const formData = new FormData();
          formData.append("file", file);
          res = await replaceGalleryFile(targetId, formData, onProgress, signal);
        }
        if (Object.keys(payload).length > 0) await updateGallery(targetId, payload);
        applyEditedFields(targetId, payload);
        // 换文件会同时改掉两张表的 src。响应里带的是新地址，直接同步到界面，
        // 否则用户会继续看到旧的那张图，只能靠手动刷新
        if (res?.data?.url) applyEditedFields(targetId, { src: res.data.url });
        return res;
      },
      onCancel: async (task) => {
        // 没发过请求，或者压根没改元数据，就没有要回滚的东西
        if (!task.started || Object.keys(before).length === 0) return;
        try {
          await updateGallery(targetId, before);
          applyEditedFields(targetId, before);
        } catch {
          // 提示由 request.js 负责
        }
      },
    });
    uploadQueue.start();
  };

  const requestDeleteItem = (item) => {
    deleteTarget.value = { type: "gallery", id: item.id, label: item.title || "该资源" };
  };

  const requestDeleteComment = (comment) => {
    deleteTarget.value = { type: "comment", id: comment.id, label: `@${comment.username}` };
  };

  const cancelDelete = () => {
    deleteTarget.value = null;
  };

  // 删除父评论时后端会级联删除全部子评论，本地按 parentId 一并移除
  const collectCommentIds = (list, rootId) => {
    const ids = new Set([rootId]);
    let grew = true;
    while (grew) {
      grew = false;
      list.forEach((item) => {
        if (!ids.has(item.id) && ids.has(item.parentId)) {
          ids.add(item.id);
          grew = true;
        }
      });
    }
    return ids;
  };

  const changeCommentCount = (delta) => {
    const adjust = (item) => {
      if (item) item.commentCount = Math.max(0, (item.commentCount || 0) + delta);
    };
    adjust(currentItem.value);
    adjust(galleryList.value.find((item) => isSameId(item.id, currentItem.value?.id)));
  };

  const removeGalleryItem = (id) => {
    const index = galleryList.value.findIndex((item) => isSameId(item.id, id));
    if (index !== -1) {
      galleryList.value.splice(index, 1);
      total.value = Math.max(0, total.value - 1);
    }
    if (isSameId(currentItem.value?.id, id)) closeDetail();
    // 当前页被删空时回退到最后一个有效页补数据，避免留下空白页
    if (galleryList.value.length === 0 && total.value > 0) {
      page.value = Math.min(page.value, Math.max(1, Math.ceil(total.value / limit.value)));
      loadGallery();
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget.value;
    if (!target) return;
    deleting.value = true;
    try {
      if (target.type === "comment") {
        await deleteComment(target.id);
        const removedIds = collectCommentIds(comments.value, target.id);
        comments.value = comments.value.filter((item) => !removedIds.has(item.id));
        changeCommentCount(-removedIds.size);
      } else {
        await deleteGallery(target.id);
        removeGalleryItem(target.id);
      }
      window.$vmessage.success("删除成功");
      deleteTarget.value = null;
    } catch {
      // 提示由 request.js 负责，失败时保留原有数据
    } finally {
      deleting.value = false;
    }
  };

  const displayGender = (sex) => {
    const value = sex?.toString().toLowerCase().trim();
    if (["male", "m"].includes(value)) return "男";
    if (["female", "f"].includes(value)) return "女";
    if (["secret", "s", "other"].includes(value)) return "其他/秘密";
    return "未设置";
  };

  const startResize = (event, target) => {
    event.preventDefault();
    if (!target) return;
    isResizing.value = true;
    resizeTarget.value = target;
    startY.value = event.clientY;
    initialDescHeight.value = target.getBoundingClientRect().height;
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove, { passive: false });
    document.addEventListener("mouseup", stopResize);
  };

  const onMouseMove = (event) => {
    if (!isResizing.value || !resizeTarget.value) return;
    event.preventDefault();
    const height = Math.max(60, Math.min(window.innerHeight * 0.5, initialDescHeight.value + event.clientY - startY.value));
    resizeTarget.value.style.height = `${height}px`;
  };

  const stopResize = () => {
    if (!isResizing.value) return;
    isResizing.value = false;
    resizeTarget.value = null;
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", stopResize);
  };


  onMounted(loadGallery);
  onBeforeUnmount(() => {
    stopResize();
    clearUploadQueue();
  });
  return {
    authStore, page, limit, total, totalPages, galleryList, showUploadModal,
    currentItem, comments, newComment, showUserProfile, selectedUser, likeComment, openUserProfile,
    closeDetail, changePage, changeLimit, openUploadModal, closeUploadModal, publishOne, toggleLike, openDetailModal,
    postComment, replyTarget, startReply, cancelReply, commentThreads, displayGender, startResize,
    formatDate, formatShortDate,
    expandedThreads, isThreadExpanded, toggleThread,
    isAdmin, canManageItem, canManageComment, editingItem, replacementFile, openEditModal, closeEditModal,
    setReplacementFile, submitEdit, deleteTarget, deleting, requestDeleteItem, requestDeleteComment,
    cancelDelete, confirmDelete,
    uploadItems: uploadQueue.items,
    uploadOverallProgress: uploadQueue.overallProgress,
    uploadSuccessCount: uploadQueue.successCount,
    uploadFailedCount: uploadQueue.failedCount,
    uploadHasUnfinished: uploadQueue.hasUnfinished,
    uploadBusy: uploadQueue.isBusy,
    uploadLimitText,
    retryUpload: uploadQueue.retry,
    retryAllFailedUploads: uploadQueue.retryAllFailed,
    cancelTask,
    clearTasks: clearUploadQueue,
  };
}
