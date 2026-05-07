import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '제작물 리스트 가이드',
  description: '환경장식물 제작물 리스트 추천·발주 가이드 자동화 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 한글 웹폰트 (Google Fonts) — 캔버스 텍스트 + UI 양쪽 모두 지원 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;300;400;500;700;900&family=Noto+Serif+KR:wght@300;400;600;700&family=Nanum+Gothic:wght@400;700;800&family=Nanum+Myeongjo:wght@400;700;800&family=Nanum+Pen+Script&family=Nanum+Brush+Script&family=Gaegu:wght@300;400;700&family=Hi+Melody&family=Single+Day&family=Gowun+Dodum&family=Gowun+Batang:wght@400;700&family=Black+Han+Sans&family=Jua&family=Do+Hyeon&family=Sunflower:wght@300;500;700&family=Gothic+A1:wght@100;300;400;500;700;900&family=IBM+Plex+Sans+KR:wght@100;300;400;500;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&family=Open+Sans:wght@300;400;600;700;800&family=Montserrat:wght@100;300;400;500;700;900&family=Poppins:wght@100;300;400;500;600;700;800;900&family=Lato:wght@100;300;400;700;900&family=Oswald:wght@200;400;500;700&family=Bebas+Neue&family=Playfair+Display:wght@400;500;700;900&family=Merriweather:wght@300;400;700;900&family=Lora:wght@400;500;700&family=JetBrains+Mono:wght@100;300;400;500;700&display=swap"
        />
        {/* Pretendard — CDN */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
        {/* 나눔스퀘어·나눔스퀘어라운드 — 공식 CDN */}
        <link
          rel="stylesheet"
          href="https://hangeul.pstatic.net/hangeul_static/css/nanum-square.css"
        />
        <link
          rel="stylesheet"
          href="https://hangeul.pstatic.net/hangeul_static/css/nanum-square-round.css"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
