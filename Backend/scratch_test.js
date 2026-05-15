async function testAI() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/enseignant/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@teacher.com',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✓ Logged in');

    console.log('⏳ Generating questions for "Roulement à billes"...');
    const aiRes = await fetch('http://localhost:5000/api/enseignant/ai/generate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        prompt: 'Un roulement à billes',
        type: 'ouverte',
        matiere: 'Mécanique',
        niveau: 'L1'
      })
    });

    const aiData = await aiRes.json();
    console.log('✅ Response received');
    
    aiData.questions.forEach((q, i) => {
      console.log(`Q${i+1} URL prefix:`, q.imageUrl?.substring(0, 50));
      const isBase64 = q.imageUrl?.startsWith('data:image');
      const isSVG = q.imageUrl?.includes('svg+xml');
      console.log(`Q${i+1}: ${isBase64 ? 'IMAGE OK' : 'NO IMAGE'} (${isSVG ? 'SVG/ICON' : 'REAL IMAGE'})`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}
testAI();
