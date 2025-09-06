import { isWebsiteDarkMode } from '@/src/wxtStore.ts'

/**
 * 检测网页是否处于暗黑模式
 * @returns boolean - true表示暗黑模式，false表示白天模式
 */
export function isDarkMode(): boolean {
  // 检查系统级别的暗黑模式设置
  if (typeof window !== 'undefined' && window.matchMedia) {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkModeMediaQuery.matches) {
      return true;
    }
  }

  // 检查网页是否有暗黑模式相关的CSS类
  const darkModeClasses = [
    'dark',
    'dark-mode',
    'darkmode',
    'night',
    'night-mode'
  ];
  
  // 检查body或html元素是否有暗黑模式类
  const body = document.body;
  const html = document.documentElement;
  
  for (const className of darkModeClasses) {
    if (body.classList.contains(className) || html.classList.contains(className)) {
      return true;
    }
  }
  
  // 检查是否有明显的暗色背景
  const bodyBgColor = window.getComputedStyle(body).backgroundColor;
  const htmlBgColor = window.getComputedStyle(html).backgroundColor;
  
  // 简单的颜色亮度检测
  const isBodyDark = isColorDark(bodyBgColor);
  const isHtmlDark = isColorDark(htmlBgColor);
  
  if (isBodyDark || isHtmlDark) {
    return true;
  }
  
  return false;
}

/**
 * 更新网站主题模式到存储
 */
export async function updateWebsiteDarkMode(): Promise<void> {
  const isDark = isDarkMode();
  await isWebsiteDarkMode.setValue(isDark);
}

/**
 * 获取当前存储的网站主题模式
 */
export async function getCurrentWebsiteDarkMode(): Promise<boolean> {
  return await isWebsiteDarkMode.getValue();
}

/**
 * 初始化网站主题模式监听器
 */
export function initThemeObserver(): void {
  // 监听系统主题变化
  if (typeof window !== 'undefined' && window.matchMedia) {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', () => {
      updateWebsiteDarkMode().catch(console.error);
    });
  }

  // 监听DOM类名变化
  const observer = new MutationObserver(() => {
    updateWebsiteDarkMode().catch(console.error);
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });
  
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });

  // 初始化时更新一次
  updateWebsiteDarkMode().catch(console.error);
}

/**
 * 判断颜色是否为暗色
 * @param color - CSS颜色值
 * @returns boolean - true表示暗色，false表示亮色
 */
function isColorDark(color: string): boolean {
  if (!color) return false;
  
  // 处理rgb格式
  if (color.startsWith('rgb')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      // 使用亮度公式计算亮度: (0.299*R + 0.587*G + 0.114*B)
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      return brightness < 0.5;
    }
  }
  
  // 处理十六进制格式
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      return brightness < 0.5;
    } else if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      return brightness < 0.5;
    }
  }
  
  // 默认返回false
  return false;
}