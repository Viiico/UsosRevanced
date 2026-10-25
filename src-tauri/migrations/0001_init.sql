-- Schemat 1: kształt modelu, który czytają widoki (app/types/index.ts).
-- Katalog (semestr, przedmioty, drzewo, terminy) i stan użytkownika (punkty,
-- „zrobione”) są w osobnych tabelach - podmiana katalogu nie rusza ocen.
-- Krótkie listy przedmiotu (skala, zasady, prowadzący, wymagania) są w JSON-ie.

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE semester (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL
);

CREATE TABLE subject (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  semester_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  group_label TEXT NOT NULL DEFAULT '',
  demo INTEGER NOT NULL DEFAULT 0,
  ects REAL NOT NULL,
  total_points REAL NOT NULL,
  passing_points REAL NOT NULL,
  grade_scale_json TEXT NOT NULL,
  rules_json TEXT NOT NULL,
  teachers_json TEXT NOT NULL
);

CREATE TABLE node (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  parent_id TEXT,
  position INTEGER NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  short TEXT NOT NULL DEFAULT '',
  visual TEXT,
  weight REAL NOT NULL,
  -- NULL = węzeł bez punktów (np. kamień milowy)
  points_max REAL,
  info TEXT NOT NULL DEFAULT '',
  assumption TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  requirements_json TEXT NOT NULL DEFAULT '[]',
  term_ids_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX node_subject ON node (subject_id, position);

CREATE TABLE term (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  subject_id TEXT NOT NULL,
  node_id TEXT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  group_label TEXT,
  points_max REAL,
  can_be_done_before INTEGER NOT NULL DEFAULT 0,
  requirement TEXT,
  notes TEXT,
  week_no INTEGER
);

CREATE INDEX term_position ON term (position);

-- Stan użytkownika: wiersz istnieje tylko dla ocenionych węzłów.
CREATE TABLE progress (
  node_id TEXT PRIMARY KEY,
  earned REAL NOT NULL,
  updated_at TEXT NOT NULL
);

-- Stan użytkownika: wiersz istnieje tylko dla terminów oznaczonych jako zrobione.
CREATE TABLE term_state (
  term_id TEXT PRIMARY KEY,
  submitted INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
