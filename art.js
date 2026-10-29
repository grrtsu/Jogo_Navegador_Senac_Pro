/* =========================================================
   ZYRO — art.js  (Artes em SVG usadas nos menus)
   Mesmas ilustrações do Figma: ZYRO de frente, logotipo e
   miniaturas dos obstáculos.
   ========================================================= */
window.ZYRO = window.ZYRO || {};

ZYRO.Art = {
  uid: 0,
  hero(arms = 'pump') {
    const id = 'h' + (this.uid++), SK = '#C98663', SKD = '#A86A4B', DK = '#101A35', LEG = '#3D2F94';
    const armA = arms === 'both' ? 'M114 178 L84 140 L92 96' : 'M114 178 L82 162 L88 118';
    const armB = arms === 'both' ? 'M206 178 L236 140 L228 96' : 'M206 180 L232 214 L222 246';
    const fa = armA.split(/[ ML]/).filter(Boolean).slice(-2), fb = armB.split(/[ ML]/).filter(Boolean).slice(-2);
    return `<svg viewBox="0 0 320 440" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#00D9FF"/><stop offset="1" stop-color="#7955FF"/></linearGradient><radialGradient id="${id}g" cx="0.5" cy="0.5" r="0.5"><stop stop-color="#00D9FF" stop-opacity="0.8"/><stop offset="1" stop-color="#00D9FF" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="160" cy="428" rx="96" ry="10" fill="#000" opacity="0.25"/>
  <g class="linhas-vel"><path d="M20 200 h50 M10 240 h60 M30 280 h40" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.5"/></g>
  <path d="M178 268 L198 322 L190 372" stroke="${LEG}" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M190 330 L186 368" stroke="#00D9FF" stroke-width="4" stroke-linecap="round"/>
  <ellipse class="propulsor" cx="190" cy="408" rx="34" ry="12" fill="url(#${id}g)"/>
  <rect x="160" y="370" width="62" height="30" rx="13" fill="#FFFFFF"/><rect x="160" y="390" width="62" height="11" rx="5" fill="#FF9D43"/><rect x="176" y="376" width="22" height="6" rx="3" fill="#00D9FF"/>
  <path d="M142 268 L114 300 L126 346" stroke="${LEG}" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M118 306 L124 340" stroke="#00D9FF" stroke-width="4" stroke-linecap="round"/>
  <ellipse class="propulsor" cx="128" cy="380" rx="30" ry="10" fill="url(#${id}g)"/>
  <rect x="98" y="342" width="60" height="30" rx="13" fill="#FFFFFF"/><rect x="98" y="362" width="60" height="11" rx="5" fill="#FF9D43"/><rect x="114" y="348" width="22" height="6" rx="3" fill="#00D9FF"/>
  <path d="M108 268 Q160 286 212 268 L210 250 L110 250Z" fill="${DK}"/>
  <path d="${armB}" stroke="#7955FF" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="${fb[0]}" cy="${fb[1]}" r="13" fill="${SK}"/>
  <path d="M112 168 Q160 150 208 168 L214 270 Q160 286 106 270 Z" fill="#7955FF"/>
  <path d="M150 158 L170 158 L172 280 L148 280Z" fill="#FFFFFF"/><path d="M160 160 V278" stroke="${DK}" stroke-width="2" stroke-dasharray="4 3"/>
  <path d="M106 258 Q160 274 214 258 L214 270 Q160 286 106 270Z" fill="#FF9D43"/>
  <circle cx="190" cy="198" r="15" fill="${DK}" stroke="#FFD447" stroke-width="2.5"/><path d="M184 192 h12 l-12 13 h12" stroke="#FFD447" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M128 160 Q160 180 192 160 L188 146 Q160 162 132 146Z" fill="#00D9FF"/>
  <path d="${armA}" stroke="#7955FF" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <rect x="${+fa[0] - 14}" y="${+fa[1] + 8}" width="28" height="12" rx="5" fill="#00D9FF"/>
  <circle cx="${fa[0]}" cy="${fa[1]}" r="15" fill="${SK}"/>
  ${arms === 'both' ? `<rect x="${+fb[0] - 14}" y="${+fb[1] + 8}" width="28" height="12" rx="5" fill="#00D9FF"/><circle cx="${fb[0]}" cy="${fb[1]}" r="15" fill="${SK}"/>` : ''}
  <rect x="148" y="136" width="24" height="26" rx="6" fill="${SKD}"/>
  <ellipse cx="110" cy="108" rx="8" ry="12" fill="${SK}"/><ellipse cx="210" cy="108" rx="8" ry="12" fill="${SK}"/>
  <ellipse cx="160" cy="104" rx="50" ry="54" fill="${SK}"/>
  <ellipse cx="128" cy="124" rx="9" ry="5" fill="#FF4FBF" opacity="0.35"/><ellipse cx="192" cy="124" rx="9" ry="5" fill="#FF4FBF" opacity="0.35"/>
  <path d="M118 60 L92 24 L136 42Z M138 42 L140 4 L162 38Z M158 36 L190 2 L184 44Z M182 44 L226 30 L204 74Z M110 78 L78 66 L112 94Z" fill="url(#${id}h)"/>
  <path d="M92 24 L101 38 L106 33Z M140 4 L143 18 L148 14Z M190 2 L184 16 L190 17Z M226 30 L212 37 L216 42Z M78 66 L90 70 L89 75Z" fill="#FF4FBF"/>
  <path d="M108 98 C104 54 130 34 160 34 C192 34 216 56 212 98 C206 84 198 76 192 72 L186 86 L176 70 L168 88 L158 70 L148 88 L140 72 L132 86 L126 74 C118 80 112 88 108 98Z" fill="url(#${id}h)"/>
  <rect x="120" y="46" width="80" height="12" rx="6" fill="#FF9D43"/>
  <rect x="124" y="40" width="34" height="22" rx="10" fill="${DK}"/><rect x="162" y="40" width="34" height="22" rx="10" fill="${DK}"/>
  <rect x="128" y="44" width="26" height="14" rx="7" fill="#00D9FF"/><rect x="166" y="44" width="26" height="14" rx="7" fill="#00D9FF"/>
  <path d="M132 48 h8 M170 48 h8" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
  <path d="M128 92 L150 98 M192 92 L170 98" stroke="#3A2240" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="141" cy="111" rx="10" ry="12" fill="#FFFFFF"/><ellipse cx="179" cy="111" rx="10" ry="12" fill="#FFFFFF"/>
  <circle cx="143" cy="113" r="6.5" fill="${DK}"/><circle cx="177" cy="113" r="6.5" fill="${DK}"/>
  <circle cx="145" cy="110" r="2.2" fill="#FFFFFF"/><circle cx="179" cy="110" r="2.2" fill="#FFFFFF"/>
  <path d="M142 130 Q160 152 178 130 Z" fill="#3A1A2A"/><path d="M144 131 Q160 137 176 131 L175 134 Q160 139 145 134Z" fill="#FFFFFF"/>
</svg>`;
  },

  logoSymbol() {
    const id = 'l' + (this.uid++);
    return `<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#00D9FF"/><stop offset="0.55" stop-color="#7955FF"/><stop offset="1" stop-color="#FF4FBF"/></linearGradient></defs><path d="M36 3l28.6 16.5v33L36 69 7.4 52.5v-33z" fill="url(#${id})" stroke="#FFFFFF" stroke-width="3"/><path d="M22 22h28L28 47h22" stroke="#101A35" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M22 22h28L28 47h22" stroke="#FFD447" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
  },

  // miniaturas dos obstáculos (tela Como jogar)
  obstacle(type) {
    const st = (x0, y0, w, h, c, op, step) => { let s = ''; for (let i = -h; i < w; i += step) s += `<path d="M${x0 + i} ${y0 + h} L${x0 + i + h} ${y0}" stroke="${c}" stroke-width="7" opacity="${op}"/>`; return s; };
    const id = 'o' + (this.uid++);
    const OB = {
      R: [160, 150, `<defs><clipPath id="${id}"><rect x="6" y="10" width="148" height="122" rx="14"/></clipPath></defs><rect x="20" y="128" width="16" height="20" rx="3" fill="#223463"/><rect x="124" y="128" width="16" height="20" rx="3" fill="#223463"/><rect x="6" y="10" width="148" height="122" rx="14" fill="#FF4D6D"/><g clip-path="url(#${id})">${st(6, 10, 148, 122, '#FFFFFF', 0.35, 18)}</g><rect x="6" y="10" width="148" height="122" rx="14" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="3" fill="none"/><rect x="34" y="38" width="92" height="66" rx="12" fill="#101A35"/><path d="M64 56 l32 30 M96 56 l-32 30" stroke="#FF4D6D" stroke-width="9" stroke-linecap="round"/>`],
      L: [160, 150, `<g transform="translate(0 70)"><rect x="16" y="30" width="12" height="40" rx="3" fill="#344A80"/><rect x="132" y="30" width="12" height="40" rx="3" fill="#344A80"/><defs><clipPath id="${id}"><rect x="4" y="14" width="152" height="28" rx="8"/></clipPath></defs><rect x="4" y="14" width="152" height="28" rx="8" fill="#FF9D43"/><g clip-path="url(#${id})">${st(4, 14, 152, 28, '#FFD447', 0.9, 24)}</g><rect x="4" y="14" width="152" height="28" rx="8" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="2.5" fill="none"/><path d="M62 -4 l18 -14 18 14 M62 -24 l18 -14 18 14" stroke="#42EDAA" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>`],
      H: [160, 160, `<rect x="8" y="8" width="18" height="150" rx="6" fill="#7955FF"/><rect x="134" y="8" width="18" height="150" rx="6" fill="#7955FF"/><rect x="26" y="22" width="108" height="40" fill="#FF4FBF" opacity="0.3"/><rect x="0" y="62" width="160" height="34" rx="10" fill="#FF4FBF"/><rect x="0" y="62" width="160" height="34" rx="10" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="2.5" fill="none"/><path d="M30 72 l10 10 10 -10 M70 72 l10 10 10 -10 M110 72 l10 10 10 -10" stroke="#101A35" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="0" y="6" width="160" height="16" rx="6" fill="#7955FF"/>`],
      B: [150, 150, `<path d="M14 40 L40 14 H140 L114 40Z" fill="#344A80"/><path d="M114 40 L140 14 V114 L114 140Z" fill="#18264D"/><rect x="14" y="40" width="100" height="100" rx="6" fill="#223463"/><rect x="14" y="40" width="100" height="100" rx="6" stroke="#00D9FF" stroke-width="3" fill="none"/><circle cx="64" cy="90" r="24" fill="#00D9FF" opacity="0.25"/><circle cx="64" cy="90" r="15" fill="#00D9FF"/><path d="M67 78 L56 93 H65 L61 103 L73 87 H64Z" fill="#101A35"/>`],
      T: [180, 150, `<ellipse cx="90" cy="140" rx="70" ry="8" fill="#00D9FF" opacity="0.35"/><path d="M50 50 L62 18 H118 L130 50Z" fill="#1B2A5C" stroke="#FF6FCB" stroke-width="5"/><rect x="14" y="48" width="152" height="80" rx="20" fill="#FF4FBF" stroke="#fff" stroke-opacity=".7" stroke-width="4"/><rect x="26" y="68" width="38" height="22" rx="8" fill="#fff"/><rect x="116" y="68" width="38" height="22" rx="8" fill="#fff"/><rect x="70" y="92" width="40" height="22" rx="6" fill="#101A35"/><path d="M168 30 l-14 10 M176 50 l-18 4 M4 30 l14 10 M-4 50 l18 4" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>`],
      P: [220, 150, `<path d="M4 140 L80 64 V140Z" fill="#FFD447"/><path d="M24 136 l14 -14 M44 116 l14 -14" stroke="#101A35" stroke-width="7" stroke-linecap="round"/><rect x="78" y="34" width="136" height="100" rx="16" fill="#2DB5D9" stroke="#fff" stroke-opacity=".7" stroke-width="4"/><rect x="92" y="46" width="108" height="34" rx="8" fill="#101A35"/><rect x="88" y="94" width="26" height="12" rx="5" fill="#FF4D6D"/><rect x="178" y="94" width="26" height="12" rx="5" fill="#FF4D6D"/><path d="M80 34 H212" stroke="#00D9FF" stroke-width="5"/><path d="M118 14 l14 -10 14 10" stroke="#42EDAA" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`],
      J: [150, 150, `<circle cx="75" cy="75" r="66" fill="#FF9D43" fill-opacity=".3" stroke="#FF9D43" stroke-width="8"/><path d="M75 26c16 12 24 30 24 54v28H51V80c0-24 8-42 24-54z" fill="#DDE4FF"/><path d="M51 82l-16 16v20h16 M99 82l16 16v20H99" fill="#FF9D43"/><circle cx="75" cy="64" r="9" fill="#00D9FF"/><path d="M64 112 Q75 146 86 112Z" fill="#FFD447"/>`],
      G: [240, 150, `<rect x="0" y="8" width="240" height="18" rx="8" fill="#7955FF" stroke="#00D9FF" stroke-width="3"/>${[0, 78, 156, 234].map(px => `<rect x="${px}" y="8" width="7" height="142" rx="3" fill="#7955FF"/>`).join('')}<rect x="7" y="26" width="71" height="124" fill="#FF4FBF" opacity="0.45"/><rect x="163" y="26" width="71" height="124" fill="#FF4FBF" opacity="0.45"/><path d="M104 100 l17 -16 17 16 M104 124 l17 -16 17 16" stroke="#42EDAA" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="42" cy="17" r="4" fill="#FF4D6D"/><circle cx="120" cy="17" r="4" fill="#42EDAA"/><circle cx="198" cy="17" r="4" fill="#FF4D6D"/>`]
    };
    const [w, h, inner] = OB[type];
    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
  }
};
