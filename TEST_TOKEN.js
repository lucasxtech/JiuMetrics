// ⚠️ COLE ESTE CÓDIGO NO CONSOLE DO NAVEGADOR PARA VERIFICAR O TOKEN

console.log('🔍 Verificando autenticação...');
console.log('Token:', localStorage.getItem('authToken'));
console.log('User:', localStorage.getItem('user'));

// Testar se o token está válido
const token = localStorage.getItem('authToken');
if (!token) {
  console.error('❌ Nenhum token encontrado! Faça login novamente.');
} else {
  console.log('✅ Token encontrado:', token.substring(0, 30) + '...');
  
  // Testar requisição
  fetch('http://localhost:5050/api/athletes', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(res => {
    console.log('Status:', res.status);
    return res.json();
  })
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Erro:', err));
}
