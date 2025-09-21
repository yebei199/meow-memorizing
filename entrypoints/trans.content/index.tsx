import '@/public/global.css';
import { startTranslation } from '@/src/content-scripts/startTrans.ts';
import { initThemeObserver } from '@/src/core/themeDetector';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'manifest',
  runAt: 'document_end',
  async main() {
    // 初始化主题观察器
    initThemeObserver();

    // 启动翻译功能
    startTranslation().catch(console.error);
  },
});
