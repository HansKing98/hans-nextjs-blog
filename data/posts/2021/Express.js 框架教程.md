---
title: Express.js 框架教程
date: 2021-08-30 19:40:15
tags:
  [Express.js, Node.js, Web框架]  
---

# Express.js 框架教程

## 一、Express 基础

### 1. 创建应用

```javascript
const express = require('express');
const app = express();

// 基本路由
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// 启动服务器
app.listen(3000, () => {
  console.log('服务器运行在 http://localhost:3000');
});
```

### 2. 中间件

```javascript
const express = require('express');
const app = express();

// 应用级中间件
app.use((req, res, next) => {
  console.log('Time:', Date.now());
  next();
});

// 路由级中间件
app.use('/user/:id', (req, res, next) => {
  console.log('Request Type:', req.method);
  next();
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
```

## 二、路由处理

### 1. 基本路由

```javascript
const express = require('express');
const app = express();

// GET 请求
app.get('/users', (req, res) => {
  res.send('获取用户列表');
});

// POST 请求
app.post('/users', (req, res) => {
  res.send('创建新用户');
});

// PUT 请求
app.put('/users/:id', (req, res) => {
  res.send(`更新用户 ${req.params.id}`);
});

// DELETE 请求
app.delete('/users/:id', (req, res) => {
  res.send(`删除用户 ${req.params.id}`);
});
```

### 2. 路由参数

```javascript
const express = require('express');
const app = express();

// 路由参数
app.get('/users/:userId/books/:bookId', (req, res) => {
  res.send(req.params);
});

// 查询参数
app.get('/search', (req, res) => {
  res.send(req.query);
});
```

## 三、请求处理

### 1. 请求体解析

```javascript
const express = require('express');
const app = express();

// 解析 JSON 请求体
app.use(express.json());

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true }));

app.post('/users', (req, res) => {
  console.log(req.body);
  res.send('用户创建成功');
});
```

### 2. 文件上传

```javascript
const express = require('express');
const multer = require('multer');
const app = express();

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), (req, res) => {
  res.send('文件上传成功');
});
```

## 四、响应处理

### 1. 发送响应

```javascript
const express = require('express');
const app = express();

// 发送文本
app.get('/text', (req, res) => {
  res.send('Hello World');
});

// 发送 JSON
app.get('/json', (req, res) => {
  res.json({ message: 'Hello World' });
});

// 发送文件
app.get('/file', (req, res) => {
  res.sendFile('/path/to/file.pdf');
});

// 设置状态码
app.get('/status', (req, res) => {
  res.status(404).send('Not Found');
});
```

### 2. 重定向

```javascript
const express = require('express');
const app = express();

// 重定向
app.get('/old', (req, res) => {
  res.redirect('/new');
});

// 带状态码的重定向
app.get('/temp', (req, res) => {
  res.redirect(301, '/permanent');
});
```

## 五、模板引擎

### 1. 配置模板引擎

```javascript
const express = require('express');
const app = express();

// 设置模板引擎
app.set('view engine', 'ejs');

// 设置模板目录
app.set('views', './views');

// 渲染模板
app.get('/', (req, res) => {
  res.render('index', { title: 'Express' });
});
```

### 2. 使用模板

```ejs
<!-- views/index.ejs -->
<!DOCTYPE html>
<html>
<head>
  <title><%= title %></title>
</head>
<body>
  <h1><%= title %></h1>
  <p>Welcome to <%= title %></p>
</body>
</html>
```

## 六、错误处理

### 1. 同步错误

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  throw new Error('发生错误');
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('服务器错误');
});
```

### 2. 异步错误

```javascript
const express = require('express');
const app = express();

app.get('/', async (req, res, next) => {
  try {
    await someAsyncOperation();
    res.send('成功');
  } catch (err) {
    next(err);
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('服务器错误');
});
```

## 七、总结

通过本文的学习，我们掌握了：

1. Express.js的基础概念和创建应用
2. 中间件的使用
3. 路由处理
4. 请求和响应处理
5. 模板引擎的使用
6. 错误处理

这些知识是Express.js开发的基础，建议结合实际项目多加练习。 