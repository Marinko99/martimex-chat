window.MartimexExtensions = window.MartimexExtensions || [];

// stilovi kartica (ubrizgaju se jednom)
(function () {
  if (document.getElementById('mxc-style')) return;
  var s = document.createElement('style');
  s.id = 'mxc-style';
  s.textContent = `
    .mxc-wrap { display: flex; flex-direction: column; gap: 14px; }
    .mxc-card { border: 1px solid #e5e0da; border-radius: 12px; overflow: hidden;
                background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.08); max-width: 420px; }
    .mxc-img { width: 100%; height: 220px; object-fit: contain; background: #faf9f7; display: block; }
    .mxc-body { padding: 14px 16px; }
    .mxc-rank { font-size: 12px; font-weight: 600; color: #7c3aed; letter-spacing: .5px; }
    .mxc-title { font-size: 16px; font-weight: 700; margin: 4px 0 8px; }
    .mxc-desc { font-size: 14px; line-height: 1.5; color: #444; margin: 0 0 10px; }
    .mxc-price { font-size: 17px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px; }
    .mxc-btn { display: inline-block; padding: 10px 18px; border-radius: 8px; background: #7c3aed;
               color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; }
    .mxc-btn:hover { background: #6d28d9; }
  `;
  document.head.appendChild(s);
})();

// renderer za kartice preporučenih parfema (trace 'ext_product_card')
window.MartimexExtensions.push({
  name: 'ProductCardExtension',
  type: 'response',
  match: function ({ trace }) {
    return trace.type === 'ext_product_card' || (trace.payload && trace.payload.name === 'ext_product_card');
  },
  render: function ({ trace, element }) {
    var cards = (trace.payload && trace.payload.cards) || [];
    element.innerHTML = cards.map(function (c) {
      return `
        <div class="mxc-card">
          ${c.imageUrl ? `<img class="mxc-img" src="${c.imageUrl}" alt="${c.title}">` : ''}
          <div class="mxc-body">
            <div class="mxc-rank">${c.rank}. PREDLOG</div>
            <div class="mxc-title">${c.title}</div>
            <p class="mxc-desc">${c.description || ''}</p>
            <div class="mxc-price">${c.price || ''}</div>
            <a class="mxc-btn" href="${c.url}" target="_blank" rel="noopener">Pogledaj artikl</a>
          </div>
        </div>`;
    }).join('');
  }
});
