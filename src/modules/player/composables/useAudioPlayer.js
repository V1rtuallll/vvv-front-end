import { nextTick, onMounted, ref } from "vue";

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

export function useAudioPlayer() {
  const audioEl = ref(null);
  const playPauseBtn = ref(null);
  const prevBtn = ref(null);
  const nextBtn = ref(null);
  const progressBar = ref(null);
  const volumeSlider = ref(null);
  const trackName = ref(null);
  const volumeDisplay = ref(null);

  onMounted(async () => {
    await nextTick();
    const audio = audioEl.value;
    const playButton = playPauseBtn.value;
    const previousButton = prevBtn.value;
    const nextButton = nextBtn.value;
    const progress = progressBar.value;
    const volume = volumeSlider.value;
    const trackNameElement = trackName.value;
    const volumeDisplayElement = volumeDisplay.value;
    const shuffledPlaylist = [...playlist].sort(() => Math.random() - 0.5);
    let currentIndex = 0;

    audio.volume = 0.3;
    const formatTrackName = (filename) => {
      const name = filename.replace(".mp3", "");
      const dashIndex = name.lastIndexOf(" - ");
      return dashIndex !== -1 ? name.substring(dashIndex + 3).trim() : name.replace(/_/g, " ").trim();
    };
    const loadSong = (index) => {
      currentIndex = index;
      audio.src = `/music/${shuffledPlaylist[index]}`;
      trackNameElement.textContent = formatTrackName(shuffledPlaylist[index]);
      progress.value = 0;
      playButton.textContent = "▶";
    };
    const playSong = () => {
      audio.play().catch((error) => console.warn("播放失败～", error));
      playButton.textContent = "■";
    };
    const switchSong = (direction, autoPlay = false) => {
      currentIndex = (currentIndex + direction + shuffledPlaylist.length) % shuffledPlaylist.length;
      loadSong(currentIndex);
      if (autoPlay) playSong();
    };
    const updateProgress = () => {
      if (audio.duration && !Number.isNaN(audio.duration)) {
        progress.value = (audio.currentTime / audio.duration) * 100;
      }
    };
    const updateVolumeDisplay = () => {
      const volumePercent = Math.round(audio.volume * 100);
      volumeDisplayElement.textContent = `Volume: ${volumePercent}%`;
      volume.valueAsNumber = volumePercent;
    };

    playButton.addEventListener("click", () => {
      if (audio.paused) playSong();
      else {
        audio.pause();
        playButton.textContent = "▶";
      }
    });
    previousButton.addEventListener("click", () => switchSong(-1, true));
    nextButton.addEventListener("click", () => switchSong(1, true));
    audio.addEventListener("ended", () => switchSong(1, true));
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    progress.addEventListener("click", (event) => {
      if (!audio.duration) return;
      const rect = progress.getBoundingClientRect();
      audio.currentTime = ((event.clientX - rect.left) / rect.width) * audio.duration;
    });
    volume.addEventListener("input", (event) => {
      audio.volume = Math.max(0, Math.min(1, event.target.valueAsNumber / 100));
      updateVolumeDisplay();
    });
    updateVolumeDisplay();
    loadSong(0);
  });

  return { audioEl, playPauseBtn, prevBtn, nextBtn, progressBar, volumeSlider, trackName, volumeDisplay };
}
