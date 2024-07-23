import React from "react";
import  "./global.css";
import ReactDOM from "react-dom/client";
import { ContentScriptContext } from "wxt/client";
import main from "@/entrypoints/trans/mainTrans.tsx";


export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: "manifest",
  runAt: "document_end",
  async main(ctx) {
    const ui = await createUi(ctx);
    ui.mount();
    main()
  },
});

//
// Mantine doesn't work with shadow roots by default. We have to pass custom
// values for the MantineProvider's `cssVariablesSelector` and `getRootElement`
// options.
//
// We'll point both at the HTML element inside the shadow root WXT creates.
//

function createUi(ctx: ContentScriptContext) {
  return createShadowRootUi(ctx, {
    name: "mantine-example",
    position: "inline",
    append: "first",
    onMount(uiContainer, shadow) {
      // 获取该 DOM 元素
      const app = document.createElement("div");
      uiContainer.append(app);

      // Create a root on the UI container and render a component
      const root = ReactDOM.createRoot(app);
      root.render(<a className={'bg-amber text-center gb_x'}>Hello from Mantine</a>);
      return root;
    },
    onRemove(root) {
      root?.unmount();
    },
  });
}
