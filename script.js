class PARCELAMENTO_SIMPLES_NACIONAL_NORMAL {
    constructor(pdf) {
        this.pdf = pdf;
        this.nomeEmpresarial = this.pdf.match(/Nome Empresarial: (.*?) CNPJ/)[1];
        this.cnpj = this.pdf.match(/CNPJ:\s*([\d]{2}\.[\d]{3}\.[\d]{3}\/[\d]{4}\-[\d]{2})/)[1];
        this.aquisicao = '';
        this.valor_do_parcelamento = '';
        this.qts_parcelas = '';
        this.debitos = [];
        this.vencto_parc1 = '';
        this.vlr_parc1 = '';
        this.vlr_parcs = '';

        this.vlr_debito = 0;
        this.juros = 0;

        this.get_vlrParcelamento();
        this.get_NumParcelas();
        this.get_Debitos();
        this.get_venctoParc1();
        this.get_vlrParc1();
        this.get_vlrParcs();
        this.get_aquisicaoParc();

        for (let debito of this.debitos) {
            if (debito[2] !== 'Saldo Devedor Original') {
                this.vlr_debito += parseFloat(debito[2].replace('.', '').replace(',', '.'));
            }
        }

        this.juros = parseFloat(this.valor_do_parcelamento.replace('.', '').replace(',', '.')) - this.vlr_debito;
    }

    get_aquisicaoParc() {
        this.aquisicao = this.pdf.match(/em ([\d]{2}\/[\d]{2}\/[\d]{4}) às/)[1];
    }
    
    get_vlrParcelamento() {
        this.valor_do_parcelamento = this.pdf.match(/Valor total parcelado: \sR\$ ([\d,.]+)/)[1];
    }
    
    get_NumParcelas() {
        this.qts_parcelas = this.pdf.match(/Número de parcelas : \s([\d,.]+)/)[1];
    }

    get_Debitos() {
        const matches = this.pdf.match(/Atualizado(.*?)Valor/);
        const rows = matches[1].split(' ').filter((element) => {
            return element !== '' && element !== 'R$';
        });

        for (let i = 0; i < rows.length; i += 4) {
            const row = rows.slice(i, i + 4);
            this.debitos.push(row);
        }
    }

    get_venctoParc1() {
        this.vencto_parc1 = this.pdf.match(/Prazo para pagamento da primeira parcela: \s([\d]{2}\/[\d]{2}\/[\d]{4})/)[1];
    }

    get_vlrParc1() {
        this.vlr_parc1 = this.pdf.match(/Valor da primeira parcela : \sR\$ ([\d.,]+)/)[1];
    }

    get_vlrParcs() {
        this.vlr_parcs = this.pdf.match(/Valor das demais parcelas: \sR\$ ([\d.,]+)/)[1];
    }
}

function handleFile() {

    limparTabelas();

    const input = document.getElementById('inputFile');
    const file = input.files[0];

    if (file) {
        const fileReader = new FileReader();

        fileReader.onload = function () {
            const typedarray = new Uint8Array(this.result);

            extractTextFromPDF(typedarray);
        };

        fileReader.readAsArrayBuffer(file);
    }

    document.getElementById('gerarCSV').style.display = '';
}

function extractTextFromPDF(data) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

    const loadingTask = pdfjsLib.getDocument(data);

    loadingTask.promise.then(function(pdf) {
        const numPages = pdf.numPages;
        let pdfText = '';

        function handlePage(pageNumber) {
            return pdf.getPage(pageNumber).then(function (page) {
                return page.getTextContent();
            }).then(function (textContent) {
                textContent.items.forEach(function (item) {
                    pdfText += item.str + ' ';
                });
            });
        }

        const promises = [];
        for (let i = 1; i <= numPages; i++) {
            promises.push(handlePage(i));
        }

        Promise.all(promises).then(function () {
            displayText(pdfText);
        });

    }).catch(function(error) {
        console.error('Erro ao carregar o PDF:', error);
    });
}

function displayText(text) { 

    const parcelamento = new PARCELAMENTO_SIMPLES_NACIONAL_NORMAL(text);

    simplesnacional();

    function simplesnacional(){
        
        const infoEmpresa = document.getElementById('informacoesDaEmpresa').children[1].children;
        infoEmpresa[0].children[1].textContent = parcelamento.nomeEmpresarial;
        infoEmpresa[1].children[1].textContent = parcelamento.cnpj;

        const infoParcelamento = document.getElementById('informacoesDoParcelamento').children[1].children;
        infoParcelamento[0].children[1].textContent = 'R$ ' + parcelamento.valor_do_parcelamento;
        infoParcelamento[1].children[1].textContent = parcelamento.qts_parcelas;
        infoParcelamento[2].children[1].textContent = 'R$ ' + parcelamento.vlr_parc1;
        infoParcelamento[3].children[1].textContent = 'R$ ' + parcelamento.vlr_parcs;
        infoParcelamento[4].children[1].textContent = parcelamento.vencto_parc1;
        infoParcelamento[5].children[1].textContent = toReais(parcelamento.vlr_debito);
        infoParcelamento[6].children[1].textContent = toReais(parcelamento.juros);
        infoParcelamento[7].children[1].textContent = parcelamento.aquisicao;

        const descDesbitos = document.getElementById('descricaoDosDebitos');
        parcelamento.debitos.forEach((row) =>{
            let newRow = document.createElement('tr');
            row.forEach((cell) => {
                let newCell = document.createElement('td');
                newCell.textContent = cell;
                newRow.appendChild(newCell);
            });
            descDesbitos.children[1].appendChild(newRow);
        });

        document.getElementById('ParcelamentoSimplesNacional').style.display = 'block';

        carregarInformacoesDoParcelamento();
    }
}

function limparTabelas(){;
    const descDebitosTable = document.getElementById('descricaoDosDebitos');
    const linhas = Array.from(descDebitosTable.children[1].children);
    for (let index = linhas.length - 1; index > 0; index--){
        linhas[index].remove();
    }

    document.getElementById('compSaldoAtual').children[1].children[0].children[1].children[0].value = '';
    document.getElementById('compSaldoAtual').children[1].children[1].children[1].children[0].value = 0;
    let eventChange = new Event('change');
    document.getElementById('compSaldoAtual').children[1].children[1].children[1].children[0].dispatchEvent(eventChange);
}

function carregarInformacoesDoParcelamento(){
    const infoParcelamento = document.getElementById('informacoesDoParcelamento').children[1].children;

    const valor_parcelamento_text = String(infoParcelamento[0].children[1].innerHTML.replace(/[^0-9,.]/g, ''));
    const vlr_debito_text = String(infoParcelamento[5].children[1].innerHTML.replace(/[^0-9,.]/g, ''));
    const juros_text = String(infoParcelamento[6].children[1].innerHTML.replace(/[^0-9,.]/g, ''));
    const vencto_parc1 = String(infoParcelamento[4].children[1].innerHTML);
    const qts_parcelas_text = String(infoParcelamento[1].children[1].innerHTML);
    const vlr_parc1_text = String(infoParcelamento[2].children[1].innerHTML.replace(/[^0-9,.]/g, ''));
    const vlr_parcs_text = String(infoParcelamento[3].children[1].innerHTML.replace(/[^0-9,.]/g, ''));

    const parcelamento = {
        valor_do_parcelamento: parseFloat(valor_parcelamento_text.replace('.', '').replace(',', '.')),
        vlr_debito: parseFloat(vlr_debito_text.replace('.', '').replace(',', '.')),
        juros: parseFloat(juros_text.replace('.', '').replace(',', '.')),
        vencto_parc1: vencto_parc1,
        qts_parcelas: parseInt(qts_parcelas_text.replace('.', '').replace(',', '.')),
        vlr_parc1: parseFloat(vlr_parc1_text.replace('.', '').replace(',', '.')),
        vlr_parcs: parseFloat(vlr_parcs_text.replace('.', '').replace(',', '.'))
    }

    const infoContabeis = document.getElementById('informacoesContabeis').children[1].children;
    const ALIQUOTA_DEBITO = (parcelamento.vlr_debito / parcelamento.valor_do_parcelamento);
    const ALIQUOTA_JUROS = (parcelamento.juros / parcelamento.valor_do_parcelamento);

    let vlrDebitoCP;
    let vlrJurosCP;

    const INFO_CURTO_LONGO_PRAZO = informacoesDeCurtoLongoPrazo(parcelamento.vencto_parc1, parcelamento.qts_parcelas);
    if(INFO_CURTO_LONGO_PRAZO.temLP){
        vlrDebitoCP = (parcelamento.vlr_parc1 * ALIQUOTA_DEBITO) + (parcelamento.vlr_parcs * ALIQUOTA_DEBITO * (INFO_CURTO_LONGO_PRAZO.parcelasCP - 1));
        vlrJurosCP = (parcelamento.vlr_parc1 * ALIQUOTA_JUROS) + (parcelamento.vlr_parcs) * ALIQUOTA_JUROS * (INFO_CURTO_LONGO_PRAZO.parcelasCP - 1);
    }else{
        vlrDebitoCP = toReais(parcelamento.vlr_debito);
        vlrJurosCP = toReais(parcelamento.juros);
    }

    infoContabeis[0].children[1].textContent = INFO_CURTO_LONGO_PRAZO.emFormatoDeDataCP;
    infoContabeis[0].children[2].textContent = (INFO_CURTO_LONGO_PRAZO.temLP)? toReais(vlrDebitoCP + vlrJurosCP) : toReais(parcelamento.vlr_debito + parcelamento.juros);
    infoContabeis[1].children[1].textContent = INFO_CURTO_LONGO_PRAZO.parcelasCP + 'x';
    infoContabeis[1].children[2].textContent = toReais(vlrDebitoCP);
    infoContabeis[2].children[1].textContent = INFO_CURTO_LONGO_PRAZO.parcelasCP + 'x';
    infoContabeis[2].children[2].textContent = toReais(vlrJurosCP);

    let saldoParcelamentoLP = parcelamento.valor_do_parcelamento - vlrDebitoCP - vlrJurosCP;

    if(INFO_CURTO_LONGO_PRAZO.temLP){
        infoContabeis[3].children[1].textContent = INFO_CURTO_LONGO_PRAZO.emFormatoDeDataLP;
        infoContabeis[3].children[2].textContent = toReais(saldoParcelamentoLP);
        infoContabeis[4].children[1].textContent = INFO_CURTO_LONGO_PRAZO.parcelasLP + 'x';
        infoContabeis[4].children[2].textContent = toReais(saldoParcelamentoLP * ALIQUOTA_DEBITO);
        infoContabeis[5].children[1].textContent = INFO_CURTO_LONGO_PRAZO.parcelasLP + 'x';
        infoContabeis[5].children[2].textContent = toReais(saldoParcelamentoLP * ALIQUOTA_JUROS);
        infoContabeis[3].style.display = '';
        infoContabeis[4].style.display = '';
        infoContabeis[5].style.display = '';
    }else{
        infoContabeis[3].style.display = 'none';
        infoContabeis[4].style.display = 'none';
        infoContabeis[5].style.display = 'none';
    }

    carregarDetalhamentoDeParcelas(parcelamento.vlr_parc1, parcelamento.vlr_parcs, ALIQUOTA_DEBITO, ALIQUOTA_JUROS);
}

function carregarDetalhamentoDeParcelas(vlr_parc1, vlr_parcs, ALIQUOTA_DEBITO, ALIQUOTA_JUROS){
    const detParcelas = document.getElementById('detalhamentoParcelas').children[1].children;

    detParcelas[1].children[1].textContent = toReais(vlr_parc1);
    detParcelas[1].children[2].textContent = toReais(vlr_parc1 * ALIQUOTA_DEBITO);
    detParcelas[1].children[3].textContent = toReais(vlr_parc1 * ALIQUOTA_JUROS);

    detParcelas[2].children[1].textContent = toReais(vlr_parcs);
    detParcelas[2].children[2].textContent = toReais(vlr_parcs * ALIQUOTA_DEBITO);
    detParcelas[2].children[3].textContent = toReais(vlr_parcs * ALIQUOTA_JUROS);
}

function informacoesDeCurtoLongoPrazo(data, qts_parcelas){

    const DIA = 1;
  
    dataArray = data.split('/')
    let dataInicioParcelamento = new Date(parseInt(dataArray[2]), parseInt(dataArray[1]) - 1, DIA)
    let dataFinalCP = new Date(parseInt(dataArray[2]) + 1, 11, 31)
    let dataFinalLP = new Date(dataInicioParcelamento);
    dataFinalLP.setMonth(dataInicioParcelamento.getMonth() + parseInt(qts_parcelas) - 1)
  
    let dataCP = '';
    let dataLP = '';
    let parcelasCP = (dataFinalLP > dataFinalCP)? `${Math.round((dataFinalCP - dataInicioParcelamento) / (1000 * 60 * 60 * 24 * 30.44))}`: parseInt(qts_parcelas);
    let parcelasLP = 0;
    let temLP = false;
  
    let mesIncioCP = (dataInicioParcelamento.getMonth() + 1 < 10 )? `0${dataInicioParcelamento.getMonth() + 1}`: dataInicioParcelamento.getMonth() + 1;
    let mesFinalCP = '';
  
    if (dataFinalLP > dataFinalCP){
      mesFinalCP = (dataFinalCP.getMonth() + 1 < 10 )? `0${dataFinalCP.getMonth() + 1}`: dataFinalCP.getMonth() + 1;  
    }else{
      mesFinalCP = (dataFinalLP.getMonth() + 1 < 10 )? `0${dataFinalLP.getMonth() + 1}`: dataFinalLP.getMonth() + 1;
      dataFinalCP = dataFinalLP;
    }
  
    dataCP = `${mesIncioCP}/${dataInicioParcelamento.getFullYear()} - ${mesFinalCP}/${dataFinalCP.getFullYear()}`;
  
    if(parseInt(qts_parcelas) > parcelasCP){
      parcelasLP = qts_parcelas - parcelasCP;
      let mesFinalLP = (dataFinalLP.getMonth() + 1 < 10 )? `0${dataFinalLP.getMonth() + 1}`: dataFinalLP.getMonth() + 1;
      dataLP = `01/${dataFinalCP.getFullYear() + 1} - ${mesFinalLP}/${dataFinalLP.getFullYear()}`;
      temLP = true;
    }
  
    return {emFormatoDeDataCP: dataCP,
            parcelasCP: parcelasCP,
            emFormatoDeDataLP: dataLP,
            parcelasLP: parcelasLP,
            temLP: temLP
            }
}

function calucarParcelasRestantes(pagas, total){
    return total - pagas;
}

function composicaoDosSaldosAtuais(dataVencto1, dataSaldo, parcelasPagas, valorCP, valorLP, totalParcelas, valorParcela1, valorParcelas){
    valorCP = parseFloat(valorCP.replace(/[^0-9,.]/g, '').replace('.', '').replace(',', '.'));
    valorLP = parseFloat(valorLP.replace(/[^0-9,.]/g, '').replace('.', '').replace(',', '.'));
    valorParcela1 = parseFloat(valorParcela1.replace(/[^0-9,.]/g, '').replace('.', '').replace(',', '.'));
    valorParcelas = parseFloat(valorParcelas.replace(/[^0-9,.]/g, '').replace('.', '').replace(',', '.'));
    parcelasPagas = parseInt(parcelasPagas);
    totalParcelas = parseInt(totalParcelas);
  
    let parcelas = 1;
  
    dataVencto1 = dataVencto1.split('/');
    dataSaldo = dataSaldo.split('-');
  
    parcelas += (dataSaldo[0] > dataVencto1[2])? (dataSaldo[0] - dataVencto1[2]) * 12: 0;
    parcelas += dataSaldo[1] - dataVencto1[1]
    parcelas = (parcelas > totalParcelas)? totalParcelas: parcelas;

    const QUANTIDADE_DE_PARCELAS_ATE_O_FIM_DO_PRIMEIRO_ANO = 12 - (dataVencto1[1] - 1);

    if(parcelas > QUANTIDADE_DE_PARCELAS_ATE_O_FIM_DO_PRIMEIRO_ANO && !isNaN(valorLP)){
      if(valorLP >= (valorParcelas * 12)){
        valorCP += (valorParcelas * 12);
        valorLP -= (valorParcelas * 12);
      }else{
        valorCP += valorLP;
        valorLP = 0;
      }
    }

    while(!validacaoCP() && !isNaN(valorLP)){
      if (valorLP >= (valorParcelas * 12)){
        valorCP += (valorParcelas * 12);
        valorLP -= (valorParcelas * 12);
      }else{
        valorCP += valorLP;
        valorLP = 0;
        break;
      }
    }

    valorCP -= (parcelasPagas > 0) ? valorParcela1 + (valorParcelas * (parcelasPagas - 1)): 0;

    if(parcelasPagas > parcelas || parcelasPagas < 0){
        valorCP = 0;
        valorLP = 0;
    }

    function validacaoCP(){
      let CP = (Math.floor(((valorCP - valorParcela1) / valorParcelas) + 1) - QUANTIDADE_DE_PARCELAS_ATE_O_FIM_DO_PRIMEIRO_ANO) / 12;
      let diferenca = CP - ((parcelas-QUANTIDADE_DE_PARCELAS_ATE_O_FIM_DO_PRIMEIRO_ANO) / 12);
      return (diferenca < 1)? false: true;
    }
  
    return {
      valorCP: valorCP,
      parcelasCP: (parcelasPagas == 0) ? Math.floor((valorCP - valorParcela1) / valorParcelas) + 1: Math.floor(valorCP / valorParcelas),
      valorLP: valorLP,
      parcelasLP: Math.floor(valorLP / valorParcelas)
    }
}

function toReais(valor){
    const valorFormatado = valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    return valorFormatado;
}

function gerarCSV(){
    const overlay = document.getElementById('overlay');
    const tableCSV = document.getElementById('csvDeImportação').children[1];
    const listaDeDebitos = Array.from(document.getElementById('descricaoDosDebitos').children[1].children);
    let lancamentos = Array.from(tableCSV.children);

    limparCSV(lancamentos);

    overlay.style.display = 'flex';
    overlay.children[0].addEventListener('click', (event) => {
        event.stopPropagation();
    })

    overlay.addEventListener('click', () => {
        overlay.style.display = 'none';

        limparCSV(lancamentos);
    });

    const dataDoLancamento = document.getElementById('informacoesDoParcelamento').children[1].children[7].children[1].textContent;

    for(let i = 1; i < listaDeDebitos.length; i++){
        let newRow = document.createElement('tr');
        for(let j = 0; j < 5; j++){
            let newCell = document.createElement('td');
            if(j === 0){
                newCell.textContent = dataDoLancamento;
                newCell.contentEditable = true;
                newRow.appendChild(newCell);
            }else if (j === 1){
                newCell.textContent = `Transferencia do saldo devedor do SIMPLES ${listaDeDebitos[i].children[0].textContent.slice(0, 7)} Devido a Parcelamento`;
                newCell.contentEditable = true;
                newRow.appendChild(newCell);
            }else if (j === 2){
                newCell.textContent = listaDeDebitos[i].children[2].textContent;
                newCell.contentEditable = true;
                newRow.appendChild(newCell);
            }else if (j === 3){
                newCell.textContent = '2.01.01.03.07';
                newCell.contentEditable = true;
                newRow.appendChild(newCell);
            }
            else if (j === 4){
                newCell.textContent = '2.01.01.14.50';
                newCell.contentEditable = true;
                newRow.appendChild(newCell);
            }
        }
        tableCSV.appendChild(newRow);
    }

    for(let i = 0; i < 3; i++){
        let newRow = document.createElement('tr');
        if(i == 0){
            newRow.appendChild(criarNovaCelula(dataDoLancamento));
            newRow.appendChild(criarNovaCelula(`Juros totais do Parcelamento SIMPLES NACIONAL.`));
            newRow.appendChild(criarNovaCelula((document.getElementById('informacoesDoParcelamento').children[1].children[6].children[1].textContent).split('R$')[1].trim()));
            newRow.appendChild(criarNovaCelula('2.01.01.14.60'));
            newRow.appendChild(criarNovaCelula('2.01.01.14.50'));
        }
        else if(i == 1 && document.getElementById('informacoesContabeis').children[1].children[3].style.display != 'none'){
            newRow.appendChild(criarNovaCelula(dataDoLancamento));
            newRow.appendChild(criarNovaCelula(`Transferencia dos Juros para Longo Prazo de ${document.getElementById('informacoesContabeis').children[1].children[4].children[1].textContent.replace('x', '')} das ${document.getElementById('informacoesDoParcelamento').children[1].children[1].children[1].textContent} Parcelas do Parcelamento SIMPLES NACIONAL`));
            newRow.appendChild(criarNovaCelula(document.getElementById('informacoesContabeis').children[1].children[5].children[2].textContent.split('R$')[1].trim()));
            newRow.appendChild(criarNovaCelula('2.03.01.05.60'));
            newRow.appendChild(criarNovaCelula('2.01.01.14.60'));
        }
        else if(i == 2 && document.getElementById('informacoesContabeis').children[1].children[3].style.display != 'none'){
            newRow.appendChild(criarNovaCelula(dataDoLancamento));
            newRow.appendChild(criarNovaCelula(`Transferencia do Debito para Longo Prazo de ${document.getElementById('informacoesContabeis').children[1].children[4].children[1].textContent.replace('x', '')} das ${document.getElementById('informacoesDoParcelamento').children[1].children[1].children[1].textContent} Parcelas do Parcelamento SIMPLES NACIONAL`));
            newRow.appendChild(criarNovaCelula(document.getElementById('informacoesContabeis').children[1].children[3].children[2].textContent.split('R$')[1].trim()));
            newRow.appendChild(criarNovaCelula('2.01.01.14.50'));
            newRow.appendChild(criarNovaCelula('2.03.01.05.50'));
        }

        tableCSV.appendChild(newRow);
    }

    function criarNovaCelula(textContent){
        let newCell = document.createElement('td');

        newCell.textContent = textContent;
        newCell.contentEditable = true;
        return newCell;
    }

    function limparCSV(lancamentos){
        for(let i = 0; i < lancamentos.length; i++){
            lancamentos[i].remove();
        }
    }
}

function confirmarCSV(){
    let linhas = document.getElementById('csvDeImportação').children[1].querySelectorAll('tr');

    const dadosCSV = ['DATA;DESCRICAO;VALOR;CONTA_DEBITO;CONTA_CREDITO'];

    for(const linha of linhas){
        const colunas = linha.querySelectorAll('td');
        const linhaCSV = Array.from(colunas).map(coluna => coluna.textContent).join(';');
        dadosCSV.push(linhaCSV);
    }

    const conteudoCSV = dadosCSV.join('\n');
    const arquivoCSV = 'data:text/csv;charset=utf-8,' + encodeURIComponent(conteudoCSV);

    const linkDownload = document.createElement('a');
    linkDownload.href = arquivoCSV;
    linkDownload.target = '_blank';
    linkDownload.download = 'csvDeImportacao_ParcelamentoSN.csv';
    document.body.appendChild(linkDownload);
    linkDownload.click();
    document.body.removeChild(linkDownload);
}

function closeNotification(){
    document.getElementById('notification-modal').style.display = 'none';
}

document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('inputFile').click();
});

const compSaldoAtual = document.getElementById('compSaldoAtual').children[1].children;

compSaldoAtual[1].children[1].children[0].addEventListener('change', () => {

    if(compSaldoAtual[1].children[1].children[0].value < 0){
        document.getElementById('notification-mensage').innerHTML = "Error:<br>O número de parcelas pagas selecionado é menor que 0"
        document.getElementById('notification-modal').style.display = 'flex';
    }else{
        closeNotification()
    }

    compSaldoAtual[2].children[1].textContent = calucarParcelasRestantes(compSaldoAtual[1].children[1].children[0].value,
    document.getElementById('informacoesDoParcelamento').children[1].children[1].children[1].textContent);

    const saldos = composicaoDosSaldosAtuais(
        document.getElementById('informacoesDoParcelamento').children[1].children[4].children[1].textContent,
        compSaldoAtual[0].children[1].children[0].value,
        compSaldoAtual[1].children[1].children[0].value,
        document.getElementById('informacoesContabeis').children[1].children[0].children[2].textContent,
        document.getElementById('informacoesContabeis').children[1].children[3].children[2].textContent,
        document.getElementById('informacoesDoParcelamento').children[1].children[1].children[1].textContent,
        document.getElementById('informacoesDoParcelamento').children[1].children[2].children[1].textContent,
        document.getElementById('informacoesDoParcelamento').children[1].children[3].children[1].textContent
    )

    compSaldoAtual[3].children[1].textContent = (isNaN(saldos.parcelasCP))? '0x': saldos.parcelasCP + 'x';
    compSaldoAtual[3].children[2].textContent = toReais(saldos.valorCP);

    if(isNaN(saldos.valorLP) || saldos.valorLP == 0){
        compSaldoAtual[4].style.display = 'none'
    }else{
        compSaldoAtual[4].style.display = ''
        compSaldoAtual[4].children[1].textContent = saldos.parcelasLP + 'x';
        compSaldoAtual[4].children[2].textContent = toReais(saldos.valorLP);
    }
});