import ProtectedEmail from "@/components/common/ProtectedEmail";

const PrivacyPolicyArea = () => {
  const lastUpdated = "May 5, 2026";

  return (
    <section style={{ padding: "100px 0 80px", background: "#fff" }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div style={{ marginBottom: "48px" }}>
              <span style={{ background: "var(--tg-color-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", fontSize: "13px", display: "inline-block", marginBottom: "12px" }}>Legal</span>
              <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "#1A1A1A", marginBottom: "12px", letterSpacing: "-1px" }}>Privacy Policy</h1>
              <p style={{ fontSize: "14px", color: "#888" }}>Last updated: {lastUpdated}</p>
            </div>

            <div style={{ fontSize: "16px", lineHeight: 1.8, color: "#444" }}>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>1. Who We Are</h2>
              <p>Global CXO Circle ("we", "us", or "our") is an exclusive ecosystem for executive alignment headquartered in San Francisco, CA. We operate this website to provide information and manage our membership network. For questions about this policy, please contact us at <ProtectedEmail user="contactus" domain="globalcxocircle.com" style={{ color: "var(--tg-theme-primary)" }} />.</p>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>2. Information We Collect</h2>
              <p>We may collect the following categories of information:</p>
              <ul style={{ paddingLeft: "24px", marginBottom: "16px" }}>
                <li style={{ marginBottom: "8px" }}><strong>Contact information</strong> – name, email address, phone number, and company details when you submit an application or contact form.</li>
                <li style={{ marginBottom: "8px" }}><strong>Usage data</strong> – pages visited, time spent, referring URL, browser type, and device type, collected automatically via cookies and analytics tools.</li>
                <li style={{ marginBottom: "8px" }}><strong>Professional profile</strong> – information about your executive role, industry, and interests, used for matching and circle placement.</li>
              </ul>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul style={{ paddingLeft: "24px", marginBottom: "16px" }}>
                <li style={{ marginBottom: "8px" }}>Evaluate membership applications and facilitate connections.</li>
                <li style={{ marginBottom: "8px" }}>Communicate regarding ecosystem events, updates, and opportunities.</li>
                <li style={{ marginBottom: "8px" }}>Improve our platform experience and content offerings.</li>
                <li style={{ marginBottom: "8px" }}>Comply with applicable legal obligations.</li>
              </ul>
              <p>We do <strong>not</strong> sell your personal data to third parties.</p>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>4. Cookies</h2>
              <p>We use essential cookies to ensure the website functions correctly and analytical cookies to understand how visitors interact with our site. You can disable cookies in your browser settings; however, some features may not work as expected.</p>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>5. Data Sharing</h2>
              <p>We may share your data with trusted third-party service providers (e.g., event platforms, email services) solely for the purpose of operating our ecosystem. These providers are contractually obligated to keep your data secure and confidential.</p>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>6. Your Rights</h2>
              <p>Depending on your jurisdiction, you may have the right to access, correct, or delete any personal data we hold about you. To exercise any of these rights, email us at <ProtectedEmail user="contactus" domain="globalcxocircle.com" style={{ color: "var(--tg-theme-primary)" }} />.</p>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1A1A", marginTop: "40px", marginBottom: "12px" }}>7. Contact Us</h2>
              <p>If you have any questions or concerns about this Privacy Policy, please contact:</p>
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

export default PrivacyPolicyArea;
