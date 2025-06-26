const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./database');
const app = express();

app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'agenda_secret',
  resave: false,
  saveUninitialized: false
}));

function requireLogin(req, res, next) {
  if (!req.session.usuarioId) return res.redirect('/login.html');
  next();
}

// Retornar o usuário logado
app.get('/api/usuario', requireLogin, (req, res) => {
  res.json({ nome: req.session.usuarioNome });
});

// Registrar usuário
app.post('/registrar', async (req, res) => {
  const { nome, email, senha } = req.body;
  const hash = await bcrypt.hash(senha, 10);
  db.run('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [nome, email, hash], function(err) {
    if (err) {
      return res.redirect('/registro.html?erro=1');
    }
    req.session.usuarioId = this.lastID;
    req.session.usuarioNome = nome;
    res.redirect('/home.html');
  });
});

// Logar usuário
app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  db.get('SELECT * FROM usuarios WHERE email = ?', [email], async (err, user) => {
    if (!user) return res.redirect('/login.html?erro=1');
    const match = await bcrypt.compare(senha, user.senha);
    if (!match) return res.redirect('/login.html?erro=1');
    req.session.usuarioId = user.id;
    req.session.usuarioNome = user.nome;
    res.redirect('/home.html');
  });
});

// deslogar
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// Listar todos usuários em lsita
app.get('/api/listas', requireLogin, (req, res) => {
  db.all(
    `SELECT * FROM listas WHERE usuario_id = 0 OR usuario_id = ? ORDER BY fixa DESC, nome ASC`,
    [req.session.usuarioId],
    (err, rows) => res.json(rows)
  );
});

// Criar lista personazizda 
app.post('/api/listas', requireLogin, (req, res) => {
  const { nome } = req.body;
  db.run(
    `INSERT INTO listas (usuario_id, nome, fixa) VALUES (?, ?, 0)`,
    [req.session.usuarioId, nome],
    function (err) {
      if (err) return res.status(400).json({ erro: 'Já existe uma lista com esse nome.' });
      res.json({ id: this.lastID });
    }
  );
});

// Excluir lista
app.post('/api/listas/:id/excluir', requireLogin, (req, res) => {
  db.get(
    `SELECT * FROM listas WHERE id = ? AND usuario_id = ? AND fixa = 0`,
    [req.params.id, req.session.usuarioId],
    (err, lista) => {
      if (!lista) return res.status(403).end();
      db.run(`DELETE FROM tarefas WHERE lista_id = ? AND usuario_id = ?`, [req.params.id, req.session.usuarioId], () => {
        db.run(`DELETE FROM listas WHERE id = ? AND usuario_id = ?`, [req.params.id, req.session.usuarioId], () => {
          res.end();
        });
      });
    }
  );
});

// Listar tarefas
app.get('/api/tarefas', requireLogin, (req, res) => {
  const listaId = req.query.lista_id;
  let sql = 'SELECT tarefas.*, listas.nome as lista_nome FROM tarefas JOIN listas ON tarefas.lista_id = listas.id WHERE tarefas.usuario_id = ?';
  let params = [req.session.usuarioId];
  if (listaId) {
    sql += ' AND tarefas.lista_id = ?';
    params.push(listaId);
  }
  db.all(sql, params, (err, rows) => res.json(rows));
});

// Listar tarefa
app.get('/api/tarefas/:id', requireLogin, (req, res) => {
  db.get(
    `SELECT tarefas.*, listas.nome as lista_nome FROM tarefas JOIN listas ON tarefas.lista_id = listas.id WHERE tarefas.id = ? AND tarefas.usuario_id = ?`,
    [req.params.id, req.session.usuarioId],
    (err, row) => {
      if (!row) return res.status(404).end();
      res.json(row);
    }
  );
});

// Criar tarefa
app.post('/api/tarefas', requireLogin, (req, res) => {
  const { titulo, lista_id, data } = req.body;
  db.run(
    'INSERT INTO tarefas (usuario_id, lista_id, titulo, data) VALUES (?, ?, ?, ?)',
    [req.session.usuarioId, lista_id, titulo, data],
    function (err) {
      if (err) return res.status(500).end();
      res.json({ id: this.lastID });
    }
  );
});

// Editar tarefa
app.post('/api/tarefas/:id/editar', requireLogin, (req, res) => {
  const { titulo, lista_id, data } = req.body;
  db.run(
    'UPDATE tarefas SET titulo = ?, lista_id = ?, data = ? WHERE id = ? AND usuario_id = ?',
    [titulo, lista_id, data, req.params.id, req.session.usuarioId],
    function (err) {
      if (err) return res.status(500).end();
      res.end();
    }
  );
});

// Marcar como concluida
app.post('/api/tarefas/:id/concluir', requireLogin, (req, res) => {
  db.run('UPDATE tarefas SET concluida = 1 WHERE id = ? AND usuario_id = ?', [req.params.id, req.session.usuarioId], function(err) {
    if (err) return res.status(500).end();
    res.end();
  });
});

// Marcar como n concluida 
app.post('/api/tarefas/:id/desfazer', requireLogin, (req, res) => {
  db.run('UPDATE tarefas SET concluida = 0 WHERE id = ? AND usuario_id = ?', [req.params.id, req.session.usuarioId], function(err) {
    if (err) return res.status(500).end();
    res.end();
  });
});

// Excluir tarefa
app.post('/api/tarefas/:id/excluir', requireLogin, (req, res) => {
  db.run('DELETE FROM tarefas WHERE id = ? AND usuario_id = ?', [req.params.id, req.session.usuarioId], function(err) {
    if (err) return res.status(500).end();
    res.end();
  });
});

const paginasProtegidas = [
  '/home.html', '/afazer.html', '/mercado.html', '/viagem.html',
  '/filmes.html', '/casa.html', '/trabalho.html', '/adicionar_tarefa.html', '/nova_lista.html', '/editar_tarefa.html'
];
paginasProtegidas.forEach(pagina => {
  app.get(pagina, requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, pagina.replace('/', '')));
  });
});

// login/home redirect
app.get('/', (req, res) => {
  if (req.session.usuarioId) return res.redirect('/home.html');
  res.redirect('/login.html');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});