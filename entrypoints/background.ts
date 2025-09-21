import { onMessage } from '@/src/core/messaging'
import axios from 'axios'

export default defineBackground({
  // Set manifest options
  persistent: true,
  main() {
    onMessage(
      'trans',
      async (message: { data: { word: string } }) => {
        const queryWord = message.data.word
        try {
          const response = await axios.get(
            `https://cn.bing.com/dict/clientsearch?mkt=zh-CN&setLang=zh&form=BDVEHC&ClientVer=BDDTV3.5.1.4320&q=${queryWord}`,
            { responseType: 'text' }, // 添加 responseType 选项
          )
          return await response.data // 现在 response.data 的类型是 string
        } catch (error) {
          console.error('Axios Error:', error)
          throw error
        }
      },
    )
  },
})