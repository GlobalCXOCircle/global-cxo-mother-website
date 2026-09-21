"use client"

import React, { useState, useEffect } from "react"

interface ProtectedEmailProps {
    user?: string
    domain?: string
    subject?: string
    className?: string
    style?: React.CSSProperties
    children?: React.ReactNode
    showEmail?: boolean
    ariaLabel?: string
}

/**
 * ProtectedEmail - Cloaks email addresses against web scrapers and spambots.
 * 
 * - In static HTML / SSR (which bots read), no plain email regex or `mailto:` link is output.
 * - In a real user's browser, it mounts after hydration into a fully functional,
 *   clickable `mailto:` link that allows clicking, copying, and hover styling.
 */
export default function ProtectedEmail({
    user = "contactus",
    domain = "globalcxocircle.com",
    subject,
    className,
    style,
    children,
    showEmail = true,
    ariaLabel,
}: ProtectedEmailProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const email = `${user}@${domain}`
    const mailtoUrl = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`

    // SSR / Static Prerender output:
    // Completely avoids standard email regex patterns and mailto: links so crawlers harvest nothing.
    if (!mounted) {
        return (
            <span
                className={className}
                style={{ ...style, cursor: "pointer" }}
                aria-label={ariaLabel || "Contact Email"}
            >
                {children}
                {showEmail && (
                    <span>
                        {user}
                        <span style={{ display: "none" }}>_no_bots_</span>
                        {" [at] "}
                        {domain}
                    </span>
                )}
            </span>
        )
    }

    return (
        <a
            href={mailtoUrl}
            className={className}
            style={style}
            aria-label={ariaLabel || `Email ${email}`}
        >
            {children}
            {showEmail && email}
        </a>
    )
}
