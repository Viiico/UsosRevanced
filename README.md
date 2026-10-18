# USOS Revanced

Lokalna aplikacja do ogarniania studiów: **Harmonogram**, **Oceny**, **Kalendarz**.
Pierwszy działający widok to **Oceny** - drzewo ocen, ważony pasek postępu i harmonogram
zawężony do wybranego poziomu.

- **Framework:** Nuxt 4 (Vue 3 + TypeScript), SSR
- **Styl:** Tailwind CSS v4 + komponenty w konwencji [shadcn-vue](https://www.shadcn-vue.com/)
  (`app/components/ui/*`, reka-ui, cva, `cn()`)
- **Ikony:** `lucide-vue-next`
- **Runtime:** [Bun](https://bun.sh/) (instalacja i uruchamianie)
- **Dane:** statyczne, w pełni serializowalne (`app/data/subjects.ts`) - gotowe pod JSON/SQLite
  i przyszłą migrację do Tauri

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
    harmonogram.vue        # placeholder (wkrótce)
    kalendarz.vue          # placeholder (wkrótce)
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
    format.ts              # daty, punkty, procenty po polsku
  data/subjects.ts         # semestr, przedmiot, drzewo ocen, terminy
  types/index.ts           # kontrakt danych (JSON/SQLite)
docs/data-model.md
```

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

- Punkty w drzewie są **danymi przykładowymi** (`demoData: true` w `app/data/subjects.ts`),
  żeby pokazać działanie paska i warunków - podmień `points.earned` na realne oceny.
- Podział 30 pkt projektu na etapy (10 + 20) jest przyjęty roboczo; w UI widać to jako
  „Założenie”.
- Dokument podaje laboratorium 16:00-19:00 (użytkownik wspominał o 16:00-20:00) - w danych
  jest 16:00-19:00; godziny są w `terms`.
- Grupa 104 to „PnP” (parzysta), dlatego laboratoria wypadają co dwa tygodnie.

## Co dalej

- Harmonogram: filtry po przedmiocie i fladze `canBeDoneBefore` (dane już są w modelu).
- Kalendarz: siatka pon-pt + widok skompaktowany.
- Zapis lokalny: JSON → SQLite (patrz `docs/data-model.md`), eksport/import między urządzeniami.
- Ikona „i” przy terminach: dziś tooltip, docelowo panel szczegółów.
