# IT COMPANY TYCOON — REAL STOCK MARKET 3.1

**Gra z modułem prawdziwych notowań USA i GPW, wykorzystująca wirtualne pieniądze.**

> WAŻNE: Projekt nie ma wpisanego klucza API i nie pobiera rzeczywistych kursów bez konfiguracji. Testy korzystają wyłącznie z jawnie oznaczonych sztucznych danych. Gra działa bez internetu w pozostałych zakładkach, ale moduł „Giełda REAL” wymaga Netlify Functions, klucza EODHD oraz właściwej licencji na wyświetlanie danych.

## 1. Co zostało zaimplementowane?

- Zachowane poprzednie moduły Ultimate 2.0 Etap A: zlecenia IT, pracownicy, ekonomia, fikcyjna giełda, badania, ustawienia, biuro 2D z animacjami.
- Nowa zakładka **Giełda REAL** — 15 spółek USA i 15 GPW, z rzeczywistymi symbolami identyfikacyjnymi EODHD.
- Moduł serwerowy `netlify/functions/real-market.js` obsługujący: `status`, `quotes`, `history`, `fx`.
- Kursy akcji: EODHD Live (Delayed), **w tym możliwe opóźnienia lub brak danych** zależnie od pakietu i giełdy.
- Kurs USD/PLN: aktualna dostępna tabela A NBP; sprawdzana jest również data publikacji kursu.
- Kupno i sprzedaż akcji **wyłącznie za wirtualną gotówkę firmy**, prowizja 0,3%, ceny i wynik liczone w groszach.
- Dwa odrębne portfele: giełda fikcyjna i giełda rzeczywista. Wspólna firmowa gotówka.
- Zakupy akcji nie są liczone jako wydatek operacyjny; sprzedaż akcji nie podwyższa fikcyjnie przychodu operacyjnego.
- Wykres historyczny zamknięć dziennych (7D, 1M, 3M, 1R, MAX), lista obserwowanych, transakcje, eksport historii do CSV.
- Blokada wirtualnego handlu poza regularną sesją lub bez wystarczająco świeżego notowania, bieżącej synchronizacji i kursu walutowego.
- Zapis portfela przez `localStorage` i eksport/import całej rozgrywki do pliku JSON.
- Migracja zapisu v1/v2/v3 -> v4 z kopią pierwotnego zapisu (`it-company-tycoon-save-v1-backup-before-real-market`).
- Responsywny układ na telefonach i komputerach.

**Aktualizacja 3.1:** pobieranie notowań w partiach do 15 symboli, ostrzeżenie o częściowym braku notowań i nieaktualnej wycenie pozycji, prywatny test łączności z EODHD/NBP (`scripts/check-feed.mjs`).

**Nie ma jeszcze:** aktualnych wiadomości giełdowych, automatycznego rozliczania dywidend i splitów, zleceń limit/stop-loss/take-profit, pełnego kalendarza świąt giełdowych oraz wykresów świecowych. To funkcje kolejnych aktualizacji. Sesje określane są przez godziny regionalne i wiek ostatniego rzeczywistego kursu; w święta stare notowania powinny zablokować transakcję.

## 2. Uruchomienie lokalne — tylko tryb offline

1. Rozpakuj ZIP.
2. Otwórz `index.html` w Chrome / Edge / Firefox.
3. Załóż firmę i graj w poprzednie moduły, w tym fikcyjną giełdę i biuro 2D.
4. Zakładka **Giełda REAL** pokaże komunikat o wymaganej integracji; nie pokaże zmyślonych cen.

Do gry offline NIE potrzeba `npm`, serwera ani kluczy API.

## 3. Uruchomienie prawdziwych notowań na Netlify — krok po kroku

### Krok A: dostęp do dostawcy

1. Wejdź na https://eodhd.com/ i załóż konto.
2. Sprawdź, czy Twój pakiet obejmuje **Live (Delayed)** dla symboli USA `.US` oraz **GPW** `.WAR`, oraz historię EOD. Pakiet darmowy może nie wystarczyć.
3. Uzyskaj **prawo licencyjne do publicznego wyświetlania/udostępniania kursów w grze**. Plan do użytku osobistego zwykle NIE zezwala na publikację kursów dla wszystkich odwiedzających. Kontakt licencyjny EODHD: sales@eodhistoricaldata.com.
4. Skopiuj prywatny klucz API z konta dostawcy. Nigdy nie wpisuj go do `script.js`, `index.html` ani `real-market.js`.

### Krok B: repozytorium i Netlify

1. Utwórz repozytorium Git (np. na GitHub), zawierające **cały rozpakowany folder projektu**. W katalogu głównym muszą znajdować się `index.html`, `netlify.toml`, `script.js`, `real-market.js`, a w `netlify/functions/real-market.js` znajduje się funkcja serwerowa.
2. W Netlify wybierz **Add new project -> Import an existing project** i podłącz repozytorium.
3. Netlify wykryje `netlify.toml`. Katalog publikowania: `.`; katalog funkcji: `netlify/functions`. Nie jest potrzebny krok kompilacji.
4. W ustawieniach Netlify wybierz **Environment variables** i dodaj zmienną `EODHD_API_TOKEN` z prywatnym kluczem (dostępną w zakresie **Functions**).
5. Po rzeczywistym uzyskaniu licencji na publiczne wyświetlanie danych ustaw `REAL_MARKET_DATA_LICENSE_CONFIRMED` na wartość dokładnie `yes` — **nie ustawiaj tego bez posiadania wymaganej licencji**.
6. Wykonaj deploy/redeploy projektu.
7. Otwórz `https://TWOJA-STRONA.netlify.app/.netlify/functions/real-market?action=status`. Jeśli konfiguracja jest poprawna, odpowiedź ma `"ready":true` (nie zawiera klucza).
8. Otwórz grę na tej samej domenie, przejdź do **Giełda REAL** i kliknij „Odśwież notowania”.

**Ważne:** proste przeciągnięcie plików ZIP w panelu Netlify Drop publikuje pliki statyczne, ale nie gwarantuje zbudowania/deployu Netlify Functions. Dla Real Market użyj importu repozytorium lub Netlify CLI, które wdroży funkcje.

### Ochrona kluczy i limitów

- Frontend żąda danych wyłącznie spod adresu własnej strony `/.netlify/functions/real-market`.
- Klucz jest odczytywany przez funkcję z `process.env.EODHD_API_TOKEN`, a nie przez przeglądarkę.
- Nazwy spółek są sprawdzane przez allowlist 30 symboli.
- Serwer pobiera notowania w partiach maksymalnie po 15 instrumentów i buforuje notowania (5 min), historię (12 h), USD/PLN (8 h) **w pamięci instancji**. Cache nie jest współdzielony pomiędzy zimnymi startami funkcji.
- Automatyczne aktualizowanie w widoku giełdy: najwyżej raz na 5 min; sam zegar gry nie uruchamia zapytań.
- EODHD może naliczać kredyty za poszczególne symbole. Sprawdź limity swojego planu i ewentualnie zmniejsz liczbę instrumentów w katalogu.
- Przy dużej liczbie graczy może być potrzebna współdzielona pamięć cache, limity per użytkownik albo subskrypcja komercyjna.

### Sprawdzenie EODHD

Po konfiguracji sprawdź w przeglądarce (na swojej domenie):

- `/.netlify/functions/real-market?action=status`
- `/.netlify/functions/real-market?action=quotes&symbols=AAPL.US,CDR.WAR`
- `/.netlify/functions/real-market?action=history&symbol=AAPL.US`
- `/.netlify/functions/real-market?action=fx`

Prawidłowa odpowiedź powinna mieć `"ok": true`. Jeśli dany symbol nie jest dostępny w Twoim planie, pojawi się jako **brak notowań**, a handel nim pozostanie niedostępny. Dane mogą być opóźnione — gra podaje znacznik czasu ostatniego notowania. Warto przetestować symbole GPW i USA oddzielnie.

## 4. Stare zapisy

- Stara gra korzystała z klucza `it-company-tycoon-save-v1`; klucz nadal jest używany.
- Przy pierwszym wczytaniu nowa wersja próbuje zachować kopię poprzedniej wersji pod `it-company-tycoon-save-v1-backup-before-real-market`.
- `localStorage` jest przypisane do **konkretnej domeny**. Jeśli przenosisz grę z pliku lokalnego na Netlify, użyj opcji **Ustawienia -> Eksportuj zapis .json**, a na nowej stronie **Importuj plik zapisu**.
- Zrób ręczną kopię zapisu JSON przed aktualizacją gry.

## 5. Testy

Testy wykonane **bez prywatnego klucza** na sztucznych fixture'ach, nie są dowodem udanego połączenia z prawdziwą giełdą.

- `node tests/test_backend.js` — kontrola blokady licencyjnej, allowlist, normalizacji notowań, batchy, FX oraz historii.
- `python tests/test_ui.py` — test funkcjonalny w Chromium / Playwright: zakup, sprzedaż, PnL, odczyt zapisów, migracja v3->v4 i układ mobilny.
- Screeny `preview-real-market-test.png` i `preview-real-market-mobile-test.png` pochodzą z **danych testowych** (czerwony znak wodny), nie z rzeczywistych kursów.

**Wciąż wymaga weryfikacji z kontem EODHD:** kompletność zwracanych notowań GPW, aktywność wszystkich symboli, rzeczywiste opóźnienia danych, prawa publicznej redystrybucji oraz koszty produkcyjnego obciążenia API.

## 6. Zawartość projektu

```
index.html
style.css
script.js
real-market.js
real-market.css
office-world.js
office-world.css
netlify.toml
netlify/functions/real-market.js
README.md
tests/test_ui.py
tests/test_backend.js
```

## Informacje o źródłach

- EODHD: https://eodhd.com/financial-apis/live-ohlcv-stocks-api
- EODHD — Giełda Warszawska: https://eodhd.com/exchange/WAR
- EODHD — licencja i wykorzystanie komercyjne: https://eodhd.com/help/commercial
- NBP API: https://api.nbp.pl/
- Netlify Functions: https://docs.netlify.com/build/functions/get-started/

Projekt edukacyjny / rozrywkowy. Nie stanowi doradztwa inwestycyjnego i nie dokonuje prawdziwych transakcji.

## 7. Test połączenia z prawdziwym API (opcjonalnie)

Na własnym komputerze, mając Node.js 18+, uruchom z katalogu gry:

```bash
node scripts/check-feed.mjs
```

Powyższa komenda sprawdza **testowy symbol AAPL.US z demonstracyjnym tokenem EODHD** oraz aktualnie dostępną tabelę NBP, ale **nie uruchamia publicznej giełdy** ani nie zastępuje Twojego konta i licencji. Przy własnym koncie (nie publikuj klucza!):

- Windows PowerShell: `$env:EODHD_API_TOKEN="TWOJ_KLUCZ"; node scripts/check-feed.mjs CDR.WAR`
- Linux/macOS: `EODHD_API_TOKEN="TWOJ_KLUCZ" node scripts/check-feed.mjs CDR.WAR`

Nie umieszczaj klucza w czacie, w repozytorium ani plikach frontendowych.

Wersja 3.1 jest technicznie przygotowana do wdrożenia na Netlify, lecz dopóki nie zostanie ustawiony legalnie uprawniony token, publiczna giełda pozostaje zablokowana.
