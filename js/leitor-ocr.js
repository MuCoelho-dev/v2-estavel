/* ===== VITALIS - leitura de arquivos (OCR + PDF) =====
   Tudo roda no próprio navegador, de graça e sem internet:
   - PDF com texto  -> pdf.js lê o texto direto do arquivo.
   - Foto ou PDF escaneado -> Tesseract.js (OCR) "lê" a imagem.
   As bibliotecas ficam em js/vendor/ e só são carregadas na primeira vez que um arquivo é anexado.
*/
const LeitorOCR = {
  _promessas: {},
  _worker: null,
  onProgresso: null, // função(texto, 0..1) chamada durante a leitura

  _avisar(texto, p) { if (this.onProgresso) this.onProgresso(texto, p); },

  // Carrega um .js de js/vendor/ só uma vez
  _script(src) {
    if (!this._promessas[src]) {
      this._promessas[src] = new Promise((ok, erro) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = ok;
        s.onerror = () => erro(new Error('Não foi possível carregar ' + src));
        document.head.appendChild(s);
      });
    }
    return this._promessas[src];
  },

  _bytes(b64) {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  },

  // Cria (uma única vez) o "trabalhador" do OCR com idioma português
  async _iniciarOCR() {
    if (this._worker) return this._worker;
    this._avisar('Preparando o leitor de texto (primeira vez demora um pouco)...', 0.05);
    await this._script('js/vendor/ocr-assets.js');
    await this._script('js/vendor/tesseract.min.js');

    // Monta um único script para o worker: núcleo do OCR + idioma português + código do worker.
    // Assim nada precisa ser baixado, nem da internet nem de arquivos locais (que o navegador bloqueia).
    const A = window.OCR_ASSETS;
    const idioma = `self.__LANG_B64="${A.lang}";
      const __bin = atob(self.__LANG_B64), __u8 = new Uint8Array(__bin.length);
      for (let i = 0; i < __bin.length; i++) __u8[i] = __bin.charCodeAt(i);
      const __fetchOriginal = self.fetch ? self.fetch.bind(self) : null;
      self.fetch = (url, ...resto) => /\\.traineddata/.test(String(url))
        ? Promise.resolve(new Response(__u8, { status: 200 }))
        : __fetchOriginal(url, ...resto);\n`;
    const blob = new Blob([this._bytes(A.core), '\n;\n', idioma, this._bytes(A.worker)],
                          { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    this._worker = await Tesseract.createWorker('por', 1, {
      workerPath: url,
      workerBlobURL: false,
      corePath: url,
      langPath: 'idioma-embutido',
      cacheMethod: 'none',
      logger: m => {
        if (m.status === 'recognizing text') this._avisar('Lendo o documento...', 0.3 + m.progress * 0.65);
      }
    });
    return this._worker;
  },

  // Lê o texto de uma imagem (File, canvas ou data URL)
  async lerImagem(origem) {
    const w = await this._iniciarOCR();
    const r = await w.recognize(origem);
    return r.data.text || '';
  },

  // Lê um PDF: usa o texto do próprio arquivo; páginas sem texto (escaneadas) passam pelo OCR
  async lerPDF(arquivo) {
    await this._script('js/vendor/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
    const dados = new Uint8Array(await arquivo.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: dados }).promise;
    const paginas = Math.min(pdf.numPages, 5); // para a demonstração, as 5 primeiras páginas bastam
    let texto = '', usouOCR = false;

    for (let n = 1; n <= paginas; n++) {
      this._avisar(`Lendo a página ${n} de ${paginas}...`, 0.1 + (n - 1) / paginas * 0.2);
      const pagina = await pdf.getPage(n);
      const conteudo = await pagina.getTextContent();
      // junta os pedaços de texto respeitando as quebras de linha do PDF
      let linha = '', y = null, doc = '';
      for (const it of conteudo.items) {
        const yi = it.transform[5];
        if (y !== null && Math.abs(yi - y) > 2) { doc += linha.trim() + '\n'; linha = ''; }
        linha += it.str + (it.hasEOL ? '\n' : ' ');
        y = yi;
      }
      doc += linha;
      if (doc.replace(/\s/g, '').length >= 40) {
        texto += doc + '\n';
      } else {
        // página escaneada: desenha em imagem e passa o OCR
        const vista = pagina.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = vista.width; canvas.height = vista.height;
        await pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vista }).promise;
        texto += (await this.lerImagem(canvas)) + '\n';
        usouOCR = true;
      }
    }
    return { texto, metodo: usouOCR ? 'PDF escaneado (OCR)' : 'Texto do PDF' };
  },

  // Ponto de entrada: recebe o File escolhido e devolve { texto, metodo }
  async ler(arquivo) {
    const ehPdf = arquivo.type === 'application/pdf' || /\.pdf$/i.test(arquivo.name);
    if (ehPdf) return this.lerPDF(arquivo);
    const url = URL.createObjectURL(arquivo);
    try {
      return { texto: await this.lerImagem(url), metodo: 'Foto (OCR)' };
    } finally { URL.revokeObjectURL(url); }
  }
};
