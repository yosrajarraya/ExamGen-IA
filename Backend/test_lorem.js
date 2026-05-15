async function testLoremFlickr() {
  try {
    const prompt = 'bearing';
    const url = `https://loremflickr.com/512/512/${encodeURIComponent(prompt)}`;
    const res = await fetch(url);
    if (res.ok) {
      console.log('Success! Final URL:', res.url);
      const buffer = await res.arrayBuffer();
      console.log('Buffer length:', buffer.byteLength);
    } else {
      console.log('Failed Status:', res.status);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}
testLoremFlickr();
