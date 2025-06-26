const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('agenda.db');

//Iniciar db

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
    data TEXT,
    concluida INTEGER DEFAULT 0,
    FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY(lista_id) REFERENCES listas(id)
  )`);

  const listasFixas = [
    'Meu Dia', 'A Fazer', 'Mercado', 'Viagem', 'Filmes para Assistir', 'Casa', 'Trabalho'
  ];
  listasFixas.forEach(nome => {
    db.run(
      `INSERT OR IGNORE INTO listas (usuario_id, nome, fixa) VALUES (?, ?, 1)`,
      [0, nome]
    );
  });
});

module.exports = db;