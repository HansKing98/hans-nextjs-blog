---
title: MongoDB 数据库教程
date: 2021-09-25 20:30:30
tags:
  [MongoDB, 数据库, NoSQL]  
---

# MongoDB 数据库教程

## 一、MongoDB 基础

### 1. 基本概念

```javascript
// 数据库
use mydb;  // 创建或切换到数据库

// 集合
db.createCollection("users");  // 创建集合
db.users.drop();  // 删除集合

// 文档
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "name": "张三",
  "age": 25,
  "email": "zhangsan@example.com"
}
```

### 2. 数据类型

```javascript
// 基本类型
{
  "string": "字符串",
  "number": 123,
  "boolean": true,
  "null": null,
  "array": [1, 2, 3],
  "object": { "key": "value" },
  "date": new Date(),
  "objectId": ObjectId()
}
```

## 二、CRUD 操作

### 1. 插入文档

```javascript
// 插入单个文档
db.users.insertOne({
  name: "张三",
  age: 25,
  email: "zhangsan@example.com"
});

// 插入多个文档
db.users.insertMany([
  {
    name: "李四",
    age: 30,
    email: "lisi@example.com"
  },
  {
    name: "王五",
    age: 28,
    email: "wangwu@example.com"
  }
]);
```

### 2. 查询文档

```javascript
// 查询所有文档
db.users.find();

// 条件查询
db.users.find({ age: { $gt: 25 } });

// 投影查询
db.users.find({}, { name: 1, email: 1 });

// 排序
db.users.find().sort({ age: -1 });

// 分页
db.users.find().skip(10).limit(5);
```

### 3. 更新文档

```javascript
// 更新单个文档
db.users.updateOne(
  { name: "张三" },
  { $set: { age: 26 } }
);

// 更新多个文档
db.users.updateMany(
  { age: { $lt: 30 } },
  { $inc: { age: 1 } }
);

// 替换文档
db.users.replaceOne(
  { name: "张三" },
  { name: "张三", age: 26, email: "new@example.com" }
);
```

### 4. 删除文档

```javascript
// 删除单个文档
db.users.deleteOne({ name: "张三" });

// 删除多个文档
db.users.deleteMany({ age: { $lt: 30 } });
```

## 三、索引

### 1. 创建索引

```javascript
// 单字段索引
db.users.createIndex({ name: 1 });

// 复合索引
db.users.createIndex({ name: 1, age: -1 });

// 唯一索引
db.users.createIndex({ email: 1 }, { unique: true });

// 文本索引
db.users.createIndex({ name: "text", email: "text" });
```

### 2. 索引管理

```javascript
// 查看索引
db.users.getIndexes();

// 删除索引
db.users.dropIndex("name_1");

// 删除所有索引
db.users.dropIndexes();
```

## 四、聚合操作

### 1. 基本聚合

```javascript
// 分组统计
db.users.aggregate([
  { $group: { _id: "$age", count: { $sum: 1 } } }
]);

// 条件过滤
db.users.aggregate([
  { $match: { age: { $gt: 25 } } }
]);

// 排序
db.users.aggregate([
  { $sort: { age: -1 } }
]);
```

### 2. 高级聚合

```javascript
// 多阶段聚合
db.users.aggregate([
  { $match: { age: { $gt: 25 } } },
  { $group: { _id: "$age", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);

// 连接查询
db.users.aggregate([
  {
    $lookup: {
      from: "orders",
      localField: "_id",
      foreignField: "userId",
      as: "orders"
    }
  }
]);
```

## 五、数据模型

### 1. 文档关系

```javascript
// 嵌入式文档
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "name": "张三",
  "address": {
    "street": "123 Main St",
    "city": "北京",
    "zip": "100000"
  }
}

// 引用式文档
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "name": "张三",
  "orders": [
    ObjectId("507f1f77bcf86cd799439012"),
    ObjectId("507f1f77bcf86cd799439013")
  ]
}
```

### 2. 数据验证

```javascript
// 创建集合时定义验证规则
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "age", "email"],
      properties: {
        name: {
          bsonType: "string",
          description: "必须是一个字符串"
        },
        age: {
          bsonType: "int",
          minimum: 0,
          maximum: 120
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        }
      }
    }
  }
});
```

## 六、总结

通过本文的学习，我们掌握了：

1. MongoDB的基础概念和数据类型
2. 基本的CRUD操作
3. 索引的创建和管理
4. 聚合操作
5. 数据模型设计
6. 数据验证

这些知识是MongoDB开发的基础，建议结合实际项目多加练习。 