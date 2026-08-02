const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html is missing before the mobile funnel fix.');
}

let html = fs.readFileSync(indexPath, 'utf8');

const mobileFixCss = `
<style id="cashflow-mobile-scroll-fix">
/* iOS / mobile viewport and scroll fix for the cashflow funnel */
@media (max-width: 760px) {
  .cf-funnel {
    display: block !important;
    width: 100%;
    height: 100dvh;
    min-height: 100svh;
    padding: 0 !important;
    overflow: hidden !important;
    overscroll-behavior: contain;
  }

  .cf-shell {
    width: 100% !important;
    height: 100dvh !important;
    min-height: 0 !important;
    max-height: none !important;
    grid-template-columns: minmax(0, 1fr) !important;
    overflow: hidden !important;
    border: 0 !important;
    border-radius: 0 !important;
  }

  .cf-main {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    padding: calc(16px + env(safe-area-inset-top)) 18px calc(12px + env(safe-area-inset-bottom)) !important;
  }

  .cf-head {
    flex: 0 0 auto;
    gap: 10px !important;
    min-height: 48px;
  }

  .cf-brand {
    max-width: 154px;
    overflow: hidden;
    font-size: .58rem !important;
    letter-spacing: .1em !important;
    text-overflow: ellipsis;
  }

  .cf-brand img {
    width: 27px !important;
    height: 27px !important;
  }

  .cf-progress-wrap {
    min-width: 0;
  }

  .cf-progress-meta {
    min-width: 54px !important;
    font-size: .58rem !important;
  }

  .cf-close {
    width: 42px !important;
    height: 42px !important;
    flex: 0 0 42px;
  }

  .cf-content {
    flex: 1 1 auto;
    min-height: 0 !important;
    align-items: stretch !important;
    overflow: hidden !important;
    padding: 15px 0 0 !important;
  }

  .cf-view {
    box-sizing: border-box;
    width: 100%;
    height: 100% !important;
    max-height: none !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    touch-action: pan-y;
    padding: 5px 3px calc(120px + env(safe-area-inset-bottom)) 0 !important;
    scroll-padding-bottom: calc(120px + env(safe-area-inset-bottom));
  }

  .cf-title {
    font-size: clamp(2.15rem, 11vw, 3.15rem) !important;
    line-height: 1.01 !important;
  }

  .cf-lede {
    margin: 14px 0 20px !important;
    font-size: .88rem !important;
    line-height: 1.62 !important;
  }

  .cf-contact-grid {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  .cf-field.cf-full {
    grid-column: auto !important;
  }

  .cf-input {
    min-height: 56px !important;
    font-size: 16px !important;
  }

  .cf-checkbox {
    font-size: .72rem !important;
    line-height: 1.5 !important;
  }

  .cf-submit {
    min-height: 58px !important;
    margin-bottom: 8px;
  }

  .cf-nav-row {
    padding-bottom: 4px;
  }

  .cf-side {
    display: none !important;
  }

  .cf-input:-webkit-autofill,
  .cf-input:-webkit-autofill:hover,
  .cf-input:-webkit-autofill:focus {
    -webkit-text-fill-color: #f2eee5 !important;
    -webkit-box-shadow: 0 0 0 1000px #111 inset !important;
    caret-color: #f2eee5;
    transition: background-color 9999s ease-out 0s;
  }
}

@supports not (height: 100dvh) {
  @media (max-width: 760px) {
    .cf-funnel,
    .cf-shell {
      height: 100vh !important;
    }
  }
}
</style>`;

if (html.includes('id="cashflow-mobile-scroll-fix"')) {
  html = html.replace(/<style id="cashflow-mobile-scroll-fix">[\s\S]*?<\/style>/, mobileFixCss);
} else if (html.includes('</head>')) {
  html = html.replace('</head>', `${mobileFixCss}\n</head>`);
} else {
  throw new Error('Could not inject the mobile cashflow funnel fix because </head> is missing.');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Cashflow funnel mobile scrolling and safe-area handling fixed.');
