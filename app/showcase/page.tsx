// app/showcase/page.tsx
import Link from 'next/link'
import siteMetadata from '@/data/siteMetadata' // Assuming you have site metadata
import showcaseData from '@/data/showcase.json'

const { projects, tools } = showcaseData

export default function Showcase() {
  return (
    <>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="space-y-2 pb-8 pt-6 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            Show Case
          </h1>
          <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
            我的一些项目和常用的工具网站
          </p>
        </div>
        <div className="container py-12">
          <div className="flex flex-col gap-y-8">
            <div>
              <h2 className="text-2xl font-bold leading-8 tracking-tight mb-4 text-gray-900 dark:text-gray-100">
                项目
              </h2>
              <div className="-m-4 flex flex-wrap">
                {projects.map((d) => (
                  <div key={d.title} className="w-full p-4 md:w-1/2">
                    <div className="overflow-hidden rounded-md border-2 border-gray-200 border-opacity-60 dark:border-gray-700">
                      {/* You might want to add images here later */}
                      <div className="p-6">
                        <h2 className="mb-3 text-2xl font-bold leading-8 tracking-tight">
                          <Link
                            href={d.href}
                            className="text-gray-900 dark:text-gray-100 hover:text-primary-500 dark:hover:text-primary-400"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {d.title}
                          </Link>
                        </h2>
                        <p className="prose mb-3 max-w-none text-gray-500 dark:text-gray-400">
                          {d.description}
                        </p>
                        <Link
                          href={d.href}
                          className="text-base font-medium leading-6 text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                          aria-label={`Link to ${d.title}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          访问项目 &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold leading-8 tracking-tight mb-4 text-gray-900 dark:text-gray-100">
                常用工具
              </h2>
              <div className="-m-4 flex flex-wrap">
                {tools.map((d) => (
                  <div key={d.title} className="w-full p-4 md:w-1/2">
                    <div className="overflow-hidden rounded-md border-2 border-gray-200 border-opacity-60 dark:border-gray-700">
                      <div className="p-6">
                        <h2 className="mb-3 text-2xl font-bold leading-8 tracking-tight">
                          <Link
                            href={d.href}
                            className="text-gray-900 dark:text-gray-100 hover:text-primary-500 dark:hover:text-primary-400"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {d.title}
                          </Link>
                        </h2>
                        <p className="prose mb-3 max-w-none text-gray-500 dark:text-gray-400">
                          {d.description}
                        </p>
                        <Link
                          href={d.href}
                          className="text-base font-medium leading-6 text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                          aria-label={`Link to ${d.title}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          访问网站 &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
