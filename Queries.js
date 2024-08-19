import mysql from 'mysql';

export const insertQuery = (nome, cpf, nomeMae, nomePai, rg, email, cep, cidade, estado, logradouro, num, complemento, bairro, pontoRef, tipoRes) => {
  return 'INSERT INTO tb_consultora (code, nome, cpf, nomeMae, nomePai, rg, email, phone, cep, cidade, estado, logradouro, num, complemento, bairro,  pontoRef, tipoRes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
};

export const buscaCad = (cpf) => {
  return 'SELECT * FROM tb_consultora WHERE cpf = ?';
};

export const buscaProd = (sku) => {
  return 'SELECT * FROM tb_produtos WHERE codigo_sku = ? and ativo = 1';
}

export const insertPedidoUser = (codeUser, codePedido, dataAtual) => {
  return 'INSERT INTO user_pedido (code_user, code_ped, data) VALUES(?, ?, ?)';
}

export function insertPedido(codePed, pedido) {
  let query = `INSERT INTO pedido_cons (code_ped, code_produto, quant, produto) VALUES `;
  let params = [];

  pedido.forEach((produto, index) => {
    params.push(codePed, produto.cod, produto.quant, produto.nome);
    query += `(?,?,?,?)`;
    if (index < pedido.length - 1) {
      query += `, `;
    }
  });

  return { query, params };
}

export const UpdateEstoque = (newEstoque, sku) => {
  return 'UPDATE tb_produtos set estoque = ? WHERE codigo_sku = ?'
}