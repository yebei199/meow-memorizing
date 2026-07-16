import axios from 'axios';
import { onMessage } from '@/src/core/messaging';
import { getWordsList, myWords } from '@/src/core/storageManager';
import { activeWords } from '@/src/core/wordSets';
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
    // The MV3 worker is ephemeral — Chrome recycles it after ~30s idle, wiping
    // the automata. So the worker OWNS its word set instead of being fed by the
    // content script: it reads the words from storage on cold start and rebuilds
    // whenever they change. `ready` memoizes the cold-start load so the first
    // find awaits it and never sees an empty matcher. This removes the class of
    // bug where a content-script "already synced" cache outlived the worker (see
    // docs/adr/0002-worker-owns-word-set.md).
    let ready: Promise<void> | null = null;

    const rebuild = (list: IAllWordsStorageOrNull): void => {
      ensureMatcher().setWords(activeWords(list ?? {}));
    };

    const ensureWordsLoaded = (): Promise<void> => {
      if (!ready) {
        ready = getWordsList().then(rebuild);
      }
      return ready;
    };

    // Rebuild live while the worker is awake; storage changes don't wake a
    // sleeping worker, but the next find will cold-load fresh words anyway.
    myWords.watch((list) => {
      rebuild(list);
      ready = Promise.resolve();
    });

    onMessage('matcherFindMatches', async ({ data }) => {
      await ensureWordsLoaded();
      return ensureMatcher().findMatches(data.text);
    });
  },
});

// Local alias: myWords.watch hands back the stored value or null.
type IAllWordsStorageOrNull = Awaited<
  ReturnType<typeof getWordsList>
> | null;
