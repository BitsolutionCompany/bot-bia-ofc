import mysql from 'mysql';

const conn = mysql

const db = conn.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'biacos84_biamult'
})

db.connect((err) => {
    if(err){
        console.error('Erro conexao com o  banco de dados', err)
        return
    }
    console.log('Conectado ao Banco de Bados');
})

export default db