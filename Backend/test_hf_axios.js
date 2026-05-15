const axios = require('axios');
async function testHF() {
  const model = "stabilityai/stable-diffusion-2-1";
  const prompt = "A high quality technical diagram of a ball bearing";
  const HF_KEY = "hf_votre_token_ici";

  console.log(`Testing HF model: ${model}...`);
  try {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      { inputs: prompt },
      {
        headers: { Authorization: `Bearer ${HF_KEY}` },
        responseType: 'arraybuffer'
      }
    );

    console.log(`Status: ${response.status}`);
    console.log(`Success! Buffer size: ${response.data.length}`);
  } catch (err) {
    console.error('Error Status:', err.response?.status);
    console.error('Error Data:', err.response?.data?.toString());
  }
}
testHF();
