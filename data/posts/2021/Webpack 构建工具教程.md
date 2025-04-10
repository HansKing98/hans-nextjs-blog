---
title: Webpack 构建工具教程
date: 2021-10-30 21:40:15
tags:
  [Webpack, 构建工具, 前端工程化]  
---

# Webpack 构建工具教程

## 一、Webpack 基础

### 1. 基本配置

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  // 入口文件
  entry: './src/index.js',
  
  // 输出配置
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  
  // 开发模式
  mode: 'development',
  
  // 开发工具
  devtool: 'source-map'
};
```

### 2. 加载器配置

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      // CSS 加载器
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      
      // 图片加载器
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ['file-loader']
      },
      
      // Babel 加载器
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
};
```

## 二、插件使用

### 1. 常用插件

```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  plugins: [
    // 清理输出目录
    new CleanWebpackPlugin(),
    
    // 生成HTML文件
    new HtmlWebpackPlugin({
      title: 'Webpack Demo',
      template: './src/index.html'
    }),
    
    // 提取CSS
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ]
};
```

### 2. 自定义插件

```javascript
class MyPlugin {
  apply(compiler) {
    compiler.hooks.emit.tap('MyPlugin', compilation => {
      // 在生成资源到 output 目录之前执行
      for (const name in compilation.assets) {
        if (name.endsWith('.js')) {
          const contents = compilation.assets[name].source();
          const withoutComments = contents.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
          compilation.assets[name] = {
            source: () => withoutComments,
            size: () => withoutComments.length
          };
        }
      }
    });
  }
}

module.exports = {
  plugins: [
    new MyPlugin()
  ]
};
```

## 三、开发环境配置

### 1. 开发服务器

```javascript
const webpack = require('webpack');

module.exports = {
  devServer: {
    contentBase: './dist',
    hot: true,
    port: 3000,
    open: true
  },
  
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ]
};
```

### 2. 代理配置

```javascript
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        pathRewrite: { '^/api': '' }
      }
    }
  }
};
```

## 四、生产环境优化

### 1. 代码分割

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  }
};
```

### 2. 压缩优化

```javascript
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = {
  optimization: {
    minimizer: [
      new TerserPlugin(),
      new OptimizeCSSAssetsPlugin()
    ]
  }
};
```

## 五、高级特性

### 1. 动态导入

```javascript
// 使用 import() 动态导入
button.addEventListener('click', () => {
  import('./math').then(module => {
    console.log(module.add(16, 26));
  });
});
```

### 2. 环境变量

```javascript
const webpack = require('webpack');

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    })
  ]
};
```

## 六、性能优化

### 1. 缓存优化

```javascript
module.exports = {
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist')
  },
  
  optimization: {
    runtimeChunk: 'single',
    moduleIds: 'deterministic'
  }
};
```

### 2. 构建分析

```javascript
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin()
  ]
};
```

## 七、总结

通过本文的学习，我们掌握了：

1. Webpack的基础配置
2. 加载器和插件的使用
3. 开发环境配置
4. 生产环境优化
5. 高级特性
6. 性能优化

这些知识是Webpack开发的基础，建议结合实际项目多加练习。 