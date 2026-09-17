"use client"
import React, { useState, useEffect } from "react"
import { API_BASE_URL } from "@/portal/api/config"

const SHAREPOINT_LINK = "https://globalcxocircle.sharepoint.com/:f:/s/EventPics/IgAJqikt6aK0RbRi3Kj37uYrAfHomYc1KFuY3Lk0Yh0jTM4?e=8OUcPv"

const DIRECT_BACKEND_ENDPOINT = `${API_BASE_URL}/events/gallery-leads`

function getGalleryLeadsEndpoint(): string {
    // Primary: use the Next.js API proxy (same-origin, avoids corporate firewall blocks)
    return "/api/gallery-leads"
}

interface MediaItem {
    id: string
    thumb: string
    full: string
}

const mediaItems: MediaItem[] = [
    { id: "1", thumb: "/events/cio100-gallery/CIO100%20Awards%20%26%20Conference-154.jpg", full: "/events/cio100-gallery/CIO100%20Awards%20%26%20Conference-154.jpg" },
    { id: "2", thumb: "/events/cio100-gallery/CIO100-2026-542.jpg", full: "/events/cio100-gallery/CIO100-2026-542.jpg" },
    { id: "3", thumb: "/events/cio100-gallery/CIO100%20Awards%20%26%20Conference-66.jpg", full: "/events/cio100-gallery/CIO100%20Awards%20%26%20Conference-66.jpg" },
    { id: "4", thumb: "/events/cio100-gallery/CIO100-2026-491.jpg", full: "/events/cio100-gallery/CIO100-2026-491.jpg" },
    { id: "5", thumb: "/events/cio100-gallery/CIO100%20Awards%20%26%20Conference-60.jpg", full: "/events/cio100-gallery/CIO100%20Awards%20%26%20Conference-60.jpg" },
    { id: "6", thumb: "/events/cio100-gallery/CIO100-2026-553.jpg", full: "/events/cio100-gallery/CIO100-2026-553.jpg" },
    { id: "7", thumb: "/events/cio100-gallery/CIO100%20Awards%20%26%20Conference-2.jpg", full: "/events/cio100-gallery/CIO100%20Awards%20%26%20Conference-2.jpg" },
    { id: "8", thumb: "/events/cio100-gallery/CIO100%20Awards%20%26%20Conference-131.jpg", full: "/events/cio100-gallery/CIO100%20Awards%20%26%20Conference-131.jpg" },
]

const ACCESS_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const STORAGE_KEY = "gcxo_gallery_access_cio100"

function checkIsUnlocked(): boolean {
    if (typeof window === "undefined") return false
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return false
        const parsed = JSON.parse(stored)
        if (parsed?.unlocked && parsed?.unlockedAt) {
            const age = Date.now() - Number(parsed.unlockedAt)
            if (age < ACCESS_EXPIRY_MS) {
                return true
            }
            localStorage.removeItem(STORAGE_KEY)
        }
    } catch {
        try {
            if (localStorage.getItem(STORAGE_KEY) === "true") return true
        } catch {}
    }
    return false
}

export default function CIO100MediaAccess() {
    const [isHydrated, setIsHydrated] = useState(false)
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [linkedinProfile, setLinkedinProfile] = useState("")
    const [consent, setConsent] = useState(false)

    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
    const [errorMsg, setErrorMsg] = useState("")

    // Check if user has already unlocked the gallery within the last 7 days
    useEffect(() => {
        setIsUnlocked(checkIsUnlocked())
        setIsHydrated(true)
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !linkedinProfile.trim()) {
            setErrorMsg("Please fill in all required fields.")
            setStatus("error")
            return
        }
        // Validate LinkedIn profile URL
        const linkedinUrl = linkedinProfile.trim()
        if (!/^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+(\/)?(\?[^\s]*)?(\#[^\s]*)?$/i.test(linkedinUrl)) {
            setErrorMsg("Please enter a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/your-name).")
            setStatus("error")
            return
        }
        if (!consent) {
            setErrorMsg("Please check the consent box to proceed.")
            setStatus("error")
            return
        }

        setStatus("submitting")
        setErrorMsg("")

        try {
            const payload = {
                event_slug: "cio-100-awards-conference",
                first_name: firstName.trim() || "Attendee",
                last_name: lastName.trim() || "",
                email: email.trim().toLowerCase(),
                company: linkedinProfile.trim(),
                consent,
            }

            const primaryEndpoint = getGalleryLeadsEndpoint()

            // Primary: same-origin Next.js API proxy with timeout
            const primaryController = new AbortController()
            const primaryTimeout = setTimeout(() => primaryController.abort(), 15000)
            let res: Response | null = await fetch(primaryEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(payload),
                signal: primaryController.signal,
            }).catch(() => null).finally(() => clearTimeout(primaryTimeout))

            const primaryStatus = res?.status ?? null
            let fallbackAttempted = false
            let fallbackStatus: number | null = null

            // Fallback: direct Railway backend.
            // Trigger on: network failure (null), 5xx server error, or 404 from our own
            // proxy (means the Next.js route wasn't deployed yet — not a bad request).
            const proxyNotFound = primaryStatus === 404
            if (!res || res.status >= 500 || proxyNotFound) {
                fallbackAttempted = true
                const fallbackController = new AbortController()
                const fallbackTimeout = setTimeout(() => fallbackController.abort(), 15000)
                const fallbackRes = await fetch(DIRECT_BACKEND_ENDPOINT, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify(payload),
                    signal: fallbackController.signal,
                }).catch(() => null).finally(() => clearTimeout(fallbackTimeout))

                fallbackStatus = fallbackRes?.status ?? null
                res = fallbackRes
            }

            if (res && res.ok) {
                setStatus("success")
                try {
                    localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify({ unlocked: true, unlockedAt: Date.now() })
                    )
                } catch {}
                setIsUnlocked(true)
                return
            }

            // Both primary and fallback failed — infrastructure issue on our side.
            // Grant gallery access silently and log the submission server-side so
            // no user data is lost. Fire-and-forget: do not await or show any error.
            //
            // Only show an error for known user-rejection codes from the backend:
            //   400 Bad Request · 409 Conflict (duplicate) · 422 Unprocessable Entity
            // Everything else (404, 405, 5xx, null/network failure) = infrastructure
            // problem — grant silent access rather than blocking the user.
            const isKnownUserError =
                res !== null && (res.status === 400 || res.status === 409 || res.status === 422)
            const shouldGrantSilentAccess = !isKnownUserError

            if (shouldGrantSilentAccess) {
                // Fire-and-forget log request — user never sees a failure
                fetch("/api/log-gallery-failure", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    keepalive: true,
                    body: JSON.stringify({
                        payload,
                        primaryStatus,
                        fallbackAttempted,
                        fallbackStatus,
                        timestamp: new Date().toISOString(),
                    }),
                }).catch(() => {/* best-effort, ignore */})

                // Grant access
                try {
                    localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify({ unlocked: true, unlockedAt: Date.now() })
                    )
                } catch {}
                setStatus("success")
                setIsUnlocked(true)
                return
            }

            // 4xx from the backend (validation error etc.) — surface the message
            const data = res ? await res.json().catch(() => ({})) : {}
            let errMsg = "Failed to record response. Please try again."
            if (typeof data?.detail === "string") {
                errMsg = data.detail
            } else if (Array.isArray(data?.detail)) {
                errMsg = data.detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ")
            } else if (data?.error) {
                errMsg = String(data.error)
            } else if (res && res.status) {
                errMsg = `Server error (${res.status}). Please try again.`
            }

            setErrorMsg(errMsg)
            setStatus("error")
        } catch (err: any) {
            setErrorMsg("Network error — please check your connection and try again.")
            setStatus("error")
        }
    }

    return (
        <section id="media-download" style={{ padding: "60px 0", background: "var(--tg-common-color-grey-1, #f8f9fa)" }}>
            <div className="container" style={{ maxWidth: "980px" }}>
                {!isHydrated ? (
                    <div
                        style={{
                            background: "#ffffff",
                            borderRadius: "20px",
                            padding: "clamp(28px, 4vw, 48px)",
                            border: "1px solid var(--tg-border-1, #e2e8f0)",
                            boxShadow: "0 8px 30px rgba(11,26,74,0.06)",
                            minHeight: "420px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "12px",
                            opacity: 0.6,
                        }}
                    >
                        <div style={{ width: "120px", height: "14px", background: "#e2e8f0", borderRadius: "6px" }} />
                        <div style={{ width: "340px", maxWidth: "85%", height: "26px", background: "#e2e8f0", borderRadius: "8px" }} />
                        <div style={{ width: "240px", maxWidth: "65%", height: "14px", background: "#f1f5f9", borderRadius: "6px" }} />
                    </div>
                ) : !isUnlocked ? (
                    <div
                        style={{
                            background: "#ffffff",
                            borderRadius: "20px",
                            padding: "clamp(28px, 4vw, 48px)",
                            boxShadow: "0 8px 30px rgba(11,26,74,0.06)",
                            border: "1px solid var(--tg-border-1, #e2e8f0)",
                            maxWidth: "720px",
                            margin: "0 auto",
                        }}
                    >
                        <div className="text-center" style={{ marginBottom: "32px" }}>
                            <span
                                style={{
                                    background: "var(--tg-color-gradient)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "1.5px",
                                    fontSize: "12px",
                                    display: "block",
                                    marginBottom: "8px",
                                }}
                            >
                                CIO 100 AWARDS 2026
                            </span>
                            <h2
                                style={{
                                    fontSize: "clamp(24px, 3vw, 34px)",
                                    fontWeight: 800,
                                    color: "var(--tg-heading-color, #0b1020)",
                                    marginBottom: "12px",
                                }}
                            >
                                Download Your Event Photos &amp; Videos
                            </h2>
                            <p style={{ color: "var(--tg-body-color, #64748b)", fontSize: "15px", maxWidth: "520px", margin: "0 auto", lineHeight: 1.6 }}>
                                Enter your details to access and download exclusive photos and videos from the CIO 100 Awards 2026.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--tg-heading-color, #1e293b)", marginBottom: "6px", display: "block" }}>
                                        First Name <span style={{ color: "#e11d48" }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="John"
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "12px 16px",
                                            borderRadius: "12px",
                                            border: "1.5px solid var(--tg-border-1, #cbd5e1)",
                                            fontSize: "14.5px",
                                            outline: "none",
                                            background: "#f8fafc",
                                            color: "var(--tg-heading-color, #0f172a)",
                                        }}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--tg-heading-color, #1e293b)", marginBottom: "6px", display: "block" }}>
                                        Last Name <span style={{ color: "#e11d48" }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Doe"
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "12px 16px",
                                            borderRadius: "12px",
                                            border: "1.5px solid var(--tg-border-1, #cbd5e1)",
                                            fontSize: "14.5px",
                                            outline: "none",
                                            background: "#f8fafc",
                                            color: "var(--tg-heading-color, #0f172a)",
                                        }}
                                    />
                                </div>

                                <div className="col-12">
                                    <label style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--tg-heading-color, #1e293b)", marginBottom: "6px", display: "block" }}>
                                        Work Email Address <span style={{ color: "#e11d48" }}>*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="john.doe@company.com"
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "12px 16px",
                                            borderRadius: "12px",
                                            border: "1.5px solid var(--tg-border-1, #cbd5e1)",
                                            fontSize: "14.5px",
                                            outline: "none",
                                            background: "#f8fafc",
                                            color: "var(--tg-heading-color, #0f172a)",
                                        }}
                                    />
                                </div>

                                <div className="col-12">
                                    <label style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--tg-heading-color, #1e293b)", marginBottom: "6px", display: "block" }}>
                                        LinkedIn Profile <span style={{ color: "#e11d48" }}>*</span>
                                    </label>
                                    <input
                                        type="url"
                                        value={linkedinProfile}
                                        onChange={(e) => setLinkedinProfile(e.target.value)}
                                        placeholder="https://www.linkedin.com/in/your-name"
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "12px 16px",
                                            borderRadius: "12px",
                                            border: "1.5px solid var(--tg-border-1, #cbd5e1)",
                                            fontSize: "14.5px",
                                            outline: "none",
                                            background: "#f8fafc",
                                            color: "var(--tg-heading-color, #0f172a)",
                                        }}
                                    />
                                </div>

                                <div className="col-12" style={{ marginTop: "16px" }}>
                                    <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer", fontSize: "13.5px", color: "var(--tg-body-color, #334155)", lineHeight: 1.5 }}>
                                        <input
                                            type="checkbox"
                                            checked={consent}
                                            onChange={(e) => setConsent(e.target.checked)}
                                            required
                                            style={{ marginTop: "3px", width: "16px", height: "16px", accentColor: "var(--tg-theme-primary, #0a3cc2)" }}
                                        />
                                        <span>
                                            I consent to receive notifications from Global CXO Circle about events, Circle updates, and exclusive invitations. <span style={{ color: "#e11d48" }}>*</span>
                                        </span>
                                    </label>
                                </div>

                                {status === "error" && errorMsg && (
                                    <div className="col-12" style={{ color: "#e11d48", fontSize: "13.5px", fontWeight: 600 }}>
                                        {errorMsg}
                                    </div>
                                )}

                                <div className="col-12" style={{ marginTop: "24px" }}>
                                    <button
                                        type="submit"
                                        disabled={status === "submitting"}
                                        style={{
                                            width: "100%",
                                            padding: "14px 24px",
                                            borderRadius: "100px",
                                            background: "var(--tg-color-gradient)",
                                            color: "#ffffff",
                                            fontWeight: 700,
                                            fontSize: "15px",
                                            border: "none",
                                            cursor: status === "submitting" ? "not-allowed" : "pointer",
                                            boxShadow: "0 6px 20px rgba(10,60,194,0.25)",
                                            transition: "all 0.3s ease",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "10px",
                                            opacity: status === "submitting" ? 0.85 : 1,
                                        }}
                                    >
                                        {status === "submitting" ? (
                                            <>
                                                <svg
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    style={{ animation: "spin 0.8s linear infinite" }}
                                                >
                                                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                                    <path d="M12 2a10 10 0 0 1 10 10" />
                                                </svg>
                                                <span>Unlocking Gallery...</span>
                                            </>
                                        ) : (
                                            <span>Submit &amp; Access Gallery</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div
                        style={{
                            background: "#ffffff",
                            borderRadius: "20px",
                            padding: "clamp(24px, 3.5vw, 40px)",
                            boxShadow: "0 8px 30px rgba(11,26,74,0.06)",
                            border: "1px solid var(--tg-border-1, #e2e8f0)",
                            animation: "fadeIn 0.35s ease-out",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "16px",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "28px",
                                borderBottom: "1px solid #f1f5f9",
                                paddingBottom: "18px",
                            }}
                        >
                            <div>
                                <h3 style={{ fontSize: "22px", fontWeight: 800, color: "var(--tg-heading-color, #0b1020)", margin: 0 }}>
                                    CIO 100 Awards 2026 – Photo &amp; Video Gallery
                                </h3>
                                <p style={{ color: "var(--tg-body-color, #64748b)", fontSize: "14px", margin: "4px 0 0" }}>
                                    Explore session photos or download full high-resolution files.
                                </p>
                            </div>

                            <a
                                href={SHAREPOINT_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "11px 24px",
                                    borderRadius: "100px",
                                    background: "var(--tg-color-gradient)",
                                    color: "#ffffff",
                                    fontWeight: 700,
                                    fontSize: "14px",
                                    textDecoration: "none",
                                    boxShadow: "0 4px 14px rgba(10,60,194,0.25)",
                                    transition: "all 0.3s ease",
                                }}
                            >
                                Access all Photos
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                            </a>
                        </div>

                        {/* Media Thumbnail Grid / Collage */}
                        <div className="row gx-1 gy-2">
                            {mediaItems.map((item) => (
                                <div key={item.id} className="col-6 col-md-3">
                                    <div
                                        style={{
                                            borderRadius: "6px",
                                            overflow: "hidden",
                                            background: "#f1f5f9",
                                            position: "relative",
                                            border: "1px solid var(--tg-border-1, #e2e8f0)",
                                            aspectRatio: "4 / 3",
                                        }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={item.thumb}
                                            alt="CIO 100 Gallery Photo"
                                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer Contact Info */}
                        <div className="text-center" style={{ marginTop: "32px", paddingTop: "18px", borderTop: "1px solid #f1f5f9" }}>
                            <p style={{ fontSize: "13.5px", color: "var(--tg-body-color, #64748b)", margin: 0 }}>
                                Having trouble downloading? Contact us at{" "}
                                <a href="mailto:info@globalcxocircle.com" style={{ color: "var(--tg-theme-primary, #0a3cc2)", fontWeight: 600 }}>
                                    info@globalcxocircle.com
                                </a>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
