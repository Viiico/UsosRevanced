# Model danych (v2)

`app/data/base.json` to jeden dokument JSON i jedyne źródło treści. Ma
`schemaVersion: 2`; kontrakt typów jest w `app/types/base.ts`, a walidator w
`app/lib/base-validate.ts` (`bun run validate`).

## Dlaczego tak

- **Katalog ≠ stan.** Semestr, przedmioty, drzewo, wymagania i terminy są
  katalogiem. Punkty (`progress`) to stan użytkownika i docelowo mieszka
  osobno - w pliku, `appDataDir` w Tauri albo tabeli SQLite.
- **Jedna krawędź.** Termin zna `nodeId`; `node.termIds` nie istnieje i jest
  wyliczane przez adapter. Kategorie agregują terminy z poddrzewa.
- **Wartości pochodne nie są zapisywane.** `weight` domyślnie równa się
  `max` (liść) albo sumie dzieci (grupa); jawne `weight: 0` wyłącza węzeł
  ze średniej. `totalPoints`, `passingPoints` (ze skali), `termIds`,
  `pointsMax`, `weekNo` i `canBeDoneBefore` są liczone.
- **Jednoznaczne ID.** Węzły mają prefiks `n:`, terminy `t:` - koniec kolizji
  typu `psir-colloquium`. ID przedmiotów i prowadzących są bez prefiksu.
- **Czas lokalny + strefa.** Daty i godziny to wall time w `meta.timeZone`
  (`Europe/Warsaw`); deadline ma `due`, a nie sztuczny `start: "23:59"`.

## Kształt dokumentu

```jsonc
{
  "schemaVersion": 2,
  "meta": {
    "updatedAt": "2026-10-25T12:00:00+01:00",
    "source": "demo",                 // demo | syllabus | user
    "timeZone": "Europe/Warsaw"
  },
  "semester": {
    "id": "sem-26z", "code": "26Z", "name": "Semestr zimowy",
    "academicYear": "2026/2027",
    "startsAt": "2026-10-05", "endsAt": "2027-02-12",
    "ectsTotal": 30,
    "weeks": [
      { "no": 1, "from": "2026-10-05", "to": "2026-10-11", "kind": "teaching" },
      { "from": "2026-12-28", "to": "2027-01-10", "kind": "break" },
      { "from": "2027-02-01", "to": "2027-02-12", "kind": "exam" }
    ],
    "dayOverrides": [{ "date": "2026-11-14", "follows": "monday" }]
  },
  "gradeScales": {
    "standard": {
      "passing": 50,
      "rows": [{ "min": 90, "grade": "5" }, { "min": 80, "grade": "4,5" }]
    }
  },
  "subjects": [{
    "id": "to", "code": "TO", "name": "Technika Obrazowa", "ects": 5,
    "gradeScaleId": "standard",
    "group": { "code": "104", "label": "Lab 104 · poniedziałek parzysty" },
    "teachers": [{ "id": "buchowicz", "role": "teacher" }],
    "policyNotes": ["Zaliczenie na podstawie sumy punktów..."],
    "tree": {
      "id": "n:to", "type": "subject",
      "requirements": [{ "id": "to-req-total", "kind": "min-total", "label": "Łącznie min. 50 pkt" }],
      "children": [{
        "id": "n:to-lab", "type": "group", "name": "Laboratorium",
        "activityKind": "lab",
        "children": [{
          "id": "n:to-lab-1", "type": "activity", "name": "Lab 1", "max": 6
        }]
      }]
    }
  }],
  "teachers": [{ "id": "buchowicz", "name": "dr inż. Andrzej Buchowicz", "email": "...", "room": "451" }],
  "terms": [{
    "id": "t:to-lab-1", "subjectId": "to", "nodeId": "n:to-lab-1",
    "kind": "lab", "title": "Lab 1", "date": "2026-11-02",
    "start": "16:00", "end": "19:00", "graded": true
  }],
  "progress": { "n:to-lab-1": { "earned": 6 } }
}
```

## Reguły, które warto znać

| Element | Znaczenie |
| --- | --- |
| `type` | `subject`, `group`, `activity`, `stage`, `milestone` |
| `activityKind` | `lab`, `colloquium`, `project`, `exam`, `other`; na grupie opisuje dzieci (dziedziczenie w UI) |
| `max` | tylko liście `activity`/`stage`; grupa liczy z dzieci |
| `weight` | opcjonalne nadpisanie; brak = `max`/suma dzieci; `0` wyłącza z średniej |
| `requirements[].kind` | `min-total` (próg ze skali), `min-each`, `min-node`, `manual` |
| `requirements[].targetId` | brak = węzeł, w którym warunek leży; nigdy „sam siebie” |
| `graded` | termin, który niesie punkty węzła; przeglądy projektu mają `false` |
| `attempt` | `1` podstawowy, `2` poprawka; ten sam `nodeId` |
| `progress` | tylko liście; **brak wpisu = nieocenione**, `earned: 0` = zero |
| `progress[].earned` | nie przekracza `max`; kategorie liczone z liści |
| `semester.ectsTotal` | pula ECTS semestru; mianownik totalnego postępu (5 ECTS = 5/30) |
| `meta.source: "demo"` | dawne `demoData`; UI pokazuje plakietkę |
| `policyNotes` | tekst sylabusa do wyświetlania, nie źródło progów |

### Kalendarz i tygodnie

`semester.weeks` to jedna, ciągła os czasu od `startsAt` do `endsAt`; wpisy
`teaching` mają numer tygodnia dydaktycznego, `break` i `exam` nie mają.
Walidator pilnuje ciągłości i braku duplikatów numerów. `weekNo` terminów
jest wyliczany z tej osi - w danych go nie ma. `dayOverrides` opisują dni
zastępcze (np. sobotę prowadzoną jak poniedziałek).

### Postęp i poprawki

`progress` kluczuje po `n:...`; `attempt` jest opcjonalny. Termin poprawkowy
to `attempt: 2` na tym samym węźle, a nie nowa aktywność z własnym `max`.
Zaliczenie liczy się z liści; kategorie i korzeń są pochodne.

## Adapter v1 (tymczasowy)

Widoki i edytor nadal czytają stary kształt `AppData` (`app/types/index.ts`).
`app/data/index.ts` waliduje v2 i wywołuje `app/data/adapt-v2.ts`, który:

- mapuje `type` → `kind` i `activityKind` → `visual`,
- wylicza `weight`, `points.max/earned`, `termIds`, `pointsMax`, `weekNo`,
  `canBeDoneBefore`,
- dokłada `threshold` do `min-total` ze skali,
- buduje `teachers`, `policy` i `semester`.

To warstwa zgodności, nie drugie źródło prawdy. Po migracji UI adapter znika,
a `base` jest zwracane bezpośrednio. Edytor w zakładce „Dane” nadal zapisuje
runtime v1 w `localStorage`; eksport z edytora też jest v1 - to dług do spłaty.

## Walidacja i migracja

```bash
bun run validate                                   # app/data/base.json
bun scripts/migrate-v1-to-v2.ts .tmp/base.v1.json  # odtworzenie migracji
```

Walidator sprawdza m.in. unikalność ID, prefiksy `n:`/`t:`, referencje
(subject → scale, teacher, term → node, requirement → node), sumy punktów,
zakres `progress`, ciągłość kalendarza, daty w semestrze i to, że `graded`
wskazuje liść z punktami.

## SQLite (pod Tauri)

Model mapuje się 1:1; ID z prefiksami są dobrymi kluczami tekstowymi:

```sql
CREATE TABLE semester (
  id TEXT PRIMARY KEY, code TEXT, name TEXT, academic_year TEXT,
  starts_at TEXT, ends_at TEXT, ects_total REAL,
  weeks_json TEXT, overrides_json TEXT
);

CREATE TABLE grade_scale (id TEXT PRIMARY KEY, passing REAL);
CREATE TABLE grade_row (
  grade_scale_id TEXT REFERENCES grade_scale(id),
  min REAL NOT NULL, grade TEXT NOT NULL,
  PRIMARY KEY (grade_scale_id, min)
);

CREATE TABLE teacher (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, room TEXT
);

CREATE TABLE subject (
  id TEXT PRIMARY KEY, semester_id TEXT REFERENCES semester(id),
  code TEXT, name TEXT, ects INTEGER,
  grade_scale_id TEXT REFERENCES grade_scale(id),
  group_code TEXT, group_label TEXT, policy_notes_json TEXT
);

CREATE TABLE node (
  id TEXT PRIMARY KEY, subject_id TEXT REFERENCES subject(id),
  parent_id TEXT REFERENCES node(id), position INTEGER,
  type TEXT NOT NULL, activity_kind TEXT, name TEXT, short TEXT,
  max REAL, weight REAL, info TEXT, description TEXT, assumption_note TEXT
);

CREATE TABLE requirement (
  id TEXT PRIMARY KEY, node_id TEXT REFERENCES node(id),
  kind TEXT NOT NULL, label TEXT NOT NULL, threshold REAL,
  target_node_id TEXT REFERENCES node(id), note TEXT
);

CREATE TABLE term (
  id TEXT PRIMARY KEY, subject_id TEXT REFERENCES subject(id),
  node_id TEXT REFERENCES node(id), kind TEXT NOT NULL,
  title TEXT NOT NULL, date TEXT NOT NULL, start TEXT, end TEXT, due TEXT,
  location TEXT, group_label TEXT, attempt INTEGER NOT NULL DEFAULT 1,
  graded INTEGER NOT NULL DEFAULT 0, requirement_note TEXT, notes TEXT
);

CREATE TABLE progress (
  node_id TEXT REFERENCES node(id), attempt INTEGER NOT NULL DEFAULT 1,
  earned REAL NOT NULL, updated_at TEXT,
  PRIMARY KEY (node_id, attempt)
);
```

`progress` jest osobną tabelą - dzięki temu katalog można aktualizować bez
dotykania ocen, a eksport/import nie nadpisuje stanu użytkownika. Punkty,
postępy i `termIds` nie są przechowywane w tabelach katalogu: liczy je
`app/lib/tree.ts` i adapter.

## Eksport / import

`base.json` jest gotowym dokumentem do zapisu (wersjonowany `schemaVersion`).
Docelowo:

1. `base.json` → `appDataDir` w Tauri (albo tabela SQLite),
2. `progress` → osobny plik/tabela,
3. migracje wg `schemaVersion` (`v1 → v2` już jest w `scripts/`).

Ten sam JSON można wrzucić na telefon: bez serwera, bez konta, bez kosztów.
