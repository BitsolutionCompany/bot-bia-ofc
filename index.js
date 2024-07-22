import Whatsapp from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import db from './Conexao.js';
import insertQuery from "./Queries.js";

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
        
        //if (from !== '558894086642@c.us')
        //return;

        const contact = (contacts[from] || (contacts[from] = {state: 0, cad: 0, ped: 0, registro: [], endereco: [], pedido: [], nome: []}));
        console.log(from)
        console.log(body)
        // console.log(contact)
        // console.log(contact.choice)
        // console.log(contact.cad)
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
                client.sendMessage(from, '*Informe Seu Nome Completo:*')
                contact.ped++
            }else if(contact.choice === 1 && contact.ped === 1){
                contact.nome.push({tipo: 'nome', valor: body})
                client.sendMessage(from, 'Informe o Código do produto, a quantidade e o nome do produto \n_*Exe.: 4309, 1, Bom Doutor Gel Sebo de Carneiro*_\n_Em caso de Kit, coloque os produtos separadamente._\n_Envie um produto por vez, como mostra o exemplo!_\nPara Cancelar, digite *"Cancelar"*')
                contact.ped++
            }else if(contact.choice === 1 && contact.ped === 2){
                if(body.toLocaleLowerCase() === 'finalizar'){
                    contact.ped++
                }else if(body.toLocaleLowerCase() === 'cancelar'){
                    contact.state++
                    contact.ped = 0
                    contact.nome = []
                    contact.pedido = []
                }else{
                    const info = body.split(', ')
                    contact.pedido.push({cod: info[0], quant: info[1], nome: info[2]})
                    const pedidoDetails = contact.pedido.map(item => `Codigo: ${item.cod}, Quant: ${item.quant}, nome: ${item.nome}`).join('\n');
                    client.sendMessage(from, `Informe outro produto para adicionar ao seu pedido\n\n${pedidoDetails}\n\nDigite *"Finalizar"*, para finalizar seu pedido\nPara Cancelar, digite *"Cancelar"*`)
                }
                if(contact.choice === 1 && contact.ped === 3){
                    const pedidoDetails = contact.pedido.map(item => `Codigo: ${item.cod}, Quant: ${item.quant}, nome: ${item.nome}`).join('\n');
                    client.sendMessage(from, `Pedido:\nNome: ${contact.nome.find(item => item.tipo === 'nome').valor}\n${pedidoDetails}`)
                    contact.state++
                    contact.ped = 0
                    contact.pedido = []
                    contact.nome = []
                }
            }else if(contact.choice === 2 && contact.cad === 0){
                message.reply('Vamos Começar Seu Cadastro!\n*Informe Seu Nome Completo:*')
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 1){
                contact.registro.push({ tipo: 'nome', valor: body });
                message.reply(`*Agora informe Seu CPF:*`)
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 2){
                contact.registro.push({ tipo: 'cpf', valor: body });
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
                const query = insertQuery(
                    contact.registro.find(item => item.tipo === 'nome').valor,
                    contact.registro.find(item => item.tipo === 'cpf').valor,
                    contact.registro.find(item => item.tipo === 'nomeMae').valor,
                    contact.registro.find(item => item.tipo === 'nomePai').valor,
                    contact.registro.find(item => item.tipo === 'rg').valor,
                    contact.registro.find(item => item.tipo === 'email').valor,
                    contact.endereco.find(item => item.tipo === 'cep').valor,
                    contact.endereco.find(item => item.tipo === 'cidade').valor,
                    contact.endereco.find(item => item.tipo === 'estado').valor,
                    contact.endereco.find(item => item.tipo === 'logradouro').valor,
                    contact.endereco.find(item => item.tipo === 'numero').valor,
                    contact.endereco.find(item => item.tipo === 'complemento').valor,
                    contact.endereco.find(item => item.tipo === 'bairro').valor,
                    contact.endereco.find(item => item.tipo === 'pontRef').valor,
                    contact.endereco.find(item => item.tipo === 'tipoRes').valor
                );
                db.query(query, [contact.registro.find(item => item.tipo === 'nome').valor,
                    contact.registro.find(item => item.tipo === 'cpf').valor,
                    contact.registro.find(item => item.tipo === 'nomeMae').valor,
                    contact.registro.find(item => item.tipo === 'nomePai').valor,
                    contact.registro.find(item => item.tipo === 'rg').valor,
                    contact.registro.find(item => item.tipo === 'email').valor,
                    contact.endereco.find(item => item.tipo === 'cep').valor,
                    contact.endereco.find(item => item.tipo === 'cidade').valor,
                    contact.endereco.find(item => item.tipo === 'estado').valor,
                    contact.endereco.find(item => item.tipo === 'logradouro').valor,
                    contact.endereco.find(item => item.tipo === 'numero').valor,
                    contact.endereco.find(item => item.tipo === 'complemento').valor,
                    contact.endereco.find(item => item.tipo === 'bairro').valor,
                    contact.endereco.find(item => item.tipo === 'pontRef').valor,
                    contact.endereco.find(item => item.tipo === 'tipoRes').valor], (err, results) => {
                    if (err) {
                      console.error('Erro ao cadastrar informações do cliente', err);
                      contact.state++
                      client.sendMessage(from, 'Ops, Ocorreu um Erro ao Tentar Realizar o Cadastro')
                    }else{
                        console.log('Informações do cliente cadastradas com sucesso!');
                        client.sendMessage(from, 'Cadastro Finalizado')
                        contact.cad++
                    }
                  });
            }
            if(contact.choice === 2 && contact.cad === 16){
                setTimeout(() => {
                    client.sendMessage(from, `_Dados do Cliente_\n*Nome: ${contact.registro.find(item => item.tipo === 'nome').valor}*\n*CPF: ${contact.registro.find(item => item.tipo === 'cpf').valor}*\n*Nome da Mãe: ${contact.registro.find(item => item.tipo === 'nomeMae').valor}*\n*Nome do Pai: ${contact.registro.find(item => item.tipo === 'nomePai').valor}*\n*RG: ${contact.registro.find(item => item.tipo === 'rg').valor}*\n*Email: ${contact.registro.find(item => item.tipo === 'email').valor}*\n_Endereço_\n*CEP: ${contact.endereco.find(item => item.tipo === 'cep').valor}*\n*Cidade: ${contact.endereco.find(item => item.tipo === 'cidade').valor}*\n*Estado: ${contact.endereco.find(item => item.tipo === 'estado').valor}*\n*Logradouro: ${contact.endereco.find(item => item.tipo === 'logradouro').valor}*\n*Número: ${contact.endereco.find(item => item.tipo === 'numero').valor}*\n*Complemento: ${contact.endereco.find(item => item.tipo === 'complemento').valor}*\n*Bairro: ${contact.endereco.find(item => item.tipo === 'bairro').valor}*\n*Ponto de Referência: ${contact.endereco.find(item => item.tipo === 'pontRef').valor}*\n*Tipo Residência: ${contact.endereco.find(item => item.tipo === 'tipoRes').valor}*`)
                }, 1000);
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
                    message.reply('Vamos Começar Seu Cadastro!\n*Informe Seu Nome Completo:*');
                    contact.cad = 1;
                    contact.state = 2;
                }else if(contact.choice === 0){
                    message.reply('Atendimento Finalizado!')
                    contact.state = 0;
                }else if(contact.choice === 1){
                    client.sendMessage(from, '*Informe Seu Nome Completo:*')
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
    }
})

client.initialize();