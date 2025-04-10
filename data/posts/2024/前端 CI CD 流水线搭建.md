---
title: 前端 CI/CD 流水线搭建
date: 2024-08-01 13:45:29
tags:
  [CI/CD, Frontend, DevOps]  
---

故事背景

随着项目规模扩大，手动部署变得低效。我基于 GitHub Actions 搭建了一个前端 CI/CD 流水线，自动化测试、构建和部署。

设计思路

- 配置 lint 和单元测试。
- 构建并上传到 S3。
- 使用 GitHub Actions 触发工作流。
- 项目准备

```bash
npx create-react-app cicd-demo --template=typescript
cd cicd-demo
npm install --save-dev eslint jest
```

1. GitHub Actions 配置

```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: aws s3 sync ./build/ s3://my-bucket
```

2. 测试文件

```ts
// src/App.test.tsx
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app', () => {
  render(<App />);
  expect(screen.getByText(/hello/i)).toBeInTheDocument();
});
```

------
