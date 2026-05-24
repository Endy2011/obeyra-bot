let opzione;
if (!methodCodeQR && !methodCode && !fs.existsSync(`./${authFile}/creds.json`)) {
    do {
        // PALETTE AGGIORNATA: ERROR-BOT PRO PURE CYBERPUNK
        const errRed = chalk.hex('#FF2A2A').bold;
        const errDimRed = chalk.hex('#990000');
        const errDark = chalk.hex('#444444');
        const errGray = chalk.hex('#BBBBBB');
        const errGreen = chalk.hex('#00FF66');
        const errCyan = chalk.hex('#00E5FF');

        // Geometrie fisse e calibrate per evitare disallineamenti
        const bTop = errRed('◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢ SYSTEM INJECTION GATEWAY ◣◥◣◥◣◥◣◥◣◥◣◥◣◥◣◥◣◥◣◥');
        const bBot = errRed('◣◥◣◥◣◥◣◥◣◥◣◥◣◥◣◥◣◥◣◥ CORE SYSTEM INITIALIZED ◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢');
        const line = errDark('—'.repeat(68));
        
        const title   = chalk.white.bold('     [!] DETECTED STATUS: INITIALIZATION_MENU_REQUIRED');
        const option1 = errCyan('     [01] ') + chalk.white('-> CORE_INJECT :') + chalk.bold.white(' VIA QR CODE MATRIX');
        const option2 = errCyan('     [02] ') + chalk.white('-> HOST_LINK   :') + chalk.bold.white(' VIA PAIRING CODE (8 DIGITS)');
        
        const note1   = errDimRed('     🗲 ') + errGray.italic('Digitare esclusivamente l\'identificativo numerico (1 o 2).');
        const note2   = errDimRed('     🗲 ') + errGray.italic('Inviare il comando [ENTER] per confermare la pipeline.');
        const footer  = errDark('     >> Error-Bot OS Framework // Engine Core v2.5.8-Stable');

        const prompt  = errGreen('\n ┌──(sys㉿error-bot)─[~/auth_gateway]') + 
                        errGreen('\n └─$ ') + chalk.white('select_node') + errRed(' ❯ ');

        opzione = await question(`\n
${bTop}
${line}
${title}
${line}

${option1}
${option2}

${line}
${note1}
${note2}
${footer}
${line}
${bBot}
${prompt}`);

        if (!/^[1-2]$/.test(opzione)) {
            console.log(`\n${chalk.bgRed.black.bold(' ✖ [CRITICAL_INPUT_ERROR]: ACQUISIZIONE FALLITA ')}
${errDark('—'.repeat(68))}
${errRed(' ⚠️  Eccezione di runtime:')} ${errGray('Il terminale accetta esclusivamente i registri')} ${errCyan('1')} ${errGray('o')} ${errCyan('2')}
${errDimRed(' ⤷ Target:')} ${errGray('Nessun simbolo, lettera o spazio vuoto consentito.')}
${errDimRed(' ⤷ Debug Info:')} ${errGray('In caso di loop o crash di cifratura, Developer Dev: +393701330693')}
`);
        }
    } while ((opzione !== '1' && opzione !== '2') || fs.existsSync(`./${authFile}/creds.json`));
}
