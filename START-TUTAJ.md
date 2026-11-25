# IT COMPANY TYCOON — REAL MARKET 3.1 — SZYBKI START

## Chcę najpierw zagrać (bez API)

1. Rozpakuj całe ZIP.
2. Otwórz `index.html` w Chrome lub Edge.
3. Załóż firmę. **Giełda fikcyjna, pracownicy, biuro 2D i kontrakty działają offline.**
4. W zakładce „Giełda REAL” na razie zobaczysz komunikat o braku integracji, a nie zmyślone ceny.

## Chcę prawdziwe kursy USA i GPW na Netlify

1. Otrzymaj od EODHD dostęp do **Live (Delayed)** dla USA i GPW oraz potwierdzenie prawa do **publicznego wyświetlania/udostępniania** kursów. Sama subskrypcja prywatna nie wystarcza dla publicznej gry.
2. Umieść rozpakowaną zawartość projektu w repozytorium GitHub (plik `index.html` i `netlify.toml` w katalogu głównym, folder `netlify/functions` zachowany).
3. W Netlify wybierz **Add new project → Import an existing project** i podłącz repozytorium. Publikuj katalog `.`. Projekt nie wymaga kompilacji.
4. W ustawieniach Netlify dodaj zmienne środowiskowe **tylko w konfiguracji Netlify (zakres Functions)**:
   - `EODHD_API_TOKEN` = Twój prywatny token EODHD
   - `REAL_MARKET_DATA_LICENSE_CONFIRMED` = `yes` **wyłącznie po uzyskaniu wymaganych praw**
5. Opublikuj nowy deploy; zmiany w zmiennych środowiskowych wymagają ponownego wdrożenia.
6. Sprawdź `https://TWOJA_DOMENA/.netlify/functions/real-market?action=status`. Odpowiedź powinna zawierać `"ready":true`.
7. Otwórz grę → **Giełda REAL** → **Odśwież notowania**. Faktyczne ceny mogą być opóźnione o 15–20 minut. Handel wirtualny działa tylko przy świeżych danych i w godzinach sesji.

**Nie wpisuj tokenu do plików HTML/JS ani nie wysyłaj go na czacie.**

## Prywatne sprawdzenie połączenia (opcjonalne, bez publikowania)

Na komputerze z Node.js 18+ uruchom `node scripts/check-feed.mjs`, aby przetestować demonstracyjny symbol AAPL.US u dostawcy i API NBP. Ten test nie stanowi licencji ani potwierdzenia produkcyjnego uruchomienia rynku. Szczegóły podaje `README.md`.

## Dotychczasowy zapis gry

Zrób eksport JSON w poprzedniej wersji gry przed publikacją. Po uruchomieniu wersji na nowej domenie Netlify zaimportuj zapis w Ustawieniach. Przeglądarki izolują localStorage oddzielnie dla każdej domeny.
