import fsExtra from 'fs-extra'

async function copyFile(src: string, dest: string) {
  try {
    await fsExtra.copy(src, dest)
  } catch (err) {
    console.error('Error copying file:', err)
  }
}
// 正确地调用copyFile函数
;(async () => {
  try {
    await copyFile(
      '.output/chrome-mv3',
      '.output/chrome-mv3-build',
    )
  } catch (err) {
    console.error('Failed to perform copy operation:', err)
  }
})()
