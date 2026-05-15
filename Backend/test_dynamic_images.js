async function testCases() {
  const loginRes = await fetch('http://localhost:5000/api/enseignant/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'benamarmaissa136@gmail.com', motDePasse: 'admin123' })
  });
  const loginData = await loginRes.json();
  const authToken = loginData.token;
  const headers = { 
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('🧪 TEST 1: Sans image ("Génère un exercice sur les pompes")');
  const res1 = await fetch('http://localhost:5000/api/enseignant/ai/generate-questions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: 'Génère un exercice sur les pompes',
      type: 'ouverte',
      matiere: 'Mécanique'
    })
  });
  const data1 = await res1.json();
  if (!data1.questions) console.error('❌ Error 1:', data1);
  else console.log(`   Résultat: ${data1.questions[0].imageUrl ? '❌ IMAGE PRÉSENTE (Erreur)' : '✅ SANS IMAGE (Succès)'}`);

  console.log('\n🧪 TEST 2: Avec image ("Génère un schéma de pompe")');
  const res2 = await fetch('http://localhost:5000/api/enseignant/ai/generate-questions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: 'Génère un schéma de pompe',
      type: 'ouverte',
      matiere: 'Mécanique'
    })
  });
  const data2 = await res2.json();
  if (!data2.questions) console.error('❌ Error 2:', data2);
  else console.log(`   Résultat: ${data2.questions[0].imageUrl ? '✅ AVEC IMAGE (Succès)' : '❌ SANS IMAGE (Erreur)'}`);
}

testCases().catch(err => console.error(err.message));
