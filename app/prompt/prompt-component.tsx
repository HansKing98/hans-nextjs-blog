'use client'

import React, { useEffect, useState } from 'react'
import { galleryItems } from './list'
import Script from 'next/script'
import { CopyIcon } from 'lucide-react'
import { Tooltip, ConfigProvider, theme } from 'antd'
import { motion } from 'framer-motion'

type EventName = 'scroll' | 'resize' | 'orientationChange'

// 定义常量：列数
const COLUMN_COUNT = 3

// 动画变体
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}

export default function PromptComponent() {
  // 瀑布流布局状态
  const [columns, setColumns] = useState<Array<Array<(typeof galleryItems)[0]>>>([[], [], []])
  // 深色模式状态
  const [isDarkMode, setIsDarkMode] = useState(false)

  // 初始化瀑布流
  useEffect(() => {
    // 将数据分配到不同列中
    const newColumns: Array<Array<(typeof galleryItems)[0]>> = Array(COLUMN_COUNT)
      .fill(null)
      .map(() => [])

    galleryItems.forEach((item, index) => {
      // 根据索引分配到不同列，实现基本的均匀分布
      const columnIndex = index % COLUMN_COUNT
      newColumns[columnIndex].push(item)
    })

    setColumns(newColumns)
  }, [])

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#5046e5',
        },
      }}
    >
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/js/all.min.js"
        strategy="beforeInteractive"
      />

      {/* 主要内容区 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans transition-colors duration-300 ease-in-out text-gray-800 dark:bg-gray-900 dark:text-gray-200">
        {/* 头部内容 */}
        <motion.header
          className="mb-12 text-center"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            GPT-4o 生图
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            展示多种GPT-4o图像处理方式，包括吉卜力风格转换、3D图标、Q版人物互动等创意应用。
          </p>
          <div className="mt-8 flex justify-center">
            <motion.span
              className="inline-flex rounded-md shadow-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <a
                href="#gallery"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
              >
                <i className="fas fa-images mr-2"></i>show me
              </a>
            </motion.span>
          </div>
        </motion.header>

        {/* 内容摘要 */}
        <motion.section
          className="mb-16 bg-indigo-50 dark:bg-gray-800 rounded-lg p-6 shadow-md"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">内容摘要</h2>
          <p className="text-gray-700 dark:text-gray-300">
            本文展示了多种GPT-4o图像处理方式，包括将照片转为Ghibli风格、图标3D化、Q版3D人物互动、Q版人像大头照，以及设计极简潮玩售货机场景。每种方式注重细节与风格化呈现，兼具创意与实用性。
          </p>
        </motion.section>

        {/* 展示画廊 - 瀑布流布局 */}
        <section id="gallery" className="mb-16">
          <motion.h2
            className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center"
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            <i className="fas fa-palette mr-3 text-indigo-500"></i>Prompt 展示
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {columns.map((column, columnIndex) => (
              <div key={columnIndex} className="flex flex-col gap-5">
                {column.map((item) => (
                  <PromptCard key={item.id} item={item} />
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>
    </ConfigProvider>
  )
}

// PromptCard 组件
function PromptCard({ item }: { item: (typeof galleryItems)[0] }) {
  const handleCopyPrompt = (prompt: string, id: number) => {
    navigator.clipboard.writeText(prompt || '')
    // 复制成功后更新图标显示
    const button = document.getElementById(`copy-btn-${id}`)
    if (button) {
      button.innerHTML = '<i class="fas fa-check"></i>'
      setTimeout(() => {
        button.innerHTML = '<i class="fas fa-copy"></i>'
      }, 2000)
    }
  }

  return (
    <motion.div
      className="rounded-xl overflow-hidden shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300"
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      whileHover={{ y: -5, boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)' }}
    >
      <div className="p-6">
        <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
          {item.id}. {item.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{item.description}</p>

        {/* Prompt展示区域 */}
        {item.prompt && (
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4 relative border border-gray-200 dark:border-gray-700">
            <div className="text-gray-700 dark:text-gray-300 overflow-hidden text-sm font-mono line-clamp-2">
              {item.prompt}
            </div>
            <Tooltip title="复制 Prompt" placement="top" overlayStyle={{ fontSize: '12px' }}>
              <motion.button
                onClick={() => handleCopyPrompt(item.prompt || '', item.id)}
                id={`copy-btn-${item.id}`}
                className="absolute top-3 right-3 bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded-full transition-all duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <CopyIcon className="w-4 h-4" />
              </motion.button>
            </Tooltip>
          </div>
        )}

        {/* 图片区域 */}
        {item.images.map((image, index) => (
          <motion.div
            key={index}
            className={index > 0 ? 'mt-4 overflow-hidden rounded-lg' : 'overflow-hidden rounded-lg'}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <img className="w-full h-auto" data-src={image.src} src={image.src} alt={image.alt} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
