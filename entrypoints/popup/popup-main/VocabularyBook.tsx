import type {
  IALlWordsStorage,
  IWordStorage,
} from '@/src/wxtStore.ts'

export const VocabularyBook = () => {
  const [words, setWords] = useState<IWordStorage[]>([])
  return (
    <div>
      <h2>Vocabulary Book</h2>
      <p>这是啥</p>
    </div>
  )
}

function Sheet({
  wordsList,
}: { wordsList: IALlWordsStorage }) {
  return <div>{}</div>
}

const columns = [
  {
    title: '单词',
    dataIndex: 'word',
    key: 'word',
  },
  {
    title: '查询次数',
    dataIndex: 'queryTimes',
    key: 'queryTimes',
  },
  {
    title: '删除次数',
    dataIndex: 'address',
    key: 'address',
  },
]
