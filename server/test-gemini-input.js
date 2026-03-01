const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

console.log('🔬 Testando como Gemini aceita inputs:\n');

// Imagem 1x1 pixel em base64
const testBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A/9k=';
const dataUri = `data:image/jpeg;base64,${testBase64}`;

console.log('📦 Data URI:', dataUri.substring(0, 60) + '...\n');

async function test() {
  // Teste 1: String simples com Data URI (como faz o sistema monolítico)
  try {
    console.log('❌ Teste 1: Passar Data URI como STRING no prompt');
    const result1 = await model.generateContent(`Descreva a imagem: ${dataUri}`);
    console.log('   ✅ FUNCIONOU!');
    console.log('   Resposta:', result1.response.text().substring(0, 100));
  } catch (error) {
    console.log('   ❌ FALHOU:', error.message);
  }
  
  console.log('');
  
  // Teste 2: InlineData (formato correto para multimodal)
  try {
    console.log('✅ Teste 2: Passar como inlineData (formato multimodal correto)');
    const result2 = await model.generateContent([
      { text: 'Descreva esta imagem em poucas palavras' },
      { 
        inlineData: { 
          mimeType: 'image/jpeg',
          data: testBase64
        }
      }
    ]);
    console.log('   ✅ FUNCIONOU!');
    console.log('   Resposta:', result2.response.text().substring(0, 100));
  } catch (error) {
    console.log('   ❌ FALHOU:', error.message);
  }
}

test().then(() => {
  console.log('\n✅ Teste concluído');
  process.exit(0);
}).catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
