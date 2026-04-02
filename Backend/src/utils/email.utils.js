const nodemailer = require('nodemailer');

let cachedTransporter = null;

function readMailConfig() {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || null;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || null;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || null;
  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    user;

  const service = process.env.SMTP_SERVICE || process.env.EMAIL_SERVICE || null;

  return {
    host,
    port,
    user,
    pass,
    from,
    service,
  };
}

function hasMailConfig() {
  const config = readMailConfig();
  return Boolean(config.user && config.pass && (config.service || config.host));
}

function getTransporter() {
  if (!hasMailConfig()) {
    return null;
  }

  if (!cachedTransporter) {
    const config = readMailConfig();

    const transporterConfig = {
      auth: {
        user: config.user,
        pass: config.pass,
      },
    };

    if (config.service) {
      transporterConfig.service = config.service;
    } else {
      transporterConfig.host = config.host;
      transporterConfig.port = config.port;
      transporterConfig.secure = config.port === 465;
    }

    cachedTransporter = nodemailer.createTransport(transporterConfig);
  }

  return cachedTransporter;
}

function generatePassword(length = 10) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';

  let password = '';

  for (let i = 0; i < length; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}

async function sendTeacherCredentialsEmail({ to, nomComplet, email, motDePasse, prenom, nom, password }) {
  const transporter = getTransporter();
  const config = readMailConfig();

  if (!transporter) {
    return {
      status: 'skipped',
      reason:
        'SMTP non configuré (définir SMTP_HOST/EMAIL_HOST ou SMTP_SERVICE, avec SMTP_USER/EMAIL_USER et SMTP_PASS/EMAIL_PASS)',
    };
  }

  const finalName = nomComplet || `${prenom || ''} ${nom || ''}`.trim() || 'Enseignant';
  const finalEmail = email || to || '';
  const finalPassword = motDePasse || password || '';
  const appUrl = process.env.APP_URL || 'http://localhost:5173/enseignant/login';

  try {
    await transporter.sendMail({
      from: config.from,
      to: finalEmail,
      subject: 'Vos accès enseignant - ExamGen-IA',
      text: `Bonjour ${finalName},

Votre compte enseignant est créé.

Email: ${finalEmail}
Mot de passe: ${finalPassword}

Accédez à l'application : ${appUrl}

Connectez-vous sur l'espace enseignant et changez votre mot de passe après la première connexion.
`,
      html: `
        <p>Bonjour ${finalName},</p>
        <p>Votre compte enseignant est créé.</p>
        <p>
          <strong>Email:</strong> ${finalEmail}<br/>
          <strong>Mot de passe:</strong> ${finalPassword}
        </p>
        <p>
          <strong>Accès à l'application :</strong> <a href="${appUrl}" target="_blank" rel="noopener noreferrer">${appUrl}</a>
        </p>
        <p>Connectez-vous sur l'espace enseignant et changez votre mot de passe après la première connexion.</p>
      `,
    });

    return { status: 'sent' };
  } catch (error) {
    return { status: 'failed', reason: error.message };
  }
}

async function sendTeacherCredentials({ to, nomComplet, email, motDePasse }) {
  return sendTeacherCredentialsEmail({ to, nomComplet, email, motDePasse });
}

async function sendPasswordResetCodeEmail({ to, nomComplet, code, profileLabel }) {
  const transporter = getTransporter();
  const config = readMailConfig();

  if (!transporter) {
    return {
      status: 'skipped',
      reason:
        'SMTP non configuré (définir SMTP_HOST/EMAIL_HOST ou SMTP_SERVICE, avec SMTP_USER/EMAIL_USER et SMTP_PASS/EMAIL_PASS)',
    };
  }

  try {
    await transporter.sendMail({
      from: config.from,
      to,
      subject: `Code de réinitialisation - ${profileLabel} ExamGen-IA`,
      text: `Bonjour ${nomComplet},

Votre code de réinitialisation est : ${code}

Ce code expire dans 10 minutes.

Si vous n'avez pas fait cette demande, ignorez ce message.
`,
      html: `
        <p>Bonjour ${nomComplet},</p>
        <p>Votre code de réinitialisation est :</p>
        <p style="font-size:22px; font-weight:bold; letter-spacing:2px;">${code}</p>
        <p>Ce code expire dans <strong>10 minutes</strong>.</p>
        <p>Si vous n'avez pas fait cette demande, ignorez ce message.</p>
      `,
    });

    return { status: 'sent' };
  } catch (error) {
    return { status: 'failed', reason: error.message };
  }
}

module.exports = {
  generatePassword,
  sendTeacherCredentials,
  sendTeacherCredentialsEmail,
  sendPasswordResetCodeEmail,
};