/**
 * KRIPTONSHARE — Cloudflare Pages Function
 * GET /room/<id>
 *
 * Deep-link landing for shared data room links. It tries to open the
 * native app (kriptonshare://room/<id>) and falls back to the web app
 * at app.kriptonshare.com. Bilingual EN/ES by Accept-Language.
 */
export async function onRequestGet(context) {
  const id = context.params.id || '';
  const safeId = encodeURIComponent(id);
  const accept = context.request.headers.get('Accept-Language') || 'en';
  const es = accept.toLowerCase().startsWith('es');

  const t = es ? {
    title: 'Abriendo KRIPTONSHARE…',
    body: 'Te estamos llevando al data room seguro. Si nada sucede en unos segundos, usa una de las opciones de abajo.',
    openApp: 'Abrir en la app',
    openWeb: 'Continuar en el navegador',
    noApp: '¿No tienes la app? El data room también funciona en tu navegador con la misma seguridad: cifrado AES-256, watermark dinámico y auto-destrucción.'
  } : {
    title: 'Opening KRIPTONSHARE…',
    body: 'Taking you to the secure data room. If nothing happens in a few seconds, use one of the options below.',
    openApp: 'Open in the app',
    openWeb: 'Continue in browser',
    noApp: "Don't have the app? The data room also works in your browser with the same security: AES-256 encryption, dynamic watermark and self-destruction."
  };

  const html = `<!DOCTYPE html>
<html lang="${es ? 'es' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KRIPTONSHARE — Secure Room</title>
<link rel="icon" type="image/png" href="/assets/img/favicon.png">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0A0A0F;color:#E8E8E8;font-family:'Inter',sans-serif;padding:24px}
  .card{max-width:440px;text-align:center;background:#15151F;border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:44px 34px}
  img{height:64px;margin:0 auto 22px}
  h1{font-size:22px;margin:0 0 12px}
  p{color:#A0A0A0;font-size:14.5px;margin:0 0 26px}
  .mono{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#4E9B47;letter-spacing:.1em;margin-bottom:18px}
  a.btn{display:block;padding:14px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;margin-bottom:12px}
  .lime{background:#39FF14;color:#121212}
  .ghost{border:1px solid rgba(57,255,20,.35);color:#39FF14}
  small{display:block;margin-top:18px;color:#A0A0A0;font-size:12px}
</style>
</head>
<body>
  <div class="card">
    <img src="/assets/img/logo-mark.png" alt="KRIPTONSHARE">
    <div class="mono">AES-256 · EPHEMERAL LINK · ZERO-KNOWLEDGE</div>
    <h1>${t.title}</h1>
    <p>${t.body}</p>
    <a class="btn lime" href="kriptonshare://room/${safeId}">${t.openApp}</a>
    <a class="btn ghost" href="https://app.kriptonshare.com/room/${safeId}">${t.openWeb}</a>
    <small>${t.noApp}</small>
  </div>
  <script>
    setTimeout(function(){ window.location.href = 'kriptonshare://room/${safeId}'; }, 400);
    setTimeout(function(){ window.location.href = 'https://app.kriptonshare.com/room/${safeId}'; }, 2500);
  </script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
