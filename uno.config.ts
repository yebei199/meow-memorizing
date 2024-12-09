// uno.config.ts
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  content: {
    filesystem: [
      '**/*.{html,js,ts,jsx,tsx,vue,svelte,astro}',
    ],
  },
  layers: {
    high: 13,
    default: 1,
    utilities: 2,
  },
  presets: [presetUno()],
})
