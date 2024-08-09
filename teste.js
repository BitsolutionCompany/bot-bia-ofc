// import buscaCad from './BuscaCad.js';
// import db from './Conexao.js';
//     const cpf = '08012867354';
//     const busca = buscaCad(cpf)
//     const dados = db.query(busca, [cpf], (err, results) => {
//         if (err) {
//           console.error('Erro ao executar consulta:', err);
//           return;
//         }
//         if(results.length > 0) {
//           console.log('Existe');
//           console.log(results[0].nome);
//         }else{
//           console.log('Nao Existe');
//         }
//         // Fechar conexão com o banco de dados
//         db.end();
//     })

// function generateCode(){
//   return Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000
// }

// console.log(generateCode())

const from = '5588994086642'
const phone = from.slice('@')
console.log(phone);
