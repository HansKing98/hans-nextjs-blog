import PageTitle from '@/components/PageTitle'
import { genPageMetadata } from '../seo'
import {MovingBorderDemo} from '@/components/ui/moving-border-demo'
import {FloatingNavDemo} from '@/components/ui/floating-nav-demo'
export const metadata = genPageMetadata({ title: 'Music' })
export default function Page() {
  return (
    <>
      <PageTitle>21st.dev</PageTitle>
      <MovingBorderDemo />
      <FloatingNavDemo />
    </>
  )
}
