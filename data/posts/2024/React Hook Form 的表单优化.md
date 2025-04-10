---
title: React Hook Form 的表单优化
date: 2024-10-22 14:10:55
tags:
  [React, Forms, Performance]  
---

故事背景

传统表单开发繁琐且性能不高。我尝试用 React Hook Form 重构了一个复杂表单，效果显著。

设计思路

- 使用 useForm 管理表单状态。
- 集成 Zod 进行验证。
- 项目初始化

```bash
npx create-react-app form-demo --template=typescript
npm install react-hook-form zod @hookform/resolvers
```

1. 表单组件


```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function Form() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => console.log(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <p>{errors.email.message}</p>}
      <input {...register('password')} type="password" />
      {errors.password && <p>{errors.password.message}</p>}
      <button type="submit">Submit</button>
    </form>
  );
}
```
