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

// const from = '5588994086642'
// const phone = from.slice('@')
// console.log(phone);

// const date = new Date();
// const mysqlTimestamp1 = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
// console.log(mysqlTimestamp1); // Output: 2023-07-25 14:30:00



// const dataArray = contact.pedido.map
// const { query, values } = insertPedido(codePedido, contact.pedido);
// db.query(query, [values], (err, results) => {
// if(err){
//     console.error('Erro ao cadastrar informações do cliente', err);
//     client.sendMessage(from, 'Ops, Ocorreu um Erro ao Tentar Realizar o Pedido Final')
// }else{
//     console.log('Pedido Salvo com sucesso!');
//     console.log(results);
//     client.sendMessage(from, `Pedido Finalizado`)

//     const pedidoDetails = contact.pedido.map(item => `Codigo: ${item.cod}, Quant: ${item.quant}, nome: ${item.nome}`).join('\n');
//     setTimeout(() => {
//         client.sendMessage(from, `Pedido: ${codePedido}\n\nNome: ${contact.nome}\n\n${pedidoDetails}`)  
//     }, 1000);
//     setTimeout(() => {
//         client.sendMessage(from, '*Podemos Ajudar em mais alguma coisa?*\nEscolha uma Opção:\n1. Pedido\n2. Cadastro\n0. Encerrar')
//     }, 2000);
//     contact.state = 4
//     contact.ped = 0
//     contact.pedido = []
//     contact.codeU = 0
//     contact.codePed = []
//     contact.nome = ""
//     contact.codeProd = 0
//     contact.estoque = 0
// }
// })

// function validateCPF(cpf) {
//     cpf = cpf.replace(/\D+/g, ''); // remove todos os caracteres não numéricos
//     if (cpf.length !== 11) return false; // CPF deve ter 11 dígitos
  
//     var sum = 0;
//     var weight = 10;
  
//     for (var i = 0; i < 9; i++) {
//       sum = sum + parseInt(cpf.charAt(i)) * weight;
//       weight = weight - 1;
//     }
  
//     var verifyingDigit = 11 - (sum % 11);
//     if (verifyingDigit > 9) verifyingDigit = 0;
//     if (cpf.charAt(9) != verifyingDigit) return false;
  
//     sum = 0;
//     weight = 11;
//     for (var i = 0; i < 10; i++) {
//       sum = sum + parseInt(cpf.charAt(i)) * weight;
//       weight = weight - 1;
//     }
  
//     verifyingDigit = 11 - (sum % 11);
//     if (verifyingDigit > 9) verifyingDigit = 0;
//     if (cpf.charAt(10) != verifyingDigit) return false;
  
//     return true;
// }
  
//   // Exemplo de uso:
//   const cpf = '155.745.808-28';
//   if (validateCPF(cpf)) {
//     console.log('CPF válido!');
//   } else {
//     console.log('CPF inválido!');
//   }

function TestaCPF(strCPF) {
    var Soma;
    var Resto;
    var i;
    Soma = 0;
  if (strCPF == "00000000000") return false;

  for (i=1; i<=9; i++) Soma = Soma + parseInt(strCPF.substring(i-1, i)) * (11 - i);
  Resto = (Soma * 10) % 11;

    if ((Resto == 10) || (Resto == 11))  Resto = 0;
    if (Resto != parseInt(strCPF.substring(9, 10)) ) return false;

  Soma = 0;
    for (i = 1; i <= 10; i++) Soma = Soma + parseInt(strCPF.substring(i-1, i)) * (12 - i);
    Resto = (Soma * 10) % 11;

    if ((Resto == 10) || (Resto == 11))  Resto = 0;
    if (Resto != parseInt(strCPF.substring(10, 11) ) ) return false;
    return true;
}
var strCPF = "85147563588";
console.log(TestaCPF(strCPF));