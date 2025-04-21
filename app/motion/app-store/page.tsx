import React from 'react'
import AppStoreComponent from './app-store-component'
import { genPageMetadata } from '@/app/seo'

export const metadata = genPageMetadata({
  title: 'iOS App Store Animation',
  description: '使用Framer Motion实现的iOS App Store动画效果',
})

export default function AppStorePage() {
  return <AppStoreComponent />
}
