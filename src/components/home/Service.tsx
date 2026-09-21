"use client"
import { useState } from "react"
import Link from "next/link"
import AnimateOnScroll from "@/components/ui/AnimateOnScroll"
import Image from "next/image"

const Service = () => {
   const [modalCircle, setModalCircle] = useState<string | null>(null)

   const circles = [
      { id: 1, title: "Global cxo circle", desc: "Chief Information Officers", logo: "/logos/cio.png", badge: "CIO", href: "https://globalciocircle.com" },
      { id: 2, title: "Global CTO Circle", desc: "Chief Technology Officers", logo: "/logos/cto.png", badge: "CTO" },
      { id: 3, title: "Global CISO Circle", desc: "Chief Information Security Officers", logo: "/logos/ciso.png", badge: "CISO" },
      { id: 4, title: "Global CFO Circle", desc: "Chief Financial Officers", logo: "/logos/cfo.png", badge: "CFO" },
      { id: 5, title: "Global CRO Circle", desc: "Chief Revenue Officers", logo: "/logos/cro-v3.png", badge: "CRO" },
      { id: 6, title: "Global CAIO Circle", desc: "Chief AI Officers", logo: "/logos/caio.png", badge: "CAIO" },
      { id: 7, title: "Global Startup Circle", desc: "Founders & Entrepreneurs", logo: "/logos/startup.png", badge: "F" },
   ]

   return (
      <section id="circles" className="section-py-130" style={{ backgroundColor: "#f7f8fc" }}>
         <div className="container">
            <AnimateOnScroll>
               <div className="row justify-content-center" style={{ marginBottom: "36px" }}>
                  <div className="col-lg-7">
                     <div className="text-center">
                        <span style={{ background: "var(--tg-color-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", fontSize: "13px", marginBottom: "6px", display: "inline-block" }}>Our Ecosystem</span>
                        <h2 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 700, color: "var(--tg-heading-color)", marginBottom: "0" }}>Enterprise CXO Membership Circles. One Global Ecosystem.</h2>
                     </div>
                  </div>
               </div>
            </AnimateOnScroll>
            <div style={{ maxWidth: "1220px", marginInline: "auto" }}>
            <div className="row gutter-y-30 justify-content-center">
               {circles.map((item, idx) => (
                  <div key={item.id} className="col-xl-3 col-lg-4 col-md-6">
                     <AnimateOnScroll delay={idx * 0.08}>
                        {item.href ? (
                           <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
                              <div className="circle-card" style={{
                                 background: "#fff", padding: "30px 20px", borderRadius: "20px", border: "1px solid var(--tg-border-1)",
                                 transition: "all 0.35s ease", height: "100%", position: "relative", overflow: "hidden",
                                 textAlign: "center", cursor: "pointer"
                              }}>
                                 <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "var(--tg-color-gradient)" }} />
                                 <div className="circle-logo-wrap">
                                    {item.logo ? (
                                       <Image src={item.logo} alt={item.title} width={74} height={74} className="circle-logo-img" style={{ width: "74px", height: "74px" }} />
                                    ) : (
                                       <div className="circle-logo-fallback">{item.badge}</div>
                                    )}
                                 </div>
                                 <div className="circle-text">
                                    <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "var(--tg-heading-color)", lineHeight: 1.3 }}>{item.title}</h3>
                                    <p style={{ fontSize: "12px", color: "var(--tg-body-color)", marginBottom: 0 }}>{item.desc}</p>
                                 </div>
                              </div>
                           </a>
                        ) : (
                           <div
                              onClick={() => setModalCircle(item.title)}
                              className="circle-card" style={{
                                 background: "#fff", padding: "30px 20px", borderRadius: "20px", border: "1px solid var(--tg-border-1)",
                                 transition: "all 0.35s ease", height: "100%", position: "relative", overflow: "hidden",
                                 textAlign: "center", cursor: "pointer"
                              }}>
                              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "var(--tg-color-gradient)" }} />
                              <div className="circle-logo-wrap">
                                 {item.logo ? (
                                    <Image src={item.logo} alt={item.title} width={74} height={74} className="circle-logo-img" style={{ width: "74px", height: "74px" }} />
                                 ) : (
                                    <div className="circle-logo-fallback">{item.badge}</div>
                                 )}
                              </div>
                              <div className="circle-text">
                                 <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "var(--tg-heading-color)", lineHeight: 1.3 }}>{item.title}</h3>
                                 <p style={{ fontSize: "12px", color: "var(--tg-body-color)", marginBottom: 0 }}>{item.desc}</p>
                              </div>
                           </div>
                        )}
                     </AnimateOnScroll>
                  </div>
               ))}

            </div>
            </div>

            {/* Learn More — sits below the grid, centered and compact */}
            <AnimateOnScroll delay={0.3}>
               <div className="text-center" style={{ marginTop: "44px" }}>
                  <Link href="/circles" className="cta-learn-more" style={{
                     display: "inline-flex", alignItems: "center", gap: "8px",
                     background: "var(--tg-color-gradient)", color: "#fff",
                     padding: "13px 32px", borderRadius: "50px",
                     fontSize: "15px", fontWeight: 700, textDecoration: "none",
                     boxShadow: "0 8px 24px rgba(10,60,194,0.22)", transition: "all 0.3s ease",
                  }}>
                     Learn More <span>→</span>
                  </Link>
               </div>
            </AnimateOnScroll>

            <AnimateOnScroll delay={0.3}>
               <div className="text-center mt-5">
                  <p style={{ fontSize: "18px", background: "var(--tg-color-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>One Global Ecosystem. Many Leadership Circles. Infinite Impact.</p>
               </div>
            </AnimateOnScroll>

            {/* Coming Soon Modal */}
            {modalCircle && (
               <div onClick={() => setModalCircle(null)} style={{
                  position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)"
               }}>
                  <div onClick={(e) => e.stopPropagation()} style={{
                     background: "#fff", borderRadius: "20px", padding: "40px 32px", maxWidth: "420px", width: "90%",
                     textAlign: "center", boxShadow: "0 24px 48px rgba(0,0,0,0.15)"
                  }}>
                     <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚀</div>
                     <h3 style={{ fontSize: "22px", fontWeight: 700, color: "var(--tg-heading-color)", marginBottom: "12px" }}>
                        {modalCircle} is Coming Soon
                     </h3>
                     <p style={{ fontSize: "15px", color: "var(--tg-body-color)", lineHeight: 1.7, marginBottom: "24px" }}>
                        Our team is building something exceptional. {modalCircle} will launch with the same world-class experience our CXO Circle members already enjoy. Join the waitlist to be the first to know.
                     </p>
                     <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                        <Link href="/membership" style={{
                           background: "var(--tg-color-gradient)", color: "#fff", padding: "12px 24px", borderRadius: "10px",
                           fontWeight: 600, fontSize: "14px", textDecoration: "none"
                        }}>
                           Request Membership
                        </Link>
                        <button onClick={() => setModalCircle(null)} style={{
                           background: "#f1f5f9", color: "var(--tg-heading-color)", padding: "12px 24px", borderRadius: "10px",
                           fontWeight: 600, fontSize: "14px", border: "none", cursor: "pointer"
                        }}>
                           Close
                        </button>
                     </div>
                  </div>
               </div>
            )}

            <style jsx>{`
               .circle-card:hover {
                  transform: translateY(-4px);
                  box-shadow: 0 12px 40px rgba(11,26,74,0.12) !important;
                  border-color: var(--tg-theme-primary) !important;
               }
               .circle-card:hover .circle-logo-wrap {
                   transform: scale(1.1);
               }
               .circle-logo-wrap {
                  margin-bottom: 18px;
                  width: 84px;
                  height: 84px;
                  margin-inline: auto;
                  border-radius: 20px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(242,246,255,0.92));
                  border: 1px solid rgba(11,26,74,0.08);
                  box-shadow: 0 6px 24px rgba(11,26,74,0.08);
                  transition: transform 0.3s ease;
               }
               .circle-logo-img {
                  width: 74px;
                  height: 74px;
                  object-fit: contain;
                  border-radius: 14px;
               }
               .circle-logo-fallback {
                  width: 64px;
                  height: 64px;
                  border-radius: 16px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 20px;
                  font-weight: 800;
                  letter-spacing: 0.5px;
                  color: #fff;
                  background: var(--tg-color-gradient);
               }
               :global(.cta-learn-more):hover {
                  transform: translateY(-2px);
                  box-shadow: 0 12px 30px rgba(10,60,194,0.32);
               }

               /* Mobile: turn the vertical circle cards into compact horizontal
                  rows (icon left, text right) to save vertical space, and shrink
                  the CTA into a small pill button. */
               @media (max-width: 767px) {
                  .circle-card:not(.cta-card) {
                     display: flex;
                     flex-direction: row;
                     align-items: center;
                     text-align: left !important;
                     gap: 16px;
                     padding: 16px 18px !important;
                  }
                  .circle-card:not(.cta-card) .circle-logo-wrap {
                     margin-bottom: 0 !important;
                     margin-inline: 0 !important;
                     width: 76px !important;
                     height: 76px !important;
                     border-radius: 18px;
                     flex-shrink: 0;
                  }
                  .circle-card:not(.cta-card) .circle-logo-img {
                     width: 62px !important;
                     height: 62px !important;
                     object-fit: contain;
                  }
                  .circle-card:not(.cta-card) .circle-logo-fallback {
                     width: 56px !important;
                     height: 56px !important;
                  }
                  /* Stack title + full-form vertically to the right of the icon,
                     taking the remaining width, left-aligned. */
                  .circle-card:not(.cta-card) .circle-text {
                     flex: 1;
                     min-width: 0;
                  }
                  .circle-card:not(.cta-card) h3 {
                     font-size: 17px !important;
                     margin-bottom: 4px !important;
                  }
                  .circle-card:not(.cta-card) p {
                     font-size: 13px !important;
                  }
               }
            `}</style>
         </div>
      </section>
   )
}

export default Service
