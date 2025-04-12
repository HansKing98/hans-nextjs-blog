'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { CoreContent } from 'pliny/utils/contentlayer'
import { Post } from 'contentlayer/generated'
interface ExcellentPageProps {
  posts: CoreContent<Post>[]
  tags?: Record<string, number>
}

export default function ExcellentPage({ posts, tags }: ExcellentPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loadingPost, setLoadingPost] = useState<string | null>(null)

  const handleClick = (e: React.MouseEvent, href: string, slug: string) => {
    setLoadingPost(slug)
  }

  return (
    <>
      <div className="text-2xl font-light mt-10 mb-1">{'Take a look, take a look,'}</div>
      <div className="space-y-6">
        {posts?.map((post) => {
          const postDate = new Date(post.date)
          const year = postDate.getFullYear()
          const month = String(postDate.getMonth() + 1).padStart(2, '0')
          const day = String(postDate.getDate()).padStart(2, '0')
          const formattedDate = `${year}年${month}月${day}日`

          return (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block relative"
              onClick={(e) => post.slug && handleClick(e, `/blog/${post.slug}`, post.slug)}
            >
              <article className="space-y-2 dark:hover:bg-[#0000002c] hover:bg-[#ffffff55] rounded-lg p-4 mx-[-16px] transition-all">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-normal text-gray-900 dark:text-gray-100 group-hover:opacity-70 underline underline-offset-4 decoration-2">
                    {post.title}
                  </h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 shrink-0">
                    <time dateTime={post.date}>{formattedDate}</time>
                    <span>•</span>
                    <span>{post?.wordCount || 0} 字</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {post?.structuredData?.description}
                </div>
                {loadingPost === post.slug && (
                  <div className="absolute right-4 bottom-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
                  </div>
                )}
              </article>
            </Link>
          )
        })}
      </div>
    </>
  )
}
