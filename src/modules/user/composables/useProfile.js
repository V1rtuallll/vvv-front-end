import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { isOwner } from "@/shared/auth/owner";
import { useAuthStore } from "@/stores/auth";
import { updatePassword, updateProfile, updateUsername, uploadAvatar } from "@/modules/user/api/userApi";
import { formatDate } from "@/utils/DateUtil";
import { displayGender } from "@/utils/gender";

// 发请求的方法，catch 里只做状态回滚，不弹提示：
// 请求失败时 request.js 已经弹过后端返回的 msg，这里再弹一次会出现重复提示。
export function useProfile() {
  const router = useRouter();
  const authStore = useAuthStore();
  const editUsername = ref("");
  const editGender = ref("MALE");
  const editDescription = ref("");
  const newPassword = ref("");
  const showPreview = ref(false);

  const syncForm = () => {
    editUsername.value = authStore.user?.username || "";
    editGender.value = authStore.user?.sex || "MALE";
    editDescription.value = authStore.user?.description || "";
  };

  onMounted(async () => {
    if (authStore.token && !authStore.user) await authStore.fetchUserInfo();
    syncForm();
  });

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await uploadAvatar(formData);
      await authStore.fetchUserInfo();
      window.$vmessage.success(res.msg || "头像已更新");
    } catch {
      // 提示由 request.js 负责
    }
  };

  const saveUsername = async () => {
    if (!editUsername.value.trim()) return window.$vmessage.warning("用户名不能为空");
    try {
      const res = await updateUsername(editUsername.value);
      if (res.data) authStore.token = res.data;
      await authStore.fetchUserInfo();
      window.$vmessage.success(res.msg || "用户名已更新");
    } catch {
      // 提示由 request.js 负责
    }
  };

  const updateGender = async () => saveProfile({ sex: editGender.value }, "性别已更新");
  const updateDescription = async () => saveProfile({ description: editDescription.value }, "个人描述已更新");
  const saveProfile = async (payload, message) => {
    try {
      await updateProfile(payload);
      await authStore.fetchUserInfo();
      window.$vmessage.success(message);
    } catch {
      // 提示由 request.js 负责
    }
  };

  const savePassword = async () => {
    if (!newPassword.value) return window.$vmessage.info("密码留空则不修改");
    try {
      const res = await updatePassword(newPassword.value);
      newPassword.value = "";
      window.$vmessage.success(res.msg || "密码已更新");
    } catch {
      // 提示由 request.js 负责
    }
  };

  const handleLogout = () => {
    authStore.logout();
    window.$vmessage.info("已退出登录");
    router.push("/home");
  };

  const isSuperAdmin = computed(() => isOwner(authStore.user));
  const goToAdmin = () => {
    router.push("/admin");
    window.$vmessage.success("欢迎回来，管理员");
  };

  return {
    authStore, editUsername, editGender, editDescription, newPassword, showPreview, formatDate,
    handleAvatarUpload, updateUsername: saveUsername, updateGender, updateDescription,
    updatePassword: savePassword, handleLogout, displayGender, isSuperAdmin, goToAdmin,
  };
}
