import { NextResponse } from 'next/server';

function esc(input: string) {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') === 'gpay' ? 'gpay' : 'upi';
    const pa = searchParams.get('pa') || '';
    const pn = searchParams.get('pn') || 'Local Shop Finder';
    const am = searchParams.get('am') || '0.00';
    const cu = searchParams.get('cu') || 'INR';
    const tn = searchParams.get('tn') || 'Local Shop Finder payment';

    const upiRegex = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/;
    if (!upiRegex.test(pa)) {
        return NextResponse.json({ error: 'Invalid UPI ID configured' }, { status: 400 });
    }

    const upiQuery = new URLSearchParams({ pa, pn, am, cu, tn }).toString();
    const upiLink = `upi://pay?${upiQuery}`;
    const anyUpiAndroidIntent = `intent://upi/pay?${upiQuery}#Intent;scheme=upi;end`;

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Open Payment App</title>
  <style>
    body { font-family: Arial, sans-serif; background:#f8fafc; margin:0; padding:24px; color:#0f172a; }
    .card { max-width:520px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:20px; }
    .btn { display:inline-block; padding:12px 14px; border-radius:10px; text-decoration:none; font-weight:700; margin-right:8px; margin-top:8px; }
    .btn-primary { background:#1a73e8; color:#fff; }
    .btn-secondary { background:#111827; color:#fff; }
    .muted { color:#475569; font-size:13px; }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="margin-top:0;">Opening ${mode === 'gpay' ? 'GPay' : 'UPI App'}</h2>
    <p class="muted">If app does not open automatically, tap Pay Now.</p>
    <a class="btn btn-primary" href="${esc(anyUpiAndroidIntent)}">Pay Now</a>
    <p class="muted" style="margin-top:14px;">UPI ID: ${esc(pa)} | Amount: Rs ${esc(am)}</p>
  </div>
  <script>
    (function () {
      var ua = navigator.userAgent || '';
      var isAndroid = /Android/i.test(ua);
      var isIOS = /iPhone|iPad|iPod/i.test(ua);
      var primary = ${JSON.stringify(mode === 'gpay' ? '__G_PAY__' : upiLink)};
      if (primary === '__G_PAY__') {
        primary = isAndroid ? ${JSON.stringify(anyUpiAndroidIntent)} : (isIOS ? ${JSON.stringify(upiLink)} : ${JSON.stringify(upiLink)});
      }
      var fallback = ${JSON.stringify(upiLink)};
      setTimeout(function () { window.location.href = primary; }, 200);
      setTimeout(function () { window.location.href = fallback; }, 1200);
    })();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
        status: 200,
    });
}
