'use client'

import { cn } from '@/lib/utils'
import { AnimatePresence, motion, useMotionValue } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

type PointerProps = Omit<React.ComponentProps<typeof motion.div>, 'ref'>

/**
 * A custom pointer component that displays an animated cursor.
 * Add this as a child to any component to enable a custom pointer when hovering.
 * You can pass custom children to render as the pointer.
 *
 * @component
 * @param {PointerProps} props - The component props
 */
export function Pointer({ className, style, children, ...props }: PointerProps): JSX.Element {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const [isActive, setIsActive] = useState<boolean>(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && containerRef.current) {
      // Get the parent element directly from the ref
      const parentElement = containerRef.current.parentElement

      if (parentElement) {
        // Add cursor-none to parent
        parentElement.style.cursor = 'none'

        // Add event listeners to parent
        const handleMouseMove = (e: MouseEvent) => {
          x.set(e.clientX)
          y.set(e.clientY)
        }

        const handleMouseEnter = () => {
          setIsActive(true)
        }

        const handleMouseLeave = () => {
          setIsActive(false)
        }

        parentElement.addEventListener('mousemove', handleMouseMove)
        parentElement.addEventListener('mouseenter', handleMouseEnter)
        parentElement.addEventListener('mouseleave', handleMouseLeave)

        return () => {
          parentElement.style.cursor = ''
          parentElement.removeEventListener('mousemove', handleMouseMove)
          parentElement.removeEventListener('mouseenter', handleMouseEnter)
          parentElement.removeEventListener('mouseleave', handleMouseLeave)
        }
      }
    }
  }, [x, y])

  return (
    <>
      <div ref={containerRef} />
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="pointer-events-none fixed z-50 translate-x-[-50%] translate-y-[-50%]"
            style={{
              top: y,
              left: x,
              ...style,
            }}
            initial={{
              scale: 0,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            exit={{
              scale: 0,
              opacity: 0,
            }}
            {...props}
          >
            {children || (
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="1"
                viewBox="0 0 16 16"
                height="24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
                className={cn('rotate-[-70deg] stroke-white text-black', className)}
              >
                <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z" />
              </svg>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export function PointerCustomPinkCircle() {
  return (
    <Pointer>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" className="fill-purple-500" />
        <circle cx="12" cy="12" r="5" className="fill-white" />
      </svg>
    </Pointer>
  )
}

export function PointerColoredPointer() {
  return <Pointer className="fill-blue-500" />
}
