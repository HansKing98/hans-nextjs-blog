"use client"

import React from "react"
import { FloatingNav } from "@/components/ui/floating-navbar"
import { Home, MessageSquare, User } from "lucide-react"
import headerNavLinks from "@/data/headerNavLinks"

export function FloatingNavDemo() {
  const navItems = [
    {
      name: 'Home',
      link: '/',
      icon: <Home className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
    ...headerNavLinks.map((link) => ({
      name: link.title,
      link: link.href,
      icon: link.icon,
    })),
  ]

  return (
    <div className="relative w-full">
      <FloatingNav navItems={navItems} />
      <DummyContent />
    </div>
  )
}

const DummyContent = () => {
  return (
    <div className="grid grid-cols-1 h-[80rem] w-full bg-white dark:bg-black relative border border-neutral-200 dark:border-white/[0.2] rounded-md">
      <p className="dark:text-white text-neutral-600 text-center text-4xl font-bold absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        Scroll back up to reveal Navbar
      </p>
      <div className="inset-0 absolute bg-grid-black/[0.1] dark:bg-grid-white/[0.2]" />
    </div>
  )
} 