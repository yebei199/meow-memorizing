import classNames from 'classnames'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { sendMessage } from '@/src/wxtMessaging.ts'
import {
  addWordLocal,
  getWordsList,
  queryWord,
} from './storageAction.ts'
import { IWordStorage } from '@/src/wxtStore.ts'
import ergodicWords from '@/entrypoints/trans.content/script/ergodicWords.tsx'

/*
 * @description 对于每个单词的翻译准备以及鼠标悬停时显示额外内容的组件
 * @param word 单词
 * @example <TransLine word={'hello'} />
 */
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

/*
 * @description 组合悬停前和后两个组件,逻辑是鼠标悬停时显示额外内容,
 * 当鼠标离开的时候悬停组件卸载,这样性能更好
 * @param word 单词
 * @example <T2 word={'hello'} />
 *
 */
function T2({ word }: { word: string }) {
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }
  return (
    <span
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        color: 'black',
      }}
    >
      <span
        className={classNames(
          'font-mono rounded-sm',
          'text-center border bg-yellow-100 text-black border-black',
          'hover:bg-amber '
        )}
      >
        {word}
      </span>
      {isHovered && <HoverTooltip word={word} />}
    </span>
  )
}

export interface IWordQuery {
  word: string
}

/*
 * @description 鼠标悬停时显示额外内容
 * 逻辑是先发送消息到后台,然后后台返回html片段,最后将html片段渲染出来
 * @param word 单词
 * @example <HoverTooltip word={'hello'} />
 */
function HoverTooltip({ word }: { word: string }) {
  const word3 = word
  const [wordLocalInfoOuter, setWordLocalInfoOuter] =
    useState<IWordStorage>()
  const [dataEnd, setDataEnd] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      const wordLocalInfo = await queryWord(word3)
      if (wordLocalInfo) {
        wordLocalInfo.queryTimes += 1
        setWordLocalInfoOuter(wordLocalInfo)
        await addWordLocal(wordLocalInfo)
      }
      const word: IWordQuery = { word: word3 }
      try {
        const htmlString = await sendMessage('trans', word)
        const element = parseBingDict(htmlString)
        setDataEnd(element)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData().catch(console.error)

    return () => {}
  }, [])

  async function deleteWord() {
    if (wordLocalInfoOuter) {
      // 复制对象以避免直接修改状态
      const updatedWordInfo = {
        ...wordLocalInfoOuter,
        isDeleted: true,
      }
      await addWordLocal(updatedWordInfo) // 假设这个函数会更新服务器或本地存储
      setWordLocalInfoOuter(updatedWordInfo) // 更新组件状态
      await ergodicWords()
    }
  }
  return (
    <div className=" pos-absolute  z-200">
      <div
        className={classNames(
          'border-( radius-12 ) font-mono',
          'w-90 h-auto ',
          'rounded-lg backdrop-blur-5 bg-blue-300/55 p-4'
        )}
      >
        {/* 这里是悬停时显示的额外内容 */}
        <h2 className="text-center">{word}</h2>

        <hr className={'bg-blue-7'} />
        <p className="break-words">{dataEnd}</p>

        <hr className={'bg-blue-7'} />
        <span>
          查询次数:
          <p className="inline break-words">
            {wordLocalInfoOuter?.queryTimes}
          </p>
          <br />
          <button
            className={' bg-blue-200/55 rounded-sm'}
            onClick={deleteWord}
          >
            删除
          </button>
        </span>
      </div>
    </div>
  )
}

/*
 * 解析html字符串
 */
function parseBingDict(htmlString: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(
    htmlString,
    'text/html'
  )

  const element = doc
    .querySelector('#clientnewword')
    ?.getAttribute('data-definition')

  if (!element) {
    return '没找到'
  }

  return element
}
