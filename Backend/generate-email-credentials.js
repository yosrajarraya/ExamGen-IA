const nodemailer = require('nodemailer');

// Script pour générer des credentials Ethereal (email de test)
async function generateEtherealCredentials() {
  try {
    // Créer un compte de test Ethereal
    const testAccount = await nodemailer.createTestAccount();

    console.log('=== CREDENTIALS ETHEREAL GÉNÉRÉS ===');
    console.log('EMAIL_USER=' + testAccount.user);
    console.log('EMAIL_PASS=' + testAccount.pass);
    console.log('');
    console.log('📧 Interface web Ethereal: https://ethereal.email');
    console.log('🔗 Lien direct: ' + nodemailer.getTestMessageUrl(testAccount));
    console.log('');
    console.log('Copiez ces valeurs dans votre .env :');
    console.log(`EMAIL_USER=${testAccount.user}`);
    console.log(`EMAIL_PASS=${testAccount.pass}`);
    console.log('');
    console.log('Puis redémarrez votre serveur.');

  } catch (error) {
    console.error('Erreur lors de la génération:', error);
  }
}

generateEtherealCredentials();