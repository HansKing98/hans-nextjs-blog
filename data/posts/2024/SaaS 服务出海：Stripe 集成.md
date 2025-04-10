---
title: Stripe 集成
date: 2024-10-05 11:20:33
tags:
  [SaaS, Stripe, Payment]  
---
故事背景

开发面向海外市场的 SaaS 时，支付功能必不可少。我选择 Stripe 并将其集成到 Next.js 项目中。

设计思路

- 使用 Stripe.js 处理前端支付。
- 配置后端 API 处理订单。
- 项目初始化

```bash
npx create-next-app@latest stripe-demo --typescript
npm install stripe @stripe/stripe-js
```

1. 前端支付组件

```tsx
// app/checkout/page.tsx
'use client';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);

export default function Checkout() {
  const handleClick = async () => {
    const stripe = await stripePromise;
    const res = await fetch('/api/checkout', { method: 'POST' });
    const { id } = await res.json();
    stripe?.redirectToCheckout({ sessionId: id });
  };
  return <button onClick={handleClick}>Pay Now</button>;
}
```

2. 后端 API


```ts
// app/api/checkout/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export async function POST() {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: 'price_123', quantity: 1 }],
    mode: 'payment',
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
  });
  return new Response(JSON.stringify({ id: session.id }), { status: 200 });
}
```
