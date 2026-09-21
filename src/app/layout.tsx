import Providers from "@/layouts/Providers";
import "../styles/tailwind.css";
import "../styles/index.scss";
import { Poppins } from 'next/font/google'

const poppins = Poppins({
  subsets: ['latin'],
  display: "swap",
  weight: ['300', '400', '500', '600', '700', '800',],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://globalcxocircle.com");

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Global CXO Circle | From Conversations To Outcomes",
  description: "Where CXOs Connect, Align, and Execute Together. A CXO-led platform that enables structured access to enterprise leaders, advisory engagement, and outcome-driven relationships.",
  openGraph: {
    title: "Global CXO Circle | From Conversations To Outcomes",
    description: "Where CXOs Connect, Align, and Execute Together. A CXO-led platform that enables structured access to enterprise leaders, advisory engagement, and outcome-driven relationships.",
    url: siteUrl,
    siteName: "Global CXO Circle",
    images: [
      {
        url: "/cxo-circle-logo.png",
        width: 1200,
        height: 630,
        alt: "Global CXO Circle Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Global CXO Circle | From Conversations To Outcomes",
    description: "Where CXOs Connect, Align, and Execute Together. A CXO-led platform that enables structured access to enterprise leaders, advisory engagement, and outcome-driven relationships.",
    images: ["/cxo-circle-logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <html lang="en" suppressHydrationWarning={true} data-scroll-behavior="smooth">
      <head>
        <meta name="keywords" content="Global CXO Circle, executive ecosystem, CXO network, CIO circle, leadership, enterprise outcomes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* Files in public/ are served from the site root — a /public/ prefix 404s.
            Favicons are generated from the brand mark (cxo-circle-logo.png) via
            scripts; regenerate with the same source if the logo changes. */}
        <link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32" />
        <link rel="icon" type="image/png" href="/favicon-16.png" sizes="16x16" />
        <link rel="icon" type="image/png" href="/favicon-48.png" sizes="48x48" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Global CXO" />
        <meta name="theme-color" content="#0B1A4A" />
      </head>
      <body className={poppins.className} suppressHydrationWarning={true}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}