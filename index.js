import Whatsapp from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import db from './Conexao.js';
import { insertQuery, buscaCad, buscaProd } from "./Queries.js";

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
        if(contact.state === 0){
            client.sendMessage(from, 'Olá, sou a Bia, *Assistente Virtual da Bia Cosmético*. Em que posso ajuda?\n Escolha uma opção:\n1. Pedido\n2. Cadastro\n0. Encerrar\n_Informe o número da opção_');
            contact.state++
        }else if(contact.state === 1){
            if (isNaN(body) || body < 0 || body > 2){
                return client.sendMessage(from, 'Oops, opção inválida');
            }else{
                contact.choice = +body
                if(contact.choice === 0){
                    message.reply('Atendimento Finalizado')
                    contact.state = 0
                }else{
                    contact.state++
                }
            }
        }
        if(contact.state === 2){
            if(contact.choice === 1 && contact.ped === 0){
                client.sendMessage(from, '*Informe Seu CPF:*\n_Somente Números_')
                contact.ped++
            }else if(contact.choice === 1 && contact.ped === 1){
                const cpf = body;
                const busca = buscaCad(cpf)

                db.query(busca, [cpf], (err, results) => {
                    if (err) {
                      console.error('Erro ao executar consulta:', err);
                    }else{
                        if (results.length > 0) {
                            // Se for encontrado algum valor na consulta, ele inicia a captura do pedido
                            console.log('Existe');

                            contact.nome = results[0].nome // Pega o nome do usuário na base de dados e salva em um variável interna para utilizção no envio da mensagem final
                            function generateCode(){ // Função para gerar um número de 12 digitos para uso como protocolo ou codigo do pedido
                                return Math.floor(Math.random() * (999999999999 - 100000000000 + 1)) + 100000000000
                            }
                            contact.codeU = results[0].code
                            contact.codePed = generateCode()

                            client.sendMessage(from, 'Informe o Código do produto, a quantidade e o nome do produto \n\n_*Exe.: 4309, 1, Bom Doutor Gel Sebo de Carneiro*_\n\n_Em caso de Kit, coloque os produtos separadamente._\n_Envie um produto por vez, como mostra o exemplo!_\n\nPara Cancelar, digite *"Cancelar"*')

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
                    }
                });
            }else if(contact.choice === 1 && contact.ped === 2){
                if(body.toLocaleLowerCase() === 'finalizar'){
                    contact.ped++
                }else if(body.toLocaleLowerCase() === 'cancelar'){
                    contact.state++
                    contact.ped = 0
                    contact.nome = []
                    contact.pedido = []
                    contact.codeU = 0
                    contact.codePed = 0
                }else{
                    if (isNaN(body) && body.toLocaleLowerCase() != 'cancelar' && body.toLocaleLowerCase() != 'finalizar'){
                        client.sendMessage(from, 'Para o código, informe somente Números\n_Para Cancelar, digite "*Cancelar*"_')
                    }else{

                        const sku = body
                        const buscaP = buscaProd(sku)

                        db.query(buscaP, [sku], (err, results) => {
                            if (err) {
                                console.error('Erro ao executar consulta:', err);
                            }else{
                                if(results.length > 0){
                                    console.log("Existe");
                                    
                                }else{
                                    console.log("Não Existe");
                                    message.reply("*Produto Não Encontrado*\nInforme outro Código:")
                                }
                            }
                        })
                    }
                    // const info = body.split(', ')
                    // contact.pedido.push({cod: info[0], quant: info[1], nome: info[2]})
                    // const pedidoDetails = contact.pedido.map(item => `Codigo: ${item.cod}, Quant: ${item.quant}, nome: ${item.nome}`).join('\n');
                    // client.sendMessage(from, `Informe outro produto para adicionar ao seu pedido\n\n${pedidoDetails}\n\nDigite *"Finalizar"*, para finalizar seu pedido\nPara Cancelar, digite *"Cancelar"*`)
                }
                if(contact.choice === 1 && contact.ped === 3){
                    const pedidoDetails = contact.pedido.map(item => `Codigo: ${item.cod}, Quant: ${item.quant}, nome: ${item.nome}`).join('\n');
                    client.sendMessage(from, `Pedido:\nNome: ${contact.nome}\n${pedidoDetails}`)
                    contact.state++
                    contact.ped = 0
                    contact.pedido = []
                    contact.codeU = []
                    contact.codePed = []
                    
                }
            }else if(contact.choice === 2 && contact.cad === 0){
                message.reply('*Informe Seu CPF:*\n_Somente Números_')
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 1){

                const cpf = body;
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
            }else if(contact.choice === 2 && contact.cad === 2){
                contact.registro.push({ tipo: 'nome', valor: body });
                message.reply(`*Nome da Mãe:*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 3){
                contact.registro.push({ tipo: 'nomeMae', valor: body });
                message.reply(`*Nome do Pai:*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 4){
                contact.registro.push({ tipo: 'nomePai', valor: body });
                message.reply(`*Informe Seu RG:*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 5){
                contact.registro.push({ tipo: 'rg', valor: body });
                message.reply(`*Email:*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 6){
                contact.registro.push({ tipo: 'email', valor: body });
                message.reply(`Vamos Cadastrar seu Endereço!\n*Informe seu CEP:*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 7){
                contact.endereco.push({ tipo: 'cep', valor: body });
                message.reply(`*Cidade:*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 8){
                contact.endereco.push({ tipo: 'cidade', valor: body });
                message.reply(`*Estado:*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 9){
                contact.endereco.push({ tipo: 'estado', valor: body });
                message.reply(`*Logradouro(Rua/Sitio):*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 10){
                contact.endereco.push({ tipo: 'logradouro', valor: body });
                message.reply(`*Número:*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 11){
                contact.endereco.push({ tipo: 'numero', valor: body });
                message.reply(`*Complemento:*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 12){
                contact.endereco.push({ tipo: 'complemento', valor: body });
                message.reply(`*Bairro:*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 13){
                contact.endereco.push({ tipo: 'bairro', valor: body });
                message.reply(`*Ponto de Referência:*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 14){
                contact.endereco.push({ tipo: 'pontRef', valor: body });
                message.reply(`*Tipo de Residência(casa ou trabalho):*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 15){
                contact.endereco.push({ tipo: 'tipoRes', valor: body });
                const code = contact.registro.find(item => item.tipo === 'code').valor
                const nome = contact.registro.find(item => item.tipo === 'nome').valor
                const cpf = contact.registro.find(item => item.tipo === 'cpf').valor
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
                
                const insert = insertQuery(code, nome, cpf, nomeMae, nomePai, rg, email, phone, cep, cidade, estado, logradouro, numero, complemento, bairro, pontRef, tipoRes);
                db.query(insert, [code, nome, cpf, nomeMae, nomePai, rg, email, phone, cep, cidade, estado, logradouro, numero, complemento, bairro, pontRef, tipoRes], (err, results) => {
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
        if(contact.state === 3){
            setTimeout(() => {
                client.sendMessage(from, '*Podemos Ajudar em mais alguma coisa?*\nEscolha uma Opção:\n1. Pedido\n2. Cadastro\n0. Encerrar')
            }, 2000);
            contact.state++
        }else if(contact.state === 4){
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