<template>
  <div class="crt-profile-wrapper">
    <div class="crt-screen">
      <div class="crt-scanlines"></div>

      <div class="crt-content">
        <h2 class="crt-title">
          {{ authStore.user?.username || "?" }}
        </h2>

        <!-- 头像 -->
        <div class="avatar-section">
          <img
            :src="authStore.user?.avatar || '/default-avatar.gif'"
            alt="头像"
            class="crt-avatar"
            @click="$refs.avatarInput.click()"
          />
          <input
            ref="avatarInput"
            type="file"
            accept="image/*"
            @change="handleAvatarUpload"
            hidden
          />
          <p class="avatar-tip">
            <br />点击更换头像<br />Click to change your avatar
          </p>
        </div>

        <!-- 信息表单 -->
        <div class="info-form">
          <div class="field-group">
            <label>Username</label>
            <input
              v-model="editUsername"
              class="crt-input"
              placeholder="新用户名"
            />
            <button @click="updateUsername" class="crt-mini-btn">Submit</button>
          </div>

          <div class="field-group">
            <label>Gender</label>
            <select v-model="editGender" class="crt-input">
              <option value="MALE">男</option>
              <option value="FEMALE">女</option>
              <option value="SECRET">其他/秘密</option>
            </select>
            <p class="current-gender-tip">
              当前：{{ displayGender(authStore.user?.sex) }}
            </p>
            <button @click="updateGender" class="crt-mini-btn">Submit</button>
          </div>

          <div class="field-group">
            <label>Description</label>
            <textarea
              v-model="editDescription"
              class="crt-textarea"
              placeholder="说点什么关于你自己～"
            ></textarea>
            <button @click="updateDescription" class="crt-mini-btn">
              Submit
            </button>
          </div>

          <div class="field-group">
            <label>Create time</label>
            <p class="create-time">
              {{ formatDate(authStore.user || {}) }}
            </p>
          </div>

          <div class="field-group">
            <label>New password</label>
            <input
              v-model="newPassword"
              type="password"
              class="crt-input"
              placeholder="留空不修改"
            />
            <button @click="updatePassword" class="crt-mini-btn">Submit</button>
          </div>

          <button @click="handleLogout" class="crt-btn logout-btn">
            <span class="btn-text">Log out</span>
          </button>
          <br />
          <button @click="showPreview = true" class="crt-preview-btn">
            ✦ 预览效果 ✦
          </button>
          <button
            v-if="isSuperAdmin"
            @click="goToAdmin"
            class="crt-mini-btn admin-secret-btn"
          >
            ✦ 进入管理员界面 ✦
          </button>
        </div>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <transition name="preview">
      <div
        v-if="showPreview"
        class="crt-preview-modal"
        @click.self="showPreview = false"
      >
        <div class="crt-preview-content">
          <h3 class="crt-preview-title">当前效果预览</h3>

          <div class="preview-avatar">
            <img
              :src="authStore.user?.avatar || '/default-avatar.gif'"
              alt="头像预览"
              class="preview-avatar-img"
            />
          </div>

          <p class="preview-username">
            用户名：{{ authStore.user?.username || "？" }}
          </p>
          <p class="preview-info">
            性别：{{ displayGender(authStore.user?.sex) }}
          </p>
          <p class="preview-info">
            描述：{{ authStore.user?.description || "未设置" }}
          </p>
          <p class="preview-info">
            创建时间：{{ formatDate(authStore.user || {}) }}
          </p>
          <button
            @click="showPreview = false"
            class="crt-mini-btn preview-close-btn"
          >
            关闭
          </button>
          <p class="preview-tip">❤️</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { useProfile } from "@/modules/user/composables/useProfile";

const {
  authStore, editUsername, editGender, editDescription, newPassword, showPreview, formatDate,
  handleAvatarUpload, updateUsername, updateGender, updateDescription, updatePassword, handleLogout,
  displayGender, isSuperAdmin, goToAdmin,
} = useProfile();
</script>

<style src="./index.css" scoped></style>