const fs = require('fs');

let content = fs.readFileSync('Backend/src/enseignant/services/ai.service.js', 'utf8');

// Remove all .replace(/```json|```/g, '') parts since they have invisible characters
content = content.replace(/\.replace\(\/```json\|```\/g, ''\.trim\(\)/g, '');

fs.writeFileSync('Backend/src/enseignant/services/ai.service.js', content);
console.log('Removed broken regex patterns');
