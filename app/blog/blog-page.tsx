'use client'
import PageTitle from '@/components/PageTitle'
import PostCard from '@/components/PostCard'
import Link from '@/components/Link'
import Divider from '@/components/Divider'
import { Post } from 'contentlayer/generated'
import { useState } from 'react'

export default function Blog({ tags, posts, plogTag = false }) {
  const MAX_DISPLAY = 4
  const showingPosts = posts.slice(0, MAX_DISPLAY)
  const [showAllTags, setShowAllTags] = useState(false)
  const [loadingLink, setLoadingLink] = useState<string | null>(null)

  const tagKeys = Object.keys(tags)
  const sortedTags = tagKeys.sort((a, b) => tags[b] - tags[a])

  // 热门标签（数量前8个）和其他标签
  const popularTags = sortedTags.slice(0, 8)
  const remainingTags = sortedTags.slice(8)

  const timeMap: Map<string, Map<string, Array<Post>>> = new Map()
  for (const post of posts) {
    if (post.date !== null) {
      const year: string = new Date(post.date).getFullYear().toString()
      const month: string = new Date(post.date).toDateString().split(' ')[1]
      if (!timeMap.has(year)) {
        timeMap.set(year, new Map())
      }
      if (!timeMap.get(year)?.has(month)) {
        timeMap.get(year)?.set(month, [])
      }
      timeMap.get(year)?.get(month)?.push(post)
    }
  }

  const handleLinkClick = (slug: string) => {
    setLoadingLink(slug)
  }

  return (
    <>
      <div className="space-y-14">
        {/* 最近文章部分 */}
        {/* <section className="rounded-lg bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm dark:from-gray-900 dark:to-gray-950">
          <PageTitle>Recent Posts</PageTitle>
          <ul
            className="grid gap-6 pt-4 sm:grid-cols-1 lg:grid-cols-2"
            style={{ listStyle: `none` }}
          >
            {showingPosts.map((post) => {
              const { slug } = post
              return (
                <li
                  key={slug}
                  className="transform transition-transform duration-300 hover:scale-[1.02]"
                >
                  <PostCard post={post} tag={plogTag ? 'plog' : undefined} />
                </li>
              )
            })}
          </ul>
        </section> */}

        {/* 标签部分 */}
        <section className="rounded-lg bg-gradient-to-br from-[#ffffff483] to-[#ffffff962] p-6 dark:from-[#ffffff483] dark:to-[#ffffff483]">
          {/* <PageTitle>Tags</PageTitle> */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-3">
              {popularTags.map((t) => {
                return (
                  <span
                    key={t}
                    className="overflow-hidden rounded-md border-0 bg-white shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md dark:bg-gray-800"
                  >
                    <Link href={`/tags/${t}`} className="flex items-center">
                      <span className="p-2 text-hans-100">{t.toUpperCase()}</span>
                      <span className="bg-gray-100 p-2 text-gray-500 dark:bg-gray-700 dark:text-hans-400">
                        {tags[t]}
                      </span>
                    </Link>
                  </span>
                )
              })}
            </div>
          </div>
          {remainingTags.length > 0 && (
            <>
              <button
                onClick={() => setShowAllTags(!showAllTags)}
                className="mt-4 rounded-full bg-hans-100 px-5 py-2 text-sm text-white shadow-sm transition-all hover:bg-hans-200 hover:shadow-md"
              >
                {showAllTags ? '收起标签' : `显示更多标签 (${remainingTags.length})`}
              </button>
              {showAllTags && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {remainingTags.map((t) => {
                    return (
                      <span
                        key={t}
                        className="overflow-hidden rounded-md bg-white shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md dark:bg-gray-800"
                      >
                        <Link href={`/tags/${t}`} className="flex items-center">
                          <span className="p-1.5 text-hans-100">{t.toUpperCase()}</span>
                          <span className="bg-gray-100 p-1.5 text-gray-500 dark:bg-gray-700 dark:text-hans-400">
                            {tags[t]}
                          </span>
                        </Link>
                      </span>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </section>

        {/* 归档部分 */}
        <section className="rounded-lg bg-gradient-to-br  from-[#ffffff483] to-[#ffffff962] p-6 dark:[#ffffff483] dark:[#ffffff483]">
          <PageTitle>Archive</PageTitle>
          <div className="mt-4 space-y-8">
            {Array.from(timeMap.keys()).map((year) => {
              return (
                <div key={year} className="overflow-hidden">
                  <Divider>
                    <span className="bg-gradient-to-r from-hans-100 to-hans-200 bg-clip-text text-transparent">
                      {year}
                    </span>
                  </Divider>
                  <ol className="relative ml-3 border-l border-gray-200 dark:border-gray-700">
                    {Array.from(timeMap.get(year)?.keys() ?? []).map((month) => (
                      <li key={month} className="mb-8 ml-6">
                        <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-hans-100 ring-8 ring-white dark:ring-dark">
                          <svg
                            aria-hidden="true"
                            className="h-3 w-3 text-hans-200"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fillRule="evenodd"
                              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                              clipRule="evenodd"
                            ></path>
                          </svg>
                        </span>
                        <h3 className="mb-2 flex items-center text-lg font-semibold text-gray-700 dark:text-gray-300">
                          {month}
                        </h3>
                        <div className="space-y-2">
                          {timeMap
                            .get(year)
                            ?.get(month)
                            ?.map((post) => {
                              const postDate = new Date(post.date)
                              const year = postDate.getFullYear()
                              const month = String(postDate.getMonth() + 1).padStart(2, '0')
                              const day = String(postDate.getDate()).padStart(2, '0')
                              const formattedDate = `${year}-${month}-${day}`
                              return (
                                <div
                                  className="group rounded-lg p-2 transition-colors duration-200 hover:bg-[#ffffff55] dark:hover:bg-[#00000065] relative"
                                  key={post.slug}
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-block whitespace-nowrap text-sm font-medium text-gray-400 dark:text-gray-500">
                                      {formattedDate}
                                    </span>
                                    <Link
                                      href={`/blog/${post.slug}`}
                                      className="w-full sm:w-auto relative"
                                      onClick={() => handleLinkClick(post.slug)}
                                    >
                                      <span className="text-lg font-bold text-hans-100 transition-colors group-hover:text-hans-200 dark:text-opacity-80 inline">
                                        {post.title}{' '}
                                        {/* <a className="text-[10px] text-gray-500 font-light dark:text-gray-400 mb-[10px]">
                                          {post.wordCount} 字
                                        </a> */}
                                      </span>
                                    </Link>
                                  </div>
                                  {loadingLink === post.slug && (
                                    <div className="absolute right-4 bottom-1/2 translate-y-1/2">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </>
  )
}
