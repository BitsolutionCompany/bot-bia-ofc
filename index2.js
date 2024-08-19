import Whatsapp from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import db from './Conexao.js';
import { insertQuery, buscaCad, buscaProd, insertPedidoUser, insertPedido, UpdateEstoque } from "./Queries.js";
import validateCPF from "./validaCPF.js";

const { Client, LocalAuth} = Whatsapp

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
      headless: true
  }
});

let contacts = {};

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
  });
  
client.on("ready", () => {
console.log("Client is Ready");
});

client.on('message', async (message) => {
    let chat = await message.getChat()
    if(chat.isGroup){
        return;
    }else{
        const {from, body} = message
        if (from !== '558894086642@c.us')
            return;
    
            const contact = (contacts[from] || (contacts[from] = { state: 0, cad: 0, ped: 0, registro: [], endereco: [], pedido: [], nome: "" }));
            console.log(from)
            console.log(body)
            console.log(contact)
            console.log(contact.choice)
            console.log(contact.cad)
            console.log(contact.codeU)
            console.log(contact.codePed)

            switch(contact.state){
                case 0: // Estado Inicial, envia a mensagem de saldação e aguarda resposta do usuario
                    client.sendMessage(from, 'Olá, sou a Bia, *Assistente Virtual da Bia Cosmético*. Em que posso ajuda?\n Escolha uma opção:\n1. Pedido\n2. Cadastro\n3. Como Ser Um(a) Consultor(a)\n0. Encerrar\n_Informe o número da opção_');
                    contact.state++
                    break
                case 1: // Segundo Estado, pega a opção do usuário, verifica se é número, e se está no intervalo das opções definidas no menu e incrementa mais um valor no state
                    if (isNaN(body) || body < 0 || body > 2){
                        return client.sendMessage(from, 'Oops, opção inválida'); // Se o valor informado não estiver entre as opções ele envia uma mensagem de erro
                    }else{
                        contact.choice = +body
                        if(contact.choice === 0){
                            message.reply('Atendimento Finalizado')
                            contact.state = 0
                        }else{
                            contact.state++
                        }
                    }
                    break
                case 2:
                    switch(contact.choice){
                        case 1:
                            switch(contact.ped){
                                case 0:
                                    client.sendMessage(from, '*Informe Seu CPF:*\n_Somente Números_')
                                    contact.ped++
                                    break
                                case 1:
                                    const cpf = body;
                                    const busca = buscaCad(cpf)

                                    db.query(busca, [cpf], (err, results) => {
                                        if (err) {
                                        console.error('Erro ao executar consulta:', err);
                                        }else{
                                            const validaCPF = validateCPF(cpf)

                                            if (validaCPF) {
                                                console.log('CPF válido!');
                                                if (results.length > 0) {
                                                    // Se for encontrado algum valor na consulta, ele inicia a captura do pedido
                                                    console.log('Existe');
                        
                                                    contact.nome = results[0].nome // Pega o nome do usuário na base de dados e salva em um variável interna para utilização no envio da mensagem final
                                                    function generateCode(){ // Função para gerar um número de 10 digitos para uso como protocolo ou codigo do pedido
                                                        return Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000
                                                    }
                                                    contact.codeU = results[0].code
                                                    contact.codePed = generateCode()
                        
                                                    client.sendMessage(from, '*Informe o Código do produto:*\n\n_Em caso de Kit, coloque os produtos separadamente._\n_Envie um produto por vez, como mostra o exemplo!_\n\nPara Cancelar, digite *"Cancelar"*')
                        
                                                    contact.ped++
                                                }else{
                                                    // Inicia o cadastro do usuário, caso ele não esteja cadastrado no banco de dados
                                                    console.log('Não Existe');
                                                    function generateCode(){
                                                        return Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000
                                                    }
                                                    contact.registro.push({ tipo: 'code', valor: generateCode()})
                                                    contact.codeU = contact.registro.find(item => item.tipo === 'code').valor;
                                                    const phone = from.split('@')[0]
                                                    contact.registro.push({ tipo: 'phone', valor: phone})
                                                    contact.registro.push({ tipo: 'cpf', valor: body })
                                                    message.reply(`*Para realizar pedidos, você precisa estar cadastrado(a)!*\n*_Vamos Realizar seu cadastro_*`)
                                                    setTimeout(() => {
                                                        client.sendMessage(from, '*Informe Seu Nome Completo:*')
                                                    }, 2000);
                                                    contact.cad = 2
                                                    contact.ped = 0
                                                    contact.choice = 2
                                                }
                                            } else {
                                                console.log('CPF inválido!');
                                                message.reply('*Informe um CPF Válido:*')
                                            }
                                        }
                                    });
                                    break
                                case 2:
                                    if(body.toLocaleLowerCase() === 'finalizar'){
                                        contact.ped = 4
                                        if(contact.choice === 1 && contact.ped === 4){
                                            const codeUser = contact.codeU
                                            const codePedido = contact.codePed
                                            const date = new Date()
                                            const dataAtual = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
                    
                                            const insertPedUser = insertPedidoUser(codeUser, codePedido, dataAtual)
                                            db.query(insertPedUser, [codeUser, codePedido, dataAtual], (err, results) => {
                                                if(err){
                                                    console.error('Erro ao cadastrar informações do cliente', err);
                                                    client.sendMessage(from, 'Ops, Ocorreu um Erro ao Tentar Realizar o Pedido')
                                                }else{
                                                    const { query, params } = insertPedido(codePedido, contact.pedido);
                                                    db.query(query, params, (err, results) => {
                                                        if(err){
                                                            console.error('Erro ao cadastrar informações do cliente', err);
                                                            client.sendMessage(from, 'Ops, Ocorreu um Erro ao Tentar Realizar o Pedido Final')
                                                        }else{
                    
                                                            const produtos = contact.pedido;
                    
                                                            produtos.forEach((produto) => {
                                                                const codeSku = produto.cod
                                                                const quantidade = produto.quant
                    
                                                                const buscProd = buscaProd(codeSku)
                    
                                                                db.query(buscProd, [codeSku], (err, results) => {
                                                                    if(err){
                                                                        console.log(err);
                                                                        return;
                                                                    }else{
                                                                        const estoque = results[0].estoque
                                                                        const newEstoque = estoque - parseInt(quantidade)
                    
                                                                        // Atualiza estoque
                                                                        const updateEstoque = UpdateEstoque(newEstoque, codeSku);
                    
                                                                        db.query(updateEstoque, [newEstoque, codeSku], (err, results) => {
                                                                            if(err){
                                                                                console.log('Erro ao Atualizar estoque: ', err);
                                                                                return
                                                                            }else{
                                                                                console.log(`Atualizado estoque do produto ${codeSku} para ${newEstoque}`);
                                                                            }
                                                                        })
                                                                    }
                                                                })
                                                            })
                    
                                                            console.log('Pedido Salvo com sucesso!');
                                                            console.log(results);
                                                            client.sendMessage(from, `Pedido Finalizado`)
                    
                                                            const pedidoDetails = contact.pedido.map(item => `Codigo: ${item.cod}, Quant: ${item.quant}, nome: ${item.nome}`).join('\n');
                                                            setTimeout(() => {
                                                                client.sendMessage(from, `Pedido: ${codePedido}\n\nNome: ${contact.nome}\n\n${pedidoDetails}`)  
                                                            }, 2000);
                                                            setTimeout(() => {
                                                                client.sendMessage(from, '*Podemos Ajudar em mais alguma coisa?*\nEscolha uma Opção:\n1. Pedido\n2. Cadastro\n0. Encerrar')
                                                            }, 3000);
                                                            contact.state = 4
                                                            contact.ped = 0
                                                            contact.pedido = []
                                                            contact.codeU = 0
                                                            contact.codePed = 0
                                                            // contact.nome = ""
                                                            contact.codeProd = 0
                                                            contact.estoque = 0
                                                            contact.nomeProd = ""
                                                        }
                                                    })
                                                }
                                            })
                                        }
                                    }else if(body.toLocaleLowerCase() === 'cancelar'){
                                        contact.state++
                                        contact.ped = 0
                                        contact.nome = ""
                                        contact.pedido = []
                                        contact.codeU = 0
                                        contact.codePed = 0
                                    }else{
                                        if (isNaN(body) && body.toLocaleLowerCase() != 'cancelar' && body.toLocaleLowerCase() != 'finalizar'){
                                            client.sendMessage(from, 'Para o código, informe somente Números\n_Para Cancelar, digite "*Cancelar*"_')
                                        }else{
                    
                                            const sku = body
                                            contact.codeProd = sku
                                            const buscaP = buscaProd(sku)
                    
                                            db.query(buscaP, [sku], (err, results) => {
                                                if (err) {
                                                    console.error('Erro ao executar consulta:', err);
                                                }else{
                                                    if(results.length > 0){
                                                        console.log("Existe");
                                                        if(results[0].estoque <= 0){
                                                            message.reply('Produto Sem Estoque No Momento!\n_Codigo do Produto:_')
                                                        }else{
                                                            contact.estoque = results[0].estoque
                                                            contact.nomeProd = results[0].nome
                                                            message.reply('Informe a Quantidade Desejada: ')
                                                            contact.ped++
                                                        }
                                                    }else{
                                                        console.log("Não Existe");
                                                        message.reply("*Produto Não Encontrado*\n_Informe outro Código:_")
                                                    }
                                                }
                                            })
                                        }
                                    }
                                    break
                                case 3:
                                    if(isNaN(body) && body.toLocaleLowerCase() != 'cancelar' && body.toLocaleLowerCase() != 'finalizar'){
                                        message.reply('*Somente Números!*')
                                        setTimeout(() => {
                                            client.sendMessage(from, 'Quantidade:')
                                        }, 2000);
                                    }else{
                                        const quant = body
                                        if(quant > contact.estoque){
                                            contact.quant = contact.estoque
                                            message.reply('A quantidade desejada é maior que o estoque disponível, será adicionado somente a quantidade disponível em estoque!')
                                            contact.pedido.push({cod: contact.codeProd, quant: contact.estoque, nome: contact.nomeProd})
                                        }else{
                                            contact.pedido.push({cod: contact.codeProd, quant: quant, nome: contact.nomeProd})
                                        }
                                        const pedidoDetails = contact.pedido.map(item => `*Codigo:* ${item.cod}, *Quant:* ${item.quant}, *nome:* ${item.nome}`).join('\n');
                                        setTimeout(() => {
                                            client.sendMessage(from, `Informe outro produto para adicionar ao seu pedido\n\n${pedidoDetails}\n\nDigite *"Finalizar"*, para finalizar seu pedido\nPara Cancelar, digite *"Cancelar"*`)
                                        }, 2000);
                                        contact.ped = 2         
                                    }
                                    break
                            }
                            break
                        case 2:
                            switch(contact.cad){
                                case 0:
                                    message.reply('*Informe Seu CPF:*\n_Somente Números_')
                                    contact.cad++
                                    break;
                                case 1:
                                    const cpf = body;
                                    const validaCPF = validateCPF(cpf)

                                    if (validaCPF) {
                                        console.log('CPF válido!');
                                        const busca = buscaCad(cpf)
                                        
                                        db.query(busca, [cpf], (err, results) => {
                                            if (err) {
                                            console.error('Erro ao executar consulta:', err);
                                            }else{
                                                if (results.length > 0) {
                                                    console.log('Existe');
                                                    message.reply('*Você já possui cadastro!*');
                                                    contact.cad = 0
                                                    contact.registro = []
                                                    contact.endereco = []
                                                    contact.state++; // incrementa contact.state
                                                    if (contact.state === 3) {
                                                        setTimeout(() => {
                                                            client.sendMessage(from, '*Podemos Ajudar em mais alguma coisa?*\nEscolha uma Opção:\n1. Pedido\n2. Cadastro\n0. Encerrar')
                                                        }, 2000);
                                                        contact.state++;
                                                    }
                                                }else{
                                                    console.log('Não Existe');
                                                    function generateCode(){
                                                        return Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000
                                                    }
                                                    contact.registro.push({ tipo: 'code', valor: generateCode()})
                                                    contact.codeU = contact.registro.find(item => item.tipo === 'code').valor;
                                                    const phone = from.split('@')[0]
                                                    contact.registro.push({ tipo: 'phone', valor: phone})
                                                    contact.registro.push({ tipo: 'cpf', valor: body })
                                                    message.reply(`*Agora informe Seu Nome Completo:*`)
                                                    contact.cad++
                                                }
                                            }
                                        });
                                    }else{
                                        message.reply('*Informe um CPF válido:*')
                                    }
                                    break
                                case 2:
                                    contact.registro.push({ tipo: 'nome', valor: body });
                                    message.reply(`*Nome da Mãe:*`)
                                    contact.cad++
                                    break
                                case 3:
                                    contact.registro.push({ tipo: 'nomeMae', valor: body });
                                    message.reply(`*Nome do Pai:*`)
                                    contact.cad++
                                    break
                                case 4:
                                    contact.registro.push({ tipo: 'nomePai', valor: body });
                                    message.reply(`*Informe Seu RG:*`)
                                    contact.cad++
                                    break
                                case 5:
                                    contact.registro.push({ tipo: 'rg', valor: body });
                                    message.reply(`*Email:*`)
                                    contact.cad++
                                    break
                                case 6:
                                    contact.registro.push({ tipo: 'email', valor: body });
                                    message.reply(`Vamos Cadastrar seu Endereço!\n*Informe seu CEP:*`)
                                    contact.cad++
                                    break
                                case 7:
                                    contact.endereco.push({ tipo: 'cep', valor: body });
                                    message.reply(`*Cidade:*`)
                                    contact.cad++
                                    break
                                case 8:
                                    contact.endereco.push({ tipo: 'cidade', valor: body });
                                    message.reply(`*Estado:*`)
                                    contact.cad++
                                    break
                                case 9:
                                    contact.endereco.push({ tipo: 'estado', valor: body });
                                    message.reply(`*Logradouro(Rua/Sitio):*`)
                                    contact.cad++
                                    break
                                case 10:
                                    contact.endereco.push({ tipo: 'logradouro', valor: body });
                                    message.reply(`*Número:*`)
                                    contact.cad++
                                    break
                                case 11:
                                    contact.endereco.push({ tipo: 'numero', valor: body });
                                    message.reply(`*Complemento:*`)
                                    contact.cad++
                                    break
                                case 12:
                                    contact.endereco.push({ tipo: 'complemento', valor: body });
                                    message.reply(`*Bairro:*`)
                                    contact.cad++
                                    break
                                case 13:
                                    contact.endereco.push({ tipo: 'bairro', valor: body });
                                    message.reply(`*Ponto de Referência:*`)
                                    contact.cad++
                                    break
                                case 14:
                                    contact.endereco.push({ tipo: 'pontRef', valor: body });
                                    message.reply(`*Tipo de Residência(casa ou trabalho):*`)
                                    contact.cad++
                                    break
                                case 15:
                                    contact.endereco.push({ tipo: 'tipoRes', valor: body });
                                    const code = contact.registro.find(item => item.tipo === 'code').valor
                                    const nome = contact.registro.find(item => item.tipo === 'nome').valor
                                    const cpf1 = contact.registro.find(item => item.tipo === 'cpf').valor
                                    const nomeMae = contact.registro.find(item => item.tipo === 'nomeMae').valor
                                    const nomePai = contact.registro.find(item => item.tipo === 'nomePai').valor
                                    const rg = contact.registro.find(item => item.tipo === 'rg').valor
                                    const email = contact.registro.find(item => item.tipo === 'email').valor
                                    const phone = contact.registro.find(item => item.tipo === 'phone').valor
                                    const cep = contact.endereco.find(item => item.tipo === 'cep').valor
                                    const cidade = contact.endereco.find(item => item.tipo === 'cidade').valor
                                    const estado = contact.endereco.find(item => item.tipo === 'estado').valor
                                    const logradouro = contact.endereco.find(item => item.tipo === 'logradouro').valor
                                    const numero = contact.endereco.find(item => item.tipo === 'numero').valor
                                    const complemento = contact.endereco.find(item => item.tipo === 'complemento').valor
                                    const bairro = contact.endereco.find(item => item.tipo === 'bairro').valor
                                    const pontRef= contact.endereco.find(item => item.tipo === 'pontRef').valor
                                    const tipoRes = contact.endereco.find(item => item.tipo === 'tipoRes').valor
            
                                    const insert = insertQuery(code, nome, cpf1, nomeMae, nomePai, rg, email, phone, cep, cidade, estado, logradouro, numero, complemento, bairro, pontRef, tipoRes);
                                    db.query(insert, [code, nome, cpf1, nomeMae, nomePai, rg, email, phone, cep, cidade, estado, logradouro, numero, complemento, bairro, pontRef, tipoRes], (err, results) => {
                                        if (err) {
                                            console.error('Erro ao cadastrar informações do cliente', err);
                                            client.sendMessage(from, 'Ops, Ocorreu um Erro ao Tentar Realizar o Cadastro')
                                        }else{
                                            console.log('Informações do cliente cadastradas com sucesso!');
                                            console.log(results);
                                            client.sendMessage(from, `Cadastro Finalizado\nSeu código de Registro é ${contact.codeU}`)
                                        }
                                    });
                                    contact.state++
                                    contact.cad = 0
                                    contact.endereco = []
                                    contact.registro = []
                            }
                    }
                case 3:
                    setTimeout(() => {
                        client.sendMessage(from, '*Podemos Ajudar em mais alguma coisa?*\nEscolha uma Opção:\n1. Pedido\n2. Cadastro\n0. Encerrar')
                    }, 2000);
                    contact.state++
                    break
                case 4:
                    if (isNaN(body) || body < 0 || body > 2){
                        return client.sendMessage(from, 'Oops, opção inválida');
                    }else{
                        contact.choice = +body
                        if(contact.choice === 2){
                            message.reply('Vamos Começar Seu Cadastro!\n*Informe Seu CPF:*\n_Somente Números_');
                            contact.cad = 1;
                            contact.state = 2;
                        }else if(contact.choice === 0){
                            message.reply('Atendimento Finalizado!')
                            contact.state = 0;
                            contact.cad = 0
                            contact.endereco = []
                            contact.nome = ""
                            contact.codeU = 0
                            contact.codePed = 0
                        }else if(contact.choice === 1){
                            client.sendMessage(from, '*Informe Seu CPF:*\n_Somente Números_')
                            contact.ped = 1
                            contact.state = 2;
                        }else{
                            contact.state = 2;
                        }
                    }
                    break
            }

            console.log(contact)
            console.log(contact.state)
            console.log(contact.choice)
            console.log(contact.cad)
            console.log(contact.registro)
            console.log(contact.endereco)
            console.log(contact.codeU)
            console.log(contact.codePed)
    }
})

client.initialize();