import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { isOwner } from "@/shared/auth/owner";
import { useAuthStore } from "@/stores/auth";
import { updatePassword, updateProfile, updateUsername, uploadAvatar } from "@/modules/user/api/userApi";
import { formatDate } from "@/utils/DateUtil";

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
      window.$vmessage.success(res.msg || "头像已更换～");
    } catch (err) {
      window.$vmessage.error(err.response?.data?.msg || "上传失败～");
    }
  };

  const saveUsername = async () => {
    if (!editUsername.value.trim()) return window.$vmessage.warning("用户名不能为空哦～");
    try {
      const res = await updateUsername(editUsername.value);
      await authStore.fetchUserInfo();
      window.$vmessage.success(res.msg || "用户名已变更～");
    } catch (err) {
      window.$vmessage.error(err.response?.data?.msg || "修改失败～可能已被占用？");
    }
  };

  const updateGender = async () => saveProfile({ sex: editGender.value }, "性别已更新～");
  const updateDescription = async () => saveProfile({ description: editDescription.value }, "个人描述已更新～");
  const saveProfile = async (payload, message) => {
    try {
      await updateProfile(payload);
      await authStore.fetchUserInfo();
      window.$vmessage.success(message);
    } catch (err) {
      window.$vmessage.error(err.response?.data?.msg || "修改失败～");
    }
  };

  const savePassword = async () => {
    if (!newPassword.value) return window.$vmessage.info("密码留空就不改了～");
    try {
      const res = await updatePassword(newPassword.value);
      newPassword.value = "";
      window.$vmessage.success(res.msg || "密码已安全更新～");
    } catch (err) {
      window.$vmessage.error(err.response?.data?.msg || "修改失败～");
    }
  };

  const handleLogout = () => {
    authStore.logout();
    window.$vmessage.info("已安全离开～");
    router.push("/home");
  };

  const displayGender = (sex) => {
    const value = sex?.toString().toLowerCase().trim();
    if (["male", "m"].includes(value)) return "男";
    if (["female", "f"].includes(value)) return "女";
    if (["other", "secret", "s"].includes(value)) return "其他/秘密";
    return "未设置";
  };

  const isSuperAdmin = computed(() => isOwner(authStore.user));
  const goToAdmin = () => {
    router.push("/admin");
    window.$vmessage.success("欢迎回来，最特别的V1rtual酱～✞");
  };

  return {
    authStore, editUsername, editGender, editDescription, newPassword, showPreview, formatDate,
    handleAvatarUpload, updateUsername: saveUsername, updateGender, updateDescription,
    updatePassword: savePassword, handleLogout, displayGender, isSuperAdmin, goToAdmin,
  };
}
