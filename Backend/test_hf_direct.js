async function testHF() {
  const model = "black-forest-labs/FLUX.1-schnell";
  const prompt = "A high quality technical diagram of a ball bearing, white background, detailed, 8k";
  const HF_KEY = "hf_votre_token_ici";

  console.log(`Testing HF model: ${model}...`);
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          inputs: prompt,
          options: { wait_for_model: true }
        }),
      }
    );

    console.log(`Status: ${response.status}`);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      console.log(`Success! Buffer size: ${buffer.byteLength}`);
    } else {
      const err = await response.json().catch(() => ({}));
      console.log('Error Data:', JSON.stringify(err));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}
testHF();
