---
title: uni-app 性能优化实战
date: 2021-03-15 14:20:33
tags:
  [uni-app, Performance, Optimization]  
---

# uni-app 性能优化实战

## 一、性能问题分析

在开发大型 uni-app 项目时，我们遇到了以下几个主要的性能瓶颈：

1. **首屏加载时间长**
   - 主包体积过大
   - 资源加载策略不合理
   - 页面初始化耗时

2. **页面切换卡顿**
   - 页面切换动画不流畅
   - 组件渲染性能问题
   - 数据更新频繁导致重绘

3. **内存占用过高**
   - 图片资源未优化
   - 组件实例未及时销毁
   - 全局状态管理不当

## 二、优化方案

### 1. 分包加载优化

```js
// pages.json
{
  "subPackages": [
    {
      "root": "pages/sub",
      "pages": [
        {
          "path": "index",
          "style": {
            "navigationBarTitleText": "子包"
          }
        }
      ]
    }
  ],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["pages/sub"]
    }
  }
}
```

分包加载的关键点：
- 合理划分业务模块
- 设置预加载规则
- 控制子包大小

### 2. 组件优化

```vue
<template>
  <view>
    <lazy-component v-if="show" />
    <view v-show="!show">占位内容</view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      show: false
    }
  },
  mounted() {
    // 延迟加载非关键组件
    setTimeout(() => {
      this.show = true
    }, 1000)
  }
}
</script>
```

组件优化策略：
- 按需加载非关键组件
- 使用虚拟列表处理长列表
- 合理使用 v-show 和 v-if

### 3. 图片优化

```js
// 图片压缩配置
{
  "app-plus": {
    "image": {
      "quality": 80,
      "maxWidth": 750
    }
  }
}
```

图片优化方案：
- 使用 CDN 加速
- 实现图片懒加载
- 使用 webp 格式
- 合理设置图片尺寸

### 4. 数据缓存优化

```js
// 数据缓存策略
const cache = {
  set(key, data, expire = 3600) {
    try {
      uni.setStorageSync(key, {
        data,
        expire: Date.now() + expire * 1000
      })
    } catch (e) {
      console.error('缓存设置失败', e)
    }
  },
  
  get(key) {
    try {
      const cache = uni.getStorageSync(key)
      if (!cache) return null
      
      if (cache.expire < Date.now()) {
        uni.removeStorageSync(key)
        return null
      }
      
      return cache.data
    } catch (e) {
      console.error('缓存获取失败', e)
      return null
    }
  }
}
```

缓存优化要点：
- 合理设置缓存时间
- 实现缓存自动清理
- 区分静态和动态数据

### 5. 页面渲染优化

```js
// 页面渲染优化
export default {
  data() {
    return {
      list: [],
      loading: false
    }
  },
  methods: {
    async loadData() {
      if (this.loading) return
      this.loading = true
      
      try {
        const data = await this.fetchData()
        // 分批渲染数据
        this.renderData(data)
      } finally {
        this.loading = false
      }
    },
    
    renderData(data) {
      const batchSize = 20
      let index = 0
      
      const renderBatch = () => {
        const batch = data.slice(index, index + batchSize)
        this.list = [...this.list, ...batch]
        index += batchSize
        
        if (index < data.length) {
          requestAnimationFrame(renderBatch)
        }
      }
      
      renderBatch()
    }
  }
}
```

渲染优化策略：
- 实现数据分批渲染
- 使用 requestAnimationFrame
- 避免频繁更新 DOM

## 三、性能监控

```js
// 性能监控
const performance = {
  startTime: Date.now(),
  
  mark(name) {
    performance.marks = performance.marks || {}
    performance.marks[name] = Date.now()
  },
  
  measure(name, startMark, endMark) {
    const duration = performance.marks[endMark] - performance.marks[startMark]
    console.log(`${name} 耗时: ${duration}ms`)
  }
}
```

监控指标：
- 页面加载时间
- 组件渲染时间
- 接口响应时间
- 内存占用情况

## 四、总结

通过以上优化方案，我们成功将应用的性能提升了 50% 以上。主要优化点包括：

1. 合理使用分包加载，减少主包体积
2. 优化组件加载策略，提升首屏速度
3. 实现数据分批渲染，优化页面切换体验
4. 建立完善的性能监控体系

这些优化方案不仅提升了用户体验，也为后续的性能优化提供了数据支持。

js

```js
// 1. 使用分包加载
{
  "subPackages": [
    {
      "root": "pages/sub",
      "pages": [
        {
          "path": "index",
          "style": {
            "navigationBarTitleText": "子包"
          }
        }
      ]
    }
  ]
}

// 2. 组件按需加载
const LazyComponent = () => import('@/components/LazyComponent.vue');
``` 