"use client"

import NavMenu from "./menu/NavMenu"
import Link from "next/link"
import MobileSidebar from "./menu/MobileSidebar"
import UseSticky from "@/hooks/UseSticky"
import Arrow from "@/components/common/Arrow"
import { useState, useEffect, useRef } from "react"
import { fetchCurrentUserApi, logoutApi } from "@/portal/api/auth"
import { getStoredAccessToken, getStoredUser, setStoredUser, setStoredAccessToken } from "@/portal/api/tokenStorage"
import { USE_API_AUTH } from "@/portal/api/config"
import { getMockSessionUserId, setMockSessionUserId } from "@/portal/lib/mockSession"
import { loadMockDatabaseSnapshot } from "@/portal/lib/mockDatabase"
import type { MockUser } from "@/portal/data/mock/types"

let cachedAuthUser: MockUser | null = null;

const Header = ({ hideSignIn = false, solidNavbar = false }: { hideSignIn?: boolean; solidNavbar?: boolean }) => {

   const { sticky } = UseSticky();
   const [sidebar, setSidebar] = useState<boolean>(false);

   const [authUser, setAuthUser] = useState<MockUser | null>(() => {
      if (cachedAuthUser) return cachedAuthUser;
      if (typeof window !== "undefined") {
         const token = getStoredAccessToken();
         const stored = getStoredUser();
         if (token && stored) {
            cachedAuthUser = stored;
            return stored;
         }
      }
      return null;
   });

   const [hasStoredToken, setHasStoredToken] = useState<boolean>(() => {
      if (typeof window !== "undefined") {
         return !!getStoredAccessToken();
      }
      return false;
   });

   const [menuOpen, setMenuOpen] = useState<boolean>(false);
   const menuRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      if (typeof window === "undefined") return;
      if (!USE_API_AUTH) {
         const uid = getMockSessionUserId();
         const found = uid ? loadMockDatabaseSnapshot().users.find((u) => u.id === uid) ?? null : null;
         cachedAuthUser = found;
         setAuthUser(found);
         return;
      }
      const token = getStoredAccessToken();
      setHasStoredToken(!!token);
      if (!token) {
         cachedAuthUser = null;
         setStoredUser(null);
         setAuthUser(null);
         return;
      }

      // Immediately restore from local storage if not already populated
      if (!authUser) {
         const stored = getStoredUser();
         if (stored) {
            cachedAuthUser = stored;
            setAuthUser(stored);
         }
      }

      let active = true;
      fetchCurrentUserApi()
         .then((user) => {
            if (!active) return;
            if (user) {
               cachedAuthUser = user;
               setStoredUser(user);
               setAuthUser(user);
            } else {
               cachedAuthUser = null;
               setStoredUser(null);
               setStoredAccessToken(null);
               setAuthUser(null);
               setHasStoredToken(false);
            }
         })
         .catch(() => {
            if (!active) return;
            // On transient network errors, keep cached user so the UI stays stable
         });
      return () => { active = false; };
   }, []);

   useEffect(() => {
      const handleOutside = (e: MouseEvent) => {
         if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
            setMenuOpen(false);
         }
      };
      if (menuOpen) document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
   }, [menuOpen]);

   const handleSignOut = () => {
      setMenuOpen(false);
      setAuthUser(null);
      setHasStoredToken(false);
      cachedAuthUser = null;
      setStoredUser(null);
      setStoredAccessToken(null);
      if (!USE_API_AUTH) {
         setMockSessionUserId(null);
         window.location.href = "/";
         return;
      }
      logoutApi().finally(() => {
         window.location.href = "/";
      });
   };

   const isAdminOrDev = authUser?.tier === 'admin' || authUser?.tier === 'dev';

   return (
      <>
         <header>
            <div id="sticky-header" className={`tg-header__area tg-header__style-five ${sticky ? "sticky-menu" : ""} ${solidNavbar ? "solid-navbar" : ""}`}>
               <div className="container custom-container">
                  <div className="row">
                     <div className="col-12">
                        <div className="tgmenu__wrap">
                           <nav className="tgmenu__nav">
                              <div className="logo">
                                 <Link href="/" aria-label="Global CXO Circle homepage" className="brand-logo-link">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/cxo-circle-logo.png" alt="Global CXO Circle" className="logo-icon-img" />
                                    <div className="logo-text-col">
                                       <span className="logo-title">GLOBAL CXO CIRCLE</span>
                                       <span className="logo-sub">LEADERSHIP ECOSYSTEM</span>
                                    </div>
                                 </Link>
                              </div>
                              <div className="tgmenu__navbar-wrap tgmenu__main-menu d-none d-lg-flex">
                                 <NavMenu />
                              </div>
                              <div className="tgmenu__action d-none d-md-block">
                                 <ul className="list-wrap">
                                    <li className="header-btn">
                                       {!hideSignIn && (
                                          authUser ? (
                                             <div className="relative inline-block" ref={menuRef}>
                                                <button
                                                   onClick={() => setMenuOpen(!menuOpen)}
                                                   className="auth-pill-btn"
                                                   aria-expanded={menuOpen}
                                                   aria-haspopup="true"
                                                >
                                                   <span className="auth-pill-avatar">
                                                      {authUser.avatarUrl ? (
                                                         /* eslint-disable-next-line @next/next/no-img-element */
                                                         <img src={authUser.avatarUrl} alt={authUser.name} />
                                                      ) : (
                                                         <span>{authUser.name.charAt(0).toUpperCase()}</span>
                                                      )}
                                                   </span>
                                                   <span className="auth-pill-name">{authUser.name}</span>
                                                   <svg className={`auth-pill-caret ${menuOpen ? "open" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                      <path d="m6 9 6 6 6-6"/>
                                                   </svg>
                                                </button>

                                                {menuOpen && (
                                                   <div className="auth-dropdown-menu">
                                                      <div className="auth-dropdown-header">
                                                         <p className="auth-dropdown-user-name">{authUser.name}</p>
                                                         <p className="auth-dropdown-user-email">{authUser.email}</p>
                                                         <span className="auth-dropdown-badge">{authUser.tier.toUpperCase()}</span>
                                                      </div>
                                                      <div className="auth-dropdown-divider" />
                                                      <Link
                                                         href="/dashboard"
                                                         className="auth-dropdown-item"
                                                         onClick={() => setMenuOpen(false)}
                                                      >
                                                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                                                         Dashboard
                                                      </Link>
                                                      {isAdminOrDev && (
                                                         <Link
                                                            href="/admin"
                                                            className="auth-dropdown-item auth-dropdown-admin"
                                                            onClick={() => setMenuOpen(false)}
                                                         >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                                            Admin Console
                                                         </Link>
                                                      )}
                                                      <Link
                                                         href="/settings"
                                                         className="auth-dropdown-item"
                                                         onClick={() => setMenuOpen(false)}
                                                      >
                                                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                                         Settings
                                                      </Link>
                                                      <div className="auth-dropdown-divider" />
                                                      <button
                                                         onClick={handleSignOut}
                                                         className="auth-dropdown-item auth-dropdown-signout"
                                                      >
                                                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                                                         Sign Out
                                                      </button>
                                                   </div>
                                                )}
                                             </div>
                                          ) : hasStoredToken ? (
                                             <div className="auth-pill-btn opacity-60 pointer-events-none" style={{ minWidth: '120px' }}>
                                                <span className="auth-pill-avatar bg-slate-200 animate-pulse" />
                                                <span className="auth-pill-name bg-slate-200 animate-pulse rounded w-16 h-3 inline-block" />
                                             </div>
                                          ) : (
                                             <Link href="/login" className="header-signin-btn">
                                                Sign In
                                             </Link>
                                          )
                                       )}
                                    </li>
                                 </ul>
                              </div>
                               <div className="mobile-nav-toggler" onClick={() => setSidebar(true)} aria-label="Open mobile menu" style={{ cursor: "pointer", color: "#0B1A4A" }}>
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                     <line x1="3" y1="6" x2="21" y2="6" />
                                     <line x1="3" y1="12" x2="21" y2="12" />
                                     <line x1="3" y1="18" x2="21" y2="18" />
                                  </svg>
                               </div>
                           </nav>
                        </div>
                         <MobileSidebar
                            sidebar={sidebar}
                            setSidebar={setSidebar}
                            authUser={authUser}
                            hasStoredToken={hasStoredToken}
                            isElevated={isAdminOrDev}
                            onLogout={handleSignOut}
                            hideSignIn={hideSignIn}
                         />
                      </div>
                   </div>
                </div>
             </div>
          </header>

         <style jsx>{`
            :global(#sticky-header.tg-header__area.solid-navbar) {
               position: relative !important;
               top: 0 !important;
               left: 0 !important;
               width: 100% !important;
               z-index: 1000 !important;
               background: #ffffff !important;
               border-bottom: 1px solid rgba(10, 60, 194, 0.12) !important;
               box-shadow: 0 4px 20px rgba(11, 26, 74, 0.08) !important;
               padding: 14px 0 !important;
            }
            :global(#sticky-header.tg-header__area.solid-navbar.sticky-menu) {
               position: fixed !important;
               top: 0 !important;
               left: 0 !important;
               width: 100% !important;
               background: rgba(255, 255, 255, 0.98) !important;
               backdrop-filter: blur(12px) !important;
               box-shadow: 0 4px 20px rgba(11, 26, 74, 0.08) !important;
               padding: 12px 0 !important;
               transition: all 0.3s ease !important;
            }
            :global(#sticky-header.tg-header__area:not(.solid-navbar)) {
               position: absolute !important;
               top: 0 !important;
               left: 0 !important;
               width: 100% !important;
               z-index: 1000 !important;
               background: transparent !important;
               border-bottom: none !important;
               box-shadow: none !important;
               padding: 22px 0 !important;
            }
            :global(#sticky-header.tg-header__area.sticky-menu:not(.solid-navbar)) {
               position: fixed !important;
               top: 0 !important;
               left: 0 !important;
               width: 100% !important;
               background: rgba(255, 255, 255, 0.94) !important;
               backdrop-filter: blur(12px) !important;
               box-shadow: 0 4px 20px rgba(11, 26, 74, 0.08) !important;
               padding: 12px 0 !important;
               transition: all 0.3s ease !important;
            }

            /* Prevent navbar items or sign-in/user bubble from wrapping on any screen size */
            :global(.tgmenu__nav) {
               display: flex !important;
               align-items: center !important;
               justify-content: space-between !important;
               flex-wrap: nowrap !important;
               gap: 12px !important;
            }

            :global(.logo) {
               flex-shrink: 0 !important;
            }

            :global(.brand-logo-link) {
               display: inline-flex !important;
               align-items: center !important;
               gap: 10px !important;
               text-decoration: none !important;
               padding: 4px 0 !important;
               white-space: nowrap !important;
            }
            :global(.logo-icon-img) {
               height: 44px !important;
               width: auto !important;
               object-fit: contain !important;
               display: block !important;
               transition: height 0.2s ease !important;
            }
            :global(.logo-text-col) {
               display: flex !important;
               flex-direction: column !important;
               text-align: left !important;
               line-height: 1.15 !important;
            }
            :global(.logo-title) {
               font-size: 19px !important;
               font-weight: 800 !important;
               background: linear-gradient(135deg, #0B1A4A 0%, #0A3CC2 45%, #1652E2 100%) !important;
               -webkit-background-clip: text !important;
               -webkit-text-fill-color: transparent !important;
               background-clip: text !important;
               letter-spacing: 0.5px !important;
               text-transform: uppercase !important;
               transition: font-size 0.2s ease !important;
            }
            :global(.logo-sub) {
               font-size: 10px !important;
               font-weight: 700 !important;
               color: #64748B !important;
               letter-spacing: 1.4px !important;
               text-transform: uppercase !important;
               margin-top: 2px !important;
               transition: font-size 0.2s ease !important;
            }

            :global(.tgmenu__navbar-wrap) {
               flex: 1 1 auto !important;
               display: flex !important;
               justify-content: center !important;
               min-width: 0 !important;
            }

            :global(.tgmenu__navbar-wrap > ul.navigation),
            :global(.tgmenu__main-menu .navigation) {
               display: flex !important;
               align-items: center !important;
               flex-wrap: nowrap !important;
               margin: 0 !important;
               padding: 0 !important;
               list-style: none !important;
               justify-content: center !important;
            }

            :global(.tgmenu__main-menu .navigation > li) {
               flex-shrink: 0 !important;
            }

            :global(.tgmenu__main-menu .navigation > li > a) {
               font-size: 12.5px !important;
               font-weight: 600 !important;
               text-transform: uppercase !important;
               letter-spacing: 0.6px !important;
               color: #0B1A4A !important;
               padding: 8px 12px !important;
               white-space: nowrap !important;
               transition: all 0.2s ease !important;
               display: inline-block !important;
            }
            :global(.tgmenu__main-menu .navigation > li > a:hover),
            :global(.tgmenu__main-menu .navigation > li.active > a) {
               color: #0A3CC2 !important;
            }

            :global(.tgmenu__action) {
               flex-shrink: 0 !important;
               margin-left: auto !important;
            }

            :global(.tgmenu__action .list-wrap) {
               display: flex !important;
               align-items: center !important;
               margin: 0 !important;
               padding: 0 !important;
               list-style: none !important;
            }

            :global(.header-signin-btn) {
               display: inline-flex !important;
               align-items: center !important;
               justify-content: center !important;
               background: var(--tg-color-gradient, linear-gradient(135deg, #0A3CC2 0%, #1E6BFF 100%)) !important;
               color: #ffffff !important;
               font-weight: 700 !important;
               font-size: 13px !important;
               padding: 8px 18px !important;
               border-radius: 0px 12px 0px 12px !important;
               text-decoration: none !important;
               box-shadow: none !important;
               transition: all 0.25s ease !important;
               line-height: 1 !important;
               white-space: nowrap !important;
               flex-shrink: 0 !important;
            }
            :global(.header-signin-btn:hover) {
               opacity: 0.92 !important;
               box-shadow: none !important;
               color: #ffffff !important;
            }

            .auth-pill-btn {
               display: inline-flex;
               align-items: center;
               gap: 8px;
               background: rgba(10, 60, 194, 0.07);
               border: 1px solid rgba(10, 60, 194, 0.2);
               padding: 5px 14px 5px 5px;
               border-radius: 9999px;
               cursor: pointer;
               transition: all 0.2s ease;
               color: var(--tg-heading-color, #0B1A4A);
               font-weight: 600;
               font-size: 13.5px;
               line-height: 1;
               vertical-align: middle;
               white-space: nowrap;
               flex-shrink: 0;
            }
            .auth-pill-btn:hover {
               background: rgba(10, 60, 194, 0.14);
               border-color: rgba(10, 60, 194, 0.35);
            }
            .auth-pill-avatar {
               width: 28px;
               height: 28px;
               border-radius: 50%;
               background: var(--tg-color-gradient, linear-gradient(135deg, #0A3CC2, #1E6BFF));
               color: #fff;
               display: flex;
               align-items: center;
               justify-content: center;
               font-weight: 700;
               font-size: 12px;
               overflow: hidden;
               flex-shrink: 0;
            }
            .auth-pill-avatar img {
               width: 100%;
               height: 100%;
               object-fit: cover;
            }
            .auth-pill-name {
               max-width: 120px;
               white-space: nowrap;
               overflow: hidden;
               text-overflow: ellipsis;
               flex-shrink: 1;
            }
            .auth-pill-caret {
               transition: transform 0.2s ease;
               color: var(--tg-theme-primary, #0A3CC2);
               flex-shrink: 0;
            }
            .auth-pill-caret.open {
               transform: rotate(180deg);
            }

            .auth-dropdown-menu {
               position: absolute;
               top: calc(100% + 8px);
               right: 0;
               width: 240px;
               background: #ffffff;
               border-radius: 14px;
               box-shadow: 0 10px 30px rgba(11, 26, 74, 0.15), 0 0 0 1px rgba(11, 26, 74, 0.08);
               padding: 8px 0;
               z-index: 100;
               animation: fadeIn 0.15s ease;
            }
            .auth-dropdown-header {
               padding: 10px 16px 8px;
            }
            .auth-dropdown-user-name {
               font-weight: 700;
               font-size: 14px;
               color: #0B1A4A;
               margin: 0 0 2px;
               line-height: 1.3;
            }
            .auth-dropdown-user-email {
               font-size: 12px;
               color: #64748b;
               margin: 0 0 6px;
               white-space: nowrap;
               overflow: hidden;
               text-overflow: ellipsis;
            }
            .auth-dropdown-badge {
               display: inline-block;
               font-size: 10px;
               font-weight: 700;
               padding: 2px 8px;
               border-radius: 9999px;
               background: rgba(10, 60, 194, 0.1);
               color: #0A3CC2;
               letter-spacing: 0.5px;
            }
            .auth-dropdown-divider {
               height: 1px;
               background: #e2e8f0;
               margin: 6px 0;
            }
            :global(.auth-dropdown-item) {
               display: flex !important;
               align-items: center !important;
               gap: 10px !important;
               padding: 9px 16px !important;
               font-size: 13.5px !important;
               font-weight: 600 !important;
               color: #334155 !important;
               text-decoration: none !important;
               background: transparent !important;
               border: none !important;
               width: 100% !important;
               text-align: left !important;
               cursor: pointer !important;
               transition: background 0.15s ease, color 0.15s ease !important;
            }
            :global(.auth-dropdown-item:hover) {
               background: #f1f5f9 !important;
               color: #0A3CC2 !important;
            }
            :global(.auth-dropdown-admin:hover) {
               color: #4f46e5 !important;
               background: #eeeffe !important;
            }
            .auth-dropdown-signout {
               color: #dc2626 !important;
            }
            .auth-dropdown-signout:hover {
               background: #fef2f2 !important;
               color: #b91c1c !important;
            }

            /* Responsive scaling for Laptop & Desktop Display Sizes */
            @media (max-width: 1599.98px) {
               :global(.logo-icon-img) {
                  height: 40px !important;
               }
               :global(.logo-title) {
                  font-size: 17.5px !important;
               }
               :global(.logo-sub) {
                  font-size: 9.5px !important;
               }
               :global(.tgmenu__main-menu .navigation > li > a) {
                  font-size: 11.5px !important;
                  padding: 6px 10px !important;
                  letter-spacing: 0.5px !important;
               }
               :global(.header-signin-btn) {
                  font-size: 12.5px !important;
                  padding: 7px 15px !important;
               }
               .auth-pill-btn {
                  padding: 4px 12px 4px 4px;
                  font-size: 13px;
               }
               .auth-pill-name {
                  max-width: 110px;
               }
            }

            @media (max-width: 1399.98px) {
               :global(.logo-icon-img) {
                  height: 36px !important;
               }
               :global(.logo-title) {
                  font-size: 16px !important;
                  letter-spacing: 0.4px !important;
               }
               :global(.logo-sub) {
                  font-size: 8.5px !important;
                  letter-spacing: 1.1px !important;
               }
               :global(.brand-logo-link) {
                  gap: 8px !important;
               }
               :global(.tgmenu__main-menu .navigation > li > a) {
                  font-size: 11px !important;
                  padding: 6px 7px !important;
                  letter-spacing: 0.3px !important;
               }
               :global(.header-signin-btn) {
                  font-size: 12px !important;
                  padding: 6px 13px !important;
               }
               .auth-pill-btn {
                  padding: 4px 10px 4px 4px;
                  font-size: 12.5px;
                  gap: 6px;
               }
               .auth-pill-avatar {
                  width: 26px;
                  height: 26px;
                  font-size: 11px;
               }
               .auth-pill-name {
                  max-width: 95px;
               }
            }

            @media (max-width: 1199.98px) {
               :global(.custom-container) {
                  padding-left: 12px !important;
                  padding-right: 12px !important;
               }
               :global(.logo-icon-img) {
                  height: 32px !important;
               }
               :global(.logo-title) {
                  font-size: 14.5px !important;
                  letter-spacing: 0.2px !important;
               }
               :global(.logo-sub) {
                  font-size: 8px !important;
                  letter-spacing: 0.8px !important;
               }
               :global(.brand-logo-link) {
                  gap: 6px !important;
                  padding: 2px 0 !important;
               }
               :global(.tgmenu__main-menu .navigation > li > a) {
                  font-size: 10px !important;
                  padding: 5px 5px !important;
                  letter-spacing: 0.1px !important;
               }
               :global(.header-signin-btn) {
                  font-size: 11.5px !important;
                  padding: 6px 11px !important;
               }
               .auth-pill-btn {
                  padding: 3px 8px 3px 3px;
                  font-size: 11.5px;
                  gap: 5px;
               }
               .auth-pill-avatar {
                  width: 24px;
                  height: 24px;
                  font-size: 10.5px;
               }
               .auth-pill-name {
                  max-width: 75px;
               }
            }

            @keyframes fadeIn {
               from { opacity: 0; transform: translateY(-4px); }
               to { opacity: 1; transform: translateY(0); }
            }
         `}</style>
      </>
   )
}

export default Header;
