import { useEffect } from "react";
import Link from "next/link";
import MobileMenus from "./MobileMenu";
import type { MockUser } from "@/portal/data/mock/types";


interface MobileSidebarProps {
   sidebar: boolean;
   setSidebar: (sidebar: boolean) => void;
   authUser?: MockUser | null;
   hasStoredToken?: boolean;
   isElevated?: boolean;
   onLogout?: () => void;
   hideSignIn?: boolean;
}

const MobileSidebar = ({
   sidebar,
   setSidebar,
   authUser = null,
   hasStoredToken = false,
   isElevated = false,
   onLogout,
   hideSignIn = false,
}: MobileSidebarProps) => {

   useEffect(() => {
      if (sidebar) {
         document.body.classList.add('mobile-menu-visible');
      } else {
         document.body.classList.remove('mobile-menu-visible');
      }
      return () => {
         document.body.classList.remove('mobile-menu-visible');
      };
   }, [sidebar]);

   const close = () => setSidebar(false);

   return (
      <div className={`${sidebar ? "mobile-menu-visible" : ""}`}>
         <div className="tgmobile__menu">
            <nav className="tgmobile__menu-box">
               <div onClick={() => setSidebar(false)} className="close-btn"><i className="tg-flaticon-close-1"></i></div>
               <div className="nav-logo" style={{ marginBottom: "20px" }}>
                  <Link href="/">
                     <span className="brand-mark-wrap-sidebar">
                        <div className="logo-icon">
                           <img src="/cxo-circle-logo.png" alt="Global CXO Circle" />
                        </div>
                        <div className="logo-text-wrap">
                           <span className="logo-text" style={{ color: '#0B1A4A' }}>Global CXO Circle</span>
                           <span className="logo-tagline">Leadership Ecosystem</span>
                        </div>
                     </span>
                  </Link>
               </div>
               <div className="tgmobile__menu-outer">
                  <MobileMenus />
               </div>

               {/* Auth section — sign in when logged out, profile actions when
                   signed in. Mirrors the desktop header's user menu so mobile
                   users aren't stranded without access to it. */}
               {!hideSignIn && (
                  <div className="tgmobile__auth">
                     {authUser ? (
                        <>
                           <div className="tgmobile__user">
                              <span className="tgmobile__avatar" aria-hidden="true">
                                 {authUser.name?.trim()?.charAt(0)?.toUpperCase() || "?"}
                              </span>
                              <span className="tgmobile__user-meta">
                                 <span className="tgmobile__user-name">{authUser.name}</span>
                                 {authUser.email && (
                                    <span className="tgmobile__user-sub">{authUser.email}</span>
                                 )}
                              </span>
                           </div>
                           <ul className="tgmobile__auth-links">
                              <li>
                                 <Link href="/dashboard" className="tgmobile__auth-item" onClick={close}>Dashboard</Link>
                              </li>
                              {isElevated && (
                                 <li>
                                    <Link href="/admin" className="tgmobile__auth-item" onClick={close}>Admin Console</Link>
                                 </li>
                              )}
                              <li>
                                 <Link href="/settings" className="tgmobile__auth-item" onClick={close}>Settings</Link>
                              </li>
                              <li>
                                 <button
                                    type="button"
                                    className="tgmobile__auth-item tgmobile__auth-item--danger"
                                    onClick={() => { close(); onLogout?.(); }}
                                 >
                                    Log out
                                 </button>
                              </li>
                           </ul>
                        </>
                     ) : hasStoredToken ? (
                        <div className="tgmobile__user opacity-60">
                           <span className="tgmobile__avatar bg-slate-200 animate-pulse" />
                           <span className="tgmobile__user-meta">
                              <span className="tgmobile__user-name bg-slate-200 animate-pulse w-24 h-3.5 rounded inline-block" />
                           </span>
                        </div>
                     ) : (
                        <Link href="/login" className="tgmobile__signin" onClick={close}>Sign in</Link>
                     )}
                  </div>
               )}
            </nav>
         </div>
         <div onClick={() => setSidebar(false)} className="tgmobile__menu-backdrop"></div>

         <style jsx>{`
            .brand-mark-wrap-sidebar {
               display: flex;
               align-items: center;
               gap: 12px;
               text-decoration: none;
               padding: 20px 25px 0;
            }

            .logo-icon img {
               height: 42px;
               width: auto;
            }

            .logo-text-wrap {
               display: flex;
               flex-direction: column;
               justify-content: center;
               line-height: 1.1;
            }

            .logo-text {
               font-family: 'Plus Jakarta Sans', sans-serif;
               font-size: 18px;
               font-weight: 700;
               letter-spacing: -0.02em;
               text-transform: uppercase;
               color: #0B1A4A !important;
               display: inline-block;
            }

            @supports (background-clip: text) or (-webkit-background-clip: text) {
               .logo-text {
                  background-image: linear-gradient(135deg, #0B1A4A 0%, #0A3CC2 100%);
                  -webkit-background-clip: text;
                  background-clip: text;
                  color: transparent !important;
                  -webkit-text-fill-color: transparent !important;
               }
            }

            .logo-tagline {
               font-size: 9px;
               font-weight: 600;
               letter-spacing: 0.1em;
               text-transform: uppercase;
               color: #64748b;
               margin-top: 2px;
            }

            .tgmobile__auth {
               margin: 16px 25px 0;
               padding-top: 18px;
               border-top: 1px solid rgba(15, 23, 42, 0.08);
            }

            .tgmobile__user {
               display: flex;
               align-items: center;
               gap: 12px;
               margin-bottom: 14px;
            }

            .tgmobile__avatar {
               display: inline-flex;
               align-items: center;
               justify-content: center;
               width: 40px;
               height: 40px;
               border-radius: 999px;
               background: linear-gradient(135deg, #0b1a4a 0%, #0a3cc2 100%);
               color: #fff;
               font-size: 16px;
               font-weight: 700;
               flex-shrink: 0;
            }

            .tgmobile__user-meta {
               display: flex;
               flex-direction: column;
               min-width: 0;
            }

            .tgmobile__user-name {
               font-size: 15px;
               font-weight: 700;
               color: #0b1a4a;
               white-space: nowrap;
               overflow: hidden;
               text-overflow: ellipsis;
            }

            .tgmobile__user-sub {
               font-size: 12px;
               color: #64748b;
               white-space: nowrap;
               overflow: hidden;
               text-overflow: ellipsis;
            }

            .tgmobile__auth-links {
               list-style: none;
               margin: 0;
               padding: 0;
               display: flex;
               flex-direction: column;
               gap: 2px;
            }

            /* :global + parent selector so these win over the marketing theme's
               <a> styling (styled-jsx's scope class does not reliably land on
               next/link). */
            :global(.tgmobile__auth .tgmobile__auth-item) {
               display: block !important;
               width: 100%;
               text-align: left;
               background: none;
               border: none;
               border-radius: 8px;
               padding: 11px 14px !important;
               font-family: var(--tg-body-font-family), sans-serif;
               font-size: 15px !important;
               font-weight: 600 !important;
               line-height: 1.3 !important;
               color: #334155 !important;
               text-decoration: none !important;
               cursor: pointer;
               transition: background 0.15s ease, color 0.15s ease;
            }

            :global(.tgmobile__auth .tgmobile__auth-item:hover) {
               background: #f1f5f9 !important;
               color: #0f172a !important;
            }

            :global(.tgmobile__auth .tgmobile__auth-item--danger) {
               color: #dc2626 !important;
            }

            :global(.tgmobile__auth .tgmobile__auth-item--danger:hover) {
               background: rgba(220, 38, 38, 0.08) !important;
               color: #dc2626 !important;
            }

            :global(.tgmobile__auth .tgmobile__signin) {
               display: block !important;
               text-align: center;
               padding: 13px 20px !important;
               border-radius: 10px;
               background: linear-gradient(135deg, #0b1a4a 0%, #0a3cc2 100%) !important;
               color: #fff !important;
               font-family: var(--tg-heading-font-family), sans-serif;
               font-size: 15px !important;
               font-weight: 700 !important;
               text-decoration: none !important;
            }
         `}</style>
      </div>
   )
}

export default MobileSidebar