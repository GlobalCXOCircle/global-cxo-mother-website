"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Header from "@/layouts/headers/Header"
import Footer from "@/layouts/footers/Footer"
import { Check, Mail, User, ShieldAlert, CheckCircle2, ChevronRight } from "lucide-react"
import { submitOptInFormApi } from "@/portal/api/leads"

/* ------------------------------------------------------------------ */
/* Motion helpers                                                      */
/* ------------------------------------------------------------------ */
function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.4, 0, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const Required = () => <span style={{ color: "#DC2626" }}> *</span>

export default function OptInForm() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [joinCircle, setJoinCircle] = useState<"yes" | "no" | null>(null)
  const [learnMore, setLearnMore] = useState<"yes" | "no" | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string
    lastName?: string
    email?: string
    joinCircle?: string
    learnMore?: string
  }>({})

  useEffect(() => {
    setMounted(true)
    // Check if there was an error during a previous submit that triggered a reload
    const storedError = sessionStorage.getItem("opt_in_error")
    if (storedError) {
      setSubmitError(storedError)
      sessionStorage.removeItem("opt_in_error")
    }
  }, [])

  const validate = () => {
    const errors: typeof fieldErrors = {}
    if (!firstName.trim()) {
      errors.firstName = "Please enter your first name."
    }
    if (!lastName.trim()) {
      errors.lastName = "Please enter your last name."
    }
    if (!email.trim()) {
      errors.email = "Please enter your email address."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      errors.email = "Please enter a valid email address (e.g. name@company.com)."
    }
    if (!joinCircle) {
      errors.joinCircle = "Please select YES or NO to indicate if you would like to join the Circle."
    }
    if (!learnMore) {
      errors.learnMore = "Please select YES or NO to indicate if you would like to learn more."
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) return

    // Check for duplicate submission (client-side)
    const normalizedEmail = email.trim().toLowerCase()
    const submittedEmails: string[] = JSON.parse(localStorage.getItem("opt_in_submitted") || "[]")
    if (submittedEmails.includes(normalizedEmail)) {
      setSubmitError("This email address has already been submitted.")
      return
    }

    setSubmitting(true)
    try {
      const data = await submitOptInFormApi({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: normalizedEmail,
        mailing_list: joinCircle === "yes",
        join_circle: learnMore === "yes",
        source: "opt-in-page",
      })

      if (!data?.success) {
        setSubmitError(data?.message || "Failed to submit response. Please try again.")
        return
      }

      // Store email to prevent duplicate submissions
      submittedEmails.push(normalizedEmail)
      localStorage.setItem("opt_in_submitted", JSON.stringify(submittedEmails))

      setSubmitted(true)
    } catch (err: any) {
      console.error(err)
      setSubmitError(err?.message || "There was an error submitting your response. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const clearError = (key: keyof typeof fieldErrors) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    }
    setSubmitError(null)
  }

  if (!mounted) {
    return <div className="min-h-screen bg-[#f8f9fa]" suppressHydrationWarning={true} />
  }

  return (
    <div className="overflow-x-hidden" style={{ background: "#f8f9fa" }} suppressHydrationWarning={true}>
      {/* Scoped Responsive CSS */}
      <style>{`
        .opt-in-card {
          background: #ffffff;
          border-radius: 14px;
          padding: 16px 14px;
          box-shadow: 0 10px 30px rgba(11,26,74,0.04), 0 1px 3px rgba(0,0,0,0.02);
          border-width: 1px;
          border-style: solid;
          border-color: var(--tg-border-1);
        }
        .opt-in-input-container {
          width: 100%;
          margin-bottom: 10px;
        }
        .opt-in-input-wrapper {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
        }
        .opt-in-icon {
          position: absolute;
          left: 11px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          width: 14px;
          height: 14px;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          z-index: 10;
        }
        .opt-in-input {
          width: 100%;
          padding: 8.5px 12px 8.5px 33px;
          border-radius: 7px;
          border-width: 1px;
          border-style: solid;
          border-color: var(--tg-border-1);
          background: #fff;
          font-size: 13px;
          color: var(--tg-heading-color);
          box-shadow: 0 2px 6px rgba(11,26,74,0.02);
          transition: all 0.25s ease;
          outline: none;
        }
        .opt-in-input::placeholder {
          color: #c4c4c4;
          opacity: 1;
          font-weight: 400;
        }
        .opt-in-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.10);
        }
        .opt-in-input.error {
          border-color: #DC2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08);
        }
        .opt-in-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--tg-heading-color);
          margin-bottom: 3px;
          text-align: left;
        }
        .opt-in-error-text {
          margin-top: 4px;
          font-size: 11.5px;
          color: #DC2626;
          text-align: left;
        }
        .opt-in-checkbox-label {
          display: flex;
          align-items: flex-start;
          cursor: pointer;
          user-select: none;
          font-size: 11.5px;
          color: var(--tg-body-color);
          line-height: 1.35;
          text-align: left;
        }
        .opt-in-submit-btn {
          width: 100%;
          padding: 9.5px 14px;
          border-radius: 7px;
          border-width: 0;
          background: var(--tg-color-gradient);
          color: #fff;
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(11,26,74,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s ease;
          margin-top: 14px;
        }
        .opt-in-submit-btn:disabled {
          cursor: not-allowed;
          opacity: 0.85;
        }

        @media (min-width: 576px) {
          .opt-in-card {
            border-radius: 20px;
            padding: 28px 24px;
          }
          .opt-in-input-container {
            margin-bottom: 16px;
          }
          .opt-in-icon {
            left: 15px;
            width: 17px;
            height: 17px;
          }
          .opt-in-input {
            padding: 12px 16px 12px 42px;
            border-radius: 10px;
            font-size: 14.5px;
          }
          .opt-in-label {
            font-size: 13px;
            margin-bottom: 6px;
          }
          .opt-in-error-text {
            font-size: 12px;
          }
          .opt-in-checkbox-label {
            font-size: 13.5px;
            line-height: 1.5;
          }
          .opt-in-submit-btn {
            padding: 12px 16px;
            border-radius: 10px;
            font-size: 15px;
            margin-top: 18px;
          }
        }
        .brochure-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 10px 30px rgba(11,26,74,0.05), 0 1px 3px rgba(0,0,0,0.02);
          border: 1px solid var(--tg-border-1);
          transition: all 0.35s cubic-bezier(0.25, 0.4, 0, 1);
        }
        .brochure-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 45px rgba(11,26,74,0.12), 0 4px 12px rgba(0,0,0,0.04);
          border-color: #3b82f6;
        }
        .brochure-img-wrapper {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          background: #f8f9fa;
          position: relative;
        }
        .brochure-img {
          width: 100%;
          height: auto;
          display: block;
          transition: transform 0.5s cubic-bezier(0.25, 0.4, 0, 1);
        }
        .brochure-card:hover .brochure-img {
          transform: scale(1.025);
        }
      `}</style>

      <Header hideSignIn />

      {/* Hero Banner Section */}
      <section className="pt-[90px] pb-6 sm:pt-[135px] sm:pb-12 relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full blur-3xl opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(10,60,194,0.14) 0%, rgba(179,0,185,0.08) 55%, transparent 80%)",
          }}
        />

        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="row justify-content-center text-center">
            <div className="col-lg-8">
              <FadeUp>
                <span
                  style={{
                    background: "var(--tg-color-gradient)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    fontSize: "11.5px",
                    marginBottom: "6px",
                    display: "inline-block",
                  }}
                >
                  Stay Connected
                </span>
              </FadeUp>

              <FadeUp delay={0.1}>
                <h1
                  style={{
                    fontSize: "clamp(24px, 4vw, 36px)",
                    fontWeight: 800,
                    lineHeight: 1.2,
                    color: "var(--tg-heading-color)",
                    marginBottom: "10px",
                  }}
                >
                  Receive future updates
                </h1>
              </FadeUp>

              <FadeUp delay={0.2}>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--tg-body-color)",
                    lineHeight: 1.55,
                    maxWidth: "540px",
                    margin: "0 auto",
                  }}
                >
                  Opt-in to receive emails, future invitations to exclusive events, 
                  and technology insights from Global CXO Circle.
                </p>
              </FadeUp>
            </div>
          </div>

          {/* Form Container */}
          <div className="row justify-content-center" style={{ marginTop: "16px" }}>
            <div className="col-lg-6 col-md-8 col-sm-10">
              <FadeUp delay={0.3}>
                <div className="opt-in-card">
                  <AnimatePresence mode="wait">
                    {!submitted ? (
                      <motion.form
                        key="form"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        onSubmit={handleSubmit}
                        noValidate
                        autoComplete="on"
                      >
                        {/* First & Last Name Row */}
                        <div className="row g-2 sm:g-3">
                          {/* First Name Field */}
                          <div className="col-6" style={{ textAlign: "left" }}>
                            <label htmlFor="firstName" className="opt-in-label">
                              First Name<Required />
                            </label>
                            <div className="opt-in-input-container">
                              <div className="opt-in-input-wrapper">
                                <User className="opt-in-icon" />
                                <input
                                  type="text"
                                  id="firstName"
                                  name="firstName"
                                  autoComplete="given-name"
                                  value={firstName}
                                  onChange={(e) => {
                                    setFirstName(e.target.value)
                                    clearError("firstName")
                                  }}
                                  className={`opt-in-input ${fieldErrors.firstName ? "error" : ""}`}
                                  placeholder="John"
                                  required
                                />
                              </div>
                              {fieldErrors.firstName && (
                                <p className="opt-in-error-text">{fieldErrors.firstName}</p>
                              )}
                            </div>
                          </div>

                          {/* Last Name Field */}
                          <div className="col-6" style={{ textAlign: "left" }}>
                            <label htmlFor="lastName" className="opt-in-label">
                              Last Name<Required />
                            </label>
                            <div className="opt-in-input-container">
                              <div className="opt-in-input-wrapper">
                                <User className="opt-in-icon" />
                                <input
                                  type="text"
                                  id="lastName"
                                  name="lastName"
                                  autoComplete="family-name"
                                  value={lastName}
                                  onChange={(e) => {
                                    setLastName(e.target.value)
                                    clearError("lastName")
                                  }}
                                  className={`opt-in-input ${fieldErrors.lastName ? "error" : ""}`}
                                  placeholder="Doe"
                                  required
                                />
                              </div>
                              {fieldErrors.lastName && (
                                <p className="opt-in-error-text">{fieldErrors.lastName}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Email Field */}
                        <div style={{ textAlign: "left" }}>
                          <label htmlFor="email" className="opt-in-label">
                            Email Address<Required />
                          </label>
                          <div className="opt-in-input-container">
                            <div className="opt-in-input-wrapper">
                              <Mail className="opt-in-icon" />
                              <input
                                type="email"
                                id="email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => {
                                  setEmail(e.target.value)
                                  clearError("email")
                                }}
                                className={`opt-in-input ${fieldErrors.email ? "error" : ""}`}
                                placeholder="john.doe@company.com"
                                required
                              />
                            </div>
                            {fieldErrors.email && (
                              <p className="opt-in-error-text">{fieldErrors.email}</p>
                            )}
                          </div>
                        </div>

                        {/* Join Circle Question with YES / NO Checkboxes */}
                        <div style={{ margin: "12px 0 10px", textAlign: "left" }} className="sm:!my-[16px]">
                          <p
                            style={{
                              fontSize: "12.5px",
                              color: "var(--tg-heading-color)",
                              fontWeight: 600,
                              lineHeight: 1.45,
                              marginBottom: "8px",
                            }}
                            className="sm:!text-[13.5px] sm:!mb-[10px]"
                          >
                            I'd like to be added to the mailing list to be invited to such premium CxO networking events.<Required />
                          </p>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", alignItems: "center" }} className="sm:!gap-[24px]">
                            {/* YES Checkbox */}
                            <label className="opt-in-checkbox-label" style={{ alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={joinCircle === "yes"}
                                onChange={() => {
                                  setJoinCircle(joinCircle === "yes" ? null : "yes")
                                  clearError("joinCircle")
                                }}
                                style={{ display: "none" }}
                              />
                              <span
                                style={{
                                  flexShrink: 0,
                                  width: "17px",
                                  height: "17px",
                                  borderRadius: "5px",
                                  borderWidth: joinCircle === "yes" ? "0px" : "1.5px",
                                  borderStyle: joinCircle === "yes" ? "none" : "solid",
                                  borderColor: fieldErrors.joinCircle
                                    ? "#DC2626"
                                    : joinCircle === "yes"
                                    ? "transparent"
                                    : "var(--tg-border-1)",
                                  background: joinCircle === "yes" ? "var(--tg-color-gradient)" : "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  marginRight: "8px",
                                  transition: "all 0.2s ease",
                                  boxSizing: "border-box",
                                }}
                                className="sm:!w-[20px] sm:!h-[20px] sm:!rounded-[6px] sm:!mr-[10px]"
                              >
                                {joinCircle === "yes" && <Check style={{ color: "#fff", width: "13px", height: "13px" }} className="sm:!w-[14px] sm:!h-[14px]" />}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: "13px", color: joinCircle === "yes" ? "var(--tg-heading-color)" : "var(--tg-body-color)" }} className="sm:!text-[14px]">
                                YES
                              </span>
                            </label>

                            {/* NO Checkbox */}
                            <label className="opt-in-checkbox-label" style={{ alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={joinCircle === "no"}
                                onChange={() => {
                                  setJoinCircle(joinCircle === "no" ? null : "no")
                                  clearError("joinCircle")
                                }}
                                style={{ display: "none" }}
                              />
                              <span
                                style={{
                                  flexShrink: 0,
                                  width: "17px",
                                  height: "17px",
                                  borderRadius: "5px",
                                  borderWidth: joinCircle === "no" ? "0px" : "1.5px",
                                  borderStyle: joinCircle === "no" ? "none" : "solid",
                                  borderColor: fieldErrors.joinCircle
                                    ? "#DC2626"
                                    : joinCircle === "no"
                                    ? "transparent"
                                    : "var(--tg-border-1)",
                                  background: joinCircle === "no" ? "var(--tg-color-gradient)" : "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  marginRight: "8px",
                                  transition: "all 0.2s ease",
                                  boxSizing: "border-box",
                                }}
                                className="sm:!w-[20px] sm:!h-[20px] sm:!rounded-[6px] sm:!mr-[10px]"
                              >
                                {joinCircle === "no" && <Check style={{ color: "#fff", width: "13px", height: "13px" }} className="sm:!w-[14px] sm:!h-[14px]" />}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: "13px", color: joinCircle === "no" ? "var(--tg-heading-color)" : "var(--tg-body-color)" }} className="sm:!text-[14px]">
                                NO
                              </span>
                            </label>
                          </div>

                          {fieldErrors.joinCircle && (
                            <p className="opt-in-error-text" style={{ marginTop: "6px" }}>
                              {fieldErrors.joinCircle}
                            </p>
                          )}
                        </div>

                        {/* Learn More Question with YES / NO Checkboxes */}
                        <div style={{ margin: "12px 0 10px", textAlign: "left" }} className="sm:!my-[16px]">
                          <p
                            style={{
                              fontSize: "12.5px",
                              color: "var(--tg-heading-color)",
                              fontWeight: 600,
                              lineHeight: 1.45,
                              marginBottom: "8px",
                            }}
                            className="sm:!text-[13.5px] sm:!mb-[10px]"
                          >
                            I'd like to learn more about joining the Circle - meeting founders, investing, advising, and networking with fellow CxOs.<Required />
                          </p>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", alignItems: "center" }} className="sm:!gap-[24px]">
                            {/* YES Checkbox */}
                            <label className="opt-in-checkbox-label" style={{ alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={learnMore === "yes"}
                                onChange={() => {
                                  setLearnMore(learnMore === "yes" ? null : "yes")
                                  clearError("learnMore")
                                }}
                                style={{ display: "none" }}
                              />
                              <span
                                style={{
                                  flexShrink: 0,
                                  width: "17px",
                                  height: "17px",
                                  borderRadius: "5px",
                                  borderWidth: learnMore === "yes" ? "0px" : "1.5px",
                                  borderStyle: learnMore === "yes" ? "none" : "solid",
                                  borderColor: fieldErrors.learnMore
                                    ? "#DC2626"
                                    : learnMore === "yes"
                                    ? "transparent"
                                    : "var(--tg-border-1)",
                                  background: learnMore === "yes" ? "var(--tg-color-gradient)" : "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  marginRight: "8px",
                                  transition: "all 0.2s ease",
                                  boxSizing: "border-box",
                                }}
                                className="sm:!w-[20px] sm:!h-[20px] sm:!rounded-[6px] sm:!mr-[10px]"
                              >
                                {learnMore === "yes" && <Check style={{ color: "#fff", width: "13px", height: "13px" }} className="sm:!w-[14px] sm:!h-[14px]" />}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: "13px", color: learnMore === "yes" ? "var(--tg-heading-color)" : "var(--tg-body-color)" }} className="sm:!text-[14px]">
                                YES
                              </span>
                            </label>

                            {/* NO Checkbox */}
                            <label className="opt-in-checkbox-label" style={{ alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={learnMore === "no"}
                                onChange={() => {
                                  setLearnMore(learnMore === "no" ? null : "no")
                                  clearError("learnMore")
                                }}
                                style={{ display: "none" }}
                              />
                              <span
                                style={{
                                  flexShrink: 0,
                                  width: "17px",
                                  height: "17px",
                                  borderRadius: "5px",
                                  borderWidth: learnMore === "no" ? "0px" : "1.5px",
                                  borderStyle: learnMore === "no" ? "none" : "solid",
                                  borderColor: fieldErrors.learnMore
                                    ? "#DC2626"
                                    : learnMore === "no"
                                    ? "transparent"
                                    : "var(--tg-border-1)",
                                  background: learnMore === "no" ? "var(--tg-color-gradient)" : "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  marginRight: "8px",
                                  transition: "all 0.2s ease",
                                  boxSizing: "border-box",
                                }}
                                className="sm:!w-[20px] sm:!h-[20px] sm:!rounded-[6px] sm:!mr-[10px]"
                              >
                                {learnMore === "no" && <Check style={{ color: "#fff", width: "13px", height: "13px" }} className="sm:!w-[14px] sm:!h-[14px]" />}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: "13px", color: learnMore === "no" ? "var(--tg-heading-color)" : "var(--tg-body-color)" }} className="sm:!text-[14px]">
                                NO
                              </span>
                            </label>
                          </div>

                          {fieldErrors.learnMore && (
                            <p className="opt-in-error-text" style={{ marginTop: "6px" }}>
                              {fieldErrors.learnMore}
                            </p>
                          )}
                        </div>

                        {/* Submit Error Banner */}
                        {submitError && (
                          <div
                            style={{
                              background: "#FEF2F2",
                              borderWidth: "1px",
                              borderStyle: "solid",
                              borderColor: "#FCA5A5",
                              borderLeftWidth: "4px",
                              borderLeftColor: "#EF4444",
                              borderRadius: "7px",
                              padding: "9px 12px",
                              color: "#B91C1C",
                              fontSize: "12.5px",
                              marginTop: "12px",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "8px",
                              textAlign: "left",
                              lineHeight: "1.4"
                            }}
                          >
                            <ShieldAlert style={{ width: "16px", height: "16px", flexShrink: 0, marginTop: "1px" }} />
                            <span style={{ fontWeight: 500 }}>{submitError}</span>
                          </div>
                        )}

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={submitting}
                          className="opt-in-submit-btn hover-gradient"
                        >
                          {submitting ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                                aria-hidden="true"
                                style={{ width: "15px", height: "15px", borderWidth: "2px" }}
                              ></span>
                              Submitting...
                            </>
                          ) : (
                            <>
                              Submit
                              <ChevronRight style={{ width: "15px", height: "15px" }} />
                            </>
                          )}
                        </button>
                      </motion.form>
                    ) : (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        style={{ textAlign: "center", padding: "16px 6px" }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "56px",
                            height: "56px",
                            borderRadius: "50%",
                            background: "rgba(16,185,129,0.1)",
                            color: "#10b981",
                            marginBottom: "16px",
                          }}
                        >
                          <CheckCircle2 style={{ width: "32px", height: "32px" }} />
                        </div>
                        <h3
                          style={{
                            fontSize: "22px",
                            fontWeight: 700,
                            color: "var(--tg-heading-color)",
                            marginBottom: "12px",
                          }}
                        >
                          Thank you
                        </h3>
                        <p
                          style={{
                            fontSize: "14.5px",
                            color: "var(--tg-body-color)",
                            lineHeight: "1.6",
                            marginBottom: "10px",
                            maxWidth: "440px",
                            margin: "0 auto",
                          }}
                        >
                          Your response has been received. If you expressed interest in joining the Circle, someone from our team will be in touch.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeUp>
            </div>
          </div>
        </div>
      </section>

      {/* Brochure Showcase Section - More Information on the Organization */}
      <section className="pt-4 pb-12 sm:pt-6 sm:pb-16 relative" style={{ zIndex: 2 }}>
        <div className="container">
          <div className="row justify-content-center text-center mb-10">
            <div className="col-lg-8">
              <FadeUp>
                <span
                  style={{
                    background: "var(--tg-color-gradient)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    fontSize: "11.5px",
                    marginBottom: "6px",
                    display: "inline-block",
                  }}
                >
                  Organization Overview
                </span>
              </FadeUp>
              <FadeUp delay={0.1}>
                <h2
                  style={{
                    fontSize: "clamp(24px, 3.5vw, 34px)",
                    fontWeight: 800,
                    color: "var(--tg-heading-color)",
                    marginBottom: "12px",
                  }}
                >
                  More About Global CXO Circle
                </h2>
              </FadeUp>
              <FadeUp delay={0.2}>
                <p
                  style={{
                    fontSize: "14.5px",
                    color: "var(--tg-body-color)",
                    lineHeight: 1.6,
                    maxWidth: "620px",
                    margin: "0 auto",
                  }}
                >
                  Explore our brochure below for deeper insights into our executive leadership ecosystem, member privileges, advisory initiatives, and upcoming events.
                </p>
              </FadeUp>
            </div>
          </div>

          <div className="row justify-content-center g-4 mt-2">
            {/* Page 1 */}
            <div className="col-lg-6 col-md-10">
              <FadeUp delay={0.3}>
                <div className="brochure-card sm:!p-[24px]">
                  <div className="brochure-img-wrapper">
                    <img
                      src="/assets/brochure/GCXOC_brochure_V1_page-0001.jpg"
                      alt="Global CXO Circle Brochure - Page 1"
                      className="brochure-img"
                      loading="lazy"
                    />
                  </div>
                  <div style={{ marginTop: "18px", textAlign: "center" }}>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "var(--tg-heading-color)",
                      }}
                    >
                      Brochure Page 1: Overview & Vision
                    </span>
                  </div>
                </div>
              </FadeUp>
            </div>

            {/* Page 2 */}
            <div className="col-lg-6 col-md-10">
              <FadeUp delay={0.4}>
                <div className="brochure-card sm:!p-[24px]">
                  <div className="brochure-img-wrapper">
                    <img
                      src="/assets/brochure/GCXOC_brochure_V1_page-0002.jpg"
                      alt="Global CXO Circle Brochure - Page 2"
                      className="brochure-img"
                      loading="lazy"
                    />
                  </div>
                  <div style={{ marginTop: "18px", textAlign: "center" }}>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "var(--tg-heading-color)",
                      }}
                    >
                      Brochure Page 2: Programs & Membership
                    </span>
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
