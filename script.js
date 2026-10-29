// Apenas o código de identificação da planilha
const SHEET_ID = "1QDUCLr8tZzTbxc1dwSf0Pl-0U7MjGyu7IzCgq95za1o";
const NOME_ABA = "Cadastro";

// Plus Code completo da Portaria para o retorno
const PLUS_CODE_PORTARIA = "5WM6+7H São Pedro da Aldeia, RJ";

let baseEnderecos = [];
let filaEntregas = [];

// Carrega os dados da aba Cadastro assim que abre o sistema
async function carregarPlanilha() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(NOME_ABA)}`;

  try {
    const resposta = await fetch(url);
    const texto = await resposta.text();
    const jsonString = texto.substring(
      texto.indexOf("{"),
      texto.lastIndexOf("}") + 1,
    );
    const dados = JSON.parse(jsonString);

    // Colunas na aba Cadastro:
    // A (0): LOTE | B (1): UNIDADE | C (2): RUA | D (3): MORADOR (Ignorado) | E (4): PLUS CODE (COMPLETO)
    baseEnderecos = dados.table.rows
      .map((linha) => {
        return {
          lote:
            linha.c[0]?.v !== null && linha.c[0]?.v !== undefined
              ? String(linha.c[0].v).trim()
              : "",
          unidade:
            linha.c[1]?.v !== null && linha.c[1]?.v !== undefined
              ? String(linha.c[1].v).trim()
              : "",
          rua: linha.c[2]?.v ? Number(linha.c[2].v) : 0,
          plusCode: linha.c[4]?.v ? String(linha.c[4].v).trim() : "",
        };
      })
      .filter((item) => item.lote !== "" && item.plusCode !== "");
  } catch (erro) {
    mostrarErro("Erro ao conectar com a planilha. Verifique a conexão.");
  }
}

function buscarCasa(loteDigitado, unidadeDigitada) {
  const loteLimpo = String(Number(loteDigitado));
  const unidLimpa = String(Number(unidadeDigitada));

  return baseEnderecos.find(
    (item) =>
      String(Number(item.lote)) === loteLimpo &&
      String(Number(item.unidade)) === unidLimpa,
  );
}

// Validação instantânea ao digitar Lote e Unidade
function validarEmTempoReal() {
  esconderErro();
  const lote = document.getElementById("lote").value.trim();
  const unidade = document.getElementById("unidade").value.trim();
  const statusRua = document.getElementById("status-rua");

  if (!lote || !unidade) {
    statusRua.textContent = "--";
    statusRua.className = "rua-display";
    return null;
  }

  const encontrado = buscarCasa(lote, unidade);

  if (encontrado) {
    statusRua.textContent = `Rua ${encontrado.rua}`;
    statusRua.className = "rua-display valido";
    return encontrado;
  } else {
    statusRua.textContent = "Não cad.";
    statusRua.className = "rua-display invalido";
    return null;
  }
}

function adicionarNaFila() {
  const casa = validarEmTempoReal();

  if (!casa) {
    mostrarErro(
      "Endereço não encontrado no cadastro. Verifique Lote e Unidade.",
    );
    return;
  }

  const jaExiste = filaEntregas.some(
    (item) => item.lote === casa.lote && item.unidade === casa.unidade,
  );
  if (jaExiste) {
    mostrarErro("Este endereço já foi adicionado na lista.");
    return;
  }

  filaEntregas.push(casa);
  atualizarInterfaceFila();

  // Limpa os campos para digitar o próximo pacote
  document.getElementById("lote").value = "";
  document.getElementById("unidade").value = "";
  document.getElementById("status-rua").textContent = "--";
  document.getElementById("status-rua").className = "rua-display";
  document.getElementById("lote").focus();
  document.getElementById("resultado").style.display = "none";
}

function removerDaFila(index) {
  filaEntregas.splice(index, 1);
  atualizarInterfaceFila();
  document.getElementById("resultado").style.display = "none";
}

function limparFila() {
  filaEntregas = [];
  atualizarInterfaceFila();
  document.getElementById("resultado").style.display = "none";
}

function atualizarInterfaceFila() {
  const container = document.getElementById("fila-container");
  const lista = document.getElementById("lista-fila");
  const contador = document.getElementById("contador-fila");
  const btnLocalizar = document.getElementById("btn-localizar");

  lista.innerHTML = "";
  contador.textContent = filaEntregas.length;

  if (filaEntregas.length === 0) {
    container.style.display = "none";
    btnLocalizar.textContent = "Localizar Endereço";
    return;
  }

  container.style.display = "block";
  btnLocalizar.textContent =
    filaEntregas.length === 1
      ? "Gerar Rota (1 Endereço)"
      : `Finalizar e Gerar Rotas (${filaEntregas.length} Endereços)`;

  filaEntregas.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "item-fila";
    li.innerHTML = `
            <span><strong>Rua ${item.rua}</strong> - Lote ${item.lote}, Unid. ${item.unidade}</span>
            <button class="btn-remover" onclick="removerDaFila(${index})" title="Remover">&times;</button>
        `;
    lista.appendChild(li);
  });
}

function processarRotas() {
  esconderErro();

  let listaFinal = [...filaEntregas];

  // Se houver um endereço válido preenchido nos campos que ainda não entrou na fila, inclui automaticamente
  const casaAtual = validarEmTempoReal();
  if (casaAtual) {
    const jaExiste = listaFinal.some(
      (item) =>
        item.lote === casaAtual.lote && item.unidade === casaAtual.unidade,
    );
    if (!jaExiste) {
      listaFinal.push(casaAtual);
    }
  }

  if (listaFinal.length === 0) {
    mostrarErro("Digite um Lote e Unidade válidos antes de localizar.");
    return;
  }

  const divResultado = document.getElementById("resultado");
  const areaUnica = document.getElementById("area-unica");
  const areaMultipla = document.getElementById("area-multipla");

  divResultado.style.display = "block";

  // CASO 1: Apenas 1 endereço (Vai na casa e volta pra Portaria + QR Code)
  if (listaFinal.length === 1) {
    areaUnica.style.display = "block";
    areaMultipla.style.display = "none";

    const destinoCasa = encodeURIComponent(listaFinal[0].plusCode);
    const destinoPortaria = encodeURIComponent(PLUS_CODE_PORTARIA);

    const urlMaps = `https://www.google.com/maps/dir/?api=1&waypoints=${destinoCasa}&destination=${destinoPortaria}&travelmode=driving`;

    const containerQr = document.getElementById("qrcode");
    containerQr.innerHTML = "";
    new QRCode(containerQr, {
      text: urlMaps,
      width: 180,
      height: 180,
    });

    document.getElementById("link-maps-unico").href = urlMaps;
  }
  // CASO 2: Múltiplos endereços (Ordena por Rua/Lote, fatia de 10 em 10 e separa botão da Portaria)
  else {
    areaUnica.style.display = "none";
    areaMultipla.style.display = "block";

    // Ordena primeiro por Rua (crescente) e depois por Lote (crescente)
    listaFinal.sort((a, b) => {
      if (a.rua !== b.rua) return a.rua - b.rua;
      return Number(a.lote) - Number(b.lote);
    });

    const containerBotoes = document.getElementById("botoes-rotas");
    containerBotoes.innerHTML = "";

    const tamanhoBloco = 10;
    for (let i = 0; i < listaFinal.length; i += tamanhoBloco) {
      const bloco = listaFinal.slice(i, i + tamanhoBloco);
      const numRota = Math.floor(i / tamanhoBloco) + 1;
      const inicio = i + 1;
      const fim = i + bloco.length;

      const ultimoPonto = encodeURIComponent(bloco[bloco.length - 1].plusCode);
      let urlBloco = "";

      if (bloco.length === 1) {
        urlBloco = `https://www.google.com/maps/dir/?api=1&destination=${ultimoPonto}&travelmode=driving`;
      } else {
        const paradasIntermediarias = bloco
          .slice(0, -1)
          .map((item) => encodeURIComponent(item.plusCode))
          .join("|");
        urlBloco = `https://www.google.com/maps/dir/?api=1&waypoints=${paradasIntermediarias}&destination=${ultimoPonto}&travelmode=driving`;
      }

      const btn = document.createElement("a");
      btn.href = urlBloco;
      btn.target = "_blank";
      btn.className = "btn-maps";
      btn.textContent =
        listaFinal.length > 10
          ? `Iniciar Rota ${numRota} (Endereços ${inicio} a ${fim})`
          : `Iniciar Rota (${bloco.length} Endereços)`;

      containerBotoes.appendChild(btn);
    }

    // Configura o botão isolado de retorno para a Portaria
    const urlRetornoPortaria = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(PLUS_CODE_PORTARIA)}&travelmode=driving`;
    document.getElementById("btn-rota-portaria").href = urlRetornoPortaria;
  }
}

function mostrarErro(msg) {
  const divErro = document.getElementById("erro");
  divErro.textContent = msg;
  divErro.style.display = "block";
}

function esconderErro() {
  document.getElementById("erro").style.display = "none";
}

window.onload = carregarPlanilha;
