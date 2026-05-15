const urlToBase64 = async (url) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log(`Fetch ${url.substring(0, 50)}... Status: ${response.status}`);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error(`Error:`, error.message);
    return null;
  }
};

async function test() {
  const prompt = 'ball bearing technical drawing';
  const url = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
  const res = await urlToBase64(url);
  if (res) {
    console.log('Success! Base64 length:', res.length);
  } else {
    console.log('Failed');
  }
}
test();
