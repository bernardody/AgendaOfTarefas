const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('agenda.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    email TEXT UNIQUE,
    senha TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS listas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    nome TEXT,
    fixa INTEGER DEFAULT 0,
    UNIQUE(usuario_id, nome)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tarefas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    lista_id INTEGER,
    titulo TEXT,
    descricao TEXT,
    data TEXT,
    importancia INTEGER DEFAULT 1,
    concluida INTEGER DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY(lista_id) REFERENCES listas(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS anexos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tarefa_id INTEGER,
    nome_arquivo TEXT,
    caminho_arquivo TEXT,
    tamanho INTEGER,
    tipo TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tarefa_id) REFERENCES tarefas(id)
  )`);

  db.run(`ALTER TABLE tarefas ADD COLUMN importancia INTEGER DEFAULT 1`, () => {});
  db.run(`ALTER TABLE tarefas ADD COLUMN descricao TEXT`, () => {});
  db.run(`ALTER TABLE tarefas ADD COLUMN criado_em DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});
  db.run(`ALTER TABLE tarefas ADD COLUMN atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});

  const listasFixas = [
    'Diárias', 'A Fazer'
  ];
  listasFixas.forEach(nome => {
    db.run(
      `INSERT OR IGNORE INTO listas (usuario_id, nome, fixa) VALUES (?, ?, 1)`,
      [0, nome]
    );
  });
});

module.exports = db;
