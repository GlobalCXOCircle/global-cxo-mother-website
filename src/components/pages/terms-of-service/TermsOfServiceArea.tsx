import ProtectedEmail from "@/components/common/ProtectedEmail";

const TermsOfServiceArea = () => {
  const lastUpdated = "May 5, 2026";

  return (
    <section style={{ padding: "100px 0 80px", background: "#fff" }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div style={{ marginBottom: "48px" }}>
              <span style={{ background: "var(--tg-color-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", fontSize: "13px", display: "inline-block", marginBottom: "12px" }}>Legal</span>
              <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "#1A1A1A", marginBottom: "12px", letterSpacing: "-1px" }}>Terms of Service</h1>
              <p style={{ fontSize: "14px", color: "#888" }}>Last updated: {lastUpdated}</p>
            </div>

            <div style={{ fontSize: "16px", lineHeight: 1.8, color: "#444" }}>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>1. Acceptance of Terms</h2>
              <p>By accessing or using the Global CXO Circle website and platform, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our services. These Terms apply to all members, visitors, partners, and users of the platform.</p>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>2. About Global CXO Circle</h2>
              <p>Global CXO Circle is an exclusive, invite-only ecosystem designed for executive leaders to engage in peer alignment, strategic discussions, and enterprise outcomes. Membership is subject to review and approval by our committee.</p>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>3. Membership & Eligibility</h2>
              <p>Access to certain features of the platform requires membership. You agree to provide accurate, current, and complete information during the application process. We reserve the right to suspend or terminate memberships that violate our community standards or these Terms.</p>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>4. Intellectual Property</h2>
              <p>All content on this website — including text, graphics, logos, images, frameworks, and code — is the property of Global CXO Circle or its content suppliers and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.</p>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>5. Code of Conduct</h2>
              <p>You agree to use this platform in a professional manner. You must not:</p>
              <ul style={{ paddingLeft: "24px", marginBottom: "16px" }}>
                <li style={{ marginBottom: "8px" }}>Share confidential information discussed within the circles without explicit consent.</li>
                <li style={{ marginBottom: "8px" }}>Use the platform to distribute spam or unauthorized solicitations.</li>
                <li style={{ marginBottom: "8px" }}>Attempt to gain unauthorised access to any part of the site or member directories.</li>
                <li style={{ marginBottom: "8px" }}>Harass, abuse, or harm other members of the ecosystem.</li>
              </ul>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>6. Disclaimer of Warranties</h2>
              <p>The platform and its content are provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. We do not warrant that the platform will be uninterrupted, error-free, or free of viruses.</p>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>7. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, Global CXO Circle and its directors, employees, and affiliates shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of or inability to use this platform.</p>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>8. Governing Law</h2>
              <p>These Terms shall be governed by and construed in accordance with the laws of the State of California, United States. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts in San Francisco, California.</p>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>9. Contact Us</h2>
              <p>If you have any questions about these Terms of Service, please reach out to us:</p>
              <address style={{ fontStyle: "normal", background: "#f8f8f8", borderRadius: "10px", padding: "20px 24px", marginTop: "12px", borderLeft: "4px solid var(--tg-theme-primary)" }}>
                <strong>Global CXO Circle</strong><br />
                San Francisco, CA<br />
                Email: <ProtectedEmail user="contactus" domain="globalcxocircle.com" style={{ color: "var(--tg-theme-primary)" }} />
              </address>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TermsOfServiceArea;
