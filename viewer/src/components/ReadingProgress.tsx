/** 监听正文滚动容器，以一帧一次的频率更新阅读进度。 */
import { useEffect, useRef } from 'react'

export function ReadingProgress({ docPath }: { docPath: string }) {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const main = barRef.current?.closest('.main') as HTMLElement | null
    if (!main) return
    // 新文档从顶部开始阅读，进度也随之归零。
    main.scrollTop = 0
    let frame = 0
    const update = () => {
      frame = 0
      const maxScroll = main.scrollHeight - main.clientHeight
      const progress = maxScroll > 0 ? Math.min(100, Math.max(0, main.scrollTop / maxScroll * 100)) : 0
      barRef.current?.style.setProperty('--reading-progress', `${progress}%`)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    main.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      main.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [docPath])

  return <div ref={barRef} className="reading-progress" aria-hidden="true" />
}
