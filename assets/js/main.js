/* KRIPTONSHARE — main.js */
document.addEventListener('DOMContentLoaded', () => {
  /* Mobile nav */
  const nav = document.querySelector('.nav');
  const burger = document.querySelector('.hamburger');
  if (burger) {
    burger.addEventListener('click', () => {
      nav.classList.toggle('mobile-open');
      burger.classList.toggle('open');
    });
    nav.querySelectorAll('.nav-links a').forEach(a =>
      a.addEventListener('click', () => { nav.classList.remove('mobile-open'); burger.classList.remove('open'); })
    );
  }

  /* Scroll reveal */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  /* Safety net: never leave content hidden if IO misses */
  setTimeout(() => document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight) el.classList.add('visible');
  }), 1200);

  /* Self-destruct countdown (ephemeral band) */
  const tEl = document.getElementById('sd-timer');
  if (tEl) {
    let secs = 24 * 3600 - 1;
    const fmt = s => {
      const h = String(Math.floor(s / 3600)).padStart(2, '0');
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const x = String(s % 60).padStart(2, '0');
      return `${h}:${m}:${x}`;
    };
    tEl.textContent = fmt(secs);
    setInterval(() => { secs = secs > 0 ? secs - 1 : 24 * 3600 - 1; tEl.textContent = fmt(secs); }, 1000);
  }

  /* Contact form */
  const form = document.getElementById('contact-form');
  if (form) {
    const status = document.getElementById('form-status');
    const btn = form.querySelector('button[type="submit"]');
    const tt = k => window.KS_I18N ? KS_I18N.t(k) : k;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const data = Object.fromEntries(new FormData(form).entries());
      data.lang = KS_I18N.lang;
      data.page = 'kriptonshare.com/contact';
      btn.disabled = true;
      btn.textContent = tt('form.sending');
      status.className = 'form-status';
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          status.innerHTML = tt('form.ok');
          status.classList.add('ok');
          form.reset();
        } else if (res.status === 503) {
          status.innerHTML = tt('form.config') + ' <a href="mailto:contacto@kriptonshare.com">contacto@kriptonshare.com</a>.';
          status.classList.add('err');
        } else {
          throw new Error('bad status ' + res.status);
        }
      } catch (err) {
        status.innerHTML = tt('form.err') + ' <a href="mailto:contacto@kriptonshare.com">contacto@kriptonshare.com</a>.';
        status.classList.add('err');
      }
      btn.disabled = false;
      btn.textContent = tt('form.submit');
    });
    /* re-translate dynamic strings on language switch */
    document.addEventListener('ks:lang', () => {
      if (!btn.disabled) btn.textContent = tt('form.submit');
    });
  }
});
