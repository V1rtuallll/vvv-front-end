import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import { useAuthStore } from "@/stores/auth";
import { getPublicUser } from "@/modules/user/api/userApi";
import {
  getGalleryComments,
  getGalleryPage,
  isGalleryLiked,
  likeGallery,
  likeGalleryComment,
  postGalleryComment,
  uploadGalleryMedia,
} from "@/modules/gallery/api/galleryApi";

export function useGalleryPage() {
  const authStore = useAuthStore();
  const page = ref(1);
  const limit = ref(6);
  const total = ref(0);
  const totalPages = computed(() => Math.ceil(total.value / limit.value));
  const galleryList = ref([]);
  const showUploadModal = ref(false);
  const pendingFiles = ref([]);
  const uploading = ref(false);
  const currentItem = ref(null);
  const comments = ref([]);
  const newComment = ref("");
  const showUserProfile = ref(false);
  const selectedUser = ref(null);
  const isResizing = ref(false);
  const startY = ref(0);
  const initialDescHeight = ref(0);
  const resizeTarget = ref(null);

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
    } catch (err) {
      window.$vmessage.error("加载失败");
    }
  };

  const loadComments = async (id) => {
    const res = await getGalleryComments(id);
    comments.value = normalizeComments(res.data);
  };

  const likeComment = async (comment) => {
    if (comment.isLiked) return window.$vmessage.info("不能重复点赞");
    try {
      await likeGalleryComment(comment.id);
      await loadComments(currentItem.value.id);
    } catch (err) {
      window.$vmessage.error("点赞失败");
    }
  };

  const openUserProfile = async (_userId, username) => {
    try {
      const res = await getPublicUser(username);
      selectedUser.value = res.data || { username };
    } catch (err) {
      selectedUser.value = {
        username,
        avatar: "/default-avatar.gif",
        sex: "SECRET",
        description: "无",
        createdAt: new Date(),
      };
    }
    showUserProfile.value = true;
  };

  const closeDetail = () => {
    currentItem.value = null;
    comments.value = [];
    newComment.value = "";
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

  const resetPendingFiles = () => {
    pendingFiles.value.forEach((item) => URL.revokeObjectURL(item.preview));
    pendingFiles.value = [];
  };

  const openUploadModal = () => {
    resetPendingFiles();
    showUploadModal.value = true;
  };

  const closeUploadModal = () => {
    resetPendingFiles();
    showUploadModal.value = false;
  };

  const handleFiles = (event) => {
    const files = Array.from(event.target.files);
    resetPendingFiles();
    pendingFiles.value = files.map((file, index) => ({
      file,
      name: file.name,
      type: file.type,
      preview: URL.createObjectURL(file),
      title: file.name.split(".").slice(0, -1).join(".") + (files.length > 1 ? ` (${index + 1})` : ""),
      description: "",
    }));
  };

  const uploadAll = async () => {
    if (pendingFiles.value.length === 0) return;
    uploading.value = true;
    const formData = new FormData();
    pendingFiles.value.forEach((item) => {
      formData.append("files", item.file);
      formData.append("titles", item.title);
      formData.append("descriptions", item.description);
    });
    try {
      await uploadGalleryMedia(formData);
      window.$vmessage.success("上传成功");
      closeUploadModal();
      loadGallery();
    } catch (err) {
      window.$vmessage.error("上传失败");
    } finally {
      uploading.value = false;
    }
  };

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
    } catch (err) {
      item.isLiked = false;
      item.likes = originalLikes;
      const message = err.response?.data?.msg || "点赞失败";
      window.$vmessage[message.includes("已经") || message.includes("已") ? "info" : "error"](message);
    }
  };

  const openDetailModal = async (item) => {
    currentItem.value = { ...item, isLiked: false };
    try {
      await loadComments(item.id);
    } catch (err) {
      comments.value = [];
    }
  };

  const postComment = async () => {
    if (!newComment.value.trim()) return;
    try {
      await postGalleryComment({ target_id: currentItem.value.id, content: newComment.value });
      newComment.value = "";
      await loadComments(currentItem.value.id);
      currentItem.value.commentCount = (currentItem.value.commentCount || 0) + 1;
    } catch (err) {
      window.$vmessage.error("评论失败");
    }
  };

  const displayGender = (sex) => {
    const value = sex?.toString().toLowerCase().trim();
    if (["male", "m"].includes(value)) return "男";
    if (["female", "f"].includes(value)) return "女";
    if (["secret", "s", "other"].includes(value)) return "其他/秘密";
    return "未设置～";
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

  const formatDate = (date) => new Date(date).toLocaleString("zh-CN");
  const formatShortDate = (date) => new Date(date).toLocaleDateString("zh-CN");

  onMounted(loadGallery);
  onBeforeUnmount(() => {
    stopResize();
    resetPendingFiles();
  });
  return {
    authStore, page, limit, total, totalPages, galleryList, showUploadModal, pendingFiles, uploading,
    currentItem, comments, newComment, showUserProfile, selectedUser, likeComment, openUserProfile,
    closeDetail, changePage, changeLimit, openUploadModal, closeUploadModal, handleFiles, uploadAll, toggleLike, openDetailModal,
    postComment, displayGender, startResize, formatDate, formatShortDate,
  };
}
