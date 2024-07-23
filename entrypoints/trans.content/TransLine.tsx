import classNames from 'classnames'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { sendMessage } from '@/src/messaging.ts'

export default function TransLine({
  word,
}: {
  word: string
}) {
  return (
    <div className={'inline'}>
      <T2 word={word} />
    </div>
  )
}

function T2({ word }: { word: string }) {
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }
  return (
    <>
      <span
        className={classNames(
          'font-mono bg-blue-200/80 z--1 ',
          'underline underline-purple underline-auto',
          'text-center ',
          'hover:bg-amber'
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {word}
      </span>
      {isHovered && <HoverTooltip word={word} />}
    </>
  )
}

export interface IWordQuery {
  word: string
}
/*
 * 鼠标悬停时显示额外内容
 */
function HoverTooltip({ word }: { word: string }) {
  const word3 = word
  const [dataEnd, setDataEnd] = useState<string>('')
  useEffect(() => {
    async function fetchData() {
      const word: IWordQuery = { word: word3 }
      try {
        const htmlString = await sendMessage('trans', word)

        const parser = new DOMParser()
        const doc = parser.parseFromString(
          htmlString,
          'text/html'
        )

        const element = doc
          .querySelector('#clientnewword')
          ?.getAttribute('data-definition')

        // 如果找到了元素，则返回其内部 HTML 或其他您感兴趣的信息
        if (element) {
          // 注意：这里只是返回元素的内部 HTML，但您可能想要提取其他属性或文本内容
          setDataEnd(element)
        } else {
          setDataEnd('没找到')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData().catch(error => {
      console.error('Error:', error)
    })
  }, [word])
  return (
    <div className="h-500 pos-absolute  z-200">
      <div
        className={classNames(
          'border-( radius-12 ) ',
          'w-60 h-auto',
          // 'justify-center ',
          'rounded-lg backdrop-blur-5 bg-blue-300/50 p-4'
        )}
      >
        {/* 这里是悬停时显示的额外内容 */}
        <h1 className="text-center">{word}</h1>
        <hr className={'bg-blue-7'} />
        <p className="break-words">{dataEnd}</p>
      </div>
    </div>
  )
}

async function getData(): Promise<any> {
  try {
    const response = await axios.get(
      'https://cn.bing.com/dict/clientsearch?mkt=zh-CN&setLang=zh&form=BDVEHC&ClientVer=BDDTV3.5.1.4320&q=hell'
    )
    return response.data
  } catch (error) {
    console.error('Axios Error:', error)
    throw error
  }
}
