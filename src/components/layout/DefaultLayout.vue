<template>
  <div class="vf-layout">
    <header class="vf-header">
      <div class="header-background-custom"></div>
      <div class="header-overlay"></div>

      <div class="header-content">
        <h1 class="vf-title glitch-title">✞ V1rtual ✞</h1>
        <div class="freak-line neon-freak">
          人类数量:
          <span ref="userCountEl" class="counter-number">加载中...</span>
        </div>
        <p class="welcome-text neon-welcome">🖤 Welcome to my imagination 🖤</p>
        <div class="neon-marquee">
          <marquee behavior="scroll" direction="left" scrollamount="12">
            <span class="marquee-text">
              ⋆✩‧₊˚ 操你妈 ˚₊‧✩⋆　♱ ♱　shut　the fuck　up　❤️‍🔥🖤✞ ⋆✩‧₊˚ 操你妈
              ˚₊‧✩⋆　♱ ♱　shut　the fuck　up　❤️‍🔥🖤✞ ⋆✩‧₊˚ 操你妈 ˚₊‧✩⋆　♱
              ♱　shut　the fuck　up　❤️‍🔥🖤✞ ⋆✩‧₊˚ 操你妈 ˚₊‧✩⋆　♱ ♱　shut　the
              fuck　up　❤️‍🔥🖤✞ ⋆✩‧₊˚ 操你妈 ˚₊‧✩⋆　♱ ♱　shut　the fuck　up　❤️‍🔥🖤✞
            </span>
          </marquee>
        </div>
      </div>
    </header>

    <div class="vf-container">
      <aside class="sidebar left">
        <nav class="vf-nav">
          <router-link to="/home" class="nav-link">Home</router-link>
          <router-link to="/profile" class="nav-link">Profile</router-link>
          <router-link to="/blog" class="nav-link">Blogs</router-link>
          <router-link to="/gallery" class="nav-link">Gallery</router-link>
          <router-link to="/tool" class="nav-link">Tools</router-link>
          <!-- <router-link to="/login" class="nav-link">Login</router-link> -->
        </nav>
      </aside>

      <main class="vf-main">
        <router-view class="page-content" />
      </main>

      <aside class="sidebar right">
        <div class="music-player">
          <h3>Now Playing</h3>
          <span ref="trackName" class="track-name">Loading...</span>

          <progress ref="progressBar" value="0" max="100"></progress>

          <div class="player-controls">
            <button ref="playPauseBtn">▶</button>

            <div class="prev-next-controls">
              <button ref="prevBtn">◀◀</button>
              <button ref="nextBtn">▶▶</button>
            </div>

            <div class="volume-control">
              <input
                type="range"
                ref="volumeSlider"
                min="0"
                max="100"
                value="50"
                step="1"
              />
              <div ref="volumeDisplay" class="volume-display">Volume: 50%</div>
            </div>
          </div>

          <audio ref="audioEl" preload="auto"></audio>
        </div>

        <h3>Blogs</h3>
        <ul class="top-list">
          <li>1. DarkAngel</li>
          <li>2. BloodRose</li>
        </ul>
        <h3>Imgs</h3>
        <div class="friends-grid">
          <img src="/stickers/skull1.gif" alt="sticker" />
          <img src="/stickers/heart2.gif" alt="sticker" />
        </div>
      </aside>
    </div>

    <footer class="neon-footer">
      <div class="footer-marquee-container">
        <div class="footer-marquee-text">
          ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨
          ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨
          ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨
          ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨ ✨ V1rtual ✨
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { onMounted, ref, nextTick } from "vue";
import request from "@/utils/request";

const userCountEl = ref(null);

const playlist = [
  "3tries - In My Restless Dreams.mp3",
  "aak3 - dissociated.mp3",
  "aak3 _ Softboy7 - false promises (feat_ Softboy7).mp3",
  "CactusTeam _ MixAndMash - flutterbies (feat_ MixAndMash).mp3",
  "Exodia - 825 hp.mp3",
  "Glitchtrode _ pLasterbrain - Nimbasa CORE (glitchtrode Remix).mp3",
  "Iwakura - farlands.mp3",
  "Iwakura - Hatred.mp3",
  "Iwakura - ∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰∰.mp3",
  "musicarchives_mp3 _ Sewerslvt - Ryona (feat_ Sewerslvt).mp3",
  "musicarchives_mp3 _ Yabujin - gnome - ✞ (swineantarctica) (feat_ Yabujin).mp3",
  "Nuvfr - Pink flame.mp3",
  "RFM Beats - 3 minute.mp3",
  "Sewerslvt - Lexapro Delirium.mp3",
  "Sewerslvt - Mr_ Kill Myself.mp3",
  "Sewerslvt - Swinging in His Cell (Explicit).mp3",
];

const shuffledPlaylist = [...playlist].sort(() => Math.random() - 0.5);
let currentIndex = 0;

const audioEl = ref(null);
const playPauseBtn = ref(null);
const prevBtn = ref(null);
const nextBtn = ref(null);
const progressBar = ref(null);
const volumeSlider = ref(null);
const trackName = ref(null);
const volumeDisplay = ref(null);

onMounted(async () => {
  try {
    const res = await request.get("/user/count");
    if (userCountEl.value) {
      const count = res.data;
      userCountEl.value.textContent = count;
    } else {
      console.warn("userCountEl 未绑定");
    }
  } catch (e) {
    console.error("获取人数失败:", e);
    if (userCountEl.value) {
      userCountEl.value.textContent = "???";
    }
  }
  await nextTick(); // 确保所有ref已绑定
  const audio = audioEl.value;
  const playBtn = playPauseBtn.value;
  const prev = prevBtn.value;
  const next = nextBtn.value;
  const progress = progressBar.value;
  const volume = volumeSlider.value;
  const trackNameEl = trackName.value;
  const volDisplay = volumeDisplay.value;

  audio.volume = 0.3; // 初始音量30%

  const formatTrackName = (filename) => {
    let name = filename.replace(".mp3", "");
    const dashIndex = name.lastIndexOf(" - ");
    if (dashIndex !== -1) {
      return name.substring(dashIndex + 3).trim();
    }
    return name.replace(/_/g, " ").trim();
  };

  const loadSong = (index) => {
    currentIndex = index;
    audio.src = `/music/${shuffledPlaylist[index]}`;
    trackNameEl.textContent = formatTrackName(shuffledPlaylist[index]);
    progress.value = 0;
    playBtn.textContent = "▶";
  };

  //  抽一个小函数：安全播放（很工程）
  const playSong = () => {
    audio.play().catch((e) => console.warn("播放失败～", e));
    playBtn.textContent = "■";
  };

  const togglePlay = () => {
    if (audio.paused) {
      playSong();
    } else {
      audio.pause();
      playBtn.textContent = "▶";
    }
  };
  playBtn.addEventListener("click", togglePlay);

  //  切歌函数：支持是否自动播放
  const switchSong = (direction, autoPlay = false) => {
    currentIndex =
      (currentIndex + direction + shuffledPlaylist.length) %
      shuffledPlaylist.length;
    loadSong(currentIndex);

    if (autoPlay) {
      playSong();
    } else {
      playBtn.textContent = "▶";
    }
  };

  // 点击上一首 / 下一首：自动播放
  prev.addEventListener("click", () => switchSong(-1, true));
  next.addEventListener("click", () => switchSong(1, true));

  //  歌曲放完：自动下一首 + 自动播放
  audio.addEventListener("ended", () => {
    switchSong(1, true);
  });

  //  进度条
  const updateProgress = () => {
    if (audio.duration && !isNaN(audio.duration)) {
      progress.value = (audio.currentTime / audio.duration) * 100;
    }
  };
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("loadedmetadata", updateProgress);

  progress.addEventListener("click", (e) => {
    if (!audio.duration) return;
    const rect = progress.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    audio.currentTime = percentage * audio.duration;
  });
  // 音量滑条
  const updateVolumeDisplay = () => {
    const volPercent = Math.round(audio.volume * 100);
    volDisplay.textContent = `Volume: ${volPercent}%`;
    volume.valueAsNumber = volPercent;
  };
  updateVolumeDisplay();

  volume.addEventListener("input", (e) => {
    const newVolume = e.target.valueAsNumber / 100;
    audio.volume = Math.max(0, Math.min(1, newVolume));
    updateVolumeDisplay();
  });

  // 初始加载第一首歌，但不播放
  loadSong(0);
});
</script>
<style scoped>
/* 先引入一个更emo的字体～可选，但超级配你的风格！（加到<style>最上面） */
@import url("https://fonts.googleapis.com/css2?family=Orbitron:wght@900|Rajdhani:wght@700|Monoton&display=swap");
/* 全局无白边保持不变 */
:global(body),
:global(html),
:global(#app) {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  background: #000;
}
/* 新版高级霓虹glitch标题～ */
.glitch-title {
  font-size: 6rem; /* 稍大一点，更霸气～可调 */
  font-family: "Monoton", "Orbitron", cursive; /* 推荐Monoton！超级vaporwave neon感～或者换Orbitron更cyber */
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  position: relative;
  color: #fff; /* 基础白，更清晰 */
  background: linear-gradient(90deg, #ff00ff, #00ffff, #ff69b4, #ff00ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  /* 核心：多层深glow，像真灯管层层发光～ */
  text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px #ff00ff, 0 0 40px #ff00ff,
    0 0 60px #ff00ff, 0 0 80px #ff00ff, 0 0 100px #00ffff, 0 0 120px #00ffff;

  /* 高级glitch：用伪元素做粉青分离层～ */
  animation: glitch-main 3s infinite ease-in-out,
    neon-flicker 4s infinite ease-in-out;
}
.glitch-title::before,
.glitch-title::after {
  content: "✞ V1rtual ✞";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(90deg, #ff00ff, #00ffff, #ff69b4, #ff00ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.glitch-title::before {
  left: 2px;
  text-shadow: -2px 0 #ff00ff;
  clip: rect(0, 900px, 0, 0);
  animation: glitch-1 2.5s infinite linear alternate-reverse;
}

.glitch-title::after {
  left: -2px;
  text-shadow: 2px 0 #00ffff;
  clip: rect(0, 900px, 0, 0);
  animation: glitch-2 3s infinite linear alternate-reverse;
}

@keyframes glitch-1 {
  0%,
  100% {
    clip: rect(0, 9999px, 0, 0);
    transform: translate(0);
  }
  20% {
    clip: rect(20px, 9999px, 80px, 0);
    transform: translate(-5px, 5px);
  }
  40% {
    clip: rect(60px, 9999px, 120px, 0);
    transform: translate(5px, -5px);
  }
  60% {
    clip: rect(100px, 9999px, 160px, 0);
    transform: translate(-5px, 0);
  }
  80% {
    clip: rect(40px, 9999px, 100px, 0);
    transform: translate(5px, 5px);
  }
}

@keyframes glitch-2 {
  0%,
  100% {
    clip: rect(0, 9999px, 0, 0);
    transform: translate(0);
  }
  25% {
    clip: rect(50px, 9999px, 110px, 0);
    transform: translate(3px, -3px);
  }
  50% {
    clip: rect(90px, 9999px, 150px, 0);
    transform: translate(-3px, 3px);
  }
  75% {
    clip: rect(10px, 9999px, 70px, 0);
    transform: translate(3px, 0);
  }
}
.neon-freak {
  font-size: 1.8rem;
  font-weight: bold;
  letter-spacing: 0.1em;
  margin: 20px 0;
  color: #ff69b4;
  text-shadow: 0 0 5px #ff00ff, 0 0 10px #ff00ff, 0 0 20px #ff00ff,
    0 0 30px #ff1493, 0 0 40px #ff69b4;

  animation: neon-flicker 2s infinite ease-in-out, subtle-glitch 6s infinite;
}
.neon-freak img {
  filter: drop-shadow(0 0 10px #ff00ff);
  vertical-align: middle;
}

.neon-welcome {
  font-size: 2rem;
  font-family: "Rajdhani", "Courier New", monospace;
  font-weight: 700;
  letter-spacing: 0.15em;
  margin: 15px 0;
  background: linear-gradient(90deg, #00ffff, #9370db, #ff69b4, #00ffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  text-shadow: 0 0 5px #00ffff, 0 0 15px #00ffff, 0 0 25px #9370db,
    0 0 35px #9370db, 0 0 50px #ff69b4;

  animation: neon-flicker 5s infinite ease-in-out;
}
@keyframes glitch-main {
  0% {
    transform: translate(0);
  }
  20% {
    transform: translate(-2px, 2px);
  }
  40% {
    transform: translate(-2px, -2px);
  }
  60% {
    transform: translate(2px, 2px);
  }
  80% {
    transform: translate(2px, -2px);
  }
  100% {
    transform: translate(0);
  }
}
.neon-marquee {
  margin-top: -10px;
  padding: 16px 0;
  overflow: hidden;
  position: relative;

  background: rgba(0, 0, 0, 0.7);

  box-shadow: 0 0 6px rgba(255, 0, 255, 0.35), 0 0 12px rgba(255, 0, 255, 0.3),
    0 0 18px rgba(0, 255, 255, 0.25), 0 0 24px rgba(0, 255, 255, 0.2),
    inset 0 0 10px rgba(255, 0, 255, 0.25),
    inset 0 0 20px rgba(0, 255, 255, 0.22),
    inset 0 0 30px rgba(147, 112, 219, 0.2);

  animation: gentle-glow-breath 12s infinite ease-in-out;
}

@keyframes gentle-glow-breath {
  0%,
  100% {
    box-shadow: 0 0 6px rgba(255, 0, 255, 0.35), 0 0 12px rgba(255, 0, 255, 0.3),
      0 0 18px rgba(0, 255, 255, 0.25), 0 0 24px rgba(0, 255, 255, 0.2),
      inset 0 0 10px rgba(255, 0, 255, 0.25),
      inset 0 0 20px rgba(0, 255, 255, 0.22),
      inset 0 0 30px rgba(147, 112, 219, 0.2);
  }
  50% {
    box-shadow: 0 0 9px rgba(255, 0, 255, 0.45), 0 0 16px rgba(255, 0, 255, 0.4),
      0 0 24px rgba(0, 255, 255, 0.35), 0 0 30px rgba(0, 255, 255, 0.3),
      inset 0 0 14px rgba(255, 0, 255, 0.35),
      inset 0 0 28px rgba(0, 255, 255, 0.32),
      inset 0 0 40px rgba(147, 112, 219, 0.3);
  }
}
@keyframes marquee-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
.marquee-text {
  font-size: 1.4rem;
  font-weight: bold;
  letter-spacing: 0.15em;
  background: linear-gradient(
    90deg,
    #ff00ff,
    #ff69b4,
    #00ffff,
    #ff00ff,
    #ff69b4
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 5px #ff00ff, 0 0 10px #ff00ff, 0 0 20px #ff00ff,
    0 0 5px #00ffff, 0 0 15px #00ffff;

  /* 让文字偶尔轻微闪烁，像老霓虹灯一样可爱～ */
  animation: neon-flicker 3s infinite ease-in-out, subtle-glitch 8s infinite;
}

/* 复用你已有的neon-flicker，再加一个超级轻的glitch */
@keyframes subtle-glitch {
  0%,
  100% {
    transform: translate(0);
  }
  20% {
    transform: translate(-2px, 2px);
  }
  40% {
    transform: translate(-2px, -2px);
  }
  60% {
    transform: translate(2px, 2px);
  }
  80% {
    transform: translate(2px, -2px);
  }
}
/* 新增霓虹微微闪烁动画（温柔不刺眼～） */
@keyframes neon-flicker {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.95;
  }
  80% {
    opacity: 0.98;
  }
}

/* 原glitch动画稍改，让它更乱更emo～ */
@keyframes glitch {
  0% {
    text-shadow: 0.05em 0 0 #ff00ff, -0.05em -0.025em 0 #00ffff;
    transform: translate(0);
  }
  15% {
    text-shadow: 0.05em 0.05em 0 #ff00ff, -0.05em -0.05em 0 #00ffff;
    transform: translate(-0.05em, -0.05em);
  }
  30% {
    text-shadow: -0.05em -0.05em 0 #ff00ff, 0.05em 0.05em 0 #00ffff;
    transform: translate(0.05em, 0.05em);
  }
  100% {
    text-shadow: 0.05em 0 0 #ff00ff, -0.05em -0.025em 0 #00ffff;
    transform: translate(0);
  }
}
/* ✨ 核心：你自定义的背景图片层 ✨ 
   把 /jpgs/your-header-bg.jpg 换成你想用的任何图片路径！
   支持本地、线上URL、GIF都行～ */
.header-background-custom {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("/stickers/loop6.gif") repeat top left / auto;
  /* 自动平铺！不管图片多大多小，都会重复填充～最稳了 */
  opacity: 1; /* 可调透明度，0.6~1.0 都好看 */
  z-index: 1;
}
/* 柔光遮罩层，让文字更清晰（温柔的深色半透明） */
/* .header-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(10, 0, 20, 0.6) 50%,
    rgba(0, 0, 0, 0.9) 100%
  );
  z-index: 2;
} */
/* 内容层在最上面，文字不被盖住～ */
.header-content {
  position: relative;
  z-index: 3;
}
/* 新布局 */
.vf-layout {
  min-height: 100vh;
  background: #000; /* 底保纯黑 */
  color: #fff;
  font-family: "Courier New", monospace;
  position: relative; /* 让背景层相对它 */
}
/* 新布局：直接在根元素加背景，无论什么图片都自动平铺～最稳最通用！ */
.vf-layout {
  min-height: 100vh;
  height: 100vh;
  width: 100vw;
  background: url("/stickers/loop7.gif") repeat fixed top left / auto,
    /* 自动平铺，无论图片大小/是否无缝，都会重复填充 */ #000; /* 兜底纯黑，图片加载慢时不露白 */
  background-size: auto; /* 保持原图案比例，自动重复 */
  color: #fff;
  font-family: "Courier New", monospace;
  position: relative;
  overflow-x: hidden;
}
.vf-header {
  position: relative;
  height: 300px;
  overflow: hidden;
  text-align: center;
}

.vf-title {
  font-size: 5rem;
  margin: 0;
}
.freak-count {
  font-size: 1.5rem;
  margin: 20px 0;
}
.freak-count img {
  vertical-align: middle;
}

.vf-container {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  gap: 30px;
  padding: 30px;
}

.sidebar {
  background: black;
  border: 4px double #ff00ff;
  padding: 20px;
  border-radius: 15px;
}

.vf-main {
  background: rgba(10, 0, 20, 0.85); /* 深紫黑半透明，和sidebar统一深度 */
  border-radius: 20px;
  padding: 40px; /* 温柔内边距，让子页面有呼吸空间 */
  position: relative;
  overflow: hidden;
  min-height: 60vh; /* 保证有足够高度，却不强制 */

  /* 多层粉青外辉 + 内辉，像月光轻轻环抱 */
  box-shadow: 0 0 10px rgba(255, 0, 255, 0.4), 0 0 20px rgba(255, 0, 255, 0.3),
    0 0 30px rgba(0, 255, 255, 0.25), 0 0 45px rgba(255, 105, 180, 0.2),
    inset 0 0 20px rgba(255, 0, 255, 0.15);

  /* 超级温柔的呼吸光 + 偶尔小glitch，像在低语“欢迎回家” */
  animation: sidebar-glow-breath 10s infinite ease-in-out,
    subtle-sidebar-glitch 12s infinite ease-in-out;
}

/* 其他样式（nav-link, glitch 等保持你的原版） */
.neon-text {
  text-shadow: 0 0 10px currentColor;
}
.nav-link {
  display: block;
  padding: 10px;
  color: #ff69b4;
  text-decoration: none;
  text-shadow: 0 0 5px #ff1493;
  transition: all 0.3s;
}

.nav-link:hover {
  color: #00ffff;
  text-shadow: 0 0 15px #00ffff;
  transform: scale(1.1);
}

.main-content {
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid #9370db;
  padding: 30px;
  min-height: 600px;
  box-shadow: 0 0 20px #ff00ff inset;
}

.footer {
  text-align: center;
  padding: 30px;
  background: #111;
  border-top: 3px dashed #ff1493;
}

/* ==== 左右边栏大升级：霓虹高级版 ==== */
/* 先给两个sidebar统一的基础美化 */
.sidebar {
  background: rgba(10, 0, 20, 0.85); /* 深紫黑半透明，更有深度感～ */
  border-radius: 20px; /* 圆角更大一点，柔软又未来 */
  padding: 25px;
  position: relative;
  overflow: hidden; /* 重要！让内部glow不溢出 */

  /* 多层霓虹外发光，像真正的灯管环绕～ */
  box-shadow: 0 0 10px rgba(255, 0, 255, 0.4), 0 0 20px rgba(255, 0, 255, 0.3),
    0 0 30px rgba(0, 255, 255, 0.25), 0 0 45px rgba(255, 105, 180, 0.2),
    inset 0 0 20px rgba(255, 0, 255, 0.15); /* 内glow，让里面也亮起来 */

  /* 呼吸动画：超级温柔的心跳光晕～ */
  animation: sidebar-glow-breath 10s infinite ease-in-out;

  /* 轻微glitch抖动，只有偶尔一瞬，像老电视在撒娇～ */
  animation: sidebar-glow-breath 10s infinite ease-in-out,
    subtle-sidebar-glitch 8s infinite ease-in-out;
}

/* 让左右边栏的标题（h3）也霓虹起来～ */
.sidebar h3 {
  font-family: "Orbitron", "Rajdhani", sans-serif;
  font-size: 1.6rem;
  text-align: center;
  margin: 0 0 20px 0;
  color: #ff69b4;
  letter-spacing: 0.15em;
  text-transform: uppercase;

  background: linear-gradient(90deg, #ff00ff, #00ffff, #ff69b4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  text-shadow: 0 0 5px #ff00ff, 0 0 15px #ff00ff, 0 0 25px #00ffff;

  animation: neon-flicker 4s infinite ease-in-out;
}

/* 导航链接更炫～ */
.left .nav-link {
  display: block;
  padding: 12px 15px;
  margin: 8px 0;
  border-radius: 10px;
  text-align: center;
  font-weight: bold;
  letter-spacing: 0.1em;

  background: rgba(255, 0, 255, 0.1);
  border: 1px solid rgba(255, 0, 255, 0.3);
  box-shadow: 0 0 10px rgba(255, 0, 255, 0.2);

  transition: all 0.4s ease;
}

.left .nav-link:hover {
  background: rgba(255, 0, 255, 0.25);
  color: #00ffff !important;
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 0 20px rgba(255, 0, 255, 0.6), 0 0 30px rgba(0, 255, 255, 0.4);
  text-shadow: 0 0 15px #00ffff;
}

/* 右侧Top列表也美化一下～ */
.right .top-list {
  list-style: none;
  padding: 0;
  margin: 0 0 30px 0;
}

.right .top-list li {
  padding: 10px;
  margin: 6px 0;
  border-radius: 8px;
  background: rgba(0, 255, 255, 0.08);
  border-left: 4px solid #00ffff;
  text-shadow: 0 0 5px #00ffff;
  transition: all 0.3s;
}

.right .top-list li:hover {
  background: rgba(0, 255, 255, 0.2);
  border-left-color: #ff00ff;
  transform: translateX(8px);
}

/* Stamps & Stickers 网格更可爱～ */
.friends-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 15px;
}

.friends-grid img {
  width: 100%;
  border-radius: 10px;
  border: 2px solid #ff69b4;
  box-shadow: 0 0 15px rgba(255, 105, 180, 0.6);
  transition: all 0.4s;
  animation: neon-flicker 5s infinite ease-in-out;
}

.friends-grid img:hover {
  transform: scale(1.15) rotate(5deg);
  box-shadow: 0 0 25px rgba(255, 0, 255, 0.9);
  z-index: 10;
}

/* ==== 新增动画钥匙 ==== */
/* 边栏呼吸光（超级温柔～） */
@keyframes sidebar-glow-breath {
  0%,
  100% {
    box-shadow: 0 0 10px rgba(255, 0, 255, 0.4), 0 0 20px rgba(255, 0, 255, 0.3),
      0 0 30px rgba(0, 255, 255, 0.25), 0 0 45px rgba(255, 105, 180, 0.2),
      inset 0 0 20px rgba(255, 0, 255, 0.15);
  }
  50% {
    box-shadow: 0 0 15px rgba(255, 0, 255, 0.55),
      0 0 30px rgba(255, 0, 255, 0.45), 0 0 45px rgba(0, 255, 255, 0.4),
      0 0 60px rgba(255, 105, 180, 0.35), inset 0 0 30px rgba(255, 0, 255, 0.25);
  }
}

/* 超级轻的边栏glitch，只有偶尔闪一下～ */
@keyframes subtle-sidebar-glitch {
  0%,
  90%,
  100% {
    transform: translate(0);
  }
  92% {
    transform: translate(-2px, 2px);
  }
  94% {
    transform: translate(2px, -2px);
  }
  96% {
    transform: translate(-1px, -1px);
  }
}
/* ==== 中间内容区大升级：统一霓虹家族风 ==== */
/* 主内容区 - 和sidebar同款高级感～ */
.vf-main {
  background: rgba(10, 0, 20, 0.85); /* 深紫黑半透明，统一深度 */
  border-radius: 20px; /* 和sidebar一样大圆角，更柔软 */
  padding: 30px;
  position: relative;
  overflow: hidden; /* 让glow不溢出 */

  /* 多层霓虹外辉 + 内辉，像被灯管温柔环抱 */
  box-shadow: 0 0 10px rgba(255, 0, 255, 0.4), 0 0 20px rgba(255, 0, 255, 0.3),
    0 0 30px rgba(0, 255, 255, 0.25), 0 0 45px rgba(255, 105, 180, 0.2),
    inset 0 0 20px rgba(255, 0, 255, 0.15);

  /* 温柔呼吸 + 超级偶尔的小glitch */
  animation: sidebar-glow-breath 10s infinite ease-in-out;
  /* subtle-sidebar-glitch 8s infinite ease-in-out; */
}

/* Featured网格里的小盒子也升级～ */
.featured-box {
  background: rgba(20, 0, 40, 0.7); /* 稍深一点，层次感 */
  border: 2px dashed rgba(255, 105, 180, 0.6);
  border-radius: 15px;
  padding: 40px;
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: #ff69b4;
  text-shadow: 0 0 10px #ff1493;

  /* 小glow + hover浮起 */
  box-shadow: 0 0 15px rgba(255, 0, 255, 0.2);
  transition: all 0.4s ease;
}

.featured-box:hover {
  transform: translateY(-8px) scale(1.03);
  border-color: #00ffff;
  box-shadow: 0 0 25px rgba(255, 0, 255, 0.6), 0 0 40px rgba(0, 255, 255, 0.4);
  color: #00ffff;
  text-shadow: 0 0 15px #00ffff;
}

/* 子页面内容：完美居中、自适应、继承一点温柔辉光 */
.page-content {
  width: 100%;
  max-width: 900px; /* 可选：限制最大宽度，更优雅阅读～删掉就满幅 */
  margin: 0 auto;
  color: #fff;
  font-family: "Courier New", monospace;
  line-height: 1.8;
  /* 可选：让子页面文字也沾点霓虹味～ */
  text-shadow: 0 0 5px rgba(255, 105, 180, 0.3);
}
/* ==== 复用动画（如果你之前没加过sidebar的动画，这里补上） ==== */
@keyframes sidebar-glow-breath {
  0%,
  100% {
    box-shadow: 0 0 10px rgba(255, 0, 255, 0.4), 0 0 20px rgba(255, 0, 255, 0.3),
      0 0 30px rgba(0, 255, 255, 0.25), 0 0 45px rgba(255, 105, 180, 0.2),
      inset 0 0 20px rgba(255, 0, 255, 0.15);
  }
  50% {
    box-shadow: 0 0 15px rgba(255, 0, 255, 0.55),
      0 0 30px rgba(255, 0, 255, 0.45), 0 0 45px rgba(0, 255, 255, 0.4),
      0 0 60px rgba(255, 105, 180, 0.35), inset 0 0 30px rgba(255, 0, 255, 0.25);
  }
}

@keyframes subtle-sidebar-glitch {
  0%,
  90%,
  100% {
    transform: translate(0);
  }
  92% {
    transform: translate(-2px, 2px);
  }
  94% {
    transform: translate(2px, -2px);
  }
  96% {
    transform: translate(-1px, -1px);
  }
}
/* ==== 页脚：和header滚动条完全统一的粉青霓虹版 ==== */
.neon-footer {
  background: #000;
  padding: 20px 0;
  margin-top: 40px;
  overflow: hidden;
  position: relative;

  /* 和neon-marquee一样的温柔呼吸glow */
  box-shadow: 0 0 6px rgba(255, 0, 255, 0.35), 0 0 12px rgba(255, 0, 255, 0.3),
    0 0 18px rgba(0, 255, 255, 0.25), 0 0 24px rgba(0, 255, 255, 0.2),
    inset 0 0 10px rgba(255, 0, 255, 0.25),
    inset 0 0 20px rgba(0, 255, 255, 0.22),
    inset 0 0 30px rgba(147, 112, 219, 0.2);
  animation: gentle-glow-breath 12s infinite ease-in-out;
}

.footer-marquee-container {
  width: 100%;
  overflow: hidden;
  position: relative;
}

.footer-marquee-text {
  display: inline-block;
  white-space: nowrap;
  font-size: 1.4rem;
  font-weight: bold;
  letter-spacing: 0.15em;
  background: linear-gradient(
    90deg,
    #ff00ff,
    #ff69b4,
    #00ffff,
    #ff00ff,
    #ff69b4
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 5px #ff00ff, 0 0 10px #ff00ff, 0 0 20px #ff00ff,
    0 0 5px #00ffff, 0 0 15px #00ffff;
  animation: neon-flicker 3s infinite ease-in-out, subtle-glitch 8s infinite,
    footer-marquee-scroll 40s linear infinite; /* 40s一圈，更慢更深情～ */
}

/* 关键：无缝滚动核心动画（平移50%，完美衔接） */
@keyframes footer-marquee-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

/* ==== 音乐播放器：柔和琥珀黄CRT终端终极版 ==== */
/*
.music-player {
  background: #000;
  border-radius: 12px;
  padding: 18px 14px;
  margin-bottom: 30px;
  text-align: center;
  position: relative;
  overflow: hidden;
  width: 100%;


  box-shadow: 0 0 6px #ffb000, 0 0 12px #ffb000, 0 0 20px #ffb000,
    0 0 35px rgba(255, 176, 0, 0.5), inset 0 0 25px rgba(255, 176, 0, 0.12),
    inset 0 0 50px rgba(255, 176, 0, 0.06);
  animation: crt-breath 12s infinite ease-in-out;
}
*/

/* .music-player::before {
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 176, 0, 0.025),
    rgba(255, 176, 0, 0.025) 2px,
    transparent 2px,
    transparent 4px
  );
  animation: scanline-move 20s linear infinite;
} */

/* .music-player::after {
  opacity: 0.08;
}

.music-player h3 {
  color: #ffb000;
  font-size: 1.6rem;
  letter-spacing: 0.3em;
  margin: 0 0 20px 0;
  text-shadow: 0 0 10px #ffb000, 0 0 20px #ffb000, 0 0 35px #ffb000;
  animation: crt-flicker 5s infinite ease-in-out;
}

.track-name {
  color: #ffb000;
  font-size: 1.4rem;
  letter-spacing: 0.25em;
  margin: 18px 0 22px 0;
  text-shadow: 0 0 10px #ffb000, 0 0 20px #ffb000, 0 0 35px #ffb000;
  animation: crt-flicker 7s infinite ease-in-out;
}

.progress-container {
  height: 14px;
  background: rgba(255, 176, 0, 0.12);
  box-shadow: inset 0 0 12px rgba(255, 176, 0, 0.25);
}

.progress-bar {
  box-shadow: 0 0 12px #ffb000, 0 0 25px #ffb000;
}

.player-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  margin-top: 20px;
  z-index: 3;
}

#play-pause-btn {
  width: 160px;
  height: 56px;
  font-size: 1.8rem;
}

.prev-next-controls {
  display: flex;
  justify-content: center;
  gap: 20px;
  width: 160px;
}

#prev-btn,
#next-btn {
  width: 80px;
  height: 52px;
  font-size: 1.6rem;
}

.player-controls button {
  background: none;
  border: 2.5px solid #ffb000;
  color: #ffb000;
  width: 52px;
  height: 52px;
  border-radius: 10px;
  font-size: 1.6rem;
  font-weight: bold;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  text-shadow: 0 0 10px #ffb000, 0 0 18px #ffb000;
  box-shadow: 0 0 10px #ffb000, inset 0 0 10px rgba(255, 176, 0, 0.25);
  transition: all 0.4s ease;
  margin: 0 10px;
  padding: 0;
}

.player-controls button:hover {
  background: rgba(255, 176, 0, 0.12);
  transform: scale(1.08);
  box-shadow: 0 0 20px #ffb000, 0 0 35px #ffb000,
    inset 0 0 18px rgba(255, 176, 0, 0.45);
  animation: crt-pulse 1.8s infinite;
}

@keyframes crt-breath {
  0%,
  100% {
    box-shadow: 0 0 6px #ffb000, 0 0 12px #ffb000, 0 0 20px #ffb000,
      0 0 35px rgba(255, 176, 0, 0.5), inset 0 0 25px rgba(255, 176, 0, 0.12),
      inset 0 0 50px rgba(255, 176, 0, 0.06);
  }
  50% {
    box-shadow: 0 0 9px #ffb000, 0 0 18px #ffb000, 0 0 30px #ffb000,
      0 0 50px rgba(255, 176, 0, 0.7), inset 0 0 35px rgba(255, 176, 0, 0.18),
      inset 0 0 70px rgba(255, 176, 0, 0.1);
  }
}

.track-name {
  color: #ffb000;
  font-family: "Orbitron", monospace;
  font-size: 1.25rem;
  font-weight: bold;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin: 18px 10px 22px;
  padding: 0 10px;
  max-width: 100%;
  word-break: break-all;
  white-space: normal;
  line-height: 1.4;
  text-shadow: 0 0 10px #ffb000, 0 0 20px #ffb000, 0 0 35px #ffb000;
  animation: crt-flicker 7s infinite ease-in-out;
  z-index: 3;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
} */

/* .prev-next-volume {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  width: 220px;
}

#volume-down,
#volume-up {
  width: 40px;
  height: 40px;
  font-size: 1.4rem;
}

#progress-bar {
  width: 100%;
  height: 14px;
  margin: 20px 0;
  border-radius: 7px;
  background: rgba(255, 176, 0, 0.12);
  box-shadow: inset 0 0 12px rgba(255, 176, 0, 0.25);
  appearance: none;
  overflow: hidden;
}

#progress-bar::-webkit-progress-bar {
  background: transparent;
}

#progress-bar::-webkit-progress-value {
  background: linear-gradient(90deg, #ffb000, #ffdd00);
  border-radius: 7px;
  box-shadow: 0 0 12px #ffb000, 0 0 25px #ffb000;
  transition: width 0.3s ease;
}

#progress-bar::-moz-progress-bar {
  background: linear-gradient(90deg, #ffb000, #ffdd00);
  border-radius: 7px;
  box-shadow: 0 0 12px #ffb000;
}

.volume-display {
  margin-top: 10px;
  color: #ffb000;
  font-family: "Orbitron", monospace;
  font-size: 1rem;
  letter-spacing: 0.15em;
  text-shadow: 0 0 8px #ffb000;
}

.volume-control {
  margin-top: 18px;
  width: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

#volume-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 12px;
  background: rgba(255, 176, 0, 0.12);
  border-radius: 6px;
  outline: none;
  box-shadow: inset 0 0 10px rgba(255, 176, 0, 0.2);
}

#volume-slider::-webkit-slider-runnable-track {
  height: 12px;
  border-radius: 6px;
  background: transparent;
}

#volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background: #ffb000;
  cursor: pointer;
  box-shadow: 0 0 15px #ffb000, 0 0 25px #ffb000;
  margin-top: -6px;
}

#volume-slider::-moz-range-track {
  height: 12px;
  border-radius: 6px;
  background: transparent;
}

#volume-slider::-moz-range-thumb {
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background: #ffb000;
  border: none;
  box-shadow: 0 0 15px #ffb000;
  cursor: pointer;
}

#volume-slider::-webkit-slider-runnable-track {
  background: linear-gradient(
    90deg,
    #ffb000 0%,
    #ffb000 var(--value, 50%),
    transparent var(--value, 50%)
  );
  background-size: 100% 100%;
}

.volume-display {
  color: #ffb000;
  font-family: "Orbitron", monospace;
  font-size: 1rem;
  letter-spacing: 0.15em;
  text-shadow: 0 0 8px #ffb000;
}
#volume-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 12px;
  background: rgba(255, 176, 0, 0.12);
  border-radius: 6px;
  outline: none;
  box-shadow: inset 0 0 10px rgba(255, 176, 0, 0.2);
} */
/*CRT音乐播放器结束 */

/* ==== 极致音乐播放器开始 ==== */
.music-player {
  background: linear-gradient(180deg, #0a0a0a 0%, #000 100%);
  padding: 26px 14px 30px 14px;
  margin: 0 auto 30px auto;
  text-align: center;
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 200px;
  display: block;
  font-family: "Orbitron", "Cinzel", "Almendra", serif;
  isolation: isolate;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.25), 0 12px 40px rgba(0, 0, 0, 0.9);
}

/* 外层：彻底去掉标题方框边发光，只留整体城堡微光（不影响标题）～ */
.music-player::before {
  content: "";
  position: absolute;
  inset: 0; /* 不外扩，避免任何边框光晕～ */
  background: transparent;
  border: none; /* 完全去掉双线边框发光～ */
  box-shadow: none; /* 去掉所有边框glow，让它与黑融为一体～ */
  clip-path: none;
  z-index: -2;
}

/* 内层：保留荆棘纹路 + 柔和冷白裂隙（整体氛围不丢～） */
.music-player::after {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(255, 255, 255, 0.04) 10px,
      rgba(255, 255, 255, 0.04) 20px
    ),
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 12px,
      rgba(255, 255, 255, 0.03) 12px,
      rgba(255, 255, 255, 0.03) 24px
    );
  opacity: 0.7;
  pointer-events: none;
  mix-blend-mode: overlay;
  animation: gothic-thorn 20s linear infinite;
}

/* 标题：彻底与黑色融为一体，只剩纯净冷白发光文字～像黑暗中自然浮现的祷词 */
.music-player h3 {
  color: #fff;
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 0.45em;
  margin: 0 0 28px 0;
  text-transform: uppercase;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.9),
    /* 最柔内层光晕～ */ 0 0 10px rgba(255, 255, 255, 0.7),
    0 0 16px rgba(255, 255, 255, 0.5), 0 0 24px rgba(255, 255, 255, 0.3); /* 渐弱外层，无任何边框痕迹～ */
  animation: white-halo 16s infinite ease-in-out;
}

/* 歌曲名：回到“之前那种”～只靠发光边缘自然形成隐形“边框感”，无实体框、无黑底～ */
.track-name {
  color: #fff;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin: 20px 8px 30px;
  padding: 8px 12px; /* 轻微内边距，让光晕有空间“勾勒”～ */
  line-height: 1.4;
  text-shadow: 0 0 6px rgba(255, 255, 255, 1),
    /* 内层最亮，形成“隐形边框”核心～ */ 0 0 12px rgba(255, 255, 255, 0.8),
    0 0 20px rgba(255, 255, 255, 0.6), 0 0 30px rgba(255, 255, 255, 0.4); /* 外层渐弱光晕，自然形成柔和边缘～ */
  animation: white-halo 16s infinite ease-in-out;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
/* 进度条：冷白纯粹光束～ */
progress {
  width: 100%;
  height: 10px;
  margin: 20px 0 32px 0;
  background: #111;
  border: none;
  box-shadow: inset 0 0 12px #000, 0 0 10px rgba(255, 255, 255, 0.2);
}

progress::-webkit-progress-value {
  background: linear-gradient(90deg, #ddd, #fff, #ddd);
  box-shadow: 0 0 12px #fff, 0 0 30px rgba(255, 255, 255, 0.6);
}

progress::-moz-progress-bar {
  background: linear-gradient(90deg, #ddd, #fff, #ddd);
  box-shadow: 0 0 12px #fff;
}

/* 按钮区：三个按钮同一行 + 大小彻底统一（补偿◄◄原始窄问题）～ */
.player-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-top: 10px;
}

.prev-next-controls {
  display: flex;
  gap: 28px;
  justify-content: center;
  align-items: center;
}

/* 按钮：*/
.player-controls button {
  background: transparent;
  border: none !important;
  color: #fff;
  width: 60px; /* 统一宽度～ */
  height: 60px; /* 统一高度～ */
  border-radius: 50%;
  font-size: 1.8rem; /* 统一字体大小～ */
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  text-shadow: 0 0 12px #fff, 0 0 24px #fff, 0 0 36px rgba(255, 255, 255, 0.8);
  box-shadow: none;
  transition: all 0.4s ease;
}

/* hover效果～ */
.player-controls button:hover {
  transform: scale(1.2) translateY(-4px);
  text-shadow: 0 0 24px #fff, 0 0 48px #fff, 0 0 72px #fff;
  animation: symbol-glow 1.8s infinite;
}

/* 音量区：和进度条完全一样～外观、发光、thumb全同步～超级稳定无bug～ */
.volume-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 10px; /* 和进度条高度完全一致～ */
  background: #111; /* 轨道底色一致～ */
  border: none;
  box-shadow: inset 0 0 12px #000, 0 0 10px rgba(255, 255, 255, 0.2); /* 外glow完全一致～ */
  outline: none;
  margin: 20px 0 0 0; /* 间距也参考进度条～ */
}

/* thumb：和进度条价值部分发光完全一致～纯白渐变圆润～ */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  background: linear-gradient(90deg, #ddd, #fff, #ddd);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 12px #fff, 0 0 30px rgba(255, 255, 255, 0.6);
}

input[type="range"]::-moz-range-thumb {
  width: 24px;
  height: 24px;
  background: linear-gradient(90deg, #ddd, #fff, #ddd);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 12px #fff, 0 0 30px rgba(255, 255, 255, 0.6);
}

/* 填充轨道（WebKit）：已填满部分和进度条价值一致～ */
input[type="range"]::-webkit-slider-runnable-track {
  background: #111;
  box-shadow: inset 0 0 12px #000;
}

.volume-display {
  color: #ddd;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-shadow: 0 0 6px #fff;
}
/* ==== 纯粹发光动画 ==== */
@keyframes symbol-glow {
  0%,
  100% {
    text-shadow: 0 0 24px #fff, 0 0 48px #fff, 0 0 72px #fff;
  }
  50% {
    text-shadow: 0 0 36px #fff, 0 0 72px #fff, 0 0 108px #fff;
  }
}

@keyframes white-halo {
  0%,
  100% {
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.9),
      0 0 10px rgba(255, 255, 255, 0.7), 0 0 16px rgba(255, 255, 255, 0.5),
      0 0 24px rgba(255, 255, 255, 0.3);
  }
  50% {
    text-shadow: 0 0 7px rgba(255, 255, 255, 1),
      0 0 14px rgba(255, 255, 255, 0.8), 0 0 22px rgba(255, 255, 255, 0.6),
      0 0 32px rgba(255, 255, 255, 0.4);
  }
}

@keyframes gothic-thorn {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 20px 20px;
  }
}
/* ==== 极致音乐播放器结束 ==== */
</style>