import classNames from 'classnames'
import {memo, useState} from 'react'

export default function TransLine({word}: { word: string
}) {
  return (
    <div className={'inline'}>
      <T2 word={word}/>
    </div>
  )
}

function T2({word}: { word: string }) {
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
          'font-mono bg-purple-100/50 z--1 ',
          'underline underline-purple underline-auto',
          'text-center ',
          'hover:bg-amber'
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {word}
      </span>
      {isHovered && <HoverTooltip word={word}/>}
    </>
  )
}

/*
 * 鼠标悬停时显示额外内容
 */
function HoverTooltip({word}: { word: string }) {
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
        <p className="break-words">
          {word}的翻译是:{' '}
          {`nhddddddddddddddddddddddddddddddddddddddddddsns`}
        </p>
        <hr/>
        <span>你好啊</span>
      </div>
    </div>
  )
}
