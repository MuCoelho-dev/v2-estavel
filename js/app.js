/* ===== VITALIS - telas do sistema =====
   A navegação usa o endereço depois do "#":
     #inicio, #perfil, #consultas, #consultas/novo, #consultas/editar/105 ...
*/
const usuario = Vitalis.usuarioLogado();
if (!usuario) location.href = 'index.html';

const conteudo = document.getElementById('conteudo');
let mensagem = ''; // mensagem de sucesso exibida uma vez após salvar

// Protege textos digitados pelo usuário antes de colocar no HTML
function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Menu lateral ----------
const MENU = [
  { rota: 'inicio', nome: 'Início', icone: '🏠' },
  { rota: 'perfil', nome: 'Meu perfil', icone: '👤' },
  { rota: 'dependentes', nome: 'Dependentes', icone: '👨‍👩‍👧' },
  ...Object.entries(MODULOS).map(([rota, m]) => ({ rota, nome: m.menu, icone: m.icone }))
];

function desenharMenu(atual) {
  document.getElementById('menu').innerHTML = MENU.map(i => `
    <li><a href="#${i.rota}" class="${i.rota === atual ? 'active' : ''}">
      <span class="ico">${i.icone}</span>${i.nome}
    </a></li>`).join('');
  desenharSeletorPerfil(); // seletor "Perfil ativo" (dependentes.js)
}

// ---------- Roteador ----------
function navegar() {
  const [rota, acao, id] = (location.hash.slice(1) || 'inicio').split('/');
  desenharMenu(rota);
  window.scrollTo(0, 0);

  if (rota === 'inicio') telaInicio();
  else if (rota === 'perfil') telaPerfil();
  else if (rota === 'dependentes') telaDependentes(acao, Number(id));
  else if (MODULOS[rota] && acao === 'novo') telaFormulario(rota);
  else if (MODULOS[rota] && acao === 'editar') telaFormulario(rota, Number(id));
  else if (MODULOS[rota]) telaLista(rota);
  else location.hash = '#inicio';

  mensagem = '';
}
window.addEventListener('hashchange', navegar);

function cabecalho(titulo, subtitulo, direita = '') {
  return `
    <div class="page-head">
      <div><h1>${titulo}</h1><p>${subtitulo}</p></div>
      ${direita}
    </div>
    ${mensagem ? `<p class="flash">${esc(mensagem)}</p>` : ''}
    ${avisoPerfilAtivo()}`;
}

// ---------- Início (dashboard) ----------
function telaInicio() {
  const u = Vitalis.usuarioLogado();
  const consultas = Vitalis.listar('consultas');
  const exames = Vitalis.listar('exames');
  const meds = Vitalis.listar('medicamentos');
  const vacinas = Vitalis.listar('vacinas');
  const alergias = Vitalis.listar('alergias');
  const docs = Vitalis.listar('documentos');

  const ultimasConsultas = consultas.slice()
    .sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 3);
  const ultimosExames = exames.slice().sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 3);
  const ativos = meds.filter(m => m.status === 'Ativo').slice(0, 3);

  const stat = (nome, qtd, ico) => `
    <div class="stat"><div><span>${nome}</span><strong>${qtd}</strong></div><div class="ico-box">${ico}</div></div>`;

  const lista = (itens, vazio, linha) => itens.length
    ? `<div class="mini-list">${itens.map(linha).join('')}</div>`
    : `<p class="empty-line">${vazio}</p>`;

  const hist = (ico, nome, qtd, palavra) => `
    <div class="hist-item"><div class="ico-box">${ico}</div>
      <div><b>${nome}</b><small>${qtd} ${palavra}(s)</small></div></div>`;

  conteudo.innerHTML = `
    ${cabecalho(Vitalis.perfilAtivo().dep ? `Saúde de ${esc(Vitalis.perfilAtivo().nome)} 👨‍👩‍👧` : `Olá, ${esc(u.nome)}! 👋`,
      Vitalis.perfilAtivo().dep ? 'Resumo do histórico de saúde deste dependente.' : 'Bem-vindo ao seu espaço de saúde pessoal.',
      `<div class="user-chip"><div class="avatar-sm">${esc(u.nome[0].toUpperCase())}</div>${esc(u.nome)}</div>`)}

    <div class="stats">
      ${stat('Consultas', consultas.length, '📅')}
      ${stat('Exames', exames.length, '🧪')}
      ${stat('Medicamentos', meds.length, '💊')}
      ${stat('Vacinas', vacinas.length, '💉')}
    </div>

    <div class="dash-grid">
      <div class="panel">
        <div class="panel-head"><h2>📅 Últimas consultas</h2><a href="#consultas">Ver todas</a></div>
        ${lista(ultimasConsultas, 'Nenhuma consulta registrada.', c => `
          <div class="mini"><div><b>${esc(c.especialidade)}</b><small>${esc(c.medico || '')}</small></div>
          <small>${dataBR(c.data)}${c.anexo ? ' · 📎' : ''}</small></div>`)}
      </div>
      <div class="panel">
        <div class="panel-head"><h2>🧪 Últimos exames</h2><a href="#exames">Ver todos</a></div>
        ${lista(ultimosExames, 'Nenhum exame cadastrado.', e => `
          <div class="mini"><div><b>${esc(e.nome)}</b><small>${esc(e.tipo || '')}</small></div>
          <small>${dataBR(e.data)}</small></div>`)}
      </div>
      <div class="panel tall">
        <div class="panel-head"><h2>💊 Medicamentos ativos</h2><a href="#medicamentos">Ver todos</a></div>
        ${lista(ativos, 'Nenhum medicamento ativo.', m => `
          <div class="mini"><div><b>${esc(m.nome)}</b><small>${esc(m.dosagem || '')}</small></div>
          <small>${esc(m.frequencia || '')}</small></div>`)}
      </div>
      <div class="panel tall">
        <div class="panel-head"><h2>❤️ Meu histórico</h2></div>
        ${hist('⚠️', 'Alergias', alergias.length, 'registro')}
        ${hist('📄', 'Documentos', docs.length, 'documento')}
        ${hist('💉', 'Vacinas', vacinas.length, 'registro')}
      </div>
    </div>`;
}

// ---------- Meu perfil ----------
function telaPerfil() {
  const u = Vitalis.usuarioLogado();
  conteudo.innerHTML = `
    ${cabecalho('Meu perfil', 'Visualize e atualize suas informações pessoais.')}
    <div class="profile-grid">
      <div class="card profile-side">
        <div class="avatar-lg">${esc(u.nome[0].toUpperCase())}</div>
        <h2>${esc(u.nome)}</h2>
        <p class="mail">${esc(u.email)}</p>
        <span class="pill">Paciente</span>
        <div class="body-info">
          <div><b>${u.idade ? esc(u.idade) : '--'}</b><small>anos</small></div>
          <div><b>${u.peso ? esc(String(u.peso).replace('.', ',')) : '--'}</b><small>kg</small></div>
        </div>
        <div class="created"><b>Conta criada em:</b>${dataBR(u.criadoEm)}</div>
      </div>
      <div class="card profile-form">
        <h2>Informações pessoais</h2>
        <form id="form-perfil">
          <div class="field"><label>Nome completo</label>
            <input name="nome" value="${esc(u.nome)}" required></div>
          <div class="field"><label>E-mail</label>
            <input value="${esc(u.email)}" readonly></div>
          <div class="field"><label>Telefone</label>
            <input name="telefone" type="tel" value="${esc(u.telefone)}" placeholder="Digite seu telefone"></div>
          <div class="grid-2">
            <div class="field"><label>Idade</label>
              <input name="idade" type="number" min="0" max="130" value="${esc(u.idade)}" placeholder="Ex.: 25"></div>
            <div class="field"><label>Peso (kg)</label>
              <input name="peso" type="number" min="0" max="400" step="0.1" value="${esc(u.peso)}" placeholder="Ex.: 70,5"></div>
          </div>
          <div class="form-actions">
            <button class="btn btn-lg" type="submit">Salvar alterações</button>
            <a class="btn btn-lg btn-light" href="#inicio">Voltar</a>
          </div>
        </form>
        <div class="notice" style="margin:27px 0 0">
          💡 <b>Sobre o perfil</b><br>
          Seus dados pessoais podem ser atualizados sempre que necessário. O e-mail utilizado no cadastro não pode ser alterado nesta tela.
        </div>
      </div>
    </div>`;

  document.getElementById('form-perfil').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    Vitalis.atualizarUsuario({
      nome: f.nome.value.trim(), telefone: f.telefone.value.trim(),
      idade: f.idade.value.trim(), peso: f.peso.value.trim()
    });
    mensagem = 'Perfil atualizado com sucesso!';
    navegar();
  });
}

// ---------- Listagens (consultas, exames, ...) ----------
function telaLista(tipo) {
  const m = MODULOS[tipo];
  const registros = Vitalis.listar(tipo);
  const novo = `#${tipo}/novo`;

  let corpo;
  if (!registros.length) {
    corpo = `
      <div class="empty">
        <div class="big-ico ${m.vazio.caixa ? 'boxed' : ''}">${m.icone}</div>
        <h3>${m.vazio.titulo}</h3>
        <p>${m.vazio.texto}</p>
        <a class="btn btn-lg" href="${novo}">${m.vazio.botao}</a>
      </div>`;
  } else {
    const campoArquivo = m.campos.find(c => c.tipo === 'file');
    corpo = `<div class="items">${registros.map(r => {
      const it = m.item(r);
      const arq = campoArquivo && r[campoArquivo.nome];
      const ehImagem = arq && arq.conteudo && arq.conteudo.startsWith('data:image');
      return `
        <div class="item">
          ${ehImagem
            ? `<img class="thumb" src="${arq.conteudo}" alt="" onclick="verAnexo('${tipo}', ${r.id})">`
            : `<div class="ico-box">${arq ? '📎' : m.icone}</div>`}
          <div class="item-body">
            <b>${esc(it.titulo)}</b>${it.badge ? `<span class="badge ${it.badgeCor || ''}">${esc(it.badge)}</span>` : ''}
            <div class="item-meta">${it.meta.filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}${arq && !it.meta.some(x => x && x.includes(arq.nome)) ? `<span>📎 ${esc(arq.nome)}</span>` : ''}</div>
            ${it.obs ? `<div class="item-obs">${esc(it.obs)}</div>` : ''}
          </div>
          <div class="item-actions">
            ${arq && arq.conteudo ? `<button class="btn btn-sm" onclick="verAnexo('${tipo}', ${r.id})">📎 Ver anexo</button>` : ''}
            <a class="btn btn-sm btn-light" href="#${tipo}/editar/${r.id}">Editar</a>
            <button class="btn btn-sm btn-danger" onclick="excluir('${tipo}', ${r.id})">Excluir</button>
          </div>
        </div>`;
    }).join('')}</div>`;
    if (m.cabecalho) corpo = `<div style="margin-top:27px">${corpo}</div>`;
  }

  conteudo.innerHTML = `
    ${cabecalho(m.titulo, m.subtitulo, `<a class="btn btn-lg" href="${novo}">${m.botaoNovo}</a>`)}
    <div class="card">
      ${m.cabecalho ? `<div class="card-title"><div class="ico-box">${m.icone}</div>
        <div><h3>${m.cabecalho.titulo}</h3><p>${m.cabecalho.texto}</p></div></div>` : ''}
      ${m.avisoLista ? `<div class="notice" style="margin:0">${m.avisoLista}</div>` : ''}
      ${corpo}
    </div>`;
}

function excluir(tipo, id) {
  if (!confirm('Deseja realmente excluir este registro?')) return;
  Vitalis.excluir(tipo, id);
  mensagem = 'Registro excluído com sucesso!';
  navegar();
}

// Mostra o anexo (foto ou PDF) numa janela por cima da tela
function verAnexo(tipo, id) {
  const r = Vitalis.buscar(tipo, id);
  const campo = MODULOS[tipo].campos.find(c => c.tipo === 'file');
  const arq = r[campo.nome];
  const visor = arq.conteudo.startsWith('data:image')
    ? `<img src="${arq.conteudo}" alt="">`
    : `<iframe src="${arq.conteudo}"></iframe>`;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-head">
        <b>📎 ${esc(arq.nome)}</b>
        <div>
          <a class="btn btn-sm btn-light" href="${arq.conteudo}" download="${esc(arq.nome)}">Baixar</a>
          <button class="btn btn-sm btn-light" data-fechar>Fechar ✕</button>
        </div>
      </div>
      <div class="modal-body">${visor}</div>
    </div>`;
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.hasAttribute('data-fechar')) modal.remove();
  });
  document.body.appendChild(modal);
}

// ---------- Formulários de cadastro / edição ----------
function campoHTML(c, valor) {
  const obrig = c.obrig ? ' *' : '';
  const req = c.obrig ? 'required' : '';
  const ph = c.placeholder ? `placeholder="${esc(c.placeholder)}"` : '';
  let input;

  if (c.tipo === 'select') {
    input = `<select name="${c.nome}">${c.opcoes.map(o =>
      `<option ${o === valor ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  } else if (c.tipo === 'textarea') {
    input = `<textarea name="${c.nome}" ${ph} ${req}>${esc(valor)}</textarea>`;
  } else if (c.tipo === 'file') {
    input = `
      <div class="upload-box">
        <div class="up-icon">📎</div>
        <input type="file" name="${c.nome}" accept="image/*,.pdf" ${valor ? '' : req}>
        <p class="help">${valor ? 'Arquivo atual: <b>' + esc(valor.nome) + '</b> (escolha outro para trocar)'
                                 : 'Foto (JPG, PNG) ou PDF. No celular, dá para tirar a foto na hora.'}</p>
        ${valor && !c.obrig ? `<label class="remove-file"><input type="checkbox" name="${c.nome}_remover"> Remover anexo</label>` : ''}
      </div>`;
  } else {
    input = `<input type="${c.tipo || 'text'}" name="${c.nome}" value="${esc(valor)}" ${ph} ${req}>`;
  }

  return `
    <div class="field ${c.full ? 'full' : ''}">
      <label>${c.label}${obrig}</label>
      ${input}
      ${c.help ? `<p class="help">${c.help}</p>` : ''}
    </div>`;
}

function telaFormulario(tipo, id) {
  const m = MODULOS[tipo];
  const f = m.form;
  const registro = id ? Vitalis.buscar(tipo, id) : null;
  if (id && !registro) { location.hash = '#' + tipo; return; }

  const aviso = f.avisoIcone ? `${f.avisoIcone} ${f.aviso}` : f.aviso;

  conteudo.innerHTML = `
    ${cabecalho(registro ? f.tituloEditar : f.titulo, f.subtitulo)}
    <div class="card form-card ${f.estreito ? 'narrow' : ''}">
      <div class="notice ${f.avisoTipo || ''}">${aviso}</div>
      <form id="form-registro" class="${f.suave ? 'form-soft' : ''}">
        <div class="grid-2">
          ${m.campos.map(c => campoHTML(c, registro ? registro[c.nome] : '')).join('')}
        </div>
        <div class="form-actions ${f.separador ? 'sep' : ''}">
          <button class="btn btn-lg" type="submit">${f.botaoSalvar}</button>
          <a class="btn btn-lg btn-light" href="#${tipo}">Cancelar</a>
        </div>
      </form>
    </div>`;

  LeitorUI.ativar(tipo, registro); // leitura automática do anexo (leitor-ui.js)

  document.getElementById('form-registro').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const novo = { id: registro ? registro.id : undefined };

    for (const c of m.campos) {
      if (c.tipo === 'file') {
        const arq = form[c.nome].files[0];
        const remover = form[c.nome + '_remover'] && form[c.nome + '_remover'].checked;
        if (arq) {
          let conteudoArq;
          if (arq.type.startsWith('image/')) {
            conteudoArq = await reduzirImagem(arq); // fotos do celular ficam bem menores
          } else if (arq.size <= 2 * 1024 * 1024) {
            conteudoArq = await lerArquivo(arq);
          } else {
            alert('O PDF deve ter no máximo 2 MB. Para arquivos maiores, envie uma foto.');
            return;
          }
          novo[c.nome] = { nome: arq.name, conteudo: conteudoArq };
        } else if (remover) {
          novo[c.nome] = null;
        } else {
          novo[c.nome] = registro ? registro[c.nome] : null;
        }
      } else {
        novo[c.nome] = form[c.nome].value.trim();
      }
    }

    try {
      Vitalis.gravar(tipo, novo);
    } catch (err) {
      alert('Não foi possível salvar: o espaço do navegador acabou. Tente um arquivo menor.');
      return;
    }
    mensagem = m.mensagemSalvo;
    if (location.hash === '#' + tipo) navegar(); else location.hash = '#' + tipo;
  });
}

// Diminui a foto (máx. 1400px, JPEG) para caber no armazenamento do navegador
function reduzirImagem(arq) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const max = 1400;
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      res(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => res(lerArquivo(arq));
    img.src = URL.createObjectURL(arq);
  });
}

function lerArquivo(arq) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(arq);
  });
}

if (usuario) navegar();
