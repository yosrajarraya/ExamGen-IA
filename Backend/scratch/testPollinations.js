async function testPollinations() {
  try {
    const prompt = 'technical cross-section of a cylindrical roller bearing';
    const technicalPrompt = `Professional technical cross-section diagram of ${prompt}, engineering drawing style, detailed mechanical parts, clean black lines, white background, educational illustration, high precision, minimalist academic style, ISO standard look`;
    const encodedPrompt = encodeURIComponent(technicalPrompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=600&height=400&model=flux&nologo=true`;
    
    console.log('Fetching:', url);
    const response = await fetch(url);
    console.log('Status:', response.status);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      console.log('Size:', buffer.byteLength, 'bytes');
    } else {
      const text = await response.text();
      console.log('Error body:', text);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}
testPollinations();
