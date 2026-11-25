/* ===== VITALIS - dependentes =====
   Permite que uma conta (ex.: um pai ou uma mãe) administre os dados de saúde de outras pessoas,
   como um filho menor de idade que ainda não consegue cuidar do próprio histórico.

   Como funciona:
   - Em "Dependentes" a conta cadastra as pessoas que administra.
   - O seletor "Perfil ativo" (menu lateral) escolhe de quem são os dados que aparecem na tela.
   - Consultas, exames, vacinas etc. cadastrados com um dependente ativo ficam só no perfil dele
     (veja storage.js: cada perfil tem sua própria "gaveta" de registros).
*/

const PARENTESCOS = ['Filho(a)', 'Pai/Mãe', 'Cônjuge', 'Irmão(ã)', 'Outro'];
const TIPOS_SANGUE = ['Não informado', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const CAMPOS_DEPENDENTE = [
  { nome: 'nome', label: 'Nome completo', obrig: true, placeholder: 'Ex.: João Pedro Silva' },
  { nome: 'parentesco', label: 'Parentesco', tipo: 'select', opcoes: PARENTESCOS },
  { nome: 'nascimento', label: 'Data de nascimento', tipo: 'date', obrig: true },
  { nome: 'sangue', label: 'Tipo sanguíneo', tipo: 'select', opcoes: TIPOS_SANGUE },
  { nome: 'observacoes', label: 'Observações', tipo: 'textarea', full: true,
    placeholder: 'Ex.: plano de saúde, pediatra, cuidados especiais...' }
];

function idadeDe(nascimentoISO) {
  if (!nascimentoISO) return null;
  const n = new Date(nascimentoISO + 'T00:00:00');
  if (isNaN(n)) return null;
  const hoje = new Date();
  let anos = hoje.getFullYear() - n.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), n.getMonth(), n.getDate())) anos--;
  return anos;
}

function textoIdade(nascimentoISO) {
  const anos = idadeDe(nascimentoISO);
  if (anos === null) return '';
  if (anos >= 1) return anos + (anos === 1 ? ' ano' : ' anos');
  const n = new Date(nascimentoISO + 'T00:00:00'), h = new Date();
  const meses = Math.max(0, (h.getFullYear() - n.getFullYear()) * 12 + h.getMonth() - n.getMonth());
  return meses + (meses === 1 ? ' mês' : ' meses');
}

// ---------- Seletor "Perfil ativo" no menu lateral ----------
function desenharSeletorPerfil() {
  const lateral = document.querySelector('.sidebar');
  if (!lateral) return;
  let caixa = document.getElementById('perfil-switch');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.id = 'perfil-switch';
    caixa.className = 'perfil-switch';
    lateral.insertBefore(caixa, document.getElementById('menu'));
  }
  const u = Vitalis.usuarioLogado();
  const ativo = Vitalis.perfilAtivo();
  const deps = Vitalis.listarDependentes();

  caixa.innerHTML = `
    <label for="perfil-ativo">Perfil ativo</label>
    <select id="perfil-ativo">
      <option value="0">👤 Eu (${esc(u.nome.split(' ')[0])})</option>
      ${deps.map(d => `<option value="${d.id}" ${ativo.dep && ativo.dep.id === d.id ? 'selected' : ''}>
        ${esc(d.nome.split(' ')[0])} · ${esc(d.parentesco || 'Dependente')}</option>`).join('')}
    </select>`;
  document.getElementById('perfil-ativo').addEventListener('change', e => trocarPerfil(Number(e.target.value)));
}

// Troca o perfil ativo e volta para o início, já mostrando os dados da pessoa escolhida
function trocarPerfil(depId, destino) {
  Vitalis.definirPerfil(depId || null);
  mensagem = '';
  const alvo = destino || '#inicio';
  if (location.hash === alvo) navegar(); else location.hash = alvo;
}

// Faixa de aviso no topo das telas quando o perfil ativo é de um dependente
function avisoPerfilAtivo() {
  const p = Vitalis.perfilAtivo();
  if (!p.dep) return '';
  // "Meu perfil" e "Dependentes" são da conta principal, não do dependente
  if (/^#(perfil|dependentes)/.test(location.hash)) return '';
  const idade = textoIdade(p.dep.nascimento);
  return `
    <div class="perfil-banner">
      <div>👨‍👩‍👧 Você está administrando os dados de saúde de <b>${esc(p.dep.nome)}</b>
        (${esc(p.dep.parentesco || 'Dependente')}${idade ? ', ' + idade : ''}).
        Tudo o que for cadastrado agora fica no perfil dele(a).</div>
      <button class="btn btn-sm btn-light" type="button" onclick="trocarPerfil(0)">Voltar ao meu perfil</button>
    </div>`;
}

// ---------- Telas ----------
function telaDependentes(acao, id) {
  if (acao === 'novo') return telaFormDependente();
  if (acao === 'editar') return telaFormDependente(id);
  telaListaDependentes();
}

function telaListaDependentes() {
  const deps = Vitalis.listarDependentes();
  const ativo = Vitalis.perfilAtivo();
  let corpo;

  if (!deps.length) {
    corpo = `
      <div class="empty">
        <div class="big-ico boxed">👨‍👩‍👧</div>
        <h3>Nenhum dependente cadastrado</h3>
        <p>Cadastre um filho ou outra pessoa para administrar a saúde dela(e) por aqui.</p>
        <a class="btn btn-lg" href="#dependentes/novo">+ Cadastrar dependente</a>
      </div>`;
  } else {
    corpo = `<div class="items">${deps.map(d => {
      const idade = textoIdade(d.nascimento);
      const menor = idadeDe(d.nascimento) !== null && idadeDe(d.nascimento) < 18;
      const emUso = ativo.dep && ativo.dep.id === d.id;
      return `
        <div class="item">
          <div class="avatar-sm dep-avatar">${esc(d.nome[0].toUpperCase())}</div>
          <div class="item-body">
            <b>${esc(d.nome)}</b>
            <span class="badge">${esc(d.parentesco || 'Dependente')}</span>
            ${menor ? '<span class="badge yellow">Menor de idade</span>' : ''}
            ${emUso ? '<span class="badge">Perfil ativo</span>' : ''}
            <div class="item-meta">
              ${d.nascimento ? `<span>🎂 ${dataBR(d.nascimento)}${idade ? ' · ' + idade : ''}</span>` : ''}
              ${d.sangue && d.sangue !== 'Não informado' ? `<span>🩸 ${esc(d.sangue)}</span>` : ''}
            </div>
            ${d.observacoes ? `<div class="item-obs">${esc(d.observacoes)}</div>` : ''}
          </div>
          <div class="item-actions">
            <button class="btn btn-sm" onclick="trocarPerfil(${d.id})">Abrir perfil</button>
            <a class="btn btn-sm btn-light" href="#dependentes/editar/${d.id}">Editar</a>
            <button class="btn btn-sm btn-danger" onclick="excluirDependente(${d.id})">Excluir</button>
          </div>
        </div>`;
    }).join('')}</div>`;
  }

  conteudo.innerHTML = `
    ${cabecalho('Dependentes', 'Administre a saúde de quem depende de você, como um filho menor de idade.',
      '<a class="btn btn-lg" href="#dependentes/novo">+ Novo dependente</a>')}
    <div class="card">
      <div class="notice">👨‍👩‍👧 <b>Como funciona:</b> escolha uma pessoa em <b>“Perfil ativo”</b> no menu lateral.
        Consultas, exames, vacinas e documentos cadastrados passam a ser dela, separados dos seus.</div>
      ${corpo}
    </div>`;
}

function telaFormDependente(id) {
  const dep = id ? Vitalis.buscarDependente(id) : null;
  if (id && !dep) { location.hash = '#dependentes'; return; }

  conteudo.innerHTML = `
    ${cabecalho(dep ? 'Editar dependente' : 'Novo dependente', 'Cadastre uma pessoa cujos dados de saúde você vai administrar.')}
    <div class="card form-card">
      <div class="notice">👨‍👩‍👧 Como responsável, você poderá registrar e consultar os exames, consultas, vacinas e documentos desta pessoa.</div>
      <form id="form-dependente">
        <div class="grid-2">
          ${CAMPOS_DEPENDENTE.map(c => campoHTML(c, dep ? dep[c.nome] : '')).join('')}
        </div>
        <div class="form-actions">
          <button class="btn btn-lg" type="submit">💾 Salvar dependente</button>
          <a class="btn btn-lg btn-light" href="#dependentes">Cancelar</a>
        </div>
      </form>
    </div>`;

  document.getElementById('form-dependente').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const novo = { id: dep ? dep.id : undefined };
    CAMPOS_DEPENDENTE.forEach(c => { novo[c.nome] = f[c.nome].value.trim(); });
    Vitalis.gravarDependente(novo);
    mensagem = 'Dependente salvo com sucesso!';
    if (location.hash === '#dependentes') navegar(); else location.hash = '#dependentes';
  });
}

function excluirDependente(id) {
  const d = Vitalis.buscarDependente(id);
  if (!d || !confirm(`Excluir ${d.nome} e todos os registros de saúde dessa pessoa?`)) return;
  Vitalis.excluirDependente(id);
  mensagem = 'Dependente excluído com sucesso!';
  navegar();
}
