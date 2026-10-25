# USOS Revanced

Lokalna aplikacja do ogarniania studiów: **Harmonogram**, **Oceny**, **Kalendarz**.
Pierwszy działający widok to **Oceny** - drzewo ocen, ważony pasek postępu i harmonogram
zawężony do wybranego poziomu.

- **Framework:** Nuxt 4 (Vue 3 + TypeScript), SSR
- **Styl:** Tailwind CSS v4 + komponenty w konwencji [shadcn-vue](https://www.shadcn-vue.com/)
  (`app/components/ui/*`, reka-ui, cva, `cn()`)
- **Ikony:** `lucide-vue-next`
- **Runtime:** [Bun](https://bun.sh/) (instalacja i uruchamianie)
- **Dane:** jeden dokument JSON (`app/data/base.json`) rzutowany na typowany model przez
  `app/data/index.ts` - gotowe pod SQLite i przyszłą migrację do Tauri

## Uruchomienie

```bash
bun install
bun run dev          # http://localhost:3000 - Nuxt na runtime Bun
```

Skrypty `dev` / `build` / `preview` uruchamiają Nuxt bezpośrednio na Bunie
(`bun --bun ./node_modules/nuxt/bin/nuxt.mjs …`). Wersje na Node: `dev:node`, `build:node`.
`bun run typecheck` sprawdza typy (obecnie 0 błędów).

## Paleta

Dwa schematy z dostarczonego screenshotu, przełączane w nagłówku (cookie `theme`, więc SSR
od razu renderuje właściwy motyw - bez mignięcia):

| Tryb | Schemat | Tło | Powierzchnia | Akcent | Alert | Tekst |
| --- | --- | --- | --- | --- | --- | --- |
| ciemny (domyślny) | #3 black & gold | `#1A1816` | `#3A3633` | `#C9A24B` | `#A82A33` | `#F4EFE6` |
| jasny | #1 ink & plum | `#F4EFE6` | `#2B2B2B` | `#C8353B` | `#D7391F` | `#2B2B2B` |

Tokeny: `app/assets/css/main.css` (`--background`, `--primary`, `--seg-1…5`, `--success`,
`--danger`). Komponenty korzystają wyłącznie z tokenów, więc nowy motyw to podmiana zmiennych.

## Struktura

```
app/
  pages/
    oceny.vue              # trzy bloki: skilltree, postęp, harmonogram szczegółowy
    harmonogram.vue        # filtry i os czasu terminów
    kalendarz.vue          # siatka tygodniowa
    dane.vue               # edytor JSON i import/eksport
  components/
    oceny/SkillTree.vue        # jedno piętro drzewa + okruszki + „poziom wyżej”
    oceny/SkillNodeCard.vue    # kafelek dziecka
    oceny/ProgressBreakdown.vue# ważony pasek, legenda, skala ocen
    oceny/RequirementList.vue  # warunki zaliczenia z bieżącą weryfikacją
    oceny/ScopedTerms.vue      # terminy w zakresie bieżącego węzła
    ui/…                       # button, card, badge, tooltip, separator
  composables/
    useGrades.ts           # stan widoku: wybrany węzeł, postępy, segmenty, terminy
    useAppTheme.ts         # ciemny/jasny + cookie
  lib/
    tree.ts                # nawigacja po drzewie i liczenie postępu
    requirements.ts        # ewaluacja warunków zaliczenia + terminy w zasięgu
    base-validate.ts       # walidator dokumentu v2 (wspólny z `bun run validate`)
    format.ts              # daty, punkty, procenty po polsku
  data/base.json           # ground truth v2: semestr, przedmioty, drzewo, terminy, progress
  data/index.ts            # walidacja + adaptacja v2 → runtime AppData
  data/adapt-v2.ts         # adapter zgodności dla widoków (do usunięcia po migracji UI)
  types/base.ts            # kontrakt base.json v2
  types/index.ts           # kontrakt runtime (widoki/edytor)
scripts/
  migrate-v1-to-v2.ts      # jednorazowa migracja danych
  validate-data.ts         # `bun run validate`
docs/data-model.md
```

## Dane

`app/data/base.json` to jedyne źródło treści (semestr, przedmioty, drzewo ocen, terminy,
prowadzący, skale i postęp). Ma `schemaVersion: 2`; kształt opisuje `app/types/base.ts`,
a `bun run validate` sprawdza referencje, sumy, kalendarz i zakresy punktów.

`app/data/index.ts` waliduje dokument i buduje runtime `AppData` przez `app/data/adapt-v2.ts`.
Adapter istnieje tylko dlatego, że widoki i edytor nadal mówią wersją v1 - po migracji UI
zniknie. Zmiana źródła (Tauri `appDataDir`, SQLite) dotyczy loadera, nie widoków.

Edycja w zakładce „Dane” zapisuje **runtime v1** w `localStorage` (`usos-revanced:data`),
który po reloadzie ma pierwszeństwo nad plikiem; „Reset danych” przywraca zawartość
`base.json`. Eksport z edytora to nadal v1 - to dług do spłaty razem z adapterem.

Migracja: `bun scripts/migrate-v1-to-v2.ts <wejście> <wyjście>` (domyślnie czyta
`.tmp/base.v1.json`).

## Jak działa widok Oceny

1. **Skilltree** - widoczne jest tylko jedno piętro. Klik w kafelek wchodzi poziom niżej
   (`?node=…` w URL, więc widok da się odtworzyć i wrócić do niego z innej zakładki).
   Powrót: okruszki nad drzewem albo przycisk „Poziom wyżej”.
2. **Postęp** - pasek składa się z dzieci bieżącego węzła. Szerokość segmentu = waga dziecka,
   a wypełnienie = postęp tego dziecka, więc segmenty „płyną” od lewej do prawej i nie ma
   sztywnych podziałek. Postęp rodzica to średnia ważona dzieci.
3. **Harmonogram szczegółowy** - terminy przypisane do węzła i całego poddrzewa
   (laboratoria, kolokwia, etapy projektu), z filtrem po typie.

Postęp:

```
liść:            earned / max
węzeł z dziećmi: Σ(waga_dziecka × postęp_dziecka) / Σ(waga_dziecka)   // waga 0 pomijana
```

Waga to zwykle liczba punktów, więc procent postępu = zdobyte punkty / punkty możliwe.
Węzeł z wagą `0` (np. etap organizacyjny projektu) nie zaburza wyniku.

## Dane przedmiotu „Technika Obrazowa”

Źródła: `TO_00_info.pdf` (warunki zaliczenia, terminy laboratoriów, grupy) oraz
`TO_26Z_kalendarz.pdf` (siatka tygodniowa 26Z).

- 100 pkt = 2 × 20 (sprawdziany) + 5 × 6 (laboratoria) + 30 (projekt)
- zaliczenie: ≥ 50 pkt łącznie, ≥ 7 pkt z każdego sprawdzianu, ≥ 2 pkt z każdych zajęć
  laboratoryjnych, ≥ 10 pkt z projektu
- skala: 90 → 5, 80 → 4,5, 70 → 4, 60 → 3,5, 50 → 3, poniżej → 2
- wykład: wtorek 16:00-18:00, W1-W15 (W9 i W15 to sprawdziany)
- laboratorium: **grupa 104 (PnP)**, poniedziałek 16:00-19:00 -
  2 XI, 16 XI, 30 XI, 14 XII, 11 I
- projekt: etapy do 18 X, 13 XII, 29 I

Uwagi:

- Punkty w drzewie są **danymi przykładowymi** (`meta.source: "demo"` w `app/data/base.json`),
  żeby pokazać działanie paska i warunków - podmień wpisy w `progress` na realne oceny.
- Podział 30 pkt projektu na etapy (10 + 20) jest przyjęty roboczo; w UI widać to jako
  „Założenie”.
- Dokument podaje laboratorium 16:00-19:00 (użytkownik wspominał o 16:00-20:00) - w danych
  jest 16:00-19:00; godziny są w `terms`.
- Grupa 104 to „PnP” (parzysta), dlatego laboratoria wypadają co dwa tygodnie.

## Co dalej

- Migracja UI i edytora na v2 - usunięcie `app/data/adapt-v2.ts` i eksportu v1 z „Danych”.
- Rozdzielenie katalogu od stanu: `progress` poza `base.json` (plik/`appDataDir`).
- SQLite dopiero po powyższym (patrz `docs/data-model.md`); Tauri jako runtime docelowy.
- Historia prób i poprawki jako `attempt` zamiast osobnych węzłów.
