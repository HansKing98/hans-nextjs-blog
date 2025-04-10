---
title: CSS 布局技术详解
date: 2021-02-20 11:30:45
tags:
  [CSS, 布局, 前端基础]  
---

# CSS 布局技术详解

## 一、传统布局方式

### 1. 文档流布局

```css
/* 块级元素 */
div {
  display: block;
  width: 100%;
  margin: 10px 0;
}

/* 行内元素 */
span {
  display: inline;
  margin: 0 5px;
}

/* 行内块元素 */
button {
  display: inline-block;
  width: 100px;
  height: 40px;
}
```

### 2. 浮动布局

```css
/* 左浮动 */
.float-left {
  float: left;
  width: 200px;
  margin-right: 20px;
}

/* 右浮动 */
.float-right {
  float: right;
  width: 200px;
  margin-left: 20px;
}

/* 清除浮动 */
.clearfix::after {
  content: '';
  display: table;
  clear: both;
}
```

### 3. 定位布局

```css
/* 相对定位 */
.relative {
  position: relative;
  top: 10px;
  left: 20px;
}

/* 绝对定位 */
.absolute {
  position: absolute;
  top: 0;
  right: 0;
}

/* 固定定位 */
.fixed {
  position: fixed;
  bottom: 20px;
  right: 20px;
}
```

## 二、Flexbox 布局

### 1. 容器属性

```css
.flex-container {
  display: flex;
  flex-direction: row;        /* 主轴方向 */
  justify-content: center;    /* 主轴对齐 */
  align-items: center;        /* 交叉轴对齐 */
  flex-wrap: wrap;            /* 换行 */
  gap: 10px;                  /* 间距 */
}
```

### 2. 项目属性

```css
.flex-item {
  flex: 1;                    /* 弹性增长 */
  flex-basis: 200px;          /* 基础大小 */
  flex-shrink: 1;             /* 收缩比例 */
  align-self: center;         /* 单独对齐 */
  order: 1;                   /* 排序 */
}
```

### 3. 常见布局示例

```css
/* 两栏布局 */
.two-column {
  display: flex;
}

.sidebar {
  width: 200px;
  flex-shrink: 0;
}

.main {
  flex: 1;
}

/* 垂直居中 */
.vertical-center {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
```

## 三、Grid 布局

### 1. 容器属性

```css
.grid-container {
  display: grid;
  grid-template-columns: 200px 1fr 200px;  /* 列定义 */
  grid-template-rows: 100px auto 100px;     /* 行定义 */
  gap: 20px;                                /* 间距 */
  grid-template-areas:                       /* 区域定义 */
    "header header header"
    "sidebar main aside"
    "footer footer footer";
}
```

### 2. 项目属性

```css
.grid-item {
  grid-column: 1 / 3;        /* 列范围 */
  grid-row: 1 / 2;           /* 行范围 */
  grid-area: header;         /* 区域名称 */
  justify-self: center;      /* 水平对齐 */
  align-self: center;        /* 垂直对齐 */
}
```

### 3. 常见布局示例

```css
/* 响应式网格 */
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

/* 圣杯布局 */
.holy-grail {
  display: grid;
  grid-template: 
    "header header header" 100px
    "nav main aside" 1fr
    "footer footer footer" 100px
    / 200px 1fr 200px;
}
```

## 四、响应式布局

### 1. 媒体查询

```css
/* 移动端优先 */
.container {
  width: 100%;
  padding: 10px;
}

@media (min-width: 768px) {
  .container {
    width: 750px;
    margin: 0 auto;
  }
}

@media (min-width: 992px) {
  .container {
    width: 970px;
  }
}

@media (min-width: 1200px) {
  .container {
    width: 1170px;
  }
}
```

### 2. 响应式单位

```css
.responsive {
  font-size: clamp(1rem, 2vw, 1.5rem);  /* 字体大小 */
  width: min(100%, 1200px);             /* 宽度 */
  padding: max(10px, 2vw);              /* 内边距 */
  margin: min(20px, 5vw);               /* 外边距 */
}
```

### 3. 响应式图片

```css
.responsive-img {
  max-width: 100%;
  height: auto;
}

.background-img {
  background-image: url('small.jpg');
  background-size: cover;
}

@media (min-width: 768px) {
  .background-img {
    background-image: url('large.jpg');
  }
}
```

## 五、布局最佳实践

### 1. 性能优化

```css
/* 使用 transform 代替定位 */
.optimized {
  transform: translate(-50%, -50%);
}

/* 使用 will-change 提示浏览器 */
.animated {
  will-change: transform;
}

/* 避免重排 */
.stable {
  position: fixed;
  transform: translateZ(0);
}
```

### 2. 可维护性

```css
/* 使用 CSS 变量 */
:root {
  --primary-color: #007bff;
  --spacing-unit: 8px;
}

.component {
  color: var(--primary-color);
  margin: calc(var(--spacing-unit) * 2);
}

/* 使用 BEM 命名 */
.block {}
.block__element {}
.block--modifier {}
```

### 3. 浏览器兼容性

```css
/* 使用前缀 */
.prefixed {
  -webkit-box-shadow: 0 0 10px #000;
  -moz-box-shadow: 0 0 10px #000;
  box-shadow: 0 0 10px #000;
}

/* 降级方案 */
.fallback {
  display: flex;
  display: -ms-flexbox;
}
```

## 六、总结

通过本文的学习，我们掌握了：

1. 传统布局方式（文档流、浮动、定位）
2. Flexbox 布局技术
3. Grid 布局技术
4. 响应式布局实现
5. 布局最佳实践

这些布局技术是现代前端开发的基础，建议结合实际项目多加练习。 