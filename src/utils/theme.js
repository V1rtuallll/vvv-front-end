/**
 * 主题模式切换工具函数
 */

// 主题模式类型
export const THEME_MODE = {
  LIGHT: 'light',
  DARK: 'dark',
};

/**
 * 设置主题模式
 * @param {string} mode - 主题模式，可选值: 'light' | 'dark'
 */
export const setThemeMode = (mode) => {
  try {
    // 将主题模式保存到localStorage中
    localStorage.setItem('theme-mode', mode);
    // 设置HTML根元素的theme-mode属性
    document.documentElement.setAttribute('theme-mode', mode);
    // console.log('主题模式已设置为:', mode);
  } catch (error) {
    console.error('设置主题模式失败:', error);
  }
};

/**
 * 获取当前主题模式
 * @returns {string} 当前主题模式
 */
export const getThemeMode = () => {
  try {
    // 优先从localStorage中获取
    const savedMode = localStorage.getItem('theme-mode');
    
    if (savedMode && (savedMode === THEME_MODE.LIGHT || savedMode === THEME_MODE.DARK)) {
    //   console.log('从localStorage读取主题模式:', savedMode);
      return savedMode;
    }
    
    // 如果localStorage中没有，则从HTML根元素的属性中获取
    const htmlMode = document.documentElement.getAttribute('theme-mode');
    if (htmlMode && (htmlMode === THEME_MODE.LIGHT || htmlMode === THEME_MODE.DARK)) {
    //   console.log('从HTML属性读取主题模式:', htmlMode);
      return htmlMode;
    }
    
    // 如果HTML属性也没有设置，则返回默认的亮色模式
    // console.log('使用默认主题模式:', THEME_MODE.LIGHT);
    return THEME_MODE.LIGHT;
  } catch (error) {
    console.error('获取主题模式失败:', error);
    return THEME_MODE.LIGHT;
  }
};

/**
 * 切换主题模式
 * 如果当前是亮色模式，则切换到暗色模式；反之亦然
 */
export const toggleThemeMode = () => {
  const currentMode = getThemeMode();
  const newMode = currentMode === THEME_MODE.LIGHT ? THEME_MODE.DARK : THEME_MODE.LIGHT;
  setThemeMode(newMode);
  return newMode;
}; 