/**
 * +--------------------------------------------------------------------------+
 * | [INPUT]: 依赖 clsx 的条件类名合并与 tailwind-merge 的冲突消解能力
 * | [OUTPUT]: 对外提供 cn 类名组合函数
 * | [POS]: lib 通用样式工具，为组件统一合并 Tailwind CSS 类名
 * | [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * +--------------------------------------------------------------------------+
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
