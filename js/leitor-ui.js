/* ===== VITALIS - leitura automática de documentos nos formulários =====
   Liga as peças: quando o usuário escolhe um arquivo no campo de anexo,
     1. leitor-ocr.js    lê o texto do PDF ou da foto;
     2. reconhecedor.js  descobre o tipo do documento e extrai os dados;
     3. este arquivo     mostra o resultado e preenche os campos do formulário.
   O usuário sempre pode corrigir os campos antes de salvar.
*/
const LeitorUI = {
  pendente: null,      // arquivo "levado" de uma tela para outra (ex.: de Consultas para Exames)
  _cache: {},          // texto já lido de cada arquivo, para não ler duas vezes
  _versao: 0,          // evita que uma leitura antiga sobrescreva uma mais nova

  _chave(f) { return f.name + '|' + f.size + '|' + f.lastModified; },

  // Chamado por telaFormulario() depois de desenhar o formulário
  ativar(modulo, registro) {
    const form = document.getElementById('form-registro');
    const entrada = form && form.querySelector('input[type=file]');
    if (!entrada) return;                       // telas sem anexo (ex.: Emergência)

    const painel = document.createElement('div');
    painel.className = 'leitor idle';
    painel.innerHTML = this._dica();
    form.insertBefore(painel, form.querySelector('.form-actions'));

    // se o usuário editar um campo preenchido automaticamente, ele deixa de ser "automático"
    form.addEventListener('input', e => {
      if (e.target.dataset && e.target.dataset.auto) {
        delete e.target.dataset.auto;
        e.target.classList.remove('auto-preenchido');
      }
    });

    entrada.addEventListener('change', () => {
      const arq = entrada.files[0];
      if (arq) this.processar(modulo, form, entrada, painel, arq);
      else { painel.className = 'leitor idle'; painel.innerHTML = this._dica(); }
    });

    // chegou aqui trazendo um arquivo de outra tela
    if (this.pendente) {
      const { arquivo } = this.pendente;
      this.pendente = null;
      try {
        const dt = new DataTransfer();
        dt.items.add(arquivo);
        entrada.files = dt.files;
        this.processar(modulo, form, entrada, painel, arquivo);
      } catch (e) { /* navegador sem DataTransfer: o usuário escolhe o arquivo de novo */ }
    }
  },

  _dica() {
    return `<span class="leitor-dica">💡 <b>Leitura automática:</b> ao escolher a foto ou o PDF, o Vitalis lê o documento,
      identifica o que ele é e já preenche os campos para você conferir.</span>`;
  },

  async processar(modulo, form, entrada, painel, arq) {
    const versao = ++this._versao;
    painel.className = 'leitor carregando';
    painel.innerHTML = `<div class="leitor-topo"><span class="spinner"></span>
      <div><b>Lendo o documento…</b><small id="leitor-status">Iniciando…</small></div></div>`;

    LeitorOCR.onProgresso = (texto) => {
      const s = document.getElementById('leitor-status');
      if (s && versao === this._versao) s.textContent = texto;
    };

    try {
      const chave = this._chave(arq);
      const lido = this._cache[chave] || (this._cache[chave] = await LeitorOCR.ler(arq));
      if (versao !== this._versao) return;      // o usuário escolheu outro arquivo nesse meio tempo
      const analise = Reconhecedor.analisar(lido.texto);
      this.mostrar(modulo, form, painel, arq, analise, lido, 0);
    } catch (erro) {
      if (versao !== this._versao) return;
      console.error(erro);
      painel.className = 'leitor erro';
      painel.innerHTML = `<div class="leitor-topo"><span class="leitor-ico">⚠️</span>
        <div><b>Não consegui ler este arquivo automaticamente.</b>
        <small>Você ainda pode preencher os campos à mão e salvar normalmente.</small></div></div>`;
    }
  },

  // Mostra o painel de resultado e (re)preenche os campos
  mostrar(modulo, form, painel, arq, a, lido, indiceMed) {
    if (a.vazio || !a.modulo && !a.valores.length && !a.data) {
      painel.className = 'leitor erro';
      painel.innerHTML = `<div class="leitor-topo"><span class="leitor-ico">🔍</span>
        <div><b>Não encontrei texto legível neste arquivo.</b>
        <small>Tente uma foto mais nítida, com boa luz e o documento reto. Os campos podem ser preenchidos à mão.</small></div></div>
        ${this._textoLido(lido.texto)}`;
      return;
    }

    const campos = Reconhecedor.paraModulo(modulo, a, indiceMed);
    const feitos = this.preencher(modulo, form, campos);
    // em Documentos (aba genérica), uma sugestão de baixa confiança para trocar de aba é só ruído: não mostra
    const modAlvo = a.modulo && a.modulo !== modulo && !(modulo === 'documentos' && a.confianca === 'baixa') ? a.modulo : null;
    const perfil = this._perfilDoDocumento(a);
    const fmt = (Reconhecedor.TIPOS[a.tipo] || {}).rotulo || a.rotulo;

    let html = `
      <div class="leitor-topo">
        <span class="leitor-ico">🔎</span>
        <div>
          <b>${a.modulo ? 'Documento reconhecido: ' + esc(fmt) : 'Li o documento, mas não identifiquei o tipo'}</b>
          ${a.modulo ? `<span class="badge ${a.confianca === 'alta' ? '' : a.confianca === 'média' ? 'yellow' : 'gray'}">Confiança ${esc(a.confianca)}</span>` : ''}
          <small>Lido por: ${esc(lido.metodo)}${a.evidencias.length ? ' · identifiquei pelas palavras: ' + esc(a.evidencias.slice(0, 6).join(', ')) : ''}</small>
        </div>
      </div>`;

    if (modAlvo) {
      const nomeMod = MODULOS[modAlvo].menu;
      html += `<div class="leitor-aviso"><span>📌 Este documento parece ser de <b>${esc(nomeMod)}</b>, mas você está em <b>${esc(MODULOS[modulo].menu)}</b>.</span>
        <button type="button" class="btn btn-sm" data-ir="${modAlvo}">Cadastrar em ${esc(nomeMod)}</button></div>`;
    }

    if (perfil.mensagem) html += `<div class="leitor-aviso ${perfil.alerta ? 'alerta' : 'ok'}"><span>${perfil.mensagem}</span>${
      perfil.trocarPara ? `<button type="button" class="btn btn-sm" data-perfil="${perfil.trocarPara.id}">Usar o perfil de ${esc(perfil.trocarPara.nome.split(' ')[0])}</button>` : ''}</div>`;

    if (feitos.preenchidos.length) {
      html += `<div class="leitor-linha"><b>Preenchi automaticamente:</b> ${feitos.preenchidos.map(n => `<span class="chip">${esc(n)}</span>`).join('')}</div>`;
    } else {
      html += `<div class="leitor-linha">Não encontrei dados suficientes para preencher os campos desta tela.</div>`;
    }
    if (feitos.mantidos.length) {
      html += `<div class="leitor-linha muted">Mantive o que você já tinha digitado em: ${feitos.mantidos.map(esc).join(', ')}.</div>`;
    }

    // vários medicamentos na mesma receita: o usuário escolhe qual cadastrar agora
    if (modulo === 'medicamentos' && a.medicamentos && a.medicamentos.length > 1) {
      html += `<div class="leitor-linha"><b>Esta receita tem ${a.medicamentos.length} medicamentos.</b> Escolha qual cadastrar agora:
        ${a.medicamentos.map((m, i) => `<button type="button" class="chip chip-btn ${i === indiceMed ? 'sel' : ''}" data-med="${i}">${esc(m.nome)} ${esc(m.dosagem)}</button>`).join('')}
        <small class="muted"> (depois é só salvar e repetir o anexo para o próximo)</small></div>`;
    }

    // carteirinha com várias vacinas: o usuário escolhe qual cadastrar agora (mesmo mecanismo das receitas)
    if (modulo === 'vacinas' && a.vacinas_lista && a.vacinas_lista.length > 1) {
      html += `<div class="leitor-linha"><b>Esta carteirinha tem ${a.vacinas_lista.length} vacinas.</b> Escolha qual cadastrar agora:
        ${a.vacinas_lista.map((v, i) => `<button type="button" class="chip chip-btn ${i === indiceMed ? 'sel' : ''}" data-med="${i}">${esc(v.nome)} (${dataBR(v.data)})</button>`).join('')}
        <small class="muted"> (depois é só salvar e repetir o anexo para a próxima)</small></div>`;
    }

    if (a.valores && a.valores.length) {
      html += `<div class="leitor-linha"><b>Valores encontrados no exame:</b><div class="valores">${a.valores.map(v => `
        <span class="chip ${v.situacao || ''}" title="${v.ref ? 'Referência do próprio documento: ' + esc(v.ref) : ''}">
          ${esc(v.nome)}: <b>${esc(v.valor)}</b> ${esc(v.unidade)}${v.situacao === 'acima' ? ' ▲' : v.situacao === 'abaixo' ? ' ▼' : ''}</span>`).join('')}</div>
        ${a.valores.some(v => v.ref) ? '<small class="muted">▲ ▼ = fora do valor de referência impresso no próprio documento.</small>' : ''}</div>`;
    }

    html += `<p class="help">Confira os dados: a leitura é automática e pode errar, principalmente em fotos tremidas.</p>
      ${this._textoLido(lido.texto)}`;

    painel.className = 'leitor pronto';
    painel.innerHTML = html;

    // botões do painel
    painel.querySelectorAll('[data-med]').forEach(b => b.addEventListener('click',
      () => this.mostrar(modulo, form, painel, arq, a, lido, Number(b.dataset.med))));
    painel.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', () => {
      this.pendente = { arquivo: arq };
      location.hash = '#' + b.dataset.ir + '/novo';
    }));
    painel.querySelectorAll('[data-perfil]').forEach(b => b.addEventListener('click', () => {
      this.pendente = { arquivo: arq };
      trocarPerfil(Number(b.dataset.perfil), location.hash);
    }));
  },

  _textoLido(texto) {
    return `<details class="leitor-texto"><summary>Ver o texto que o sistema leu no arquivo</summary>
      <pre>${esc(texto.trim() || '(nenhum texto)')}</pre></details>`;
  },

  // Compara o nome do paciente impresso no documento com a conta e os dependentes
  _perfilDoDocumento(a) {
    if (!a.paciente) return {};
    const u = Vitalis.usuarioLogado();
    const ativo = Vitalis.perfilAtivo();
    const candidatos = [{ id: 0, nome: u.nome }, ...Vitalis.listarDependentes().map(d => ({ id: d.id, nome: d.nome }))];
    const toks = t => Reconhecedor.norm(t).split(/\s+/).filter(x => x.length >= 3);
    const doc = toks(a.paciente);
    let melhor = null, pts = 0;
    candidatos.forEach(c => {
      const t = toks(c.nome);
      const comuns = t.filter(x => doc.includes(x)).length;
      const ok = t.length && t[0] === doc[0] && (comuns >= 2 || t.length === 1);
      if (ok && comuns > pts) { pts = comuns; melhor = c; }
    });
    const idAtivo = ativo.dep ? ativo.dep.id : 0;
    const nomeDoc = `<b>${esc(a.paciente)}</b>`;
    if (!melhor) {
      // Conta de demonstração (Quarteto Fatec), no próprio perfil: aceita qualquer nome, para os documentos de exemplo
      const demo = u.email === Vitalis.usuarioDemo.email && !ativo.dep;
      if (demo) return { mensagem: `👤 Nome do paciente no documento: ${nomeDoc}.` };
      return {
        alerta: true,
        mensagem: `⚠️ Este documento está em nome de ${nomeDoc}, que não é o perfil ativo (<b>${esc(ativo.nome)}</b>) nem outro perfil cadastrado. Confira se ele pertence a este paciente antes de salvar.`
      };
    }
    if (melhor.id === idAtivo) return { mensagem: `✅ O nome no documento (${nomeDoc}) confere com o perfil ativo.` };
    return {
      alerta: true, trocarPara: melhor,
      mensagem: `⚠️ Este documento está em nome de ${nomeDoc}, mas o perfil ativo é <b>${esc(ativo.nome)}</b>.`
    };
  },

  // Preenche os campos do formulário. Nunca apaga o que o usuário digitou.
  preencher(modulo, form, valores) {
    const rotulo = nome => ((MODULOS[modulo].campos.find(c => c.nome === nome)) || {}).label || nome;
    const preenchidos = [], mantidos = [];

    // limpa o que foi preenchido automaticamente numa leitura anterior
    form.querySelectorAll('[data-auto]').forEach(el => {
      el.value = el.tagName === 'SELECT' ? el.options[0].value : '';
      delete el.dataset.auto;
      el.classList.remove('auto-preenchido');
    });

    for (const [nome, valor] of Object.entries(valores)) {
      const el = form.elements[nome];
      if (!el || el.type === 'file') continue;
      if (el.tagName === 'SELECT') {
        const opc = [...el.options].find(o => Reconhecedor.norm(o.value) === Reconhecedor.norm(valor));
        if (!opc) continue;
        el.value = opc.value;
      } else {
        if (el.value.trim() !== '') { mantidos.push(rotulo(nome)); continue; }
        el.value = valor;
      }
      el.dataset.auto = '1';
      el.classList.add('auto-preenchido');
      preenchidos.push(rotulo(nome).replace(/ \*$/, ''));
    }
    return { preenchidos, mantidos };
  }
};
