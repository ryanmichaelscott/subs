import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { S, C } from '../theme'

const DOCS = {
  '/terms': {
    title: 'Terms of Service',
    effective: 'June 21, 2026',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: 'By accessing or using the SUBS platform at subs.app (the "Platform"), creating an account, or purchasing a membership, you ("Member") agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Platform.\n\nSUBS, Inc. ("SUBS," "we," "us," or "our") is a Delaware C-Corporation operating the Platform. These Terms constitute a binding legal agreement between you and SUBS.',
      },
      {
        heading: '2. Description of Service',
        body: 'SUBS is a membership platform and marketplace that connects homeowners and property managers ("Members") with independent, third-party home service contractors ("Contractors"). SUBS facilitates introductions and provides Members access to pre-negotiated member pricing.\n\nIMPORTANT: SUBS is NOT a contractor, does NOT perform home services, and is NOT responsible for the quality, timeliness, safety, or outcome of any work performed by Contractors. Contractors are independent businesses, not employees, agents, or representatives of SUBS.',
      },
      {
        heading: '3. Membership Tiers and Pricing',
        body: 'SUBS offers the following membership tiers:',
        bullets: [
          'Free — $0 — Member discounts and access to submit service requests through the SUBS contractor network',
          'Member — $99/year — Everything in Free with a larger annual service-request allotment',
          'Full Pass — $249/year — Unlimited service requests and priority scheduling, transferable as a gift',
          'Portfolio (Property Manager) — $749/year — Up to 5 units',
          'Professional (Property Manager) — $1,899/year — Up to 20 units',
          'Enterprise (Property Manager) — Custom pricing — Unlimited units',
        ],
        footer: 'All memberships are billed annually and automatically renew unless cancelled. SUBS reserves the right to modify pricing with 30 days written notice to existing members.',
      },
      {
        heading: '4. Payment and Billing',
        body: 'Payment is processed through Stripe, Inc. By providing payment information, you authorize SUBS to charge your payment method for your selected membership tier annually. All fees are in US Dollars. SUBS does not store credit card numbers.',
      },
      {
        heading: '5. Refund Policy',
        body: 'New members may request a full refund within 30 days of their initial purchase date. After 30 days, no refunds will be issued. To request a refund, contact support@subs.app or call 1-888-454-3019. Contractor membership fees are non-refundable.',
      },
      {
        heading: '6. Limitation of Liability',
        body: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SUBS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM OR ANY SERVICES PROVIDED BY CONTRACTORS.\n\nSUBS MAKES NO WARRANTIES, EXPRESS OR IMPLIED, REGARDING THE QUALITY, SAFETY, RELIABILITY, OR SUITABILITY OF ANY CONTRACTOR OR SERVICES PERFORMED. YOUR USE OF THE PLATFORM IS AT YOUR SOLE RISK.\n\nIn no event shall SUBS\'s total liability to any Member exceed the annual membership fee paid by that Member in the 12 months preceding the claim.',
      },
      {
        heading: '7. Member Responsibilities',
        body: 'Members agree to:',
        bullets: [
          'Provide accurate and complete information when creating an account',
          'Use the Platform only for lawful purposes and in good faith',
          'Not attempt to circumvent the Platform by engaging Contractors introduced through SUBS for work outside the Platform',
          'Not resell, transfer, or share their membership with any other person',
          'Treat Contractors professionally and respectfully',
          'Report any Contractor issues to SUBS within 7 days of service at support@subs.app',
        ],
      },
      {
        heading: '8. Contractor Relationships',
        body: 'All Contractors in the SUBS network are independent businesses. SUBS requires Contractors to maintain valid licenses, insurance, and background checks. However, SUBS cannot guarantee the accuracy of Contractor credentials at all times and recommends Members verify credentials independently for significant projects.\n\nAny disputes between Members and Contractors are the sole responsibility of the parties involved. SUBS may assist in dispute resolution at its discretion but is not obligated to do so.',
      },
      {
        heading: '9. Intellectual Property',
        body: 'All content on the Platform, including but not limited to text, graphics, logos, and software, is the property of SUBS, Inc. and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.',
      },
      {
        heading: '10. Termination',
        body: 'SUBS reserves the right to suspend or terminate any membership at any time for violation of these Terms, fraudulent activity, abuse of the Platform, or any conduct deemed harmful to other Members, Contractors, or SUBS. Members may cancel their membership at any time through their account settings.',
      },
      {
        heading: '11. Modifications',
        body: 'SUBS reserves the right to modify these Terms at any time. We will provide 30 days written notice to active Members of any material changes. Continued use of the Platform after the effective date of changes constitutes acceptance of the new Terms.',
      },
      {
        heading: '12. Dispute Resolution',
        body: 'Any dispute arising from or relating to these Terms or your use of the Platform shall be resolved by binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules. Arbitration shall take place in Salt Lake County, Utah. These Terms are governed by the laws of the State of Utah.\n\nYou waive any right to participate in class action lawsuits or class-wide arbitration against SUBS.',
      },
      {
        heading: '13. Contact',
        body: 'SUBS, Inc.\nsupport@subs.app\n1-888-454-3019\nsubs.app',
      },
    ],
  },

  '/privacy': {
    title: 'Privacy Policy',
    effective: 'June 21, 2026',
    sections: [
      {
        heading: '1. Introduction',
        body: 'SUBS, Inc. ("SUBS," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform at subs.app. By using the Platform, you consent to the practices described in this Policy.',
      },
      {
        heading: '2. Information We Collect',
        subheading: '2.1 Personal Information',
        bullets: [
          'Full name',
          'Email address',
          'Phone number',
          'Physical address and zip code',
          'Payment information (processed and stored by Stripe — we do not store card numbers)',
          'Profile information and preferences',
        ],
        subheading2: '2.2 Usage Data',
        bullets2: [
          'Job requests submitted and service history',
          'Platform activity and login information',
          'Device information and IP address',
          'Communications with SUBS support',
        ],
        subheading3: '2.3 Communications Consent',
        bullets3: [
          'SMS consent status and timestamp (for Twilio SMS notifications)',
          'Email marketing preferences',
        ],
      },
      {
        heading: '3. How We Use Your Information',
        body: 'We use your information to:',
        bullets: [
          'Provide and operate the Platform and membership services',
          'Process payments and manage your membership',
          'Connect you with Contractors in our network',
          'Send transactional communications (booking confirmations, service updates, lead notifications)',
          'Send SMS notifications to members who have provided consent',
          'Respond to customer service requests',
          'Improve and develop our Platform',
          'Comply with legal obligations',
          'Enforce our Terms of Service',
        ],
      },
      {
        heading: '4. Third-Party Services',
        body: 'We share your data with the following trusted third-party service providers as necessary to operate the Platform:',
        bullets: [
          'Stripe, Inc. — Payment processing',
          'Clerk — User authentication and account management',
          'Supabase — Database and data storage',
          'Resend — Transactional email delivery',
          'Twilio — SMS notifications (with your consent)',
          'Vercel — Platform hosting and infrastructure',
          'Google — Analytics and review services',
        ],
        footer: 'Each third party is bound by their own privacy policies and data protection obligations. We do not sell your personal information to third parties.',
      },
      {
        heading: '5. SMS Communications',
        body: 'If you provide your phone number and consent to SMS communications, you agree to receive transactional text messages from SUBS including booking confirmations, service updates, and support messages. We comply with the Telephone Consumer Protection Act (TCPA). You may opt out at any time by replying STOP to any message. Message and data rates may apply. For more information visit subs.app/sms-consent.',
      },
      {
        heading: '6. Data Retention',
        body: 'We retain your personal information for the duration of your membership plus three (3) years thereafter, unless a longer retention period is required by law. You may request deletion of your data by contacting support@subs.app. Certain information may be retained as required by law or for legitimate business purposes.',
      },
      {
        heading: '7. Your Rights',
        subheading: '7.1 All Users',
        bullets: [
          'Right to access your personal information',
          'Right to correct inaccurate information',
          'Right to request deletion of your data',
          'Right to opt out of marketing communications',
        ],
        subheading2: '7.2 California Residents (CCPA)',
        body2: 'California residents have the right to: know what personal information we collect; request deletion of personal information; opt out of the sale of personal information (we do not sell personal information); and non-discrimination for exercising your rights.',
      },
      {
        heading: '8. Children\'s Privacy',
        body: 'The Platform is not intended for users under 18 years of age. We do not knowingly collect personal information from children under 18. If we become aware that we have collected information from a child under 18, we will delete that information promptly.',
      },
      {
        heading: '9. Security',
        body: 'We implement industry-standard security measures to protect your information, including encryption of data in transit and at rest. Payment information is handled exclusively by Stripe, which is PCI-DSS compliant. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.',
      },
      {
        heading: '10. Changes to This Policy',
        body: 'We may update this Privacy Policy from time to time. We will notify you of material changes by email or by posting a notice on the Platform. Your continued use of the Platform after changes become effective constitutes acceptance of the updated Policy.',
      },
      {
        heading: '11. Contact Us',
        body: 'For privacy-related questions or to exercise your rights:\n\nSUBS, Inc.\nprivacy@subs.app\nsupport@subs.app\n1-888-454-3019',
      },
    ],
  },

  '/refund-policy': {
    title: 'Refund Policy',
    effective: 'June 21, 2026',
    sections: [
      {
        heading: '1. Member Memberships — 30-Day Money Back Guarantee',
        body: 'New SUBS members (Member, Member+, and Elite tiers) are eligible for a full refund within thirty (30) days of their initial purchase date, no questions asked.',
        subheading: 'Eligibility',
        bullets: [
          'First-time purchase only (not applicable to renewals)',
          'Request must be received within 30 days of purchase date',
          'One refund per customer',
        ],
        subheading2: 'How to Request',
        bullets2: [
          'Email: support@subs.app with subject line "Refund Request"',
          'Phone: 1-888-454-3019 (Monday–Saturday, 8am–6pm MT)',
          'Include your name, email address, and reason for refund',
        ],
        subheading3: 'Processing',
        bullets3: [
          'Refunds processed within 5–10 business days',
          'Refunded to original payment method',
          'Membership access terminated upon refund processing',
        ],
      },
      {
        heading: '2. After 30 Days',
        body: 'Memberships are non-refundable after 30 days from the original purchase date. Membership access continues through the end of the paid membership year.',
      },
      {
        heading: '3. Renewal Memberships',
        body: 'Annual renewal fees are non-refundable. Members who wish to cancel should do so before their renewal date through account settings or by contacting support@subs.app.',
      },
      {
        heading: '4. Contractor Memberships',
        body: 'Contractor network membership fees are non-refundable. SUBS invests resources in contractor vetting and onboarding, and fees reflect this investment.',
      },
      {
        heading: '5. Property Manager / Enterprise Memberships',
        body: 'Portfolio and Professional tier refunds follow the same 30-day policy as residential memberships. Enterprise membership refund terms are negotiated individually and specified in the applicable Enterprise Agreement.',
      },
      {
        heading: '6. Exceptions',
        body: 'SUBS reserves the right to issue refunds outside of this policy at its sole discretion in extraordinary circumstances. Refund decisions by SUBS are final.',
      },
      {
        heading: '7. Contact',
        body: 'For refund requests or questions:\n\nEmail: support@subs.app\nPhone: 1-888-454-3019\nHours: Monday–Saturday, 8am–6pm Mountain Time\nsubs.app',
      },
    ],
  },

  '/member-agreement': {
    title: 'Member Agreement',
    effective: 'June 21, 2026',
    intro: 'This Member Agreement ("Agreement") governs your membership with SUBS, Inc. By completing signup and purchasing a membership, you agree to be bound by these terms in addition to our Terms of Service and Privacy Policy.',
    sections: [
      {
        heading: '1. Membership',
        body: 'Your SUBS membership is personal and non-transferable. You may not share, sell, gift, or otherwise transfer your membership to any other person. Each household or individual requires their own membership.',
      },
      {
        heading: '2. Platform Relationship',
        body: 'SUBS is a membership platform that connects you with independent contractors. SUBS is NOT a contractor and does NOT perform home services. You acknowledge that:',
        bullets: [
          'Contractors in our network are independent businesses, not employees or agents of SUBS',
          'SUBS is not responsible for the quality, timeliness, safety, or outcome of contractor work',
          'Any contract for services is between you and the Contractor directly',
          'SUBS facilitates introductions and pre-negotiated pricing — we are not a party to the service contract',
        ],
      },
      {
        heading: '3. Member Pricing',
        body: 'Member pricing is available exclusively through the SUBS Platform. By accepting member pricing from a Contractor introduced through SUBS, you agree not to engage that Contractor for the same or similar services outside the SUBS Platform for a period of twelve (12) months from the date of introduction, except where the Contractor has terminated their SUBS membership.',
      },
      {
        heading: '4. Service Requests',
        body: 'Service request limits apply based on your membership tier:',
        bullets: [
          'Free and Member tiers include a set number of service requests per calendar year; your current allotment and usage are shown when you submit requests',
          'Additional service requests beyond your allotment may be purchased for $25 each',
          'Full Pass: unlimited service requests',
          'Legacy Member+ and Elite memberships retain unlimited service requests',
          'Portfolio: up to 5 units covered',
          'Professional: up to 20 units covered',
        ],
        footer: 'Unused service requests do not roll over between membership years.',
      },
      {
        heading: '5. Member Conduct',
        body: 'You agree to:',
        bullets: [
          'Treat Contractors and SUBS staff with courtesy and respect',
          'Provide accurate information when submitting service requests',
          'Be present or make your property accessible for scheduled appointments',
          'Pay Contractors directly for services rendered at the agreed member rate',
          'Not use the Platform for fraudulent or unlawful purposes',
        ],
      },
      {
        heading: '6. Dispute Resolution with Contractors',
        body: 'If you experience an issue with a Contractor — including disputes over pricing, quality of work, or conduct — please report it to SUBS within seven (7) days of the service date:',
        bullets: [
          'Email: support@subs.app',
          'Phone: 1-888-454-3019',
        ],
        footer: 'SUBS will investigate complaints and may, at our discretion, remove Contractors who violate our network standards. SUBS is not liable for Contractor conduct but is committed to maintaining quality in our network.',
      },
      {
        heading: '7. Auto-Renewal and Cancellation',
        body: 'Your membership automatically renews annually on your renewal date at the then-current membership rate. You may cancel at any time through your account settings or by contacting support@subs.app. Cancellation takes effect at the end of your current membership year.',
      },
      {
        heading: '8. Refund Policy',
        body: 'New members may request a full refund within 30 days of their initial purchase. After 30 days, memberships are non-refundable. Contact support@subs.app or call 1-888-454-3019 to request a refund.',
      },
      {
        heading: '9. Governing Law',
        body: 'This Agreement is governed by the laws of the State of Utah. Disputes shall be resolved by binding arbitration in Salt Lake County, Utah, as set forth in our Terms of Service.',
      },
      {
        heading: '10. Contact',
        body: 'Questions? Contact us at support@subs.app or 1-888-454-3019.',
      },
    ],
  },
}

function Bullets({ items }) {
  return (
    <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 15, color: '#4A544C', lineHeight: 1.6 }}>
          <span style={{ color: S.green, flexShrink: 0, marginTop: 4, fontSize: 10 }}>●</span>
          {item}
        </li>
      ))}
    </ul>
  )
}

function SubHead({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: S.offwhite, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 20, marginBottom: 8 }}>{children}</div>
}

export default function LegalPage() {
  const { pathname } = useLocation()
  const doc = DOCS[pathname]

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  if (!doc) return null

  return (
    <div style={{ background: S.black, minHeight: '100vh', color: S.offwhite, fontFamily: C.body }}>
      {/* Nav */}
      <nav style={{ height: 56, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', position: 'sticky', top: 0, background: S.black + 'F2', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <Link to="/" style={{ display: 'inline-flex', textDecoration: 'none' }}><img src="/logo-wordmark.png" alt="SUBS" style={{ height: 22, width: 'auto', display: 'block' }} /></Link>
        <Link to="/" style={{ fontSize: 13, color: S.muted, textDecoration: 'none' }}>← Back</Link>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 96px' }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.green, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>SUBS, INC.</div>
          <h1 style={{ fontFamily: C.display, fontSize: 48, fontWeight: 400, color: S.offwhite, margin: '0 0 16px', lineHeight: 1.1 }}>{doc.title}</h1>
          <div style={{ fontSize: 14, color: S.muted }}>Effective Date: {doc.effective}</div>
          {doc.intro && (
            <p style={{ fontSize: 16, color: '#4A544C', lineHeight: 1.7, marginTop: 24, paddingTop: 24, borderTop: `1px solid ${S.border}` }}>{doc.intro}</p>
          )}
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {doc.sections.map((s, i) => (
            <div key={i} style={{ paddingBottom: 40, borderBottom: `1px solid ${S.border}` }}>
              <h2 style={{ fontFamily: C.display, fontSize: 24, fontWeight: 400, color: S.offwhite, margin: '0 0 16px', lineHeight: 1.25 }}>
                {s.heading}
              </h2>

              {s.body && (
                <p style={{ fontSize: 15, color: '#4A544C', lineHeight: 1.75, margin: '0 0 0', whiteSpace: 'pre-line' }}>{s.body}</p>
              )}
              {s.bullets && <Bullets items={s.bullets} />}
              {s.footer && (
                <p style={{ fontSize: 15, color: '#4A544C', lineHeight: 1.75, margin: '16px 0 0' }}>{s.footer}</p>
              )}

              {/* Multi-subheading sections (Privacy 2, 7) */}
              {s.subheading && <SubHead>{s.subheading}</SubHead>}
              {s.subheading && s.bullets && !s.body && <Bullets items={s.bullets} />}
              {s.subheading && s.body2 && <p style={{ fontSize: 15, color: '#4A544C', lineHeight: 1.75, margin: '8px 0 0' }}>{s.body2}</p>}

              {s.subheading2 && <SubHead>{s.subheading2}</SubHead>}
              {s.bullets2 && <Bullets items={s.bullets2} />}
              {s.body2 && !s.subheading && <p style={{ fontSize: 15, color: '#4A544C', lineHeight: 1.75, margin: '8px 0 0' }}>{s.body2}</p>}

              {s.subheading3 && <SubHead>{s.subheading3}</SubHead>}
              {s.bullets3 && <Bullets items={s.bullets3} />}
            </div>
          ))}
        </div>

        {/* Footer contact */}
        <div style={{ marginTop: 56, padding: '28px 32px', background: S.surface, borderRadius: 12, border: `1px solid ${S.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: S.green, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Questions?</div>
          <div style={{ fontSize: 14, color: S.muted, lineHeight: 1.8 }}>
            <div>Email: <a href="mailto:support@subs.app" style={{ color: S.offwhite, textDecoration: 'none' }}>support@subs.app</a></div>
            <div>Phone: <a href="tel:18884543019" style={{ color: S.offwhite, textDecoration: 'none' }}>1-888-454-3019</a></div>
            <div>Hours: Monday–Saturday, 8am–6pm Mountain Time</div>
          </div>
        </div>
      </div>
    </div>
  )
}
