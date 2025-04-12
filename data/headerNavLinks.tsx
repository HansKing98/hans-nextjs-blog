import { Telescope, Rainbow, ImagePlay, SquareUser } from 'lucide-react'
const headerNavLinks = [
  // { href: '/about', title: 'About' },
  // { href: 'https://nextchat.hansking.cn', title: 'NextChat' },
  // { href: 'https://gallery.hansking.cn', title: 'Gallery' },
  {
    href: '/showcase',
    title: 'Demo',
    icon: <Telescope className="h-4 w-4 text-neutral-500 dark:text-white" />,
  },
  {
    href: '/blog',
    title: 'Blog',
    icon: <Rainbow className="h-4 w-4 text-neutral-500 dark:text-white" />,
  },
  {
    href: '/plog',
    title: 'Plog',
    icon: <ImagePlay className="h-4 w-4 text-neutral-500 dark:text-white" />,
  },
  {
    href: '/resume',
    title: 'Résumé',
    icon: <SquareUser className="h-4 w-4 text-neutral-500 dark:text-white" />,
  },
]

export default headerNavLinks
