'use client'

import React, { useEffect, useState, useRef } from 'react'

interface WaterfallItemData {
  id: number
  title: string
  description: string
  images: Array<{ src: string; alt: string }>
  prompt?: string
}

interface WaterfallProps {
  items: WaterfallItemData[]
  renderItem: (props: { data: WaterfallItemData; index: number; width: number }) => React.ReactNode
  columnCount?: number
  columnGap?: number
  className?: string
}

export const Waterfall: React.FC<WaterfallProps> = ({
  items,
  renderItem,
  columnCount = 3,
  columnGap = 16,
  className = '',
}) => {
  const [columns, setColumns] = useState<WaterfallItemData[][]>([])
  const [currentColumnCount, setCurrentColumnCount] = useState(columnCount)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // 调整列数并更新容器宽度
  useEffect(() => {
    const updateLayout = () => {
      if (!containerRef.current) return

      setContainerWidth(containerRef.current.offsetWidth)

      let newColumnCount = columnCount
      // 根据屏幕宽度调整列数
      if (window.innerWidth < 640) {
        newColumnCount = 1
      } else if (window.innerWidth < 768) {
        newColumnCount = 2
      }

      setCurrentColumnCount(newColumnCount)
    }

    // 初始加载时更新一次
    updateLayout()

    // 监听窗口大小变化
    window.addEventListener('resize', updateLayout)

    return () => {
      window.removeEventListener('resize', updateLayout)
    }
  }, [columnCount])

  // 分配项目到各列
  useEffect(() => {
    if (items.length === 0 || currentColumnCount === 0 || containerWidth === 0) return

    const newColumns: WaterfallItemData[][] = Array.from({ length: currentColumnCount }, () => [])

    items.forEach((item) => {
      // 找出当前高度最小的列
      const minHeightColumnIndex = newColumns
        .map((col) => col.reduce((sum, _item) => sum + 1, 0))
        .reduce(
          (minIndex, height, index, heights) => (height < heights[minIndex] ? index : minIndex),
          0
        )

      // 将项目添加到该列
      newColumns[minHeightColumnIndex] = [...newColumns[minHeightColumnIndex], item]
    })

    setColumns(newColumns)
  }, [items, currentColumnCount, containerWidth])

  // 计算每列宽度
  const calculateColumnWidth = () => {
    if (containerWidth === 0 || currentColumnCount === 0) return 0
    return Math.floor((containerWidth - (currentColumnCount - 1) * columnGap) / currentColumnCount)
  }

  const columnWidth = calculateColumnWidth()

  // 如果没有宽度或列数，不渲染内容
  if (columnWidth === 0 || columns.length === 0) {
    return <div ref={containerRef} className={`w-full ${className}`} />
  }

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      <div className="flex justify-between" style={{ gap: `${columnGap}px` }}>
        {columns.map((column, columnIndex) => (
          <div
            key={`column-${columnIndex}`}
            className="flex flex-col"
            style={{ width: `${columnWidth}px` }}
          >
            {column.map((item, itemIndex) => (
              <div key={`item-${columnIndex}-${itemIndex}`} className="mb-4">
                {renderItem({
                  data: item,
                  index: items.indexOf(item),
                  width: columnWidth,
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
