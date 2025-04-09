---
title: macos git 清理本地缓存 以及所有本地分支
date: 2025-04-09 11:54:14
tags:
  [git]
---

我来帮你说明如何在 macOS 上使用 Git 清理本地缓存以及删除所有本地分支的步骤。以下是具体操作：

1. 清理本地缓存

Git 本身没有直接的“缓存”概念，但通常指的是清理工作目录、暂存区或一些无用的文件（如未跟踪文件或过期的对象）。以下是常用命令：

清理工作目录和暂存区

```bash
# 丢弃所有未提交的修改（包括已暂存和未暂存的更改）
git reset --hard

# 清理未跟踪的文件和目录（如新创建但未 git add 的文件）
git clean -fd
```

- git reset --hard：将工作目录和暂存区重置到当前 HEAD。
- git clean -fd：删除所有未跟踪的文件（-f 表示强制，-d 表示包括目录）。

清理 Git 缓存（如过期的引用或对象）

```bash
# 清理过期的引用
git fetch --prune

# 运行垃圾回收，清理无用的对象
git gc --prune=now
```

- git fetch --prune：同步远程分支并删除本地已不存在的远程分支引用。
- git gc --prune=now：清理 Git 仓库中的无用对象。
- 删除所有本地分支（除了当前分支）

如果你想删除所有本地分支（除了你当前所在的分支），可以用以下步骤：

查看所有本地分支

```bash
git branch
```

删除所有本地分支（除了当前分支）

```bash
git branch | grep -v "$(git rev-parse --abbrev-ref HEAD)" | xargs git branch -D
```

- git branch：列出所有本地分支。
- grep -v "$(git rev-parse --abbrev-ref HEAD)"：排除当前所在分支。
- xargs git branch -D：将筛选出的分支传递给 git branch -D 进行强制删除。

注意：

- -D 是强制删除，即使分支未合并也会删除。如果只想删除已合并的分支，可以用 -d。
- 执行前请确认你真的不需要这些分支，或者已推送到远程备份。

完整示例

假设你想清理缓存并删除所有本地分支，可以按顺序执行：

```bash
# 清理工作目录和未跟踪文件
git reset --hard
git clean -fd

# 清理远程引用和无用对象
git fetch --prune
git gc --prune=now

# 删除所有本地分支（除了当前分支）
git branch | grep -v "$(git rev-parse --abbrev-ref HEAD)" | xargs git branch -D
```

注意事项

1. 备份：如果不确定，建议先备份仓库（复制整个文件夹）。
2. 远程分支：以上操作只影响本地，不会删除远程分支。
3. 当前分支：上述命令不会删除你当前所在的分支。
