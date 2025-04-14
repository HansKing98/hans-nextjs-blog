'use client'

import React, { useEffect, useState } from 'react'
import { galleryItems } from './list'
import Script from 'next/script'
import { CopyIcon } from 'lucide-react'

type EventName = 'scroll' | 'resize' | 'orientationChange'

// 定义常量：列数
const COLUMN_COUNT = 3

export default function PromptComponent() {
  // 瀑布流布局状态
  const [columns, setColumns] = useState<Array<Array<(typeof galleryItems)[0]>>>([[], [], []])

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

  useEffect(() => {
    // 深色模式切换
    const themeToggle = document.getElementById('theme-toggle')
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)')

    // 初始设置
    if (prefersDarkScheme.matches) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    themeToggle?.addEventListener('click', function () {
      document.documentElement.classList.toggle('dark')
    })

    // 懒加载图片
    const lazyImages = document.querySelectorAll('.lazy-load')

    if ('IntersectionObserver' in window) {
      const lazyImageObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const lazyImage = entry.target as HTMLImageElement
            lazyImage.src = lazyImage.dataset.src || ''
            lazyImage.classList.add('loaded')
            lazyImageObserver.unobserve(lazyImage)
          }
        })
      })

      lazyImages.forEach(function (lazyImage) {
        lazyImageObserver.observe(lazyImage)
      })
    } else {
      // 回退方案
      let lazyImagesList = Array.from(lazyImages)

      const lazyLoad = () => {
        lazyImagesList.forEach(function (lazyImage) {
          const imgElement = lazyImage as HTMLImageElement
          if (
            imgElement.getBoundingClientRect().top <= window.innerHeight &&
            imgElement.getBoundingClientRect().bottom >= 0 &&
            getComputedStyle(imgElement).display !== 'none'
          ) {
            imgElement.src = imgElement.dataset.src || ''
            imgElement.classList.add('loaded')
            lazyImagesList = lazyImagesList.filter(function (image) {
              return image !== imgElement
            })

            if (lazyImagesList.length === 0) {
              document.removeEventListener('scroll', lazyLoad)
              window.removeEventListener('resize', lazyLoad)
              window.removeEventListener('orientationChange', lazyLoad)
            }
          }
        })
      }

      // 修复类型问题
      ;(document as HTMLDocument).addEventListener('scroll', lazyLoad)
      ;(window as Window).addEventListener('resize', lazyLoad)
      // 由于TypeScript不认识orientationChange事件，我们使用字符串索引
      ;(window as Window).addEventListener('orientationChange' as keyof WindowEventMap, lazyLoad)
    }

    // 滚动进度条
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.body.offsetHeight
      const winHeight = window.innerHeight
      const scrollPercent = scrollTop / (docHeight - winHeight)
      const scrollPercentRounded = Math.round(scrollPercent * 100)

      const progressBar = document.querySelector('.scroll-progress') as HTMLElement
      if (progressBar) {
        progressBar.style.width = scrollPercentRounded + '%'
      }
    }

    window.addEventListener('scroll', handleScroll)

    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault()
        const href = this.getAttribute('href')
        if (href) {
          const target = document.querySelector(href)
          target?.scrollIntoView({
            behavior: 'smooth',
          })
        }
      })
    })

    // 添加动画效果
    const fadeElems = document.querySelectorAll('.fade-in')

    const checkFade = () => {
      fadeElems.forEach((elem) => {
        const rect = elem.getBoundingClientRect()
        const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight)

        if (!(rect.bottom < 0 || rect.top - viewHeight >= 0)) {
          ;(elem as HTMLElement).style.opacity = '1'
          ;(elem as HTMLElement).style.transform = 'translateY(0)'
        }
      })
    }

    window.addEventListener('scroll', checkFade)
    window.addEventListener('resize', checkFade)
    checkFade() // 初始检查

    // 清理事件监听器
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', checkFade)
      window.removeEventListener('resize', checkFade)
    }
  }, [])

  return (
    <>
      {/* 添加Font Awesome */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/js/all.min.js"
        strategy="beforeInteractive"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        :root {
          --primary-color: #5046e5;
          --secondary-color: #8f88f7;
          --text-color-light: #333;
          --text-color-dark: #f1f1f1;
          --bg-color-light: #ffffff;
          --bg-color-dark: #111827;
          --card-bg-light: #f8f9fa;
          --card-bg-dark: #1f2937;
          --column-gap: 20px;
        }

        .dark {
          --primary-color: #6366f1;
          --secondary-color: #a5b4fc;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          transition: background-color 0.3s ease, color 0.3s ease;
          background-color: var(--bg-color-light);
          color: var(--text-color-light);
        }

        .dark body {
          background-color: var(--bg-color-dark);
          color: var(--text-color-dark);
        }

        .fade-in {
          animation: fadeIn 0.6s ease-in;
        }

        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .card {
          background-color: var(--card-bg-light);
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          border: 1px solid #eaeaea;
          overflow: hidden;
          margin-bottom: var(--column-gap);
          break-inside: avoid;
        }

        .dark .card {
          background-color: var(--card-bg-dark);
          border-color: #374151;
        }

        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 20px rgba(0, 0, 0, 0.1);
          border-color: var(--primary-color);
        }

        .dark .card:hover {
          box-shadow: 0 12px 20px rgba(0, 0, 0, 0.4);
        }

        .btn {
          transition: transform 0.2s ease, background-color 0.2s ease;
        }

        .btn:hover {
          transform: scale(1.05);
        }

        .theme-toggle {
          cursor: pointer;
        }

        #content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          transition: transform 0.3s ease;
        }

        #content img:hover {
          transform: scale(1.02);
        }

        .lazy-load {
          opacity: 0;
          transition: opacity 1s ease-in-out;
        }

        .loaded {
          opacity: 1;
        }

        .social-icon {
          transition: transform 0.2s ease, color 0.2s ease;
        }

        .social-icon:hover {
          transform: scale(1.2);
          color: var(--primary-color);
        }

        .scroll-progress {
          position: fixed;
          top: 0;
          left: 0;
          height: 3px;
          width: 0%;
          background-color: var(--primary-color);
          z-index: 100;
          transition: width 0.2s ease;
        }

        .tooltip-container {
          position: relative;
        }

        .tooltip {
          visibility: hidden;
          position: absolute;
          right: 0;
          top: 100%;
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          text-align: center;
          border-radius: 6px;
          padding: 5px 10px;
          margin-top: 8px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 10;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .tooltip::after {
          content: "";
          position: absolute;
          bottom: 100%;
          right: 10px;
          border-width: 5px;
          border-style: solid;
          border-color: transparent transparent rgba(0, 0, 0, 0.8) transparent;
        }

        .tooltip-container:hover .tooltip {
          visibility: visible;
          opacity: 1;
        }

        .tooltip.visible {
          visibility: visible;
          opacity: 1;
        }

        .waterfall-container {
          display: grid;
          grid-template-columns: repeat(${COLUMN_COUNT}, 1fr);
          gap: var(--column-gap);
        }

        .waterfall-column {
          display: flex;
          flex-direction: column;
          gap: var(--column-gap);
        }

        @media (max-width: 768px) {
          .waterfall-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .waterfall-container {
            grid-template-columns: 1fr;
          }
        }
      `,
        }}
      />
      <div className="scroll-progress"></div>
      {/* 主要内容区 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部内容 */}
        <header className="fade-in mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            GPT-4o 生图
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            展示多种GPT-4o图像处理方式，包括吉卜力风格转换、3D图标、Q版人物互动等创意应用。
          </p>
          <div className="mt-8 flex justify-center">
            <span className="inline-flex rounded-md shadow-sm">
              <a
                href="#gallery"
                className="btn inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
              >
                <i className="fas fa-images mr-2"></i>show me
              </a>
            </span>
          </div>
        </header>

        {/* 内容摘要 */}
        <section className="fade-in mb-16 bg-indigo-50 dark:bg-gray-800 rounded-lg p-6 shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">内容摘要</h2>
          <p className="text-gray-700 dark:text-gray-300">
            本文展示了多种GPT-4o图像处理方式，包括将照片转为Ghibli风格、图标3D化、Q版3D人物互动、Q版人像大头照，以及设计极简潮玩售货机场景。每种方式注重细节与风格化呈现，兼具创意与实用性。
          </p>
        </section>

        {/* 展示画廊 - 瀑布流布局 */}
        <section id="gallery" className="fade-in mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
            <i className="fas fa-palette mr-3 text-indigo-500"></i>Prompt 展示
          </h2>

          <div className="waterfall-container">
            {columns.map((column, columnIndex) => (
              <div key={columnIndex} className="waterfall-column">
                {column.map((item) => (
                  <div key={item.id} className="card rounded-xl overflow-hidden shadow-lg">
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                        {item.id}. {item.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">{item.description}</p>
                      {/* 添加Prompt展示区域 */}
                      {item.prompt && (
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4 relative">
                          <div
                            className="text-gray-700 dark:text-gray-300 overflow-hidden text-sm font-mono"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.prompt}
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.prompt || '')
                              const button = document.getElementById(`copy-btn-${item.id}`)

                              // 显示成功提示
                              const tooltip = document.getElementById(`tooltip-${item.id}`)
                              if (tooltip) {
                                tooltip.textContent = '复制成功！'
                                tooltip.classList.add('visible')
                                setTimeout(() => {
                                  tooltip.classList.remove('visible')
                                  tooltip.textContent = '复制Prompt'
                                }, 2000)
                              }

                              // 改变图标为对勾
                              if (button) {
                                button.innerHTML = '<i class="fas fa-check"></i>'
                                setTimeout(() => {
                                  button.innerHTML = '<i class="fas fa-copy"></i>'
                                }, 2000)
                              }
                            }}
                            id={`copy-btn-${item.id}`}
                            className="absolute top-3 right-3 bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded-full transition-all duration-200 transform hover:scale-110 tooltip-container"
                          >
                            <CopyIcon className="w-4 h-4" />
                            <span id={`tooltip-${item.id}`} className="tooltip">
                              复制Prompt
                            </span>
                          </button>
                        </div>
                      )}
                      {item.images.map((image, index) => (
                        <div
                          key={index}
                          className={
                            index > 0
                              ? 'mt-4 overflow-hidden rounded-lg'
                              : 'overflow-hidden rounded-lg'
                          }
                        >
                          <img
                            // className="lazy-load w-full h-auto"
                            className="w-full h-auto"
                            data-src={image.src}
                            src={image.src}
                            alt={image.alt}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
