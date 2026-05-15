async function testLexica() {
  try {
    const prompt = 'ball bearing technical diagram';
    const url = `https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.images && data.images.length > 0) {
      console.log('Success! First image:', data.images[0].src);
    } else {
      console.log('No images found');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}
testLexica();
