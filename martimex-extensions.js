(function () {
  // ═════════════════════════════════════════════════════════════════════
  //  MARTIMEX — kartice preporučenih proizvoda za Marti (v14)
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
  //   badge    → mala oznaka iznad marke, npr. "Novo"
  //
  //  Raspored kartice:
  //   ┌────────────────────────────┐
  //   │ ┌───────┐    Marka         │
  //   │ │ SLIKA │    Naziv         │
  //   │ │       │    CIJENA        │
  //   │ └───────┘                  │
  //   │ Opis artikla preko cijele  │
  //   │ širine kartice             │
  //   │     [ Pogledaj proizvod ]  │
  //   └────────────────────────────┘
  //   U carouselu (uske kartice) isti redoslijed ide jedno ispod drugog.
  //   Na proizvod vodi samo gumb, i to u istom prozoru (bez novih kartica).
  //
  //  Sitni detalji:
  //   - dvostruki tanki rub kartice, kao na etiketi parfemske bočice
  //     (unutarnja linija se zarumeni kad je miš iznad kartice)
  //   - bočica nema kutiju oko sebe: lebdi na prozirnoj podlozi, u blagoj
  //     auri boje vlastitog stakla (kao svjetlo koje prolazi kroz obojenu
  //     bočicu), s mekom sjenom ispod. Kad je miš iznad kartice, bočica se
  //     malo podigne, sjena se smanji, a aura se raširi
  //   - bijela pozadina fotografije pretvara se u pravu prozirnost (canvas);
  //     kad to nije moguće (slika s druge domene), stapa se CSS-om. Pokreti
  //     su izvedeni pomicanjem položaja, ne transformacijama, pa preglednik
  //     nikad ne razdvaja bočicu i auru u zasebne slojeve (inače se u
  //     Safariju oko bočice zna pojaviti bijeli pravokutnik)
  //   - fotografija se kvalitetno umanji točno na piksele ekrana u kojima se
  //     prikazuje, pa je preglednik ne mora umanjivati dok se bočica pomiče:
  //     ostaje oštra i na hoveru
  //   - gumb na hover: lagano se podigne, a preko njega jednom prijeđe
  //     odsjaj svjetla, kao po staklu bočice (boja gumba se ne mijenja)
  //
  //  Mjere: okomito jedan ritam od 20 px (gornji i donji rub, razmaci između
  //  dijelova, visina retka teksta), lijevo i desno 16 px od ruba kartice. Svaka bočica se automatski "izreže" iz fotografije
  //  i postavi u kadar jednako (ista podloga, ista najveća visina), bez obzira
  //  na to koliko bijelog prostora ima originalna fotografija.
  //   - tanka linija koja se prema krajevima gubi odvaja gornji dio od opisa
  //
  //  Pojava: kad Marti pošalje preporuke, preko kartica prođe blaga
  //  ružičasta izmaglica sa sitnim kapljicama (kao sprej parfema) i
  //  bočice se pojave iz nje, jedna za drugom. Animacija se vrti samo
  //  prvi put; kad se povijest razgovora ponovno učita, kartice su odmah tu.
  // ═════════════════════════════════════════════════════════════════════


  // ─────────────────────────────────────────────────────────────────────
  //  POSTAVKE — sve što ćeš možda htjeti mijenjati nalazi se ovdje
  // ─────────────────────────────────────────────────────────────────────
  const MX_POSTAVKE = {
    boje: {                   // uvijek u obliku #rrggbb
      tinta:   '#000000', // crna kao trake u headeru i footeru: marka, naziv, cijena
      roza:    '#e2c3ba', // prašnjava roza iza loga: izmaglica, oznaka popusta
      puder:   '#f6ebe7', // najsvjetlija roza: rubovi aure oko bočice
      linija:  '#eee3de', // tanki rubovi i traka napretka
      dim:     '#6b605c', // opis proizvoda
      kartica: '#ffffff', // pozadina kartice
      gumb:    '#333333'  // tamno siva: gumb "Pogledaj proizvod"
    },

    // Font za sav tekst u karticama. Avenir je ugrađen u Apple uređaje;
    // Windows i Android ga nemaju, pa tamo vrijedi redom sljedeći font u nizu.
    font: 'Avenir, "Avenir Next", "Avenir LT Std", "Avenir LT Pro", "Avenir Web", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

    // Neobavezno: datoteke fonta (.woff2) da Avenir vide i Windows i Android.
    // Upiši poveznice na licencirane datoteke, npr. s GitHub Pagesa:
    //   { url: 'https://marinko99.github.io/martimex-chat/fonts/avenir-book.woff2', tezina: 400 },
    //   { url: 'https://marinko99.github.io/martimex-chat/fonts/avenir-heavy.woff2', tezina: 800 }
    fontDatoteke: [],

    tekstGumba: 'Pogledaj proizvod',

    // false → proizvod se otvara u istom prozoru; true → u novoj kartici preglednika
    novaKartica: false,
    oznakaRegije: 'Preporučeni proizvodi',   // za čitače zaslona

    // true → aura iza bočice poprimi boju njezina stakla (crvena, zlatna...)
    // false → aura je uvijek u roza boji brenda
    auraUBojiBocice: true,

    // "Mancera ▻ Red Tobacco Eau de Parfum" → marka "Mancera" iznad naziva
    razdvojiNaziv: true,

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

    // Prostor slike (širina, visina u CSS px); slika zauzima 90 % visine.
    // Iste brojke koriste i CSS i obrada fotografije.
    const VITRINA = { carousel: [150, 168], red: [100, 132] };
    const VISINA_SLIKE = 0.9;
    // Kadar obrađene bočice (udio visine/širine prostora slike): bočica stoji
    // na "podlozi" na 90 % visine, najviše do 3 % od vrha, najviše 84 % širine.
    const KADAR = { vrh: 0.03, pod: 0.90, sirina: 0.84 };

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
        --mx-font: ${P.font};
        --mx-glatko: cubic-bezier(.16, 1, .3, 1);
        --mx-meko: cubic-bezier(.45, 0, .2, 1);
        position: relative;
        width: 100%;
        min-width: 0;
        color: var(--mx-tinta);
        font-family: var(--mx-font);
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
        padding: 17px 16px 20px;      /* lijevo/desno 16 px; gore 3 px manje jer slova imaju prazan prostor iznad sebe, pa je vidljivi razmak gore i dolje 20 px */
        background: var(--mx-kartica);
        border: 1px solid var(--mx-linija);
        border-radius: 18px;
        overflow: hidden;
        isolation: isolate;
        color: inherit;
        box-shadow: 0 1px 1px rgba(60, 30, 25, .04), 0 14px 26px -22px rgba(110, 55, 45, .5);
        transition: border-color .4s var(--mx-meko);
      }
      /* dvostruki rub, kao na etiketi parfemske bočice */
      .mx-kartica::before {
        content: "";
        position: absolute;
        top: 5px; right: 5px; bottom: 5px; left: 5px;
        border: 1px solid var(--mx-linija);
        border-radius: 13px;
        pointer-events: none;
        transition: border-color .5s var(--mx-meko);
      }

      /* gornji dio: slika + marka, naziv, cijena */
      .mx-vrh {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      /* prostor slike: bez kutije, prozirna podloga
         Važno: unutar .mx-nisa ništa se ne animira transformacijom, prozirnošću
         ni filterom — samo položajem (top/left...). Tako preglednik bočicu i
         auru uvijek crta u istom sloju i stapanje bijele pozadine ne puca. */
      .mx-izlog {
        position: relative;
        flex: none;
      }
      .mx-nisa {
        --mx-aura: ${prozirna(B.roza, .55)};
        --mx-aura-2: ${prozirna(B.puder, .95)};
        --mx-sjena: rgba(95, 52, 44, .28);
        position: relative;
        width: ${VITRINA.carousel[0]}px;
        height: ${VITRINA.carousel[1]}px;
        isolation: isolate;
        opacity: 0;                   /* cijela scena se pojavi odjednom, kad je fotografija spremna */
        transition: opacity .5s var(--mx-meko);
      }
      .mx-nisa.mx-ucitano,
      .mx-nisa.mx-bez-slike { opacity: 1; }

      /* aura: meki oblak boje stakla iza bočice */
      .mx-aura {
        position: absolute;
        top: 4%; right: 0; bottom: 12%; left: 0;
        z-index: 0;
        background:
          radial-gradient(34% 27% at 43% 40%, var(--mx-aura), transparent),
          radial-gradient(32% 27% at 58% 62%, var(--mx-aura), transparent),
          radial-gradient(46% 42% at 50% 50%, var(--mx-aura-2), transparent);
        transition: top 1.1s var(--mx-glatko), right 1.1s var(--mx-glatko), bottom 1.1s var(--mx-glatko), left 1.1s var(--mx-glatko);
        pointer-events: none;
      }

      /* meka sjena ispod bočice: bočica kao da lebdi */
      .mx-sjena {
        position: absolute;
        z-index: 0;
        left: 23%;
        right: 23%;
        top: 80%;
        height: 9%;
        border-radius: 50%;
        background: radial-gradient(closest-side, var(--mx-sjena), transparent);
        transition: left .9s var(--mx-glatko), right .9s var(--mx-glatko), top .9s var(--mx-glatko), height .9s var(--mx-glatko);
        pointer-events: none;
      }
      .mx-bez-slike .mx-sjena { display: none; }

      .mx-boca {
        position: absolute;
        z-index: 1;
        left: 0;
        top: calc(1% + 8px);          /* bočica se pri pojavi lagano podigne na mjesto */
        width: 100%;
        height: ${VISINA_SLIKE * 100}%;
        max-width: none;
        max-height: none;
        margin: 0;
        object-fit: contain;
        object-position: 50% 55%;
        mix-blend-mode: multiply;     /* rezerva: bijela pozadina se stapa kad fotografiju nije moguće obraditi */
        transition: top .9s var(--mx-glatko);
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
      }
      .mx-ucitano .mx-boca { top: 1%; }

      /* obrađena fotografija: bočica je već smještena u kadar (prava prozirnost),
         slika pokriva cijeli prostor, a sjena i aura prate stvarnu bočicu */
      .mx-prozirno .mx-boca { top: 8px; height: 100%; mix-blend-mode: normal; }
      .mx-prozirno.mx-ucitano .mx-boca { top: 0; }
      .mx-prozirno .mx-sjena {
        left: var(--mx-sjena-x, 23%);
        right: var(--mx-sjena-x, 23%);
        top: 87%;
        height: 9%;
      }
      .mx-prozirno .mx-aura {
        top: calc(var(--mx-sredina, 46%) - 42%);
        bottom: calc(100% - var(--mx-sredina, 46%) - 42%);
      }

      /* fotografija s tamnom ili šarenom pozadinom: ispunjava okvir kao uokvirena slika */
      .mx-foto {
        border-radius: 12px;
        clip-path: inset(0 round 12px);
        overflow: hidden;
      }
      .mx-foto .mx-aura,
      .mx-foto .mx-sjena { display: none; }
      .mx-foto .mx-boca,
      .mx-foto.mx-ucitano .mx-boca {
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: 50% 50%;
        mix-blend-mode: normal;
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

      /* oznaka (npr. "Novo"): mala pilula iznad marke, nikad preko bočice */
      .mx-oznaka {
        display: inline-block;
        margin: 3px 0 7px;            /* pilula nema prazan prostor iznad slova kao tekst: izjednačeno */
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 10px;
        line-height: 1.25;
        font-weight: 800;
        letter-spacing: .02em;
        white-space: nowrap;
        background: var(--mx-tinta);
        color: var(--mx-kartica);
      }

      /* marka, naziv, cijena: poravnato lijevo */
      .mx-glava {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        width: 100%;
        min-width: 0;
        text-align: left;
      }
      .mx-marka,
      .mx-naziv { text-wrap: balance; }   /* višeredni naziv lomi se u retke podjednake duljine */
      .mx-marka {
        max-width: 100%;
        font-size: 16px;
        line-height: 1.25;
        font-weight: 800;
        letter-spacing: .005em;
        color: var(--mx-tinta);
        overflow-wrap: break-word;
      }
      .mx-naziv {
        max-width: 100%;
        margin: 0;
        font-size: 14.5px;
        line-height: 1.4;
        font-weight: 400;
        color: var(--mx-tinta);
        overflow-wrap: break-word;
      }
      .mx-marka + .mx-naziv { margin-top: 2px; }
      .mx-cijene {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        margin-top: 8px;
      }
      .mx-glava > .mx-cijene:first-child { margin-top: 0; }
      .mx-cijena {
        display: block;
        font-size: 14.5px;
        line-height: 1.4;
        font-weight: 400;
        color: var(--mx-tinta);
        font-variant-numeric: lining-nums;
        white-space: nowrap;
      }
      .mx-popust-red {
        display: flex;
        align-items: center;
        gap: 6px;
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
        font-weight: 800;
      }

      /* tanka linija između gornjeg dijela i opisa: najjača u sredini, prema krajevima nestaje */
      .mx-crta {
        height: 1px;
        margin: 15px 0 0;             /* + prazan rub ispod sjene ili teksta ≈ 20 px vidljivog razmaka */
        background: linear-gradient(90deg,
          ${prozirna(B.roza, 0)} 0%,
          ${prozirna(B.roza, .75)} 25%,
          ${B.roza} 50%,
          ${prozirna(B.roza, .75)} 75%,
          ${prozirna(B.roza, 0)} 100%);
      }

      /* opis: poravnat s rubom slike i linijom (16 px od ruba kartice) */
      .mx-opis {
        margin: 15px 0 0;             /* + prored prvog retka ≈ 20 px vidljivog razmaka */
        text-wrap: pretty;            /* bez usamljene riječi u zadnjem retku */
        font-size: 12.5px;
        line-height: 1.6;
        color: var(--mx-dim);
        overflow-wrap: break-word;
      }

      /* razmak iznad gumba (u carouselu gura gumb na dno kartice) */
      .mx-razmak { display: block; flex: 1 0 17px; }

      /* gumb: tamno siva pilula */
      .mx-gumb {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        align-self: center;
        flex: none;
        max-width: 100%;
        min-height: 36px;
        padding: 0 22px;
        border-radius: 999px;
        background: ${B.gumb};
        color: var(--mx-puder);
        font-size: 12px;
        line-height: 1.2;
        font-weight: 500;
        letter-spacing: .03em;
        text-align: center;
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        overflow: hidden;
        isolation: isolate;
        box-shadow: 0 1px 2px rgba(0, 0, 0, .1);
        transition: transform .35s var(--mx-glatko), box-shadow .35s var(--mx-glatko);
      }
      .mx-gumb > span { position: relative; z-index: 1; }   /* tekst ostaje iznad odsjaja */
      /* odsjaj svjetla: tanka svijetla pruga koja na hover jednom prijeđe preko gumba */
      .mx-gumb::after {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 42%;
        z-index: 0;
        background: linear-gradient(100deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, .26) 50%, rgba(255, 255, 255, 0) 100%);
        transform: translateX(-140%) skewX(-18deg);
        pointer-events: none;
      }
      .mx-gumb:focus { outline: none; }
      .mx-gumb:focus-visible { outline: 2px solid var(--mx-tinta); outline-offset: 3px; }
      .mx-gumb:focus-visible::after { transform: translateX(340%) skewX(-18deg); transition: transform .9s var(--mx-meko); }
      .mx-gumb:active { transform: scale(.97); }

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
      .mx-kartica--carousel .mx-glava,
      .mx-kartica--carousel .mx-cijene { align-items: center; text-align: center; }
      .mx-kartica--carousel .mx-opis { text-align: center; }
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

      /* ── popis i istaknuta: slika lijevo, marka / naziv / cijena desno ── */
      .mx-lista {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 8px 4px 10px;
      }
      .mx-lista > .mx-kartica { flex: none; }
      .mx-kartica--red .mx-vrh {
        flex-direction: row;
        align-items: center;
        gap: 16px;
      }
      .mx-kartica--red .mx-nisa {
        width: ${VITRINA.red[0]}px;
        height: ${VITRINA.red[1]}px;
      }
      .mx-kartica--red .mx-glava { flex: 1 1 0; }

      .mx-istaknuta { padding: 8px 4px 10px; }
      .mx-kartica--istaknuta { max-width: 380px; }

      /* ── interakcija: kad je miš iznad kartice, bočica se podigne ── */
      @media (hover: hover) and (pointer: fine) {
        .mx-kartica:hover::before { border-color: var(--mx-rub-hover); }
        .mx-kartica:hover .mx-ucitano .mx-boca { top: calc(1% - 5px); }
        .mx-kartica:hover .mx-ucitano .mx-sjena { left: 30%; right: 30%; top: 81%; height: 7%; }
        .mx-kartica:hover .mx-ucitano .mx-aura { top: 1%; right: -5%; bottom: 9%; left: -5%; }
        .mx-kartica:hover .mx-foto.mx-ucitano .mx-boca { top: 0; }
        .mx-kartica:hover .mx-prozirno.mx-ucitano .mx-boca { top: -5px; }
        .mx-kartica:hover .mx-prozirno.mx-ucitano .mx-sjena {
          left: calc(var(--mx-sjena-x, 23%) + 6%);
          right: calc(var(--mx-sjena-x, 23%) + 6%);
          top: 88%;
          height: 7%;
        }
        .mx-kartica:hover .mx-prozirno.mx-ucitano .mx-aura {
          top: calc(var(--mx-sredina, 46%) - 45%);
          bottom: calc(100% - var(--mx-sredina, 46%) - 45%);
        }
        .mx-gumb:hover {
          transform: translateY(-1.5px);
          box-shadow: 0 7px 14px -7px rgba(0, 0, 0, .45);
        }
        .mx-gumb:hover::after { transform: translateX(340%) skewX(-18deg); transition: transform .9s var(--mx-meko); }
        .mx-gumb:active {
          transform: translateY(0) scale(.97);
          box-shadow: 0 1px 2px rgba(0, 0, 0, .1);
          transition-duration: .12s;
        }
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
      @keyframes mx-samo-prozirnost {
        from { opacity: 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .mx-maglica, .mx-gumb::after { display: none; }
        .mx-pojava .mx-kartica,
        .mx-pojava .mx-kontrole { animation: mx-samo-prozirnost .35s linear backwards; animation-delay: 0s; }
        .mx-kartica, .mx-kartica::before, .mx-nisa, .mx-boca, .mx-aura, .mx-sjena, .mx-gumb { transition-duration: .01s !important; }
      }
    `;

    // Stil se ubacuje jednom: u shadow root widgeta (ili u <head> ako ga nema)
    function ubaciStil(element) {
      const korijen = element.getRootNode ? element.getRootNode() : document;
      const jeShadow = typeof ShadowRoot !== 'undefined' && korijen instanceof ShadowRoot;
      const cilj = jeShadow ? korijen : (korijen === document ? document.head : null);
      const stil = document.createElement('style');
      stil.setAttribute('data-mx-kartice', '14');
      stil.textContent = CSS;
      if (!cilj) { element.appendChild(stil); return; }       // element još nije u DOM-u
      const stari = cilj.querySelector('style[data-mx-kartice]');
      if (stari && stari.getAttribute('data-mx-kartice') === '14') return;
      if (stari) stari.remove();                              // stara verzija stila (npr. v2)
      cilj.appendChild(stil);
    }

    // Neobavezne datoteke fonta idu u <head> stranice: fontovi iz <head>
    // vrijede i unutar shadow roota widgeta (obrnuto ne vrijedi)
    function ubaciFontove() {
      const datoteke = Array.isArray(P.fontDatoteke) ? P.fontDatoteke.filter(function (f) { return f && f.url; }) : [];
      if (!datoteke.length || document.getElementById('mx-kartice-font')) return;
      const stil = document.createElement('style');
      stil.id = 'mx-kartice-font';
      stil.textContent = datoteke.map(function (f) {
        return '@font-face{font-family:"Avenir Web";src:url("' + String(f.url).replace(/"/g, '%22') + '") format("woff2");' +
          'font-weight:' + (parseInt(f.tezina, 10) || 400) + ';font-style:' + (f.stil === 'italic' ? 'italic' : 'normal') + ';font-display:swap}';
      }).join('\n');
      document.head.appendChild(stil);
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

    // "Mancera ▻ Red Tobacco Eau de Parfum" → marka "Mancera", naziv "Red Tobacco Eau de Parfum"
    const RAZDJELNIK = /\s*[\u25bb\u25ba\u25b8\u25b9\u25b6\u203a\u00bb|]\s*/;
    function razdvojiNaziv(pun) {
      const r = { marka: '', naziv: pun || '' };
      if (!P.razdvojiNaziv || !pun) return r;
      const dijelovi = pun.split(RAZDJELNIK);
      if (dijelovi.length > 1) {
        const ostatak = dijelovi.slice(1).join(' ').trim();
        if (dijelovi[0].trim() && ostatak) {
          r.marka = dijelovi[0].trim();
          r.naziv = ostatak;
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

    function elementCijene(v) {
      const t = cijena(v);
      return t ? el('span', 'mx-cijena', t) : null;
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

    // Fotografija proizvoda se "čita" preko canvasa (moguće kad je slika s iste
    // domene kao stranica, npr. martimex.hr → martimex.hr):
    //  - pozadina (4 kuta): bijela ili svijetlosiva postaje prava prozirnost,
    //    tamna ili šarena fotografija ispuni okvir kao uokvirena slika
    //  - boja stakla postaje boja aure (crne, bijele, sive, prozirne → roza)
    //  - bočica se kvalitetno umanji točno na veličinu prikaza × gustoća piksela
    //    ekrana: preglednik je više ne mora umanjivati, pa je oštra i u pokretu
    // Kad se slika ne može pročitati, ostaje CSS stapanje (multiply) i roza aura.
    function obradiFotografiju(img, nisa, velicina, zavrsi) {
      let gotovo = false;
      const kraj = function () { if (!gotovo) { gotovo = true; zavrsi(); } };
      setTimeout(kraj, 2500);        // sigurnost: bočica se prikaže i ako obrada zapne

      const W = img.naturalWidth, H = img.naturalHeight;

      // 1) mali uzorak cijele fotografije: kakva je pozadina i koje je boje staklo
      const U = 48;
      let u;
      try {
        const c = document.createElement('canvas');
        c.width = U;
        c.height = U;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, U, U);
        u = g.getImageData(0, 0, U, U).data;
      } catch (e) { kraj(); return; } // slika s druge domene: ostaje CSS stapanje

      function kut(x0, y0) {
        let r = 0, gr = 0, b = 0, a = 0, n = 0;
        for (let y = y0; y < y0 + 3; y++) {
          for (let x = x0; x < x0 + 3; x++) {
            const i = (y * U + x) * 4;
            r += u[i]; gr += u[i + 1]; b += u[i + 2]; a += u[i + 3]; n++;
          }
        }
        if (a / n < 180) return null;  // prozirno
        const lo = Math.min(r, gr, b) / n;
        return { lo: lo, boja: Math.max(r, gr, b) / n - lo };
      }
      const puni = [kut(0, 0), kut(U - 3, 0), kut(0, U - 3), kut(U - 3, U - 3)]
        .filter(function (z) { return z && z.lo < 246; })
        .sort(function (a, b) { return a.lo - b.lo; });
      let pojacaj = 1;               // > 1 kad je pozadina svijetlosiva (studijska)
      let prag = 236;                // piksel tamniji od ovoga pripada bočici, ne pozadini
      if (puni.length >= 2) {
        const lo = puni[1].lo;       // drugi najtamniji kut: jedan "zalutali" kut ne odlučuje
        const boja = Math.max.apply(null, puni.slice(1).map(function (z) { return z.boja; }));
        if (lo >= 212 && boja <= 18) {
          pojacaj = Math.min(1.2, 255 / lo);
          prag = lo - 16;
        } else {
          nisa.classList.add('mx-foto');
          kraj();
          return;
        }
      }
      if (P.auraUBojiBocice) obojiAuru(u, prag, nisa);

      // 2) radna kopija (najviše 900 px): bijela pozadina → prozirnost,
      //    a usput se nađu stvarne granice bočice na fotografiji
      const R = Math.min(1, 900 / Math.max(W, H));
      const rw = Math.max(8, Math.round(W * R)), rh = Math.max(8, Math.round(H * R));
      let radna, rg, rp;
      try {
        const um = umanji(img, W, H, rw, rh);
        radna = document.createElement('canvas');
        radna.width = rw;
        radna.height = rh;
        rg = radna.getContext('2d', { willReadFrequently: true });
        rg.imageSmoothingEnabled = true;
        rg.imageSmoothingQuality = 'high';
        rg.drawImage(um.slika, 0, 0, um.w, um.h, 0, 0, rw, rh);
        rp = rg.getImageData(0, 0, rw, rh);
      } catch (e) { kraj(); return; }
      const d = rp.data;
      const SUM = 4;                 // JPEG šum oko čiste bijele
      let x0 = rw, y0 = rh, x1 = -1, y1 = -1;
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        if (d[i + 3] === 0) continue;
        const r = Math.min(255, d[i] * pojacaj);
        const gr = Math.min(255, d[i + 1] * pojacaj);
        const b = Math.min(255, d[i + 2] * pojacaj);
        const a = Math.max(0, 255 - SUM - Math.min(r, gr, b)) / (255 - SUM);
        if (a <= 0) { d[i + 3] = 0; continue; }
        // boje se "odvoje" od bijele: rubovi i sjene s fotografije ostanu mekani
        d[i] = 255 - (255 - r) / a;
        d[i + 1] = 255 - (255 - gr) / a;
        d[i + 2] = 255 - (255 - b) / a;
        d[i + 3] = a * d[i + 3];
        if (d[i + 3] > 60) {         // dovoljno "puno" da pripada bočici
          const x = p % rw, y = (p - x) / rw;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
      rg.putImageData(rp, 0, 0);
      if (x1 < x0 || y1 < y0) { x0 = 0; y0 = 0; x1 = rw - 1; y1 = rh - 1; }   // ništa nađeno: cijela slika

      // 3) kadar: svaka bočica stoji na istoj podlozi, jednako velika i centrirana,
      //    točno u pikselima ekrana (preglednik je više ne mora umanjivati)
      const gustoca = Math.min(3, Math.max(2, Math.ceil(window.devicePixelRatio || 1)));
      const cw = Math.round(velicina[0] * gustoca), ch = Math.round(velicina[1] * gustoca);
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const k = Math.min(cw * KADAR.sirina / bw, ch * (KADAR.pod - KADAR.vrh) / bh, 1.25);
      const ox = cw / 2 - (x0 + bw / 2) * k;
      const oy = ch * KADAR.pod - (y1 + 1) * k;
      let izvor = radna, iw = rw, ih = rh, kk = k;
      while (kk < 0.5 && iw > 32 && ih > 32) {   // velik skok umanjivanja → u koracima
        const c = document.createElement('canvas');
        c.width = Math.round(iw / 2);
        c.height = Math.round(ih / 2);
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(izvor, 0, 0, c.width, c.height);
        izvor = c; iw = c.width; ih = c.height; kk *= 2;
      }
      let platno;
      try {
        platno = document.createElement('canvas');
        platno.width = cw;
        platno.height = ch;
        const g = platno.getContext('2d');
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(izvor, 0, 0, iw, ih, ox, oy, rw * k, rh * k);
      } catch (e) { kraj(); return; }

      // sjena široka kao bočica, aura centrirana na bočicu
      const sirina = Math.max(0.3, Math.min(0.62, (bw * k / cw) * 1.15));
      nisa.style.setProperty('--mx-sjena-x', ((1 - sirina) / 2 * 100).toFixed(1) + '%');
      nisa.style.setProperty('--mx-sredina', ((KADAR.pod - bh * k / ch / 2) * 100).toFixed(1) + '%');

      const zamijeni = function (url) {
        if (!url) { kraj(); return; }
        img.addEventListener('load', kraj, { once: true });
        nisa.classList.add('mx-prozirno');
        img.src = url;
      };
      try {
        if (platno.toBlob) platno.toBlob(function (blob) { zamijeni(blob ? URL.createObjectURL(blob) : ''); }, 'image/png');
        else zamijeni(platno.toDataURL('image/png'));
      } catch (e) { kraj(); }
    }

    // Kvalitetno umanjivanje: velika fotografija se prepolovi korak po korak
    // (jedan veliki skok s 2000 na 200 px daje nazubljene rubove)
    function umanji(izvor, w, h, ciljW, ciljH) {
      let slika = izvor;
      while (w / 2 >= ciljW && h / 2 >= ciljH) {
        w = Math.round(w / 2);
        h = Math.round(h / 2);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(slika, 0, 0, w, h);
        slika = c;
      }
      return { slika: slika, w: slika === izvor ? izvor.naturalWidth : w, h: slika === izvor ? izvor.naturalHeight : h };
    }

    function obojiAuru(d, prag, nisa) {
      let r = 0, g = 0, b = 0, t = 0;
      const korak = Math.max(1, Math.floor(d.length / 4 / 6000)) * 4;   // dovoljan uzorak piksela
      for (let i = 0; i < d.length; i += korak) {
        if (d[i + 3] < 128) continue;                          // prozirni dio slike
        const mn = Math.min(d[i], d[i + 1], d[i + 2]);
        const mx = Math.max(d[i], d[i + 1], d[i + 2]);
        if (mn >= prag) continue;                              // pozadina
        const w = (mx - mn) / 255 + 0.02;                      // obojeni pikseli vrijede više od sivih
        r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; t += w;
      }
      if (!t) return;
      const c = uHsl(r / t, g / t, b / t);
      if (c.s < 0.2 || c.l < 0.1 || c.l > 0.92) return;        // crna, bijela, siva ili prozirna → roza
      const h = Math.round(c.h);
      const sat = Math.round(Math.min(62, Math.max(38, c.s * 100)));
      nisa.style.setProperty('--mx-aura', 'hsla(' + h + ', ' + sat + '%, 76%, .5)');
      nisa.style.setProperty('--mx-aura-2', 'hsla(' + h + ', ' + sat + '%, 90%, .85)');
      nisa.style.setProperty('--mx-sjena', 'hsla(' + h + ', ' + Math.round(sat * .7) + '%, 28%, .32)');
    }

    function uHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
      if (mx === mn) return { h: 0, s: 0, l: l };
      const dd = mx - mn;
      const s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
      let h;
      if (mx === r) h = (g - b) / dd + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / dd + 2;
      else h = (r - g) / dd + 4;
      return { h: h * 60, s: s, l: l };
    }

    // varijanta: 'red' (slika lijevo, tekst desno) | 'istaknuta' (isto, jedan proizvod) | 'carousel' (jedno ispod drugog)
    function izgradiKarticu(k, i, varijanta) {
      const link = sigurniLink(k.url);
      const klasa = varijanta === 'istaknuta' ? 'mx-kartica--red mx-kartica--istaknuta' : 'mx-kartica--' + varijanta;
      const kartica = el('div', 'mx-kartica ' + klasa);
      kartica.style.setProperty('--mx-i', String(i));
      const vrh = el('div', 'mx-vrh');

      // SLIKA: bočica u auri, sa sjenom ispod
      const izlog = el('div', 'mx-izlog');
      const nisa = el('div', 'mx-nisa');
      nisa.appendChild(el('span', 'mx-aura'));
      nisa.appendChild(el('span', 'mx-sjena'));
      if (k.slika) {
        const img = el('img', 'mx-boca');
        img.alt = '';                 // naziv je već u tekstu kartice
        img.decoding = 'async';
        img.draggable = false;
        if ('fetchPriority' in img) img.fetchPriority = 'high';   // slike su glavni sadržaj poruke
        const velicina = VITRINA[varijanta === 'carousel' ? 'carousel' : 'red'];   // prostor slike u CSS px
        let spremno = false;
        const gotovo = function () {
          if (spremno || !img.naturalWidth) return;
          spremno = true;
          obradiFotografiju(img, nisa, velicina, function () { nisa.classList.add('mx-ucitano'); });
        };
        img.addEventListener('load', gotovo, { once: true });
        img.addEventListener('error', function () { img.remove(); prazanIzlog(nisa); }, { once: true });
        img.src = k.slika;
        nisa.appendChild(img);
        if (img.complete) gotovo();
      } else {
        prazanIzlog(nisa);
      }
      izlog.appendChild(nisa);
      vrh.appendChild(izlog);

      // MARKA, NAZIV, CIJENA
      const glava = el('div', 'mx-glava');
      if (k.oznaka) glava.appendChild(el('span', 'mx-oznaka', k.oznaka));
      const d = razdvojiNaziv(k.naziv);
      if (d.marka) glava.appendChild(el('span', 'mx-marka', d.marka));
      if (d.naziv) glava.appendChild(el('div', 'mx-naziv', d.naziv));

      const nCijena = brojIz(k.cijena);
      const nStara = brojIz(k.stara);
      const popust = (nCijena !== null && nStara !== null && nStara > nCijena) ? Math.round((1 - nCijena / nStara) * 100) : 0;
      const ec = elementCijene(k.cijena);
      if (ec) {
        const cijene = el('div', 'mx-cijene');
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
        glava.appendChild(cijene);
      }
      vrh.appendChild(glava);
      kartica.appendChild(vrh);

      // LINIJA + OPIS
      const opis = skrati(k.opis, P.opisZnakova);
      if (opis) {
        const crta = el('div', 'mx-crta');
        crta.setAttribute('aria-hidden', 'true');
        kartica.appendChild(crta);
        kartica.appendChild(el('p', 'mx-opis', opis));
      }

      // GUMB: jedini link na kartici
      if (link) {
        kartica.appendChild(el('span', 'mx-razmak'));
        const gumb = el('a', 'mx-gumb');
        gumb.href = link;
        gumb.draggable = false;
        if (P.novaKartica) {
          gumb.target = '_blank';
          gumb.rel = 'noopener';
        } else {
          gumb.target = '_self';
        }
        gumb.appendChild(el('span', '', P.tekstGumba));
        const zaCitac = [d.marka, d.naziv].filter(Boolean).join(' ');
        if (zaCitac) gumb.appendChild(el('span', 'mx-skriveno', ': ' + zaCitac));
        if (P.novaKartica) gumb.appendChild(el('span', 'mx-skriveno', ' (otvara se u novoj kartici)'));
        kartica.appendChild(gumb);
      }
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
      setTimeout(function () { magla.remove(); }, 2300);
      setTimeout(function () { korijen.classList.remove('mx-pojava'); }, 140 + broj * 110 + 1150);
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
        const cilj = ks[j].querySelector('.mx-gumb');
        if (!cilj) return;
        e.preventDefault();
        cilj.focus({ preventScroll: true });
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
    // Voiceflow zna ponovno pozvati render za istu poruku (npr. kad stigne
    // sljedeća poruka). Tada postojeće kartice ostaju netaknute; da se grade
    // iznova, bočica i efekti ispod kursora na trenutak bi se "resetirali".
    function potpisPrikaza(tip, kartice) {
      return hash(tip + '|' + JSON.stringify(kartice));
    }
    function postojeciKorijen(element, potpis) {
      const djeca = element.children;
      for (let i = 0; i < djeca.length; i++) {
        if (djeca[i].classList.contains('mx') && djeca[i].getAttribute('data-mx-potpis') === potpis) return djeca[i];
      }
      return null;
    }
    const BEZ_CISCENJA = function () {};

    function pripremi(element) {
      ubaciStil(element);
      ubaciFontove();
      element.style.width = '100%';
      // drugačije kartice na istom elementu: stare se uklanjaju
      Array.prototype.slice.call(element.children).forEach(function (n) {
        if (n.classList && n.classList.contains('mx')) element.removeChild(n);
      });
    }

    function noviKorijen(klasa, uloga, potpis) {
      const korijen = el('div', 'mx ' + klasa);
      korijen.setAttribute('role', uloga);
      korijen.setAttribute('aria-label', P.oznakaRegije);
      korijen.setAttribute('data-mx-potpis', potpis);
      return korijen;
    }

    function istaknuta(k, element, tip, potpis) {
      const korijen = noviKorijen('mx-istaknuta', 'group', potpis);
      korijen.appendChild(izgradiKarticu(k, 0, 'istaknuta'));
      element.appendChild(korijen);
      if (trebaPojava(tip, [k])) pokreniPojavu(korijen, 1);
      return BEZ_CISCENJA;
    }

    // Slušatelji carousela (strelice, povlačenje); nikad dvaput na istom carouselu
    function pokreniCarousel(korijen) {
      if (korijen.__mxCiscenje) korijen.__mxCiscenje();
      const strelice = korijen.querySelectorAll('.mx-strelica');
      const stop = aktivirajCarousel(korijen, korijen.querySelector('.mx-traka'), korijen.querySelector('.mx-napredak'),
        korijen.querySelector('.mx-palac'), strelice[0], strelice[1]);
      let aktivno = true;
      const ocisti = function () {
        if (!aktivno) return;
        aktivno = false;
        stop();
        if (korijen.__mxCiscenje === ocisti) korijen.__mxCiscenje = null;
      };
      korijen.__mxCiscenje = ocisti;
      return ocisti;
    }

    function carousel(trace, element) {
      const kartice = uzmiKartice(trace);
      if (!kartice.length) return;
      const potpis = potpisPrikaza(trace.type, kartice);
      const postojeci = postojeciKorijen(element, potpis);
      if (postojeci) return postojeci.classList.contains('mx-carousel') ? pokreniCarousel(postojeci) : BEZ_CISCENJA;
      pripremi(element);
      if (kartice.length === 1) return istaknuta(kartice[0], element, trace.type, potpis);

      const korijen = noviKorijen('mx-carousel mx-preljev', 'region', potpis);
      korijen.setAttribute('aria-roledescription', 'vrtuljak');

      const traka = el('div', 'mx-traka');
      kartice.forEach(function (k, i) { traka.appendChild(izgradiKarticu(k, i, 'carousel')); });

      const kontrole = el('div', 'mx-kontrole');
      const napredak = el('div', 'mx-napredak');
      napredak.setAttribute('aria-hidden', 'true');
      napredak.appendChild(el('div', 'mx-palac'));
      const strelice = el('div', 'mx-strelice');
      strelice.appendChild(gumbStrelica('lijevo'));
      strelice.appendChild(gumbStrelica('desno'));
      kontrole.appendChild(napredak);
      kontrole.appendChild(strelice);

      korijen.appendChild(traka);
      korijen.appendChild(kontrole);
      element.appendChild(korijen);

      const ocisti = pokreniCarousel(korijen);
      if (trebaPojava(trace.type, kartice)) pokreniPojavu(korijen, kartice.length);
      return ocisti;
    }

    function popis(trace, element) {
      const kartice = uzmiKartice(trace);
      if (!kartice.length) return;
      const potpis = potpisPrikaza(trace.type, kartice);
      if (postojeciKorijen(element, potpis)) return BEZ_CISCENJA;
      pripremi(element);
      if (kartice.length === 1) return istaknuta(kartice[0], element, trace.type, potpis);

      const korijen = noviKorijen('mx-lista', 'group', potpis);
      kartice.forEach(function (k, i) { korijen.appendChild(izgradiKarticu(k, i, 'red')); });
      element.appendChild(korijen);

      if (trebaPojava(trace.type, kartice)) pokreniPojavu(korijen, kartice.length);
      return BEZ_CISCENJA;
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
