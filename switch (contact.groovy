switch (contact.state) {
    case 0:
        client.sendMessage(from, 'Bot teste. Escolha uma opção:' +
            '\n1 - Pedido\n2 - Cadastro');
        break;
    case 1:
        if (isNaN(body) || body < 1 || body > 2)
            return client.sendMessage(from, 'Oops, opção inválida');
        contact.choice = +body;
    case 2:
        switch (contact.choice) {
        case 1:
            client.sendMessage(from, 'Vamos realizar seu pedido!');
            break;
        case 2:
            client.sendMessage(from, 'Vamos iniciar seu cadastro!');
                
        }
    if (contact.state === 2 && contact.choice === 2 && contact.cad === 0){
        client.sendMessage(from, '*Informe Seu Nome Completo:*')
        contact.cad++
    }else if(contact.state === 2 && contact.choice === 2 && contact.cad === 1){
        client.sendMessage(from, '_Nome Registrado!_\n*Informe Seu CPF:*')
    }
        // if (contact.state === 2 )
        //     return;
    }