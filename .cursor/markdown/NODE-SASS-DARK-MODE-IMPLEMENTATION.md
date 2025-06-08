# (node-sass) 夜间模式适配实现文档

## 概述

为 `app/(node-sass)` 文件夹的 layout 和页面添加了完整的夜间模式适配功能，包括主题切换按钮和暗色主题样式。

## 实现功能

### 1. 主题切换功能

- **自动检测系统主题**: 根据用户系统偏好自动设置初始主题
- **本地存储**: 用户选择的主题偏好保存在 localStorage 中
- **实时切换**: 点击按钮即时切换主题，无需刷新页面
- **图标切换**: 根据当前主题显示对应的太阳/月亮图标

### 2. Layout 更新

**文件**: `app/(node-sass)/layout.tsx`

**新增功能**:
- 主题状态管理 (`useState`, `useEffect`)
- 主题切换逻辑
- 主题切换按钮
- 导航栏夜间模式样式

**主要代码**:
```tsx
const [isDarkMode, setIsDarkMode] = useState(false)

// 初始化主题
useEffect(() => {
  const savedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    setIsDarkMode(true)
    document.documentElement.classList.add('dark')
  } else {
    setIsDarkMode(false)
    document.documentElement.classList.remove('dark')
  }
}, [])

// 切换主题
const toggleTheme = () => {
  const newTheme = !isDarkMode
  setIsDarkMode(newTheme)
  
  if (newTheme) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}
```

### 3. 页面样式适配

#### Todo 页面 (`app/(node-sass)/todo/page.tsx`)

**适配内容**:
- 主容器背景色
- 文字颜色（标题、内容、提示文字）
- 边框颜色
- 按钮样式
- 状态标签颜色
- 优先级标签颜色
- 错误提示样式
- 加载动画颜色

**关键样式类**:
```css
/* 主容器 */
bg-white dark:bg-gray-800

/* 文字颜色 */
text-gray-800 dark:text-gray-100
text-gray-600 dark:text-gray-300

/* 边框 */
border-gray-200 dark:border-gray-700

/* 按钮 */
bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600
```

#### Profile 页面 (`app/(node-sass)/profile/page.tsx`)

**适配内容**:
- 用户头像背景
- 表单字段样式
- 输入框背景和边框
- 按钮样式
- 加载和错误状态

### 4. 颜色系统

#### 主要颜色适配

| 元素类型 | 浅色模式 | 深色模式 |
|---------|---------|---------|
| 主背景 | `bg-gray-50` | `dark:bg-gray-900` |
| 卡片背景 | `bg-white` | `dark:bg-gray-800` |
| 主文字 | `text-gray-800` | `dark:text-gray-100` |
| 次要文字 | `text-gray-600` | `dark:text-gray-300` |
| 边框 | `border-gray-200` | `dark:border-gray-700` |
| 主按钮 | `bg-blue-600` | `dark:bg-blue-700` |

#### 状态颜色适配

| 状态 | 浅色模式 | 深色模式 |
|-----|---------|---------|
| 成功 | `text-green-600 bg-green-50` | `dark:text-green-400 dark:bg-green-900/20` |
| 进行中 | `text-blue-600 bg-blue-50` | `dark:text-blue-400 dark:bg-blue-900/20` |
| 警告 | `text-yellow-600 bg-yellow-50` | `dark:text-yellow-400 dark:bg-yellow-900/20` |
| 错误 | `text-red-600 bg-red-50` | `dark:text-red-400 dark:bg-red-900/20` |

### 5. 技术实现细节

#### 主题检测
- 使用 `window.matchMedia('(prefers-color-scheme: dark)')` 检测系统主题
- 优先使用用户保存的主题偏好

#### 主题切换
- 通过添加/移除 `dark` 类到 `document.documentElement` 实现
- 使用 Tailwind CSS 的 `dark:` 前缀定义暗色样式

#### 状态管理
- 使用 React `useState` 管理当前主题状态
- 使用 `useEffect` 在组件挂载时初始化主题

#### 持久化
- 使用 `localStorage` 保存用户主题偏好
- 页面刷新后自动恢复用户选择的主题

### 6. 用户体验优化

- **平滑过渡**: 所有颜色变化都添加了 `transition-colors` 类
- **图标反馈**: 主题切换按钮显示对应的太阳/月亮图标
- **工具提示**: 按钮包含 `title` 属性提示当前操作
- **无闪烁**: 主题初始化在组件挂载时完成，避免闪烁

## 使用方法

1. **自动适配**: 首次访问时自动检测系统主题偏好
2. **手动切换**: 点击导航栏右侧的主题切换按钮
3. **持久保存**: 用户选择会自动保存，下次访问时恢复

## 注意事项

- 需要确保 Tailwind CSS 配置中启用了 `darkMode: 'class'`
- 所有新增的组件都应该包含对应的暗色样式
- 图标和图片可能需要单独适配暗色主题

## 后续优化建议

1. 添加主题切换动画效果
2. 支持更多主题色彩方案
3. 为图片添加暗色模式滤镜
4. 添加主题切换的键盘快捷键 