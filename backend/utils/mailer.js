const nodemailer = require("nodemailer");

// Transporteur SMTP configuré via variables d'environnement. Si elles ne
// sont pas définies (ex: en développement local sans compte SMTP), les
// e-mails sont simplement journalisés dans la console au lieu d'échouer,
// pour ne jamais bloquer la réservation d'un RDV faute de configuration mail.
const smtpValues = [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASSWORD].map(v => String(v || "").trim());
const smtpConfigured = smtpValues.every(Boolean) && !smtpValues.some(v =>
  /^(smtp\.example\.com|votre-compte@example\.com|votre-mot-de-passe)$/i.test(v)
);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  : null;

async function envoyerEmail({ to, subject, html }) {
  if (!transporter) {
    console.log(`[mailer] SMTP non configuré — e-mail simulé -> à: ${to} | sujet: ${subject}`);
    return { simule: true };
  }

  try {
    return await transporter.sendMail({
      from: process.env.SMTP_FROM || "MédiGuide <no-reply@mediguide.tn>",
      to,
      subject,
      html,
    });
  } catch (err) {
    // Une erreur d'envoi ne doit jamais faire échouer la réservation elle-même.
    console.error("[mailer] échec de l'envoi :", err.message);
    return { erreur: err.message };
  }
}

function emailConfirmationRDV({ patientNom, facilityNom, date, heureDebut, heureFin, adresse }) {
  const dateLisible = new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#0d5aa0">Rendez-vous confirmé ✅</h2>
      <p>Bonjour ${patientNom},</p>
      <p>Votre rendez-vous est confirmé :</p>
      <div style="background:#f0f6fb;border-radius:12px;padding:16px;margin:16px 0">
        <p style="margin:0 0 4px"><strong>${facilityNom}</strong></p>
        <p style="margin:0 0 4px;text-transform:capitalize">${dateLisible}</p>
        <p style="margin:0">De ${heureDebut} à ${heureFin}</p>
        ${adresse ? `<p style="margin:4px 0 0;color:#555">${adresse}</p>` : ""}
      </div>
      <p style="color:#888;font-size:13px">Vous pouvez annuler ce rendez-vous à tout moment depuis « Mes rendez-vous » sur MédiGuide.</p>
    </div>
  `;
}

function emailRappelRDV({ patientNom, facilityNom, date, heureDebut, heureFin }) {
  const dateLisible = new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#0d5aa0">Rappel : rendez-vous demain ⏰</h2>
      <p>Bonjour ${patientNom},</p>
      <p>Petit rappel : vous avez rendez-vous demain avec <strong>${facilityNom}</strong>.</p>
      <div style="background:#f0f6fb;border-radius:12px;padding:16px;margin:16px 0">
        <p style="margin:0 0 4px;text-transform:capitalize">${dateLisible}</p>
        <p style="margin:0">De ${heureDebut} à ${heureFin}</p>
      </div>
    </div>
  `;
}


function emailVerification({nom,code}){return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#172033"><div style="text-align:center"><div style="display:inline-block;background:#0d5aa0;color:#fff;border-radius:12px;padding:10px 14px;font-weight:700;font-size:20px">MédiGuide</div><h2 style="color:#0d5aa0">Vérifiez votre e-mail</h2><p>Bonjour ${nom||""},</p><p>Utilisez ce code pour activer votre compte.</p><div style="font-size:32px;letter-spacing:8px;font-weight:700;background:#f0f7ff;border-radius:14px;padding:18px;margin:20px 0">${code}</div><p style="color:#667085;font-size:13px">Le code expire dans 10 minutes.</p></div></div>`}

module.exports = { envoyerEmail, emailConfirmationRDV, emailRappelRDV, emailVerification };
