document.addEventListener('DOMContentLoaded', function () {
  const ModalSystem = {
    overlay: null,
    
    init() {
      this.overlay = document.getElementById('modal-overlay');
      if (this.overlay) {
        this.overlay.addEventListener('click', (e) => {
          if (e.target === this.overlay) {
            this.close();
          }
        });
        
        document.addEventListener('keydown', (e) => {
          if (this.overlay && this.overlay.style.display === 'block') {
            if (e.key === 'Escape') {
              this.close();
            } else if (e.key === 'Enter') {
              const primaryButton = this.overlay.querySelector('.modal-button.primary, .modal-button.danger');
              if (primaryButton) {
                primaryButton.click();
              }
            }
          }
        });
      }
    },
    
    show(options = {}) {
      if (!this.overlay) return;
      
      const {
        title = 'Confirmação',
        message = 'Tem certeza?',
        type = 'warning',
        buttons = [
          { text: 'Cancelar', class: 'secondary', action: () => this.close() },
          { text: 'Confirmar', class: 'primary', action: () => this.close() }
        ]
      } = options;
      
      const iconElement = document.getElementById('modal-icon');
      const titleElement = document.getElementById('modal-title');
      const messageElement = document.getElementById('modal-message');
      const buttonsElement = document.getElementById('modal-buttons');
      
      const icons = {
        warning: '⚠️',
        error: '❌',
        success: '✅',
        info: 'ℹ️'
      };
      
      if (iconElement) {
        iconElement.textContent = icons[type] || icons.warning;
        iconElement.className = `modal-icon ${type}`;
      }
      
      if (titleElement) titleElement.textContent = title;
      if (messageElement) messageElement.textContent = message;
      
      if (buttonsElement) {
        buttonsElement.innerHTML = '';
        buttons.forEach(button => {
          const btn = document.createElement('button');
          btn.textContent = button.text;
          btn.className = `modal-button ${button.class || 'secondary'}`;
          btn.onclick = button.action;
          buttonsElement.appendChild(btn);
        });
      }
      
      this.overlay.style.display = 'block';
      document.body.style.overflow = 'hidden';
      
      setTimeout(() => {
        const firstButton = buttonsElement.querySelector('.modal-button');
        if (firstButton) firstButton.focus();
      }, 100);
    },
    
    close() {
      if (this.overlay) {
        this.overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
      }
    },
    
    confirm(message, title = 'Confirmação') {
      return new Promise((resolve) => {
        this.show({
          title,
          message,
          type: 'warning',
          buttons: [
            { 
              text: 'Cancelar', 
              class: 'secondary', 
              action: () => {
                this.close();
                resolve(false);
              }
            },
            { 
              text: 'Confirmar', 
              class: 'danger', 
              action: () => {
                this.close();
                resolve(true);
              }
            }
          ]
        });
      });
    },
    
    error(message, title = 'Erro') {
      return new Promise((resolve) => {
        this.show({
          title,
          message,
          type: 'error',
          buttons: [
            { 
              text: 'OK', 
              class: 'primary', 
              action: () => {
                this.close();
                resolve();
              }
            }
          ]
        });
      });
    },
    
    success(message, title = 'Sucesso') {
      return new Promise((resolve) => {
        this.show({
          title,
          message,
          type: 'success',
          buttons: [
            { 
              text: 'OK', 
              class: 'success', 
              action: () => {
                this.close();
                resolve();
              }
            }
          ]
        });
      });
    },
    
    info(message, title = 'Informação') {
      return new Promise((resolve) => {
        this.show({
          title,
          message,
          type: 'info',
          buttons: [
            { 
              text: 'OK', 
              class: 'primary', 
              action: () => {
                this.close();
                resolve();
              }
            }
          ]
        });
      });
    }
  };
  
  ModalSystem.init();
  window.ModalSystem = ModalSystem;

  let todasTarefas = [];
  
  function formatarDataHora(dataISO) {
    if (!dataISO) return '';
    const data = new Date(dataISO);
    return data.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatarData(dataISO) {
    if (!dataISO) return '';
    
    if (dataISO.includes('-') && dataISO.length === 10) {
      const [ano, mes, dia] = dataISO.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    
    const data = new Date(dataISO + 'T00:00:00');
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function converterDataParaISO(dataBR) {
    if (!dataBR) return '';
    if (dataBR.includes('-')) return dataBR;
    
    const [dia, mes, ano] = dataBR.split('/');
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  function normalizarDataParaInput(dataISO) {
    if (!dataISO) return '';
    
    if (dataISO.includes('-') && dataISO.length === 10) {
      return dataISO;
    }
    
    const data = new Date(dataISO);
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function carregarSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    fetch('/api/usuario')
      .then(res => res.json())
      .then(usuario => {
        sidebar.innerHTML = `
          <div class="profile">
            <img src="avatar.jpg" alt="Avatar" class="avatar">
            <span id="nome-usuario-sidebar">${usuario.nome}</span>
          </div>
          <div class="search-container">
            <input type="text" id="pesquisar-tarefas" placeholder="Pesquisar tarefas...">
            <button id="btn-pesquisar" title="Pesquisar">🔍</button>
            <button id="btn-limpar" title="Limpar filtros">✖️</button>
          </div>
          <div class="filtros">
            <label for="filtro-importancia">Importância:</label>
            <select id="filtro-importancia">
              <option value="">Todas</option>
              <option value="3">🔴 Alta</option>
              <option value="2">🟡 Média</option>
              <option value="1">🔵 Baixa</option>
            </select>
            
            <label for="filtro-status">Status:</label>
            <select id="filtro-status">
              <option value="">Todas</option>
              <option value="0">Pendentes</option>
              <option value="1">Concluídas</option>
            </select>
          </div>
          <nav>
            <h3>Listas</h3>
            <ul></ul>
            <a href="nova_lista.html" class="add-lista">+ Nova Lista</a>
          </nav>
          <div class="logout">
            <a href="/logout">🚪 Sair</a>
          </div>
        `;
        
        fetch('/api/listas')
          .then(res => res.json())
          .then(listas => {
            const ul = sidebar.querySelector('nav ul');
            const listasFixas = ['A Fazer', 'Diárias'];
            
            listas.forEach(lista => {
              const li = document.createElement('li');
              const isListaFixa = listasFixas.includes(lista.nome);
              
              li.innerHTML = `
                <a href="home.html?lista_id=${lista.id}">${lista.nome}</a>
                ${!isListaFixa ? `<button class="excluir-lista" data-id="${lista.id}" title="Excluir lista">🗑️</button>` : ''}
              `;
              ul.appendChild(li);
            });
            
            ul.querySelectorAll('.excluir-lista').forEach(btn => {
              btn.addEventListener('click', async function (e) {
                e.preventDefault();
                const confirmacao = await ModalSystem.confirm('Deseja realmente excluir esta lista e todas as tarefas nela?', 'Excluir Lista');
                if (confirmacao) {
                  fetch(`/api/listas/${btn.dataset.id}/excluir`, { method: 'POST' })
                    .then(() => location.href = "home.html");
                }
              });
            });
          });
          
        setTimeout(() => {
          const pesquisarInput = document.getElementById('pesquisar-tarefas');
          const btnPesquisar = document.getElementById('btn-pesquisar');
          const btnLimpar = document.getElementById('btn-limpar');
          const filtroImportancia = document.getElementById('filtro-importancia');
          const filtroStatus = document.getElementById('filtro-status');
          
          if (!pesquisarInput || !btnPesquisar || !btnLimpar || !filtroImportancia || !filtroStatus) {
            return;
          }
          
          let timeoutId;
          
          function aplicarFiltros() {
            const termo = pesquisarInput.value.trim();
            const importancia = filtroImportancia.value;
            const status = filtroStatus.value;
            const lista_id = new URLSearchParams(window.location.search).get('lista_id');
            
            let url = '/api/tarefas';
            
            if (termo || importancia || status || lista_id) {
              url = '/api/tarefas/pesquisar';
              const params = new URLSearchParams();
              if (termo) params.append('q', termo);
              if (lista_id) params.append('lista_id', lista_id);
              if (importancia) params.append('importancia', importancia);
              if (status) params.append('concluida', status);
              url += '?' + params.toString();
            }
            
            fetch(url)
              .then(res => {
                if (!res.ok) {
                  throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.json();
              })
              .then(tarefas => {
                
                if (tarefas.erro) {
                  ModalSystem.error(`Erro: ${tarefas.erro}${tarefas.detalhes ? ' - ' + tarefas.detalhes : ''}`);
                  return;
                }
                
                if (!Array.isArray(tarefas)) {
                  ModalSystem.error('Erro: resposta do servidor inválida');
                  return;
                }
                
                atualizarListaTarefas(tarefas);
              })
              .catch(err => {
                ModalSystem.error(`Erro ao pesquisar tarefas: ${err.message}`);
                
                carregarTarefas();
              });
          }
          
          function limparFiltros() {
            pesquisarInput.value = '';
            filtroImportancia.value = '';
            filtroStatus.value = '';
            aplicarFiltros();
          }
          
          pesquisarInput.addEventListener('input', () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(aplicarFiltros, 300);
          });
          
          pesquisarInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              aplicarFiltros();
            }
          });
          
          if (btnPesquisar) {
            btnPesquisar.addEventListener('click', aplicarFiltros);
          }
          
          if (btnLimpar) {
            btnLimpar.addEventListener('click', limparFiltros);
          }
          
          filtroImportancia.addEventListener('change', aplicarFiltros);
          filtroStatus.addEventListener('change', aplicarFiltros);
        }, 100);
      });
  }

  function carregarAnexos(tarefaId) {
    fetch(`/api/tarefas/${tarefaId}/anexos`)
      .then(res => res.json())
      .then(anexos => {
        const container = document.getElementById(`anexos-${tarefaId}`);
        if (!container) return;
        
        if (anexos.length > 0) {
          container.innerHTML = `
            <div class="anexos-header">📎 Anexos (${anexos.length})</div>
            <div class="anexos-grid">
              ${anexos.map(anexo => `
                <div class="anexo-item">
                  <span class="anexo-nome">${anexo.nome_arquivo}</span>
                  <div class="anexo-acoes">
                    <a href="/uploads/${anexo.caminho_arquivo}" target="_blank" title="Abrir anexo">👁️</a>
                    <a href="/uploads/${anexo.caminho_arquivo}" download="${anexo.nome_arquivo}" title="Baixar anexo">💾</a>
                    <button onclick="excluirAnexo(${anexo.id}, event)" title="Excluir anexo">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      });
  }

  window.excluirAnexo = async function(anexoId, event) {
    event.preventDefault();
    event.stopPropagation();
    
    const confirmacao = await ModalSystem.confirm('Deseja realmente excluir este anexo?', 'Excluir Anexo');
    if (confirmacao) {
      fetch(`/api/anexos/${anexoId}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(() => {
          location.reload();
        });
    }
  };

  function atualizarListaTarefas(tarefas) {
    const tasksSection = document.querySelector('.tasks ul');
    if (!tasksSection) return;
    
    todasTarefas = tarefas;
    
    const tarefasPendentes = tarefas.filter(t => !t.concluida);
    const tarefasConcluidas = tarefas.filter(t => t.concluida);
    
    tasksSection.innerHTML = '';
    
    if (tarefasPendentes.length > 0) {
      const secaoPendentes = document.createElement('div');
      secaoPendentes.className = 'secao-tarefas';
      secaoPendentes.innerHTML = `
        <h3 class="titulo-secao">📋 Pendentes (${tarefasPendentes.length})</h3>
        <div class="lista-tarefas pendentes"></div>
      `;
      tasksSection.appendChild(secaoPendentes);
      
      const listaPendentes = secaoPendentes.querySelector('.lista-tarefas');
      tarefasPendentes.forEach(tarefa => {
        listaPendentes.appendChild(criarTarefa(tarefa));
      });
    }
    
    if (tarefasConcluidas.length > 0) {
      const secaoConcluidas = document.createElement('div');
      secaoConcluidas.className = 'secao-tarefas';
      secaoConcluidas.innerHTML = `
        <h3 class="titulo-secao">✅ Concluídas (${tarefasConcluidas.length})</h3>
        <div class="lista-tarefas concluidas"></div>
      `;
      tasksSection.appendChild(secaoConcluidas);
      
      const listaConcluidas = secaoConcluidas.querySelector('.lista-tarefas');
      tarefasConcluidas.forEach(tarefa => {
        listaConcluidas.appendChild(criarTarefa(tarefa));
      });
    }
    
    if (tarefas.length === 0) {
      tasksSection.innerHTML = '<p class="sem-tarefas">Nenhuma tarefa encontrada</p>';
    }
    
    configurarEventosTarefas();
    
    tarefas.forEach(tarefa => {
      if (tarefa.id) {
        carregarAnexos(tarefa.id);
      }
    });
  }
  
  function criarTarefa(tarefa) {
    const li = document.createElement('li');
    const importanciaIcon = tarefa.importancia === 3 ? '🔴' : tarefa.importancia === 2 ? '🟡' : '🔵';
    const dataVencimento = tarefa.data ? `<span class="date">📅 Vence: ${formatarData(tarefa.data)}</span>` : '';
    const dataCriacao = formatarDataHora(tarefa.criado_em);
    
    li.innerHTML = `
      <div class="tarefa-container">
        <div class="tarefa-header">
          <input type="checkbox" class="tarefa-checkbox" ${tarefa.concluida ? 'checked' : ''} data-id="${tarefa.id}">
          <div class="tarefa-principal">
            <div class="tarefa-titulo">
              <span class="importancia-icon" title="Importância: ${tarefa.importancia === 3 ? 'Alta' : tarefa.importancia === 2 ? 'Média' : 'Baixa'}">${importanciaIcon}</span>
              <h3 class="titulo">${tarefa.titulo}</h3>
            </div>
            ${tarefa.descricao ? `<div class="descricao">${tarefa.descricao}</div>` : ''}
            <div class="tarefa-meta">
              <span class="lista-nome">${tarefa.lista_nome}</span>
              ${dataVencimento}
              ${dataCriacao ? `<small class="data-criacao">📅 Criado em ${dataCriacao}</small>` : ''}
            </div>
          </div>
          <div class="tarefa-acoes">
            <button class="editar" data-id="${tarefa.id}" title="Editar tarefa">✏️</button>
            <button class="excluir" data-id="${tarefa.id}" title="Excluir tarefa">🗑️</button>
          </div>
        </div>
        <div class="anexos-lista" id="anexos-${tarefa.id}"></div>
      </div>
    `;
    
    if (tarefa.concluida) {
      li.classList.add('concluida');
    }
    
    return li;
  }

  function configurarEventosTarefas() {
    document.querySelectorAll('.tarefa-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', function () {
        const tarefaId = this.dataset.id;
        const concluida = this.checked;
        const rota = concluida ? 'concluir' : 'reabrir';
        
        fetch(`/api/tarefas/${tarefaId}/${rota}`, { method: 'POST' })
          .then(response => {
            if (response.ok) {
              location.reload();
            } else {
              checkbox.checked = !checkbox.checked;
              ModalSystem.error('Erro ao atualizar tarefa. Tente novamente.');
            }
          })
          .catch(error => {
            checkbox.checked = !checkbox.checked;
            ModalSystem.error('Erro de conexão ao atualizar tarefa. Tente novamente.');
          });
      });
    });

    document.querySelectorAll('.excluir').forEach(btn => {
      btn.addEventListener('click', async function () {
        const confirmacao = await ModalSystem.confirm('Deseja realmente excluir esta tarefa?', 'Excluir Tarefa');
        if (confirmacao) {
          fetch(`/api/tarefas/${btn.dataset.id}/excluir`, { method: 'POST' })
            .then(response => {
              if (response.ok) {
                location.reload();
              }
            });
        }
      });
    });

    document.querySelectorAll('.editar').forEach(btn => {
      btn.addEventListener('click', function () {
        const lista_id = new URLSearchParams(window.location.search).get('lista_id');
        window.location.href = `editar_tarefa.html?id=${btn.dataset.id}${lista_id ? `&lista_id=${lista_id}` : ''}`;
      });
    });
  }

  function carregarTarefas() {
    const lista_id = new URLSearchParams(window.location.search).get('lista_id');
    const url = lista_id ? `/api/tarefas?lista_id=${lista_id}` : '/api/tarefas';
    
    fetch(url)
      .then(res => res.json())
      .then(tarefas => {
        atualizarListaTarefas(tarefas);
        
        if (lista_id) {
          fetch(`/api/listas/${lista_id}`)
            .then(res => res.json())
            .then(lista => {
              document.getElementById('nome-lista').textContent = lista.nome;
            });
        } else {
          document.getElementById('nome-lista').textContent = 'Todas as Tarefas';
        }
      });
  }

  if (window.location.pathname.endsWith('home.html')) {
    carregarSidebar();
    carregarTarefas();
  }

  const addTaskLink = document.getElementById('add-task-link');
  if (addTaskLink) {
    const lista_id = new URLSearchParams(window.location.search).get('lista_id');
    addTaskLink.href = lista_id ? `adicionar_tarefa.html?lista_id=${lista_id}` : 'adicionar_tarefa.html';
  }

  if (window.location.pathname.endsWith('adicionar_tarefa.html')) {
    fetch('/api/listas')
      .then(res => res.json())
      .then(listas => {
        const select = document.getElementById('list');
        select.innerHTML = '';
        listas.forEach(lista => {
          select.innerHTML += `<option value="${lista.id}">${lista.nome}</option>`;
        });
        
        const params = new URLSearchParams(window.location.search);
        const lista_id = params.get('lista_id');
        if (lista_id) {
          select.value = lista_id;
        } else {
          const aFazerOption = Array.from(select.options).find(option => option.text === 'A Fazer');
          if (aFazerOption) select.value = aFazerOption.value;
        }
      });

    const addTaskForm = document.querySelector('form');
    if (addTaskForm) {
      addTaskForm.addEventListener('submit', function (e) {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('titulo', document.getElementById('task').value);
        formData.append('descricao', document.getElementById('descricao').value);
        formData.append('lista_id', document.getElementById('list').value);
        formData.append('data', document.getElementById('date').value);
        formData.append('importancia', document.getElementById('importancia').value);
        
        const arquivos = document.getElementById('anexos').files;
        for (let i = 0; i < arquivos.length; i++) {
          formData.append('anexos', arquivos[i]);
        }
        
        fetch('/api/tarefas', {
          method: 'POST',
          body: formData
        })
        .then(res => res.json())
        .then(data => {
          if (data.erro) {
            ModalSystem.error('Erro: ' + data.erro);
          } else {
            const returnUrl = new URLSearchParams(window.location.search).get('lista_id');
            window.location.href = returnUrl ? `home.html?lista_id=${returnUrl}` : 'home.html';
          }
        })
        .catch(err => {
          ModalSystem.error('Erro ao criar tarefa');
        });
      });
    }
  }

  if (window.location.pathname.endsWith('editar_tarefa.html')) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const lista_id_origem = params.get('lista_id');
    
    if (id) {
      fetch('/api/tarefas/' + id)
        .then(res => res.json())
        .then(tarefa => {
          document.getElementById('task').value = tarefa.titulo;
          document.getElementById('descricao').value = tarefa.descricao || '';
          document.getElementById('date').value = normalizarDataParaInput(tarefa.data || '');
          document.getElementById('importancia').value = tarefa.importancia || 1;
          
          carregarAnexosExistentes(id);
          
          fetch('/api/listas')
            .then(res => res.json())
            .then(listas => {
              const select = document.getElementById('list');
              select.innerHTML = '';
              listas.forEach(lista => {
                select.innerHTML += `<option value="${lista.id}">${lista.nome}</option>`;
              });
              select.value = tarefa.lista_id;
            });
        });

      const editForm = document.getElementById('edit-task-form');
      if (editForm) {
        editForm.addEventListener('submit', function (e) {
          e.preventDefault();
          
          const formData = new FormData();
          formData.append('titulo', document.getElementById('task').value);
          formData.append('descricao', document.getElementById('descricao').value);
          formData.append('lista_id', document.getElementById('list').value);
          formData.append('data', document.getElementById('date').value);
          formData.append('importancia', document.getElementById('importancia').value);
          
          const arquivos = document.getElementById('anexos').files;
          for (let i = 0; i < arquivos.length; i++) {
            formData.append('anexos', arquivos[i]);
          }
          
          fetch('/api/tarefas/' + id + '/editar', {
            method: 'POST',
            body: formData
          })
          .then(res => res.json())
          .then(data => {
            if (data.erro) {
              ModalSystem.error('Erro: ' + data.erro);
            } else {
              const returnUrl = lista_id_origem || document.getElementById('list').value;
              window.location.href = returnUrl ? `home.html?lista_id=${returnUrl}` : 'home.html';
            }
          })
          .catch(err => {
            ModalSystem.error('Erro ao editar tarefa');
          });
        });
      }
    }
  }

  if (window.location.pathname.endsWith('nova_lista.html')) {
    const mainDiv = document.querySelector('.main');
    if (mainDiv) {
      mainDiv.innerHTML = `
        <header>
          <h1>Nova Lista</h1>
        </header>
        <form id="nova-lista-form">
          <label for="nome-lista">Nome da Lista:</label>
          <input type="text" id="nome-lista" name="nome-lista" required>
          
          <button type="submit">Criar Lista</button>
          <a href="home.html" class="voltar">Voltar</a>
        </form>
      `;
      
      const form = document.getElementById('nova-lista-form');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          
          const nome = document.getElementById('nome-lista').value;
          
          fetch('/api/listas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome })
          })
          .then(res => res.json())
          .then(data => {
            if (data.erro) {
              const erroDiv = document.getElementById('erro-lista');
              if (erroDiv) {
                erroDiv.textContent = data.erro;
              }
            } else {
              window.location.href = 'home.html';
            }
          });
        });
      }
    }
    
    carregarSidebar();
  }

  function atualizarDataAtual() {
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const dias = [
      "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
      "Quinta-feira", "Sexta-feira", "Sábado"
    ];
    const hoje = new Date();
    const texto = `${dias[hoje.getDay()]}, ${hoje.getDate()} de ${meses[hoje.getMonth()]}`;
    const dataElement = document.getElementById('data-dia');
    if (dataElement) {
      dataElement.textContent = texto;
    }
  }

  function carregarAnexosExistentes(tarefaId) {
    fetch(`/api/tarefas/${tarefaId}/anexos`)
      .then(res => res.json())
      .then(anexos => {
        const container = document.getElementById('anexos-existentes');
        if (!container) return;
        
        if (anexos.length > 0) {
          container.innerHTML = `
            <label>📎 Anexos Existentes (${anexos.length}):</label>
            <div class="anexos-grid">
              ${anexos.map(anexo => `
                <div class="anexo-item">
                  <span class="anexo-nome">${anexo.nome_arquivo}</span>
                  <div class="anexo-acoes">
                    <a href="/uploads/${anexo.caminho_arquivo}" target="_blank" title="Abrir anexo">👁️</a>
                    <a href="/uploads/${anexo.caminho_arquivo}" download="${anexo.nome_arquivo}" title="Baixar anexo">💾</a>
                    <button onclick="excluirAnexo(${anexo.id}, event)" title="Excluir anexo">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        } else {
          container.innerHTML = '<p>Nenhum anexo encontrado.</p>';
        }
      });
  }

  atualizarDataAtual();
});
