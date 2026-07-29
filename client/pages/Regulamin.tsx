import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function Regulamin() {
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
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Regulamin</h1>
            <p className="text-slate-400 text-sm">Ostatnia aktualizacja: 29.07.2026</p>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 md:p-8 space-y-8 text-slate-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">1. Postanowienia ogólne</h2>
            <p>
              Niniejszy regulamin (dalej: „Regulamin") określa zasady korzystania z aplikacji
              StworzGrafik (dalej: „Aplikacja"), służącej do planowania grafików pracy, ewidencji
              urlopów, zwolnień i delegacji pracowników sklepów detalicznych.
            </p>
            <p className="mt-2">
              Właścicielem i administratorem Aplikacji jest <strong className="text-white">Mateusz Kruk</strong>,
              dalej zwany „Administratorem". Kontakt: kontakt@stworzgrafik.online.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">2. Definicje</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong className="text-white">Aplikacja</strong> — system StworzGrafik dostępny pod adresem www.stworzgrafik.online.</li>
              <li><strong className="text-white">Użytkownik</strong> — osoba korzystająca z Aplikacji na podstawie konta założonego przez Administratora lub upoważnionego przedstawiciela pracodawcy (np. kierownika sklepu, dyrektora).</li>
              <li><strong className="text-white">Konto</strong> — indywidualny dostęp do Aplikacji zabezpieczony loginem i hasłem.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">3. Zakres usługi</h2>
            <p>Aplikacja umożliwia w szczególności:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>tworzenie i zarządzanie miesięcznymi grafikami pracy,</li>
              <li>ewidencję urlopów, zwolnień lekarskich i delegacji,</li>
              <li>zarządzanie zespołem i uprawnieniami użytkowników,</li>
              <li>generowanie zestawień i eksportów grafiku (np. PDF, Excel).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">4. Zasady korzystania z konta</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Konta w Aplikacji zakładane są przez Administratora lub osoby przez niego upoważnione (np. Kierownika Sklepu, Dyrektora).</li>
              <li>Użytkownik zobowiązany jest do zachowania poufności danych logowania i nieudostępniania ich osobom trzecim.</li>
              <li>Użytkownik ponosi odpowiedzialność za działania wykonane przy użyciu jego konta, chyba że wynikały one z winy Administratora.</li>
              <li>W przypadku podejrzenia nieautoryzowanego dostępu do konta Użytkownik powinien niezwłocznie poinformować Administratora.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">5. Obowiązki Użytkownika</h2>
            <p>Użytkownik zobowiązuje się do:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>korzystania z Aplikacji zgodnie z jej przeznaczeniem oraz obowiązującymi przepisami prawa,</li>
              <li>wprowadzania prawdziwych i aktualnych danych,</li>
              <li>niepodejmowania działań mogących zakłócić działanie Aplikacji lub naruszyć bezpieczeństwo danych innych Użytkowników.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">6. Odpowiedzialność Administratora</h2>
            <p>
              Administrator dokłada starań, aby Aplikacja działała poprawnie i była dostępna
              w sposób ciągły, jednak nie gwarantuje nieprzerwanego i bezbłędnego działania
              Aplikacji (np. w związku z pracami konserwacyjnymi, awariami dostawcy hostingu lub
              okolicznościami niezależnymi od Administratora). Administrator nie ponosi
              odpowiedzialności za szkody wynikające z niewłaściwego korzystania z Aplikacji przez
              Użytkownika lub z wprowadzenia przez Użytkownika nieprawidłowych danych.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">7. Reklamacje i zgłaszanie błędów</h2>
            <p>
              Zgłoszenia dotyczące nieprawidłowego działania Aplikacji lub reklamacje można
              kierować na adres: kontakt@stworzgrafik.online. Administrator dołoży starań, aby rozpatrzyć
              zgłoszenie w rozsądnym terminie.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">8. Zmiany Regulaminu</h2>
            <p>
              Administrator zastrzega sobie prawo do zmiany Regulaminu, w szczególności w związku
              z rozwojem funkcjonalności Aplikacji lub zmianami przepisów prawa. Aktualna wersja
              Regulaminu jest zawsze dostępna pod tym adresem.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">9. Postanowienia końcowe</h2>
            <p>
              W sprawach nieuregulowanych Regulaminem zastosowanie mają przepisy prawa polskiego.
              Zasady przetwarzania danych osobowych opisane są odrębnie w{' '}
              <Link to="/polityka-prywatnosci" className="text-blue-400 hover:text-blue-300 underline">
                Polityce prywatności
              </Link>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
