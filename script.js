const PREFIXO_GLOBAL = "589V";
const PLUS_CODE_PORTARIA = "5WM6+7H";
const URL_PLANILHA =
  "https://docs.google.com/spreadsheets/d/1QDUCLr8tZzTbxc1dwSf0Pl-0U7MjGyu7IzCgq95za1o/gviz/tq?tqx=out:json";

let baseEnderecos = {};
let dadosCarregados = false;

const btnBuscar = document.getElementById("btnBuscar");
const inputLote = document.getElementById("lote");
const inputUnidade = document.getElementById("unidade");
const divResultado = document.getElementById("resultado");
const divErro = document.getElementById("msgErro");
const divQrCode = document.getElementById("qrcode");

async function carregarPlanilha() {
  btnBuscar.textContent = "Sincronizando base...";
  btnBuscar.disabled = true;

  try {
    const resposta = await fetch(URL_PLANILHA);
    const texto = await resposta.text();

    const jsonLimpo = texto.substring(47).slice(0, -2);
    const dados = JSON.parse(jsonLimpo);
    const linhas = dados.table.rows;

    linhas.forEach((linha) => {
      const c = linha.c;
      if (!c || !c[0] || c[0].v === null) return;

      const lote = parseInt(c[0].v, 10);
      const unidade = c[1] && c[1].v !== null ? parseInt(c[1].v, 10) : 0;

      if (isNaN(lote)) return;

      const rua = c[2] && c[2].v !== null ? c[2].v : "";
      const plusCode = c[3] && c[3].v !== null ? String(c[3].v).trim() : "";

      if (plusCode) {
        const chave = `${lote}-${unidade}`;
        baseEnderecos[chave] = {
          plusCode: plusCode,
          rua: rua,
          ref: `Lote ${lote}, Unid. ${unidade} (Rua ${rua})`,
        };
      }
    });

    dadosCarregados = true;
    btnBuscar.textContent = "Localizar Endereço";
    btnBuscar.disabled = false;
  } catch (erro) {
    mostrarErro(
      "Erro ao ler a planilha. Verifique a conexão ou o compartilhamento.",
    );
    btnBuscar.textContent = "Erro na Base";
  }
}

function buscarRota() {
  if (!dadosCarregados) return;

  const lote = parseInt(inputLote.value.trim(), 10);
  // Se a unidade ficar em branco (casa única no lote), assume 0 automaticamente
  const valorUnidade = inputUnidade.value.trim();
  const unidade = valorUnidade === "" ? 0 : parseInt(valorUnidade, 10);

  if (isNaN(lote) || isNaN(unidade)) {
    mostrarErro("Preencha o Lote corretamente.");
    return;
  }

  const chaveBusca = `${lote}-${unidade}`;
  const dados = baseEnderecos[chaveBusca];

  if (dados) {
    divErro.style.display = "none";
    divResultado.style.display = "block";

    document.getElementById("infoRua").textContent =
      `${dados.ref} ➔ Saída (${PLUS_CODE_PORTARIA})`;
    document.getElementById("textoPlusCode").textContent = dados.plusCode;

    const paradaCasa = encodeURIComponent(`${PREFIXO_GLOBAL}${dados.plusCode}`);
    const destinoSaida = encodeURIComponent(
      `${PREFIXO_GLOBAL}${PLUS_CODE_PORTARIA}`,
    );

    const urlMaps = `https://www.google.com/maps/dir/?api=1&waypoints=${paradaCasa}&destination=${destinoSaida}&travelmode=driving`;

    document.getElementById("linkMaps").href = urlMaps;

    divQrCode.innerHTML = "";
    new QRCode(divQrCode, {
      text: urlMaps,
      width: 170,
      height: 170,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M,
    });
  } else {
    mostrarErro("Combinação de Lote e Unidade não cadastrada na planilha.");
  }
}

function mostrarErro(mensagem) {
  divResultado.style.display = "none";
  divErro.textContent = mensagem;
  divErro.style.display = "block";
}

btnBuscar.addEventListener("click", buscarRota);

[inputLote, inputUnidade].forEach((campo) => {
  campo.addEventListener("keypress", (e) => {
    if (e.key === "Enter") buscarRota();
  });
});

carregarPlanilha();
