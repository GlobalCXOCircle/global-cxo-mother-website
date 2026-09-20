"use client"
import React, { useState, type CSSProperties } from "react"
import Link from "next/link"
import Header from "@/layouts/headers/Header"
import Footer from "@/layouts/footers/Footer"
import AnimateOnScroll from "@/components/ui/AnimateOnScroll"
import awardsData from "@/data/AwardsData"
import { submitContactFormApi } from "@/portal/api/leads"

const labelStyle: CSSProperties = { display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tg-heading-color)", marginBottom: "5px" }
const inputStyle: CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: "10px", border: "1px solid var(--tg-border-1)",
    background: "#fff", fontSize: "15px", color: "var(--tg-heading-color)",
    boxShadow: "0 2px 8px rgba(11,26,74,0.04)", transition: "all 0.3s ease",
}
const Required = () => <span style={{ color: "#DC2626" }}> *</span>

type FieldErrors = {
    nomineeName?: string
    nomineeRole?: string
    category?: string
    reasons?: string
    yourName?: string
    yourEmail?: string
}

const NominatePage = () => {
    const [nomineeName, setNomineeName] = useState("")
    const [nomineeRole, setNomineeRole] = useState("")
    const [nomineeLinkedin, setNomineeLinkedin] = useState("")
    const [category, setCategory] = useState("")
    const [reasons, setReasons] = useState("")
    const [yourName, setYourName] = useState("")
    const [yourEmail, setYourEmail] = useState("")
    const [relationship, setRelationship] = useState("")
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
    const [errorMsg, setErrorMsg] = useState("")

    const validate = () => {
        const errors: FieldErrors = {}
        if (!nomineeName.trim()) errors.nomineeName = "Please tell us who you are nominating."
        if (!nomineeRole.trim()) errors.nomineeRole = "Please enter the nominee's role and company."
        if (!category) errors.category = "Please choose an award category."
        if (!reasons.trim()) errors.reasons = "Please share why this leader deserves recognition."
        else if (reasons.trim().length < 30) errors.reasons = "Please add a little more detail (at least a sentence or two) so our committee can evaluate the nomination."
        if (!yourName.trim()) errors.yourName = "Please enter your name."
        if (!yourEmail.trim()) errors.yourEmail = "Please enter your email address."
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(yourEmail.trim())) {
            errors.yourEmail = "Please enter a valid email address (e.g. name@company.com)."
        }
        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setStatus("sending")
        setErrorMsg("")
        try {
            const data = await submitContactFormApi({
                name: yourName.trim(),
                email: yourEmail.trim(),
                subject: `New Award Nomination: ${nomineeName.trim()}`,
                message: reasons.trim(),
                source: "nominate",
                metadata_json: {
                    nominee_name: nomineeName.trim(),
                    nominee_role_company: nomineeRole.trim(),
                    nominee_linkedin: nomineeLinkedin.trim() || "Not provided",
                    award_category: category,
                    relationship_to_nominee: relationship.trim() || "Not provided",
                    reasons_to_nominate: reasons.trim(),
                },
            })
            if (data?.success) {
                setStatus("success")
            } else {
                setStatus("error")
                setErrorMsg(data?.message || "Failed to submit the nomination. Please try again.")
            }
        } catch (err: any) {
            setStatus("error")
            setErrorMsg(err?.message || "The service is temporarily unavailable. Please try again shortly.")
        }
    }

    const errorStyle: CSSProperties = { borderColor: "#DC2626", boxShadow: "0 0 0 3px rgba(220,38,38,0.1)" }
    const fieldErrorText: CSSProperties = { marginTop: "6px", fontSize: "12.5px", color: "#DC2626" }
    const clearError = (key: keyof FieldErrors) => {
        if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    }

    return (
        <>
            <Header />
            <main className="main-area fix">
                {/* Hero */}
                <section style={{ paddingTop: "120px", paddingBottom: "60px", backgroundColor: "#f8f9fa" }}>
                    <div className="container">
                        <div className="row justify-content-center text-center">
                            <div className="col-lg-8">
                                <AnimateOnScroll>
                                    <span style={{
                                        background: "var(--tg-color-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                                        fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", fontSize: "12px",
                                        marginBottom: "16px", display: "inline-block",
                                    }}>
                                        Awards Nomination
                                    </span>
                                    <h1 style={{ fontSize: "clamp(32px, 4.2vw, 48px)", fontWeight: 800, color: "var(--tg-heading-color)", marginBottom: "16px", lineHeight: 1.15 }}>
                                        Nominate a{" "}
                                        <span style={{ background: "var(--tg-color-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Leader</span>
                                    </h1>
                                    <p style={{ fontSize: "16.5px", color: "var(--tg-body-color)", lineHeight: 1.7, maxWidth: "620px", margin: "0 auto" }}>
                                        Know a technology leader whose career, innovation, or mentorship deserves recognition?
                                        Tell us about them — our awards committee reviews every nomination.
                                    </p>
                                </AnimateOnScroll>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Nomination form */}
                <section style={{ backgroundColor: "#fff", padding: "80px 0 110px" }}>
                    <div className="container">
                        <div className="row justify-content-center">
                            <div className="col-lg-8">
                                <AnimateOnScroll>
                                    <div style={{
                                        background: "#fff", borderRadius: "18px", padding: "clamp(26px, 3.6vw, 38px)",
                                        border: "1px solid var(--tg-border-1)", boxShadow: "0 10px 40px rgba(11,26,74,0.06)",
                                    }}>
                                        {status === "success" ? (
                                            <div style={{ borderRadius: "14px", border: "1px solid #a7f3d0", background: "#ecfdf5", padding: "36px", textAlign: "center" }}>
                                                <div style={{ margin: "0 auto 16px", display: "flex", height: "48px", width: "48px", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "#d1fae5" }}>
                                                    <svg style={{ height: "24px", width: "24px", color: "#059669" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--tg-heading-color)", marginBottom: "4px" }}>Nomination received</h3>
                                                <p style={{ fontSize: "15px", color: "var(--tg-body-color)", margin: "0 0 20px" }}>
                                                    Thank you for recognizing excellence. Our awards committee will review the nomination
                                                    and reach out if we need anything more.
                                                </p>
                                                <Link href="/awards" style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--tg-theme-primary)", textDecoration: "none" }}>
                                                    ← Back to Awards
                                                </Link>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleSubmit} noValidate>
                                                {/* — Nominee — */}
                                                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--tg-heading-color)", marginBottom: "16px" }}>
                                                    Who are you nominating?
                                                </h2>
                                                <div className="row gutter-y-14" style={{ marginBottom: "28px" }}>
                                                    <div className="col-md-6">
                                                        <label style={labelStyle}>Nominee&apos;s Full Name<Required /></label>
                                                        <input type="text" value={nomineeName}
                                                            onChange={(e) => { setNomineeName(e.target.value); clearError("nomineeName") }}
                                                            placeholder="Jane Smith" className="contact-input"
                                                            style={{ ...inputStyle, ...(fieldErrors.nomineeName ? errorStyle : {}) }} />
                                                        {fieldErrors.nomineeName && <p style={fieldErrorText}>{fieldErrors.nomineeName}</p>}
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label style={labelStyle}>Nominee&apos;s Role &amp; Company<Required /></label>
                                                        <input type="text" value={nomineeRole}
                                                            onChange={(e) => { setNomineeRole(e.target.value); clearError("nomineeRole") }}
                                                            placeholder="CIO, Acme Corp" className="contact-input"
                                                            style={{ ...inputStyle, ...(fieldErrors.nomineeRole ? errorStyle : {}) }} />
                                                        {fieldErrors.nomineeRole && <p style={fieldErrorText}>{fieldErrors.nomineeRole}</p>}
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label style={labelStyle}>Nominee&apos;s LinkedIn</label>
                                                        <input type="url" value={nomineeLinkedin}
                                                            onChange={(e) => setNomineeLinkedin(e.target.value)}
                                                            placeholder="https://linkedin.com/in/janesmith" className="contact-input" style={inputStyle} />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label style={labelStyle}>Award Category<Required /></label>
                                                        <select value={category}
                                                            onChange={(e) => { setCategory(e.target.value); clearError("category") }}
                                                            className="contact-input"
                                                            style={{ ...inputStyle, ...(fieldErrors.category ? errorStyle : {}), color: category ? "var(--tg-heading-color)" : "#9aa0ad" }}>
                                                            <option value="" disabled hidden>Select a category</option>
                                                            {awardsData.map((c) => (
                                                                <option key={c.slug} value={c.label}>{c.label}</option>
                                                            ))}
                                                            <option value="Not sure">Not sure — let the committee decide</option>
                                                        </select>
                                                        {fieldErrors.category && <p style={fieldErrorText}>{fieldErrors.category}</p>}
                                                    </div>
                                                    <div className="col-12">
                                                        <label style={labelStyle}>Reasons to Nominate<Required /></label>
                                                        <textarea rows={6} value={reasons}
                                                            onChange={(e) => { setReasons(e.target.value); clearError("reasons") }}
                                                            placeholder="Why does this leader deserve recognition? Share their achievements, impact on the industry, mentorship, and anything else our committee should know..."
                                                            className="contact-input"
                                                            style={{ ...inputStyle, resize: "vertical", ...(fieldErrors.reasons ? errorStyle : {}) }} />
                                                        {fieldErrors.reasons && <p style={fieldErrorText}>{fieldErrors.reasons}</p>}
                                                    </div>
                                                </div>

                                                {/* — Nominator — */}
                                                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--tg-heading-color)", marginBottom: "16px" }}>
                                                    About you
                                                </h2>
                                                <div className="row gutter-y-14">
                                                    <div className="col-md-6">
                                                        <label style={labelStyle}>Your Name<Required /></label>
                                                        <input type="text" value={yourName}
                                                            onChange={(e) => { setYourName(e.target.value); clearError("yourName") }}
                                                            placeholder="Your full name" className="contact-input"
                                                            style={{ ...inputStyle, ...(fieldErrors.yourName ? errorStyle : {}) }} />
                                                        {fieldErrors.yourName && <p style={fieldErrorText}>{fieldErrors.yourName}</p>}
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label style={labelStyle}>Your Email<Required /></label>
                                                        <input type="email" value={yourEmail}
                                                            onChange={(e) => { setYourEmail(e.target.value); clearError("yourEmail") }}
                                                            placeholder="your.email@company.com" className="contact-input"
                                                            style={{ ...inputStyle, ...(fieldErrors.yourEmail ? errorStyle : {}) }} />
                                                        {fieldErrors.yourEmail && <p style={fieldErrorText}>{fieldErrors.yourEmail}</p>}
                                                    </div>
                                                    <div className="col-12">
                                                        <label style={labelStyle}>Your Relationship to the Nominee</label>
                                                        <input type="text" value={relationship}
                                                            onChange={(e) => setRelationship(e.target.value)}
                                                            placeholder="e.g. Colleague, former team member, industry peer" className="contact-input" style={inputStyle} />
                                                    </div>
                                                    <div className="col-12">
                                                        <button type="submit" disabled={status === "sending"} className="contact-submit-btn" style={{
                                                            width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px",
                                                            background: "var(--tg-color-gradient)", color: "#fff", border: "none", padding: "16px 24px",
                                                            borderRadius: "10px", fontWeight: 700, fontSize: "15px",
                                                            cursor: status === "sending" ? "not-allowed" : "pointer", opacity: status === "sending" ? 0.7 : 1,
                                                            transition: "all 0.3s ease",
                                                        }}>
                                                            {status === "sending" ? "Submitting..." : "Submit Nomination"}
                                                        </button>
                                                        {status === "error" && (
                                                            <p style={{ marginTop: "12px", textAlign: "center", fontSize: "13px", color: "#DC2626" }}>{errorMsg}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </AnimateOnScroll>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />

            <style jsx global>{`
                .contact-input::placeholder { color: #9aa0ad; opacity: 1; }
                .contact-input:focus {
                    outline: none;
                    border-color: var(--tg-theme-primary) !important;
                    box-shadow: 0 4px 16px rgba(10,60,194,0.12), 0 0 0 3px rgba(10,60,194,0.1) !important;
                }
                .contact-submit-btn:not(:disabled):hover {
                    filter: brightness(1.08);
                    box-shadow: 0 8px 24px rgba(10,60,194,0.25);
                    transform: translateY(-1px);
                }
                .gutter-y-14 { --bs-gutter-y: 14px; }
            `}</style>
        </>
    )
}

export default NominatePage
