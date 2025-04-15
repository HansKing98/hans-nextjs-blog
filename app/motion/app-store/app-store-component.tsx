'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Masonry } from 'masonic'

const appData = [
  {
    id: 1,
    category: 'TRAVEL',
    title: '5 Inspiring Apps for Your Next Trip',
    color: '#7a98ab',
    image: 'https://examples.motion.dev/photos/app-store/a.jpg',
    description:
      "Love to travel? So do the makers of these five subscription apps. For a small monthly fee, they'll help you find the best deals on flights, hotels, and some other stuff we turn a blind eye to.\n\nPlan your perfect itinerary with intelligent recommendations based on your interests, time, and credit history.",
  },
  {
    id: 2,
    category: 'HOW TO',
    title: 'Contemplate the Meaning of Life Twice a Day',
    color: '#295840',
    image: 'https://examples.motion.dev/photos/app-store/c.jpg',
    description:
      'Take a moment to pause and reflect on your existence with our curated selection of philosophical prompts. Perfect for morning and evening contemplation sessions.',
  },
  {
    id: 3,
    category: 'STEPS',
    title: 'Urban Exploration Apps for the Vertically-Inclined',
    color: '#e9e9e9',
    textColor: '#333',
    image: 'https://examples.motion.dev/photos/app-store/d.jpg',
    description:
      'Discover hidden staircases, rooftops, and vertical pathways throughout your city with these specially designed urban exploration tools. Perfect for those who prefer to go up rather than across.',
  },
  {
    id: 4,
    category: 'HATS',
    title: 'Take Control of Your Hat Life With This Stunning New App',
    color: '#b4b178',
    image: 'https://examples.motion.dev/photos/app-store/b.jpg',
    description:
      'Organize, catalog, and discover new additions for your hat collection. From snapbacks to fedoras, this app has you covered (literally). Never lose track of your favorite headwear again.',
  },
  {
    id: 5,
    category: 'SD LibLib',
    title: 'XUEDIAO',
    prompt:
      'XUEDIAO,A snow sculpture of a snow explorer, wearing heavy snow gear, holding an ice axe, background of glacier crevasses, dynamic sculpting texture, volumetric fog rendering, adventurous atmosphere',
    color: '#b4b178',
    image:
      'https://liblibai-online.liblib.cloud/img/33f19ea1578140938d9c3800a9aa52ff/b230fb389675d084353ab854b2cc099ef0c64230f5faaffeeed38ad92493b8c4.png',
    description:
      'XUEDIAO,A snow sculpture of a snow explorer, wearing heavy snow gear, holding an ice axe, background of glacier crevasses, dynamic sculpting texture, volumetric fog rendering, adventurous atmosphere',
  },
  {
    id: 6,
    category: 'SD LibLib',
    title: 'XUEDIAO',
    color: '#b4b178',
    image:
      'https://liblibai-online.liblib.cloud/community-img/ace3a43386eac770ebc179d03d0f2feff044291c5d4a1b3e68e691e96bd234b2.png?x-oss-process=image/resize,w_764,m_lfit/format,webp',
    description:
      'XUEDIAO,A snow sculpture of a snow explorer, wearing heavy snow gear, holding an ice axe, background of glacier crevasses, dynamic sculpting texture, volumetric fog rendering, adventurous atmosphere',
  },
  {
    id: 7,
    category: 'SD LibLib',
    title: 'XUEDIAO',
    color: '#b4b178',
    image:
      'https://liblibai-online.liblib.cloud/img/0b6813aa515d4451a01f39bf5f06ccba/146cbb09cc8382ada17edbb8c29633fd0cb1cd2968b202900fcc389f2781655c.png?x-oss-process=image/resize,w_764,m_lfit/format,webp',
    description:
      'XUEDIAO,A snow sculpture of a snow explorer, wearing heavy snow gear, holding an ice axe, background of glacier crevasses, dynamic sculpting texture, volumetric fog rendering, adventurous atmosphere',
  },
  {
    id: 8,
    category: 'SD LibLib',
    title: 'XUEDIAO',
    color: '#b4b178',
    image:
      'https://liblibai-online.liblib.cloud/img/0b6813aa515d4451a01f39bf5f06ccba/9121d881395a36aecfebacbcfe928612aa814de9e93671f25f38065529f26dab.png?x-oss-process=image/resize,w_764,m_lfit/format,webp',
    description:
      'XUEDIAO,A snow sculpture of a snow explorer, wearing heavy snow gear, holding an ice axe, background of glacier crevasses, dynamic sculpting texture, volumetric fog rendering, adventurous atmosphere',
  },
  {
    id: 9,
    category: 'SD LibLib',
    title: 'XUEDIAO',
    color: '#b4b178',
    image:
      'https://liblibai-online.liblib.cloud/img/f82bb8451d1b4b86922a8fdef19f6fcf/0e55c66c-b9d3-4280-a6ad-daf940ffb2d3.png?x-oss-process=image/resize,w_764,m_lfit/format,webp',
    description:
      'XUEDIAO,A snow sculpture of a snow explorer, wearing heavy snow gear, holding an ice axe, background of glacier crevasses, dynamic sculpting texture, volumetric fog rendering, adventurous atmosphere',
  },
  {
    id: 10,
    category: 'SD LibLib',
    title: 'XUEDIAO',
    color: '#b4b178',
    image:
      'https://liblibai-online.liblib.cloud/img/949e0773aa864b45a45dab2645be6098/0018c104c773772bb540cad4033704b7d630f6040e29f92e1bd582ea06d9c16a.png?x-oss-process=image/resize,w_764,m_lfit/format,webp',
  },
  {
    id: 11,
    category: 'SD LibLib',
    title: 'XUEDIAO',
    color: '#b4b178',
    image:
      'https://liblibai-online.liblib.cloud/img/857c07d7cda2444a810470c3789b660e/07c488104839e82da14cd44ae016044eadc2a2708624a775c14e0e531b56e69c.png?x-oss-process=image/resize,w_764,m_lfit/format,webp',
  },
  {
    id: 12,
    category: 'SD LibLib',
    title: 'XUEDIAO',
    color: '#b4b178',
    image:
      'https://liblibai-online.liblib.cloud/img/wm/beec955a2ce44f2488667004274e2c0a/bc520c6c-4c0c-450e-9577-701dbbc0f78a.png?x-oss-process=image/resize,w_764,m_lfit/format,webp',
  },
  {
    id: 13,
    category: 'SD LibLib',
    title: 'XUEDIAO',
    color: '#b4b178',
    image:
      'https://liblibai-online.liblib.cloud/img/9844cecc010c40098ffec66550714cd5/672ab3fb9354b2cd94ac9455758562d2520e098ea6cbb89641a1bb42d65c54ef.png?x-oss-process=image/resize,w_764,m_lfit/format,webp',
  },
  {
    id: 14,
    category: 'SD LibLib',
    title: 'XUEDIAO',
    color: '#b4b178',
    image:
      'https://liblibai-online.liblib.cloud/img/92cce0b49b6b403198d0d2ef01bcd24f/bdb7bad22d697b854610667c040bc9c17e4805360349b7a30bc155a4ec5ff984.png?x-oss-process=image/resize,w_764,m_lfit/format,webp',
  },
]

export default function AppStoreComponent() {
  const [selectedApp, setSelectedApp] = useState<number | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleCardClick = (id: number) => {
    setSelectedApp(id)
  }

  const handleClose = () => {
    setSelectedApp(null)
  }

  const MasonryCard = ({ index, data, width }) => {
    const app = data
    return (
      <motion.div
        key={app.id}
        layoutId={`card-container-${app.id}`}
        className="cursor-pointer overflow-hidden rounded-3xl shadow-lg mb-[30px]"
        onClick={() => handleCardClick(app.id)}
      >
        <div
          className="relative min-h-[100px] flex flex-col"
          style={{
            backgroundColor: app.color,
            color: app.textColor || 'white',
          }}
        >
          <motion.div layoutId={`card-image-${app.id}`} className="relative">
            <Image
              src={app.image}
              alt={app.title}
              width={500}
              height={300}
              className="w-full h-auto object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 top-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
          </motion.div>
          <motion.div
            layoutId={`card-category-${app.id}`}
            className="mb-1 text-sm font-medium tracking-wider z-10 px-6 absolute top-6"
          >
            {app.category}
          </motion.div>
          <motion.h2
            layoutId={`card-title-${app.id}`}
            className="max-w-xs text-2xl font-bold leading-tight z-10 mb-4 px-6 absolute bottom-6"
          >
            {app.title}
          </motion.h2>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Today</h1>
        <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-300">
          <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
        </div>
      </div>
      {/*  */}
      <Masonry items={appData} render={MasonryCard} columnGutter={10} columnWidth={200} />
      {/* 目标动画 */}
      <AnimatePresence>
        {selectedApp !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          >
            <motion.div
              className="relative m-4 h-[80vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl"
              layoutId={`card-container-${selectedApp}`}
              onClick={(e) => e.stopPropagation()}
            >
              {appData.find((app) => app.id === selectedApp) && (
                <>
                  <div
                    className="relative h-[calc(80vh-200px)] p-6"
                    style={{
                      backgroundColor: appData.find((app) => app.id === selectedApp)?.color,
                      color: appData.find((app) => app.id === selectedApp)?.textColor || 'white',
                    }}
                  >
                    <button
                      onClick={handleClose}
                      className="absolute right-6 top-6 rounded-full bg-black bg-opacity-20 p-2 text-white z-20"
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

                    <div className="absolute inset-x-0 bottom-6 z-10 px-6">
                      <motion.div
                        layoutId={`card-category-${selectedApp}`}
                        className="mb-2 text-sm font-medium tracking-wider"
                      >
                        {appData.find((app) => app.id === selectedApp)?.category}
                      </motion.div>
                      <motion.h2
                        layoutId={`card-title-${selectedApp}`}
                        className="text-3xl font-bold leading-tight"
                      >
                        {appData.find((app) => app.id === selectedApp)?.title}
                      </motion.h2>
                    </div>

                    <div className="absolute inset-0 overflow-hidden">
                      <motion.div
                        layoutId={`card-image-${selectedApp}`}
                        className="w-full h-full relative"
                      >
                        <Image
                          src={appData.find((app) => app.id === selectedApp)?.image || ''}
                          alt={appData.find((app) => app.id === selectedApp)?.title || ''}
                          fill
                          style={{ objectFit: 'cover' }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 top-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                      </motion.div>
                    </div>
                  </div>

                  <div className="h-[200px] overflow-y-auto bg-[#1a1a1a] p-6 text-white">
                    <p className="mb-4 whitespace-pre-line text-lg font-light leading-relaxed">
                      {appData.find((app) => app.id === selectedApp)?.description}
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
