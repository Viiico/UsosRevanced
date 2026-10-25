# Model danych (v2)

`app/data/base.json` to dokument startowy: wypełnia bazę SQLite aplikacji przy
pierwszym uruchomieniu (patrz [SQLite](#sqlite-w-aplikacji)). Ma
`schemaVersion: 2`; kontrakt typów jest w `app/types/base.ts`, a walidator w
`app/lib/base-validate.ts` (`bun run validate`).

## Dlaczego tak

- **Katalog ≠ stan.** Semestr, przedmioty, drzewo, wymagania i terminy są
  katalogiem. Punkty (`progress`) i „zrobione” to stan użytkownika - w bazie
  aplikacji osobne tabele.
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
| `submitted` | ręczne „zrobione”; termin z punktami czeka potem na ocenę |
| `progress` | tylko liście; **brak wpisu = nieocenione**, `earned: 0` = zero |
| `progress[].earned` | nie przekracza `max`; kategorie liczone z liści |
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
a `base` jest zwracane bezpośrednio. Baza SQLite przechowuje runtime v1 (niżej);
eksport z edytora też jest v1 - to dług do spłaty.

## Walidacja i migracja

```bash
bun run validate                                   # app/data/base.json
bun scripts/migrate-v1-to-v2.ts .tmp/base.v1.json  # odtworzenie migracji
```

Walidator sprawdza m.in. unikalność ID, prefiksy `n:`/`t:`, referencje
(subject → scale, teacher, term → node, requirement → node), sumy punktów,
zakres `progress`, ciągłość kalendarza, daty w semestrze i to, że `graded`
wskazuje liść z punktami.

## SQLite w aplikacji

Aplikacja (Tauri, Android) trzyma dane w SQLite przez `tauri-plugin-sql`.
Schemat jest w `src-tauri/migrations/` i uruchamia go wtyczka przy starcie;
nowa zmiana schematu = nowy plik migracji i wpis w `src-tauri/src/lib.rs`.

| Tabela | Zawartość |
| --- | --- |
| `semester` | jeden wiersz: kod, nazwa, daty |
| `subject` | przedmiot; skala, zasady i prowadzący jako JSON |
| `node` | drzewo ocen (`parent_id` + `position`); wymagania jako JSON |
| `term` | terminy (`position` = kolejność na liście) |
| `progress` | **stan**: punkty ocenionych węzłów |
| `term_state` | **stan**: terminy oznaczone jako zrobione |
| `settings` | klucz-wartość (motyw) |

Tabele odpowiadają runtime v1 (`app/types/index.ts`), bo to ten kształt edytują
widoki - bez konwersji przy każdym zapisie. `app/lib/db.ts` mapuje model na
wiersze i z powrotem.

**Zapis.** Po każdej zmianie stanu (mikrozadanie zbiera mutacje jednej akcji)
`createSync().flush()` wylicza wiersze z modelu, porównuje je z obrazem tego,
co jest w bazie, i wysyła tylko różnice: `INSERT OR REPLACE` dla zmienionych,
`DELETE` dla usuniętych. Zapytania idą po kolei, bez transakcji - wtyczka
używa puli połączeń, więc `BEGIN`/`COMMIT` z osobnych wywołań nie są
gwarantowane. Obraz aktualizuje się po każdym udanym wierszu, więc po błędzie
kolejny zapis dokończy resztę.

**Start.** Pusta baza (brak wiersza w `semester`) = pierwsze uruchomienie:
model z `base.json` zapisuje się w całości. Potem `base.json` nie jest czytany.
W przeglądarce bazy nie ma - aplikacja działa jako podgląd bez zapisu.

