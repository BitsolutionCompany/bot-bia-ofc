import mysql from 'mysql';

export const insertQuery = (nome, cpf, nomeMae, nomePai, rg, email, cep, cidade, estado, logradouro, num, complemento, bairro, pontoRef, tipoRes) => {
  return 'INSERT INTO tb_consultora (code, nome, cpf, nomeMae, nomePai, rg, email, phone, cep, cidade, estado, logradouro, num, complemento, bairro,  pontoRef, tipoRes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
};

export const buscaCad = (cpf) => {
  return 'SELECT * FROM tb_consultora WHERE cpf = ?';
};


export const buscaProd = (sku) => {
  return 'SELECT * FROM tb_produtos WHERE codigo_sku = ?';
}