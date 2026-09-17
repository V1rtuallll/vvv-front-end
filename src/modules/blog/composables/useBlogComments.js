import { computed, ref } from "vue";

import { deleteBlogComment, getBlogComments, likeBlogComment, postBlogComment } from "@/modules/blog/api/blogApi";
import { isOwner } from "@/shared/auth/owner";
import { useAuthStore } from "@/stores/auth";

// 后端 ID 是 Long，序列化后可能是数字或字符串，统一按字符串比较
const isSameId = (left, right) => left != null && right != null && String(left) === String(right);

/**
 * 一篇文章的评论区状态。
 *
 * @param {import('vue').Ref} blogIdRef 文章 id
 * @param {import('vue').Ref} authorIdRef 文章作者 id（文章作者也能删评论）
 */
export function useBlogComments(blogIdRef, authorIdRef) {
  const authStore = useAuthStore();
  const comments = ref([]);
  const newComment = ref("");
  /** 正在回复的评论 { id, username }；为空表示发的是顶层评论 */
  const replyTarget = ref(null);
  /** 展开了回复的根评论 id；默认全部折叠，评论多了不会一屏刷不完 */
  const expandedThreads = ref(new Set());
  const posting = ref(false);

  const isAdmin = computed(() => isOwner(authStore.user));
  const currentUserId = computed(() => authStore.user?.id ?? null);

  // 与后端 BlogInteractionService.deleteComment 的判定一致：
  // 评论作者本人、文章作者、站点 owner 三种人都可以删。
  // 入口隐藏只是显示逻辑，真正的判定在服务端。
  const canManageComment = (comment) => isAdmin.value
    || isSameId(comment?.userId, currentUserId.value)
    || isSameId(authorIdRef.value, currentUserId.value);

  const normalize = (items) => (items || []).map((comment) => ({
    ...comment,
    likes: comment.likes || 0,
    isLiked: comment.isLiked || false,
  }));

  const loadComments = async () => {
    if (!blogIdRef.value) return;
    try {
      const res = await getBlogComments(blogIdRef.value);
      comments.value = normalize(res.data);
    } catch {
      // 提示由 request.js 负责（草稿对非作者不可见时后端返回 403 文案）
    }
  };

  /**
   * 评论排成两层：顶层评论各自带上自己的回复。
   * 「回复的回复」也挂到根评论下，用 replyToName 标出直接回复对象，
   * 模板因此不需要递归渲染。父评论不在当前列表时按顶层展示，保证内容不丢。
   */
  const threads = computed(() => {
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

    const grouped = new Map();
    comments.value.forEach((comment) => {
      const root = findRoot(comment);
      const rootKey = String(root.id);
      if (!grouped.has(rootKey)) grouped.set(rootKey, { ...root, replies: [] });
      if (String(comment.id) === rootKey) return;
      grouped.get(rootKey).replies.push({
        ...comment,
        // 回复的是直接父评论，不是根评论
        replyToName: byId.get(String(comment.parentId))?.username ?? root.username,
      });
    });

    grouped.forEach((thread) => {
      // 整个列表是倒序的，但一个线程内部按时间正序读起来才像对话
      thread.replies.sort((left, right) =>
        String(left.createdAt).localeCompare(String(right.createdAt)));
    });
    return [...grouped.values()];
  });

  /** 进入回复态：输入框会显示回复对象，发送时带上这条评论的 id */
  const startReply = (comment) => {
    if (!comment) return;
    replyTarget.value = { id: comment.id, username: comment.username };
  };

  const cancelReply = () => {
    replyTarget.value = null;
  };

  const isThreadExpanded = (rootId) => expandedThreads.value.has(String(rootId));

  const toggleThread = (rootId) => {
    const key = String(rootId);
    if (expandedThreads.value.has(key)) expandedThreads.value.delete(key);
    else expandedThreads.value.add(key);
  };

  /** 某条评论所属线程的根评论 id；列表里找不到时返回 null */
  const threadRootIdOf = (commentId) => {
    const key = String(commentId);
    const thread = threads.value.find(
      (candidate) => String(candidate.id) === key
        || candidate.replies.some((reply) => String(reply.id) === key),
    );
    return thread ? String(thread.id) : null;
  };

  /**
   * @returns {Promise<boolean>} 成功 true；失败 false，且保留输入与回复对象
   */
  const postComment = async () => {
    const content = newComment.value.trim();
    if (!content || !blogIdRef.value) return false;

    const parentId = replyTarget.value?.id ?? null;
    // 记下回复目标属于哪条线程：请求回来会重新拉评论，那时旧的列表已经没了
    const parentThreadId = parentId == null ? null : threadRootIdOf(parentId);

    posting.value = true;
    try {
      await postBlogComment({
        blogId: blogIdRef.value,
        content,
        // 顶层评论不带 parentId 这个字段
        ...(parentId == null ? {} : { parentId }),
      });
      newComment.value = "";
      cancelReply();
      await loadComments();
      // 展开回复所在的线程，否则用户看不到自己刚发的那条
      if (parentThreadId != null) expandedThreads.value.add(parentThreadId);
      return true;
    } catch {
      // 提示由 request.js 负责；失败时保留输入与回复对象，可以直接重发
      return false;
    } finally {
      posting.value = false;
    }
  };

  /**
   * 点赞没有取消语义：后端的点赞行用 INSERT IGNORE 写入，重复点赞返回 409。
   * 已经赞过的在本地就拦住，免得白跑一趟还弹一次后端消息。
   * @returns {Promise<boolean>} 成功 true
   */
  const likeComment = async (comment) => {
    if (!comment) return false;
    if (comment.isLiked) {
      window.$vmessage.info("不能重复点赞");
      return false;
    }
    try {
      await likeBlogComment(comment.id);
    } catch {
      // 提示由 request.js 负责
      return false;
    }
    // 计数以服务端为准，重新拉一次（不做乐观更新，避免与服务端对不上）
    await loadComments();
    return true;
  };

  // 删除父评论时后端会级联删除全部子评论，本地按 parentId 一并移除。
  // 集合里一律存**字符串** id：后端 Long 序列化后可能是数字也可能是字符串，
  // 混着比会漏（gallery 那边也同样按字符串统一）。
  const collectCommentIds = (list, rootId) => {
    const ids = new Set([String(rootId)]);
    let grew = true;
    while (grew) {
      grew = false;
      list.forEach((item) => {
        if (!ids.has(String(item.id)) && ids.has(String(item.parentId))) {
          ids.add(String(item.id));
          grew = true;
        }
      });
    }
    return ids;
  };

  /**
   * 删除一条评论（后端会连整棵回复树一起删）。
   * @returns {Promise<number>} 被删掉的条数；失败返回 0
   */
  const removeComment = async (comment) => {
    if (!comment) return 0;
    try {
      await deleteBlogComment(comment.id);
    } catch {
      // 提示由 request.js 负责，失败时保留原有数据
      return 0;
    }
    const removed = collectCommentIds(comments.value, comment.id);
    comments.value = comments.value.filter((item) => !removed.has(String(item.id)));
    window.$vmessage.success("删除成功");
    return removed.size;
  };

  return {
    comments,
    newComment,
    replyTarget,
    expandedThreads,
    posting,
    threads,
    canManageComment,
    loadComments,
    postComment,
    likeComment,
    removeComment,
    startReply,
    cancelReply,
    toggleThread,
    isThreadExpanded,
  };
}
