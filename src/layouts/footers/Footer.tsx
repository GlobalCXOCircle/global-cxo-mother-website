"use client"
import Link from "next/link"
import ProtectedEmail from "@/components/common/ProtectedEmail"

type FooterLink = { label: string; href: string }
type FooterColumn = { title: string; links: FooterLink[] }

const columns: FooterColumn[] = [
   {
      title: "Company",
      links: [
         { label: "About Us", href: "/about-us" },
         { label: "Circles", href: "/circles" },
         { label: "Membership", href: "/#membership" },
         { label: "Contact", href: "/contact" },
      ],
   },
   {
      title: "Ecosystem",
      links: [
         { label: "Events", href: "/events" },
         { label: "Gallery", href: "/gallery" },
         { label: "Awards", href: "/awards" },
         { label: "Resources", href: "/resources" },
      ],
   },
   {
      title: "Get Involved",
      links: [
         { label: "Request Membership", href: "/membership" },
         { label: "Nominate a Leader", href: "/nominate" },
         { label: "Member Login", href: "/login" },
      ],
   },
   {
      title: "Legal",
      links: [
         { label: "Privacy Policy", href: "/privacy-policy" },
         { label: "Terms of Service", href: "/terms-of-service" },
      ],
   },
]

const Footer = () => {
   const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, link: string) => {
      if (link.startsWith('/#') && typeof window !== 'undefined' && window.location.pathname === '/') {
         const targetId = link.substring(2);
         if (targetId) {
            e.preventDefault();
            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
            window.history.pushState(null, '', link);
         }
      }
   };

   return (
      <footer className="site-footer" style={{ backgroundColor: "#0B1A4A", color: "#fff", position: "relative" }}>
         <div style={{ height: "3px", width: "100%", background: "var(--tg-color-gradient)" }} />

         <div className="container" style={{ paddingTop: "72px" }}>
            <div className="row gutter-y-40" style={{ paddingBottom: "48px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
               <div className="col-lg-4 col-md-12 mb-2 mb-lg-0" style={{ paddingRight: "24px" }}>
                  <Link href="/" style={{ display: "inline-block", marginBottom: "18px" }}>
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img src="/cxo-circle-white.png" alt="Global CXO Circle" style={{ height: "68px", width: "auto" }} loading="lazy" decoding="async" />
                  </Link>
                  <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)", lineHeight: 1.75, maxWidth: "340px", marginBottom: "22px" }}>
                     The premier ecosystem for executive alignment and enterprise outcomes — where global CXOs connect, align, and execute together.
                  </p>
                  <ProtectedEmail user="contactus" domain="globalcxocircle.com" className="footer-email">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
                     </svg>
                  </ProtectedEmail>
               </div>

               {columns.map((col) => (
                  <div key={col.title} className="col-lg-2 col-md-3 col-6">
                     <h4 style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "1.4px" }}>
                        {col.title}
                     </h4>
                     <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "13px" }}>
                        {col.links.map((item) => (
                           <li key={item.href}>
                              <Link
                                 href={item.href}
                                 onClick={(e) => handleScroll(e, item.href)}
                                 className="footer-link"
                                 style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.25s, padding-left 0.25s" }}
                              >
                                 {item.label}
                              </Link>
                           </li>
                        ))}
                     </ul>
                  </div>
               ))}
            </div>

            <div style={{ padding: "24px 0 30px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
               <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: 0 }}>
                  © {new Date().getFullYear()} Global CXO Circle. All rights reserved.
               </p>
               <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: 0 }}>
                  San Francisco, CA
               </p>
            </div>
         </div>

         <style jsx>{`
            .footer-link:hover {
               color: #fff !important;
               padding-left: 4px;
            }
            .footer-email {
               display: inline-flex;
               align-items: center;
               gap: 9px;
               font-size: 14px;
               font-weight: 500;
               color: rgba(255,255,255,0.75);
               text-decoration: none;
               transition: color 0.25s;
            }
            .footer-email:hover {
               color: #9FB5ED;
            }
         `}</style>
      </footer>
   )
}

export default Footer;
