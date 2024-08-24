import { getWordsList } from '@/entrypoints/trans.content/script/storageAction.ts'
import type {
  IAllWordsStorage,
  IWordStorage,
} from '@/src/wxtStore.ts'
import type { TableColumnsType } from 'antd'
import { Space, Table, Tag } from 'antd'
import type { TableProps } from 'antd'
import { useEffect } from 'react'

export const VocabularyBook = () => {
  console.log('VocabularyBook')
  const defaultWords: IAllWordsStorage = {}

  const [words, setWords] =
    useState<IAllWordsStorage>(defaultWords)

  useEffect(() => {
    async function fetchWords() {
      try {
        const words1 = await getWordsList()
        if (words1) {
          setWords(words1)
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchWords().catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setWords])

  return (
    <div>
      <Sheet wordsList={words} />
    </div>
  )
}

function Sheet({
  wordsList,
}: { wordsList: IAllWordsStorage }) {
  const [showWords, setShowWords] = useState<IShowWord[]>(
    [],
  )
  console.log('wordsList', wordsList)
  useEffect(() => {
    const showWords1 = Object.keys(wordsList).map((i) => {
      return {
        key: i,
        word: wordsList[i].word,
        queryTimes: wordsList[i].queryTimes,
        deleteTimes: wordsList[i].deleteTimes,
      }
    })
    setShowWords(showWords1)
  }, [wordsList, setShowWords])

  return (
    <div>
      <Table
        columns={columns}
        dataSource={showWords}
        pagination={{ pageSize: 5 }}
        className={'custom-row-10'}
        rowClassName='h-0.01'
      />
    </div>
  )
}

export interface IShowWord {
  key: string
  word: string
  queryTimes: number
  deleteTimes: number
}

/**
 * ant table 单词列表的列接口
 */
export interface IColumn {
  title: string
  dataIndex: string
  key: string
  width?: number
}

const columns: TableColumnsType<IShowWord> = [
  {
    title: '单词',
    width: 10,

    dataIndex: 'word',
    key: 'word',
  },
  {
    title: '查询次数',
    width: 60,
    dataIndex: 'queryTimes',
    key: 'queryTimes',
  },
  {
    title: '删除次数',
    width: 60,
    dataIndex: 'deleteTimes',
    key: 'deleteTimes',
  },
]
