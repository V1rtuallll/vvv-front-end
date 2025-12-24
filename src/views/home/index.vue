<template>
  <div class="home-profile">
    <img src="/public/jpgs/rukawa.png" alt="我" class="profile-pic" />
    <!-- 放一张你的emo风照片～ -->
    <h2>我是 {{ name }}</h2>

    <div class="stamps">
      <!-- 贴纸区 -->
      <img src="../../../public/stickers/fox.gif" />
      <img src="../../../public/stickers/skate_dog.gif" />
      <img src="../../../public/stickers/stair.gif" />
    </div>
  </div>
</template>

<script setup>
const name = "V1rtual";
</script>

<style scoped>
.profile-pic {
  border: 5px solid #ff00ff;
  box-shadow: 0 0 20px #ff1493;
  border-radius: 20px;
  max-width: 300px;
}

.bio {
  font-size: 1.4rem;
  max-width: 600px;
  margin: 30px auto;
}

.stamps img {
  width: 100px;
  margin: 10px;
  animation: float 3s infinite ease-in-out;
}

@keyframes float {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
  100% {
    transform: translateY(0);
  }
}
</style>