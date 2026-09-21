import Providers from "@/layouts/Providers";
import "../styles/tailwind.css";
import "../styles/index.scss";
import { Poppins } from 'next/font/google'

const poppins = Poppins({
  subsets: ['latin'],
  display: "swap",
  weight: ['300', '400', '500', '600', '700', '800',],
});

const siteUrl = "https://www.globalcxocircle.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Global CXO Circle | Enterprise Leadership Ecosystem & Membership",
  description: "Global CXO Circle is an exclusive leadership ecosystem and enterprise CXO membership network connecting top global executives to drive collaborative innovation and actionable outcomes.",
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Global CXO Circle | Enterprise Leadership Ecosystem & Membership",
    description: "Global CXO Circle is an exclusive leadership ecosystem and enterprise CXO membership network connecting top global executives to drive collaborative innovation and actionable outcomes.",
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
    title: "Global CXO Circle | Enterprise Leadership Ecosystem & Membership",
    description: "Global CXO Circle is an exclusive leadership ecosystem and enterprise CXO membership network connecting top global executives to drive collaborative innovation and actionable outcomes.",
    images: ["/cxo-circle-logo.png"],
  },
};

const jsonLdData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      "name": "Global CXO Circle",
      "url": siteUrl,
      "logo": `${siteUrl}/cxo-circle-logo.png`,
      "sameAs": [
        "https://www.linkedin.com/company/global-cxo-circle"
      ],
      "description": "An exclusive leadership ecosystem and enterprise CXO membership network connecting top global executives to drive collaborative innovation and actionable outcomes."
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      "url": siteUrl,
      "name": "Global CXO Circle",
      "description": "Where Global CXOs Converge. Exclusive enterprise leadership ecosystem and membership.",
      "publisher": {
        "@id": `${siteUrl}/#organization`
      }
    }
  ]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning={true} data-scroll-behavior="smooth">
      <head>
        <meta charSet="utf-8" />
        <meta name="keywords" content="Global CXO Circle, executive ecosystem, enterprise membership, CXO network, CIO circle, leadership, enterprise outcomes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <link rel="canonical" href={siteUrl} />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32" />
        <link rel="icon" type="image/png" href="/favicon-16.png" sizes="16x16" />
        <link rel="icon" type="image/png" href="/favicon-48.png" sizes="48x48" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Global CXO" />
        <meta name="theme-color" content="#0B1A4A" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body className={poppins.className} suppressHydrationWarning={true}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}