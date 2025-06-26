document.addEventListener('DOMContentLoaded', function () {
  // Sidebar dinâmica
  function carregarSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    // Busca o nome do usuário logado
    fetch('/api/usuario')
      .then(res => res.json())
      .then(usuario => {
        sidebar.innerHTML = `
          <div class="profile">
            <img src="avatar.jpg" alt="Avatar" class="avatar">
            <span id="nome-usuario-sidebar">${usuario.nome}</span>
          </div>
          <input type="text" placeholder="Pesquisar...">
          <nav>
            <ul></ul>
          </nav>
          <a href="nova_lista.html" class="new-list">+ Nova Lista</a>
          <a href="/logout" class="new-list" style="color:red;">Sair</a>
        `;
        fetch('/api/listas')
          .then(res => res.json())
          .then(listas => {
            const ul = sidebar.querySelector('nav ul');
            ul.innerHTML = '';
            listas.forEach(lista => {
              const pagina = 'home.html?lista_id=' + lista.id;
              const active = (new URLSearchParams(window.location.search).get('lista_id') == lista.id);
              const li = document.createElement('li');
              li.innerHTML = `
                <a href="${pagina}" ${active ? 'class="active"' : ''}>
                  ${lista.nome}
                </a>
                ${Number(lista.fixa) === 0 ? `<button class="excluir-lista" data-id="${lista.id}" title="Excluir lista" style="margin-left:5px;color:red;background:none;border:none;cursor:pointer;">🗑️</button>` : ''}
              `;
              ul.appendChild(li);
            });
            // Botão excluir lista
            ul.querySelectorAll('.excluir-lista').forEach(btn => {
              btn.addEventListener('click', function (e) {
                e.preventDefault();
                if (confirm('Deseja realmente excluir esta lista e todas as tarefas nela?')) {
                  fetch(`/api/listas/${btn.dataset.id}/excluir`, { method: 'POST' })
                    .then(() => location.href = "home.html");
                }
              });
            });
          });
      });
  }
  carregarSidebar();

  // Carregar
  const tasksSection = document.querySelector('.tasks ul');
  if (tasksSection) {
    const params = new URLSearchParams(window.location.search);
    const lista_id = params.get('lista_id');
    let url = '/api/tarefas';
    if (lista_id) url += '?lista_id=' + lista_id;
    fetch(url)
      .then(res => res.json())
      .then(tarefas => {
        tasksSection.innerHTML = '';
        tarefas.forEach(tarefa => {
          const li = document.createElement('li');
          li.innerHTML = `
            <input type="checkbox" ${tarefa.concluida ? 'checked' : ''} data-id="${tarefa.id}">
            <span>${tarefa.titulo}</span>
            <small>${tarefa.lista_nome}</small>
            ${tarefa.data ? `<span class="date">${tarefa.data}</span>` : ''}
            <button class="editar" data-id="${tarefa.id}" style="margin-left:10px;">✏️</button>
            <button class="excluir" data-id="${tarefa.id}" style="margin-left:5px;">🗑️</button>
          `;
          if (tarefa.concluida) {
            li.style.opacity = '0.5';
            li.style.textDecoration = 'line-through';
          }
          tasksSection.appendChild(li);
        });

        // Mudar status
        document.querySelectorAll('.tasks input[type="checkbox"]').forEach(function (checkbox) {
          checkbox.addEventListener('change', function () {
            const rota = checkbox.checked ? 'concluir' : 'desfazer';
            fetch(`/api/tarefas/${checkbox.dataset.id}/${rota}`, { method: 'POST' })
              .then(() => location.reload());
          });
        });

        // Excluir
        document.querySelectorAll('.tasks .excluir').forEach(function (btn) {
          btn.addEventListener('click', function () {
            fetch(`/api/tarefas/${btn.dataset.id}/excluir`, { method: 'POST' })
              .then(() => location.reload());
          });
        });

        // Editar tarefa
        document.querySelectorAll('.tasks .editar').forEach(function (btn) {
          btn.addEventListener('click', function () {
            window.location.href = `editar_tarefa.html?id=${btn.dataset.id}`;
          });
        });
      });
  }

  // Adicionar tarefa
  if (window.location.pathname.endsWith('adicionar_tarefa.html')) {
    // Popular listas no select
    fetch('/api/listas')
      .then(res => res.json())
      .then(listas => {
        const select = document.getElementById('list');
        select.innerHTML = '';
        listas.forEach(lista => {
          select.innerHTML += `<option value="${lista.id}">${lista.nome}</option>`;
        });
        // Selecionar a lista
        const params = new URLSearchParams(window.location.search);
        const lista_id = params.get('lista_id');
        if (lista_id) select.value = lista_id;
      });

    const addTaskForm = document.querySelector('form');
    addTaskForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const titulo = document.getElementById('task').value;
      const lista_id = document.getElementById('list').value;
      const data = document.getElementById('date').value;
      fetch('/api/tarefas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `titulo=${encodeURIComponent(titulo)}&lista_id=${encodeURIComponent(lista_id)}&data=${encodeURIComponent(data)}`
      }).then(() => window.location.href = `home.html?lista_id=${lista_id}`);
    });
  }

  // Editar tarefa
  if (window.location.pathname.endsWith('editar_tarefa.html')) {
    let tarefa;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    fetch('/api/tarefas/' + id)
      .then(res => res.json())
      .then(t => {
        tarefa = t;
        document.getElementById('task').value = tarefa.titulo;
        document.getElementById('date').value = tarefa.data || '';
        // Popular listas no select e selecionar a correta
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

    document.getElementById('edit-task-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const titulo = document.getElementById('task').value;
      const lista_id = document.getElementById('list').value;
      const data = document.getElementById('date').value;
      fetch('/api/tarefas/' + id + '/editar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `titulo=${encodeURIComponent(titulo)}&lista_id=${encodeURIComponent(lista_id)}&data=${encodeURIComponent(data)}`
      }).then(() => window.location.href = `home.html?lista_id=${lista_id}`);
    });
  }

  // Nova lista
  if (window.location.pathname.endsWith('nova_lista.html')) {
    const main = document.querySelector('.main');
    main.innerHTML = `
      <header>
        <h1>Criar Nova Lista</h1>
      </header>
      <form id="nova-lista-form">
        <label for="nome-lista">Nome da Lista:</label>
        <input type="text" id="nome-lista" name="nome-lista" required>
        <button type="submit">Criar</button>
        <p id="erro-lista" style="color:red;"></p>
      </form>
    `;
    document.getElementById('nova-lista-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const nome = document.getElementById('nome-lista').value;
      fetch('/api/listas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `nome=${encodeURIComponent(nome)}`
      })
        .then(res => res.json())
        .then(data => {
          if (data.erro) {
            document.getElementById('erro-lista').textContent = data.erro;
          } else {
            window.location.href = `home.html?lista_id=${data.id}`;
          }
        });
    });
  }

  // Atualizar o nome da lista e a data do dia nas páginas principais
  if (document.getElementById('nome-lista')) {
    function atualizarNomeLista() {
      const params = new URLSearchParams(window.location.search);
      const lista_id = params.get('lista_id');
      if (lista_id) {
        fetch('/api/listas')
          .then(res => res.json())
          .then(listas => {
            const lista = listas.find(l => String(l.id) === String(lista_id));
            if (lista) {
              document.getElementById('nome-lista').textContent = lista.nome;
            }
          });
      } else {
        document.getElementById('nome-lista').textContent = "Meu Dia";
      }
    }
    atualizarNomeLista();

    function atualizarData() {
      const meses = [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
      ];
      const dias = [
        "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
        "Quinta-feira", "Sexta-feira", "Sábado"
      ];
      const hoje = new Date();
      const texto = `${dias[hoje.getDay()]}, ${hoje.getDate()} de ${meses[hoje.getMonth()]}`;
      document.getElementById('data-dia').textContent = texto;
    }
    atualizarData();
  }
});