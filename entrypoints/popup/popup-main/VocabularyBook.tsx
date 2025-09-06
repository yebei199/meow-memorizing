import { getWordsList } from '@/entrypoints/trans.content/script/storageAction.ts'
import type {
  IAllWordsStorage,
  IWordStorage,
} from '@/src/wxtStore.ts'
import type { TableColumnsType } from 'antd'
import { Input, Table } from 'antd'
import { useEffect, useState } from 'react'
import { isWebsiteDarkMode } from '@/src/wxtStore.ts'

// 提取主题配置到组件外部，避免每次渲染都重新创建
const getThemeConfig = (isDarkMode: boolean) => ({
  backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
  textColor: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  inputBorder: isDarkMode ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(0, 0, 0, 0.3)',
  inputBackground: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f5f5f5',
  inputTextColor: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
  headerBackground: isDarkMode ? '#1f1f1f' : '#ffffff',
  buttonBackground: isDarkMode ? '#000000' : '#ffffff',
  buttonHoverBackground: isDarkMode ? '#333333' : '#f0f0f0',
  buttonTextColor: isDarkMode ? '#ffffff' : '#000000', // 根据深色模式设置按钮文字颜色
  paginationItemBackground: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f5f5f5',
  paginationItemHoverBackground: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e0e0e0',
  paginationItemActiveBackground: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : '#d0d0d0',
});

// 提取样式计算函数，降低组件内部复杂度
const getContainerStyle = (themeConfig: any) => ({
  width: '100%',
  height: '100%',
  padding: '10px',
  boxSizing: 'border-box' as const,
  backgroundColor: themeConfig.backgroundColor,
  color: themeConfig.textColor,
  minHeight: '100vh'
});

const getSearchStyle = (themeConfig: any) => ({
  marginBottom: '16px',
  width: '100%',
  border: themeConfig.inputBorder,
  background: themeConfig.inputBackground,
  color: themeConfig.inputTextColor,
  borderRadius: '4px',
  outline: 'none',
  transition: 'all 0.3s ease',
});

// 添加新的样式函数
const getTableHeaderStyle = (themeConfig: any) => ({
  background: themeConfig.headerBackground,
  color: themeConfig.textColor,
});

const getTableStyle = (themeConfig: any) => ({
  width: '100%',
  backgroundColor: themeConfig.backgroundColor,
  color: themeConfig.textColor,
  border: `1px solid ${themeConfig.borderColor}`,
  boxShadow: themeConfig.boxShadow,
  borderRadius: '8px',
  overflow: 'hidden',
});

const getCellStyle = (themeConfig: any) => ({
  color: themeConfig.textColor,
  backgroundColor: themeConfig.backgroundColor,
  border: `1px solid ${themeConfig.borderColor}`,
  padding: '8px',
});

export const VocabularyBook = () => {
  // 移除 console.log 降低复杂度
  const defaultWords: IAllWordsStorage = {}

  const [words, setWords] =
    useState<IAllWordsStorage>(defaultWords)
  const [searchText, setSearchText] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)

  // 检测系统主题
  useEffect(() => {
    const checkDarkMode = async () => {
      // 从WXT存储中获取当前网站的颜色模式
      const isDark = await isWebsiteDarkMode.getValue();
      setIsDarkMode(isDark);
    };

    checkDarkMode().catch(console.error);
  }, [])

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
  }, [])

  // 使用统一的主题配置
  const themeConfig = getThemeConfig(isDarkMode);
  const containerStyle = getContainerStyle(themeConfig);
  const searchStyle = getSearchStyle(themeConfig);

  return (
    <div style={containerStyle}>
      <style>
        {`
          .theme-provider {
            color: ${themeConfig.textColor};
          }

          .theme-provider .ant-input-affix-wrapper {
            background: ${themeConfig.inputBackground} !important;
            border: ${themeConfig.inputBorder} !important;
            color: ${themeConfig.inputTextColor} !important;
          }

          .theme-provider .ant-input {
            background: ${themeConfig.inputBackground} !important;
            color: ${themeConfig.inputTextColor} !important;
            border: none !important;
          }

          .theme-provider .ant-input:focus,
          .theme-provider .ant-input-focused {
            border: none !important;
            box-shadow: none !important;
          }

          .theme-provider .ant-input-search-button {
            background: ${themeConfig.buttonBackground} !important;
            border: ${themeConfig.inputBorder} !important;
            color: ${themeConfig.buttonTextColor} !important;
            border-radius: 0 4px 4px 0 !important;
          }

          .theme-provider .ant-input-search-button:hover {
            background: ${themeConfig.buttonHoverBackground} !important;
          }

          .theme-provider .ant-table-thead > tr > th {
            background: ${themeConfig.headerBackground} !important;
            color: ${themeConfig.textColor} !important;
          }

          .theme-provider .ant-table {
            background: ${themeConfig.backgroundColor} !important;
            color: ${themeConfig.textColor} !important;
          }

          .theme-provider .ant-pagination-item {
            background: ${themeConfig.paginationItemBackground} !important;
            border: 1px solid ${themeConfig.borderColor} !important;
            border-radius: 4px !important;
          }

          .theme-provider .ant-pagination-item:hover {
            background: ${themeConfig.paginationItemHoverBackground} !important;
          }

          .theme-provider .ant-pagination-item-active {
            background: ${themeConfig.paginationItemActiveBackground} !important;
            border-color: ${themeConfig.borderColor} !important;
          }

          .theme-provider .ant-pagination-item a {
            color: ${themeConfig.textColor} !important;
          }

          .theme-provider .ant-pagination-item-active a {
            color: inherit !important;
          }

          .theme-provider .ant-pagination-prev .ant-pagination-item-link,
          .theme-provider .ant-pagination-next .ant-pagination-item-link {
            background: ${themeConfig.paginationItemBackground} !important;
            border: 1px solid ${themeConfig.borderColor} !important;
            border-radius: 4px !important;
            color: ${themeConfig.textColor} !important;
          }

          .theme-provider .ant-pagination-prev .ant-pagination-item-link:hover,
          .theme-provider .ant-pagination-next .ant-pagination-item-link:hover {
            background: ${themeConfig.paginationItemHoverBackground} !important;
          }

          .theme-provider .ant-pagination-disabled .ant-pagination-item-link {
            background: ${themeConfig.paginationItemBackground} !important;
            border: 1px solid ${themeConfig.borderColor} !important;
            opacity: 0.5;
          }

          .theme-provider .ant-pagination-options-quick-jumper input {
            background: ${themeConfig.inputBackground} !important;
            border: ${themeConfig.inputBorder} !important;
            color: ${themeConfig.inputTextColor} !important;
            border-radius: 4px !important;
          }
        `}
      </style>
      <div className="theme-provider">
        <Input.Search
          placeholder="搜索单词"
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
          style={searchStyle}
        />
        <Sheet wordsList={words} searchText={searchText} isDarkMode={isDarkMode} themeConfig={themeConfig} />
      </div>
    </div>
  )
}

// 提取处理单词列表的逻辑到单独的函数中
const processWordsList = (wordsList: IAllWordsStorage, searchText: string) => {
  return Object.keys(wordsList)
    .filter((key) =>
      wordsList[key].word.toLowerCase().includes(searchText.toLowerCase())
    )
    .map((i) => ({
      key: i,
      word: wordsList[i].word,
      queryTimes: wordsList[i].queryTimes,
      deleteTimes: wordsList[i].deleteTimes,
    }));
};

function Sheet({
  wordsList,
  searchText,
  isDarkMode,
  themeConfig
}: { wordsList: IAllWordsStorage; searchText: string; isDarkMode: boolean; themeConfig: any }) {
  const [showWords, setShowWords] = useState<IShowWord[]>([])

  useEffect(() => {
    setShowWords(processWordsList(wordsList, searchText));
  }, [wordsList, searchText])

  const tableStyle = getTableStyle(themeConfig);
  const cellStyle = getCellStyle(themeConfig);
  const headerStyle = getTableHeaderStyle(themeConfig); // 新增表头样式

  const columns: TableColumnsType<IShowWord> = [
    {
      title: '单词',
      dataIndex: 'word',
      key: 'word',
      sorter: (a, b) => a.word.localeCompare(b.word),
      onCell: () => ({
        style: cellStyle,
      }),
      onHeaderCell: () => ({
        style: headerStyle,
      }),
    },
    {
      title: '查询次数',
      dataIndex: 'queryTimes',
      key: 'queryTimes',
      sorter: (a, b) => a.queryTimes - b.queryTimes,
      onCell: () => ({
        style: cellStyle,
      }),
      onHeaderCell: () => ({
        style: headerStyle,
      }),
    },
    {
      title: '删除次数',
      dataIndex: 'deleteTimes',
      key: 'deleteTimes',
      sorter: (a, b) => a.deleteTimes - b.deleteTimes,
      onCell: () => ({
        style: cellStyle,
      }),
      onHeaderCell: () => ({
        style: headerStyle,
      }),
    },
  ]

  return (
    <div style={{ width: '100%' }}>
      <Table
        columns={columns}
        dataSource={showWords}
        pagination={{
          pageSize: 5,
          showQuickJumper: true,
          showSizeChanger: true,
          size: 'small'
        }}
        className={'custom-row-10'}
        rowClassName='h-0.01'
        style={tableStyle}
        // 添加表头样式
        components={{
          header: {
            cell: (props) => (
              <th
                {...props}
                style={{
                  ...props.style,
                  ...headerStyle,
                  fontWeight: 'bold',
                  padding: '16px 8px',
                }}
              />
            ),
          },
        }}
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
