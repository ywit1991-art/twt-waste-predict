import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TWT Waste Predict',
    short_name: 'TWT Waste',
    description:
      'สถิติการจัดเก็บขยะเพื่อพยากรณ์ปริมาณขยะทั้งปี - เทศบาลตำบลท่าวังทอง',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f0fdf4',
    theme_color: '#047857',
    lang: 'th',
    scope: '/',
    categories: ['utilities', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: 'บันทึกขยะ',
        short_name: 'บันทึก',
        description: 'บันทึกข้อมูลขยะ',
        url: '/record',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      },
      {
        name: 'ปฏิทิน',
        short_name: 'ปฏิทิน',
        description: 'ดูข้อมูลในปฏิทิน',
        url: '/calendar',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      }
    ]
  };
}