// cpf-validator.js
function validateCPF(cpf) {
    var Soma;
    var Resto;
    var i;
    Soma = 0;
  
    cpf = cpf.replace(/\D+/g, ''); // remove todos os caracteres não numéricos
  
    if (cpf == "00000000000") return false;
  
    for (i=1; i<=9; i++) Soma = Soma + parseInt(cpf.substring(i-1, i)) * (11 - i);
    Resto = (Soma * 10) % 11;
  
    if ((Resto == 10) || (Resto == 11))  Resto = 0;
    if (Resto != parseInt(cpf.substring(9, 10)) ) return false;
  
    Soma = 0;
    for (i = 1; i <= 10; i++) Soma = Soma + parseInt(cpf.substring(i-1, i)) * (12 - i);
    Resto = (Soma * 10) % 11;
  
    if ((Resto == 10) || (Resto == 11))  Resto = 0;
    if (Resto != parseInt(cpf.substring(10, 11) ) ) return false;
    return true;
  }
  
  export default validateCPF;