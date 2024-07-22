const insertQuery = (nome, cpf, nomeMae, nomePai, rg, email, cep, cidade, estado, logradouro, num, complemento, bairro, pontoRef, tipoRes) => {
    return `INSERT INTO tb_consultora (nome, cpf, nomeMae, nomePai, rg, email, cep, cidade, estado, logradouro, num, complemento, bairro, ponto_ref, tipo_residencia) VALUES (${nome}, ${cpf}, ${nomeMae}, ${nomePai}, ${rg}, ${email}, ${cep}, ${cidade}, ${estado}, ${logradouro}, ${num}, ${complemento}, ${bairro} ,${pontoRef}, ${tipoRes})`;
  };

export default insertQuery