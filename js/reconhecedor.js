/* ===== VITALIS - reconhecimento do conteúdo dos documentos =====
   Recebe o TEXTO que foi lido do arquivo (pelo leitor-ocr.js) e descobre do que se trata.

   Como funciona (tudo por regras, sem inteligência artificial paga e sem internet):

   1. CLASSIFICAÇÃO por pontuação de palavras-chave.
      Cada tipo de documento (exame, consulta, receita, vacina, alergia, atestado) tem uma lista de
      palavras/expressões com um peso. Quanto mais palavras do tipo aparecem no texto, mais pontos ele ganha.
      O tipo com mais pontos é o escolhido. A diferença para o segundo colocado define a confiança.

   2. EXTRAÇÃO de dados com expressões regulares (regex):
      data, laboratório/clínica, médico e CRM, nome do paciente, valores de exames com unidade
      (ex.: "Glicose 92 mg/dL"), medicamentos com dose e posologia, nome/lote/dose de vacinas, alergias.

   3. Os dados extraídos são convertidos nos campos de cada formulário do sistema (paraModulo).

   O resultado é uma SUGESTÃO: o usuário sempre confere e pode corrigir antes de salvar.
*/
const Reconhecedor = {

  // ---------------------------------------------------------------------------------------------
  // 1) TIPOS DE DOCUMENTO: [expressão (sem acentos, minúscula), peso, nome mostrado ao usuário]
  // ---------------------------------------------------------------------------------------------
  TIPOS: {
    exame: {
      rotulo: 'Exame', modulo: 'exames', docTipo: 'Exame',
      regras: [
        [/valores? de referencia|referencia:/, 5, 'valor de referência'],
        [/hemograma/, 5, 'hemograma'],
        [/laboratorio/, 3, 'laboratório'],
        [/\bcoleta\b|material:/, 3, 'coleta/material'],
        [/\bresultados?\b/, 2, 'resultado'],
        [/\blaudo\b/, 3, 'laudo'],
        [/impressao diagnostica/, 4, 'impressão diagnóstica'],
        [/radiograf|raio.?x/, 3, 'radiografia'],
        [/ultrassom|ultrassonograf|ecografia/, 3, 'ultrassom'],
        [/tomografia/, 3, 'tomografia'],
        [/ressonancia/, 3, 'ressonância'],
        [/mamografia|densitometria/, 3, 'exame de imagem'],
        [/eletrocardiograma|ecocardiograma|holter|ergometric/, 2, 'exame cardíaco'],
        [/glicose|glicemia/, 2, 'glicose'],
        [/colesterol|triglicerideos/, 2, 'colesterol'],
        [/creatinina|ureia/, 2, 'creatinina/ureia'],
        [/\btsh\b|\bt4\b/, 2, 'TSH/T4'],
        [/hemoglobina|hematocrito|leucocitos|plaquetas/, 2, 'células do sangue'],
        [/\btgo\b|\btgp\b/, 2, 'TGO/TGP'],
        [/vitamina (d|b12)|ferritina/, 2, 'vitaminas'],
        [/urina|\beas\b/, 2, 'urina'],
        [/\bpsa\b|testosterona|estradiol|cortisol/, 2, 'hormônios'],
        [/\d[\d.,]*\s?(mg\/dl|g\/dl|ui\/l|u\/l|ng\/ml|pg\/ml|uui\/ml|mui\/l|\/mm3)/, 4, 'valores com unidade de medida']
      ]
    },
    consulta: {
      rotulo: 'Consulta / relatório médico', modulo: 'consultas', docTipo: 'Consulta',
      regras: [
        [/relatorio (de|da) consulta|relatorio medico|laudo medico/, 7, 'relatório de consulta'],
        [/\bconsulta\b/, 2, 'consulta'],
        [/anamnese|queixa|motivo/, 2.5, 'motivo/queixa'],
        [/conduta|hipotese diagnostica|evolucao/, 3, 'conduta/hipótese'],
        [/orientac|retorno/, 2, 'orientações/retorno'],
        [/prontuario|atendimento/, 2, 'atendimento'],
        [/\bcrm\b/, 1.5, 'CRM do médico']
      ]
    },
    receita: {
      rotulo: 'Receita médica', modulo: 'medicamentos', docTipo: 'Receita',
      regras: [
        [/receituario|receita medica|prescricao|\brx\b/, 6, 'receituário/prescrição'],
        [/\btomar\b|ingerir|administrar|uso oral|uso topico|via oral/, 4, 'modo de uso'],
        [/comprimido|capsula|gotas|ampola|xarope|pomada/, 3, 'forma do remédio'],
        [/de \d+ em \d+ horas|a cada \d+ horas|\d+ vez(es)? ao dia|\d+ ?x ao dia/, 3, 'frequência'],
        [/\d+(?:[.,]\d+)?\s?(mg|mcg|ml)\b(?!\s?\/)/, 2, 'dose em mg/ml'],
        [/\bpor \d+ dias|uso continuo/, 2, 'duração do tratamento'],
        [/\bcrm\b/, 1, 'CRM do médico']
      ]
    },
    vacina: {
      rotulo: 'Vacina / carteira de vacinação', modulo: 'vacinas', docTipo: 'Vacina',
      regras: [
        [/\bvacina\b|imuniza|vacinacao/, 6, 'vacina'],          // "vacinas em dia" (plural, citação solta) não conta
        [/carteira de vacina|caderneta de vacina/, 6, 'carteira de vacinação'],
        [/\blote\b/, 3, 'lote'],
        [/\bdose\b|reforco/, 2, 'dose/reforço'],
        [/aplicacao|aplicada/, 2, 'aplicação'],
        [/influenza|covid|hepatite|tetano|febre amarela|triplice viral|\bhpv\b|\bbcg\b|poliomielite|meningococ|pneumococ|rotavirus|varicela|dengue|zoster|dtpa|pentavalente/, 3, 'nome de vacina conhecido']
      ]
    },
    alergia: {
      rotulo: 'Alergia / laudo de alergia', modulo: 'alergias', docTipo: 'Laudo',
      regras: [
        [/\balergia\b|\balergias\s*:|alergic/, 6, 'alergia'],      // "não tem alergias conhecidas" (citação solta) não conta
        [/reacao alergica|anafila/, 4, 'reação alérgica'],
        [/urticaria|edema de glote|coceira|prurido/, 2, 'sintomas'],
        [/teste (de )?(alergia|alergico|cutaneo)|\big[ef]\b/, 3, 'teste alérgico']
      ]
    },
    atestado: {
      rotulo: 'Atestado médico', modulo: 'documentos', docTipo: 'Atestado',
      regras: [
        [/atestado/, 8, 'atestado'],
        [/afastamento|afastado|repouso/, 3, 'afastamento/repouso'],
        [/\bcid\b|cid-?10/, 3, 'CID'],
        [/comparec|declaro/, 2, 'declaração']
      ]
    }
  },

  // Subtipos de exame (dão o nome e o tipo do exame)
  EXAMES_LAB: [
    ['Hemograma completo', /hemograma|hemoglobina|hematocrito|leucocitos|plaquetas/],
    ['Glicemia', /glicose|glicemia|hba1c|hemoglobina glicada/],
    ['Perfil lipídico (colesterol)', /colesterol|triglicerideos|\bhdl\b|\bldl\b/],
    ['Função renal', /creatinina|ureia/],
    ['Função hepática', /\btgo\b|\btgp\b|\bast\b|\balt\b|gama ?gt|bilirrubina/],
    ['Tireoide (TSH)', /\btsh\b|t4 livre|\bt3\b/],
    ['Exame de urina', /urina|\beas\b|urocultura/],
    ['Vitaminas e minerais', /vitamina|ferritina|\bferro\b/],
    ['Hormônios', /testosterona|estradiol|cortisol|\bpsa\b|prolactina|\bfsh\b/]
  ],
  EXAMES_IMAGEM: /(radiografia|raio.?x|ultrassonografia|ultrassom|ecografia|tomografia|ressonancia magnetica|ressonancia|mamografia|densitometria)([^\n(,.;]{0,40})(\([^)\n]{1,25}\))?/i,
  EXAMES_CARDIO: /(eletrocardiograma|ecocardiograma|holter|teste ergometrico)/i,

  ESPECIALIDADES: [
    ['Cardiologia', /cardiolog/, /ecocardiograma|eletrocardiograma|palpita|dor no peito|pressao arterial/],
    ['Dermatologia', /dermatolog/, /pele|manchas|acne|dermatite/],
    ['Ortopedia', /ortoped|traumatolog/, /fratura|joelho|coluna|ombro/],
    ['Ginecologia', /ginecolog|obstetr/, /gestacao|papanicolau|menstrua/],
    ['Urologia', /urolog/, /prostata|psa/],
    ['Pediatria', /pediatr/, /crianca|lactente/],
    ['Neurologia', /neurolog/, /enxaqueca|convulsao|cefaleia/],
    ['Endocrinologia', /endocrin/, /tireoide|diabetes|hormon/],
    ['Oftalmologia', /oftalmolog/, /\bvisao\b|grau dos olhos|fundo de olho/],
    ['Otorrinolaringologia', /otorrino/, /garganta|ouvido|sinusite/],
    ['Psiquiatria', /psiquiatr/, /ansiedade|depressao/],
    ['Psicologia', /psicolog/, /terapia/],
    ['Nutrição', /nutricio|nutrolog|nutri[cç]/, /dieta|plano alimentar/],
    ['Gastroenterologia', /gastroenterolog/, /gastrite|refluxo|endoscopia/],
    ['Reumatologia', /reumatolog/, /artrite|artrose/],
    ['Pneumologia', /pneumolog/, /asma|bronquite|falta de ar/],
    ['Odontologia', /odontolog|dentista/, /canal|carie|ortodont/],
    ['Clínica geral', /clinica medica|clinico geral|clinica geral/, /check.?up/]
  ],

  VACINAS: [
    ['Influenza (gripe)', /influenza|gripe/], ['Covid-19', /covid|coronavac|astrazeneca|pfizer/],
    ['Hepatite B', /hepatite b/], ['Hepatite A', /hepatite a/], ['Febre amarela', /febre amarela/],
    ['Tríplice viral', /triplice viral|sarampo/], ['Tétano (dT/dTpa)', /tetano|\bdtpa?\b|difteria/],
    ['HPV', /\bhpv\b/], ['Meningocócica', /meningococ/], ['Pneumocócica', /pneumococ/],
    ['BCG', /\bbcg\b/], ['Poliomielite', /polio/], ['Rotavírus', /rotavirus/], ['Varicela', /varicela/],
    ['Dengue', /dengue/], ['Herpes zóster', /zoster/], ['Pentavalente', /pentavalente/]
  ],

  MESES: { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 },

  UNIDADES: 'mg\\/dL|g\\/dL|g\\/L|mg\\/L|ng\\/mL|ng\\/dL|pg\\/mL|[µu]g\\/dL|UI\\/L|U\\/L|[µu]UI\\/mL|mUI\\/L|mUI\\/mL|mEq\\/L|mmol\\/L|\\/mm³|\\/mm3|\\/[µu]L|milh[õo]es\\/mm[³3]|fL|pg|%|mm\\/h',

  // ---------------------------------------------------------------------------------------------
  // Funções de apoio
  // ---------------------------------------------------------------------------------------------
  // minúsculo e sem acentos, para comparar palavras sem se preocupar com acentuação/maiúsculas
  norm(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); },

  // "LABORATÓRIO CENTRAL DE ANÁLISES" -> "Laboratório Central de Análises"
  capitalizar(t) {
    t = String(t || '').trim().replace(/\s+/g, ' ');
    if (!t) return t;
    if (t !== t.toUpperCase()) return t.charAt(0).toUpperCase() + t.slice(1);
    const pequenas = ['de', 'da', 'do', 'dos', 'das', 'e', 'em', 'a', 'o', 'para', 'por', 'com'];
    return t.toLowerCase().split(' ').map((p, i) =>
      (i > 0 && pequenas.includes(p)) ? p : p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  },

  frase(t) { // só a primeira letra maiúscula: "HEMOGRAMA COMPLETO" -> "Hemograma completo"
    t = String(t || '').trim().replace(/\s+/g, ' ');
    if (t.length <= 5) return t.charAt(0).toUpperCase() + t.slice(1); // siglas: TSH, PSA, HDL
    let r = t.charAt(0).toUpperCase() + (t === t.toUpperCase() ? t.slice(1).toLowerCase() : t.slice(1));
    if (t === t.toUpperCase()) // "(PA E PERFIL)" -> "(PA e perfil)": siglas curtas dentro de parênteses continuam em maiúsculas
      r = r.replace(/\(([^)]*)\)/g, (m, x) => '(' + x.split(' ').map(w =>
        (w.length <= 2 && !['e', 'de', 'da', 'do', 'em', 'a', 'o'].includes(w)) ? w.toUpperCase() : w).join(' ') + ')');
    return r;
  },

  numero(s) { // "1.234,5" -> 1234.5 ; "14,2" -> 14.2 ; "250.000" -> 250000
    s = String(s).replace(/[<>\s]/g, '');
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(',', '.');
    return parseFloat(s);
  },

  iso(d, m, a) {
    d = Number(d); m = Number(m); a = Number(a);
    if (a < 100) a += 2000;
    if (m < 1 || m > 12 || d < 1 || d > 31 || a < 1920 || a > 2100) return null;
    return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  },

  somarDias(isoData, dias) {
    const d = new Date(isoData + 'T12:00:00');
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  },

  // Acha todas as datas de uma linha (dd/mm/aaaa, dd-mm-aa, "10 de outubro de 2026")
  datasDaLinha(linha) {
    const achadas = [];
    let m;
    const num = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/g;
    while ((m = num.exec(linha))) { const i = this.iso(m[1], m[2], m[3]); if (i) achadas.push(i); }
    const ext = /\b(\d{1,2})\s+de\s+([a-zçãé]+)\s+de\s+(\d{4})\b/gi;
    while ((m = ext.exec(linha))) {
      const mes = this.MESES[this.norm(m[2])];
      if (mes) { const i = this.iso(m[1], mes, m[3]); if (i) achadas.push(i); }
    }
    return achadas;
  },

  // Escolhe a data principal do documento. Ignora nascimento/validade/retorno e dá preferência
  // a linhas que falam em "coleta", "consulta", "aplicação" etc. (preferencias).
  dataPrincipal(linhas, preferencias) {
    const ignorar = /nasc|validade|vencimento|proxima|retorno|reforco em|admissao/;
    let melhor = null, melhorPts = -1;
    linhas.forEach((l, i) => {
      // tira "Nascimento: 14/03/1992" da linha para não perder outra data da mesma linha (ex.: "Data do exame: 03/11/2026")
      l = l.replace(/nasc\w*\.?\s*(?:[:\-]\s*)?(?:\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{1,2}\s+de\s+[a-zçãé]+\s+de\s+\d{4})/gi, '');
      const n = this.norm(l);
      if (ignorar.test(n)) return;
      this.datasDaLinha(l).forEach(d => {
        const pts = (preferencias.test(n) ? 2 : 0) + (i < 6 ? 0.5 : 0);
        if (pts > melhorPts) { melhorPts = pts; melhor = d; }
      });
    });
    return melhor;
  },

  // ---------------------------------------------------------------------------------------------
  // Extrações específicas
  // ---------------------------------------------------------------------------------------------
  paciente(linhas) {
    for (const l of linhas) {
      const m = l.match(/\b(?:paciente|nome do paciente|nome)\s*[:\-]\s*(.+)/i);
      if (m) {
        const nome = m[1].split(/\s{2,}|\s+(?:data de nasc\w*|nasc\w*\.?|cpf|idade|sexo|rg|conv[eê]nio)\b/i)[0]
          .replace(/[_.]+$/, '').trim();
        if (nome.length >= 5 && /^\p{L}[\p{L} .'-]+$/u.test(nome)) return nome;
      }
    }
    return null;
  },

  medico(linhas) {
    const re = /\b(?:[Dd]r|[Dd]ra|[Dd]outor|[Dd]outora|DR|DRA)\.?\s+(\p{Lu}[\p{L}'-]+(?:\s+(?:de |da |do |dos |das |e )?\p{Lu}[\p{L}'-]+){0,3})/u;
    for (const l of linhas) {
      const m = l.match(re);
      if (m) {
        const pref = /^(dra|doutora)/i.test(m[0].trim()) ? 'Dra. ' : 'Dr. ';
        return pref + this.capitalizar(m[1].trim());
      }
    }
    return null;
  },

  crm(texto) {
    const m = texto.match(/crm[\s\-:\/]*([A-Z]{2})?[\s\-:]*(\d{3,7})/i);
    return m ? `CRM${m[1] ? '-' + m[1].toUpperCase() : ''} ${m[2]}` : null;
  },

  local(linhas) {
    const explicito = linhas.map(l => l.match(/\blocal(?: de aplica[çc][aã]o)?\s*[:\-]\s*(.{3,80})/i)).find(Boolean);
    if (explicito) return this.capitalizar(explicito[1].trim());
    const ehLocal = /laborator|clinica|hospital|diagnostic|centro medico|\bubs\b|posto de saude|policlinica|medicina diagnostica|santa casa|ambulatorio|pronto.?socorro|\bupa\b/;
    const naoEh = /paciente|solicitante|medico|\bdr\b|\bdra\b|crm|data|resultado|assinado|responsavel/;
    for (const l of linhas) {
      const n = this.norm(l);
      if (ehLocal.test(n) && !naoEh.test(n) && l.length <= 80) {
        return this.capitalizar(l.replace(/^(laborat[óo]rio|local)\s*[:\-]\s*/i, '').trim());
      }
    }
    return null;
  },

  especialidade(texto) {
    const n = this.norm(texto);
    for (const [nome, direto] of this.ESPECIALIDADES) if (direto.test(n)) return { nome, certeza: 'direta' };
    let melhor = null, pts = 0;
    for (const [nome, , indicios] of this.ESPECIALIDADES) {
      const g = new RegExp(indicios.source, 'g');
      const c = (n.match(g) || []).length;
      if (c > pts) { pts = c; melhor = nome; }
    }
    return melhor ? { nome: melhor, certeza: 'indicios' } : null;
  },

  // Valores de exames: "Glicose ........ 92 mg/dL   Valor de referência: 70 a 99 mg/dL"
  valores(linhas) {
    const re = new RegExp(
      '^\\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 .,\\/()%\\-]{1,40}?)[.:·_\\-–\\s]+' +
      '([<>]?\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|[<>]?\\d+(?:[.,]\\d+)?)\\s*(?:\\((?:alto|alta|baixo|baixa|elevado|reduzido)\\)\\s*)?(' + this.UNIDADES + ')');
    const proibido = /paciente|data|nascimento|solicitante|crm|cpf|telefone|pagina|protocolo|registro|idade|peso|altura|referencia|metodo/;
    const vistos = new Set(), lista = [];

    for (const l of linhas) {
      const m = l.match(re);
      if (!m) continue;
      const nome = m[1].replace(/[.:·_\-–\s]+$/, '').trim();
      if (nome.length < 2 || proibido.test(this.norm(nome)) || vistos.has(this.norm(nome))) continue;
      vistos.add(this.norm(nome));

      const v = { nome: this.frase(nome), valor: m[2].replace(/^[<>]/, ''), unidade: m[3], situacao: null, ref: null };
      // valor de referência impresso no próprio documento (se houver) para avisar se está fora
      const resto = l.slice(m.index + m[0].length);
      const r = this.referencia(resto);
      if (r) {
        const x = this.numero(m[2]);
        v.ref = r.texto;
        if (!isNaN(x)) {
          if (r.min !== null && x < r.min) v.situacao = 'abaixo';
          else if (r.max !== null && x > r.max) v.situacao = 'acima';
          else v.situacao = 'normal';
        }
      }
      lista.push(v);
      if (lista.length >= 25) break;
    }
    return lista;
  },

  referencia(trecho) {
    const t = trecho.replace(/.*refer[êe]ncia[^:]*:?/i, '');
    const num = '(\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:[.,]\\d+)?)';
    let m = t.match(new RegExp(num + '\\s*(?:a|à|-|–|até)\\s*' + num));
    if (m) return { min: this.numero(m[1]), max: this.numero(m[2]), texto: `${m[1]} a ${m[2]}` };
    m = t.match(new RegExp('(?:inferior|menor|abaixo|<|at[ée])\\s*(?:a|que|de)?\\s*' + num, 'i'));
    if (m) return { min: null, max: this.numero(m[1]), texto: `abaixo de ${m[1]}` };
    m = t.match(new RegExp('(?:superior|maior|acima|>)\\s*(?:a|que|de)?\\s*' + num, 'i'));
    if (m) return { min: this.numero(m[1]), max: null, texto: `acima de ${m[1]}` };
    return null;
  },

  medicamentos(linhas, dataDoc) {
    const re = /^\s*(?:rx[:.]?\s*)?(?:\d+\s*[\)\.\-–]\s*|[-•*]\s*)?(\p{Lu}[\p{L}\-]{2,}(?:\s\p{L}[\p{L}\d\-]*){0,2}?)\s+(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|g|ml|ui|%)(?=\s|$|[,.;\/])/iu;
    const naoNome = /^(tomar|dose|paciente|data|crm|dr|dra|uso|via|aplicar|valor|peso|idade)\b/i;
    const lista = [];

    linhas.forEach((l, i) => {
      const m = l.match(re);
      if (!m || naoNome.test(m[1])) return;
      // a posologia pode estar na mesma linha ou nas 2 linhas seguintes (até o próximo item numerado)
      let bloco = l.slice(m.index + m[0].length);
      for (let k = i + 1; k <= i + 2 && k < linhas.length; k++) {
        if (re.test(linhas[k]) || /^\s*\d+\s*[\)\-–]/.test(linhas[k])) break;
        bloco += ' ' + linhas[k];
      }
      const b = this.norm(bloco);
      const qtd = bloco.match(/(\d+|um|uma|dois|duas|meio|meia)\s*(comprimidos?|c[aá]psulas?|gotas?|ml|doses?|ampolas?|sach[êe]s?|aplica[çc][õo]es?)/i);
      let freq = null, f;
      if ((f = b.match(/de\s*(\d+)\s*em\s*(\d+)\s*horas/))) freq = `${f[1]} em ${f[2]} horas`;
      else if ((f = b.match(/a cada\s*(\d+)\s*horas/))) freq = `a cada ${f[1]} horas`;
      else if ((f = b.match(/(\d+)\s*vez(?:es)?\s*(?:ao|por)\s*dia/))) freq = `${f[1]} ${f[1] === '1' ? 'vez' : 'vezes'} ao dia`;
      else if ((f = b.match(/(\d+)\s*x\s*(?:ao|por)?\s*dia/))) freq = `${f[1]}x ao dia`;
      else if ((f = b.match(/\b(uma|duas|tres)\s*vez(?:es)?\s*(?:ao|por)\s*dia/))) freq = `${f[1]} ${f[1] === 'uma' ? 'vez' : 'vezes'} ao dia`;
      else if (/ao deitar/.test(b)) freq = 'ao deitar';
      else if (/pela manha/.test(b)) freq = 'pela manhã';
      else if (/\ba noite\b/.test(b)) freq = 'à noite';
      else if (/\bao dia\b/.test(b)) freq = 'ao dia';
      const dias = (b.match(/por\s*(\d+)\s*dias?/) || [])[1];
      const continuo = /uso continuo/.test(b);

      lista.push({
        nome: m[1].trim().replace(/^\w/, c => c.toUpperCase()),
        dosagem: `${m[2]} ${m[3].toLowerCase()}`,
        frequencia: freq || '',
        quantidade: qtd ? `${qtd[1]} ${qtd[2]}` : '',
        dias: dias ? Number(dias) : null,
        continuo,
        inicio: dataDoc || null,
        termino: (dias && dataDoc) ? this.somarDias(dataDoc, Number(dias)) : null
      });
    });
    return lista;
  },

  vacina(texto, linhas, dataDoc) {
    const n = this.norm(texto);
    let nome = null;
    const exp = texto.match(/vacina\s*[:\-]\s*([^\n]+)/i);
    if (exp) nome = exp[1].trim().replace(/[.;]$/, '');
    else for (const [nm, re] of this.VACINAS) if (re.test(n)) { nome = nm; break; }

    let dose = '';
    const d1 = texto.match(/\bdose\s*[:\-]\s*([^\n]+)/i);
    const d2 = texto.match(/(\d+)\s*[ªaº°]?\s*dose/i);
    if (d1) dose = this.frase(d1[1].trim()).replace(/(\d+)\s*[º°o]\s*dose/i, '$1ª dose'); // OCR confunde ª com º
    else if (d2) dose = `${d2[1]}ª dose`;
    else if (/dose unica/.test(n)) dose = 'Dose única';
    else if (/reforco/.test(n)) dose = 'Reforço';

    const lote = (texto.match(/\blote\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]{2,})/i) || [])[1] || '';

    let proxima = null;
    for (const l of linhas) {
      if (/pr[óo]xima|refor[çc]o em/i.test(l)) { const ds = this.datasDaLinha(l); if (ds.length) { proxima = ds[0]; break; } }
    }
    return { nome: nome ? this.frase(nome).replace(/\bcovid-19\b/i, 'Covid-19') : '', dose, lote, proxima };
  },

  // Carteirinha com VÁRIAS vacinas em linhas de tabela ("Hepatite B  3ª dose  10/11/2022  HB2208 ...").
  // Cada linha com nome de vacina + data vira um item; só vale se achar 2 ou mais (carteira de 1 vacina segue o fluxo normal).
  CANON_VACINAS: ['influenza', 'covid', 'hepatite b', 'hepatite a', 'febre amarela', 'triplice viral', 'tetano', 'meningococica',
                  'pneumococica', 'poliomielite', 'rotavirus', 'varicela', 'dengue', 'herpes zoster', 'pentavalente'],

  distancia(a, b) { // distância de edição (letras trocadas/faltando por erro do OCR)
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  },

  nomeVacinaDaLinha(prefixo) {
    const p = this.norm(prefixo).replace(/[^a-z0-9 ()\-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!p) return null;
    for (const [nm, re] of this.VACINAS) if (re.test(p)) return nm;
    if (/^dt\b|dupla adulto/.test(p)) return 'Tétano (dT/dTpa)';   // "dT (dupla adulto)" nas carteirinhas
    let melhor = null, dm = 3;                               // aceita até 2 letras erradas (ex.: "epatite B" -> Hepatite B)
    this.CANON_VACINAS.forEach(c => {
      const dist = this.distancia(p.split(/ \(/)[0], c);
      if (dist < dm) { dm = dist; melhor = c; }
    });
    if (!melhor || p.length < 6) return null;
    for (const [nm, re] of this.VACINAS) if (re.test(melhor)) return nm;
    return null;
  },

  vacinasDaTabela(linhas) {
    const itens = [];
    for (const l of linhas) {
      const md = l.match(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/);
      if (!md) continue;
      const data = this.datasDaLinha(l)[0];
      if (!data) continue;
      const corte = l.search(/\b\d+\s*[ªaº°o]?\s*dose\b|\bdose\b|refor[çc]o|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/i);
      const nome = this.nomeVacinaDaLinha(l.slice(0, corte < 0 ? 0 : corte));
      if (!nome) continue;
      const n = this.norm(l);
      const d = l.match(/(\d+)\s*[ªaº°o]?\s*dose/i);
      const dose = d ? `${d[1]}ª dose` : /dose unica/.test(n) ? 'Dose única' : /dose anual/.test(n) ? 'Dose anual' : /refor[cç]o/.test(n) ? 'Reforço' : '';
      const lote = ((l.slice(l.indexOf(md[0]) + md[0].length).match(/^\W*([A-Za-z]{1,4}[0-9A-Za-z]{3,})/) || [])[1]) || '';
      itens.push({ nome: this.frase(nome).replace(/\bcovid-19\b/i, 'Covid-19'), dose, data, lote });
    }
    return itens;
  },

  alergia(texto) {
    const n = texto;
    let nome = '';
    const m = n.match(/(?:al[ée]rgic[oa]s?|alergia)\s*(?:a[os]?|à|às|:|-)?\s*[:\-]?\s*([^\n.;,]{3,50})/i);
    if (m) nome = m[1].trim();
    const nn = this.norm(texto);
    const reacoes = ['urticaria', 'coceira', 'prurido', 'edema', 'falta de ar', 'manchas na pele', 'vomito', 'anafilaxia', 'inchaco']
      .filter(r => nn.includes(r));
    const grave = /anafila|edema de glote|grave|choque/.test(nn) ? 'Grave' : /moderad/.test(nn) ? 'Moderada' : /leve/.test(nn) ? 'Leve' : '';
    const alvo = this.norm(nome);
    let tipo = 'Outro';
    if (/dipirona|penicilina|amoxicilina|ibuprofeno|aspirina|\baas\b|diclofenaco|cefalexina|sulfa|dorflex|paracetamol|medicamento|remedio/.test(alvo + ' ' + nn)) tipo = 'Medicamento';
    else if (/amendoim|leite|ovo|camarao|frutos do mar|gluten|soja|castanha|peixe|trigo|alimento/.test(alvo + ' ' + nn)) tipo = 'Alimento';
    else if (/poeira|acaro|polen|pelo|mofo|ambiental|latex/.test(alvo + ' ' + nn)) tipo = 'Ambiental';
    return { nome: this.frase(nome), tipo, gravidade: grave, reacao: reacoes.join(', ') };
  },

  nomeDoExame(texto, linhas) {
    const n = this.norm(texto);
    // exames de imagem e cardíacos: usa a própria expressão do laudo ("Radiografia de tórax (PA e perfil)")
    let m = texto.match(this.EXAMES_IMAGEM);
    if (m && /radiograf|raio|ultrass|ecograf|tomogr|resson|mamogr|densit/.test(this.norm(m[1]))) {
      const nome = (m[1] + (m[2] || '') + (m[3] ? ' ' + m[3] : '')).replace(/\s+/g, ' ').trim();
      return { nome: this.frase(nome), tipo: 'Imagem' };
    }
    m = texto.match(this.EXAMES_CARDIO);
    if (m && !/laboratorio|hemograma|glicose/.test(n)) return { nome: this.frase(m[1]), tipo: 'Cardiológico' };

    // exames de laboratório: usa o título do documento se existir
    const titulo = linhas.slice(0, 12).find(l => {
      const nl = this.norm(l);
      return l.length <= 70 && /hemograma|perfil|bioquimica|dosagem|painel|check.?up|urina|glicemia|exames? de /.test(nl)
        && !/paciente|medico|solicitante|data|laborat|clinica|resultado de|crm/.test(nl);
    });
    if (titulo) return { nome: this.frase(titulo.replace(/[-–:]+$/, '')), tipo: 'Laboratorial' };

    const nomes = this.EXAMES_LAB.filter(([, re]) => re.test(n)).map(([nm]) => nm);
    if (nomes.length === 0) return { nome: '', tipo: 'Outro' };
    return { nome: nomes.length <= 2 ? nomes.join(' e ') : 'Exames de sangue (' + nomes.slice(0, 2).join(', ') + ' e outros)', tipo: 'Laboratorial' };
  },

  // ---------------------------------------------------------------------------------------------
  // 2) ANALISAR: ponto de entrada. Recebe o texto lido e devolve tudo que foi reconhecido.
  // ---------------------------------------------------------------------------------------------
  analisar(textoBruto) {
    const texto = String(textoBruto || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
    const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
    const n = this.norm(texto);
    const r = { texto, linhas, tipo: 'desconhecido', rotulo: 'Documento não identificado', modulo: null,
                confianca: 'baixa', pontos: {}, evidencias: [], docTipo: 'Outro' };
    if (texto.replace(/\s/g, '').length < 15) { r.vazio = true; return r; }

    // --- 1. classificação por pontuação ---
    const evid = {};
    for (const [tipo, def] of Object.entries(this.TIPOS)) {
      let pts = 0; evid[tipo] = [];
      for (const [re, peso, nome] of def.regras) {
        if (re.test(n)) { pts += peso; if (nome) evid[tipo].push(nome); }
      }
      r.pontos[tipo] = pts;
    }
    const ordem = Object.entries(r.pontos).sort((a, b) => b[1] - a[1]);
    const [topo, ptsTopo] = ordem[0], ptsSeg = ordem[1][1];
    if (ptsTopo >= 5) {
      r.tipo = topo; r.rotulo = this.TIPOS[topo].rotulo; r.modulo = this.TIPOS[topo].modulo;
      r.docTipo = this.TIPOS[topo].docTipo; r.evidencias = evid[topo];
      r.confianca = (ptsTopo >= 10 && ptsTopo >= 1.5 * ptsSeg) ? 'alta' : (ptsTopo >= 7 ? 'média' : 'baixa');
    }

    // --- 2. extração dos dados ---
    const pref = { exame: /coleta|realiza|exame|emiss|resultado|liberad/, consulta: /consulta|atendimento|data/,
                   receita: /receita|emiss|data|,\s*\d/, vacina: /aplic|data/ }[r.tipo] || /data|emiss/;
    r.paciente = this.paciente(linhas);
    r.data = this.dataPrincipal(linhas, pref);
    r.local = this.local(linhas);
    r.medico = this.medico(linhas);
    r.crm = this.crm(texto);
    r.valores = (r.tipo === 'exame' || r.tipo === 'desconhecido') ? this.valores(linhas) : [];
    if (r.tipo === 'exame') r.exame = this.nomeDoExame(texto, linhas);
    if (r.tipo === 'consulta') {
      r.especialidade = this.especialidade(texto);
      r.motivo = ((texto.match(/(?:motivo(?: da consulta)?|queixa(?: principal)?)\s*[:\-]\s*([^\n]+)/i) || [])[1] || '').trim().replace(/\.$/, '');
      const chaves = /^(conduta|orienta|diagn|hip[óo]tese|retorno|prescri|exames? solicitad|plano|evolu)/i;
      let rel = linhas.filter(l => chaves.test(l)).join(' ');
      if (!rel) rel = linhas.filter(l => !/^(cl[ií]nica|dr|dra|crm|paciente|data|relat[óo]rio)/i.test(l)).join(' ').slice(0, 500);
      r.relatorio = rel;
    }
    if (r.tipo === 'receita') r.medicamentos = this.medicamentos(linhas, r.data);
    if (r.tipo === 'vacina') {
      r.vacina = this.vacina(texto, linhas, r.data);
      const tabela = this.vacinasDaTabela(linhas);
      if (tabela.length > 1) r.vacinas_lista = tabela;      // carteirinha com várias vacinas
    }
    if (r.tipo === 'alergia') r.alergia = this.alergia(texto);
    return r;
  },

  // ---------------------------------------------------------------------------------------------
  // 3) PARA O FORMULÁRIO: transforma o que foi reconhecido nos campos de cada tela do sistema.
  //    Devolve { campo: valor }. Só inclui campos que foram realmente encontrados.
  // ---------------------------------------------------------------------------------------------
  resumoValores(valores, max = 12) {
    return valores.slice(0, max).map(v => {
      const sit = v.situacao === 'acima' ? ' (acima da referência)' : v.situacao === 'abaixo' ? ' (abaixo da referência)' : '';
      return `${v.nome}: ${v.valor} ${v.unidade}${sit}`;
    }).join('; ');
  },

  paraModulo(modulo, a, indiceMed = 0) {
    const c = {};
    const ponha = (k, v) => { if (v !== null && v !== undefined && String(v).trim() !== '') c[k] = String(v).trim(); };

    if (modulo === 'exames') {
      const ex = a.exame || this.nomeDoExame(a.texto, a.linhas);
      ponha('nome', ex.nome); ponha('tipo', ex.tipo); ponha('data', a.data); ponha('local', a.local);
      const rv = this.resumoValores(a.valores);
      ponha('resultado', rv || (a.tipo === 'exame'
        ? (a.linhas.filter(l => /impress|conclus|resultado/i.test(l)).join(' ')
           || a.linhas.filter(l => /^laudo\s*:/i.test(l)).join(' ').replace(/^laudo\s*:\s*/i, ''))   // ex.: "LAUDO: Ritmo sinusal..." (eletrocardiograma)
        : ''));
    } else if (modulo === 'consultas') {
      const esp = a.especialidade || this.especialidade(a.texto);
      ponha('especialidade', esp && esp.nome); ponha('medico', a.medico); ponha('data', a.data); ponha('local', a.local);
      ponha('motivo', a.motivo); ponha('relatorio', a.relatorio);
    } else if (modulo === 'medicamentos') {
      const meds = a.medicamentos && a.medicamentos.length ? a.medicamentos : this.medicamentos(a.linhas, a.data);
      const m = meds[indiceMed] || meds[0];
      if (m) {
        ponha('nome', m.nome); ponha('dosagem', m.dosagem); ponha('frequencia', m.frequencia);
        ponha('inicio', m.inicio); ponha('termino', m.termino);
        const hoje = new Date().toISOString().slice(0, 10);
        c.status = (m.termino && m.termino < hoje) ? 'Inativo' : 'Ativo';
        const partes = [];
        if (m.quantidade) partes.push(`Tomar ${m.quantidade}${m.frequencia ? ' ' + (/^\d/.test(m.frequencia) ? 'de ' : '') + m.frequencia : ''}${m.dias ? ' por ' + m.dias + ' dias' : ''}.`);
        else if (m.continuo) partes.push('Uso contínuo.');
        if (a.medico) partes.push(`Prescrito por ${a.medico}${a.crm ? ' (' + a.crm + ')' : ''}.`);
        ponha('observacoes', partes.join(' '));
      }
    } else if (modulo === 'vacinas') {
      const v = a.vacina || this.vacina(a.texto, a.linhas, a.data);
      const it = (a.vacinas_lista && a.vacinas_lista.length > 1) ? (a.vacinas_lista[indiceMed] || a.vacinas_lista[0]) : null;
      if (it) { // carteirinha com várias vacinas: usa os dados da linha escolhida
        ponha('nome', it.nome); ponha('dose', it.dose); ponha('data', it.data); ponha('proxima', v.proxima);
        ponha('local', a.local); ponha('observacoes', it.lote ? 'Lote: ' + it.lote : '');
      } else {
        ponha('nome', v.nome); ponha('dose', v.dose); ponha('data', a.data); ponha('proxima', v.proxima);
        ponha('local', a.local); ponha('observacoes', v.lote ? 'Lote: ' + v.lote : '');
      }
    } else if (modulo === 'alergias') {
      const al = a.alergia || this.alergia(a.texto);
      ponha('nome', al.nome); ponha('tipo', al.tipo); ponha('gravidade', al.gravidade); ponha('reacao', al.reacao);
    } else if (modulo === 'documentos') {
      const nomes = { exame: a.exame ? a.exame.nome : '', consulta: 'Relatório de consulta', receita: 'Receita médica',
                      vacina: 'Carteira de vacinação', alergia: 'Laudo de alergia', atestado: 'Atestado médico' };
      let nome = nomes[a.tipo] || '';
      if (a.tipo === 'receita' && a.medico) nome += ' - ' + a.medico;
      if (a.tipo === 'consulta') { const e = this.especialidade(a.texto); if (e) nome += ' - ' + e.nome; }
      if (!nome) { // sem nome definido: usa o título do documento (ex.: "Laudo neuropsicológico")
        const tit = a.linhas.slice(0, 10).find(l => l.length <= 70 &&
          /^(laudo|relat[óo]rio|anota[çc][õo]es|parecer|declara[çc][ãa]o|encaminhamento|certid[ãa]o)\b/i.test(l));
        if (tit) nome = this.frase(tit.replace(/[-–—:\s]+$/, ''));
      }
      ponha('nome', nome); ponha('tipo', a.tipo === 'desconhecido' ? '' : a.docTipo); ponha('data', a.data);
      const desc = [];
      if (a.local) desc.push(a.local);
      if (a.valores && a.valores.length) desc.push(this.resumoValores(a.valores, 6));
      if (a.tipo === 'receita' && a.medicamentos) desc.push('Medicamentos: ' + a.medicamentos.map(m => `${m.nome} ${m.dosagem}`).join(', '));
      if (a.tipo === 'consulta' && a.motivo) desc.push('Motivo: ' + a.motivo);
      ponha('descricao', desc.join('. '));
    }
    return c;
  }
};

if (typeof module !== 'undefined') module.exports = Reconhecedor;
