# Model danych

Wszystko, co aplikacja wie o studiach, da się zapisać jako jeden dokument JSON.
Typy są w `app/types/index.ts`, a dane w `app/data/subjects.ts`.

## Dlaczego tak

- **Drzewo ocen** (`GradeNode`) jest rekurencyjne: semestr → przedmiot → grupa (laboratorium,
  kolokwia, projekt) → pojedyncza ocena / etap. Ten sam kształt obsługuje dowolną głębokość
  (np. przedmiot dzielony na wykład + ćwiczenia) bez zmian w kodzie widoku.
- **Waga** (`weight`) jest liczbą, nie procentem - dzięki temu nie trzeba pilnować, żeby
  sumy dawały 100, a podział punktów można zmienić w jednym miejscu.
- **Terminy** (`Term`) są osobnym zbiorem, połączonym z drzewem przez `nodeId`. Jeden termin
  może istnieć bez oceny (sam wykład), a jedna ocena może mieć kilka terminów (poprawka).
- Wszystkie daty to `YYYY-MM-DD` (strefa `Europe/Warsaw` przy formatowaniu), brak obiektów
  `Date` - JSON jest w 100% przenośny.

## Kształt dokumentu

```jsonc
{
  "version": 1,
  "semester": {
    "id": "sem-26z",
    "code": "26Z",
    "name": "Semestr zimowy",
    "academicYear": "2026/2027",
    "startsAt": "2026-10-05",
    "endsAt": "2027-02-12"
  },
  "subjects": [
    {
      "id": "to",
      "code": "TO",
      "name": "Technika Obrazowa",
      "semesterId": "sem-26z",
      "group": "Lab 104 · poniedziałek parzysty, 16:00-19:00",
      "teachers": [{ "name": "dr inż. Andrzej Buchowicz", "email": "…", "room": "pok. 451" }],
      "policy": {
        "ects": 5,
        "totalPoints": 100,
        "passingPoints": 50,
        "gradeScale": [{ "min": 90, "grade": "5" }],
        "rules": ["…"]
      },
      "tree": {
        "id": "to",
        "kind": "subject",          // year | semester | subject | category | activity | stage | milestone
        "name": "Technika Obrazowa",
        "weight": 5,                 // waga wśród rodzeństwa
        "points": { "max": 30, "earned": 24 },   // opcjonalne; null = nieocenione
        "requirements": [
          {
            "id": "to-req-total",
            "kind": "min-total",     // min-total | min-each | min-node | manual
            "label": "Łącznie co najmniej 50 pkt",
            "threshold": 50,
            "targetNodeId": "to-kol", // opcjonalnie: inne poddrzewo
            "note": "…"
          }
        ],
        "children": [ /* rekurencyjnie */ ],
        "termIds": ["to-lab-1"],
        "info": "tekst do ikony (i)",
        "assumption": "skąd wzięto podział punktów"
      },
      "demoData": true
    }
  ],
  "terms": [
    {
      "id": "to-lab-1",
      "subjectId": "to",
      "nodeId": "to-lab-1",       // brak = wydarzenie bez oceny (np. wykład)
      "kind": "lab",              // lecture | lab | colloquium | project-stage | project-deadline
      "title": "Lab 1 - …",
      "date": "2026-11-02",
      "start": "16:00",
      "end": "19:00",
      "group": "104 (PnP)",
      "pointsMax": 6,
      "canBeDoneBefore": false,   // false: tylko w terminie; true: trzeba zrobić wcześniej
      "requirement": "Obecność obowiązkowa · sprawozdanie do końca zajęć",
      "notes": "…",
      "weekNo": 1
    }
  ]
}
```

## Reguły, które warto znać

| Element | Znaczenie |
| --- | --- |
| `weight` = 0 | węzeł nie wchodzi do średniej (np. etap organizacyjny), ale nadal widać go w drzewie i harmonogramie |
| `points.earned: null` | jeszcze nieocenione - widać „oczekuje”, warunki dostają status `pending` |
| `canBeDoneBefore: true` | termin typu „do zrobienia wcześniej” (etapy projektu); `false` = tylko na zajęciach |
| `requirements[].kind` | `min-total` (suma punktów węzła), `min-each` (każdy liść w `targetNodeId`), `min-node` (suma w `targetNodeId`), `manual` (weryfikacja prowadzącego) |
| `demoData` | pokazuje w UI plakietkę „dane przykładowe” |

## SQLite (pod Tauri)

Model jest relacyjny w naturalny sposób - drzewo to tabela z `parent_id`, a terminy to
osobna tabela z kluczem obcym do węzła:

```sql
CREATE TABLE semester  (id TEXT PRIMARY KEY, code TEXT, name TEXT, academic_year TEXT,
                        starts_at TEXT, ends_at TEXT);

CREATE TABLE subject   (id TEXT PRIMARY KEY, semester_id TEXT REFERENCES semester(id),
                        code TEXT, name TEXT, "group" TEXT, ects INTEGER,
                        total_points INTEGER, passing_points INTEGER,
                        policy_json TEXT);           -- ects, gradeScale, rules

CREATE TABLE grade_node (
  id TEXT PRIMARY KEY,
  subject_id TEXT REFERENCES subject(id),
  parent_id  TEXT REFERENCES grade_node(id),
  kind TEXT NOT NULL,            -- subject | category | activity | stage | milestone
  name TEXT NOT NULL,
  short TEXT,
  weight REAL NOT NULL DEFAULT 0,
  points_max INTEGER,
  points_earned REAL,            -- NULL = nieocenione
  position INTEGER,
  info TEXT, assumption TEXT, description TEXT,
  meta_json TEXT                 -- requirements, termIds
);

CREATE TABLE term (
  id TEXT PRIMARY KEY,
  subject_id TEXT REFERENCES subject(id),
  node_id TEXT REFERENCES grade_node(id),
  kind TEXT NOT NULL, title TEXT NOT NULL,
  date TEXT NOT NULL, start TEXT, "end" TEXT,
  location TEXT, "group" TEXT, week_no INTEGER,
  points_max INTEGER,
  can_be_done_before INTEGER NOT NULL DEFAULT 0,
  requirement TEXT, notes TEXT
);

CREATE TABLE requirement (
  id TEXT PRIMARY KEY,
  node_id TEXT REFERENCES grade_node(id),
  kind TEXT NOT NULL, label TEXT NOT NULL,
  threshold REAL, target_node_id TEXT, note TEXT,
  position INTEGER
);
```

Punkty i postępy **nie są** przechowywane - liczy je `app/lib/tree.ts` przy każdym renderze.
Dzięki temu zmiana wagi w jednym miejscu natychmiast przelicza całe drzewo.

## Eksport / import

`data` z `app/data/subjects.ts` to już gotowy dokument do zapisu. Docelowo:

1. `serialize()` → JSON (wersjonowany polem `version`),
2. `persist()` → plik w katalogu aplikacji (Tauri `appDataDir`) albo tabela w SQLite,
3. migracje wg `version` - każda nowa wersja dokłada krok `v1 → v2`.

Ten sam JSON można wrzucić na telefon: bez serwera, bez konta, bez kosztów.
