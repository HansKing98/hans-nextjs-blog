/**
 * +--------------------------------------------------------------------------+
 * | [INPUT]: 依赖 Next.js Image 组件与本地展示图片、公司介绍文案
 * | [OUTPUT]: 对外提供 Xiaohongshu 首页展示组件
 * | [POS]: 首页内容展示区，负责渲染公司介绍与图片卡片网格
 * | [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * +--------------------------------------------------------------------------+
 */
'use client'

import Image from 'next/image'

const WaterfallItem = ({ imgUrl, text }) => {
  return (
    <div className="flex flex-col gap-4">
      <Image src={imgUrl} alt={text} width={640} height={480} />
      <span>{text}</span>
    </div>
  )
}

const imgList = [
  '/static/images/logo.png',
  '/static/images/twitter-card.jpg',
  '/static/images/hansking-hansking-hansking.png',
]
const textList = [
  'Acornaware',
  '北京橡识科技有限公司',
  'Acornaware 北京橡识科技有限公司位于顺义区后沙峪镇环普科技产业园，专注于 Agent App 的出海业务',
]

const Xiaohongshu = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-[64px] items-center justify-center py-3 text-xl font-bold">
        Acornaware，北京橡识科技有限公司
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3, 4].map((index) => (
          <WaterfallItem
            key={index}
            imgUrl={imgList[index % imgList.length]}
            text={textList[index % textList.length]}
          />
        ))}
      </div>
    </div>
  )
}

export default Xiaohongshu
