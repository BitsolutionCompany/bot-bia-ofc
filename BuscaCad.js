const buscaCad = (cpf) => {
    return 'SELECT * FROM tb_consultora WHERE cpf = ?';
};

export default buscaCad