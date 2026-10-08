const RESEND_TO = 'kmsubramanian@gmail.com';
const RESEND_FROM = 'Shri Dharmasastha Astrological Center <consultation@dharmasasthaastrology.com>';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store'
    }
  });
}

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[c]);
}

async function readBody(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return await request.json();
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ ok: true, resendConfigured: Boolean(env.RESEND_API_KEY) });
    }

    if (url.pathname === '/api/consultation' && request.method === 'POST') {
      try {
        const body = await readBody(request);
        const name = String(body.name || '').trim();
        const phone = String(body.phone || '').trim();
        const email = String(body.email || '').trim();
        const service = String(body.service || 'Not selected').trim();
        const language = String(body.language || 'Not selected').trim();
        const time = String(body.time || 'Not selected').trim();
        const message = String(body.message || '').trim();
        const uiLanguage = body.uiLanguage === 'ta' ? 'ta' : 'en';

        if (!name || !phone || !email) {
          return json({ ok: false, error: uiLanguage === 'ta' ? 'பெயர், WhatsApp எண் மற்றும் மின்னஞ்சல் அவசியம்.' : 'Name, WhatsApp number and email are required.' }, 400);
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return json({ ok: false, error: uiLanguage === 'ta' ? 'சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.' : 'Please enter a valid email address.' }, 400);
        }
        if (!env.RESEND_API_KEY) {
          console.error('RESEND_API_KEY runtime secret is missing. Add it under Worker Settings > Variables and Secrets (not Workers Builds).');
          return json({ ok: false, error: uiLanguage === 'ta' ? 'மின்னஞ்சல் சேவை இன்னும் அமைக்கப்படவில்லை.' : 'Email service is not configured yet.' }, 500);
        }

        const subject = uiLanguage === 'ta' ? `புதிய ஆலோசனை விசாரணை — ${name}` : `New consultation enquiry — ${name}`;
        const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#183a56;line-height:1.6">
          <h2 style="color:#062b49">New Consultation Enquiry</h2>
          <p><strong>Name:</strong> ${esc(name)}</p>
          <p><strong>WhatsApp:</strong> +91 ${esc(phone)}</p>
          <p><strong>Email:</strong> ${esc(email)}</p>
          <p><strong>Service:</strong> ${esc(service)}</p>
          <p><strong>Preferred language:</strong> ${esc(language)}</p>
          <p><strong>Preferred time:</strong> ${esc(time)}</p>
          <hr><p><strong>Message / Details:</strong></p><p>${esc(message).replace(/\n/g, '<br>')}</p>
          <hr><p style="font-size:12px;color:#666">Submitted through dharmasasthaastrology.com</p>
        </body></html>`;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: [RESEND_TO],
            reply_to: email,
            subject,
            html
          })
        });

        if (!response.ok) {
          const detail = await response.text();
          console.error('Resend rejected email:', response.status, detail);
          return json({ ok: false, error: uiLanguage === 'ta' ? 'மின்னஞ்சலை அனுப்ப முடியவில்லை. தயவுசெய்து WhatsApp மூலம் தொடர்புகொள்ளவும்.' : 'We could not send the enquiry. Please contact us on WhatsApp.' }, 502);
        }

        const result = await response.json();
        console.log('Resend accepted email:', result?.id || 'accepted');
        return json({ ok: true });
      } catch (error) {
        console.error('Consultation worker error:', error?.stack || error);
        return json({ ok: false, error: 'Something went wrong. Please try WhatsApp instead.' }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
