---
title: Node.js 基础教程
date: 2021-07-25 18:30:45
tags:
  [Node.js, JavaScript, 后端开发]  
---

# Node.js 基础教程

## 一、Node.js 基础概念

### 1. 模块系统

```javascript
// 导出模块
// math.js
const add = (a, b) => a + b;
const subtract = (a, b) => a - b;

module.exports = {
  add,
  subtract
};

// 导入模块
// app.js
const math = require('./math');
console.log(math.add(1, 2)); // 3
```

### 2. 全局对象

```javascript
// 常用全局对象
console.log(process.env); // 环境变量
console.log(__dirname);   // 当前目录
console.log(__filename);  // 当前文件路径

// 定时器
setTimeout(() => {
  console.log('1秒后执行');
}, 1000);

setInterval(() => {
  console.log('每秒执行一次');
}, 1000);
```

## 二、文件系统

### 1. 文件操作

```javascript
const fs = require('fs');

// 读取文件
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});

// 写入文件
fs.writeFile('file.txt', 'Hello World', (err) => {
  if (err) throw err;
  console.log('文件已保存');
});

// 追加内容
fs.appendFile('file.txt', '\nNew Line', (err) => {
  if (err) throw err;
  console.log('内容已追加');
});
```

### 2. 目录操作

```javascript
const fs = require('fs');

// 创建目录
fs.mkdir('newDir', (err) => {
  if (err) throw err;
  console.log('目录已创建');
});

// 读取目录
fs.readdir('.', (err, files) => {
  if (err) throw err;
  files.forEach(file => {
    console.log(file);
  });
});
```

## 三、HTTP 服务器

### 1. 创建服务器

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
});

server.listen(3000, () => {
  console.log('服务器运行在 http://localhost:3000/');
});
```

### 2. 处理请求

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  // 获取请求方法
  const method = req.method;
  
  // 获取请求URL
  const url = req.url;
  
  // 获取请求头
  const headers = req.headers;
  
  // 获取请求体
  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });
  
  req.on('end', () => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      method,
      url,
      headers,
      body
    }));
  });
});

server.listen(3000);
```

## 四、事件处理

### 1. 事件发射器

```javascript
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();

// 监听事件
myEmitter.on('event', () => {
  console.log('事件触发');
});

// 触发事件
myEmitter.emit('event');
```

### 2. 事件参数

```javascript
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();

myEmitter.on('event', (a, b) => {
  console.log(a, b);
});

myEmitter.emit('event', 'a', 'b');
```

## 五、流处理

### 1. 可读流

```javascript
const fs = require('fs');

const readableStream = fs.createReadStream('file.txt');

readableStream.on('data', chunk => {
  console.log(`接收到 ${chunk.length} 字节的数据`);
});

readableStream.on('end', () => {
  console.log('读取完成');
});
```

### 2. 可写流

```javascript
const fs = require('fs');

const writableStream = fs.createWriteStream('output.txt');

writableStream.write('第一行\n');
writableStream.write('第二行\n');
writableStream.end('最后一行\n');
```

## 六、错误处理

### 1. 同步错误

```javascript
try {
  // 可能出错的代码
  throw new Error('发生错误');
} catch (err) {
  console.error(err.message);
}
```

### 2. 异步错误

```javascript
const fs = require('fs');

fs.readFile('不存在的文件.txt', (err, data) => {
  if (err) {
    console.error('读取文件出错:', err.message);
    return;
  }
  console.log(data);
});
```

## 七、总结

通过本文的学习，我们掌握了：

1. Node.js的基础概念和模块系统
2. 文件系统操作
3. HTTP服务器创建和请求处理
4. 事件处理机制
5. 流处理
6. 错误处理

这些知识是Node.js开发的基础，建议结合实际项目多加练习。 