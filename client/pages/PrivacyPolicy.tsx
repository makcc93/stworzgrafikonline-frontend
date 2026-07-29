import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Powrót
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Polityka prywatności</h1>
            <p className="text-slate-400 text-sm">Ostatnia aktualizacja: 29.07.2026</p>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 md:p-8 space-y-8 text-slate-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">1. Administrator danych</h2>
            <p>
              Administratorem danych osobowych przetwarzanych w ramach aplikacji StworzGrafik
              (dalej: „Aplikacja") jest:
            </p>
            <p className="mt-2 text-white font-medium">Mateusz Kruk</p>
            <p>e-mail kontaktowy: kontakt@stworzgrafik.online</p>
            <p>
              Mateusz Kruk jest jednocześnie właścicielem i twórcą Aplikacji oraz administratorem
              danych osobowych przetwarzanych za jej pośrednictwem.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">2. Jakie dane przetwarzamy</h2>
            <p>W ramach Aplikacji przetwarzane są następujące kategorie danych osobowych pracowników:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>imię i nazwisko,</li>
              <li>numer identyfikacyjny SAP,</li>
              <li>login do systemu,</li>
              <li>stanowisko / uprawnienia (np. kasjer, magazynier, kierownik),</li>
              <li>dane dotyczące grafiku pracy, urlopów, zwolnień lekarskich i delegacji,</li>
              <li>przypisanie do sklepu / oddziału / regionu.</li>
            </ul>
            <p className="mt-2">
              Aplikacja nie zbiera danych szczególnej kategorii (np. o stanie zdrowia — informacja
              o zwolnieniu lekarskim ogranicza się do faktu jego wystąpienia i dat, bez wskazania
              przyczyny/diagnozy).
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">3. Cel i podstawa prawna przetwarzania</h2>
            <p>Dane są przetwarzane w celu:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>planowania grafiku pracy i obsady sklepów,</li>
              <li>ewidencjonowania czasu pracy, urlopów, zwolnień i delegacji,</li>
              <li>zarządzania kontami użytkowników i uprawnieniami w Aplikacji.</li>
            </ul>
            <p className="mt-2">Podstawą prawną przetwarzania jest:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>art. 6 ust. 1 lit. b RODO — wykonanie umowy / czynności zmierzające do jej zawarcia,</li>
              <li>art. 6 ust. 1 lit. c RODO — obowiązki prawne ciążące na pracodawcy (m.in. ewidencja czasu pracy z Kodeksu pracy),</li>
              <li>art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes Administratora (organizacja pracy zespołu).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">4. Okres przechowywania danych</h2>
            <p>
              Dane przechowywane są przez okres niezbędny do realizacji celów, o których mowa
              w pkt 3, a po ustaniu zatrudnienia — przez okres wynikający z przepisów prawa
              dotyczących przechowywania dokumentacji pracowniczej,
              chyba że przepisy prawa wymagają dłuższego okresu przechowywania.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">5. Odbiorcy danych</h2>
            <p>
              Dane mogą być powierzone podmiotom obsługującym infrastrukturę techniczną Aplikacji
              (hosting, baza danych) na podstawie umów powierzenia przetwarzania danych zgodnych
              z art. 28 RODO: cyberfolks.pl. Dane nie są przekazywane poza Europejski
              Obszar Gospodarczy, chyba że dostawca infrastruktury zapewnia odpowiedni poziom
              ochrony zgodnie z RODO — w takim wypadku informacja o tym zostanie tu uzupełniona.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">6. Pliki cookies i podobne technologie</h2>
            <p>
              Aplikacja <strong className="text-white">nie wykorzystuje plików cookies</strong>.
              Do utrzymania sesji zalogowanego użytkownika wykorzystywany jest token uwierzytelniający
              zapisywany w pamięci przeglądarki (<code className="bg-slate-900/60 px-1 rounded">localStorage</code> /{' '}
              <code className="bg-slate-900/60 px-1 rounded">sessionStorage</code>) — jest to
              technologia techniczna, niezbędna do działania Aplikacji (logowania i autoryzacji
              zapytań), a nie plik cookie w rozumieniu Prawa telekomunikacyjnego. Dane te są
              przechowywane wyłącznie lokalnie w przeglądarce użytkownika i usuwane po wylogowaniu
              lub wygaśnięciu sesji.
            </p>
            <p className="mt-2">
              Aplikacja korzysta z narzędzia <strong className="text-white">Cloudflare Web Analytics</strong>{' '}
              do zbierania anonimowych, zagregowanych statystyk odwiedzin (np. liczba wejść,
              przybliżona lokalizacja na poziomie kraju, typ urządzenia). Narzędzie to{' '}
              <strong className="text-white">nie wykorzystuje plików cookies</strong> ani innych
              identyfikatorów śledzących, nie tworzy profilu pojedynczego użytkownika i nie
              pozwala na jego identyfikację. Więcej informacji:{' '}
              <a
                href="https://www.cloudflare.com/web-analytics/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                cloudflare.com/web-analytics
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">7. Prawa osoby, której dane dotyczą</h2>
            <p>Każdej osobie, której dane są przetwarzane, przysługuje prawo do:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>dostępu do swoich danych oraz otrzymania ich kopii,</li>
              <li>sprostowania (poprawienia) danych,</li>
              <li>usunięcia danych, w zakresie w jakim nie stoi to w sprzeczności z obowiązkiem ich przechowywania wynikającym z przepisów prawa,</li>
              <li>ograniczenia przetwarzania,</li>
              <li>przenoszenia danych,</li>
              <li>wniesienia sprzeciwu wobec przetwarzania opartego na art. 6 ust. 1 lit. f RODO,</li>
              <li>wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO).</li>
            </ul>
            <p className="mt-2">
              W celu realizacji powyższych praw prosimy o kontakt na adres: rodo@stworzgrafik.online.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">8. Bezpieczeństwo danych</h2>
            <p>
              Komunikacja z Aplikacją odbywa się z wykorzystaniem szyfrowanego połączenia (HTTPS).
              Hasła użytkowników przechowywane są w postaci zahaszowanej i nie są znane
              Administratorowi. Dostęp do danych w panelu administracyjnym mają wyłącznie osoby
              upoważnione, w zakresie wynikającym z przypisanej roli (Administrator / Dyrektor /
              Kierownik Sklepu).
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">9. Zmiany polityki prywatności</h2>
            <p>
              Niniejsza polityka może być okresowo aktualizowana, w szczególności w związku
              z rozwojem funkcjonalności Aplikacji lub zmianami przepisów prawa. Aktualna wersja
              jest zawsze dostępna pod tym adresem.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
