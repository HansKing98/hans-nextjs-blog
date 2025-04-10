---
title: HTML5 新特性详解
date: 2021-03-25 14:15:20
tags:
  [HTML5, 前端基础, Web标准]  
---

# HTML5 新特性详解

## 一、语义化标签

### 1. 结构标签

```html
<!-- 页面结构 -->
<header>
  <nav>
    <ul>
      <li><a href="#">首页</a></li>
      <li><a href="#">关于</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>文章标题</h1>
    <section>
      <h2>章节标题</h2>
      <p>文章内容...</p>
    </section>
  </article>
  
  <aside>
    <h3>侧边栏</h3>
    <p>相关内容...</p>
  </aside>
</main>

<footer>
  <p>版权信息</p>
</footer>
```

### 2. 文本标签

```html
<!-- 文本标记 -->
<p>这是一个<mark>高亮</mark>文本</p>
<p>这是一个<time datetime="2021-03-25">日期</time></p>
<p>这是一个<ruby>漢<rt>han</rt></ruby>字</p>
<p>这是一个<wbr>长单词</wbr>换行</p>
```

## 二、表单增强

### 1. 输入类型

```html
<!-- 新的输入类型 -->
<input type="email" placeholder="请输入邮箱">
<input type="url" placeholder="请输入网址">
<input type="number" min="0" max="100" step="1">
<input type="range" min="0" max="100" step="1">
<input type="date" min="2021-01-01" max="2021-12-31">
<input type="color" value="#ff0000">
<input type="search" placeholder="搜索...">
```

### 2. 表单属性

```html
<!-- 表单属性 -->
<input type="text" required placeholder="必填项">
<input type="text" pattern="[A-Za-z]{3}" title="请输入3个字母">
<input type="text" autocomplete="on">
<input type="text" autofocus>
<input type="text" disabled>
<input type="text" readonly>
```

### 3. 表单验证

```html
<!-- 表单验证 -->
<form novalidate>
  <input type="email" required>
  <input type="url" required>
  <input type="number" min="0" max="100" required>
  <button type="submit">提交</button>
</form>
```

## 三、多媒体支持

### 1. 视频播放

```html
<!-- 视频播放 -->
<video controls width="640" height="360" poster="poster.jpg">
  <source src="video.mp4" type="video/mp4">
  <source src="video.webm" type="video/webm">
  <track kind="subtitles" src="subtitles.vtt" srclang="zh" label="中文">
  <p>您的浏览器不支持视频播放</p>
</video>
```

### 2. 音频播放

```html
<!-- 音频播放 -->
<audio controls>
  <source src="audio.mp3" type="audio/mpeg">
  <source src="audio.ogg" type="audio/ogg">
  <p>您的浏览器不支持音频播放</p>
</audio>
```

### 3. Canvas绘图

```html
<!-- Canvas绘图 -->
<canvas id="myCanvas" width="500" height="500"></canvas>

<script>
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// 绘制矩形
ctx.fillStyle = 'red';
ctx.fillRect(10, 10, 100, 100);

// 绘制圆形
ctx.beginPath();
ctx.arc(200, 200, 50, 0, Math.PI * 2);
ctx.fillStyle = 'blue';
ctx.fill();
</script>
```

## 四、本地存储

### 1. Web Storage

```javascript
// localStorage
localStorage.setItem('username', '张三');
const username = localStorage.getItem('username');
localStorage.removeItem('username');
localStorage.clear();

// sessionStorage
sessionStorage.setItem('token', 'abc123');
const token = sessionStorage.getItem('token');
```

### 2. IndexedDB

```javascript
// 打开数据库
const request = indexedDB.open('myDB', 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const store = db.createObjectStore('users', { keyPath: 'id' });
  store.createIndex('name', 'name', { unique: false });
};

// 添加数据
const transaction = db.transaction(['users'], 'readwrite');
const store = transaction.objectStore('users');
store.add({ id: 1, name: '张三' });
```

## 五、Web Workers

### 1. 创建Worker

```javascript
// 主线程
const worker = new Worker('worker.js');

worker.onmessage = (event) => {
  console.log('收到消息：', event.data);
};

worker.postMessage('开始计算');

// worker.js
self.onmessage = (event) => {
  const result = heavyCalculation(event.data);
  self.postMessage(result);
};
```

### 2. 共享Worker

```javascript
// 主线程
const sharedWorker = new SharedWorker('shared-worker.js');

sharedWorker.port.onmessage = (event) => {
  console.log('收到消息：', event.data);
};

sharedWorker.port.postMessage('开始计算');

// shared-worker.js
self.onconnect = (event) => {
  const port = event.ports[0];
  
  port.onmessage = (event) => {
    const result = heavyCalculation(event.data);
    port.postMessage(result);
  };
};
```

## 六、WebSocket

### 1. 建立连接

```javascript
const socket = new WebSocket('ws://example.com/socket');

socket.onopen = () => {
  console.log('连接已建立');
  socket.send('Hello Server!');
};

socket.onmessage = (event) => {
  console.log('收到消息：', event.data);
};

socket.onclose = () => {
  console.log('连接已关闭');
};

socket.onerror = (error) => {
  console.error('发生错误：', error);
};
```

## 七、总结

通过本文的学习，我们掌握了：

1. HTML5语义化标签的使用
2. 增强的表单功能
3. 多媒体支持（视频、音频、Canvas）
4. 本地存储方案
5. Web Workers多线程处理
6. WebSocket实时通信

这些新特性大大提升了Web应用的功能和性能，建议在实际项目中多加应用。 