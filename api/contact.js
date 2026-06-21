module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, email, date, time, type, package: pkg, prep, message } = req.body || {};

  if (!name || !phone || !email) {
    return res.status(400).json({ error: 'Chýbajú povinné polia' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_EMAIL || 'nemcikjakub5@gmail.com';

  if (!apiKey) {
    console.error('RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Konfigurácia servera chýba' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RaceZone <onboarding@resend.dev>',
        to: [toEmail],
        reply_to: email,
        subject: `Nový dopyt — ${name}`,
        html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ececee;border-radius:12px;overflow:hidden">
  <div style="background:#E8141B;padding:24px 28px">
    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px">Nový dopyt — RaceZone</h1>
  </div>
  <div style="padding:28px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr>
        <td style="padding:8px 0;color:#7b8089;width:110px;vertical-align:top">Meno</td>
        <td style="padding:8px 0;font-weight:600;color:#15171c">${h(name)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#7b8089;vertical-align:top">Telefón</td>
        <td style="padding:8px 0;font-weight:600"><a href="tel:${h(phone)}" style="color:#E8141B;text-decoration:none">${h(phone)}</a></td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#7b8089;vertical-align:top">Email</td>
        <td style="padding:8px 0;font-weight:600"><a href="mailto:${h(email)}" style="color:#E8141B;text-decoration:none">${h(email)}</a></td>
      </tr>
      ${pkg ? `<tr><td style="padding:8px 0;color:#7b8089;vertical-align:top">Záujem o</td><td style="padding:8px 0;font-weight:600;color:#E8141B">${h(pkg)}</td></tr>` : ''}
      ${type ? `<tr><td style="padding:8px 0;color:#7b8089;vertical-align:top">Typ akcie</td><td style="padding:8px 0;color:#15171c">${h(type)}</td></tr>` : ''}
      ${date ? `<tr><td style="padding:8px 0;color:#7b8089;vertical-align:top">Dátum akcie</td><td style="padding:8px 0;color:#15171c">${h(date)}${time ? ` o ${h(time)}` : ''}</td></tr>` : ''}
      ${prep === 'yes' ? `<tr><td style="padding:8px 0;color:#7b8089;vertical-align:top">Príprava</td><td style="padding:8px 0;color:#15171c">Požaduje montáž deň vopred</td></tr>` : ''}
    </table>
    ${message ? `<div style="margin-top:16px;background:#f6f6f7;border-radius:8px;padding:16px"><p style="margin:0;color:#3a3d44;font-size:14px;line-height:1.7">${h(message)}</p></div>` : ''}
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #ececee;font-size:12px;color:#7b8089">
      Odoslané z kontaktného formulára — RaceZone
    </div>
  </div>
</div>`,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Resend error:', response.status, errText);
      throw new Error(`Resend ${response.status}`);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ error: 'Odosielanie zlyhalo' });
  }
};

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
