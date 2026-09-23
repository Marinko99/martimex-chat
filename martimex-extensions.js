(function () {
  // ═════════════════════════════════════════════════════════════════════
  //  MARTIMEX — kartice preporučenih proizvoda za Marti (v3)
  //
  //  Dva extensiona, isti dizajn:
  //   1) ProductCarouselExtension → trace "ext_product_carousel"
  //      horizontalni carousel: povlačenje mišem, strelice, traka napretka
  //   2) ProductCardExtension     → trace "ext_product_card"
  //      kartice jedna ispod druge
  //   Kad stigne samo jedan proizvod, oba prikazuju istaknutu karticu.
  //
  //  Payload koji funkcija šalje ostaje isti:
  //   { cards: [{ title, price, description, url, imageUrl }] }
  //  Neobavezna polja (prikažu se samo ako postoje):
  //   oldPrice → precrtana stara cijena i postotak popusta
  //   badge    → mala oznaka na niši, npr. "Novo"
  //
  //  Novo u v3:
  //   - veće kartice: naziv se uvijek vidi cijeli, opis gotovo cijeli
  //   - "Marka ▻ Naziv Eau de Parfum" se razlaže na marku, naziv i
  //     koncentraciju (koncentracija u kurzivu ispod naziva)
  //   - cijena i gumb dijele traku na dnu kartice: cijena velikim
  //     serifom lijevo, crni gumb uz desni rub kartice
  //   - "N° 1, N° 2, N° 3" kad Marti preporuči više proizvoda, da se
  //     "prvi / drugi / treći" iz njezine poruke lako poveže s karticom
  //   - u popisu opis obavija nišu s bočicom, kao stranica kataloga
  //   - tekst kartica preuzima font chat widgeta (prije je padao na Times)
  //
  //  Potpis dizajna: kad Marti pošalje preporuke, preko kartica prođe
  //  blaga ružičasta izmaglica sa sitnim kapljicama (kao sprej parfema)
  //  i bočice se pojave iz nje, jedna za drugom. Bočica stoji u lučnoj
  //  niši, kao u izlogu parfumerije; na hover preko stakla preleti odsjaj.
  //  Animacija se vrti samo prvi put; kad se povijest razgovora ponovno
  //  učita na drugoj stranici, kartice su odmah tu.
  // ═════════════════════════════════════════════════════════════════════


  // ─────────────────────────────────────────────────────────────────────
  //  POSTAVKE — sve što ćeš možda htjeti mijenjati nalazi se ovdje
  // ─────────────────────────────────────────────────────────────────────
  const MX_POSTAVKE = {
    boje: {                   // uvijek u obliku #rrggbb
      tinta:   '#000000', // crna kao trake u headeru i footeru: nazivi, cijene, gumb
      roza:    '#e2c3ba', // prašnjava roza iza loga: prijelaz gumba, izmaglica, popust
      puder:   '#f6ebe7', // najsvjetlija roza: niša u kojoj stoji bočica
      linija:  '#eee3de', // tanki rubovi i traka napretka
      dim:     '#6b605c', // opis proizvoda, koncentracija
      kartica: '#ffffff'  // pozadina kartice
    },

    // Serif za nazive i cijene, kao odjek serifnog MARTIMEX loga.
    // Ako tema webshopa već učitava neki serif, upiši njegovo ime na početak.
    fontNaslova: 'Baskerville, "Libre Baskerville", "Baskerville Old Face", "Hoefler Text", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',

    // Font za marku, opis i gumb. 'auto' → preuzme font samog chat widgeta.
    // Ako želiš neki drugi, upiši ga ovdje, npr. '"Inter", sans-serif'
    fontTeksta: 'auto',

    tekstGumba: 'Pogledaj proizvod',         // istaknuta kartica (jedan proizvod)
    tekstGumbaKratko: 'Pogledaj',            // carousel i popis
    oznakaRegije: 'Preporučeni proizvodi',   // za čitače zaslona

    // "Mancera ▻ Red Tobacco Eau de Parfum" → marka / naziv / koncentracija
    razdvojiNaziv: true,

    // "N° 1, N° 2..." na karticama kad je preporučeno više proizvoda
    numeracija: true,

    // Najviše znakova opisa (reže se na cijeloj riječi). 0 = bez ograničenja
    opisZnakova: 320,

    // Praćenje konverzija: true → svaki link na proizvod dobije parametar ispod
    pracenjeKonverzija: false,
    parametarPracenja: 'vfrec=true',

    // true → "sprej" animacija samo kad preporuka stigne prvi put
    animacijaSamoPrviPut: true
  };


  // ─────────────────────────────────────────────────────────────────────
  //  MOTOR — ispod ove linije ne treba ništa mijenjati
  // ─────────────────────────────────────────────────────────────────────
  const MX = (function () {
    'use strict';

    const P = MX_POSTAVKE;
    const B = P.boje;
    const MANJE_KRETANJA = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const EUR = (function () {
      try { return new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }); }
      catch (e) { return { format: function (n) { return n.toFixed(2).replace('.', ',') + '\u00a0€'; } }; }
    })();
    const REZERVNI_SANS = '"UCity Pro", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    // Miješanje boja u JS-u (umjesto CSS color-mix) da izgled radi i u starijim preglednicima
    function rgb(hex) {
      let h = String(hex || '').trim().replace('#', '');
      if (h.length === 3) h = h.replace(/./g, '$&$&');
      const n = parseInt(h.slice(0, 6), 16);
      return isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function prozirna(hex, a) { return 'rgba(' + rgb(hex).join(', ') + ', ' + a + ')'; }
    function mijesaj(hex1, hex2, udio) {
      const a = rgb(hex1), b = rgb(hex2);
      return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(a[i] * udio + b[i] * (1 - udio)); }).join(', ') + ')';
    }

    const IKONA_BOCA = '<svg viewBox="0 0 48 64" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" aria-hidden="true"><path d="M19 4.5h10v6.5H19z"/><path d="M21.5 11v4.5M26.5 11v4.5"/><rect x="9.5" y="15.5" width="29" height="44" rx="7"/><path d="M15.5 33.5h17M15.5 38.5h10" stroke-linecap="round" opacity=".55"/></svg>';
    const IKONA_LIJEVO = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 2.5 4 6l3.5 3.5"/></svg>';
    const IKONA_DESNO = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 2.5 8 6 4.5 9.5"/></svg>';

    // ── STIL ─────────────────────────────────────────────────────────────
    const CSS = `
      .mx {
        --mx-tinta: ${B.tinta};
        --mx-roza: ${B.roza};
        --mx-puder: ${B.puder};
        --mx-linija: ${B.linija};
        --mx-dim: ${B.dim};
        --mx-kartica: ${B.kartica};
        --mx-roza-45: ${prozirna(B.roza, .45)};
        --mx-roza-75: ${prozirna(B.roza, .75)};
        --mx-puder-88: ${prozirna(B.puder, .88)};
        --mx-rub-hover: ${mijesaj(B.roza, B.linija, .7)};
        --mx-ikona: ${mijesaj(B.roza, B.tinta, .55)};
        --mx-kap: ${mijesaj(B.roza, B.tinta, .8)};
        --mx-serif: ${P.fontNaslova};
        --mx-sans: ${REZERVNI_SANS};
        --mx-glatko: cubic-bezier(.16, 1, .3, 1);
        --mx-meko: cubic-bezier(.45, 0, .2, 1);
        position: relative;
        width: 100%;
        min-width: 0;
        color: var(--mx-tinta);
        font-family: var(--mx-sans);
        font-size: 14px;
        font-weight: 400;
        line-height: 1.4;
        letter-spacing: normal;
        white-space: normal;
        word-break: normal;
        text-align: left;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .mx, .mx *, .mx *::before, .mx *::after { box-sizing: border-box; }
      .mx-skriveno {
        position: absolute !important;
        width: 1px; height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }

      /* ── kartica ── */
      .mx-kartica {
        position: relative;
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: var(--mx-kartica);
        border: 1px solid var(--mx-linija);
        border-radius: 18px;
        overflow: hidden;
        isolation: isolate;
        color: inherit;
        text-decoration: none;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        box-shadow: 0 1px 1px rgba(60, 30, 25, .04), 0 14px 26px -22px rgba(110, 55, 45, .5);
        transition: transform .6s var(--mx-glatko), box-shadow .6s var(--mx-glatko), border-color .4s var(--mx-meko);
      }
      div.mx-kartica { cursor: default; }
      .mx-kartica:focus { outline: none; }
      .mx-kartica:focus-visible {
        border-color: var(--mx-tinta);
        box-shadow: 0 0 0 1px var(--mx-tinta), 0 14px 26px -22px rgba(110, 55, 45, .5);
      }
      .mx-tijelo {
        position: relative;
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-width: 0;
      }

      /* izlog: prostor s lučnom nišom u kojoj stoji bočica */
      .mx-izlog {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        padding: 12px 12px 0;
      }
      .mx-nisa {
        position: relative;
        flex: none;
        width: 150px;
        height: 174px;
        border-radius: 75px 75px 12px 12px;
        clip-path: inset(0 round 75px 75px 12px 12px);
        overflow: hidden;
        isolation: isolate;
        background:
          radial-gradient(120% 70% at 50% 0%, rgba(255, 255, 255, .7), rgba(255, 255, 255, 0) 62%),
          linear-gradient(to top, var(--mx-roza-45), transparent 26%),
          var(--mx-puder);
      }
      /* svjetlucanje dok se fotografija učitava */
      .mx-nisa::before {
        content: "";
        position: absolute;
        top: 0; right: 0; bottom: 0; left: 0;
        z-index: 0;
        background: linear-gradient(105deg, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, .75) 50%, rgba(255, 255, 255, 0) 70%);
        transform: translateX(-100%);
        animation: mx-svjetluca 1.5s var(--mx-meko) infinite;
      }
      /* tanki unutarnji okvir luka */
      .mx-nisa::after {
        content: "";
        position: absolute;
        top: 5px; right: 5px; bottom: 5px; left: 5px;
        z-index: 4;
        border: 1px solid rgba(255, 255, 255, .8);
        border-radius: 70px 70px 8px 8px;
        pointer-events: none;
      }
      .mx-nisa.mx-ucitano::before,
      .mx-nisa.mx-bez-slike::before { animation: none; opacity: 0; }

      .mx-boca {
        position: absolute;
        z-index: 1;
        left: 3%;
        top: 5%;
        width: 94%;
        height: 90%;
        max-width: none;
        max-height: none;
        margin: 0;
        object-fit: contain;
        object-position: 50% 70%;
        mix-blend-mode: multiply; /* bijela pozadina fotografije postaje ružičasta niša */
        opacity: 0;
        transform: translateY(8px) scale(.97);
        transition: opacity .7s var(--mx-meko), transform .9s var(--mx-glatko);
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
      }
      .mx-ucitano .mx-boca { opacity: 1; transform: none; }

      /* fotografija s tamnom ili šarenom pozadinom: ispunjava luk kao uokvirena slika */
      .mx-foto .mx-boca {
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: 50% 50%;
        mix-blend-mode: normal;
        transform: scale(1.06);
      }
      .mx-foto.mx-ucitano .mx-boca { transform: none; }

      /* odsjaj koji na hover preleti preko stakla izloga */
      .mx-sjaj {
        position: absolute;
        top: -10%;
        bottom: -10%;
        left: 0;
        width: 55%;
        z-index: 3;
        background: linear-gradient(100deg, rgba(255, 255, 255, 0) 15%, rgba(255, 255, 255, .6) 50%, rgba(255, 255, 255, 0) 85%);
        transform: translateX(-160%) skewX(-14deg);
        pointer-events: none;
      }

      .mx-prazno {
        position: absolute;
        top: 0; right: 0; bottom: 0; left: 0;
        z-index: 1;
        display: grid;
        place-items: center;
        color: var(--mx-ikona);
        opacity: .55;
      }
      .mx-prazno svg { width: 40px; height: 54px; }

      .mx-oznaka {
        position: absolute;
        z-index: 3;
        top: 16px;
        left: 14px;
        padding: 4px 9px;
        border-radius: 999px;
        font-size: 10.5px;
        line-height: 1.25;
        font-weight: 600;
        letter-spacing: .01em;
        white-space: nowrap;
        background: var(--mx-tinta);
        color: var(--mx-kartica);
      }

      /* ── tekst: marka, naziv, koncentracija, opis ── */
      .mx-info {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-width: 0;
        padding: 14px 15px 15px;
      }
      .mx-glava {
        display: flex;
        align-items: baseline;
        gap: 10px;
        margin: 0 0 4px;
      }
      .mx-marka {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 12px;
        line-height: 1.3;
        font-weight: 600;
        letter-spacing: .01em;
        color: var(--mx-tinta);
        overflow-wrap: break-word;
      }
      .mx-broj {
        flex: none;
        margin-left: auto;
        font-family: var(--mx-serif);
        font-style: italic;
        font-size: 13.5px;
        line-height: 1;
        color: var(--mx-ikona);
        white-space: nowrap;
        font-variant-numeric: lining-nums;
      }
      .mx-naziv {
        margin: 0;
        font-family: var(--mx-serif);
        font-size: 17px;
        line-height: 1.22;
        font-weight: 400;
        color: var(--mx-tinta);
        overflow-wrap: break-word;
      }
      .mx-konc {
        margin: 3px 0 0;
        font-family: var(--mx-serif);
        font-style: italic;
        font-size: 13.5px;
        line-height: 1.3;
        color: var(--mx-dim);
      }
      .mx-opis {
        margin: 10px 0 0;
        font-size: 12.5px;
        line-height: 1.55;
        color: var(--mx-dim);
        overflow-wrap: break-word;
      }

      /* ── dno kartice: cijena lijevo, gumb uz desni rub ── */
      .mx-dno {
        position: relative;
        display: flex;
        align-items: stretch;
        flex: none;
        min-height: 54px;
        border-top: 1px solid var(--mx-linija);
      }
      .mx-cijene {
        display: flex;
        flex-direction: column;
        justify-content: center;
        flex: none;                    /* cijena se nikad ne reže; gumb uzima ostatak */
        min-width: 54%;                /* gumbi na svim karticama počinju na istom mjestu */
        padding: 8px 16px 9px 15px;
      }
      .mx-cijena {
        display: block;
        font-family: var(--mx-serif);
        font-size: 23px;
        line-height: 1.05;
        color: var(--mx-tinta);
        font-variant-numeric: lining-nums;
        white-space: nowrap;
      }
      .mx-cijena-ostatak { font-size: .66em; margin-left: .04em; }
      .mx-popust-red {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        white-space: nowrap;
      }
      .mx-stara {
        font-size: 11.5px;
        line-height: 1.2;
        color: var(--mx-dim);
        text-decoration: line-through;
      }
      .mx-popust {
        padding: 2px 6px;
        border-radius: 999px;
        background: var(--mx-roza);
        color: var(--mx-tinta);
        font-size: 10.5px;
        line-height: 1.2;
        font-weight: 700;
      }

      /* gumb: crna traka kao header webshopa, na hover se prelije u rozu */
      .mx-gumb {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1 1 auto;
        min-width: 0;
        padding: 8px 16px;
        overflow: hidden;
        isolation: isolate;
        background: var(--mx-tinta);
        color: var(--mx-puder);
        font-size: 12.5px;
        line-height: 1.25;
        font-weight: 600;
        letter-spacing: .02em;
        text-align: center;
        transition: color .45s var(--mx-meko);
      }
      .mx-gumb::before {
        content: "";
        position: absolute;
        top: 0; right: 0; bottom: 0; left: 0;
        z-index: -1;
        background: var(--mx-roza);
        transform: scaleX(0);
        transform-origin: left center;
        transition: transform .6s var(--mx-glatko);
      }

      /* ── carousel ── */
      .mx-carousel { padding-bottom: 2px; }
      .mx-traka {
        --mx-fl: 0px;
        --mx-fr: 0px;
        position: relative;
        display: flex;
        gap: 12px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 8px 4px 30px;
        margin-bottom: -12px;          /* mjesto za sjenu kartice na hover, bez dodatnog razmaka */
        scroll-snap-type: x mandatory;
        scroll-padding-inline: 4px;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 var(--mx-fl), #000 calc(100% - var(--mx-fr)), transparent 100%);
                mask-image: linear-gradient(90deg, transparent 0, #000 var(--mx-fl), #000 calc(100% - var(--mx-fr)), transparent 100%);
      }
      .mx-traka::-webkit-scrollbar { display: none; }
      .mx-ima-lijevo .mx-traka { --mx-fl: 4px; }
      .mx-ima-desno .mx-traka { --mx-fr: 28px; }
      .mx-traka > .mx-kartica {
        flex: 0 0 clamp(200px, 78%, 240px);
        scroll-snap-align: start;
      }
      .mx-kartica--carousel .mx-naziv {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 4;
        overflow: hidden;
      }
      .mx-kartica--carousel .mx-opis {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 6;
        overflow: hidden;
      }
      .mx-kartica--carousel .mx-dno { min-height: 62px; }   /* ista visina i kad postoji popust */
      .mx-kartica--carousel .mx-cijene { padding-left: 14px; padding-right: 16px; }
      .mx-kartica--carousel .mx-gumb { padding: 8px 12px; }
      .mx-traka.mx-bez-snapa { scroll-snap-type: none; }
      .mx-traka.mx-vuce { cursor: grabbing; user-select: none; }
      .mx-traka.mx-vuce .mx-kartica { pointer-events: none; }

      .mx-kontrole {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: -6px;
        padding: 0 4px;
      }
      .mx-carousel:not(.mx-preljev) .mx-kontrole { display: none; }
      .mx-napredak {
        position: relative;
        flex: 1;
        height: 2px;
        border-radius: 2px;
        background: var(--mx-linija);
        overflow: hidden;
      }
      .mx-palac {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 40%;
        border-radius: 2px;
        background: var(--mx-tinta);
      }
      .mx-strelice { display: flex; gap: 6px; }
      .mx-strelica {
        -webkit-appearance: none;
        appearance: none;
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        margin: 0;
        padding: 0;
        border: 1px solid var(--mx-linija);
        border-radius: 50%;
        background: var(--mx-kartica);
        color: var(--mx-tinta);
        font: inherit;
        cursor: pointer;
        transition: background-color .3s var(--mx-meko), color .3s var(--mx-meko), border-color .3s var(--mx-meko), opacity .3s var(--mx-meko), transform .3s var(--mx-glatko);
      }
      .mx-strelica svg { width: 12px; height: 12px; }
      .mx-strelica:hover:not(:disabled) {
        background: var(--mx-tinta);
        border-color: var(--mx-tinta);
        color: var(--mx-kartica);
      }
      .mx-strelica:active:not(:disabled) { transform: scale(.9); }
      .mx-strelica:disabled { opacity: .3; cursor: default; }
      .mx-strelica:focus { outline: none; }
      .mx-strelica:focus-visible { outline: 2px solid var(--mx-tinta); outline-offset: 2px; }

      /* ── vertikalni popis: niša lijevo, tekst je obavija ── */
      .mx-lista {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 6px 4px 10px;
      }
      .mx-lista > .mx-kartica { flex: none; }
      .mx-kartica--red .mx-tijelo {
        display: block;
        padding: 12px 15px 15px 12px;
      }
      .mx-kartica--red .mx-tijelo::after { content: ""; display: table; clear: both; }
      .mx-kartica--red .mx-izlog {
        float: left;
        display: block;
        padding: 0;
        margin: 0 14px 6px 0;
      }
      .mx-kartica--red .mx-nisa {
        width: 102px;
        height: 130px;
        border-radius: 51px 51px 10px 10px;
        clip-path: inset(0 round 51px 51px 10px 10px);
      }
      .mx-kartica--red .mx-nisa::after { top: 4px; right: 4px; bottom: 4px; left: 4px; border-radius: 47px 47px 7px 7px; }
      .mx-kartica--red .mx-oznaka {
        top: auto;
        bottom: 9px;
        left: 50%;
        transform: translateX(-50%);
        padding: 3px 7px;
        font-size: 9.5px;
      }
      .mx-kartica--red .mx-info { display: block; padding: 3px 0 0; }

      /* ── istaknuta kartica (jedan proizvod) ── */
      .mx-istaknuta { padding: 6px 4px 10px; }
      .mx-kartica--istaknuta { max-width: 360px; }
      .mx-kartica--istaknuta .mx-izlog { padding-top: 14px; }
      .mx-kartica--istaknuta .mx-nisa {
        width: 180px;
        height: 210px;
        border-radius: 90px 90px 12px 12px;
        clip-path: inset(0 round 90px 90px 12px 12px);
      }
      .mx-kartica--istaknuta .mx-nisa::after { border-radius: 85px 85px 8px 8px; }
      .mx-kartica--istaknuta .mx-info { padding: 16px 18px 17px; }
      .mx-kartica--istaknuta .mx-marka { font-size: 12.5px; }
      .mx-kartica--istaknuta .mx-naziv { font-size: 21px; line-height: 1.2; }
      .mx-kartica--istaknuta .mx-konc { font-size: 14.5px; }
      .mx-kartica--istaknuta .mx-opis { font-size: 13px; margin-top: 12px; }
      .mx-kartica--istaknuta .mx-dno { min-height: 60px; }
      .mx-kartica--istaknuta .mx-cijene { padding-left: 18px; padding-right: 22px; }
      .mx-kartica--istaknuta .mx-cijena { font-size: 26px; }
      .mx-kartica--istaknuta .mx-gumb { font-size: 13px; }

      /* ── interakcija ── */
      @media (hover: hover) and (pointer: fine) {
        a.mx-kartica:hover {
          transform: translateY(-4px);
          border-color: var(--mx-rub-hover);
          box-shadow: 0 2px 4px rgba(60, 30, 25, .05), 0 22px 28px -22px rgba(110, 55, 45, .55);
        }
        a.mx-kartica:hover .mx-ucitano .mx-boca { transform: translateY(-5px) scale(1.035); }
        a.mx-kartica:hover .mx-foto.mx-ucitano .mx-boca { transform: scale(1.05); }
        a.mx-kartica:hover .mx-sjaj { transform: translateX(260%) skewX(-14deg); transition: transform 1.2s var(--mx-meko) .08s; }
        a.mx-kartica:hover .mx-gumb { color: var(--mx-tinta); }
        a.mx-kartica:hover .mx-gumb::before { transform: scaleX(1); }
        a.mx-kartica:active { transform: translateY(-2px) scale(.985); transition-duration: .15s; }
      }
      a.mx-kartica:focus-visible .mx-gumb { color: var(--mx-tinta); }
      a.mx-kartica:focus-visible .mx-gumb::before { transform: scaleX(1); }
      @media (hover: none) {
        a.mx-kartica:active { transform: scale(.985); transition-duration: .15s; }
        a.mx-kartica:active .mx-gumb { color: var(--mx-tinta); }
        a.mx-kartica:active .mx-gumb::before { transform: scaleX(1); transition-duration: .25s; }
      }

      /* ── pojava: izmaglica spreja i bočice koje izranjaju iz nje ── */
      .mx-maglica {
        position: absolute;
        top: 0; right: 0; bottom: 0; left: 0;
        z-index: 5;
        overflow: hidden;
        border-radius: 18px;
        pointer-events: none;
      }
      .mx-maglica::before,
      .mx-maglica::after {
        content: "";
        position: absolute;
        top: -25%;
        bottom: -25%;
        left: 0;
        width: 75%;
        border-radius: 50%;
        background: radial-gradient(closest-side, rgba(255, 255, 255, .96) 0%, var(--mx-puder-88) 42%, transparent 100%);
        filter: blur(10px);
        opacity: 0;
        animation: mx-sprej 1.55s cubic-bezier(.3, .1, .3, 1) forwards;
      }
      .mx-maglica::after {
        top: -5%;
        bottom: -35%;
        width: 55%;
        background: radial-gradient(closest-side, var(--mx-roza-75) 0%, transparent 100%);
        animation-duration: 1.75s;
        animation-delay: .1s;
      }
      /* kapljice spreja */
      .mx-kap {
        position: absolute;
        width: var(--mx-vel, 3px);
        height: var(--mx-vel, 3px);
        border-radius: 50%;
        background: radial-gradient(circle, #fff 0 32%, var(--mx-kap) 72%);
        box-shadow: 0 0 5px 1px var(--mx-roza-75);
        opacity: 0;
        animation: mx-kap 1.2s var(--mx-glatko) forwards;
      }
      .mx-pojava .mx-kartica {
        animation: mx-materijalizacija 1s var(--mx-glatko) backwards;
        animation-delay: calc(140ms + var(--mx-i, 0) * 110ms);
      }
      .mx-pojava .mx-kontrole {
        animation: mx-izron .7s var(--mx-glatko) backwards;
        animation-delay: .65s;
      }

      @keyframes mx-sprej {
        0%   { opacity: 0; transform: translateX(-100%) scale(.85); }
        22%  { opacity: 1; }
        70%  { opacity: .85; }
        100% { opacity: 0; transform: translateX(185%) scale(1.25); }
      }
      @keyframes mx-materijalizacija {
        0%   { opacity: 0; filter: blur(14px); transform: translateY(10px) scale(.96); }
        55%  { opacity: 1; }
        100% { opacity: 1; filter: blur(0); transform: none; }
      }
      @keyframes mx-kap {
        0%   { opacity: 0; transform: translate(0, 0) scale(.3); }
        12%  { opacity: 1; }
        65%  { opacity: .9; }
        100% { opacity: 0; transform: translate(var(--mx-dx, 120px), var(--mx-dy, 0px)) scale(1); }
      }
      @keyframes mx-izron {
        from { opacity: 0; transform: translateY(4px); }
      }
      @keyframes mx-svjetluca {
        to { transform: translateX(100%); }
      }
      @keyframes mx-samo-prozirnost {
        from { opacity: 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .mx-maglica, .mx-sjaj { display: none; }
        .mx-pojava .mx-kartica,
        .mx-pojava .mx-kontrole { animation: mx-samo-prozirnost .35s linear backwards; animation-delay: 0s; }
        .mx-nisa::before { animation: none; }
        .mx-kartica, .mx-boca, .mx-gumb, .mx-gumb::before { transition-duration: .01s !important; }
      }
    `;

    // Stil se ubacuje jednom: u shadow root widgeta (ili u <head> ako ga nema)
    function ubaciStil(element) {
      const korijen = element.getRootNode ? element.getRootNode() : document;
      const jeShadow = typeof ShadowRoot !== 'undefined' && korijen instanceof ShadowRoot;
      const cilj = jeShadow ? korijen : (korijen === document ? document.head : null);
      const stil = document.createElement('style');
      stil.setAttribute('data-mx-kartice', '3');
      stil.textContent = CSS;
      if (!cilj) { element.appendChild(stil); return; }       // element još nije u DOM-u
      const stari = cilj.querySelector('style[data-mx-kartice]');
      if (stari && stari.getAttribute('data-mx-kartice') === '3') return;
      if (stari) stari.remove();                              // stara verzija stila (npr. v2)
      cilj.appendChild(stil);
    }

    // Font chat widgeta: preuzima se s polja za unos poruke u istom shadow rootu
    function fontWidgeta(element) {
      if (P.fontTeksta && P.fontTeksta !== 'auto') return P.fontTeksta;
      try {
        const korijen = element.getRootNode ? element.getRootNode() : null;
        if (korijen && typeof ShadowRoot !== 'undefined' && korijen instanceof ShadowRoot) {
          const uzorci = korijen.querySelectorAll('textarea, input[type="text"]');
          for (let i = 0; i < uzorci.length; i++) {
            const f = getComputedStyle(uzorci[i]).fontFamily || '';
            if (f && !/^\s*["']?(monospace|serif|times)/i.test(f)) return f;
          }
        }
      } catch (e) { /* ostaje rezervni font */ }
      return REZERVNI_SANS;
    }

    // ── PODACI ───────────────────────────────────────────────────────────
    function tekst(v) {
      if (v === null || v === undefined) return '';
      let s = String(v).replace(/<[^>]*>/g, ' ');
      if (s.indexOf('&') !== -1) {                             // &amp; &#8211; ...
        const t = document.createElement('textarea');
        t.innerHTML = s;
        s = t.value;
      }
      return s.replace(/\s+/g, ' ').trim();
    }

    function uzmiKartice(trace) {
      let p = trace && trace.payload;
      if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = null; } }
      const lista = (p && (p.cards || p.kartice)) || [];
      if (!Array.isArray(lista)) return [];
      return lista.filter(Boolean).map(function (c) {
        return {
          naziv: tekst(c.title || c.name),
          opis: tekst(c.description),
          cijena: c.price,
          stara: c.oldPrice != null ? c.oldPrice : (c.regularPrice != null ? c.regularPrice : c.regular_price),
          slika: c.imageUrl || c.image || '',
          url: c.url || c.link || '',
          oznaka: tekst(c.badge)
        };
      });
    }

    // "Mancera ▻ Red Tobacco Eau de Parfum" → marka / naziv / koncentracija
    const RAZDJELNIK = /\s*[\u25bb\u25ba\u25b8\u25b9\u25b6\u203a\u00bb|]\s*/;
    const KONCENTRACIJA = /\s+((?:eau\s+de\s+(?:parfum|toilette|cologne)|extrait(?:\s+de\s+parfum)?|parfum|edp|edt)(?:\s+(?:intense|intens|absolu))?(?:\s+\d+(?:[.,]\d+)?\s*ml)?)\s*$/i;
    const DIO_NAZIVA = /^(le|la|l'|l\u2019|the|de|du|hair|body|mon|ma|son|sa)$/i;  // "Le Male Le Parfum" ostaje cijeli
    function razdvojiNaziv(pun) {
      const r = { marka: '', naziv: pun || '', konc: '' };
      if (!P.razdvojiNaziv || !pun) return r;
      const dijelovi = pun.split(RAZDJELNIK);
      if (dijelovi.length > 1) {
        const ostatak = dijelovi.slice(1).join(' ').trim();
        if (dijelovi[0].trim() && ostatak) {
          r.marka = dijelovi[0].trim();
          r.naziv = ostatak;
        }
      }
      const k = r.naziv.match(KONCENTRACIJA);
      if (k && k.index > 0) {
        const prije = r.naziv.slice(0, k.index).trim();
        const zadnjaRijec = prije.split(/\s+/).pop() || '';
        if (!(/^parfum\b/i.test(k[1]) && DIO_NAZIVA.test(zadnjaRijec))) {
          r.konc = k[1];
          r.naziv = prije;
        }
      }
      return r;
    }

    function skrati(s, max) {
      if (!s || !max || s.length <= max) return s;
      let t = s.slice(0, max);
      const razmak = t.lastIndexOf(' ');
      if (razmak > max * 0.6) t = t.slice(0, razmak);
      return t.replace(/[\s,;:.\u2013-]+$/, '') + '\u2026';
    }

    // "94.00", "94,00 €", 1299.5 → broj
    function brojIz(v) {
      if (typeof v === 'number') return isFinite(v) ? v : null;
      if (v === null || v === undefined) return null;
      let s = String(v).replace(/[^\d.,]/g, '');
      if (!s) return null;
      const d = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
      if (d !== -1 && s.length - d - 1 <= 2) s = s.slice(0, d).replace(/[.,]/g, '') + '.' + s.slice(d + 1);
      else s = s.replace(/[.,]/g, '');
      const n = parseFloat(s);
      return isFinite(n) ? n : null;
    }

    // Broj samo ako je vrijednost stvarno "čista" cijena (ne npr. "od 49 €")
    function brojCijene(v) {
      if (v === null || v === undefined || v === '') return null;
      if (typeof v === 'number') return isFinite(v) ? v : null;
      const s = String(v).trim();
      return /^(€|eur)?\s*[\d.,\s]+\s*(€|eur)?$/i.test(s) ? brojIz(s) : null;
    }

    // Uvijek hrvatski format: 94,00 € / 1.299,00 €
    function cijena(v) {
      if (v === null || v === undefined || v === '') return '';
      const n = brojCijene(v);
      if (n !== null) return EUR.format(n);
      return String(v).trim().replace(/(\d)\.(\d{2})(?!\d)/g, '$1,$2');
    }

    // Cijena kao element: eura punom veličinom, ",25 €" nešto manje
    function elementCijene(v) {
      const e = el('span', 'mx-cijena');
      const n = brojCijene(v);
      if (n !== null && typeof EUR.formatToParts === 'function') {
        const d = EUR.formatToParts(n);
        if (d.length && d[0].type === 'integer') {
          let i = 0, cijeli = '';
          while (i < d.length && (d[i].type === 'integer' || d[i].type === 'group')) cijeli += d[i++].value;
          e.appendChild(el('span', 'mx-cijena-cijeli', cijeli));
          const ostatak = d.slice(i).map(function (x) { return x.value; }).join('');
          if (ostatak) e.appendChild(el('span', 'mx-cijena-ostatak', ostatak));
          return e;
        }
      }
      const t = cijena(v);
      if (!t) return null;
      e.textContent = t;
      return e;
    }

    function sigurniLink(url) {
      if (!url) return '';
      try {
        const u = new URL(url, window.location.href);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
        if (P.pracenjeKonverzija && P.parametarPracenja) {
          new URLSearchParams(P.parametarPracenja).forEach(function (vr, kljuc) { u.searchParams.set(kljuc, vr); });
        }
        return u.href;
      } catch (e) { return ''; }
    }

    // Pamti koje su preporuke već "raspršene" da se animacija ne ponavlja
    function hash(s) {
      let h = 5381;
      for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
      return (h >>> 0).toString(36);
    }
    function trebaPojava(tip, kartice) {
      if (!P.animacijaSamoPrviPut) return true;
      const potpis = hash(tip + '|' + kartice.map(function (k) { return k.url + '~' + k.naziv; }).join('|'));
      const KLJUC = 'mx_kartice_prikazano';
      const sad = Date.now();
      try {
        const lista = JSON.parse(localStorage.getItem(KLJUC) || '[]');
        const zapis = lista.find(function (z) { return z && z.s === potpis; });
        if (zapis) return sad - zapis.t < 4000;              // isti prikaz u istom trenutku
        lista.push({ s: potpis, t: sad });
        localStorage.setItem(KLJUC, JSON.stringify(lista.slice(-40)));
      } catch (e) { /* bez localStorage → uvijek animiraj */ }
      return true;
    }

    // ── GRADNJA ──────────────────────────────────────────────────────────
    function el(tag, klasa, sadrzaj) {
      const e = document.createElement(tag);
      if (klasa) e.className = klasa;
      if (sadrzaj !== undefined) e.textContent = sadrzaj;
      return e;
    }

    function prazanIzlog(nisa) {
      nisa.classList.add('mx-bez-slike');
      const p = el('span', 'mx-prazno');
      p.innerHTML = IKONA_BOCA;
      nisa.appendChild(p);
    }

    // Pozadina fotografije proizvoda (uzorak iz 4 kuta smanjene slike):
    //  bijela ili prozirna → ostaje, bijelo se stapa s nišom
    //  svijetla neutralna (npr. sivi studio) → posvijetli se da i ona nestane u niši
    //  tamna ili šarena → fotografija ispunjava luk kao uokvirena slika
    function prilagodiFotografiju(img, nisa) {
      const N = 20;
      let d;
      try {
        const c = document.createElement('canvas');
        c.width = N;
        c.height = N;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0, N, N);
        d = g.getImageData(0, 0, N, N).data;
      } catch (e) { return; }        // slika s druge domene se ne smije čitati: ostaje zadani prikaz
      function kut(x, y) {
        let r = 0, gr = 0, b = 0, a = 0;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const i = ((y + dy) * N + x + dx) * 4;
            r += d[i]; gr += d[i + 1]; b += d[i + 2]; a += d[i + 3];
          }
        }
        if (a / 4 < 180) return null; // prozirno
        const lo = Math.min(r, gr, b) / 4;
        return { lo: lo, boja: Math.max(r, gr, b) / 4 - lo };
      }
      const puni = [kut(0, 0), kut(N - 2, 0), kut(0, N - 2), kut(N - 2, N - 2)]
        .filter(function (z) { return z && z.lo < 246; })
        .sort(function (a, b) { return a.lo - b.lo; });
      if (puni.length < 2) return;   // bijela ili prozirna pozadina
      const lo = puni[1].lo;         // drugi najtamniji kut: jedan "zalutali" kut ne odlučuje
      const boja = Math.max.apply(null, puni.slice(1).map(function (z) { return z.boja; }));
      if (lo >= 212 && boja <= 18) img.style.filter = 'brightness(' + Math.min(1.2, 255 / lo).toFixed(3) + ')';
      else nisa.classList.add('mx-foto');
    }

    // varijanta: 'carousel' | 'red' | 'istaknuta'
    function izgradiKarticu(k, i, ukupno, varijanta) {
      const link = sigurniLink(k.url);
      const kartica = el(link ? 'a' : 'div', 'mx-kartica mx-kartica--' + varijanta);
      kartica.style.setProperty('--mx-i', String(i));
      if (link) {
        kartica.href = link;
        kartica.target = '_blank';
        kartica.rel = 'noopener noreferrer';
        kartica.draggable = false;
      }
      const tijelo = el('div', 'mx-tijelo');

      // IZLOG: niša s bočicom
      const izlog = el('div', 'mx-izlog');
      const nisa = el('div', 'mx-nisa');
      if (k.slika) {
        const img = el('img', 'mx-boca');
        img.alt = '';                 // naziv je već u tekstu kartice
        img.decoding = 'async';
        img.draggable = false;
        let spremno = false;
        const gotovo = function () {
          if (spremno || !img.naturalWidth) return;
          spremno = true;
          prilagodiFotografiju(img, nisa);
          nisa.classList.add('mx-ucitano');
        };
        img.addEventListener('load', gotovo, { once: true });
        img.addEventListener('error', function () { img.remove(); prazanIzlog(nisa); }, { once: true });
        img.src = k.slika;
        nisa.appendChild(img);
        if (img.complete) gotovo();
      } else {
        prazanIzlog(nisa);
      }
      nisa.appendChild(el('span', 'mx-sjaj'));
      izlog.appendChild(nisa);
      if (k.oznaka) izlog.appendChild(el('span', 'mx-oznaka', k.oznaka));
      tijelo.appendChild(izlog);

      // TEKST: marka + N°, naziv, koncentracija, opis
      const info = el('div', 'mx-info');
      const d = razdvojiNaziv(k.naziv);
      const broj = (P.numeracija && ukupno > 1) ? 'N\u00b0\u202f' + (i + 1) : '';
      if (d.marka || broj) {
        const glava = el('div', 'mx-glava');
        if (d.marka) glava.appendChild(el('span', 'mx-marka', d.marka));
        if (broj) {
          const b = el('span', 'mx-broj', broj);
          b.setAttribute('aria-hidden', 'true');
          glava.appendChild(b);
        }
        info.appendChild(glava);
      }
      if (d.naziv) info.appendChild(el('div', 'mx-naziv', d.naziv));
      if (d.konc) info.appendChild(el('div', 'mx-konc', d.konc));
      const opis = skrati(k.opis, P.opisZnakova);
      if (opis) info.appendChild(el('p', 'mx-opis', opis));
      tijelo.appendChild(info);
      kartica.appendChild(tijelo);

      // DNO: cijena + gumb
      const nCijena = brojIz(k.cijena);
      const nStara = brojIz(k.stara);
      const popust = (nCijena !== null && nStara !== null && nStara > nCijena) ? Math.round((1 - nCijena / nStara) * 100) : 0;

      const dno = el('div', 'mx-dno');
      const cijene = el('div', 'mx-cijene');
      const ec = elementCijene(k.cijena);
      if (ec) {
        cijene.appendChild(ec);
        if (popust >= 1) {
          const red = el('div', 'mx-popust-red');
          const stara = el('s', 'mx-stara');
          stara.appendChild(el('span', 'mx-skriveno', 'Prije: '));
          stara.appendChild(document.createTextNode(cijena(k.stara)));
          red.appendChild(stara);
          red.appendChild(el('span', 'mx-popust', '\u2212' + popust + '\u00a0%'));
          cijene.appendChild(red);
        }
        dno.appendChild(cijene);
      }
      if (link) {
        const gumb = el('span', 'mx-gumb');
        gumb.appendChild(el('span', '', varijanta === 'istaknuta' ? P.tekstGumba : P.tekstGumbaKratko));
        gumb.appendChild(el('span', 'mx-skriveno', ' (otvara se u novoj kartici)'));
        dno.appendChild(gumb);
      }
      if (dno.childNodes.length) kartica.appendChild(dno);
      return kartica;
    }

    function gumbStrelica(smjer) {
      const b = el('button', 'mx-strelica');
      b.type = 'button';
      b.setAttribute('aria-label', smjer === 'lijevo' ? 'Prethodni proizvod' : 'Sljedeći proizvod');
      b.innerHTML = smjer === 'lijevo' ? IKONA_LIJEVO : IKONA_DESNO;
      return b;
    }

    // ── POJAVA ───────────────────────────────────────────────────────────
    function pokreniPojavu(korijen, broj) {
      korijen.classList.add('mx-pojava');
      const magla = el('div', 'mx-maglica');
      magla.setAttribute('aria-hidden', 'true');
      // kapljice: fini mlaz koji ulazi s lijeva i širi se udesno
      const W = korijen.clientWidth || 320;
      const H = korijen.clientHeight || 320;
      const r = Math.random;
      for (let i = 0; i < 18; i++) {
        const kap = el('i', 'mx-kap');
        kap.style.cssText =
          'left:' + Math.round(W * (-0.03 + r() * 0.08)) + 'px;' +
          'top:' + Math.round(H * (0.3 + r() * 0.22)) + 'px;' +
          '--mx-dx:' + Math.round(W * (0.45 + r() * 0.65)) + 'px;' +
          '--mx-dy:' + Math.round((r() - 0.5) * H * 0.55) + 'px;' +
          '--mx-vel:' + (1.8 + r() * 2.6).toFixed(1) + 'px;' +
          'animation-duration:' + Math.round(950 + r() * 650) + 'ms;' +
          'animation-delay:' + Math.round(30 + r() * 360) + 'ms';
        magla.appendChild(kap);
      }
      korijen.appendChild(magla);
      const t1 = setTimeout(function () { magla.remove(); }, 2300);
      const t2 = setTimeout(function () { korijen.classList.remove('mx-pojava'); }, 140 + broj * 110 + 1150);
      return function () { clearTimeout(t1); clearTimeout(t2); };
    }

    // ── PONAŠANJE CAROUSELA ──────────────────────────────────────────────
    function aktivirajCarousel(omot, traka, napredak, palac, prev, next) {
      const ciscenje = [];
      function na(cilj, tip, fn, opcije) {
        cilj.addEventListener(tip, fn, opcije);
        ciscenje.push(function () { cilj.removeEventListener(tip, fn, opcije); });
      }
      const kartice = function () { return Array.prototype.slice.call(traka.querySelectorAll('.mx-kartica')); };
      const padL = function () { return parseFloat(getComputedStyle(traka).paddingLeft) || 0; };
      const maxScroll = function () { return Math.max(0, traka.scrollWidth - traka.clientWidth); };

      function najbliza() {
        const x = traka.scrollLeft + padL();
        let naj = 0, razlika = Infinity;
        kartice().forEach(function (k, i) {
          const d = Math.abs(k.offsetLeft - x);
          if (d < razlika) { razlika = d; naj = i; }
        });
        return naj;
      }
      function skociNa(i) {
        const ks = kartice();
        if (!ks.length) return;
        i = Math.max(0, Math.min(ks.length - 1, i));
        traka.scrollTo({ left: Math.min(maxScroll(), ks[i].offsetLeft - padL()), behavior: MANJE_KRETANJA ? 'auto' : 'smooth' });
      }

      // traka napretka, strelice, blagi rubovi
      let raf = 0;
      function azuriraj() {
        raf = 0;
        const max = maxScroll();
        const x = traka.scrollLeft;
        const ima = max > 2;
        omot.classList.toggle('mx-preljev', ima);
        omot.classList.toggle('mx-ima-lijevo', ima && x > 2);
        omot.classList.toggle('mx-ima-desno', ima && x < max - 2);
        prev.disabled = !ima || x <= 2;
        next.disabled = !ima || x >= max - 2;
        const w = napredak.clientWidth;
        if (w && traka.scrollWidth) {
          const sirinaPalca = Math.max(28, w * Math.min(1, traka.clientWidth / traka.scrollWidth));
          const pomak = max > 0 ? (w - sirinaPalca) * (x / max) : 0;
          palac.style.width = sirinaPalca + 'px';
          palac.style.transform = 'translateX(' + pomak.toFixed(1) + 'px)';
        }
      }
      function zakazi() { if (!raf) raf = requestAnimationFrame(azuriraj); }

      na(traka, 'scroll', zakazi, { passive: true });
      na(prev, 'click', function () { skociNa(najbliza() - 1); });
      na(next, 'click', function () { skociNa(najbliza() + 1); });

      // tipkovnica: strelice lijevo/desno između kartica
      na(traka, 'keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const ks = kartice();
        const trenutna = e.target && e.target.closest ? e.target.closest('.mx-kartica') : null;
        const i = ks.indexOf(trenutna);
        if (i === -1) return;
        const j = Math.max(0, Math.min(ks.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
        if (j === i) return;
        e.preventDefault();
        ks[j].focus({ preventScroll: true });
        skociNa(j);
      });

      // povlačenje mišem (na dodir se traka ionako sama pomiče prstom)
      let vuce = null;
      na(traka, 'pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        vuce = { id: e.pointerId, x: e.clientX, pocetak: traka.scrollLeft, pomaknuto: false };
      });
      na(traka, 'pointermove', function (e) {
        if (!vuce || e.pointerId !== vuce.id) return;
        const dx = e.clientX - vuce.x;
        if (!vuce.pomaknuto) {
          if (Math.abs(dx) < 6) return;
          vuce.pomaknuto = true;
          traka.classList.add('mx-vuce', 'mx-bez-snapa');
          try { traka.setPointerCapture(e.pointerId); } catch (_) { /* nije kritično */ }
        }
        traka.scrollLeft = vuce.pocetak - dx;
      });
      function pusti(e) {
        if (!vuce || e.pointerId !== vuce.id) return;
        const bilo = vuce.pomaknuto;
        vuce = null;
        if (!bilo) return;
        try { traka.releasePointerCapture(e.pointerId); } catch (_) { /* nije kritično */ }
        traka.classList.remove('mx-vuce');
        // klik koji slijedi nakon povlačenja ne smije otvoriti proizvod
        const blokiraj = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
        traka.addEventListener('click', blokiraj, true);
        setTimeout(function () { traka.removeEventListener('click', blokiraj, true); }, 80);
        // glatko do najbliže kartice, pa tek onda vrati snap
        skociNa(najbliza());
        let gotovo = false;
        const vratiSnap = function () {
          if (gotovo) return;
          gotovo = true;
          traka.classList.remove('mx-bez-snapa');
          traka.removeEventListener('scrollend', vratiSnap);
        };
        traka.addEventListener('scrollend', vratiSnap);
        setTimeout(vratiSnap, 550);
      }
      na(traka, 'pointerup', pusti);
      na(traka, 'pointercancel', pusti);
      na(traka, 'dragstart', function (e) { e.preventDefault(); });

      if (window.ResizeObserver) {
        const ro = new ResizeObserver(zakazi);
        ro.observe(traka);
        ciscenje.push(function () { ro.disconnect(); });
      } else {
        na(window, 'resize', zakazi);
      }
      zakazi();

      return function () {
        ciscenje.forEach(function (f) { f(); });
        if (raf) cancelAnimationFrame(raf);
      };
    }

    // ── PRIKAZI ──────────────────────────────────────────────────────────
    function pripremi(element) {
      ubaciStil(element);
      element.style.width = '100%';
      // ako widget ponovno pozove render na istom elementu, ne dupliciraj kartice
      Array.prototype.slice.call(element.children).forEach(function (n) {
        if (n.classList && n.classList.contains('mx')) element.removeChild(n);
      });
    }

    function noviKorijen(element, klasa, uloga) {
      const korijen = el('div', 'mx ' + klasa);
      korijen.setAttribute('role', uloga);
      korijen.setAttribute('aria-label', P.oznakaRegije);
      korijen.style.setProperty('--mx-sans', fontWidgeta(element));
      return korijen;
    }

    function istaknuta(k, element, tip) {
      const korijen = noviKorijen(element, 'mx-istaknuta', 'group');
      korijen.appendChild(izgradiKarticu(k, 0, 1, 'istaknuta'));
      element.appendChild(korijen);
      const ocisti = trebaPojava(tip, [k]) ? pokreniPojavu(korijen, 1) : null;
      return function () { if (ocisti) ocisti(); };
    }

    function carousel(trace, element) {
      const kartice = uzmiKartice(trace);
      if (!kartice.length) return;
      pripremi(element);
      if (kartice.length === 1) return istaknuta(kartice[0], element, trace.type);

      const korijen = noviKorijen(element, 'mx-carousel mx-preljev', 'region');
      korijen.setAttribute('aria-roledescription', 'vrtuljak');

      const traka = el('div', 'mx-traka');
      kartice.forEach(function (k, i) { traka.appendChild(izgradiKarticu(k, i, kartice.length, 'carousel')); });

      const kontrole = el('div', 'mx-kontrole');
      const napredak = el('div', 'mx-napredak');
      napredak.setAttribute('aria-hidden', 'true');
      const palac = el('div', 'mx-palac');
      napredak.appendChild(palac);
      const strelice = el('div', 'mx-strelice');
      const prev = gumbStrelica('lijevo');
      const next = gumbStrelica('desno');
      strelice.appendChild(prev);
      strelice.appendChild(next);
      kontrole.appendChild(napredak);
      kontrole.appendChild(strelice);

      korijen.appendChild(traka);
      korijen.appendChild(kontrole);
      element.appendChild(korijen);

      const ciscenje = [aktivirajCarousel(korijen, traka, napredak, palac, prev, next)];
      if (trebaPojava(trace.type, kartice)) ciscenje.push(pokreniPojavu(korijen, kartice.length));
      return function () { ciscenje.forEach(function (f) { f(); }); };
    }

    function popis(trace, element) {
      const kartice = uzmiKartice(trace);
      if (!kartice.length) return;
      pripremi(element);
      if (kartice.length === 1) return istaknuta(kartice[0], element, trace.type);

      const korijen = noviKorijen(element, 'mx-lista', 'group');
      kartice.forEach(function (k, i) { korijen.appendChild(izgradiKarticu(k, i, kartice.length, 'red')); });
      element.appendChild(korijen);

      const ocisti = trebaPojava(trace.type, kartice) ? pokreniPojavu(korijen, kartice.length) : null;
      return function () { if (ocisti) ocisti(); };
    }

    return { carousel: carousel, popis: popis };
  })();


  // ─────────────────────────────────────────────────────────────────────
  //  EXTENSIONI
  // ─────────────────────────────────────────────────────────────────────
  const ProductCarouselExtension = {
    name: 'ProductCarousel',
    type: 'response',
    match: ({ trace }) => trace.type === 'ext_product_carousel',
    render: ({ trace, element }) => MX.carousel(trace, element),
  };

  const ProductCardExtension = {
    name: 'ProductCard',
    type: 'response',
    match: ({ trace }) => trace.type === 'ext_product_card',
    render: ({ trace, element }) => MX.popis(trace, element),
  };


  // ═════════════════════════════════════════════════════════════════════
  //  REGISTRACIJA — widget na stranici čita ekstenzije iz ovog niza
  // ═════════════════════════════════════════════════════════════════════
  window.MartimexExtensions = window.MartimexExtensions || [];
  window.MartimexExtensions.push(ProductCarouselExtension, ProductCardExtension);

})();
