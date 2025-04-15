'use client'

import React, { useState, useEffect } from 'react'
import { galleryItems } from './list'
import Script from 'next/script'
import { CopyIcon, CheckIcon } from 'lucide-react'
import { Tooltip, ConfigProvider, theme } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import { Masonry } from 'masonic'
import Image from 'next/image'

// 动画变体
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}

export default function PromptComponent() {
  // 深色模式状态
  const [isDarkMode, setIsDarkMode] = useState(false)
  // 选中的项目状态
  const [selectedItem, setSelectedItem] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCardClick = (id: number) => {
    setSelectedItem(id)
  }

  const handleClose = () => {
    setSelectedItem(null)
  }

  // 添加ESC键关闭功能
  useEffect(() => {
    const handleEscClose = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedItem !== null) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleEscClose)
    return () => {
      window.removeEventListener('keydown', handleEscClose)
    }
  }, [selectedItem])

  // Masonry卡片组件
  const MasonryCard = ({ index, data, width }) => {
    const item = data
    return (
      <motion.div
        key={item.id}
        layoutId={`card-container-${item.id}`}
        className="cursor-pointer overflow-hidden rounded-xl shadow-lg mb-[30px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300"
        onClick={() => handleCardClick(item.id)}
        whileHover={{ y: -5, boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)' }}
      >
        <div className="p-0 relative">
          <motion.h3
            layoutId={`card-title-${item.id}`}
            className="text-xl font-bold mb-3 px-6 text-gray-900 dark:text-white"
          >
            {item.id}. {item.title}
          </motion.h3>
          {/* 主图展示 */}
          {item.images.length > 0 && (
            <motion.div layoutId={`card-image-${item.id}`} className="overflow-hidden rounded-lg">
              {item.images?.map((image, index) => (
                <Image
                  key={index}
                  className="w-full h-auto"
                  src={image.src}
                  alt={image.alt}
                  width={300}
                  height={300}
                />
              ))}
            </motion.div>
          )}

          <motion.p
            layoutId={`card-description-${item.id}`}
            className="text-gray-600 dark:text-gray-400 mb-4 px-6"
          >
            {item.description}
          </motion.p>
        </div>
      </motion.div>
    )
  }

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

          {/* Masonry瀑布流布局 */}
          <Masonry
            items={galleryItems}
            render={MasonryCard}
            columnGutter={16}
            columnWidth={200}
            className="bg-clip-padding"
          />
        </section>
      </main>

      {/* 详情弹窗 */}
      <AnimatePresence>
        {selectedItem !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          >
            <motion.div
              className="relative m-4 h-[80vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white dark:bg-gray-800 shadow-2xl"
              layoutId={`card-container-${selectedItem}`}
              onClick={(e) => e.stopPropagation()}
            >
              {galleryItems.find((item) => item.id === selectedItem) && (
                <>
                  <div className="relative h-[calc(80vh-250px)] p-6 bg-white dark:bg-gray-800 overflow-y-auto">
                    <button
                      onClick={handleClose}
                      className="absolute right-6 top-6 rounded-full bg-black/20 dark:bg-white/20 p-2 text-white z-20"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="h-6 w-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>

                    <div className="mb-8">
                      <motion.h3
                        layoutId={`card-title-${selectedItem}`}
                        className="text-3xl font-bold text-gray-900 dark:text-white mb-4"
                      >
                        {galleryItems.find((item) => item.id === selectedItem)?.id}.{' '}
                        {galleryItems.find((item) => item.id === selectedItem)?.title}
                      </motion.h3>
                      <motion.p
                        layoutId={`card-description-${selectedItem}`}
                        className="text-lg text-gray-700 dark:text-gray-300 mb-6"
                      >
                        {galleryItems.find((item) => item.id === selectedItem)?.description}
                      </motion.p>
                    </div>

                    {/* 所有图片展示 */}
                    <div className="space-y-6">
                      {galleryItems
                        .find((item) => item.id === selectedItem)
                        ?.images.map((image, index) => (
                          <div key={index} className="overflow-hidden rounded-lg">
                            {index === 0 ? (
                              <motion.div layoutId={`card-image-${selectedItem}`}>
                                <Image
                                  src={image.src}
                                  alt={image.alt}
                                  className="w-full h-auto"
                                  width={300}
                                  height={300}
                                />
                              </motion.div>
                            ) : (
                              <Image
                                src={image.src}
                                alt={image.alt}
                                className="w-full h-auto"
                                width={300}
                                height={300}
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Prompt展示区域 */}
                  <PromptCard selectedItem={selectedItem} />
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfigProvider>
  )
}

const PromptCard = ({ selectedItem }) => {
  const [copied, setCopied] = useState(false)
  return (
    <div className="h-[250px] overflow-y-auto p-6 bg-gray-100 dark:bg-gray-900">
      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Prompt</h4>
      {galleryItems.find((item) => item.id === selectedItem)?.prompt ? (
        <div className="relative">
          <pre className="p-4 bg-white dark:bg-gray-800 rounded-lg overflow-x-auto text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {galleryItems.find((item) => item.id === selectedItem)?.prompt}
          </pre>
          <button
            onClick={() => {
              const prompt = galleryItems.find((item) => item.id === selectedItem)?.prompt
              if (prompt) {
                navigator.clipboard.writeText(prompt)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }
            }}
            className="absolute top-3 right-3 bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-full transition-all duration-200"
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 italic">该示例未提供Prompt</p>
      )}
    </div>
  )
}
