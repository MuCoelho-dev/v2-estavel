/* ===== VITALIS - configuração de cada tela =====
   Para mudar textos, campos ou ícones de uma tela, basta editar aqui.
   Tipos de campo: text, number, date, time, tel, select, textarea, file
*/
// Campo de anexo (foto ou PDF) usado em vários cadastros
const ANEXO = { nome: 'anexo', label: 'Anexo (foto ou PDF)', tipo: 'file', full: true };

const MODULOS = {
  consultas: {
    menu: 'Consultas', icone: '📅',
    titulo: 'Minhas consultas',
    subtitulo: 'Registre e guarde os relatórios das suas consultas médicas.',
    botaoNovo: '+ Registrar consulta',
    vazio: { titulo: 'Nenhuma consulta registrada', texto: 'Você ainda não possui relatórios de consulta cadastrados.', botao: '+ Registrar consulta' },
    form: {
      titulo: 'Registrar consulta', tituloEditar: 'Editar consulta',
      subtitulo: 'Guarde o relatório da consulta para consultar depois ou mostrar em uma próxima consulta.',
      aviso: '📅 Anote o que foi dito na consulta e, se quiser, anexe uma foto do relatório, receita ou pedido médico.',
      botaoSalvar: '💾 Salvar consulta'
    },
    mensagemSalvo: 'Consulta registrada com sucesso!',
    campos: [
      { nome: 'especialidade', label: 'Especialidade', obrig: true, placeholder: 'Ex.: Cardiologia' },
      { nome: 'medico', label: 'Médico(a)', placeholder: 'Ex.: Dr. João Souza' },
      { nome: 'data', label: 'Data da consulta', tipo: 'date', obrig: true },
      { nome: 'local', label: 'Local', placeholder: 'Ex.: Clínica Vida' },
      { nome: 'motivo', label: 'Motivo da consulta', full: true, placeholder: 'Ex.: Dor no peito, check-up anual...' },
      { nome: 'relatorio', label: 'Relatório / orientações do médico', tipo: 'textarea', full: true,
        placeholder: 'Ex.: Diagnóstico, exames pedidos, remédios receitados, retorno...' },
      ANEXO
    ],
    item: r => ({
      titulo: r.especialidade,
      meta: [r.medico && '👨‍⚕️ ' + r.medico, r.data && '📅 ' + dataBR(r.data), r.local && '📍 ' + r.local, r.motivo && '📝 ' + r.motivo],
      obs: r.relatorio
    })
  },

  exames: {
    menu: 'Exames', icone: '🧪',
    titulo: 'Meus exames',
    subtitulo: 'Consulte e organize seu histórico de exames médicos.',
    botaoNovo: '+ Novo exame',
    vazio: { titulo: 'Nenhum exame registrado', texto: 'Você ainda não possui exames cadastrados.', botao: '+ Cadastrar exame' },
    form: {
      titulo: 'Novo exame', tituloEditar: 'Editar exame',
      subtitulo: 'Registre as informações do seu exame.',
      aviso: '🧪 Preencha os dados do exame e, se quiser, anexe uma foto ou o PDF do resultado.',
      botaoSalvar: '💾 Salvar exame'
    },
    mensagemSalvo: 'Exame salvo com sucesso!',
    campos: [
      { nome: 'nome', label: 'Nome do exame', obrig: true, placeholder: 'Ex.: Hemograma completo' },
      { nome: 'tipo', label: 'Tipo', tipo: 'select', opcoes: ['Laboratorial', 'Imagem', 'Cardiológico', 'Outro'] },
      { nome: 'data', label: 'Data do exame', tipo: 'date' },
      { nome: 'local', label: 'Laboratório / Local', placeholder: 'Ex.: Laboratório Central' },
      { nome: 'resultado', label: 'Resultado', tipo: 'textarea', full: true, placeholder: 'Digite o resultado ou um resumo...' },
      ANEXO
    ],
    item: r => ({
      titulo: r.nome, badge: r.tipo,
      meta: [r.data && '📅 ' + dataBR(r.data), r.local && '📍 ' + r.local],
      obs: r.resultado
    })
  },

  medicamentos: {
    menu: 'Medicamentos', icone: '💊',
    titulo: 'Meus medicamentos',
    subtitulo: 'Consulte e organize seus medicamentos.',
    botaoNovo: '+ Novo medicamento',
    vazio: { titulo: 'Nenhum medicamento cadastrado', texto: 'Você ainda não possui medicamentos registrados.', botao: '+ Cadastrar medicamento' },
    form: {
      titulo: 'Novo medicamento', tituloEditar: 'Editar medicamento',
      subtitulo: 'Registre as informações do seu medicamento.',
      aviso: '💊 Preencha os dados do medicamento e, se quiser, anexe uma foto da receita ou da caixa do remédio.',
      botaoSalvar: '💾 Salvar medicamento'
    },
    mensagemSalvo: 'Medicamento salvo com sucesso!',
    campos: [
      { nome: 'nome', label: 'Nome do medicamento', obrig: true, placeholder: 'Ex.: Paracetamol' },
      { nome: 'dosagem', label: 'Dosagem', placeholder: 'Ex.: 500 mg' },
      { nome: 'frequencia', label: 'Frequência', placeholder: 'Ex.: 8 em 8 horas' },
      { nome: 'status', label: 'Status', tipo: 'select', opcoes: ['Ativo', 'Inativo'] },
      { nome: 'inicio', label: 'Data de início', tipo: 'date' },
      { nome: 'termino', label: 'Data de término', tipo: 'date' },
      { nome: 'observacoes', label: 'Observações', tipo: 'textarea', full: true, placeholder: 'Digite alguma observação...' },
      ANEXO
    ],
    item: r => ({
      titulo: r.nome, badge: r.status, badgeCor: r.status === 'Ativo' ? '' : 'gray',
      meta: [r.dosagem && '💊 ' + r.dosagem, r.frequencia && '⏰ ' + r.frequencia,
             r.inicio && '📅 ' + dataBR(r.inicio) + (r.termino ? ' até ' + dataBR(r.termino) : '')],
      obs: r.observacoes
    })
  },

  vacinas: {
    menu: 'Vacinas', icone: '💉',
    titulo: 'Minhas vacinas',
    subtitulo: 'Consulte e organize seu histórico de vacinação.',
    botaoNovo: '+ Registrar vacina',
    vazio: { titulo: 'Nenhuma vacina registrada', texto: 'Você ainda não possui vacinas cadastradas.', botao: '+ Registrar vacina' },
    form: {
      titulo: 'Nova vacina', tituloEditar: 'Editar vacina',
      subtitulo: 'Registre as informações da sua vacina.',
      aviso: '💉 Preencha os dados da vacina e, se quiser, anexe uma foto da carteirinha de vacinação.',
      botaoSalvar: '💾 Salvar vacina'
    },
    mensagemSalvo: 'Vacina registrada com sucesso!',
    campos: [
      { nome: 'nome', label: 'Nome da vacina', obrig: true, placeholder: 'Ex.: Influenza' },
      { nome: 'dose', label: 'Dose', placeholder: 'Ex.: 1ª dose, reforço...' },
      { nome: 'data', label: 'Data de aplicação', tipo: 'date' },
      { nome: 'proxima', label: 'Próxima dose', tipo: 'date' },
      { nome: 'local', label: 'Local de aplicação', full: true, placeholder: 'Ex.: UBS Centro' },
      { nome: 'observacoes', label: 'Observações', tipo: 'textarea', full: true, placeholder: 'Digite alguma observação...' },
      ANEXO
    ],
    item: r => ({
      titulo: r.nome, badge: r.dose,
      meta: [r.data && '📅 ' + dataBR(r.data), r.proxima && '🔔 Próxima: ' + dataBR(r.proxima), r.local && '📍 ' + r.local],
      obs: r.observacoes
    })
  },

  alergias: {
    menu: 'Alergias', icone: '⚠️',
    titulo: 'Minhas alergias',
    subtitulo: 'Registre e consulte suas alergias e reações.',
    botaoNovo: '+ Nova alergia',
    vazio: { titulo: 'Nenhuma alergia registrada', texto: 'Você ainda não possui alergias cadastradas.', botao: '+ Cadastrar alergia' },
    form: {
      titulo: 'Nova alergia', tituloEditar: 'Editar alergia',
      subtitulo: 'Registre as informações da sua alergia.',
      aviso: '<b>Atenção:</b> informe suas alergias e, se tiver, anexe uma foto do laudo ou do exame que comprova a alergia.',
      avisoTipo: 'warn', avisoIcone: '⚠️',
      botaoSalvar: '💾 Salvar alergia'
    },
    mensagemSalvo: 'Alergia salva com sucesso!',
    campos: [
      { nome: 'nome', label: 'Alergia a', obrig: true, placeholder: 'Ex.: Dipirona, amendoim...' },
      { nome: 'tipo', label: 'Tipo', tipo: 'select', opcoes: ['Medicamento', 'Alimento', 'Ambiental', 'Outro'] },
      { nome: 'gravidade', label: 'Gravidade', tipo: 'select', opcoes: ['Leve', 'Moderada', 'Grave'] },
      { nome: 'reacao', label: 'Reação', placeholder: 'Ex.: Manchas na pele, falta de ar...' },
      { nome: 'observacoes', label: 'Observações', tipo: 'textarea', full: true, placeholder: 'Digite alguma observação...' },
      ANEXO
    ],
    item: r => ({
      titulo: r.nome, badge: r.gravidade, badgeCor: { Leve: '', Moderada: 'yellow', Grave: 'red' }[r.gravidade],
      meta: [r.tipo && '🏷️ ' + r.tipo, r.reacao && '🤒 ' + r.reacao],
      obs: r.observacoes
    })
  },

  documentos: {
    menu: 'Documentos', icone: '📄',
    titulo: 'Meus documentos',
    subtitulo: 'Armazene e consulte seus documentos importantes de saúde em um só lugar.',
    botaoNovo: '+ Novo documento',
    cabecalho: { titulo: 'Documentos de saúde', texto: 'Seus arquivos médicos cadastrados.' },
    vazio: { titulo: 'Nenhum documento cadastrado', texto: 'Você ainda não possui documentos registrados.', botao: '+ Adicionar documento', caixa: true },
    form: {
      titulo: 'Novo documento', tituloEditar: 'Editar documento',
      subtitulo: 'Adicione documentos importantes ao seu histórico de saúde.',
      aviso: '<b>Organize seus documentos:</b> você pode armazenar exames, receitas, laudos, atestados e outros documentos importantes para o seu acompanhamento.',
      avisoIcone: '📄', suave: true, separador: true,
      botaoSalvar: '📤 Enviar documento'
    },
    mensagemSalvo: 'Documento enviado com sucesso!',
    campos: [
      { nome: 'nome', label: 'Nome do documento', obrig: true, placeholder: 'Ex.: Exame de sangue' },
      { nome: 'tipo', label: 'Tipo', placeholder: 'Ex.: Exame, Receita, Laudo...' },
      { nome: 'data', label: 'Data do documento', tipo: 'date' },
      { nome: 'arquivo', label: 'Arquivo', tipo: 'file', obrig: true },
      { nome: 'descricao', label: 'Descrição', tipo: 'textarea', full: true, placeholder: 'Digite informações adicionais sobre este documento...' }
    ],
    item: r => ({
      titulo: r.nome, badge: r.tipo,
      meta: [r.data && '📅 ' + dataBR(r.data), r.arquivo && '📎 ' + r.arquivo.nome],
      obs: r.descricao
    })
  },

  emergencia: {
    menu: 'Emergência', icone: '🚨',
    titulo: 'Contatos de emergência',
    subtitulo: 'Pessoas que podem ser contatadas em uma situação de emergência.',
    botaoNovo: '+ Novo contato',
    avisoLista: '🚨 <b>Importante:</b> mantenha pelo menos um contato atualizado para situações de emergência.',
    vazio: { titulo: 'Nenhum contato cadastrado', texto: 'Cadastre uma pessoa de confiança para situações de emergência.', botao: '+ Cadastrar contato', caixa: true },
    form: {
      titulo: 'Novo contato', tituloEditar: 'Editar contato',
      subtitulo: 'Cadastre uma pessoa de confiança para contato em situações de emergência.',
      aviso: '<b>Contato de emergência:</b> mantenha nome e telefone atualizados para facilitar o contato quando necessário.',
      avisoTipo: 'warn', avisoIcone: '🚨', suave: true, separador: true, estreito: true,
      botaoSalvar: '💾 Salvar contato'
    },
    mensagemSalvo: 'Contato salvo com sucesso!',
    campos: [
      { nome: 'nome', label: 'Nome', obrig: true, placeholder: 'Ex.: Maria da Silva' },
      { nome: 'relacao', label: 'Grau de relação', placeholder: 'Ex.: Mãe, pai, irmão, amigo...' },
      { nome: 'telefone', label: 'Telefone', tipo: 'tel', obrig: true, full: true, placeholder: 'Ex.: (11) 99999-9999',
        help: 'Informe um telefone válido para contato em situações de emergência.' },
      { nome: 'observacoes', label: 'Observações', tipo: 'textarea', full: true, placeholder: 'Digite informações adicionais sobre este contato...' }
    ],
    item: r => ({
      titulo: r.nome, badge: r.relacao,
      meta: [r.telefone && '📞 ' + r.telefone],
      obs: r.observacoes
    })
  }
};

function dataBR(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}
