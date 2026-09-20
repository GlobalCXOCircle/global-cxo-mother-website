"use client"

import { useState, type FormEvent } from "react"
import { submitContactFormApi } from "@/portal/api/leads"

const ContactForm = () => {
   const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
   const [errorMsg, setErrorMsg] = useState("")

   async function handleSubmit(e: FormEvent<HTMLFormElement>) {
      e.preventDefault()
      setStatus("sending")
      setErrorMsg("")

      const form = e.currentTarget
      const formData = new FormData(form)
      const botCheck = formData.get("botcheck") as string

      // Bot trap: Silently drop if honeypot was populated
      if (botCheck) {
         setStatus("success")
         form.reset()
         return
      }

      try {
         const data = await submitContactFormApi({
            name: String(formData.get("user_name") || "").trim(),
            email: String(formData.get("user_email") || "").trim(),
            message: String(formData.get("message") || "").trim(),
            subject: `New message from ${formData.get("user_name")}`,
            source: "contact-widget",
            botcheck: botCheck || undefined,
         })

         if (data?.success) {
            setStatus("success")
            form.reset()
         } else {
            setStatus("error")
            setErrorMsg(data?.message || "Failed to send message.")
         }
      } catch (err: any) {
         setStatus("error")
         setErrorMsg(err?.message || "Email service is temporarily unavailable. Please try again shortly.")
      }
   }

   return (
      <form onSubmit={handleSubmit} className="contact__form">
         {/* Honeypot field for bot protection */}
         <div style={{ position: "absolute", opacity: 0, zIndex: -1, width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true">
            <input type="text" name="botcheck" tabIndex={-1} autoComplete="new-password" />
         </div>
         <div className="form-grp">
            <label htmlFor="user_name">Your Name</label>
            <input id="user_name" name="user_name" type="text" placeholder="Enter your name" required />
         </div>
         <div className="form-grp">
            <label htmlFor="user_email">Your Email</label>
            <input id="user_email" name="user_email" type="email" placeholder="Enter your email" required />
         </div>
         <div className="form-grp">
            <label htmlFor="message">Message</label>
            <textarea id="message" name="message" placeholder="Write your message" required />
         </div>
         <button type="submit" className="btn" disabled={status === "sending"}>
            {status === "sending" ? "Sending..." : "Send Message"}
         </button>
         {status === "success" && <p style={{ color: "green", marginTop: "1rem" }}>Message sent successfully!</p>}
         {status === "error" && <p style={{ color: "red", marginTop: "1rem" }}>{errorMsg}</p>}
      </form>
   )
}

export default ContactForm
