import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Patricia Camille S. Morales',
  description: 'The portfolio of Patricia Camille S. Morales, a Bachelor of Arts in Communication undergraduate at Olivarez College.',
  openGraph: { title:'Patricia Camille S. Morales', description:'Communication Portfolio', type:'website', images:['/og.png'] },
  twitter: { card:'summary_large_image', title:'Patricia Camille S. Morales', description:'Communication Portfolio', images:['/og.png'] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
