interface GalleryImage {
  src: string
  alt: string
}

interface GalleryItem {
  id: number
  title: string
  description: string
  images: GalleryImage[]
  prompt?: string
}

export const galleryItems: GalleryItem[] = [
  {
    id: 1,
    title: '照片转吉卜力风格',
    description: '将普通照片转换为吉卜力工作室标志性的动画风格。',
    images: [
      {
        src: 'https://image.hansking.cn/picgo/%E6%88%AA%E5%B1%8F2025-04-08%2019.21.32.png',
        alt: '吉卜力风格转换',
      },
    ],
    prompt: `convert photo to ghibli style`,
  },
  {
    id: 2,
    title: '走出古书籍的故事',
    description: '创作3D场景，展示古书中武松打虎故事的立体呈现。',
    images: [
      {
        src: 'https://image.hansking.cn/picgo/GobJjorW8AAs9gh.png',
        alt: '古书籍故事',
      },
      {
        src: 'https://image.hansking.cn/picgo/GobJs_AWAAAFOoz.png',
        alt: '古书籍故事2',
      },
    ],
    prompt: `创作一个3D场景，展示一本摊开的古书，书页泛黄，边缘破损，放在木桌上。左页为密密麻麻的古文排版，右页呈现微缩场景，带有裸眼3D效果：一个山林场景，山坡上长满青草和矮树，一只猛虎张牙舞爪，毛色橙黑相间，扑向一位身穿古代布衣的壮汉，壮汉手持木棒，摆出搏斗姿势，周围有碎石和落叶飞扬，山林背景有雾气缭绕。书页周围有微弱光晕，营造立体感，桌上散落几片枯叶和一根羽毛笔，背景为柔和的米黄色，整体氛围充满古风豪迈和历史感。细节精致，色彩浓郁，展现古书的沧桑感和武松打虎的激烈场景。`,
  },
  {
    id: 3,
    title: '线性图标转3D',
    description: '一键将普通线性图标转换为精美的3D立体效果。',
    images: [
      {
        src: 'https://image.hansking.cn/picgo/%E6%88%AA%E5%B1%8F2025-04-08%2019.21.54.png',
        alt: '3D图标转换',
      },
    ],
    prompt: `convert linear icon to 3D`,
  },
  {
    id: 4,
    title: 'Q版3D人物互动',
    description: '将图片中的人物变成皮克斯风格的3D Q版角色，从画中伸出手与现实互动。',
    images: [
      {
        src: 'https://image.hansking.cn/picgo/%E6%88%AA%E5%B1%8F2025-04-08%2019.22.27.png',
        alt: 'Q版3D人物互动',
      },
    ],
    prompt: `画中的人物活了过来与你牵手：把图片里的人物变成3d q版人物，c4d渲染，Pixar 可爱风格，眼睛要大大的，然后这个人物从自己的画里（画是圆角矩形区域）里伸出手与一只真手牵手`,
  },
  {
    id: 5,
    title: 'Q版人像大头照',
    description: '将普通照片转换为萌趣可爱的Q版人像大头照，保持人物特征。',
    images: [
      {
        src: 'https://image.hansking.cn/picgo/%E6%88%AA%E5%B1%8F2025-04-08%2019.23.03.png',
        alt: 'Q版人像大头照',
      },
    ],
    prompt: `把图片变成Q版人像大头照，圆形渐变背景区域，保持人物特征，萌一点`,
  },
  {
    id: 6,
    title: '极简潮玩售货机场景',
    description: '以等距视角呈现的潮玩售货机，展示外部与内部工作间的创意场景。',
    images: [
      {
        src: 'https://image.hansking.cn/picgo/ChatGPT%20Image%202025%E5%B9%B44%E6%9C%888%E6%97%A5%2017_53_12.png',
        alt: '极简潮玩售货机',
      },
    ],
    prompt: `生成一张垂直构图、整体风格干净整洁，并带有极简主义的小型场景，以等距视角呈现。正面视角展示的是一个常规的潮玩售货机，排列着一排排潮玩、投币口和按钮；侧面视角则揭示出贩卖机内部隐藏的一个工作间，里面有一位模型师正在制作潮玩，细节包括灯光与材质质感，浅紫色系`,
  },
]
