import siteMetadata from '@/data/siteMetadata'
import headerNavLinks from '@/data/headerNavLinks'
import Link from './Link'
import MobileNav from './MobileNav'
import ThemeSwitch from './ThemeSwitch'
import Image from 'next/image'
import Logo from '../public/static/images/logo.png'
import SearchButton from './SearchButton'
import { FloatingNav } from '@/components/ui/floating-navbar'
import { Home } from 'lucide-react'
import { Pointer, PointerCustomPinkCircle, PointerColoredPointer } from '@/components/ui/pointer'

const Header = () => {
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
    <header className="flex items-center justify-between py-10 z-10 rounded-b-lg p-4">
      <div>
        <Link href="/" aria-label={siteMetadata.headerTitle}>
          <div className="flex items-center justify-between gap-3 ">
            <PointerCustomPinkCircle />
            <Image className="rounded-md" src={Logo} alt="logo" width={36} height={36} />
            {typeof siteMetadata.headerTitle === 'string' ? (
              <div className="hidden px-2 text-2xl font-bold sm:block">
                {siteMetadata.headerTitle}
              </div>
            ) : (
              siteMetadata.headerTitle
            )}
          </div>
        </Link>
      </div>
      <div className="flex items-center text-base leading-5">
        {/*  */}
        <FloatingNav navItems={navItems} />

        {/*  */}
        <div className="hidden sm:block">
          {headerNavLinks.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              className="rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-opacity-10 sm:p-4"
            >
              {link.title}
            </Link>
          ))}
        </div>
        <SearchButton />
        <ThemeSwitch />
        <MobileNav />
      </div>
    </header>
  )
}

export default Header
