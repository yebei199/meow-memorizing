import axios from 'axios';
import { MATCHER_COLD, onMessage } from '@/src/core/messaging';
import { ensureMatcher } from '@/src/wasm/matcherLoader';

export default defineBackground({
  // Set manifest options
  persistent: true,
  main() {
    onMessage(
      'trans',
      async (message: { data: { word: string } }) => {
        const queryWord = message.data.word;
        try {
          const response = await axios.get(
            `https://cn.bing.com/dict/clientsearch?mkt=zh-CN&setLang=zh&form=BDVEHC&ClientVer=BDDTV3.5.1.4320&q=${queryWord}`,
            { responseType: 'text' }, // 添加 responseType 选项
          );
          return await response.data; // 现在 response.data 的类型是 string
        } catch (error) {
          console.error('Axios Error:', error);
          throw error;
        }
      },
    );

    // The WASM matcher runs here, not in the content script: host-page CSPs
    // still block `new WebAssembly.Module` in the content-script isolated
    // world, and the extension worker must explicitly opt into
    // `wasm-unsafe-eval` via MV3 `content_security_policy`.
    //
    // This MV3 worker is ephemeral — Chrome recycles it after ~30s idle, wiping
    // the matcher automata. The content script caches "already synced" state
    // that outlives the worker, so after a restart it would skip re-sending the
    // words and every find would hit an empty matcher (highlighting silently
    // dies until a full page reload). `wordsSynced` resets to false whenever a
    // fresh worker re-evaluates this module, so a find that arrives before the
    // words were (re)pushed reports MATCHER_COLD instead of a bogus empty match,
    // letting the facade re-sync and retry. Empty is distinct from cold: a user
    // with no active words still sends matcherSetWords([], []) first.
    let wordsSynced = false;
    onMessage('matcherSetWords', ({ data }) => {
      ensureMatcher().setWords(data.active, data.deleted);
      wordsSynced = true;
    });
    onMessage('matcherFindMatches', ({ data }) => {
      if (!wordsSynced) throw new Error(MATCHER_COLD);
      return ensureMatcher().findMatches(data.text);
    });
    onMessage('matcherFindDeleted', ({ data }) => {
      if (!wordsSynced) throw new Error(MATCHER_COLD);
      return ensureMatcher().findDeletedMatches(data.text);
    });
  },
});
