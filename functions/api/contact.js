/**
 * KRIPTONSHARE — Cloudflare Pages Function
 * POST /api/contact
 *
 * Handles the website contact form. Two storage options (use one or both):
 *
 *   A) CONTACT_WEBHOOK (env var, fastest setup — recommended to start):
 *      Forwards the lead as JSON to any endpoint that accepts a POST,
 *      e.g. a free Formspree form (https://formspree.io) which emails it
 *      to you, a Slack/Discord webhook, or a Make/Zapier hook.
 *      Set it in: Pages project → Settings → Environment variables.
 *
 *   B) DB (D1 binding, optional): inserts the lead into a `leads` table
 *      in Cloudflare D1 — same place where KRIPTONSHARE already keeps
 *      part of its data. Create the table with:
 *
 *        CREATE TABLE leads (
 *          id INTEGER PRIMARY KEY AUTOINCREMENT,
 *          name TEXT NOT NULL,
 *          company TEXT,
 *          email TEXT NOT NULL,
 *          phone TEXT,
 *          interest TEXT,
 *          message TEXT NOT NULL,
 *          lang TEXT,
 *          created_at TEXT DEFAULT (datetime('now'))
 *        );
 *
 *      Then bind it: Pages project → Settings → Functions → D1 bindings
 *      → variable name "DB".
 *
 * If neither is configured the function returns 503 and the website
 * falls back to a mailto link, so the form never silently loses a lead.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const name = (data.name || '').toString().trim();
  const email = (data.email || '').toString().trim();
  const message = (data.message || '').toString().trim();
  if (!name || !EMAIL_RE.test(email) || !message) {
    return json({ ok: false, error: 'invalid_fields' }, 400);
  }

  const lead = {
    name,
    company: (data.company || '').toString().trim(),
    email,
    phone: (data.phone || '').toString().trim(),
    interest: (data.interest || '').toString().trim(),
    message,
    lang: (data.lang || '').toString().trim(),
    page: (data.page || '').toString().trim(),
    submitted_at: new Date().toISOString()
  };

  let stored = false;

  // Option B: Cloudflare D1
  if (env.DB) {
    try {
      await env.DB.prepare(
        'INSERT INTO leads (name, company, email, phone, interest, message, lang) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(lead.name, lead.company, lead.email, lead.phone, lead.interest, lead.message, lead.lang).run();
      stored = true;
    } catch (e) {
      console.error('D1 insert failed', e);
    }
  }

  // Option A: webhook forward (Formspree / Slack / Make / Zapier…)
  if (env.CONTACT_WEBHOOK) {
    try {
      const res = await fetch(env.CONTACT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(lead)
      });
      if (res.ok) stored = true;
    } catch (e) {
      console.error('Webhook forward failed', e);
    }
  }

  if (!stored) {
    return json({ ok: false, error: 'not_configured' }, 503);
  }
  return json({ ok: true });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
