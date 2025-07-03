const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const db = require('./database');
const app = express();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar)$/i;
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/txt', 'application/zip', 'application/x-rar-compressed'
    ];
    
    const extname = allowedExtensions.test(file.originalname.toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'agenda_secret',
  resave: false,
  saveUninitialized: false
}));

function requireLogin(req, res, next) {
  if (!req.session.usuarioId) return res.redirect('/login.html');
  next();
}

app.get('/api/usuario', requireLogin, (req, res) => {
  res.json({ nome: req.session.usuarioNome });
});

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

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

app.get('/api/listas', requireLogin, (req, res) => {
  db.all(
    `SELECT * FROM listas WHERE usuario_id = 0 OR usuario_id = ? ORDER BY fixa DESC, nome ASC`,
    [req.session.usuarioId],
    (err, rows) => {
      if (err) return res.status(500).end();
      res.json(rows);
    }
  );
});

app.get('/api/listas/:id', requireLogin, (req, res) => {
  db.get(
    'SELECT * FROM listas WHERE id = ? AND (usuario_id = 0 OR usuario_id = ?)',
    [req.params.id, req.session.usuarioId],
    (err, row) => {
      if (!row) return res.status(404).end();
      res.json(row);
    }
  );
});

app.post('/api/listas', requireLogin, (req, res) => {
  const { nome } = req.body;
  db.run(
    'INSERT INTO listas (nome, usuario_id) VALUES (?, ?)',
    [nome, req.session.usuarioId],
    function (err) {
      if (err) return res.status(500).json({ erro: 'Erro ao criar lista' });
      res.json({ id: this.lastID });
    }
  );
});

app.post('/api/listas/:id/excluir', requireLogin, (req, res) => {
  db.run(
    'DELETE FROM listas WHERE id = ? AND usuario_id = ?',
    [req.params.id, req.session.usuarioId],
    () => res.end()
  );
});

app.get('/api/tarefas', requireLogin, (req, res) => {
  const { lista_id } = req.query;
  let sql = `
    SELECT t.*, l.nome as lista_nome 
    FROM tarefas t 
    JOIN listas l ON t.lista_id = l.id 
    WHERE t.usuario_id = ?
  `;
  let params = [req.session.usuarioId];
  
  if (lista_id) {
    sql += ' AND t.lista_id = ?';
    params.push(lista_id);
  }
  
  sql += ' ORDER BY t.concluida ASC, t.importancia DESC, t.criado_em DESC';
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro interno do servidor' });
    }
    res.json(rows);
  });
});

app.get('/api/tarefas/pesquisar', requireLogin, (req, res) => {
  const { q, lista_id, importancia, concluida } = req.query;
  
  let sql = `
    SELECT t.*, l.nome as lista_nome 
    FROM tarefas t 
    JOIN listas l ON t.lista_id = l.id 
    WHERE t.usuario_id = ?
  `;
  let params = [req.session.usuarioId];
  
  if (q && q.trim()) {
    sql += ' AND (t.titulo LIKE ? OR COALESCE(t.descricao, "") LIKE ?)';
    params.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }
  
  if (lista_id) {
    sql += ' AND t.lista_id = ?';
    params.push(lista_id);
  }
  
  if (importancia) {
    sql += ' AND t.importancia = ?';
    params.push(importancia);
  }
  
  if (concluida !== undefined && concluida !== '') {
    sql += ' AND t.concluida = ?';
    params.push(parseInt(concluida));
  }
  
  sql += ' ORDER BY t.concluida ASC, t.importancia DESC, t.criado_em DESC';
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ 
        erro: 'Erro ao pesquisar tarefas',
        detalhes: err.message 
      });
    }
    res.json(rows);
  });
});

app.get('/api/tarefas/:id', requireLogin, (req, res) => {
  db.get(
    'SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?',
    [req.params.id, req.session.usuarioId],
    (err, row) => {
      if (!row) return res.status(404).end();
      res.json(row);
    }
  );
});

app.post('/api/tarefas', requireLogin, upload.array('anexos', 5), (req, res) => {
  const { titulo, descricao = '', lista_id, data, importancia = 1 } = req.body;
  const agora = new Date().toISOString();
  
  db.run(
    'INSERT INTO tarefas (usuario_id, lista_id, titulo, descricao, data, importancia, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.session.usuarioId, lista_id, titulo, descricao, data, importancia, agora, agora],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao criar tarefa' });
      }
      
      const tarefaId = this.lastID;
      
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          db.run(
            'INSERT INTO anexos (tarefa_id, nome_arquivo, caminho_arquivo, tamanho, tipo) VALUES (?, ?, ?, ?, ?)',
            [tarefaId, file.originalname, file.filename, file.size, file.mimetype]
          );
        });
      }
      
      res.json({ id: tarefaId });
    }
  );
});

app.post('/api/tarefas/:id/editar', requireLogin, upload.array('anexos', 5), (req, res) => {
  const { titulo, descricao = '', lista_id, data, importancia = 1 } = req.body;
  const agora = new Date().toISOString();
  
  db.run(
    'UPDATE tarefas SET titulo = ?, descricao = ?, lista_id = ?, data = ?, importancia = ?, atualizado_em = ? WHERE id = ? AND usuario_id = ?',
    [titulo, descricao, lista_id, data, importancia, agora, req.params.id, req.session.usuarioId],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao editar tarefa' });
      }
      
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          db.run(
            'INSERT INTO anexos (tarefa_id, nome_arquivo, caminho_arquivo, tamanho, tipo) VALUES (?, ?, ?, ?, ?)',
            [req.params.id, file.originalname, file.filename, file.size, file.mimetype]
          );
        });
      }
      
      res.json({ sucesso: true });
    }
  );
});

app.post('/api/tarefas/:id/concluir', requireLogin, (req, res) => {
  db.run(
    'UPDATE tarefas SET concluida = 1, atualizado_em = ? WHERE id = ? AND usuario_id = ?',
    [new Date().toISOString(), req.params.id, req.session.usuarioId],
    () => res.end()
  );
});

app.post('/api/tarefas/:id/reabrir', requireLogin, (req, res) => {
  db.run(
    'UPDATE tarefas SET concluida = 0, atualizado_em = ? WHERE id = ? AND usuario_id = ?',
    [new Date().toISOString(), req.params.id, req.session.usuarioId],
    () => res.end()
  );
});

app.post('/api/tarefas/:id/excluir', requireLogin, (req, res) => {
  db.run(
    'DELETE FROM tarefas WHERE id = ? AND usuario_id = ?',
    [req.params.id, req.session.usuarioId],
    () => res.end()
  );
});

app.get('/api/tarefas/:id/anexos', requireLogin, (req, res) => {
  db.all(
    `SELECT a.* FROM anexos a 
     JOIN tarefas t ON a.tarefa_id = t.id 
     WHERE t.id = ? AND t.usuario_id = ?`,
    [req.params.id, req.session.usuarioId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao buscar anexos' });
      }
      res.json(rows);
    }
  );
});

app.delete('/api/anexos/:id', requireLogin, (req, res) => {
  db.get(
    `SELECT a.*, t.usuario_id FROM anexos a 
     JOIN tarefas t ON a.tarefa_id = t.id 
     WHERE a.id = ?`,
    [req.params.id],
    (err, anexo) => {
      if (!anexo || anexo.usuario_id !== req.session.usuarioId) {
        return res.status(404).json({ erro: 'Anexo não encontrado' });
      }
      
      const filePath = path.join(__dirname, 'uploads', anexo.caminho_arquivo);
      fs.unlink(filePath, (err) => {});
      
      db.run('DELETE FROM anexos WHERE id = ?', [req.params.id], (err) => {
        if (err) {
          return res.status(500).json({ erro: 'Erro ao excluir anexo' });
        }
        res.json({ sucesso: true });
      });
    }
  );
});

app.get('/', (req, res) => {
  if (req.session.usuarioId) {
    res.redirect('/home.html');
  } else {
    res.redirect('/login.html');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
