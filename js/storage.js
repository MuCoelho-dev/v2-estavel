/* ===== VITALIS - "banco de dados" no navegador (localStorage) =====
   Não existe servidor: tudo fica salvo no próprio navegador.
   Para apagar tudo e voltar ao início, abra o console (F12) e rode: Vitalis.resetar()
*/
const Vitalis = {
  CHAVE: 'vitalis_dados',

  // Usuário de demonstração criado automaticamente
  usuarioDemo: {
    id: 1,
    nome: 'Quarteto Fatec',
    email: 'fatec@email.com',
    senha: '123456',
    telefone: '',
    criadoEm: '2026-08-21'
  },

  carregar() {
    let dados;
    try { dados = JSON.parse(localStorage.getItem(this.CHAVE)); } catch (e) { dados = null; }
    if (!dados) {
      dados = { usuarios: [this.usuarioDemo], registros: {}, proximoId: 100 };
      this.salvar(dados);
    }
    return dados;
  },

  salvar(dados) {
    localStorage.setItem(this.CHAVE, JSON.stringify(dados));
  },

  resetar() {
    localStorage.removeItem(this.CHAVE);
    localStorage.removeItem('vitalis_usuario');
    location.href = 'index.html';
  },

  // ---------- Login ----------
  usuarioLogado() {
    const id = Number(localStorage.getItem('vitalis_usuario'));
    return this.carregar().usuarios.find(u => u.id === id) || null;
  },

  entrar(email, senha) {
    const u = this.carregar().usuarios.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase() && u.senha === senha
    );
    if (u) localStorage.setItem('vitalis_usuario', u.id);
    return u;
  },

  cadastrar(nome, email, senha) {
    const dados = this.carregar();
    if (dados.usuarios.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return { erro: 'Este e-mail já está cadastrado.' };
    }
    const u = {
      id: dados.proximoId++, nome: nome.trim(), email: email.trim(), senha,
      telefone: '', criadoEm: new Date().toISOString().slice(0, 10)
    };
    dados.usuarios.push(u);
    this.salvar(dados);
    localStorage.setItem('vitalis_usuario', u.id);
    return { usuario: u };
  },

  sair() {
    localStorage.removeItem('vitalis_usuario');
    location.href = 'index.html';
  },

  atualizarUsuario(campos) {
    const dados = this.carregar();
    const u = dados.usuarios.find(x => x.id === this.usuarioLogado().id);
    Object.assign(u, campos);
    this.salvar(dados);
    return u;
  },

  // ---------- Dependentes (perfis administrados por esta conta) ----------
  // Um responsável (ex.: pai ou mãe) pode cuidar dos dados de saúde de outras pessoas, como um filho menor.
  // Cada dependente tem seus próprios registros, separados dos da conta principal.
  listarDependentes() {
    const u = this.usuarioLogado();
    return ((this.carregar().dependentes || {})[u.id] || []).slice();
  },

  buscarDependente(id) {
    return this.listarDependentes().find(d => d.id === id) || null;
  },

  gravarDependente(dep) {
    const u = this.usuarioLogado();
    const dados = this.carregar();
    dados.dependentes = dados.dependentes || {};
    const lista = dados.dependentes[u.id] = dados.dependentes[u.id] || [];
    if (dep.id) {
      lista[lista.findIndex(d => d.id === dep.id)] = dep;
    } else {
      dep.id = dados.proximoId++;
      lista.push(dep);
    }
    this.salvar(dados);
    return dep;
  },

  excluirDependente(id) {
    const u = this.usuarioLogado();
    const dados = this.carregar();
    dados.dependentes[u.id] = (dados.dependentes[u.id] || []).filter(d => d.id !== id);
    delete dados.registros[this._chaveRegistros(u.id, id)]; // apaga também os registros dele
    this.salvar(dados);
    if (this.perfilAtivo().dep && this.perfilAtivo().dep.id === id) this.definirPerfil(null);
  },

  // Perfil que está sendo visualizado agora: { dep: null } = a própria conta; { dep: {...} } = um dependente
  perfilAtivo() {
    const u = this.usuarioLogado();
    const id = Number(localStorage.getItem('vitalis_perfil_' + u.id));
    const dep = id ? this.buscarDependente(id) : null;
    return { dep, nome: dep ? dep.nome : u.nome };
  },

  definirPerfil(depId) {
    const u = this.usuarioLogado();
    if (depId) localStorage.setItem('vitalis_perfil_' + u.id, depId);
    else localStorage.removeItem('vitalis_perfil_' + u.id);
  },

  _chaveRegistros(usuarioId, depId) {
    return depId ? usuarioId + '_dep' + depId : usuarioId;
  },

  // Chave onde ficam os registros do perfil ativo (a própria conta ou um dependente)
  _dono() {
    const u = this.usuarioLogado();
    const p = this.perfilAtivo();
    return this._chaveRegistros(u.id, p.dep ? p.dep.id : 0);
  },

  // ---------- Registros (consultas, exames, etc.) ----------
  listar(tipo) {
    const dono = this._dono();
    const dados = this.carregar();
    return ((dados.registros[dono] || {})[tipo] || []).slice();
  },

  buscar(tipo, id) {
    return this.listar(tipo).find(r => r.id === id) || null;
  },

  gravar(tipo, registro) {
    const dono = this._dono();
    const dados = this.carregar();
    dados.registros[dono] = dados.registros[dono] || {};
    const lista = dados.registros[dono][tipo] = dados.registros[dono][tipo] || [];
    if (registro.id) {
      const i = lista.findIndex(r => r.id === registro.id);
      lista[i] = registro;
    } else {
      registro.id = dados.proximoId++;
      lista.push(registro);
    }
    this.salvar(dados);
  },

  excluir(tipo, id) {
    const dono = this._dono();
    const dados = this.carregar();
    const lista = ((dados.registros[dono] || {})[tipo] || []);
    dados.registros[dono][tipo] = lista.filter(r => r.id !== id);
    this.salvar(dados);
  }
};
