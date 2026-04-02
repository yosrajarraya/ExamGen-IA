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

// Mot de passe simple sans caractères problématiques pour meilleure lisibilité
function generateSimplePassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const simpleSpecials = '!#%&*+-=?@';

  const allChars = uppercase + lowercase + numbers + simpleSpecials;

  let password = '';
  // Garantir au moins 1 de chaque type
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += simpleSpecials.charAt(Math.floor(Math.random() * simpleSpecials.length));

  // Remplir le reste aléatoirement
  for (let i = password.length; i < length; i += 1) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Mélanger
  return password.split('').sort(() => Math.random() - 0.5).join('');
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

Votre compte enseignant a été créé avec succès sur la plateforme ExamGen-IA.

Identifiants de connexion :
Email: ${finalEmail}
Mot de passe: ${finalPassword}

Lien d'accès à l'application : ${appUrl}

Instructions :
1. Accédez à l'application via le lien ci-dessus
2. Connectez-vous avec vos identifiants
3. Changez votre mot de passe après la première connexion

Bienvenue sur ExamGen-IA !
`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
              .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
              .greeting { font-size: 16px; margin-bottom: 20px; }
              .credentials-box { background: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .credentials-box strong { color: #1e40af; font-size: 14px; }
              .credentials-box div { margin: 8px 0; }
              .button-container { text-align: center; margin: 30px 0; }
              .button { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; }
              .button:hover { opacity: 0.9; }
              .footer { color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; color: #92400e; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>ExamGen-IA</h1>
                <p style="margin: 10px 0 0;">Plateforme de Gestion d'Examens Intelligente</p>
              </div>
              
              <div class="content">
                <div class="greeting">
                  <p>Bonjour <strong>${finalName}</strong>,</p>
                  <p>Bienvenue sur <strong>ExamGen-IA</strong> ! Votre compte enseignant a été créé avec succès.</p>
                </div>

                <h3 style="color: #1e40af; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Vos Identifiants de Connexion</h3>
                
                <div class="credentials-box">
                  <div>
                    <strong>Email :</strong><br/>
                    <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; display: inline-block;">${finalEmail}</code>
                  </div>
                  <div>
                    <strong>Mot de Passe :</strong><br/>
                    <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; display: inline-block; letter-spacing: 1px;">${finalPassword}</code>
                  </div>
                </div>

                <div class="button-container">
                  <a href="${appUrl}" class="button">Se Connecter à l'Application</a>
                </div>

                <h3 style="color: #1e40af;">Instructions de Première Connexion</h3>
                <ol style="color: #555;">
                  <li>Cliquez sur le bouton "Se Connecter à l'Application" ci-dessus</li>
                  <li>Entrez votre email et mot de passe</li>
                  <li><strong>Important :</strong> Changez votre mot de passe après la première connexion</li>
                  <li>Accédez à votre tableau de bord enseignant</li>
                </ol>

                <div class="warning">
                  <strong>⚠️ Sécurité :</strong> Gardez ces identifiants confidentiels. Changez votre mot de passe dès votre première connexion pour plus de sécurité.
                </div>

                <div class="footer">
                  <p>Besoin d'aide ? Contactez l'administration.</p>
                  <p style="margin-top: 10px; color: #999;">ExamGen-IA © 2026 - Tous droits réservés</p>
                </div>
              </div>
            </div>
          </body>
        </html>
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
  generateSimplePassword,
  sendTeacherCredentials,
  sendTeacherCredentialsEmail,
  sendPasswordResetCodeEmail,
};