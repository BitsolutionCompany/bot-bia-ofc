import Whatsapp from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import db from './Conexao.js';
import { insertQuery, buscaCad, buscaProd, insertPedidoUser, insertPedido, UpdateEstoque, updateNomeCons, updateNomeMaeCons, updateNomePaiCons, updateEmailCons, updatePhoneCons, updateAdressCons } from "./Queries.js";
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

        const contact = (contacts[from] || (contacts[from] = { state: 0, cad: 0, ped: 0, registro: [], endereco: [], pedido: [], nome: "", update: 0, passo: 0}));
        console.log(from)
        console.log(body)
        console.log(contact)
        console.log(contact.choice)
        console.log(contact.cad)
        console.log(contact.codeU)
        console.log(contact.codePed)
        if(contact.state === 0){
            client.sendMessage(from, 'Olá, sou a Bia, *Assistente Virtual da Bia Cosmético*. Em que posso ajuda?\n Escolha uma opção:\n1. Pedido\n2. Cadastro\n3. Como Ser Um(a) Consultor(a)\n4. Atualização de Dados\n0. Encerrar\n_Informe o número da opção_');
            contact.state++
        }else if(contact.state === 1){
            if (isNaN(body) || body < 0 || body > 4){
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
            }else if(contact.choice === 1 && contact.ped === 2){
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
            }if(contact.choice === 1 && contact.ped === 3){
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
            }else if(contact.choice === 2 && contact.cad === 0){
                message.reply('*Informe Seu CPF:*\n_Somente Números_')
                contact.cad++
            }else if(contact.choice === 2 && contact.cad === 1){
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
                                        client.sendMessage(from, '*Podemos Ajudar em mais alguma coisa?*\nEscolha uma Opção:\n1. Pedido\n2. Cadastro\n3. Como Ser Um(a) Consultor(a)\n0. Encerrar')
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
            }else if(contact.choice === 3){
                client.sendMessage(from, '*Bem-vindo(a) ao nosso atendimento! Estamos felizes em saber que você tem interesse em se tornar uma consultora da Facinatus Cosméticos. Nossa missão é oferecer produtos de alta qualidade que realçam a beleza e promovem o bem-estar.*')
                setTimeout(() => {
                    client.sendMessage(from, '*Benefícios de Ser uma Consultora Facinatus:*\n*1. Lucro Atrativo:* Ganhe até 30% de lucro em cada venda;\n*2. Flexibilidade:* Defina seus próprios horários e trabalhe de onde quiser;\n*3. Variedade de Produtos:* Acesso a mais de 500 produtos, incluindo lançamentos e ofertas especiais\n*4. Materiais de Apoio:*  Receba uma revista gratuita com mais de 140 páginas para mostrar aos seus clientes;\n*5. Formas de Pagamento Facilitadas:*  Pague seus pedidos via boleto, cartão de crédito ou PIX;\n*6. Entrega Rápida:*  Receba seus pedidos em casa ou retire em uma das lojas autorizadas.')
                }, 1000);
                setTimeout(() => {
                    client.sendMessage(from, '*Nossa distribuidora em São Benedito, Ceará, está totalmente preparada para atender todas as suas necessidades como consultora da Facinatus Cosméticos. Localizada estrategicamente, nossa unidade facilita a distribuição eficiente dos produtos, garantindo que você tenha acesso rápido e seguro a toda a linha de cosméticos Facinatus.*\n\n_Estamos situados em um ponto estratégico de São Benedito, o que nos permite realizar entregas rápidas e eficientes em toda a região. Isso significa que você pode contar com um abastecimento contínuo e pontual dos produtos, sem preocupações com atrasos._\n\n_Nossa equipe dedicada está sempre à disposição para oferecer suporte completo e treinamento especializado. Queremos que você se sinta confiante e bem preparada para representar a Facinatus Cosméticos. Oferecemos sessões de treinamento que cobrem desde técnicas de vendas até o conhecimento detalhado dos produtos, ajudando você a maximizar suas vendas e a satisfação dos seus clientes._\n\n_Além do treinamento, fornecemos materiais de apoio, como catálogos atualizados, amostras de produtos e kits promocionais. Esses recursos são essenciais para que você possa apresentar os produtos de maneira profissional e atrativa aos seus clientes._\n\n_Ao se tornar uma consultora da Facinatus, você também faz parte de uma comunidade vibrante e solidária. Organizamos encontros e eventos regulares onde você pode trocar experiências, aprender novas estratégias de vendas e se inspirar com histórias de sucesso de outros consultores._\n\n_Trabalhar com a Facinatus Cosméticos não é apenas uma oportunidade de ganhar uma renda extra, mas também de crescer profissionalmente. Oferecemos programas de incentivo e reconhecimento para os consultores que se destacam, proporcionando oportunidades de crescimento e desenvolvimento contínuo._\n\n*Estamos aqui para garantir que você tenha todas as ferramentas e o suporte necessário para alcançar o sucesso como consultora da Facinatus Cosméticos. Junte-se a nós e descubra como é gratificante fazer parte de uma marca que valoriza a beleza e o bem-estar.*')
                }, 2000);
                setTimeout(() => {
                    client.sendMessage(from, 'Para ativar seu cadastro, é necessário fazer um pedido mínimo de R$ 300,00, escolhendo qualquer produto do nosso catálogo. Se preferir, temos kits iniciais com produtos selecionados, que são os mais vendidos na sua região ou cidade. Esses kits estão disponíveis nos valores de R$ 300,00, R$ 500,00 e R$ 1000,00, incluindo maquiagens, perfumes, skincare, cuidados para os pés, esmaltes, entre outros.\nVocê pode lucrar até 50%, dependendo do preço de revenda. Utilize o preço sugerido na revista ou defina o seu próprio preço!')
                }, 2000);
                contact.state++
            }else if(contact.choice === 4){
                if(contact.update === 0){
                    client.sendMessage(from, '*Informe seu CPF:*\n_Somente Números_')
                    contact.update++
                }else if(contact.update === 1){
                    const cpf = body;
                    const validaCPF = validateCPF(cpf)
                    contact.cpf = cpf
                    
                    if (validaCPF) {
                        console.log('Válido');
                        const busca = buscaCad(cpf)

                        db.query(busca, [cpf], (err, results) => {
                            if(err){
                                console.error('Erro ao executar consulta:', err);
                            }else{
                                console.log('Existe');
                                if (results.length > 0) {
                                    client.sendMessage(from, "*Qual Informação Você Quer Alterar?*\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar")
                                    contact.update++
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
                                message.reply(`*PNão encontrei o seu cadastro!*\n*_Vamos Realizar seu cadastro_*`)
                                setTimeout(() => {
                                    client.sendMessage(from, '*Informe Seu Nome Completo:*')
                                }, 2000);
                                contact.cad = 2
                                contact.ped = 0
                                contact.choice = 2
                                }
                            }
                        })
                        
                    }else{
                        console.log('Não Válido');
                        message.reply('*Informe um CPF válido: *')
                    }
                }else if(contact.update === 2){
                    if(isNaN(body) || body < 0 || body > 6){
                        return client.sendMessage(from, 'Oops, opção inválida');
                    }else{
                        contact.select = +body
                        contact.update++
                    }
                }
                if(contact.update === 3){
                    if(contact.select === 0){
                        contact.state++
                        contact.update = 0
                        contact.passo = 0
                        contact.choice = 0
                        contact.dado = ''
                        contact.cpf = ''
                    }else if(contact.select === 1){
                        if(contact.passo === 0){
                            message.reply('Informe Seu Nome Completo: ')
                            contact.passo++
                        }else if(contact.passo === 1){
                            contact.dado = body
                            const newInfo = contact.dado
                            message.reply(`Nome: ${newInfo}\n*Confirma Alteração?*\n1. Sim\n2. Não\n\n_Informe o número da opção_`)
                            contact.passo++
                        }else if(contact.passo === 2){
                            if(isNaN(body) || body < 1 || body > 2){
                                return client.sendMessage(from, 'Oops, opção inválida');
                            }else{
                                const option = +body
                                if(option === 1){
                                    const nome = contact.dado
                                    const cpf = contact.cpf
                                    const nameUpdate = updateNomeCons(nome, cpf)

                                    db.query(nameUpdate, [nome, cpf], (err, results) => {
                                        if(err){
                                            console.log('Erro ao efetuar consulta', err);
                                            client.message(from, 'Tivemos um erro ao tentar atualizar')
                                            setTimeout(() => {
                                                client.sendMessage(from, "*Qual Informação Você Quer Alterar?*\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar")
                                            }, 2000);
                                            contact.update = 2
                                            contact.passo = 0
                                        }else{
                                            console.log('Nome Atualizado com Sucesso');
                                            client.sendMessage(from, "Alteração Concluída!")
                                            setTimeout(() => {
                                                client.sendMessage(from, 'Deseja Atualizar Mais Alguma Informação?\n\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar')
                                            }, 2000);
                                            contact.passo = 0
                                            contact.update = 2
                                        }
                                    })
                                }else if(option === 2){
                                    client.sendMessage(from, "*Qual Informação Você Quer Alterar?*\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar")
                                    contact.update = 2
                                    contact.passo = 0
                                }
                            }
                        }
                    }else if(contact.select === 2){
                        if(contact.passo === 0){
                            message.reply('Informe o Nome da Mãe: ')
                            contact.passo++
                        }else if(contact.passo === 1){
                            contact.dado = body
                            const newInfo = contact.dado
                            message.reply(`Nome da Mãe: ${newInfo}\n*Confirma Alteração?*\n1. Sim\n2. Não\n\n_Informe o número da opção_`)
                            contact.passo++
                        }else if(contact.passo === 2){
                            if(isNaN(body) || body < 1 || body > 2){
                                return client.sendMessage(from, 'Oops, opção inválida');
                            }else{
                                const option = +body
                                if(option === 1){
                                    const nomeM = contact.dado
                                    const cpf = contact.cpf
                                    const nameUpdate = updateNomeMaeCons(nomeM, cpf)

                                    db.query(nameUpdate, [nomeM, cpf], (err, results) => {
                                        if(err){
                                            console.log('Erro ao efetuar consulta', err);
                                            client.message(from, 'Tivemos um erro ao tentar atualizar')
                                            setTimeout(() => {
                                                client.sendMessage(from, "*Qual Informação Você Quer Alterar?*\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar")
                                            }, 2000);
                                            contact.update = 2
                                            contact.passo = 0
                                        }else{
                                            console.log('Nome da Mae Atualizado com Sucesso');
                                            client.sendMessage(from, "Alteração Concluída!")
                                            setTimeout(() => {
                                                client.sendMessage(from, 'Deseja Atualizar Mais Alguma Informação?\n\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar')
                                            }, 2000);
                                            contact.passo = 0
                                            contact.update = 2
                                        }
                                    })
                                }else if(option === 2){
                                    client.sendMessage(from, "*Qual Informação Você Quer Alterar?*\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar")
                                    contact.update = 2
                                    contact.passo = 0
                                }
                            }
                        }
                    }else if(contact.select === 3){
                        if(contact.passo === 0){
                            message.reply('Informe o Nome do Pai: ')
                            contact.passo++
                        }else if(contact.passo === 1){
                            contact.dado = body
                            const newInfo = contact.dado
                            message.reply(`Nome do Pai: ${newInfo}\n*Confirma Alteração?*\n1. Sim\n2. Não\n\n_Informe o número da opção_`)
                            contact.passo++
                        }else if(contact.passo === 2){
                            if(isNaN(body) || body < 1 || body > 2){
                                return client.sendMessage(from, 'Oops, opção inválida');
                            }else{
                                const option = +body
                                if(option === 1){
                                    const nomeP = contact.dado
                                    const cpf = contact.cpf
                                    const nameUpdate = updateNomePaiCons(nomeP, cpf)

                                    db.query(nameUpdate, [nomeP, cpf], (err, results) => {
                                        if(err){
                                            console.log('Erro ao efetuar consulta', err);
                                            client.message(from, 'Tivemos um erro ao tentar atualizar')
                                            setTimeout(() => {
                                                client.sendMessage(from, "*Qual Informação Você Quer Alterar?*\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar")
                                            }, 2000);
                                            contact.update = 2
                                            contact.passo = 0
                                        }else{
                                            console.log('Nome do Pai Atualizado com Sucesso');
                                            client.sendMessage(from, "Alteração Concluída!")
                                            setTimeout(() => {
                                                client.sendMessage(from, 'Deseja Atualizar Mais Alguma Informação?\n\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar')
                                            }, 2000);
                                            contact.passo = 0
                                            contact.update = 2
                                        }
                                    })
                                }else if(option === 2){
                                    client.sendMessage(from, "*Qual Informação Você Quer Alterar?*\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar")
                                    contact.update = 2
                                    contact.passo = 0
                                }
                            }
                        }
                    }else if(contact.select === 4){
                        if(contact.passo === 0){
                            message.reply('Informe seu novo Email: ')
                            contact.passo++
                        }else if(contact.passo === 1){
                            contact.dado = body
                            const newInfo = contact.dado
                            message.reply(`Novo Email: ${newInfo}\n*Confirma Alteração?*\n1. Sim\n2. Não\n\n_Informe o número da opção_`)
                            contact.passo++
                        }else if(contact.passo === 2){
                            if(isNaN(body) || body < 1 || body > 2){
                                return client.sendMessage(from, 'Oops, opção inválida');
                            }else{
                                const option = +body
                                if(option === 1){
                                    const email = contact.dado
                                    const cpf = contact.cpf
                                    const emailUpdate = updateEmailCons(email, cpf)

                                    db.query(emailUpdate, [email, cpf], (err, results) => {
                                        if(err){
                                            console.log('Erro ao efetuar consulta', err);
                                            client.message(from, 'Tivemos um erro ao tentar atualizar')
                                            setTimeout(() => {
                                                client.sendMessage(from, "*Qual Informação Você Quer Alterar?*\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar")
                                            }, 2000);
                                            contact.update = 2
                                            contact.passo = 0
                                        }else{
                                            console.log('Email Atualizado com Sucesso');
                                            client.sendMessage(from, "Alteração Concluída!")
                                            setTimeout(() => {
                                                client.sendMessage(from, 'Deseja Atualizar Mais Alguma Informação?\n\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar')
                                            }, 2000);
                                            contact.passo = 0
                                            contact.update = 2
                                        }
                                    })
                                }else if(option === 2){
                                    client.sendMessage(from, "*Qual Informação Você Quer Alterar?*\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar")
                                    contact.update = 2
                                    contact.passo = 0
                                }
                            }
                        }
                    }else if(contact.select === 5){
                        if(contact.passo === 0){
                            client.sendMessage(from, 'Seu número será atualizado pelo telefone atual do Whatsapp!')
                            contact.passo++
                        }
                        if(contact.passo === 1){
                            const number = from.split('@')[0]
                            setTimeout(() => {
                                message.reply(`Novo Número: ${number}\n*Confirma Alteração?*\n1. Sim\n2. Não\n\n_Informe o número da opção_`)
                            }, 1000);
                            contact.passo++
                        }else if(contact.passo === 2){
                            if(isNaN(body) || body < 1 || body > 2){
                                return client.sendMessage(from, 'Oops, opção inválida');
                            }else{
                                const option = +body
                                if(option === 1){
                                    const number = from.split('@')[0]
                                    const cpf = contact.cpf

                                    const alterNumber = updatePhoneCons(number, cpf)

                                    db.query(alterNumber, [number, cpf], (err, results) => {
                                        if(err){
                                            console.log("Erro ao tentar atualizar o número! ", err);
                                            client.message(from, 'Tivemos um erro ao tentar atualizar')
                                            setTimeout(() => {
                                                client.sendMessage(from, "*Qual Informação Você Quer Alterar?*\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar")
                                            }, 2000);
                                            contact.update = 2
                                            contact.passo = 0
                                        }else{
                                            console.log('Telefone Atualizado com Sucesso');
                                            client.sendMessage(from, "Alteração Concluída!")
                                            setTimeout(() => {
                                                client.sendMessage(from, 'Deseja Atualizar Mais Alguma Informação?\n\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar')
                                            }, 2000);
                                            contact.passo = 0
                                            contact.update = 2
                                        }
                                    })
                                }else if(option === 2){
                                    client.sendMessage(from, "*Qual Informação Você Quer Alterar?*\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar")
                                    contact.update = 2
                                    contact.passo = 0
                                }
                            }
                        }
                    }else if(contact.select === 6){
                        if(contact.passo === 0){
                            client.sendMessage(from, "*CEP:*\n_Somente Números_")
                            contact.passo++
                        }else if(contact.passo === 1){
                            contact.endereco.push({tipo: 'cep', valor: body})
                            message.reply('*Cidade:*')
                            contact.passo++
                        }else if(contact.passo === 2){
                            contact.endereco.push({tipo: 'cidade', valor: body})
                            message.reply('*Estado:*')
                            contact.passo++
                        }else if(contact.passo === 3){
                            contact.endereco.push({tipo: 'estado', valor: body})
                            message.reply('*Logradouro(rua, sitio, entre outros):*')
                            contact.passo++
                        }else if(contact.passo === 4){
                            contact.endereco.push({tipo: 'logradouro', valor: body})
                            message.reply('*Número:*\n_Digite *S/N* caso não tenha número_')
                            contact.passo++
                        }else if(contact.passo === 5){
                            contact.endereco.push({tipo: 'num', valor: body})
                            message.reply('*Complemento:*\n_Digite *Sem Complemento* caso não tenha complemento_')
                            contact.passo++
                        }else if(contact.passo === 6){
                            contact.endereco.push({tipo: 'complemento', valor: body})
                            message.reply('*Bairro:*')
                            contact.passo++
                        }else if(contact.passo === 7){
                            contact.endereco.push({tipo: 'bairro', valor: body})
                            message.reply('*Ponto de Referência:*')
                            contact.passo++
                        }else if(contact.passo === 8){
                            contact.endereco.push({tipo: 'pontoRef', valor: body})
                            message.reply('*Tipo de Residência(casa ou trabalho):*')
                            contact.passo++
                        }else if(contact.passo === 9){
                            contact.endereco.push({tipo: 'tipoRes', valor: body})
                            client.sendMessage(from, `*CEP:* ${contact.endereco.find(item => item.tipo === 'cep').valor}\n*Cidade:* ${contact.endereco.find(item => item.tipo === 'cidade').valor}\n*Estado:* ${contact.endereco.find(item => item.tipo === 'estado').valor}\n*Logradouro:* ${contact.endereco.find(item => item.tipo === 'logradouro').valor}\n*Número:* ${contact.endereco.find(item => item.tipo === 'num').valor}\n*Complemento:* ${contact.endereco.find(item => item.tipo === 'complemento').valor}\n*Bairro:* ${contact.endereco.find(item => item.tipo === 'bairro').valor}\n*Ponto de Referência:* ${contact.endereco.find(item => item.tipo === 'pontoRef').valor}\n*Tipo de Residência:* ${contact.endereco.find(item => item.tipo === 'tipoRes').valor}\n\n*Confirma Alteração?*\n1. Sim\n2. Não\n\n_Informe o número da opção_`)
                            contact.passo++
                        }else if(contact.passo === 10){
                            if(isNaN(body) || body < 1 || body > 2){
                                return client.sendMessage(from, 'Oops, opção inválida');
                            }else{
                                const option = +body
                                if(option === 1){
                                    const cep = contact.endereco.find(item => item.tipo === 'cep').valor
                                    const cidade = contact.endereco.find(item => item.tipo === 'cidade').valor
                                    const estado = contact.endereco.find(item => item.tipo === 'estado').valor
                                    const logradouro = contact.endereco.find(item => item.tipo === 'logradouro').valor
                                    const num = contact.endereco.find(item => item.tipo === 'num').valor
                                    const complemento = contact.endereco.find(item => item.tipo === 'complemento').valor
                                    const bairro = contact.endereco.find(item => item.tipo === 'bairro').valor
                                    const pontoRef = contact.endereco.find(item => item.tipo === 'pontoRef').valor
                                    const tipoRes = contact.endereco.find(item => item.tipo === 'tipoRes').valor
                                    const cpf = contact.cpf

                                    const adress = updateAdressCons(cep, cidade, estado, logradouro, num, complemento, bairro, pontoRef, tipoRes, cpf)

                                    db.query(adress, [cep, cidade, estado, logradouro, num, complemento, bairro, pontoRef, tipoRes, cpf], (err, results) => {
                                        if(err){
                                            console.error('Erro ao tentar atualizar endereço!', err);
                                            client.sendMessage('Tivemos Um Erro ao Tentar Atualizar!')
                                            setTimeout(() => {
                                                client.sendMessage(from, "*Qual Informação Você Quer Alterar?*\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar")
                                            }, 2000);
                                            contact.update = 2
                                            contact.passo = 0
                                        }else{
                                            console.log('Endereço Atualizado com Sucesso');
                                            client.sendMessage(from, "Alteração Concluída!")
                                            setTimeout(() => {
                                                client.sendMessage(from, 'Deseja Atualizar Mais Alguma Informação?\n\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar')
                                            }, 2000);
                                            contact.passo = 0
                                            contact.update = 2
                                        }
                                    })
                                }else if(option === 2){
                                    client.sendMessage(from, "*Qual Informação Você Quer Alterar?*\n_Selecione Uma Opção_\n1. Nome\n2. Nome da Mãe\n3. Nome do Pai\n4. Email\n5. Telefone\n6. Endereço\n0. Cancelar")
                                    contact.update = 2
                                    contact.passo = 0
                                }
                            }
                        }
                    }
                }
            }
        }
        if(contact.state === 3){
            setTimeout(() => {
                client.sendMessage(from, '*Podemos Ajudar em mais alguma coisa?*\nEscolha uma Opção:\n1. Pedido\n2. Cadastro\n3. Como Ser Um(a) Consultor(a)\n4. Atualização de Dados\n0. Encerrar\n_Informe o número da opção_')
            }, 3000);
            contact.state++
        }else if(contact.state === 4){
            if (isNaN(body) || body < 0 || body > 4){
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
                }else if(contact.choice === 3){
                    client.sendMessage(from, '*Bem-vindo(a) ao nosso atendimento! Estamos felizes em saber que você tem interesse em se tornar uma consultora da Facinatus Cosméticos. Nossa missão é oferecer produtos de alta qualidade que realçam a beleza e promovem o bem-estar.*')
                    setTimeout(() => {
                        client.sendMessage(from, '*Benefícios de Ser uma Consultora Facinatus:*\n*1. Lucro Atrativo:* Ganhe até 30% de lucro em cada venda;\n*2. Flexibilidade:* Defina seus próprios horários e trabalhe de onde quiser;\n*3. Variedade de Produtos:* Acesso a mais de 500 produtos, incluindo lançamentos e ofertas especiais\n*4. Materiais de Apoio:*  Receba uma revista gratuita com mais de 140 páginas para mostrar aos seus clientes;\n*5. Formas de Pagamento Facilitadas:*  Pague seus pedidos via boleto, cartão de crédito ou PIX;\n*6. Entrega Rápida:*  Receba seus pedidos em casa ou retire em uma das lojas autorizadas.')
                    }, 1000);
                    setTimeout(() => {
                        client.sendMessage(from, '*Nossa distribuidora em São Benedito, Ceará, está totalmente preparada para atender todas as suas necessidades como consultora da Facinatus Cosméticos. Localizada estrategicamente, nossa unidade facilita a distribuição eficiente dos produtos, garantindo que você tenha acesso rápido e seguro a toda a linha de cosméticos Facinatus.*\n\n_Estamos situados em um ponto estratégico de São Benedito, o que nos permite realizar entregas rápidas e eficientes em toda a região. Isso significa que você pode contar com um abastecimento contínuo e pontual dos produtos, sem preocupações com atrasos._\n\n_Nossa equipe dedicada está sempre à disposição para oferecer suporte completo e treinamento especializado. Queremos que você se sinta confiante e bem preparada para representar a Facinatus Cosméticos. Oferecemos sessões de treinamento que cobrem desde técnicas de vendas até o conhecimento detalhado dos produtos, ajudando você a maximizar suas vendas e a satisfação dos seus clientes._\n\n_Além do treinamento, fornecemos materiais de apoio, como catálogos atualizados, amostras de produtos e kits promocionais. Esses recursos são essenciais para que você possa apresentar os produtos de maneira profissional e atrativa aos seus clientes._\n\n_Ao se tornar uma consultora da Facinatus, você também faz parte de uma comunidade vibrante e solidária. Organizamos encontros e eventos regulares onde você pode trocar experiências, aprender novas estratégias de vendas e se inspirar com histórias de sucesso de outros consultores._\n\n_Trabalhar com a Facinatus Cosméticos não é apenas uma oportunidade de ganhar uma renda extra, mas também de crescer profissionalmente. Oferecemos programas de incentivo e reconhecimento para os consultores que se destacam, proporcionando oportunidades de crescimento e desenvolvimento contínuo._\n\n*Estamos aqui para garantir que você tenha todas as ferramentas e o suporte necessário para alcançar o sucesso como consultora da Facinatus Cosméticos. Junte-se a nós e descubra como é gratificante fazer parte de uma marca que valoriza a beleza e o bem-estar.*')
                    }, 2000);
                    setTimeout(() => {
                        client.sendMessage(from, 'Para ativar seu cadastro, é necessário fazer um pedido mínimo de R$ 300,00, escolhendo qualquer produto do nosso catálogo. Se preferir, temos kits iniciais com produtos selecionados, que são os mais vendidos na sua região ou cidade. Esses kits estão disponíveis nos valores de R$ 300,00, R$ 500,00 e R$ 1000,00, incluindo maquiagens, perfumes, skincare, cuidados para os pés, esmaltes, entre outros.\nVocê pode lucrar até 50%, dependendo do preço de revenda. Utilize o preço sugerido na revista ou defina o seu próprio preço!')
                    }, 2000);
                    setTimeout(() => {
                        client.sendMessage(from, '*Podemos Ajudar em mais alguma coisa?*\nEscolha uma Opção:\n1. Pedido\n2. Cadastro\n3. Como Ser Um(a) Consultor(a)\n4. Atualização de Dados\n0. Encerrar\n_Informe o número da opção_')
                    }, 3000);
                    contact.state = 2;
                }else if(contact.choice === 4){
                    client.sendMessage(from, '*Informe seu CPF:*\n_Somente Números_')
                    contact.update = 1
                    contact.state = 2
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
        console.log(contact.passo)
    }
})

client.initialize();