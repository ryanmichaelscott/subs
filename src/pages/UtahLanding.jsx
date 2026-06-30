import { useState, useEffect, useRef } from 'react'


const css = `
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');

.utah-page {
  --ink:#0B0E09; --ink2:#11150F; --card:#141A12; --green:#5DFF8A;
  --bone:#F4F6F2; --ash:#9AA39A; --ash-dim:#6B736A; --line:#283026; --slash:#7A8378;
  --disp:'Archivo Black',system-ui,sans-serif; --body:'Inter',system-ui,sans-serif;
  --mono:'Space Mono',ui-monospace,monospace; --maxw:1080px;
  background:#0B0E09;
  background-image:radial-gradient(900px 500px at 88% -8%,rgba(93,255,138,.10),transparent 60%),radial-gradient(700px 420px at -10% 18%,rgba(93,255,138,.05),transparent 60%);
  background-attachment:fixed;
  color:#F4F6F2; font-family:'Inter',system-ui,sans-serif; line-height:1.5;
  font-size:16px; overflow-x:hidden; min-height:100vh;
}
.utah-page *, .utah-page *::before, .utah-page *::after { box-sizing:border-box; margin:0; padding:0; }
.utah-page a { color:inherit; text-decoration:none; }
.utah-page .wrap { width:100%; max-width:var(--maxw); margin:0 auto; padding:0 20px; }
.utah-page .eyebrow { font-family:var(--mono); font-size:12px; letter-spacing:.22em; text-transform:uppercase; color:var(--green); }
.utah-page .mono { font-family:var(--mono); }
.utah-page .strike { text-decoration:line-through; text-decoration-color:var(--slash); color:var(--slash); }

.utah-page button.btn { -webkit-appearance:none; appearance:none; outline:none; }
.utah-page .btn {
  display:inline-flex; align-items:center; justify-content:center; gap:.5em;
  font-family:var(--body); font-weight:800; font-size:1rem; letter-spacing:.01em;
  padding:16px 26px; border-radius:14px; border:2px solid transparent; cursor:pointer;
  transition:transform .12s ease,box-shadow .2s ease,background .2s ease; text-align:center;
  text-decoration:none;
}
.utah-page .btn-primary { background:var(--green); color:#06210F; box-shadow:0 10px 30px rgba(93,255,138,.22); }
.utah-page .btn-primary:hover { transform:translateY(-2px); box-shadow:0 16px 40px rgba(93,255,138,.34); }
.utah-page .btn-ghost { background:transparent; color:var(--bone); border-color:var(--line); }
.utah-page .btn-ghost:hover { border-color:var(--green); color:var(--green); }
.utah-page .btn:focus-visible { outline:3px solid var(--green); outline-offset:3px; }

.utah-page .u-banner {
  background:#0c1a0f; border-bottom:1px solid #1e3024; padding:10px 20px;
  text-align:center; font-family:var(--mono); font-size:13px; color:var(--green);
  letter-spacing:.04em; line-height:1.4;
}

.utah-page header.nav {
  position:sticky; top:0; z-index:60; backdrop-filter:saturate(140%) blur(10px);
  background:rgba(11,14,9,.78); border-bottom:1px solid var(--line);
}
.utah-page .nav-in { display:flex; align-items:center; height:62px; }
.utah-page .logo { font-family:var(--disp); font-size:22px; letter-spacing:.06em; color:var(--bone); }
.utah-page .logo b { color:var(--green); }

.utah-page section { padding:80px 0; position:relative; }
.utah-page h1, .utah-page h2, .utah-page h3 { font-family:var(--disp); font-weight:400; line-height:1.02; letter-spacing:-.01em; }

.utah-page .hero { padding-top:64px; padding-bottom:64px; }
.utah-page .hero h1 { font-size:clamp(2.5rem,9vw,4.6rem); margin:20px 0 0; }
.utah-page .hero h1 .g { color:var(--green); }
.utah-page .hero .lede { font-size:clamp(1.05rem,2.6vw,1.3rem); color:var(--ash); max-width:34ch; margin:24px 0 0; }
.utah-page .hero .lede b { color:var(--bone); font-weight:600; }
.utah-page .hero-cta { display:flex; flex-wrap:wrap; gap:12px; margin-top:36px; }
.utah-page .hero-cta .btn { flex:1 1 auto; min-width:200px; }
.utah-page .trust { display:flex; flex-wrap:wrap; gap:10px 22px; margin-top:32px; font-family:var(--mono); font-size:12.5px; color:var(--ash); letter-spacing:.02em; }
.utah-page .trust span { display:inline-flex; align-items:center; gap:8px; }
.utah-page .trust .dot { width:7px; height:7px; border-radius:50%; background:var(--green); display:inline-block; }

.utah-page .lab { font-family:var(--disp); font-size:clamp(1.7rem,5.5vw,2.6rem); line-height:1.05; margin-top:12px; }
.utah-page .section-head .eyebrow { display:block; margin-bottom:14px; }
.utah-page .section-sub { color:var(--ash); font-size:1.05rem; max-width:54ch; margin-top:18px; }

.utah-page .receipt-grid { display:grid; grid-template-columns:1fr; gap:20px; margin-top:36px; }
.utah-page .receipt { background:var(--card); border:1px solid var(--line); border-radius:16px; overflow:hidden; }
.utah-page .receipt.win { border-color:var(--green); box-shadow:0 0 0 1px rgba(93,255,138,.25),0 24px 60px rgba(0,0,0,.4); }
.utah-page .r-head { padding:14px 18px; display:flex; justify-content:space-between; align-items:center; font-family:var(--mono); font-size:12px; letter-spacing:.08em; text-transform:uppercase; }
.utah-page .r-head.no { background:#1b211a; color:var(--ash); }
.utah-page .r-head.yes { background:var(--green); color:#06210F; font-weight:700; }
.utah-page .r-body { padding:18px; }
.utah-page .r-meta { font-size:13px; color:var(--ash); padding-bottom:14px; border-bottom:1px dashed var(--line); }
.utah-page .r-line { font-size:13.5px; color:#c7cec4; padding:14px 0; border-bottom:1px dashed var(--line); }
.utah-page .r-line b { color:var(--bone); }
.utah-page .r-row { display:flex; justify-content:space-between; align-items:baseline; font-family:var(--mono); font-size:14px; margin-top:12px; color:var(--ash); }
.utah-page .r-row .v { color:var(--bone); }
.utah-page .r-row.disc .v { color:var(--green); }
.utah-page .r-total { display:flex; justify-content:space-between; align-items:baseline; margin-top:14px; padding-top:14px; border-top:2px solid var(--line); }
.utah-page .r-total .k { font-weight:700; font-size:15px; }
.utah-page .r-total .v { font-family:var(--disp); font-size:clamp(1.6rem,6vw,2rem); }
.utah-page .receipt.win .r-total .v { color:var(--green); }
.utah-page .save-callout { margin-top:22px; background:linear-gradient(180deg,rgba(93,255,138,.08),rgba(93,255,138,.02)); border:1px solid rgba(93,255,138,.35); border-radius:16px; padding:22px; }
.utah-page .save-callout .big { font-family:var(--disp); font-size:clamp(2.4rem,11vw,3.4rem); color:var(--green); line-height:1; }
.utah-page .save-callout .lab2 { font-family:var(--mono); font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:var(--ash); }
.utah-page .save-callout p { margin-top:12px; color:#cdd4c9; font-size:1rem; }
.utah-page .save-callout p b { color:var(--bone); }

.utah-page #pricing { background:linear-gradient(180deg,transparent,rgba(93,255,138,.03) 40%,transparent); }
.utah-page .price-grid { display:grid; grid-template-columns:1fr; gap:22px; margin-top:40px; }
.utah-page .plan { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:32px 28px; position:relative; }
.utah-page .plan.elite { border-color:var(--green); box-shadow:0 0 0 1px rgba(93,255,138,.3),0 30px 70px rgba(0,0,0,.5); background:linear-gradient(180deg,#16201526,var(--card)); }
.utah-page .plan .tier { font-family:var(--mono); font-size:12px; letter-spacing:.18em; text-transform:uppercase; color:var(--ash); }
.utah-page .plan.elite .tier { color:var(--green); }
.utah-page .plan .badge { position:absolute; top:-12px; right:18px; background:var(--green); color:#06210F; font-family:var(--mono); font-weight:700; font-size:11px; letter-spacing:.08em; padding:6px 12px; border-radius:30px; text-transform:uppercase; }
.utah-page .plan h3 { font-size:1.5rem; margin-top:6px; }
.utah-page .price { display:flex; align-items:flex-end; gap:10px; margin:16px 0 4px; flex-wrap:wrap; }
.utah-page .price .now { font-family:var(--disp); font-size:3.6rem; line-height:.9; color:var(--bone); }
.utah-page .plan.elite .price .now { color:var(--green); }
.utah-page .price .was { font-family:var(--mono); font-size:1.4rem; }
.utah-page .price .per { font-family:var(--mono); font-size:.95rem; color:var(--ash); padding-bottom:6px; }
.utah-page .price-note { font-size:13px; color:var(--ash); min-height:18px; }
.utah-page .plan ul { list-style:none; margin:24px 0 28px; display:flex; flex-direction:column; gap:13px; }
.utah-page .plan li { display:flex; gap:11px; font-size:14.5px; color:#d4dace; align-items:flex-start; }
.utah-page .plan li svg { flex:0 0 18px; margin-top:2px; }
.utah-page .plan .btn { width:100%; }

.shaker { display:inline-block; transform-origin:center 70%; will-change:transform; }
@keyframes tagshake {
  0%,15.5%,100%{ transform:translateX(0) rotate(0); }
  2%{ transform:translateX(-5px) rotate(-3.5deg); }
  4%{ transform:translateX(5px) rotate(3.5deg); }
  6%{ transform:translateX(-5px) rotate(-3deg); }
  8%{ transform:translateX(4px) rotate(2.5deg); }
  10%{ transform:translateX(-4px) rotate(-2deg); }
  12%{ transform:translateX(3px) rotate(1.4deg); }
  14%{ transform:translateX(-1px) rotate(0); }
}
.shaker.go { animation:tagshake 3s ease-in-out infinite; }

.utah-page .trades { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-top:32px; }
.utah-page .trade { background:var(--ink2); border:1px solid var(--line); border-radius:12px; padding:13px 14px; font-size:13.5px; font-weight:600; display:flex; align-items:center; gap:9px; }
.utah-page .trade .tk { width:7px; height:7px; border-radius:50%; background:var(--green); flex:0 0 auto; }
.utah-page .more-trades { margin-top:14px; font-family:var(--mono); color:var(--green); font-size:14px; }

.utah-page .steps { display:grid; grid-template-columns:1fr; gap:16px; margin-top:36px; }
.utah-page .step { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:26px 24px; display:flex; gap:18px; align-items:flex-start; }
.utah-page .step .n { font-family:var(--disp); color:#06210F; background:var(--green); width:38px; height:38px; flex:0 0 38px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:18px; }
.utah-page .step h3 { font-size:1.15rem; }
.utah-page .step p { color:var(--ash); font-size:14.5px; margin-top:6px; }

.utah-page .guarantee { background:var(--green); color:#06210F; border-radius:22px; padding:48px 32px; text-align:center; }
.utah-page .guarantee .eyebrow { color:#06210F; opacity:.7; }
.utah-page .guarantee h2 { font-size:clamp(1.6rem,6vw,2.4rem); margin:12px 0; color:#06210F; }
.utah-page .guarantee p { font-size:1.05rem; max-width:46ch; margin:0 auto; font-weight:600; }
.utah-page .guarantee .shield { width:54px; height:54px; margin:0 auto 6px; }

.utah-page .faq { margin-top:36px; border-top:1px solid var(--line); }
.utah-page .qa { border-bottom:1px solid var(--line); }
.utah-page .qa button { width:100%; background:none; border:none; color:var(--bone); font-family:var(--body); font-weight:700; font-size:1.05rem; text-align:left; padding:20px 40px 20px 0; cursor:pointer; position:relative; }
.utah-page .qa button:focus-visible { outline:2px solid var(--green); outline-offset:3px; border-radius:6px; }
.utah-page .qa .plus { position:absolute; right:2px; top:50%; transform:translateY(-50%); width:20px; height:20px; transition:transform .25s ease; color:var(--green); }
.utah-page .qa.open .plus { transform:translateY(-50%) rotate(45deg); }
.utah-page .qa .ans { max-height:0; overflow:hidden; transition:max-height .35s ease; }
.utah-page .qa.open .ans { max-height:200px; }
.utah-page .qa .ans p { color:var(--ash); padding:0 0 20px; font-size:15px; max-width:62ch; }

.utah-page .final { text-align:center; }
.utah-page .final h2 { font-size:clamp(2rem,8vw,3.4rem); }
.utah-page .final h2 .g { color:var(--green); }
.utah-page .final .btn { margin-top:24px; padding:18px 40px; font-size:1.1rem; }
.utah-page .final .phone { margin-top:18px; font-family:var(--mono); font-size:1.1rem; }
.utah-page .final .phone a { color:var(--green); }

.utah-page footer { border-top:1px solid var(--line); padding:48px 0 120px; color:var(--ash-dim); font-size:12.5px; }
.utah-page footer .logo { font-size:18px; margin-bottom:10px; }
.utah-page footer .fine { font-size:11.5px; line-height:1.6; max-width:70ch; margin-top:12px; }
.utah-page footer a { color:var(--ash); }

.utah-page .stickybar {
  position:fixed; left:0; right:0; bottom:0; z-index:70; background:rgba(11,14,9,.92);
  backdrop-filter:blur(10px); border-top:1px solid var(--line); padding:11px 16px;
  display:flex; align-items:center; gap:12px; transform:translateY(120%); transition:transform .3s ease;
}
.utah-page .stickybar.show { transform:translateY(0); }
.utah-page .stickybar .sb-txt { flex:1; line-height:1.1; }
.utah-page .stickybar .sb-txt .a { font-family:var(--mono); font-size:11px; color:var(--ash); }
.utah-page .stickybar .sb-txt .b { font-family:var(--disp); font-size:18px; }
.utah-page .stickybar .sb-txt .b .s { color:var(--slash); text-decoration:line-through; font-size:14px; }
.utah-page .stickybar .sb-txt .b .g { color:var(--green); }
.utah-page .stickybar .btn { padding:12px 20px; border-radius:11px; }

.utah-page .rv { opacity:0; transform:translateY(18px); transition:opacity .6s ease,transform .6s ease; }
.utah-page .rv.in { opacity:1; transform:none; }

@media (prefers-reduced-motion:reduce) {
  .shaker.go { animation:none; }
  .utah-page .rv { opacity:1; transform:none; transition:none; }
}
@media (min-width:760px) {
  .utah-page .receipt-grid { grid-template-columns:1fr 1fr; gap:24px; }
  .utah-page .save-callout { display:flex; align-items:center; gap:36px; }
  .utah-page .save-callout .big { flex:0 0 auto; }
  .utah-page .price-grid { grid-template-columns:1fr 1fr; align-items:start; }
  .utah-page .trades { grid-template-columns:repeat(3,1fr); gap:14px; }
  .utah-page .steps { grid-template-columns:repeat(3,1fr); gap:20px; }
  .utah-page .stickybar { display:none; }
  .utah-page section { padding:100px 0; }
  .utah-page .hero { padding-top:80px; padding-bottom:80px; }
  .utah-page .hero .lede { max-width:46ch; }
}
@media (min-width:1000px) {
  .utah-page .trades { grid-template-columns:repeat(4,1fr); }
  .utah-page .hero { display:grid; grid-template-columns:1.05fr .95fr; gap:40px; align-items:center; }
  .utah-page .hero-copy { grid-column:1; }
  .utah-page .hero-proof { grid-column:2; }
}
@media (max-width:999px) { .utah-page .hero-proof { display:none; } }
`

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="#5DFF8A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

const faqs = [
  {
    q: 'How can you offer contractor prices?',
    a: "SUBS brings vetted Utah contractors a steady stream of members instead of one-off jobs. In exchange, they extend their wholesale rate — the price they'd give a builder or repeat client — and we pass it straight to you.",
  },
  {
    q: "What if I don't save enough to cover the membership?",
    a: "Then you get your money back. If your membership doesn't save you more than it costs, we refund it — no fine print.",
  },
  {
    q: 'Do I have to use it a certain number of times?',
    a: "No. Most members cover the cost on a single job. Use it once or use it for every project on the house — it's yours for the year either way.",
  },
  {
    q: 'Are these real, licensed contractors?',
    a: 'Yes — every pro in the network is vetted, licensed, and insured. You get the same quality work, at the price the pros pay.',
  },
  {
    q: 'Can I cancel?',
    a: 'You have a 3-day right to cancel after joining, and you can cancel your renewal anytime before it bills.',
  },
]

export default function UtahLanding() {
  const [openFaq, setOpenFaq] = useState(null)
  const [stickyVisible, setStickyVisible] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const pricingRef = useRef(null)

  const handleCheckout = async () => {
    if (checkoutLoading) return
    setCheckoutLoading(true)
    if (window.fbq) window.fbq('track', 'InitiateCheckout')
    sessionStorage.setItem('subs_checkout_plan', 'elite')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'elite', coupon: 'DOOR100' }),
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error('Non-JSON response: ' + text.slice(0, 200)) }
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'No URL returned')
      }
    } catch (err) {
      setCheckoutLoading(false)
      alert('Something went wrong. Please call or text us at (888) 454-3019 and we\'ll get you set up right away.')
    }
  }

  useEffect(() => {
    if (window.fbq) window.fbq('track', 'Lead')
  }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'SUBS — Home Services at Wholesale Prices | For Utah Homeowners'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const prevScroll = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.title = prev
      document.head.removeChild(meta)
      document.documentElement.style.scrollBehavior = prevScroll
    }
  }, [])

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = document.querySelectorAll('.utah-page .rv')
    if (!prefersReduced && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
      }, { threshold: 0.12 })
      els.forEach(el => io.observe(el))
      return () => io.disconnect()
    } else {
      els.forEach(el => el.classList.add('in'))
    }
  }, [])

  useEffect(() => {
    const onScroll = () => { if (window.scrollY > 60) setStickyVisible(true) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleFaq = i => setOpenFaq(prev => (prev === i ? null : i))

  return (
    <>
      <style>{css}</style>
      <div className="utah-page">

        {/* Countdown Banner */}
        <div className="u-banner">
          🔒 Limited offer — $100 off Elite membership. Offer expires July 31, 2026
        </div>

        {/* Nav — logo only */}
        <header className="nav">
          <div className="wrap nav-in">
            <span className="logo">SUB<b>S.</b></span>
          </div>
        </header>

        <a id="top" />

        {/* Hero */}
        <section className="hero wrap">
          <div className="hero-copy">
            <span className="eyebrow">For Utah homeowners</span>
            <h1>The <span className="g">Costco</span> for home maintenance.</h1>
            <p className="lede">One membership. <b>Contractor pricing on every home service</b> — roofing, HVAC, plumbing, solar, remodels, and 34 more. Members save <b>20–35%</b> on every job.</p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="#pricing">See membership &amp; pricing</a>
              <a className="btn btn-ghost" href="tel:+18884543019">Call or text us</a>
            </div>
            <div className="trust">
              <span><i className="dot" />39 trades</span>
              <span><i className="dot" />Money-back guarantee</span>
              <span><i className="dot" />Utah-based</span>
              <span><i className="dot" />Vetted local pros</span>
            </div>
          </div>

          <div className="hero-proof">
            <div className="receipt win">
              <div className="r-head yes"><span>With SUBS</span><span>est. #6935</span></div>
              <div className="r-body">
                <div className="r-meta">Exterior repaint &middot; Utah home</div>
                <div className="r-line"><b>Re-paint</b> — masonry &amp; siding, prep, pre-wash &amp; caulk. Sherwin-Williams SuperPaint.</div>
                <div className="r-row"><span>Subtotal</span><span className="v">$14,219.00</span></div>
                <div className="r-row disc"><span>Member discount (25%)</span><span className="v">− $3,554.75</span></div>
                <div className="r-total"><span className="k">You pay</span><span className="v">$10,664.25</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Homeowner Tax */}
        <section className="wrap section-head rv">
          <span className="eyebrow">The homeowner tax</span>
          <div className="lab">Every home job has two prices.</div>
          <p className="section-sub">What the contractor pays, and what <em>you</em> pay. The gap is the homeowner tax — the markup you eat for being a one-time customer instead of a steady one. SUBS puts you on the contractor side of every quote.</p>

          <div className="receipt-grid">
            <div className="receipt rv">
              <div className="r-head no"><span>Without SUBS</span><span>est. #6934</span></div>
              <div className="r-body">
                <div className="r-meta">Exterior repaint &middot; Utah home</div>
                <div className="r-line"><b>Re-paint</b> — masonry &amp; siding, prep, pre-wash &amp; caulk. Sherwin-Williams SuperPaint.</div>
                <div className="r-row"><span>Subtotal</span><span className="v">$14,219.00</span></div>
                <div className="r-row"><span>Member discount</span><span className="v" style={{ color: 'var(--slash)' }}>none</span></div>
                <div className="r-total"><span className="k">You pay</span><span className="v">$14,219.00</span></div>
              </div>
            </div>
            <div className="receipt win rv">
              <div className="r-head yes"><span>With SUBS</span><span>est. #6935</span></div>
              <div className="r-body">
                <div className="r-meta">Exterior repaint &middot; Utah home</div>
                <div className="r-line"><b>Re-paint</b> — masonry &amp; siding, prep, pre-wash &amp; caulk. Sherwin-Williams SuperPaint.</div>
                <div className="r-row"><span>Subtotal</span><span className="v">$14,219.00</span></div>
                <div className="r-row disc"><span>Member discount (25%)</span><span className="v">− $3,554.75</span></div>
                <div className="r-total"><span className="k">You pay</span><span className="v">$10,664.25</span></div>
              </div>
            </div>
          </div>

          <div className="save-callout rv">
            <div>
              <div className="lab2">You save</div>
              <div className="big">$3,554.75</div>
            </div>
            <p>on a <b>single</b> exterior paint job — your membership pays for itself many times over on one project, before you touch the other 38 trades.</p>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="wrap rv" ref={pricingRef}>
          <span className="eyebrow">Membership</span>
          <div className="lab">Pick your membership.</div>
          <p className="section-sub">One flat yearly price unlocks member pricing across the SUBS contractor network. No monthly fees. Cancel anytime.</p>

          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div className="plan elite">
              <div className="badge">Founding price</div>
              <div className="tier">Elite</div>
              <h3>Wholesale on everything</h3>
              <div className="price">
                <span className="shaker go"><span className="now">$249</span></span>
                <span className="was strike">$349</span>
                <span className="per">/ year</span>
              </div>
              <div className="price-note">Neighborhood founding rate — locked the day you join.</div>
              <ul>
                <li>{CHECK} <span><b>Unlimited service requests</b></span></li>
                <li>{CHECK} <span>Maximum wholesale discounts — <b>20–35% off</b> every trade</span></li>
                <li>{CHECK} <span>White-glove concierge — we line up the pro &amp; manage the job</span></li>
                <li>{CHECK} <span>Priority scheduling</span></li>
                <li>{CHECK} <span>Vetted, licensed &amp; insured Utah pros</span></li>
                <li>{CHECK} <span>Money-back savings guarantee</span></li>
                <li>{CHECK} <span>All 39 trades, one membership</span></li>
              </ul>
              <button className="btn btn-primary" onClick={handleCheckout} disabled={checkoutLoading}>{checkoutLoading ? 'Loading…' : 'Claim founding price — $249'}</button>
            </div>
          </div>
          <p className="price-note" style={{ marginTop: 20, textAlign: 'center' }}>
            Prices in USD. 3-day right to cancel. Savings vary by job scope &amp; contractor.
          </p>
          <p className="price-note" style={{ marginTop: 8, textAlign: 'center', color: 'var(--ash-dim)' }}>
            Member and Member+ plans also available — visit <a href="https://subs.app" style={{ color: 'var(--ash)' }}>subs.app</a>
          </p>
        </section>

        {/* Trades */}
        <section className="wrap rv">
          <span className="eyebrow">What's covered</span>
          <div className="lab">Every trade. One membership.</div>
          <p className="section-sub">If it's a job on your house, it's in here — at member pricing.</p>
          <div className="trades">
            {['Roofing','HVAC','Plumbing','Electrical','Solar','Kitchen Remodel','Bath Remodel','Windows & Doors','Painting','Flooring','Landscaping','Pest Control','Handyman','Garage Door','House Cleaning'].map(t => (
              <div className="trade" key={t}><span className="tk" />{t}</div>
            ))}
          </div>
          <div className="more-trades">+ 24 more — all under one membership.</div>
        </section>

        {/* Steps */}
        <section className="wrap rv">
          <span className="eyebrow">How it works</span>
          <div className="lab">Three steps. Real savings.</div>
          <div className="steps">
            <div className="step"><div className="n">1</div><div><h3>Join</h3><p>Pick Member or Elite. One yearly membership — no monthly fees.</p></div></div>
            <div className="step"><div className="n">2</div><div><h3>Call SUBS for any job</h3><p>From a $140 repair to a $50k remodel, we match you with a vetted Utah pro.</p></div></div>
            <div className="step"><div className="n">3</div><div><h3>Pay the member price</h3><p>You pay the contractor (wholesale) rate — about 30% under retail.</p></div></div>
          </div>
        </section>

        {/* Guarantee */}
        <section className="wrap rv">
          <div className="guarantee">
            <svg className="shield" viewBox="0 0 24 24" fill="none" stroke="#06210F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l8 3v6c0 5-3.5 8-8 11-4.5-3-8-6-8-11V5l8-3z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span className="eyebrow">Money-back guarantee</span>
            <h2>Save more than you spend — or get refunded.</h2>
            <p>If SUBS doesn't save you more than your membership costs, we'll refund you. Guaranteed.</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="wrap rv">
          <span className="eyebrow">Questions</span>
          <div className="lab">Straight answers.</div>
          <div className="faq" id="faq">
            {faqs.map((item, i) => (
              <div className={`qa${openFaq === i ? ' open' : ''}`} key={i}>
                <button onClick={() => toggleFaq(i)}>
                  {item.q}
                  <span className="plus">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>
                <div className="ans"><p>{item.a}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="wrap final rv">
          <span className="eyebrow">Founding member price</span>
          <h2>One membership.<br /><span className="g">Every trade, wholesale.</span></h2>
          <p className="section-sub" style={{ margin: '14px auto 0' }}>Join the first homes in your neighborhood at the founding rate.</p>
          <div><button className="btn btn-primary" onClick={handleCheckout} disabled={checkoutLoading}>{checkoutLoading ? 'Loading…' : 'Claim $249 founding price'}</button></div>
          <div className="phone">or call / text <a href="tel:+18884543019">1-888-454-3019</a></div>
        </section>

        <footer>
          <div className="wrap">
            <div className="logo">SUB<b style={{ color: 'var(--green)' }}>S.</b></div>
            <div>Home services. Wholesale prices. &middot; <a href="https://subs.app">subs.app</a> &middot; <a href="tel:+18884543019">1-888-454-3019</a></div>
            <p className="fine">Savings estimates based on Utah market rates; actual savings vary by job scope and contractor. Member pricing available through the SUBS contractor network. Sample estimate shown for illustration. &copy; 2026 SUBS.</p>
          </div>
        </footer>

        {/* Sticky Mobile Bar */}
        <div className={`stickybar${stickyVisible ? ' show' : ''}`}>
          <div className="sb-txt">
            <div className="a">Founding member price</div>
            <div className="b"><span className="s">$349</span> <span className="g">$249</span>/yr</div>
          </div>
          <button className="btn btn-primary" onClick={handleCheckout} disabled={checkoutLoading}>{checkoutLoading ? 'Loading…' : 'Join'}</button>
        </div>

      </div>
    </>
  )
}
