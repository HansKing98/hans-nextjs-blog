import PageTitle from '@/components/PageTitle'
import { genPageMetadata } from '../seo'
import { MovingBorderDemo } from '@/components/ui/moving-border-demo'
import { FloatingNavDemo } from '@/components/ui/floating-nav-demo'
import { PointerDemo } from '@/components/ui/pointer-demo'

export const metadata = genPageMetadata({ title: '21st.dev' })
export default function Page() {
  return (
    <div className="flex flex-col gap-10">
      <PageTitle>21st.dev</PageTitle>
      <MovingBorderDemo />
      <PointerDemo />
      {/*  */}
      <FloatingNavDemo />
    </div>
  )
}
