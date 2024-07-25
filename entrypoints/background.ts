import axios from 'axios'
import { onMessage } from '@/src/wxtMessaging.ts'

export default defineBackground({
  // Set manifest options
  persistent: true,
  main() {
    onMessage('trans', async message => {
      return await getData(message.data.word)
    })
  },
})
async function getData(queryWord: string): Promise<any> {
  try {
    const response = await axios.get(
      `https://cn.bing.com/dict/clientsearch?mkt=zh-CN&setLang=zh&form=BDVEHC&ClientVer=BDDTV3.5.1.4320&q=${queryWord}`
    )
    return response.data // 假设这是您从 axios.get 得到的 HTML 字符串
  } catch (error) {
    console.error('Axios Error:', error)
    throw error
  }
}
