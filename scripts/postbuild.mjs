/**
 * +--------------------------------------------------------------------------+
 * | [INPUT]: 依赖 scripts/rss.mjs 提供的 RSS 生成能力
 * | [OUTPUT]: 对外执行构建后的 RSS 文件生成流程
 * | [POS]: 构建后入口，由 package.json 的 build 脚本调用
 * | [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * +--------------------------------------------------------------------------+
 */
import rss from './rss.mjs'

async function postbuild() {
  await rss()
}

postbuild()
