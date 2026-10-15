'use strict';
(() => {
  const APP_VERSION = '14 (Oct 15, 2026)';

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const money = (n) => '$' + n.toLocaleString('en-US');
  const digitsOf = (n) => ({ h: Math.floor(n / 100) % 10, t: Math.floor(n / 10) % 10, o: n % 10 });

  const PLACE = {
    h: { name: 'hundreds', one: 'hundred', mult: 100, bill: '$100 bill' },
    t: { name: 'tens', one: 'ten', mult: 10, bill: '$10 bill' },
    o: { name: 'ones', one: 'one', mult: 1, bill: '$1 coin' },
  };
  const unit = (count, p) => `${count} ${count === 1 ? PLACE[p].one : PLACE[p].name}`;
  const placesFor = (n) => (n >= 100 ? ['h', 't', 'o'] : ['t', 'o']);

  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function words(n) {
    if (n === 0) return 'zero';
    if (n === 1000) return 'one thousand';
    const parts = [];
    const h = Math.floor(n / 100), r = n % 100;
    if (h) parts.push(ONES[h] + ' hundred');
    if (r) parts.push(r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : ''));
    return parts.join(' ');
  }

  const ITEMS = [
    ['🎒', 'backpack'], ['👟', 'sneakers'], ['🎀', 'hair bow'], ['🧁', 'fancy cupcake'], ['🦄', 'unicorn plush'],
    ['👗', 'party dress'], ['🕶️', 'sunglasses'], ['🎧', 'headphones'], ['📚', 'book set'], ['🛼', 'roller skates'],
    ['🎨', 'paint set'], ['🧸', 'teddy bear'], ['👑', 'sparkly tiara'], ['🐱', 'kitten plush'], ['🎮', 'video game'],
    ['💍', 'ring'], ['🌻', 'flower pot'], ['🪁', 'kite'], ['🎹', 'keyboard'], ['⌚', 'watch'], ['👒', 'sun hat'],
    ['🧣', 'scarf'], ['👜', 'purse'], ['🐠', 'fish tank'], ['🚲', 'bike'], ['🎂', 'birthday cake'], ['🪀', 'yo-yo'],
    ['🖍️', 'crayon box'], ['🏀', 'basketball'], ['🩰', 'ballet shoes'], ['📷', 'camera'], ['🛹', 'skateboard'],
  ];
  // Everything in the mall: the classic list plus every shop item (MERCH is defined further down).
  let ALL_ITEMS = null;
  const itemPool = () => ALL_ITEMS || (ALL_ITEMS = [...new Map([...ITEMS.map(([emoji, name]) => [emoji, name]),
    ...MERCH.map((m) => [m.e, m.name.toLowerCase()])].map(([emoji, name]) => [name, { emoji, name }])).values()]);
  const item = () => pick(itemPool());
  const items = (k) => shuffle(itemPool()).slice(0, k);

  // ---------- Levels ----------
  const LEVELS = {
    1: { label: '2-digit prices', short: 'Up to $99' },
    2: { label: '3-digit prices', short: 'Up to $999' },
    3: { label: 'Tricky prices', short: 'Zeros & look-alikes' },
  };
  function price(level) {
    if (level <= 1) return rand(10, 99);
    if (level === 2) return rand(100, 999);
    const r = Math.random(), h = rand(1, 9);
    if (r < 0.25) return h * 100 + rand(1, 9);        // 305
    if (r < 0.45) return h * 100 + rand(1, 9) * 10;   // 340
    if (r < 0.52) return h * 100;                     // 300
    if (r < 0.75) {                                   // look-alike digits
      const d = rand(1, 9), e = rand(0, 9);
      return pick([d * 100 + e * 10 + d, d * 110 + e, d * 111]);
    }
    return rand(100, 999);
  }

  // Unique numeric choices built from likely mistakes, topped up with nearby numbers.
  function numChoices(ans, cands, fmt = money, count = 4) {
    const set = new Set([ans]);
    for (const c of shuffle(cands)) {
      if (set.size >= count) break;
      if (Number.isInteger(c) && c > 0 && c < 10000 && !set.has(c)) set.add(c);
    }
    let guard = 0;
    while (set.size < count && guard++ < 100) {
      const c = ans + pick([-100, -10, -1, 1, 10, 100]) * rand(1, 3);
      if (c > 0 && !set.has(c)) set.add(c);
    }
    return shuffle([...set]).map((v) => ({ value: v, label: fmt(v) }));
  }
  function strChoices(ans, cands, count = 4) {
    const set = new Set([ans]);
    for (const c of shuffle(cands)) {
      if (set.size >= count) break;
      if (c && !set.has(c)) set.add(c);
    }
    return shuffle([...set]).map((v) => ({ value: v, label: v }));
  }

  // ---------- Visual building blocks ----------
  const BILL = { h: { cls: 'b100', label: '$100' }, t: { cls: 'b10', label: '$10' }, o: { cls: 'c1', label: '$1' } };
  const billHTML = (p, extra = '') => `<span class="money ${BILL[p].cls} ${extra}"><span>${BILL[p].label}</span></span>`;

  function priceTag(n, hl) {
    const d = digitsOf(n);
    const digits = placesFor(n).map((p) => `<span class="dg ${hl === p ? 'hl hl-' + p : ''}">${d[p]}</span>`).join('');
    return `<div class="tag"><span class="tag-hole"></span><span class="tag-dollar">$</span>${digits}</div>`;
  }

  function pvChart(n, hl) {
    const d = digitsOf(n);
    const cols = placesFor(n).map((p) => `
      <div class="pv-col pv-${p} ${hl === p ? 'is-hl' : ''}">
        <div class="pv-head">${PLACE[p].name}</div>
        <div class="pv-digit">${d[p]}</div>
      </div>`).join('');
    return `<div class="pv-chart">${cols}</div>`;
  }

  // A place-value mat with bills stacked in columns.
  function matHTML(counts, places, interactive = false) {
    return `<div class="mat ${interactive ? 'mat-live' : ''}">${places.map((p) => {
      const n = counts[p] || 0;
      const bills = Array.from({ length: n }, () => interactive
        ? `<button class="mat-bill" data-p="${p}" aria-label="Remove ${PLACE[p].bill}">${billHTML(p, 'sm')}</button>`
        : billHTML(p, 'sm')).join('');
      return `<div class="mat-col pv-${p}">
        <div class="pv-head">${PLACE[p].name}</div>
        <div class="mat-body">${bills || '<span class="mat-empty">empty</span>'}</div>
        <div class="mat-count">${n}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function numberLine(n, low, high) {
    const W = 640, H = 130, pad = 44;
    const x = (v) => pad + ((v - low) / (high - low)) * (W - 2 * pad);
    const step = (high - low) / 10;
    let ticks = '';
    for (let i = 0; i <= 10; i++) {
      const v = low + i * step, big = i === 0 || i === 5 || i === 10;
      ticks += `<line x1="${x(v)}" x2="${x(v)}" y1="${big ? 70 : 78}" y2="${big ? 100 : 92}" class="nl-tick ${i === 5 ? 'mid' : ''}"/>`;
      if (big) ticks += `<text x="${x(v)}" y="122" class="nl-label ${i === 5 ? 'mid' : ''}">${v.toLocaleString('en-US')}</text>`;
    }
    const nx = x(n);
    return `<svg viewBox="0 0 ${W} ${H}" class="nl" role="img" aria-label="Number line from ${low} to ${high} showing ${n}">
      <line x1="${pad - 16}" x2="${W - pad + 16}" y1="85" y2="85" class="nl-axis"/>
      ${ticks}
      <g class="nl-marker">
        <rect x="${nx - 34}" y="12" width="68" height="34" rx="12"/>
        <text x="${nx}" y="36">${n.toLocaleString('en-US')}</text>
        <path d="M${nx - 8} 46 L${nx + 8} 46 L${nx} 56 Z"/>
        <circle cx="${nx}" cy="85" r="9"/>
      </g>
    </svg>`;
  }

  // ---------- Games ----------
  function compareExplain(a, b) {
    if (a === b) return `${money(a)} and ${money(b)} are exactly the same!`;
    const places = Math.max(a, b) >= 100 ? ['h', 't', 'o'] : ['t', 'o'];
    const da = digitsOf(a), db = digitsOf(b), same = [];
    for (const p of places) {
      if (da[p] !== db[p]) {
        const lead = same.length ? `Same ${same.join(' and ')}. ` : '';
        return `${lead}Look at the <b>${PLACE[p].name}</b>: ${da[p]} is ${da[p] > db[p] ? 'more' : 'less'} than ${db[p]}. So ${money(a)} ${a > b ? '&gt;' : '&lt;'} ${money(b)}.`;
      }
      same.push(PLACE[p].name);
    }
    return '';
  }

  function closeTo(a, level) {
    const d = digitsOf(a), three = a >= 100, cands = [];
    if (three) {
      cands.push(d.h * 100 + d.o * 10 + d.t);
      if (d.t) cands.push(d.t * 100 + d.h * 10 + d.o);
      cands.push(d.h * 100 + ((d.t + rand(1, 4)) % 10) * 10 + d.o);
      cands.push(d.h * 100 + d.t * 10 + ((d.o + rand(1, 8)) % 10));
    } else {
      cands.push(d.o * 10 + d.t);
      cands.push((((d.t - 1 + rand(1, 3)) % 9) + 1) * 10 + d.o);
      cands.push(d.t * 10 + ((d.o + rand(1, 8)) % 10));
    }
    const ok = cands.filter((c) => c !== a && (three ? c >= 100 && c <= 999 : c >= 10 && c <= 99));
    if (ok.length && Math.random() < 0.75) return pick(ok);
    let b;
    do { b = price(level); } while (b === a);
    return b;
  }

  const expParts = (n) => { const d = digitsOf(n); return [d.h * 100, d.t * 10, d.o].filter((v) => v); };
  const joinParts = (arr) => arr.filter((v) => v).join(' + ');

  // Each question type has three wordings, each with its own recorded voice line,
  // so practicing a lot doesn't mean hearing the same sentence over and over.
  const variant = (list) => list[Math.floor(Math.random() * list.length)];
  const plain = (html) => html.replace(/<[^>]+>/g, '');
  const ONES_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const unitList = (h, t, o, order = ['h', 't', 'o']) => order.map((p) => unit({ h, t, o }[p], p)).join(', ');

  // A few 3-digit prices close to n that are easy to mix up with it.
  function lookAlikes(n) {
    const d = digitsOf(n), out = new Set();
    const add = (h, t, o) => { const v = h * 100 + t * 10 + o; if (v !== n && v >= 10 && v <= 999 && (n < 100 ? v < 100 : v >= 100)) out.add(v); };
    if (n >= 100) { add(d.h, d.o, d.t); add(d.t, d.h, d.o); add(d.o, d.t, d.h); add(d.h, (d.t + 1) % 10, d.o); add((d.h % 9) + 1, d.t, d.o); }
    else { add(0, d.o, d.t); add(0, (d.t % 9) + 1, d.o); add(0, d.t, (d.o + 1) % 10); }
    return [...out];
  }

  const GAMES = {
    register: {
      name: 'Cash Register', emoji: '💳', color: 'pink',
      skill: 'Build prices with $100s, $10s and $1s',
      make(level) {
        const it = item();
        if (level >= 2 && Math.random() < 0.25) {
          const n = rand(110, 249);
          return {
            kind: 'register', n, item: it, noHundreds: true,
            prompt: `Pay ${money(n)} for the ${it.name}, but <b>no $100 bills</b>! Use $10 bills and $1 coins.`,
            speak: `Pay ${n} dollars for the ${it.name} without using any hundred-dollar bills.`, voice: ['line/register-noh', `p/${n}`],
            explain: `${unit(Math.floor(n / 100), 'h')} = ${Math.floor(n / 100) * 10} tens, so ${money(n)} = ${unit(Math.floor(n / 10), 't')} and ${unit(n % 10, 'o')}.`,
          };
        }
        const n = price(level);
        const [prompt, vk] = variant([
          [`Pay <b>exactly</b> ${money(n)} for the ${it.name}.`, 'line/register'],
          [`The ${it.name} costs ${money(n)}. Count out <b>exactly</b> that much.`, 'line/register-2'],
          [`Help the shopper pay <b>exactly</b> ${money(n)} for the ${it.name}.`, 'line/register-3'],
        ]);
        return {
          kind: 'register', n, item: it, prompt, speak: plain(prompt), voice: [vk, `p/${n}`],
          explain: `${money(n)} = ${placesFor(n).map((p) => unit(digitsOf(n)[p], p)).join(', ')}.`,
        };
      },
    },

    detective: {
      name: 'Price Tag Detective', emoji: '🔍', color: 'purple',
      skill: 'What is each digit worth?',
      make(level) {
        const n = price(level), d = digitsOf(n), places = placesFor(n), r = Math.random();
        if (r < 0.35) {
          const p = pick(places.filter((q) => d[q] > 0)), dig = d[p], val = dig * PLACE[p].mult;
          const hl = `<span class="hl-${p} hl-inline">${dig}</span>`;
          const [prompt, vk] = variant([
            [`What is the ${hl} in ${money(n)} worth?`, `line/det-worth-${dig}`],
            [`How much is the highlighted ${hl} worth?`, `line/det-worth-${dig}-2`],
            [`The ${hl} is highlighted. What is its value?`, `line/det-worth-${dig}-3`],
          ]);
          return {
            kind: 'mc', visual: priceTag(n, p), prompt, speak: `In the price ${n} dollars, what is the highlighted ${dig} worth?`, voice: [vk],
            choices: shuffle([dig, dig * 10, dig * 100]).map((v) => ({ value: v, label: money(v) })),
            answer: val,
            hint: `Which place is the ${dig} in? Check the chart:${pvChart(n, p)}`,
            explain: `The ${dig} is in the <b>${PLACE[p].name}</b> place, so it's worth ${unit(dig, p)} = <b>${money(val)}</b>.`,
          };
        }
        if (r < 0.55) {
          const p = pick(places), ans = d[p];
          const set = new Set([ans, ...places.map((q) => d[q])]);
          while (set.size < 4) set.add(rand(0, 9));
          const [prompt, vk] = variant([
            [`Which digit is in the <b>${PLACE[p].name}</b> place?`, `line/det-place-${p}`],
            [`Find the digit in the <b>${PLACE[p].name}</b> place.`, `line/det-place-${p}-2`],
            [`Look at the <b>${PLACE[p].name}</b> place. Which digit is there?`, `line/det-place-${p}-3`],
          ]);
          return {
            kind: 'mc', visual: priceTag(n), prompt, speak: `In the price ${n} dollars, ${plain(prompt).toLowerCase()}`, voice: [vk],
            choices: shuffle([...set]).map((v) => ({ value: v, label: String(v) })),
            answer: ans, big: true,
            hint: `From left to right the places go ${places.map((q) => PLACE[q].name).join(', ')}.`,
            explain: `${pvChart(n, p)}The ${PLACE[p].name} digit is <b>${ans}</b>.`,
          };
        }
        if (r < 0.75) {
          const p = pick(places.filter((q) => d[q] > 0)), dig = d[p], val = dig * PLACE[p].mult;
          return {
            kind: 'mc', visual: priceTag(n), prompt: `What is the <b>value</b> of the digit in the <b>${PLACE[p].name}</b> place?`,
            speak: `What is the value of the digit in the ${PLACE[p].name} place?`, voice: [`line/det-value-${p}`],
            choices: shuffle([dig, dig * 10, dig * 100]).map((v) => ({ value: v, label: money(v) })), answer: val,
            hint: `First find the digit in the ${PLACE[p].name} place. Then think: how many ${PLACE[p].name} is that?`,
            explain: `The ${PLACE[p].name} digit is ${dig}. ${unit(dig, p)} = <b>${money(val)}</b>.`,
          };
        }
        return {
          kind: 'mc', visual: matHTML(d, places), prompt: 'Which price matches this money?',
          speak: 'Which price matches this money?', voice: ['line/det-match'],
          choices: numChoices(n, lookAlikes(n)), answer: n, tags: true,
          hint: 'Count the bills in each column. The hundreds come first, then the tens, then the ones.',
          explain: `${placesFor(n).map((p) => unit(d[p], p)).join(', ')} = <b>${money(n)}</b>.`,
        };
      },
    },

    tagmaker: {
      name: 'Tag Maker', emoji: '🏷️', color: 'teal',
      skill: 'Word form, expanded form & standard form',
      make(level) {
        let n;
        do { n = price(level); } while (expParts(n).length < 2);
        const d = digitsOf(n), three = n >= 100;
        const type = pick(['w2s', 's2e', 'e2s', 's2w', 'u2s', 's2u']);
        const exp = joinParts(expParts(n));
        const expFull = `${exp} = ${money(n)}`;
        const swaps = three
          ? [d.h * 100 + d.o * 10 + d.t, d.h * 1000 + d.t * 10 + d.o, d.o * 100 + d.t * 10 + d.h, n + pick([100, -10, 10])]
          : [d.o * 10 + d.t, d.t * 100 + d.o, n + pick([10, -10]), d.t + d.o];
        if (type === 'w2s') {
          const [prompt, vk] = variant([
            ['The shopper read the price out loud. Which tag matches?', 'line/tag-w2s'],
            ['Which price tag shows this price?', 'line/tag-w2s-2'],
            ['The cashier said this price. Find the tag that matches.', 'line/tag-w2s-3'],
          ]);
          return {
            kind: 'mc', visual: `<div class="word-tag">“${words(n)} dollars”</div>`, prompt,
            speak: `${plain(prompt)} ${words(n)} dollars.`, voice: [vk, `p/${n}`],
            choices: numChoices(n, swaps), answer: n, tags: true,
            hint: three ? `“${words(n).split(' hundred')[0]} hundred” goes in the hundreds place. Then look at the tens and ones.` : 'The first word tells you the tens. The last word tells you the ones.',
            explain: `“${words(n)}” = ${expFull}.`,
          };
        }
        if (type === 's2e') {
          const cands = three
            ? [joinParts([d.h, d.t, d.o]), joinParts([d.h * 100, d.t, d.o]), joinParts([d.h * 10, d.t * 10, d.o]), joinParts([d.h * 100, d.t * 100, d.o]), joinParts([d.h * 100, d.o * 10, d.t])]
            : [joinParts([d.t, d.o]), joinParts([d.t * 100, d.o]), joinParts([d.t * 10, d.o * 10]), joinParts([d.o * 10, d.t])];
          const [prompt, vk] = variant([
            [`Stretch it out! Which shows ${money(n)} in <b>expanded form</b>?`, 'line/tag-s2e'],
            [`Which is the <b>expanded form</b> of ${money(n)}?`, 'line/tag-s2e-2'],
            [`Break ${money(n)} into hundreds, tens and ones. Which <b>expanded form</b> is right?`, 'line/tag-s2e-3'],
          ]);
          return {
            kind: 'mc', visual: priceTag(n), prompt, speak: plain(prompt), voice: [vk, `p/${n}`],
            choices: strChoices(exp, cands), answer: exp,
            hint: `Find what each digit is worth:${pvChart(n)}`,
            explain: `${pvChart(n)}${expFull}`,
          };
        }
        if (type === 'e2s') {
          const cands = [parseInt(expParts(n).join(''), 10), parseInt(String(n).replace(/0/g, ''), 10),
            three ? d.h * 100 + d.o * 10 + d.t : d.o * 10 + d.t, three ? d.h * 1000 + d.t * 10 + d.o : d.t * 100 + d.o];
          const [prompt, vk] = variant([
            ['The cashier added up the money like this. What is the price?', 'line/tag-e2s'],
            ['Put the parts together. What price is this?', 'line/tag-e2s-2'],
            ['This is the price in expanded form. Which tag shows it?', 'line/tag-e2s-3'],
          ]);
          return {
            kind: 'mc', visual: `<div class="word-tag exp">${exp}</div>`, prompt, speak: `${plain(prompt)} ${expParts(n).join(' plus ')}.`, voice: [vk],
            choices: numChoices(n, cands), answer: n, tags: true,
            hint: 'Put each part in its place on the chart, then read the digits.',
            explain: `${pvChart(n)}${expFull}`,
          };
        }
        if (type === 's2w') {
          const set = new Set([n, ...swaps.filter((v) => v > 0 && v < 1000)]);
          while (set.size < 4) set.add(Math.max(10, Math.min(999, n + pick([-100, -10, 10, 100]) * rand(1, 2))));
          return {
            kind: 'mc', visual: priceTag(n), prompt: 'Which words say this price?', speak: 'Which words say this price?', voice: ['line/tag-s2w'],
            choices: shuffle([...set].slice(0, 4)).map((v) => ({ value: v, label: `<span class="word-choice">${words(v)}</span>` })), answer: n,
            hint: three ? 'Say the hundreds first, then the tens and ones.' : 'Say the tens first, then the ones.',
            explain: `${money(n)} is “${words(n)} dollars”.`,
          };
        }
        if (type === 'u2s') {
          const order = Math.random() < 0.4 ? shuffle(placesFor(n)) : placesFor(n);
          const cands = [parseInt(String(n).replace(/0/g, ''), 10), ...swaps];
          return {
            kind: 'mc', visual: `<div class="word-tag eq">${unitList(d.h, d.t, d.o, order)}</div>`,
            prompt: order.join() === placesFor(n).join() ? 'What price is this?' : 'Careful, the places are mixed up! What price is this?',
            speak: 'What price is this many hundreds, tens and ones?', voice: ['line/tag-u2s'],
            choices: numChoices(n, cands), answer: n, tags: true,
            hint: 'Put each number in its own place: hundreds, then tens, then ones. A place with 0 still needs a 0!',
            explain: `${unitList(d.h, d.t, d.o, placesFor(n))} = <b>${money(n)}</b>.`,
          };
        }
        const right = unitList(d.h, d.t, d.o, placesFor(n));
        const wrongs = three
          ? [unitList(d.o, d.t, d.h), unitList(d.h, d.o, d.t), unitList(d.t, d.h, d.o), unitList(d.h, d.t, (d.o + 1) % 10)]
          : [`${unit(d.o, 't')}, ${unit(d.t, 'o')}`, `${unit(d.t, 'h')}, ${unit(d.o, 't')}`, `${unit(d.t, 't')}, ${unit((d.o + 1) % 10, 'o')}`];
        return {
          kind: 'mc', visual: priceTag(n), prompt: 'How many hundreds, tens and ones make this price?',
          speak: 'How many hundreds, tens and ones make this price?', voice: ['line/tag-s2u'],
          choices: strChoices(right, wrongs), answer: right,
          hint: `Read the digits from left to right:${pvChart(n)}`,
          explain: `${money(n)} = ${right}.`,
        };
      },
    },

    bestdeal: {
      name: 'Best Deal', emoji: '⚖️', color: 'yellow',
      skill: 'Compare prices with &lt;, &gt; and =',
      make(level) {
        const a = price(level), r = Math.random();
        const card = (it, p) => `<span class="deal-emoji">${it.emoji}</span><span class="deal-name">${it.name}</span>${priceTag(p)}`;
        if (r < 0.35) {
          const b = closeTo(a, level), [itA, itB] = items(2);
          const wantLess = Math.random() < 0.5, ans = (wantLess ? a < b : a > b) ? 0 : 1;
          const [prompt, vk] = variant(wantLess
            ? [['Which one costs <b>less</b>?', 'line/deal-less'], ['Which one is <b>cheaper</b>?', 'line/deal-less-2'], ['Which price is <b>lower</b>?', 'line/deal-less-3']]
            : [['Which one costs <b>more</b>?', 'line/deal-more'], ['Which one is <b>more expensive</b>?', 'line/deal-more-2'], ['Which price is <b>higher</b>?', 'line/deal-more-3']]);
          return {
            kind: 'mc', layout: 'deal', prompt,
            speak: `${plain(prompt)} The ${itA.name} for ${a} dollars, or the ${itB.name} for ${b} dollars?`, voice: [vk],
            choices: [{ value: 0, label: card(itA, a) }, { value: 1, label: card(itB, b) }], answer: ans,
            hint: 'Start with the biggest place. Compare the hundreds first, then the tens, then the ones.',
            explain: compareExplain(a, b),
          };
        }
        if (r < 0.6) {
          const b = Math.random() < 0.12 ? a : closeTo(a, level);
          const ans = a < b ? '<' : a > b ? '>' : '=';
          const [prompt, vk] = variant([
            ['Pick the sign that makes it true.', 'line/deal-sign'],
            ['Which sign goes in the box?', 'line/deal-sign-2'],
            ['Compare the prices. Pick less than, greater than, or equal to.', 'line/deal-sign-3'],
          ]);
          return {
            kind: 'mc', visual: `<div class="compare-row">${priceTag(a)}<span class="compare-q">?</span>${priceTag(b)}</div>`,
            prompt, speak: `Is ${a} dollars less than, greater than, or equal to ${b} dollars?`, voice: [vk],
            choices: [
              { value: '<', label: '<span class="sym">&lt;</span><small>less than</small>' },
              { value: '=', label: '<span class="sym">=</span><small>equal to</small>' },
              { value: '>', label: '<span class="sym">&gt;</span><small>greater than</small>' },
            ],
            answer: ans,
            hint: 'The open side of the sign faces the bigger number, like a hungry alligator! 🐊 Compare hundreds, then tens, then ones.',
            explain: compareExplain(a, b),
          };
        }
        if (r < 0.8) {
          const set = new Set([a]);
          for (const c of shuffle(lookAlikes(a))) if (set.size < 3) set.add(c);
          while (set.size < 3) set.add(closeTo(a, level));
          const prices = [...set], its = items(3), most = Math.random() < 0.5;
          const target = most ? Math.max(...prices) : Math.min(...prices);
          return {
            kind: 'mc', layout: 'deal', prompt: `Which of these three costs the <b>${most ? 'most' : 'least'}</b>?`,
            speak: `Which of these three costs the ${most ? 'most' : 'least'}?`, voice: [most ? 'line/deal-most3' : 'line/deal-least3'],
            choices: prices.map((p, i) => ({ value: p, label: card(its[i], p) })), answer: target,
            hint: 'Compare the hundreds of all three first. If two are the same, compare their tens.',
            explain: `In order from least to greatest: ${[...prices].sort((x, y) => x - y).map(money).join(', ')}. So <b>${money(target)}</b> costs the ${most ? 'most' : 'least'}.`,
          };
        }
        const lo = level <= 1 ? 10 : 100, hi = level <= 1 ? 99 : 999, step = level <= 1 ? 10 : 100;
        const x = Math.max(lo + 2, Math.min(hi - 1, a));
        const bigger = x + rand(1, Math.min(step, hi - x));
        // The others are a bit less than x, or x itself (not greater!).
        const below = Array.from({ length: Math.min(step, x - lo) }, (_, i) => x - 1 - i);
        const opts = [bigger, ...shuffle([x, ...below]).slice(0, 2)];
        return {
          kind: 'mc', prompt: `Which price is <b>greater than</b> ${money(x)}?`, speak: `Which price is greater than ${x} dollars?`, voice: ['line/deal-over', `p/${x}`],
          choices: shuffle(opts.slice(0, 3)).map((v) => ({ value: v, label: money(v) })), answer: bigger, tags: true,
          hint: `Compare each price with ${money(x)}, starting with the biggest place.`,
          explain: compareExplain(bigger, x),
        };
      },
    },

    roundit: {
      name: 'Round-It Sale', emoji: '🎯', color: 'orange',
      skill: 'Round to the nearest 10 or 100',
      make(level) {
        const r = Math.random(), roundTo = (n, to) => Math.round(n / to) * to;
        if (r < 0.2) {
          const to = level <= 1 ? 10 : pick([10, 100]);
          const T = level <= 1 ? rand(2, 9) * 10 : to === 10 ? rand(11, 99) * 10 : rand(2, 9) * 100;
          const inRange = () => T - to / 2 + rand(0, to - 1);
          let good; do { good = inRange(); } while (good === T);
          const bad1 = T + to / 2 + rand(0, to / 2 - 1), bad2 = T - to / 2 - rand(1, to / 2);
          const place = to === 10 ? 'ten' : 'hundred';
          return {
            kind: 'mc', prompt: `Which price rounds to <b>${money(T)}</b> (nearest ${place})?`,
            speak: `Rounding to the nearest ${place}, which price rounds to ${T} dollars?`, voice: [`line/round-which-${to}`, `p/${T}`],
            choices: shuffle([good, bad1, bad2]).map((v) => ({ value: v, label: money(v) })), answer: good, tags: true,
            hint: `Prices that round to ${T} are between ${T - to / 2} and ${T + to / 2 - 1}.`,
            explain: `${good} rounds to ${roundTo(good, to)}. ${bad1} rounds to ${roundTo(bad1, to)}, and ${bad2} rounds to ${roundTo(bad2, to)}.`,
          };
        }
        if (r < 0.35 && level >= 2) {
          const to = level >= 3 ? pick([10, 100]) : 10, [i1, i2] = items(2);
          const a = to === 10 ? rand(11, 99) : rand(101, 499), b = to === 10 ? rand(11, 99) : rand(101, 499);
          const ans = roundTo(a, to) + roundTo(b, to);
          const cands = [a + b, roundTo(a + b, to) === ans ? ans + to : roundTo(a + b, to), ans - to, ans + to];
          const place = to === 10 ? 'ten' : 'hundred';
          return {
            kind: 'mc', visual: `<div class="compare-row"><span class="deal-emoji">${i1.emoji}</span>${priceTag(a)}<span class="sale-plus">+</span><span class="deal-emoji">${i2.emoji}</span>${priceTag(b)}</div>`,
            prompt: `About how much for both? Round each price to the nearest <b>${place}</b>, then add.`,
            speak: `About how much do both cost? Round each price to the nearest ${place}, then add.`, voice: [`line/round-estimate-${to}`],
            choices: numChoices(ans, cands, money, 3).sort((x, y) => x.value - y.value), answer: ans, tags: true,
            hint: `Round ${a} first, then round ${b}. Then add the two rounded prices.`,
            explain: `${a} rounds to ${roundTo(a, to)}, and ${b} rounds to ${roundTo(b, to)}. ${roundTo(a, to)} + ${roundTo(b, to)} = <b>${money(ans)}</b>.`,
          };
        }
        let n, to;
        if (level <= 1) { to = 10; do { n = rand(11, 99); } while (n % 10 === 0); }
        else if (level === 2) { to = pick([10, 100]); do { n = rand(101, 999); } while (n % to === 0); }
        else {
          to = pick([10, 100]);
          const rr = Math.random();
          if (to === 10) n = rr < 0.4 ? rand(10, 99) * 10 + 5 : rr < 0.6 ? rand(991, 999) : rand(101, 999);
          else n = rr < 0.4 ? rand(1, 9) * 100 + 50 + rand(0, 9) : rr < 0.6 ? rand(951, 999) : rand(101, 999);
          if (n % to === 0) n += 1;
        }
        const low = Math.floor(n / to) * to, high = low + to, mid = low + to / 2, ans = n >= mid ? high : low;
        const other = to === 10 && n >= 100 ? Math.round(n / 100) * 100 : (low - to > 0 ? low - to : high + to);
        const it = item(), place = to === 10 ? 'ten' : 'hundred';
        const [prompt, vk] = variant([
          [`The ${it.emoji} ${it.name} costs ${money(n)}. Round it to the nearest <b>${place}</b>.`, `line/round-${to}`],
          [`What is ${money(n)} rounded to the nearest <b>${place}</b>?`, `line/round-${to}-2`],
          [`Sale sign! Estimate the ${it.emoji} ${it.name}'s price, ${money(n)}, to the nearest <b>${place}</b>.`, `line/round-${to}-3`],
        ]);
        return {
          kind: 'mc', visual: numberLine(n, low, high), prompt,
          speak: `${plain(prompt)}`, voice: [vk, `p/${n}`],
          choices: numChoices(ans, [low, high, other], money, 3).sort((x, y) => x.value - y.value),
          answer: ans,
          hint: `Is ${n} closer to ${low} or ${high}? The middle is ${mid}.`,
          explain: n === mid ? `${n} is exactly in the middle, and middle numbers round <b>up</b> to ${money(high)}!`
            : `${n} is closer to ${ans}, so it rounds to <b>${money(ans)}</b>.`,
        };
      },
    },

    regroup: {
      name: 'Change Machine', emoji: '🏦', color: 'blue',
      skill: 'Trade and regroup (10 ones = 1 ten)',
      make(level) {
        const r = Math.random();
        if (r < 0.2) {
          const facts = [
            ['Trade one $100 bill for $10 bills. How many $10 bills do you get?', 10, 'One hundred is the same as 10 tens.', 'fact-100-10'],
            ['Trade one $10 bill for $1 coins. How many coins do you get?', 10, 'One ten is the same as 10 ones.', 'fact-10-1'],
            ['How many $10 bills are the same as one $100 bill?', 10, '10 tens make 1 hundred.', 'fact-10s-in-100'],
          ];
          if (level >= 2) {
            const k = rand(2, 9);
            facts.push([`How many $10 bills make ${money(k * 100)}?`, k * 10, `Each $100 is 10 tens, so ${k} hundreds = ${k * 10} tens.`, `fact-tens-${k}`]);
            facts.push(['How many $1 coins make $100?', 100, '10 tens = 100 ones.', 'fact-ones-100']);
            facts.push(['Trade one $100 bill for $1 coins. How many coins do you get?', 100, '1 hundred = 10 tens = 100 ones.', 'fact-100-1']);
          }
          if (level >= 3) {
            facts.push(['How many $10 bills make $1,000?', 100, '1,000 is 10 hundreds, and each hundred is 10 tens, so that is 100 tens!', 'fact-1000']);
            facts.push(['How many $100 bills make $1,000?', 10, '10 hundreds make 1 thousand.', 'fact-1000-100']);
          }
          const [q, ans, why, vkey] = pick(facts);
          return {
            kind: 'mc', visual: '<div class="machine">🏦 ⇄ 💵</div>', prompt: q, speak: q.replace(/\$/g, ''), voice: [`line/${vkey}`],
            choices: numChoices(ans, [ans / 10, ans * 10, ans + 1, ans - 1], String, 4), answer: ans, big: true,
            hint: 'Think about 10 of the smaller one making 1 of the bigger one.', explain: why,
          };
        }
        if (r < 0.45) {
          let c;
          if (level <= 1) c = { h: 0, t: rand(1, 7), o: rand(10, 18) };
          else if (level === 2) c = { h: rand(1, 7), t: rand(10, 16), o: rand(0, 9) };
          else c = { h: rand(1, 6), t: rand(10, 15), o: rand(10, 15) };
          const total = c.h * 100 + c.t * 10 + c.o, places = c.h ? ['h', 't', 'o'] : ['t', 'o'];
          const cands = [parseInt(places.map((p) => c[p]).join(''), 10), c.h + c.t + c.o,
            c.h * 100 + (c.t % 10) * 10 + (c.o % 10), total + pick([10, -10, 100])];
          const [prompt, vk] = variant([
            ['Look at all this money in the piggy bank! How much is it?', 'line/regroup-count'],
            ['Count all the money. How much is there?', 'line/regroup-count-2'],
            ['How much money is on the mat altogether?', 'line/regroup-count-3'],
          ]);
          return {
            kind: 'mc', visual: matHTML(c, places), prompt, speak: plain(prompt), voice: [vk],
            choices: numChoices(total, cands), answer: total, tags: true,
            hint: 'Watch out! There are more than 9 in a column. Trade 10 of them for 1 of the next bigger place.',
            explain: `${places.map((p) => unit(c[p], p)).join(' + ')} = ${places.map((p) => c[p] * PLACE[p].mult).join(' + ')} = <b>${money(total)}</b>.`,
          };
        }
        if (r < 0.7) {
          // Which shows the same amount after a trade?
          let h, t, o, right, wrongs;
          if (level <= 1) {
            t = rand(2, 9); o = rand(0, 9); h = 0;
            right = `${unit(t - 1, 't')}, ${unit(o + 10, 'o')}`;
            wrongs = [`${unit(t - 1, 't')}, ${unit(o + 1, 'o')}`, `${unit(t, 't')}, ${unit(o + 10, 'o')}`, `${unit(t + 1, 't')}, ${unit(o, 'o')}`];
          } else {
            h = rand(2, 9); t = rand(0, 8); o = rand(0, 9);
            if (Math.random() < 0.6 || t === 0) {
              right = unitList(h - 1, t + 10, o);
              wrongs = [unitList(h - 1, t + 1, o), unitList(h - 1, t, o + 10), unitList(h, t + 10, o)];
            } else {
              right = unitList(h, t - 1, o + 10);
              wrongs = [unitList(h, t - 1, o + 1), unitList(h - 1, t - 1, o + 10), unitList(h, t, o + 10)];
            }
          }
          const n = h * 100 + t * 10 + o;
          return {
            kind: 'mc', visual: `${priceTag(n)}<div class="word-tag eq">${h ? unitList(h, t, o) : `${unit(t, 't')}, ${unit(o, 'o')}`}</div>`,
            prompt: 'Which one shows the <b>same amount</b> of money?', speak: 'Which one shows the same amount of money?', voice: ['line/regroup-same'],
            choices: strChoices(right, wrongs), answer: right,
            hint: 'When you trade 1 of a bigger bill, you get 10 of the next smaller one. The total stays the same.',
            explain: `${right} is still ${money(n)}: one bill was traded for 10 smaller ones.`,
          };
        }
        let n, big, small, q, ans, cands, line;
        if (level <= 1) {
          do { n = rand(21, 99); } while (n % 10 === 0 && Math.random() < 0.7);
          const d = digitsOf(n); big = 't'; small = 'o'; ans = d.o + 10;
          line = `${unit(d.t - 1, 't')} and <span class="blank">?</span> ones`;
          q = `${n} dollars is the same as ${d.t - 1} tens and how many ones?`;
          cands = [d.o, d.o + 1, d.o + 20, n - 10 * (d.t - 1) + 1];
        } else {
          do { n = price(level); } while (n < 200);
          const d = digitsOf(n);
          if (d.t > 0 && Math.random() < 0.4) {
            big = 't'; small = 'o'; ans = d.o + 10;
            line = `${unit(d.h, 'h')}, ${unit(d.t - 1, 't')} and <span class="blank">?</span> ones`;
            q = `${n} dollars is the same as ${d.h} hundreds, ${d.t - 1} tens, and how many ones?`;
            cands = [d.o, d.o + 1, d.o + 100, d.o + 20];
          } else {
            big = 'h'; small = 't'; ans = d.t + 10;
            line = `${unit(d.h - 1, 'h')}, <span class="blank">?</span> tens and ${unit(d.o, 'o')}`;
            q = `${n} dollars is the same as ${d.h - 1} hundreds, how many tens, and ${d.o} ones?`;
            cands = [d.t, d.t + 1, d.t + 100, d.t + 20];
          }
        }
        const [prompt, vk] = variant([
          ['Break one bill into smaller ones. What goes in the box?', 'line/regroup-break'],
          ['Trade a bill for smaller bills. What number goes in the box?', 'line/regroup-break-2'],
          ['Fill in the box so it is the same amount of money.', 'line/regroup-break-3'],
        ]);
        return {
          kind: 'mc', visual: `${priceTag(n)}<div class="word-tag eq">= ${line}</div>`,
          prompt, speak: q, voice: [vk], choices: numChoices(ans, cands, String), answer: ans, big: true,
          hint: `One ${PLACE[big].one} was traded for 10 ${PLACE[small].name}. Add 10 to the ${PLACE[small].name} digit.`,
          explain: `Trade 1 ${PLACE[big].one} for 10 ${PLACE[small].name}: ${ans - 10} + 10 = <b>${ans}</b> ${PLACE[small].name}.`,
        };
      },
    },
  };
  GAMES.spelling = {
    name: 'Letter Bead Bar', emoji: '📿', color: 'pink', featured: true,
    skill: 'Spell your weekly spelling words',
    maxLevel: 2,
    levels: { 1: { label: 'Peek, then spell', short: 'Peek first' }, 2: { label: 'Listen only (like the test)', short: 'Test style' } },
    make(level) { return spellQuestion(pickSpellWord(), level <= 1 || !canSpeak); },
    home: () => renderSpellHome(),
  };
  GAMES.french = {
    name: 'Marché d’automne', emoji: '🦃', color: 'orange', featured: true,
    skill: 'French words for l’Action de grâces',
    maxLevel: 3,
    levels: {
      1: { label: 'Learn: picture → word (3 choices)', short: 'Learn' },
      2: { label: 'Both ways, with look-alike words', short: 'Practice' },
      3: { label: 'Match them all, like the test', short: 'Like the test' },
    },
    make: (level) => frQuestion(level),
    home: () => renderFrHome(),
  };
  GAMES.receipt = {
    name: 'Receipt Counter', emoji: '🧾', color: 'pink',
    skill: 'Add up to 1000 with regrouping',
    maxLevel: 4,
    levels: {
      1: { label: 'Learn: add step by step', short: 'Learn it' },
      2: { label: 'On your own: regroup ones or tens', short: 'On your own' },
      3: { label: 'Regroup ones and tens + stories', short: 'Harder' },
      4: { label: 'Thinking Cap: missing digits', short: 'Challenge' },
    },
    make: (level) => receiptQuestion(level),
  };
  GAMES.patterns = {
    name: 'Display Window', emoji: '🎀', color: 'purple',
    skill: 'Addition patterns and code',
    maxLevel: 3,
    levels: {
      1: { label: 'Learn: patterns step by step', short: 'Learn it' },
      2: { label: 'On your own: number patterns', short: 'On your own' },
      3: { label: 'On your own: shapes and code', short: 'Shapes & code' },
    },
    make: (level) => patternQuestion(level),
  };
  GAMES.subtract = {
    name: 'Gift Card Desk', emoji: '🎁', color: 'teal',
    skill: 'Subtract up to 1000 with regrouping',
    maxLevel: 4, chip: 'New: Chapter 3',
    levels: {
      1: { label: 'Learn: subtract step by step', short: 'Learn it' },
      2: { label: 'On your own: regroup once', short: 'On your own' },
      3: { label: 'Regroup twice, stories & checking', short: 'Harder' },
      4: { label: 'Zeros, missing digits & checking', short: 'Challenge' },
    },
    make: (level) => subtractQuestion(level),
  };
  GAMES.sell = {
    name: 'Open for Business', emoji: '🛎️', color: 'yellow', hidden: true,
    skill: 'Sell to customers and make change (subtraction)',
    levels: {
      1: { label: 'Change from $20 and $50', short: '$20 & $50' },
      2: { label: 'Change from $100s', short: '$100s' },
      3: { label: 'Two items and big bills', short: 'Big bills' },
    },
    make: (level) => changeQuestion(level),
    home: () => renderRoom(), homeLabel: 'Back to My Boutique',
  };
  // What she's learning now comes first in the mall.
  const CURRENT = ['subtract', 'receipt', 'patterns'];
  const GAME_IDS = [...CURRENT, ...Object.keys(GAMES).filter((id) => !CURRENT.includes(id) && !GAMES[id].featured && !GAMES[id].hidden)];
  const ALL_IDS = ['spelling', 'french', ...GAME_IDS, 'sell'];
  const maxLevel = (id) => GAMES[id].maxLevel || 3;
  const levelInfo = (id, lv) => (GAMES[id].levels || LEVELS)[lv];

  // ---------- Rewards ----------
  const DECOR = [
    { id: 'flowers', e: '💐', name: 'Flowers', cost: 10 }, { id: 'balloons', e: '🎈', name: 'Balloons', cost: 12 },
    { id: 'plant', e: '🪴', name: 'Plant', cost: 15 }, { id: 'gifts', e: '🎁', name: 'Gift boxes', cost: 18 },
    { id: 'mirror', e: '🪞', name: 'Mirror', cost: 20 }, { id: 'lights', e: '🌟', name: 'Star lights', cost: 22 },
    { id: 'couch', e: '🛋️', name: 'Comfy couch', cost: 25 }, { id: 'teddy', e: '🧸', name: 'Big teddy', cost: 28 },
    { id: 'cake', e: '🎂', name: 'Cake stand', cost: 30 }, { id: 'bunny', e: '🐇', name: 'Shop bunny', cost: 35 },
    { id: 'cat', e: '🐈', name: 'Shop cat', cost: 40 }, { id: 'dog', e: '🐕', name: 'Shop puppy', cost: 40 },
    { id: 'rainbow', e: '🌈', name: 'Rainbow', cost: 50 }, { id: 'disco', e: '🪩', name: 'Disco ball', cost: 60 },
    { id: 'gem', e: '💎', name: 'Giant gem', cost: 80 }, { id: 'crown', e: '👑', name: 'Golden crown', cost: 100 },
    { id: 'unicorn', e: '🦄', name: 'Real unicorn', cost: 120 }, { id: 'castle', e: '🏰', name: 'Castle', cost: 150 },
  ];

  // ---------- Merchandise: buy it, stock a shelf, sell it ----------
  const MERCH_CATS = [
    { id: 'fashion', name: 'Fashion', e: '👗' }, { id: 'accessories', name: 'Accessories', e: '👜' },
    { id: 'toys', name: 'Toys', e: '🧸' }, { id: 'treats', name: 'Treats', e: '🧁' },
    { id: 'beauty', name: 'Beauty', e: '💅' }, { id: 'art', name: 'Art & Music', e: '🎨' },
    { id: 'sports', name: 'Sports', e: '🛼' }, { id: 'pets', name: 'Pets', e: '🐹' },
  ];
  const MERCH = [
    ['fashion', '👗', 'Party dress', 20], ['fashion', '👚', 'Flowy blouse', 12], ['fashion', '👕', 'Graphic tee', 10],
    ['fashion', '👖', 'Jeans', 14], ['fashion', '🩳', 'Shorts', 10], ['fashion', '🧥', 'Puffy coat', 22],
    ['fashion', '🩱', 'Swimsuit', 12], ['fashion', '👘', 'Kimono', 24], ['fashion', '🧦', 'Fuzzy socks', 6],
    ['fashion', '🧣', 'Cozy scarf', 8], ['fashion', '🧤', 'Mittens', 8], ['fashion', '🥋', 'Karate uniform', 18],
    ['accessories', '👜', 'Handbag', 18], ['accessories', '👛', 'Coin purse', 9], ['accessories', '🎒', 'Backpack', 15],
    ['accessories', '🕶️', 'Sunglasses', 11], ['accessories', '👒', 'Sun hat', 12], ['accessories', '🎀', 'Hair bow', 5],
    ['accessories', '👑', 'Tiara', 30], ['accessories', '💍', 'Sparkly ring', 28], ['accessories', '📿', 'Bead bracelet', 7],
    ['accessories', '⌚', 'Watch', 25], ['accessories', '👟', 'Sneakers', 16], ['accessories', '🩰', 'Ballet shoes', 14],
    ['accessories', '👢', 'Boots', 18], ['accessories', '👠', 'Fancy shoes', 20], ['accessories', '🌂', 'Umbrella', 9],
    ['toys', '🧸', 'Teddy bear', 12], ['toys', '🦄', 'Unicorn plush', 16], ['toys', '🪀', 'Yo-yo', 5],
    ['toys', '🪁', 'Kite', 9], ['toys', '🎲', 'Board game', 11], ['toys', '🧩', 'Puzzle', 9],
    ['toys', '🪅', 'Piñata', 14], ['toys', '🎮', 'Video game', 35], ['toys', '🤖', 'Robot', 22],
    ['toys', '🪆', 'Nesting dolls', 13], ['toys', '🎈', 'Balloon', 4], ['toys', '🔮', 'Magic ball', 15],
    ['treats', '🧁', 'Cupcake', 4], ['treats', '🍩', 'Donut', 3], ['treats', '🍪', 'Cookie', 3],
    ['treats', '🍭', 'Lollipop', 2], ['treats', '🍫', 'Chocolate bar', 4], ['treats', '🍦', 'Ice cream', 5],
    ['treats', '🍓', 'Strawberries', 6], ['treats', '🎂', 'Birthday cake', 18], ['treats', '🥤', 'Smoothie', 6],
    ['treats', '🍿', 'Popcorn', 4], ['treats', '🧋', 'Bubble tea', 7], ['treats', '🍬', 'Candy', 2],
    ['beauty', '💅', 'Nail polish', 6], ['beauty', '💄', 'Lip gloss', 7], ['beauty', '🧴', 'Lotion', 8],
    ['beauty', '🪞', 'Hand mirror', 10], ['beauty', '🌸', 'Flower spray', 9], ['beauty', '🧼', 'Fancy soap', 4],
    ['beauty', '🫧', 'Bubble bath', 8], ['beauty', '🪥', 'Sparkle toothbrush', 3], ['beauty', '💎', 'Gem stickers', 5],
    ['art', '🎨', 'Paint set', 12], ['art', '🖍️', 'Crayons', 5], ['art', '✏️', 'Pencil', 2],
    ['art', '📓', 'Notebook', 4], ['art', '📚', 'Book set', 15], ['art', '✂️', 'Scissors', 5],
    ['art', '🖊️', 'Gel pen', 3], ['art', '🎹', 'Keyboard', 40], ['art', '🎸', 'Guitar', 45],
    ['art', '📷', 'Camera', 38], ['art', '🎧', 'Headphones', 30], ['art', '🎤', 'Microphone', 20],
    ['sports', '🛼', 'Roller skates', 24], ['sports', '⚽', 'Soccer ball', 10], ['sports', '🏀', 'Basketball', 10],
    ['sports', '🏐', 'Volleyball', 10], ['sports', '🏸', 'Badminton set', 12], ['sports', '🛹', 'Skateboard', 26],
    ['sports', '⛸️', 'Ice skates', 24], ['sports', '🚲', 'Bike', 60], ['sports', '🥏', 'Flying disc', 6],
    ['sports', '🎳', 'Bowling set', 16], ['sports', '🤸', 'Gym mat', 14], ['sports', '🏊', 'Swim goggles', 7],
    ['pets', '🐹', 'Hamster', 20], ['pets', '🐰', 'Bunny', 25], ['pets', '🐠', 'Goldfish', 8],
    ['pets', '🐢', 'Turtle', 22], ['pets', '🦜', 'Parrot', 40], ['pets', '🐱', 'Kitten plush', 14],
    ['pets', '🦴', 'Dog bone', 3], ['pets', '🐾', 'Paw-print leash', 6], ['pets', '🐶', 'Puppy plush', 14],
  ].map(([cat, e, name, cost]) => ({ cat, e, name, cost, id: name.toLowerCase().replace(/[^a-z]+/g, '-') }));
  const MERCH_BY_ID = Object.fromEntries(MERCH.map((m) => [m.id, m]));
  // Selling earns back the cost plus about 50% profit.
  const sellValue = (m) => m.cost + Math.ceil(m.cost / 2) + 1;

  const SLOTS_PER_SHELF = 4, MAX_SHELVES = 5;
  function shelves() {
    const n = S.shelfCount * SLOTS_PER_SHELF;
    while (S.shelves.length < n) S.shelves.push(null);
    return S.shelves;
  }
  const onShelf = (id) => shelves().filter((x) => x === id).length;
  const inStockroom = (id) => (S.inv[id] || 0) - onShelf(id);
  const stockedSlots = () => shelves().map((id, i) => [id, i]).filter(([id]) => id && MERCH_BY_ID[id]);
  const shelfCost = () => 40 + (S.shelfCount - 2) * 20;

  const WALLS = [
    { id: 'pink', name: 'Bubblegum', cost: 0 }, { id: 'mint', name: 'Mint', cost: 30 },
    { id: 'lavender', name: 'Lavender', cost: 30 }, { id: 'ocean', name: 'Ocean', cost: 40 },
    { id: 'sunset', name: 'Sunset', cost: 45 }, { id: 'galaxy', name: 'Galaxy', cost: 75 },
  ];

  // ---------- Saved progress ----------
  const KEY = 'pvb-v1';
  const DEFAULT = { started: false, name: '', coins: 0, levels: {}, streaks: {}, stats: {}, owned: [], walls: ['pink'], wall: 'pink', sound: true, autoRead: false, spell: {}, spellList: null, fr: {}, inv: {}, shelves: [], shelfCount: 2 };
  const fresh = () => JSON.parse(JSON.stringify(DEFAULT));
  let S = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(fresh(), JSON.parse(raw));
    } catch (e) { /* storage unavailable */ }
    return fresh();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
    updateTopbar();
  }
  const levelOf = (id) => S.levels[id] || 1;

  function recordResult(id, firstTry) {
    const st = S.stats[id] || (S.stats[id] = { right: 0, total: 0 });
    st.total++;
    if (firstTry) st.right++;
    let s = S.streaks[id] || 0, change = 0;
    const lv = levelOf(id);
    if (firstTry) {
      s = s >= 0 ? s + 1 : 1;
      if (s >= 5 && lv < maxLevel(id)) { S.levels[id] = lv + 1; s = 0; change = 1; }
    } else {
      s = s <= 0 ? s - 1 : -1;
      if (s <= -3 && lv > 1) { S.levels[id] = lv - 1; s = 0; change = -1; }
    }
    S.streaks[id] = s;
    save();
    return change;
  }

  // ---------- Sound & speech ----------
  let AC;
  function audio() {
    if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C(); }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(freq, start, dur, type = 'sine', vol = 0.15) {
    if (!S.sound) return;
    const a = audio();
    if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + start;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  const sfx = {
    tap: () => tone(700, 0, 0.07, 'triangle', 0.08),
    good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.28, 'triangle', 0.14)),
    bad: () => { tone(260, 0, 0.18, 'sine', 0.12); tone(210, 0.14, 0.25, 'sine', 0.1); },
    coin: () => { tone(988, 0, 0.08, 'square', 0.05); tone(1319, 0.08, 0.3, 'square', 0.05); },
    fanfare: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle', 0.13)),
  };
  const canSpeak = 'speechSynthesis' in window;
  function speak(text) {
    if (!canSpeak) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.9; u.pitch = 1.1;
    speechSynthesis.speak(u);
  }

  function speakSeq(parts) {
    if (!canSpeak) return;
    speechSynthesis.cancel();
    for (const [text, rate, lang] of parts) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || 'en-US'; u.rate = rate || 0.9; u.pitch = 1.1;
      speechSynthesis.speak(u);
    }
  }

  // ---------- Recorded voice ----------
  // Clips recorded with ElevenLabs (see tools/voice/). A line and a price are
  // joined with the silence trimmed; anything not recorded (or offline and not
  // saved yet) falls back to the device's built-in voice.
  let VOICE = null;
  fetch('audio/manifest.json').then((r) => (r.ok ? r.json() : null)).then((m) => { VOICE = m && m.clips; }).catch(() => {});
  const clipCache = new Map();
  let voiceSources = [], voiceToken = 0;
  function loadClip(key, ctx) {
    if (!clipCache.has(key)) {
      const p = fetch(VOICE[key][0]).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)));
      p.catch(() => clipCache.delete(key));
      clipCache.set(key, p);
    }
    return clipCache.get(key);
  }
  function stopVoice() {
    voiceToken++;
    for (const s of voiceSources) { try { s.stop(); } catch (e) { /* already stopped */ } }
    voiceSources = [];
    if (canSpeak) speechSynthesis.cancel();
  }
  async function say(keys, fallback) {
    stopVoice();
    const token = voiceToken, ctx = audio();
    if (VOICE && ctx && keys && keys.length && keys.every((k) => VOICE[k])) {
      try {
        const bufs = await Promise.all(keys.map((k) => loadClip(k, ctx)));
        if (token !== voiceToken) return;
        let t = ctx.currentTime + 0.03;
        keys.forEach((k, i) => {
          const [, start, end] = VOICE[k], src = ctx.createBufferSource();
          src.buffer = bufs[i]; src.connect(ctx.destination);
          src.start(t, start, end - start);
          voiceSources.push(src);
          t += end - start + 0.06;
        });
        return;
      } catch (e) { /* fall back to the device voice */ }
    }
    if (token === voiceToken && fallback) speakSeq(fallback);
  }

  function confetti() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div');
    box.className = 'confetti';
    const colors = ['#ff5fa2', '#8b5cf6', '#14b8a6', '#fbbf24', '#fb923c', '#60a5fa'];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = pick(colors);
      p.style.animationDelay = Math.random() * 0.3 + 's';
      p.style.animationDuration = 1.3 + Math.random() + 's';
      p.style.setProperty('--r', rand(0, 360) + 'deg');
      p.style.setProperty('--x', rand(-80, 80) + 'px');
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2800);
  }

  let toastTimer;
  function toast(html) {
    const t = $('#toast');
    t.innerHTML = html;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // ---------- Screens ----------
  const screen = $('#screen');
  const avatar = (cls = '') => `<img class="avatar ${cls}" src="img/hannah-head.jpg" alt="">`;
  const mallName = () => (S.name ? `${S.name}'s Mall` : 'Place Value Boutique');

  function updateTopbar() {
    $('#coinCount').textContent = S.coins;
    $('#soundBtn').textContent = S.sound ? '🔔' : '🔕';
  }
  function setScreen(html, { title = mallName(), home = true } = {}) {
    stopVoice();
    $('#title').textContent = title;
    $('#homeBtn').style.visibility = home ? 'visible' : 'hidden';
    screen.innerHTML = html;
    screen.scrollTop = 0;
    window.scrollTo(0, 0);
    updateTopbar();
  }

  function renderWelcome() {
    setScreen(`
      <section class="welcome">
        ${avatar('xl')}
        <h2>Welcome, shopper!</h2>
        <p>Every store in this mall is a place value puzzle. Solve them to earn <b>🪙 Sparkle Coins</b> and decorate your very own boutique.</p>
        <label class="field">What's your name?
          <input id="nameInput" maxlength="16" autocomplete="off" autocapitalize="words" placeholder="Type your name">
        </label>
        <button class="btn primary big" id="startBtn">Let's go shopping! ➜</button>
      </section>`, { title: 'Place Value Boutique', home: false });
    const go = () => { S.started = true; S.name = $('#nameInput').value.trim().slice(0, 16); save(); sfx.fanfare(); renderMall(); };
    $('#startBtn').onclick = go;
    $('#nameInput').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  }

  function stars(n, max = 3) { return '★'.repeat(n) + '☆'.repeat(max - n); }

  function renderMall() {
    const cards = GAME_IDS.map((id) => {
      const g = GAMES[id], lv = levelOf(id);
      return `<button class="store c-${g.color}" data-game="${id}">
        <span class="store-awning"></span>
        <span class="store-emoji">${g.emoji}</span>
        <span class="store-name">${g.name}</span>
        <span class="store-skill">${g.skill}</span>
        <span class="store-level" aria-label="Level ${lv}">${stars(lv, maxLevel(id))} <small>${levelInfo(id, lv).short}</small></span>
        ${CURRENT.includes(id) ? `<span class="new-chip">${g.chip || 'Chapter 2'}</span>` : ''}
      </button>`;
    }).join('');
    const sp = GAMES.spelling, spLv = levelOf('spelling');
    const featured = `<button class="store featured c-${sp.color}" data-game="spelling">
        <span class="store-awning"></span>
        <span class="store-emoji">${sp.emoji}</span>
        <span class="featured-text">
          <span class="store-name">${sp.name}</span>
          <span class="store-skill">${sp.skill}: ${spellWords().length} words</span>
          <span class="store-level" aria-label="Level ${spLv}">${stars(spLv, 2)} <small>${sp.levels[spLv].short}</small></span>
        </span>
      </button>`;
    const fr = GAMES.french, frLv = levelOf('french');
    const seasonal = `<button class="store featured seasonal c-${fr.color}" data-game="french">
        <span class="store-awning"></span>
        <span class="store-emoji">${fr.emoji}</span>
        <span class="featured-text">
          <span class="store-name">${fr.name}</span>
          <span class="store-skill">${fr.skill}: ${FR_WORDS.length} words</span>
          <span class="store-level" aria-label="Level ${frLv}">${stars(frLv, 3)} <small>${fr.levels[frLv].short}</small></span>
        </span>
        <span class="new-chip">🍂 Seasonal · French</span>
      </button>`;
    setScreen(`
      <section class="mall">
        <div class="guide">${avatar('lg')}<p class="bubble">Hi${S.name ? ' ' + escapeHTML(S.name) : ''}! Pick a store to play. 👋</p></div>
        ${featured}${seasonal}
        <div class="store-grid">${cards}</div>
        <div class="mall-extras">
          <button class="extra c-pink" id="shopBtn"><span>🛍️</span>Sparkle Shop<small>Spend your coins</small></button>
          <button class="extra c-purple" id="roomBtn"><span>🏠</span>My Boutique<small>Stock shelves & sell</small></button>
        </div>
        <button class="grownups" id="parentBtn">🔒 Grown-ups</button>
      </section>`, { home: false });
    screen.querySelectorAll('.store').forEach((b) => {
      b.onclick = () => { sfx.tap(); const g = GAMES[b.dataset.game]; if (g.home) g.home(); else startRound(b.dataset.game); };
    });
    $('#shopBtn').onclick = () => { sfx.tap(); renderShop(); };
    $('#roomBtn').onclick = () => { sfx.tap(); renderRoom(); };
    $('#parentBtn').onclick = renderParentGate;
  }

  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- Round ----------
  const ROUND_LEN = 5;
  let R = null;

  function startRound(id) {
    const len = id === 'sell' ? Math.min(ROUND_LEN, stockedSlots().length) : ROUND_LEN;
    R = { id, index: 0, firstTries: 0, coins: 0, len, used: [] };
    nextQuestion();
  }

  // Spelling practice test: every word once, one try each, no hints.
  function startSpellTest() {
    const order = shuffle(spellWords());
    R = { id: 'spelling', test: true, order, results: [], index: 0, firstTries: 0, coins: 0, len: order.length, used: [] };
    nextQuestion();
  }

  function nextQuestion() {
    if (R.index >= R.len || (R.id === 'sell' && !stockedSlots().length)) return R.test ? (R.testEnd || renderTestEnd)() : renderRoundEnd();
    R.q = R.test ? (R.testQ ? R.testQ(R.index) : spellQuestion(R.order[R.index], false)) : GAMES[R.id].make(levelOf(R.id));
    if (R.q.w) R.used.push(R.q.w.word);
    if (R.q.fr) R.used.push(R.q.fr);
    if (R.q.keys) R.used.push(...R.q.keys);
    R.attempts = 0;
    R.locked = false;
    renderQuestion();
  }

  function dotsHTML() {
    return Array.from({ length: R.len }, (_, i) =>
      `<span class="dot ${i < R.index ? 'done' : i === R.index ? 'now' : ''}"></span>`).join('');
  }

  function renderQuestion() {
    const g = GAMES[R.id], q = R.q, lv = levelOf(R.id);
    const head = `
      <div class="game-head c-${g.color}">
        <span class="game-emoji">${g.emoji}</span>
        <div class="dots ${R.len > 8 ? 'many' : ''}" aria-label="Question ${R.index + 1} of ${R.len}">${dotsHTML()}</div>
        <span class="level-chip">${R.test ? 'Test' : stars(lv, maxLevel(R.id))}</span>
      </div>`;
    const sayBtn = canSpeak ? '<button class="say" id="sayBtn" aria-label="Read it to me">🔊</button>' : '';
    let body;
    if (q.kind === 'register') {
      const places = q.noHundreds ? ['t', 'o'] : q.n >= 100 || lv >= 2 ? ['h', 't', 'o'] : ['t', 'o'];
      R.counts = { h: 0, t: 0, o: 0 };
      R.places = places;
      body = `
        <div class="play split">
          <div class="q-card">
            <div class="register-item"><span class="big-emoji">${q.item.emoji}</span>${priceTag(q.n)}</div>
            <p class="prompt">${q.prompt} ${sayBtn}</p>
            <p class="subtle">Tap the money to put it on the counter. Tap money on the counter to take it back.</p>
          </div>
          <div class="register-side">
            <div id="matWrap">${matHTML(R.counts, places, true)}</div>
            <div class="tray">${places.map((p) => `<button class="tray-btn" data-p="${p}" aria-label="Add a ${PLACE[p].bill}">${billHTML(p)}</button>`).join('')}</div>
            <div class="actions">
              <button class="btn ghost" id="clearBtn">↺ Start over</button>
              <button class="btn primary" id="payBtn">Pay ✔</button>
            </div>
          </div>
        </div>`;
    } else if (q.kind === 'spell') {
      body = spellBody(q);
    } else if (q.kind === 'change') {
      body = changeBody(q);
    } else if (q.kind === 'steps') {
      body = stepsBody(q);
    } else if (q.kind === 'match') {
      body = matchBody(q);
    } else {
      const cls = q.layout === 'deal' ? `choices deal n${q.choices.length}` : q.layout ? `choices ${q.layout} n${q.choices.length}` : `choices ${q.big ? 'big' : ''} ${q.tags ? 'tags' : ''} n${q.choices.length}`;
      body = `
        <div class="play">
          <div class="q-card">
            ${q.visual ? `<div class="visual">${q.visual}</div>` : ''}
            <p class="prompt">${q.prompt} ${sayBtn}</p>
          </div>
          <div class="${cls}">
            ${q.choices.map((c, i) => `<button class="choice" data-i="${i}">${c.label}</button>`).join('')}
          </div>
        </div>`;
    }
    setScreen(`${head}${body}<div id="fb" class="feedback" hidden></div>`, { title: g.name });
    if (q.kind === 'spell') { wireSpell(); return; }
    if (q.kind === 'change') { wireChange(); return; }
    if (q.kind === 'steps') { wireSteps(); return; }
    if (q.kind === 'match') { wireMatch(); return; }
    if (canSpeak) $('#sayBtn').onclick = () => say(q.voice, q.speakParts || [[q.speak]]);
    if (q.kind === 'register') wireRegister();
    else screen.querySelectorAll('.choice').forEach((b) => { b.onclick = () => answerMC(b, q.choices[+b.dataset.i].value); });
    if (S.autoRead || q.autoSay) say(q.voice, q.speakParts || [[q.speak]]);
  }

  function wireRegister() {
    const redraw = () => {
      $('#matWrap').innerHTML = matHTML(R.counts, R.places, true);
      screen.querySelectorAll('.mat-bill').forEach((b) => {
        b.disabled = R.locked;
        b.onclick = () => { if (R.locked) return; R.counts[b.dataset.p]--; sfx.tap(); redraw(); };
      });
    };
    R.redraw = redraw;
    screen.querySelectorAll('.tray-btn').forEach((b) => {
      b.onclick = () => {
        if (R.locked) return;
        if (R.counts[b.dataset.p] >= (R.q.noHundreds ? 29 : 19)) return toast('That column is full!');
        R.counts[b.dataset.p]++; sfx.coin(); redraw();
      };
    });
    $('#clearBtn').onclick = () => { if (R.locked) return; R.counts = { h: 0, t: 0, o: 0 }; redraw(); };
    $('#payBtn').onclick = () => {
      if (R.locked) return;
      const paid = R.counts.h * 100 + R.counts.t * 10 + R.counts.o, n = R.q.n, d = digitsOf(n);
      if (paid === n) { onCorrect(); lockRegister(); return; }
      const target = R.q.noHundreds ? { h: 0, t: Math.floor(n / 10), o: n % 10 } : d;
      const need = R.places.filter((p) => target[p] || p !== 'h').map((p) => unit(target[p], p)).join(', ');
      const paidMsg = `You paid <b>${money(paid)}</b>. That's ${paid < n ? 'not enough' : 'too much'}.`;
      const revealed = onWrong(`${paidMsg} ${money(n)} needs ${need}.${pvChart(n)}`, {
        title: `Here's how to pay ${money(n)} 💡`,
        body: `${paidMsg} Now the counter shows the right money: <b>${need}</b>.`,
      });
      if (revealed) {
        R.counts = { ...target };
        redraw();
        lockRegister();
        $('#matWrap').classList.add('mat-answer');
      }
    };
  }

  // Once a register question is finished, make the controls look finished too.
  function lockRegister() {
    screen.querySelectorAll('.tray-btn, #clearBtn, #payBtn, .mat-bill').forEach((b) => { b.disabled = true; });
  }

  function answerMC(btn, value) {
    if (R.locked || btn.disabled) return;
    const fr = R.q.fr && FR_BY_KEY[R.q.fr];
    if (String(value) === String(R.q.answer)) {
      btn.classList.add('correct');
      if (fr) recordFr(fr.key, R.attempts === 0);
      onCorrect();
      if (fr) setTimeout(() => frSayWord(fr), 1300);
    } else {
      btn.classList.add('wrong');
      btn.disabled = true;
      const revealed = onWrong(R.q.hint);
      if (revealed && fr) { recordFr(fr.key, false); setTimeout(() => frSayWord(fr), 300); }
      if (revealed) {
        screen.querySelectorAll('.choice').forEach((b) => {
          if (String(R.q.choices[+b.dataset.i].value) === String(R.q.answer)) b.classList.add('reveal');
        });
      }
    }
  }

  const CHEERS = ['Amazing!', 'You got it!', 'Super shopper!', 'Fantastic!', 'Cha-ching!', 'Brilliant!', 'Nailed it!', 'Wow, great thinking!'];

  function onCorrect() {
    R.locked = true;
    const first = R.attempts === 0, earned = R.q.payout ? R.q.payout(first) : first ? 3 : 1;
    if (first) R.firstTries++;
    R.coins += earned;
    S.coins += earned;
    const change = R.test ? (save(), 0) : recordResult(R.id, first);
    sfx.good(); confetti();
    const ci = Math.floor(Math.random() * CHEERS.length), cheer = CHEERS[ci];
    const sold = R.q.kind === 'change' ? `<br>🛍️ Sold! ${first ? 'Right on the first try, so you got a tip!' : ''}` : '';
    showFeedback('good', `<div class="fb-title">${cheer} <span class="earned">+${earned} 🪙</span></div><div class="fb-body">${R.q.explain}${sold}</div>`);
    if (S.sound) setTimeout(() => say([`cheer/${ci}`], [[cheer]]), 350);
    if (change > 0) setTimeout(() => { sfx.fanfare(); toast(`🎉 Level up! Now playing <b>${levelInfo(R.id, levelOf(R.id)).label}</b>`); }, 700);
  }

  // Returns true when the answer is revealed (second miss).
  function onWrong(hint, reveal = {}) {
    R.attempts++;
    sfx.bad();
    const card = screen.querySelector('.play');
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    if (R.attempts === 1 && !R.test) {
      showFeedback('hint', `<div class="fb-title">${pick(['So close! Here is a clue:', 'Almost! Try again.', 'Hmm, not quite. Clue:'])}</div><div class="fb-body">${hint}</div>`, false);
      return false;
    }
    R.locked = true;
    if (!R.test) recordResult(R.id, false);
    showFeedback('reveal', `<div class="fb-title">${reveal.title || "Let's learn this one together 💡"}</div><div class="fb-body">${reveal.body || R.q.explain}</div>`);
    return true;
  }

  function showFeedback(kind, html, withNext = true) {
    const fb = $('#fb');
    fb.hidden = false;
    fb.className = `feedback fb-${kind}`;
    fb.innerHTML = `<div class="fb-guide">${avatar('md')}<div class="fb-text">${html}</div></div>` + (withNext ? `<button class="btn primary big" id="nextBtn">${R.index + 1 >= R.len || (R.id === 'sell' && !stockedSlots().length) ? 'Finish ➜' : R.id === 'sell' ? 'Next customer ➜' : 'Next ➜'}</button>` : '');
    if (withNext) $('#nextBtn').onclick = () => { sfx.tap(); R.index++; nextQuestion(); };
    (withNext ? $('#nextBtn') : fb).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderRoundEnd() {
    const g = GAMES[R.id], played = Math.max(1, R.index);
    const starsWon = R.firstTries >= played ? 3 : R.firstTries / played >= 0.6 ? 2 : 1;
    const bonus = 2 + starsWon * 2;
    S.coins += bonus;
    save();
    const msg = starsWon === 3 ? 'Perfect shopping trip!' : starsWon === 2 ? 'Great job!' : 'Nice work, keep practicing!';
    setScreen(`
      <section class="round-end">
        ${avatar('xl')}
        <div class="big-stars">${'<span>★</span>'.repeat(starsWon)}${'<span class="off">★</span>'.repeat(3 - starsWon)}</div>
        <h2>${msg}</h2>
        <p>You got <b>${R.firstTries} of ${played}</b> on the first try.</p>
        <div class="coin-total">🪙 ${R.coins} + ${bonus} bonus = <b>${R.coins + bonus} Sparkle Coins</b></div>
        <div class="actions">
          <button class="btn primary big" id="againBtn">Play ${g.name} again</button>
          <button class="btn ghost big" id="mallBtn">Back to the mall</button>
        </div>
      </section>`, { title: g.name });
    sfx.fanfare();
    if (starsWon === 3) confetti();
    $('#againBtn').onclick = () => startRound(R.id);
    $('#mallBtn').onclick = () => (g.home ? g.home() : renderMall());
    if (g.home) $('#mallBtn').textContent = g.homeLabel || `Back to the ${g.name}`;
    if (R.id === 'sell') {
      const more = stockedSlots().length > 0;
      $('#againBtn').textContent = more ? 'Serve more customers 🛎️' : 'Restock my shelves 📦';
      $('#againBtn').onclick = more ? startSelling : renderRoom;
    }
  }

  // ---------- Spelling (Letter Bead Bar) ----------
  // [bracketed] letters are the tricky part, highlighted when the answer is shown.
  // Each word has three sentences (each recorded), so she doesn't memorize them.
  // An optional 4th item is how to say the word on its own (“live” as in “I live here”, not “live music”).
  const SPELL_DEFAULT = [
    ['sa[ve]', ['I want to save my coins for the toy store.', 'Put your money in the piggy bank to save it.', 'We can save money when the shoes are on sale.'],
      'English words don’t end in <b>v</b>, so add an <b>e</b>: s-a-v-e. The <b>a</b> says its name.'],
    ['gi[ve]', ['I will give the cashier ten dollars.', 'Can you give me a shopping bag, please?', 'Let’s give Grandma a present from the gift shop.'],
      'Tricky! The <b>i</b> is short, but it still ends in <b>v-e</b>, because words don’t end in <b>v</b>.'],
    ['ha[ve]', ['Do you have this dress in my size?', 'I have five dollars to spend at the mall.', 'We have to find the pet store.'],
      'Tricky! The <b>a</b> is short, but it still ends in <b>v-e</b>, because words don’t end in <b>v</b>.'],
    ['li[ve]', ['The bunnies live in a big pen at the pet store.', 'My friend and I live near the mall.', 'Do the fish live in that tank all day?'],
      'Like give: a short <b>i</b>, then <b>v-e</b> at the end. l-i-v-e.', 'liv'],
    ['m[o]ve', ['The escalator stairs move up to the second floor.', 'Please move your cart so people can walk by.', 'Help me move the big box to the car.'],
      'Tricky! The <b>o</b> says “oo”, and it ends with <b>v-e</b>: m-o-v-e.'],
    ['ab[o]ve', ['The sale sign is above the door.', 'The lights hang above the toy shelves.', 'Look at the balloons floating above the food court!'],
      'a + b + <b>o</b> + <b>v-e</b>. The <b>o</b> says “uh”, like in love.'],
    ['al[i]ve', ['The plants at the flower shop are alive and need water.', 'Is that crab at the pet store alive? Yes, it moved!', 'Water keeps the flowers alive.'],
      '<b>a</b> + live, but the silent <b>e</b> makes the <b>i</b> say its name: a-l-i-v-e.'],
    ['al[i]ke', ['These two dresses look alike.', 'My sister and I have shoes that look alike.', 'The twins wore hats that were alike.'],
      '<b>a</b> + like: a-l-i-k-e. The silent <b>e</b> makes the <b>i</b> say its name.'],
    ['t[o]', ['We are going to the mall today.', 'I gave the money to the cashier.', 'Let’s walk to the food court.'],
      'Just two letters: t-o. This “to” means going somewhere or giving something, like “to the mall”.'],
    ['t[w]o', ['I bought two cupcakes at the bakery.', 'The sticker costs two dollars.', 'Mom is carrying two shopping bags.'],
      'This is the number 2! It has a quiet <b>w</b>: t-w-o.'],
    ['t[oo]', ['I want ice cream too!', 'Can my friend come shopping too?', 'Dad bought a hat, and Mom got one too.'],
      'This “too” means <b>also</b>. It has two <b>o</b>’s: t-o-o.'],
    ['[kn]ew', ['I knew the toy store was upstairs.', 'She knew how much change to give back.', 'We knew the bakery had fresh cookies.'],
      'Silent <b>k</b>! k-n-e-w. The <b>e-w</b> says “oo”, like in blew.'],
    ['d[o]', ['What do you want to buy?', 'Do you like this sparkly hat?', 'I do my best when I count the coins.'],
      'Just two letters: d-o. The <b>o</b> says “oo”, like in to.'],
    ['bl[ew]', ['The wind blew my shopping bag away!', 'I blew a big bubble with my new gum.', 'She blew out the candles on her birthday cake.'],
      'The wind <b>blew</b>: <b>e-w</b> says “oo”. It sounds like blue, the colour, but it is spelled b-l-e-w.'],
    ['bl[ue]', ['I want the blue backpack.', 'Her new nail polish is bright blue.', 'The sky outside the mall is blue today.'],
      'The colour! <b>u-e</b> says “oo”: b-l-u-e. It sounds like blew, but this one is the colour.'],
  ];
  const plainWord = (marked) => marked.replace(/[[\]]/g, '');
  const SPELL_INFO = Object.fromEntries(SPELL_DEFAULT.map(([m, ss, tip, sayAs]) => [plainWord(m).toLowerCase(), { marked: m, sentences: ss, tip, sayAs }]));

  // The active list: the default, or one a grown-up typed in ("word | sentence" per line).
  function spellWords() {
    const custom = Array.isArray(S.spellList) && S.spellList.length ? S.spellList : null;
    const rows = custom || SPELL_DEFAULT.map(([m, ss]) => [plainWord(m), ss[0]]);
    return rows.map(([word, sentence]) => {
      const info = SPELL_INFO[word.toLowerCase()] || {}, recorded = info.sentences || [];
      const first = sentence || recorded[0] || '';
      // A grown-up's own sentence replaces the built-in ones.
      const sentences = !recorded.length || first !== recorded[0] ? [first] : recorded;
      return { word, sentence: first, sentences, recorded: !!recorded.length && recorded[0] === first, tip: info.tip || '', marked: info.marked || word, sayAs: info.sayAs || word };
    });
  }
  const markHTML = (marked) => escapeHTML(marked).replace(/\[([^\]]*)\]/g, '<mark>$1</mark>');
  const sayWord = (w, s) => (s ? [[w.sayAs, 0.75], [s, 0.9], [w.sayAs, 0.75]] : [[w.sayAs, 0.75], [w.sayAs, 0.75]]);
  // The recorded dictation only matches if the sentence is one that was recorded.
  const spellVoice = (w, i) => (w.recorded ? [`spell/${w.word.toLowerCase()}${i ? `-${i + 1}` : ''}`] : null);

  function pickSpellWord() {
    const list = spellWords(), used = (R && R.used) || [];
    let pool = list.filter((w) => !used.includes(w.word));
    if (!pool.length) pool = list;
    // Words missed more often come up more often.
    const weight = (w) => { const st = S.spell[w.word.toLowerCase()]; return 1 + (st ? (st.total - st.right) * 2 : 1); };
    let r = Math.random() * pool.reduce((a, w) => a + weight(w), 0);
    for (const w of pool) { r -= weight(w); if (r <= 0) return w; }
    return pool[pool.length - 1];
  }

  function spellQuestion(w, peek) {
    const i = rand(0, w.sentences.length - 1), sentence = w.sentences[i];
    return {
      kind: 'spell', w, peek, sentence, speakParts: sayWord(w, sentence), speak: `${w.word}. ${sentence} ${w.word}.`,
      voice: spellVoice(w, i), slowVoice: [`slow/${w.word.toLowerCase()}`],
      explain: `<span class="spelled">${markHTML(w.marked)}</span>${w.tip ? `<br>${w.tip}` : ''}`,
    };
  }

  function recordSpell(word, ok, typed) {
    const k = word.toLowerCase(), st = S.spell[k] || (S.spell[k] = { right: 0, total: 0 });
    st.total++;
    if (ok) st.right++; else st.last = typed;
    save();
  }

  const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  const BEAD_COLORS = ['#ff8cbf', '#b79bff', '#5ed8c6', '#fcd05b', '#fdae72', '#93c3fd'];
  const beadColor = (ch) => BEAD_COLORS[(ch.charCodeAt(0) - 97 + 60) % BEAD_COLORS.length];

  function spellBody(q) {
    const keys = KEY_ROWS.map((row) => `<div class="key-row">${[...row].map((ch) =>
      `<button class="bead-key" data-ch="${ch}" style="--bead:${beadColor(ch)}" aria-label="${ch}">${ch}</button>`).join('')}</div>`).join('');
    const listen = canSpeak ? `
      <div class="listen-row">
        <button class="btn listen" id="hearBtn">🔊 Hear the word</button>
        <button class="btn ghost slow" id="slowBtn">🐢 Slowly</button>
      </div>` : '';
    const peek = q.peek ? `<div class="peek" id="peek"><small>Look closely, then spell it!</small><span class="peek-word">${markHTML(q.w.marked)}</span><small>${escapeHTML(q.sentence)}</small></div>` : '';
    return `
      <div class="play spell">
        <div class="q-card">
          <p class="prompt">📿 A customer wants a bracelet that spells the word you hear.</p>
          ${listen}${peek}
        </div>
        <div class="bracelet" id="bracelet"></div>
        <div class="keyboard">${keys}</div>
        <div class="actions">
          <button class="btn ghost" id="backBtn">⌫ Take off a bead</button>
          <button class="btn primary" id="doneBtn">Done ✔</button>
        </div>
      </div>`;
  }

  function drawBracelet(marks) {
    const typed = R.typed;
    const beads = [...typed].map((ch, i) => `<span class="bead ${marks ? (marks[i] ? 'ok' : 'bad') : ''}" style="--bead:${beadColor(ch.toLowerCase())}">${escapeHTML(ch)}</span>`).join('');
    $('#bracelet').innerHTML = `<span class="clasp"></span>${beads || '<span class="bracelet-empty">Tap the letter beads to spell the word</span>'}<span class="clasp"></span>`;
  }

  function wireSpell() {
    const q = R.q;
    R.typed = '';
    drawBracelet();
    const add = (ch) => {
      if (R.locked || R.typed.length >= 14) return;
      const peek = $('#peek');
      if (peek) peek.classList.add('covered');
      R.typed += ch; sfx.tap(); drawBracelet();
    };
    const back = () => { if (R.locked || !R.typed) return; R.typed = R.typed.slice(0, -1); drawBracelet(); };
    const done = () => {
      if (R.locked) return;
      if (!R.typed) return toast('Tap some letter beads first!');
      const typed = R.typed, target = q.w.word.toLowerCase();
      if (typed.toLowerCase() === target) {
        recordSpell(q.w.word, R.attempts === 0 || R.test, typed);
        R.typed = q.w.word; drawBracelet([...q.w.word].map(() => true));
        if (R.test) R.results.push({ word: q.w.word, typed, ok: true });
        lockSpell(); onCorrect();
        return;
      }
      const marks = [...typed].map((ch, i) => ch.toLowerCase() === target[i]);
      drawBracelet(marks);
      const right = marks.filter(Boolean).length;
      const hint = `The word has <b>${target.length}</b> letter${target.length === 1 ? '' : 's'}. ${right ? `The <span class="ok-txt">green</span> beads are in the right spot.` : ''} Listen again and fix the <span class="bad-txt">red</span> beads.${q.w.tip ? `<br>💡 ${q.w.tip}` : ''}`;
      const revealed = onWrong(hint, {
        title: `It's spelled like this 💡`,
        body: `You spelled <s>${escapeHTML(typed)}</s>. ${q.explain}`,
      });
      if (revealed) {
        recordSpell(q.w.word, false, typed);
        if (R.test) R.results.push({ word: q.w.word, typed, ok: false });
        R.typed = q.w.word; drawBracelet([...q.w.word].map(() => true));
        lockSpell();
      } else say(q.slowVoice, [[q.w.sayAs, 0.75]]);
    };
    screen.querySelectorAll('.bead-key').forEach((b) => { b.onclick = () => add(b.dataset.ch); });
    $('#backBtn').onclick = back;
    $('#doneBtn').onclick = done;
    R.keyHandler = (e) => {
      if (/^[a-z]$/i.test(e.key)) add(e.key.toLowerCase());
      else if (e.key === 'Backspace') back();
      else if (e.key === 'Enter') done();
    };
    if (canSpeak) {
      $('#hearBtn').onclick = () => say(q.voice, q.speakParts);
      $('#slowBtn').onclick = () => say(q.slowVoice, [[q.w.sayAs, 0.45]]);
      say(q.voice, q.speakParts);
    }
  }

  function lockSpell() {
    screen.querySelectorAll('.bead-key, #backBtn, #doneBtn').forEach((b) => { b.disabled = true; });
    const peek = $('#peek');
    if (peek) peek.classList.remove('covered');
  }

  function renderSpellHome() {
    const words = spellWords(), g = GAMES.spelling, lv = levelOf('spelling');
    const chips = words.map((w, i) => {
      const st = S.spell[w.word.toLowerCase()];
      const cls = !st ? '' : st.right === st.total ? 'ok' : st.right / st.total >= 0.5 ? 'mid' : 'low';
      return `<button class="word-chip ${cls}" data-i="${i}">${canSpeak ? '🔊 ' : ''}${escapeHTML(w.word)}</button>`;
    }).join('');
    setScreen(`
      <section class="spell-home">
        <div class="guide">${avatar('lg')}<p class="bubble">Customers want bracelets with your spelling words! Listen, then spell with beads. 📿</p></div>
        <div class="spell-modes">
          <button class="mode-card c-pink" id="practiceBtn"><span class="mode-emoji">📿</span><b>Practice</b><small>5 words with clues · ${g.levels[lv].label}</small></button>
          <button class="mode-card c-purple" id="testBtn"><span class="mode-emoji">📝</span><b>Practice test</b><small>All ${words.length} words, one try each, just like Friday</small></button>
        </div>
        <h3>Study the list</h3>
        <p class="subtle">Tap a word to hear it in a sentence. Colors show how you're doing: <span class="ok-txt">green</span> = always right, <span class="mid-txt">yellow</span> = sometimes, <span class="bad-txt">red</span> = needs practice.</p>
        <div class="word-chips">${chips}</div>
      </section>`, { title: g.name });
    $('#practiceBtn').onclick = () => { sfx.tap(); startRound('spelling'); };
    $('#testBtn').onclick = () => { sfx.tap(); startSpellTest(); };
    screen.querySelectorAll('.word-chip').forEach((b) => { b.onclick = () => { const w = words[+b.dataset.i]; say(spellVoice(w, 0), sayWord(w, w.sentence)); }; });
  }

  function renderTestEnd() {
    const n = R.results.length, right = R.results.filter((r) => r.ok).length;
    const bonus = right * 2;
    S.coins += bonus;
    save();
    const pct = n ? right / n : 0;
    const msg = pct === 1 ? 'Perfect! You are ready for Friday! 🎉' : pct >= 0.8 ? 'Great job! Almost there!' : 'Good practice! Keep going!';
    const rows = R.results.map((r) => `<li class="${r.ok ? 'ok' : 'bad'}"><span>${r.ok ? '✔' : '✘'}</span><b>${escapeHTML(r.word)}</b>${r.ok ? '' : ` <s>${escapeHTML(r.typed)}</s>`}</li>`).join('');
    setScreen(`
      <section class="round-end test-end">
        ${avatar('xl')}
        <h2>${msg}</h2>
        <p>You spelled <b>${right} of ${n}</b> words correctly.</p>
        <ul class="test-results">${rows}</ul>
        <div class="coin-total">🪙 ${R.coins} + ${bonus} bonus = <b>${R.coins + bonus} Sparkle Coins</b></div>
        <div class="actions">
          <button class="btn primary big" id="againBtn">Take the test again</button>
          <button class="btn ghost big" id="mallBtn">Back to the Letter Bead Bar</button>
        </div>
      </section>`, { title: 'Practice test' });
    sfx.fanfare();
    if (pct === 1) confetti();
    $('#againBtn').onclick = startSpellTest;
    $('#mallBtn').onclick = renderSpellHome;
  }

  // ---------- Marché d'automne: French Thanksgiving words (seasonal) ----------
  // Her French test: match each word to its picture. Pictures are iPad emoji where a good
  // one exists, otherwise simple drawings made for this game (no outside images).
  const SVG = (body) => `<svg viewBox="0 0 100 100" class="fr-svg" aria-hidden="true">${body}</svg>`;
  const INK = 'stroke="#5b3a29" stroke-width="2.5" stroke-linejoin="round"';
  const FR_ART = {
    automne: SVG(`<ellipse cx="50" cy="93" rx="40" ry="5" fill="#e9c99f"/>
      <path d="M44 93 Q47 76 46 60 L54 60 Q53 76 57 93 Z" fill="#8b5a2b" ${INK}/>
      <path d="M49 66 L37 54 M51 63 L64 52" stroke="#8b5a2b" stroke-width="5" stroke-linecap="round"/>
      <circle cx="34" cy="42" r="17" fill="#f97316" ${INK}/><circle cx="66" cy="42" r="17" fill="#f59e0b" ${INK}/>
      <circle cx="50" cy="27" r="19" fill="#ef4444" ${INK}/><circle cx="50" cy="50" r="15" fill="#fb923c" ${INK}/>
      <ellipse cx="18" cy="74" rx="5" ry="3" fill="#ef4444" transform="rotate(-30 18 74)"/>
      <ellipse cx="82" cy="70" rx="5" ry="3" fill="#f59e0b" transform="rotate(25 82 70)"/>
      <ellipse cx="74" cy="86" rx="5" ry="3" fill="#f97316" transform="rotate(-15 74 86)"/>`),
    recolte: SVG(`<path d="M30 52 L26 14 M38 52 L38 10 M46 52 L50 14" stroke="#c99a3c" stroke-width="3"/>
      <ellipse cx="26" cy="16" rx="4" ry="8" fill="#e6b84f"/><ellipse cx="38" cy="12" rx="4" ry="8" fill="#e6b84f"/><ellipse cx="50" cy="16" rx="4" ry="8" fill="#e6b84f"/>
      <ellipse cx="36" cy="52" rx="16" ry="12" fill="#f97316" ${INK}/><path d="M36 41 L37 35" stroke="#4d7c0f" stroke-width="4"/>
      <circle cx="60" cy="52" r="8" fill="#ef4444" ${INK}/><circle cx="73" cy="50" r="8" fill="#dc2626" ${INK}/>
      <ellipse cx="66" cy="38" rx="5" ry="14" fill="#facc15" ${INK} transform="rotate(35 66 38)"/>
      <path d="M58 46 Q62 30 74 26" stroke="#65a30d" stroke-width="4" fill="none"/>
      <rect x="16" y="56" width="68" height="34" rx="3" fill="#c98b4e" ${INK}/>
      <path d="M16 67 H84 M16 78 H84" stroke="#8b5a2b" stroke-width="2.5"/>`),
    epouvantail: SVG(`<path d="M50 40 V97" stroke="#8b5a2b" stroke-width="5"/>
      <path d="M14 50 H86" stroke="#8b5a2b" stroke-width="4"/>
      <path d="M10 46 L16 50 L10 54 M90 46 L84 50 L90 54" stroke="#e6b450" stroke-width="3" fill="none"/>
      <path d="M18 45 H82 L80 56 H66 L68 80 H32 L34 56 H20 Z" fill="#ef4444" ${INK}/>
      <path d="M40 45 V80 M60 45 V80 M20 51 H80 M33 66 H67" stroke="#b91c1c" stroke-width="2"/>
      <rect x="44" y="56" width="10" height="9" fill="#60a5fa" ${INK}/>
      <path d="M36 80 L33 88 M42 80 L41 89 M58 80 L59 89 M64 80 L67 88" stroke="#e6b450" stroke-width="3"/>
      <circle cx="50" cy="33" r="11" fill="#f3d9a4" ${INK}/>
      <path d="M45 31 l2 2 m0 -2 l-2 2 M53 31 l2 2 m0 -2 l-2 2" stroke="#5b3a29" stroke-width="1.6"/>
      <path d="M44 38 Q50 42 56 38" stroke="#5b3a29" stroke-width="1.8" fill="none"/>
      <ellipse cx="50" cy="24" rx="20" ry="4.5" fill="#e6b450" ${INK}/>
      <path d="M40 24 Q40 9 50 9 Q60 9 60 24 Z" fill="#e6b450" ${INK}/><path d="M40 20 H60" stroke="#ef4444" stroke-width="3"/>`),
    pelerins: SVG(`<path d="M8 96 Q10 70 34 68 Q56 70 58 96 Z" fill="#475569" ${INK}/>
      <path d="M22 70 L34 82 L46 70 Z" fill="#fff" ${INK}/>
      <circle cx="34" cy="54" r="12" fill="#f8d9b8" ${INK}/>
      <path d="M20 58 Q18 36 34 35 Q50 36 48 58 Q46 46 34 45 Q22 46 20 58 Z" fill="#fff" ${INK}/>
      <circle cx="30" cy="55" r="1.6" fill="#5b3a29"/><circle cx="38" cy="55" r="1.6" fill="#5b3a29"/>
      <path d="M31 60 Q34 62 37 60" stroke="#5b3a29" stroke-width="1.5" fill="none"/>
      <path d="M44 96 Q46 70 68 68 Q90 70 92 96 Z" fill="#1f2937" ${INK}/>
      <path d="M56 70 L68 80 L80 70 Z" fill="#fff" ${INK}/>
      <circle cx="68" cy="54" r="12" fill="#f8d9b8" ${INK}/>
      <circle cx="64" cy="55" r="1.6" fill="#5b3a29"/><circle cx="72" cy="55" r="1.6" fill="#5b3a29"/>
      <path d="M65 60 Q68 62 71 60" stroke="#5b3a29" stroke-width="1.5" fill="none"/>
      <ellipse cx="68" cy="43" rx="18" ry="4" fill="#111827" ${INK}/>
      <path d="M57 43 L59 18 H77 L79 43 Z" fill="#111827" ${INK}/>
      <rect x="58" y="34" width="20" height="5" fill="#374151"/><rect x="64" y="32" width="8" height="9" fill="none" stroke="#facc15" stroke-width="2.5"/>`),
    corne: SVG(`<path d="M8 22 Q14 64 52 80 L60 46 Q26 46 8 22 Z" fill="#d4a056" ${INK}/>
      <path d="M18 40 Q34 54 56 56 M26 54 Q40 64 54 68 M34 66 Q44 72 52 74" stroke="#8b5a2b" stroke-width="2" fill="none"/>
      <ellipse cx="58" cy="63" rx="7" ry="18" fill="#8b5a2b" ${INK} transform="rotate(14 58 63)"/>
      <circle cx="70" cy="48" r="7" fill="#7c3aed" ${INK}/><circle cx="78" cy="54" r="7" fill="#8b5cf6" ${INK}/><circle cx="70" cy="60" r="7" fill="#7c3aed" ${INK}/>
      <circle cx="74" cy="76" r="10" fill="#ef4444" ${INK}/><path d="M74 66 L76 61" stroke="#5b3a29" stroke-width="2.5"/>
      <path d="M88 60 Q96 72 90 82 Q84 88 80 80 Q80 70 88 60 Z" fill="#a3e635" ${INK}/>
      <circle cx="60" cy="88" r="8" fill="#fb923c" ${INK}/>`),
    dinde: SVG(`<ellipse cx="50" cy="80" rx="46" ry="11" fill="#e0f2fe" ${INK}/>
      <ellipse cx="50" cy="77" rx="38" ry="7" fill="#fff"/>
      <path d="M14 74 Q12 44 44 40 Q76 36 86 60 Q90 74 80 78 H20 Q14 78 14 74 Z" fill="#c97a3a" ${INK}/>
      <path d="M28 52 Q40 46 54 48" stroke="#e8a66a" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M66 54 Q74 40 82 30" stroke="#a65d26" stroke-width="12" stroke-linecap="round"/>
      <path d="M66 54 Q74 40 82 30" stroke="#c97a3a" stroke-width="8" stroke-linecap="round"/>
      <path d="M82 30 L88 22" stroke="#f3e7d3" stroke-width="5" stroke-linecap="round"/>
      <path d="M84 20 l6 -2 m-6 2 l1 -6 m3 4 l5 0" stroke="#fff" stroke-width="2.5"/>
      <path d="M22 60 Q16 44 20 32" stroke="#a65d26" stroke-width="12" stroke-linecap="round"/>
      <path d="M22 60 Q16 44 20 32" stroke="#c97a3a" stroke-width="8" stroke-linecap="round"/>
      <path d="M20 32 L21 22" stroke="#f3e7d3" stroke-width="5" stroke-linecap="round"/>`),
    gland: SVG(`<path d="M30 46 Q28 84 50 92 Q72 84 70 46 Z" fill="#d08c45" ${INK}/>
      <path d="M40 56 Q39 72 46 82" stroke="#f0c48a" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M22 48 Q22 24 50 22 Q78 24 78 48 Q50 54 22 48 Z" fill="#8b5a2b" ${INK}/>
      <path d="M30 34 l5 5 m3 -9 l5 5 m3 -7 l5 5 m3 -3 l5 5 m-28 8 l5 5 m6 -5 l5 5 m6 -5 l5 5" stroke="#5b3a29" stroke-width="2"/>
      <path d="M50 22 Q52 12 58 8" stroke="#5b3a29" stroke-width="4" stroke-linecap="round" fill="none"/>`),
    brechet: SVG(`<path d="M24 14 Q26 58 50 82 Q74 58 76 14" stroke="#b08c5a" stroke-width="15" stroke-linecap="round" fill="none"/>
      <path d="M24 14 Q26 58 50 82 Q74 58 76 14" stroke="#f6ead2" stroke-width="10" stroke-linecap="round" fill="none"/>
      <circle cx="50" cy="84" r="9" fill="#f6ead2" stroke="#b08c5a" stroke-width="2.5"/>
      <path d="M30 26 Q32 52 46 70" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none"/>`),
    citrouille: SVG(`<path d="M50 30 Q52 16 60 10" stroke="#4d7c0f" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M56 24 Q70 12 80 20 Q70 30 56 24 Z" fill="#65a30d" ${INK}/>
      <ellipse cx="50" cy="62" rx="40" ry="30" fill="#f97316" ${INK}/>
      <ellipse cx="50" cy="62" rx="24" ry="30" fill="#fb923c" ${INK}/>
      <ellipse cx="50" cy="62" rx="9" ry="30" fill="#f97316" ${INK}/>`),
    courge: SVG(`<path d="M46 12 Q36 14 38 38 Q22 56 30 78 Q42 96 60 88 Q76 78 66 52 Q58 38 58 20 Q56 10 46 12 Z" fill="#f2c27b" ${INK}/>
      <path d="M50 12 L52 4" stroke="#4d7c0f" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="48" cy="76" rx="9" ry="6" fill="#e3a857"/>
      <path d="M44 22 Q42 34 44 44" stroke="#fbe2b4" stroke-width="3" stroke-linecap="round" fill="none"/>
      <circle cx="80" cy="80" r="13" fill="#facc15" ${INK}/>
      <path d="M80 67 Q76 80 80 93 M80 67 Q86 80 80 93" stroke="#65a30d" stroke-width="3" fill="none"/>
      <path d="M80 67 L82 61" stroke="#4d7c0f" stroke-width="4" stroke-linecap="round"/>`),
  };

  // fr: the word as on her worksheet; en: what it means; tip: a memory trick.
  const FR_WORDS = [
    { key: 'eglise', fr: 'l’église', en: 'the church', pic: '⛪', tip: 'L’église has a bell tower and a cross on top.' },
    { key: 'automne', fr: 'l’automne', en: 'autumn (fall)', art: 'automne', tip: 'L’automne sounds like “autumn”: the season of red and orange trees.' },
    { key: 'dindon', fr: 'le dindon', en: 'the turkey (the bird)', pic: '🦃', tip: 'Le dindon is the turkey bird with its feathers, alive and saying “glou-glou”! (La dinde is the one you eat.)' },
    { key: 'recolte', fr: 'la récolte', en: 'the harvest', art: 'recolte', tip: 'La récolte is everything the farmer picks from the field: a big crate of food.' },
    { key: 'epouvantail', fr: 'l’épouvantail', en: 'the scarecrow', art: 'epouvantail', tip: '“Épouvanter” means “to scare”. L’épouvantail scares the birds away!' },
    { key: 'pelerins', fr: 'les pèlerins', en: 'the pilgrims', art: 'pelerins', tip: 'Les pèlerins sounds a bit like “pilgrims”: the people with the tall black hat and the white bonnet.' },
    { key: 'corne', fr: 'la corne d’abondance', en: 'the cornucopia (horn of plenty)', art: 'corne', tip: 'Une corne is a horn. La corne d’abondance is the horn full of fruit.' },
    { key: 'dinde', fr: 'la dinde', en: 'the turkey (to eat)', art: 'dinde', tip: 'La dinde is the roast turkey on the dinner table. (Le dindon is the live bird.)' },
    { key: 'aborigenes', fr: 'les aborigènes', en: 'Indigenous peoples', pic: '🪶', tip: 'Les aborigènes are the First Peoples of Canada. Look for the feather.' },
    { key: 'gland', fr: 'un gland', en: 'an acorn', art: 'gland', tip: 'Un gland is the little nut with a hat that squirrels love.' },
    { key: 'tarte', fr: 'la tarte', en: 'the pie', pic: '🥧', tip: 'La tarte sounds like “tart”: a yummy pie!' },
    { key: 'brechet', fr: 'le bréchet', en: 'the wishbone', art: 'brechet', tip: 'You “break” le bréchet to make a wish: bré-chet!' },
    { key: 'citrouille', fr: 'une citrouille', en: 'a pumpkin', art: 'citrouille', tip: 'Une citrouille is big, round and orange, like a giant citrus fruit!' },
    { key: 'courge', fr: 'la courge', en: 'the squash', art: 'courge', tip: 'La courge sounds like “gourd”: the long squash, not the round pumpkin.' },
    { key: 'panier', fr: 'le panier', en: 'the basket', pic: '🧺', tip: '“Pain” means bread. Le panier is a basket you could carry bread in!' },
    { key: 'mais', fr: 'le maïs', en: 'the corn', pic: '🌽', tip: 'Le maïs sounds like “maize”, another word for corn.' },
    { key: 'feuilles', fr: 'les feuilles', en: 'the leaves', pic: '🍂', tip: 'Les feuilles fall from the trees in l’automne.' },
    { key: 'ecureuil', fr: 'un écureuil', en: 'a squirrel', pic: '🐿️', tip: 'Un écureuil has a big curly tail and hides glands (acorns)!' },
  ];
  const FR_BY_KEY = Object.fromEntries(FR_WORDS.map((w) => [w.key, w]));
  // Words that are easy to mix up are often shown together.
  const FR_TRICKY = [['dinde', 'dindon'], ['citrouille', 'courge'], ['automne', 'feuilles'], ['recolte', 'corne'], ['recolte', 'panier'],
    ['pelerins', 'aborigenes'], ['gland', 'ecureuil'], ['tarte', 'citrouille'], ['mais', 'recolte'], ['epouvantail', 'pelerins']];
  const frPic = (w, cls = '') => `<span class="fr-pic ${cls}" role="img" aria-label="${w.en}">${w.art ? FR_ART[w.art] : `<span class="fr-emoji">${w.pic}</span>`}</span>`;
  const frSayWord = (w) => say([`fr/${w.key}`], [[w.fr.replace(/’/g, "'"), 0.8, 'fr-CA']]);
  const frStat = (key) => S.fr[key];
  function recordFr(key, ok) {
    const st = S.fr[key] || (S.fr[key] = { right: 0, total: 0 });
    st.total++; if (ok) st.right++;
    save();
  }
  // Words she misses come up more often.
  function pickFrWords(n, avoid = []) {
    const weight = (w) => { const st = frStat(w.key); return 1 + (st ? (st.total - st.right) * 2 : 1); };
    const pool = FR_WORDS.filter((w) => !avoid.includes(w.key)), out = [];
    while (out.length < n && pool.length) {
      let r = Math.random() * pool.reduce((a, w) => a + weight(w), 0), i = 0;
      for (; i < pool.length - 1; i++) { r -= weight(pool[i]); if (r <= 0) break; }
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }
  function frDistractors(target, n, tricky) {
    const out = [];
    if (tricky) for (const pair of shuffle(FR_TRICKY)) if (pair.includes(target.key) && out.length < 1) out.push(FR_BY_KEY[pair.find((k) => k !== target.key)]);
    for (const w of shuffle(FR_WORDS)) if (out.length < n && w !== target && !out.includes(w)) out.push(w);
    return out;
  }
  const frExplain = (w) => `<div class="fr-answer">${frPic(w, 'sm')}<div><b class="fr-big">${w.fr}</b><br><small>${w.en}</small></div></div>${w.tip}`;

  function frQuestion(level) {
    const recent = (n) => (R && R.used ? R.used.slice(-n) : []);
    if (level >= 3) return frMatch(pickFrWords(5, recent(10)), false);
    const target = pickFrWords(1, recent(4))[0];
    const wordToPic = level >= 2 && Math.random() < 0.5;
    const choices = shuffle([target, ...frDistractors(target, level <= 1 ? 2 : 3, level >= 2)]);
    const base = { kind: 'mc', fr: target.key, answer: target.key, hint: target.tip, explain: frExplain(target) };
    if (wordToPic) {
      return {
        ...base, layout: 'pics', visual: `<div class="word-tag fr-tag">${target.fr}</div>`,
        prompt: 'Écoute! Which picture matches the French word?', autoSay: true,
        speak: 'Which picture matches the French word?', voice: ['line/fr-word', `fr/${target.key}`],
        speakParts: [['Which picture matches the French word?', 0.9], [target.fr.replace(/’/g, "'"), 0.8, 'fr-CA']],
        choices: choices.map((w) => ({ value: w.key, label: frPic(w) })),
      };
    }
    return {
      ...base, layout: 'fr-words', visual: frPic(target, 'big'),
      prompt: 'Quel mot? Which French word matches the picture?', speak: 'Which French word matches the picture?', voice: ['line/fr-pic'],
      choices: choices.map((w) => ({ value: w.key, label: `<span class="fr-word">${w.fr}</span>` })),
    };
  }

  // Like the test: match every word to its picture.
  function frMatch(words, test) {
    const keys = words.map((w) => w.key);
    return {
      kind: 'match', keys, pics: shuffle(keys), words: shuffle(keys), test,
      prompt: 'Match each French word to its picture. Tap a picture, then its word.',
      speak: 'Match each French word to its picture.', voice: ['line/fr-match'],
      explain: '',
    };
  }

  function matchBody(q) {
    return `
      <div class="play match-play">
        <div class="q-card"><p class="prompt">${q.prompt} ${canSpeak ? '<button class="say" id="sayBtn" aria-label="Read it to me">🔊</button>' : ''}</p></div>
        <div class="match-board">
          <div class="match-col">${q.pics.map((k) => `<button class="match-card m-pic" data-k="${k}">${frPic(FR_BY_KEY[k])}</button>`).join('')}</div>
          <div class="match-col">${q.words.map((k) => `<button class="match-card m-word" data-k="${k}">${FR_BY_KEY[k].fr}</button>`).join('')}</div>
        </div>
      </div>`;
  }

  function wireMatch() {
    const q = R.q, missed = new Set(), tries = {};
    let sel = null, done = 0, mistakes = 0;
    const card = (side, k) => screen.querySelector(`.match-card.${side}[data-k="${k}"]`);
    const pair = (k, how) => {
      done++;
      [card('m-pic', k), card('m-word', k)].forEach((el) => { el.classList.remove('sel'); el.classList.add(how, `c${done % 6}`); el.disabled = true; el.dataset.n = done; });
      frSayWord(FR_BY_KEY[k]);
      if (done === q.keys.length) {
        q.keys.forEach((key) => { recordFr(key, !missed.has(key)); if (R.test) R.results.push({ key, ok: !missed.has(key) }); });
        R.attempts = mistakes ? 1 : 0;
        q.explain = `${mistakes ? `${mistakes} mix-up${mistakes > 1 ? 's' : ''}. Keep practising the ones with a ✘!` : 'All matched on the first try!'}<div class="fr-recap">${q.keys.map((key) => `<span class="${missed.has(key) ? 'miss' : ''}">${missed.has(key) ? '✘' : '✔'} ${frPic(FR_BY_KEY[key], 'xs')} ${FR_BY_KEY[key].fr}</span>`).join('')}</div>`;
        setTimeout(onCorrect, 500);
      }
    };
    screen.querySelectorAll('.match-card').forEach((el) => {
      el.onclick = () => {
        if (R.locked || el.disabled) return;
        const side = el.classList.contains('m-pic') ? 'm-pic' : 'm-word';
        if (!sel || sel.side === side) {
          screen.querySelectorAll('.match-card.sel').forEach((x) => x.classList.remove('sel'));
          el.classList.add('sel'); sel = { side, k: el.dataset.k, el }; sfx.tap();
          if (side === 'm-word') frSayWord(FR_BY_KEY[el.dataset.k]);
          return;
        }
        const picKey = side === 'm-pic' ? el.dataset.k : sel.k, wordKey = side === 'm-word' ? el.dataset.k : sel.k;
        const other = sel.el; sel = null;
        if (picKey === wordKey) { sfx.coin(); pair(picKey, 'matched'); return; }
        mistakes++; missed.add(picKey); missed.add(wordKey); sfx.bad();
        [el, other].forEach((x) => { x.classList.remove('sel'); x.classList.add('nope'); setTimeout(() => x.classList.remove('nope'), 600); });
        tries[picKey] = (tries[picKey] || 0) + 1;
        // Practice: after two mix-ups with the same picture, show the right word.
        if (!R.test && tries[picKey] >= 2) { toast(`That one is <b>${FR_BY_KEY[picKey].fr}</b>`); setTimeout(() => pair(picKey, 'revealed'), 700); }
        else toast(pick(['Not that one, try again!', 'Oops, look again!', 'Almost! Try another word.']));
      };
    });
    if (canSpeak) $('#sayBtn').onclick = () => say(q.voice, [[q.speak]]);
    if (S.autoRead) say(q.voice, [[q.speak]]);
  }

  // Practice test: all 18 words in boards of 6, like the real test.
  function startFrTest() {
    const order = shuffle(FR_WORDS), boards = [];
    for (let i = 0; i < order.length; i += 6) boards.push(order.slice(i, i + 6));
    R = { id: 'french', test: true, boards, results: [], index: 0, firstTries: 0, coins: 0, len: boards.length, used: [],
      testQ: (i) => frMatch(boards[i], true), testEnd: renderFrTestEnd };
    nextQuestion();
  }

  function renderFrHome() {
    const g = GAMES.french, lv = levelOf('french');
    const cards = FR_WORDS.map((w, i) => {
      const st = frStat(w.key);
      const cls = !st ? '' : st.right === st.total ? 'ok' : st.right / st.total >= 0.5 ? 'mid' : 'low';
      return `<button class="fr-card ${cls}" data-i="${i}">${frPic(w)}<b>${w.fr}</b><small class="fr-en">${w.en}</small></button>`;
    }).join('');
    setScreen(`
      <section class="spell-home fr-home">
        <div class="guide">${avatar('lg')}<p class="bubble">Bonjour! The autumn market is open for <b>l’Action de grâces</b>. Learn your French words for the test! 🍂</p></div>
        <div class="spell-modes">
          <button class="mode-card c-orange" id="practiceBtn"><span class="mode-emoji">🍁</span><b>Practice</b><small>5 questions · ${g.levels[lv].label}</small></button>
          <button class="mode-card c-purple" id="testBtn"><span class="mode-emoji">📝</span><b>Practice test</b><small>Match all ${FR_WORDS.length} words to their pictures, just like the test</small></button>
        </div>
        <h3>Study the words <label class="en-toggle"><input type="checkbox" id="enToggle" ${S.frEnglish === false ? '' : 'checked'}> Show English</label></h3>
        <p class="subtle">Tap a card to hear the word in French. Colours show how you're doing: <span class="ok-txt">green</span> = always right, <span class="mid-txt">yellow</span> = sometimes, <span class="bad-txt">red</span> = needs practice.</p>
        <div class="fr-cards ${S.frEnglish === false ? 'no-en' : ''}">${cards}</div>
      </section>`, { title: g.name });
    $('#practiceBtn').onclick = () => { sfx.tap(); startRound('french'); };
    $('#testBtn').onclick = () => { sfx.tap(); startFrTest(); };
    $('#enToggle').onchange = (e) => { S.frEnglish = e.target.checked; save(); $('.fr-cards').classList.toggle('no-en', !e.target.checked); };
    screen.querySelectorAll('.fr-card').forEach((b) => { b.onclick = () => frSayWord(FR_WORDS[+b.dataset.i]); });
  }

  function renderFrTestEnd() {
    const n = R.results.length, right = R.results.filter((r) => r.ok).length;
    const bonus = right * 2;
    S.coins += bonus;
    save();
    const pct = n ? right / n : 0;
    const msg = pct === 1 ? 'Parfait! You are ready for your test! 🎉' : pct >= 0.8 ? 'Très bien! Almost there!' : 'Good practice! Keep going!';
    const rows = R.results.map((r) => { const w = FR_BY_KEY[r.key]; return `<li class="${r.ok ? 'ok' : 'bad'}"><span>${r.ok ? '✔' : '✘'}</span>${frPic(w, 'xs')}<b>${w.fr}</b></li>`; }).join('');
    setScreen(`
      <section class="round-end test-end">
        ${avatar('xl')}
        <h2>${msg}</h2>
        <p>You matched <b>${right} of ${n}</b> words on the first try.</p>
        <ul class="test-results fr-results">${rows}</ul>
        <div class="coin-total">🪙 ${R.coins} + ${bonus} bonus = <b>${R.coins + bonus} Sparkle Coins</b></div>
        <div class="actions">
          <button class="btn primary big" id="againBtn">Take the test again</button>
          <button class="btn ghost big" id="mallBtn">Back to the Marché d’automne</button>
        </div>
      </section>`, { title: 'Practice test' });
    sfx.fanfare();
    if (pct === 1) confetti();
    $('#againBtn').onclick = startFrTest;
    $('#mallBtn').onclick = renderFrHome;
  }

  // ---------- Step-by-step questions (Receipt Counter, Display Window) ----------
  // A "steps" question is a list of steps with blanks she fills using the keypad.
  // Level 1 ("Learn") walks through the book's method one step at a time, with hints
  // that teach the method rather than the answer. Higher levels are a single step with
  // no hints: a miss gets "check your work", a second miss shows the worked solution.

  const bx = (id, cls = '') => `<button class="bx ${cls}" data-b="${id}" aria-label="Answer box"></button>`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  function addCols(a, b) {
    const A = digitsOf(a), B = digitsOf(b), out = {};
    let carry = 0;
    for (const p of ['o', 't', 'h']) {
      const tot = A[p] + B[p] + carry;
      out[p] = { a: A[p], b: B[p], cin: carry, tot, digit: tot % 10, cout: Math.floor(tot / 10) };
      carry = out[p].cout;
    }
    return out;
  }

  // kind: none | ones | tens | both (which columns regroup). bLen: digits in the second number.
  function genAdd(kind, bLen) {
    if (kind === 'tens' && bLen === 1) bLen = 2;
    for (let i = 0; i < 5000; i++) {
      const a = rand(100, 899);
      const b = bLen === 1 ? rand(1, 9) : bLen === 2 ? rand(10, 99) : rand(100, 899);
      if (a + b > 999) continue;
      const c = addCols(a, b), ro = c.o.cout > 0, rt = c.t.cout > 0;
      if ((kind === 'none' && !ro && !rt) || (kind === 'ones' && ro && !rt) || (kind === 'tens' && !ro && rt) || (kind === 'both' && ro && rt)) {
        return { a, b, s: a + b, c };
      }
    }
    return { a: 347, b: 129, s: 476, c: addCols(347, 129) };
  }

  // The book's worked solution, line by line.
  function workedAdd(a, b) {
    const c = addCols(a, b), lines = [];
    const plus = (p) => `${c[p].cin ? `${unit(1, p)} + ` : ''}${unit(c[p].a, p)} + ${unit(c[p].b, p)}`;
    lines.push(`<b>Add the ones.</b> ${unit(c.o.a, 'o')} + ${unit(c.o.b, 'o')} = ${unit(c.o.tot, 'o')}${c.o.cout ? `. <b>Regroup:</b> ${c.o.tot} ones = 1 ten ${unit(c.o.digit, 'o')}` : ''}.`);
    lines.push(`<b>Add the tens.</b> ${plus('t')} = ${unit(c.t.tot, 't')}${c.t.cout ? `. <b>Regroup:</b> ${c.t.tot} tens = 1 hundred ${unit(c.t.digit, 't')}` : ''}.`);
    lines.push(`<b>Add the hundreds.</b> ${plus('h')} = ${unit(c.h.tot, 'h')}.`);
    lines.push(`So, ${a} + ${b} = <b>${a + b}</b>.`);
    return `<ol class="worked">${lines.map((l) => `<li>${l}</li>`).join('')}</ol>`;
  }

  // Column addition grid. opts.fill: answer places shown (guided); opts.carry: carries shown;
  // opts.input: answer row (and carry row) are boxes; opts.hide: { a: [places], b: [places] } become boxes.
  function addGrid(a, b, opts = {}) {
    const c = addCols(a, b), A = digitsOf(a), B = digitsOf(b), places = ['h', 't', 'o'];
    const hide = opts.hide || { a: [], b: [] };
    const digitCell = (n, len, p, row) => {
      if (hide[row] && hide[row].includes(p)) return `<span class="g-cell">${bx(`${row}${p}`, 'g')}</span>`;
      const show = p === 'o' || (p === 't' && len >= 2) || (p === 'h' && len >= 3);
      return `<span class="g-cell">${show ? n : ''}</span>`;
    };
    const len = (n) => String(n).length;
    const carryCell = (p) => {
      if (p === 'o') return '<span class="g-cell g-carry"></span>';
      const from = p === 't' ? 'o' : 't';
      if (opts.input) return `<span class="g-cell g-carry">${bx(`c${p}`, 'carry')}</span>`;
      return `<span class="g-cell g-carry">${opts.carry && opts.carry.includes(p) && c[from].cout ? '1' : ''}</span>`;
    };
    const ansCell = (p) => {
      if (opts.input) return `<span class="g-cell">${bx(`s${p}`, 'g')}</span>`;
      const shown = opts.fill && opts.fill.includes(p);
      return `<span class="g-cell g-ans">${shown ? c[p].digit : ''}</span>`;
    };
    return `<div class="add-grid" aria-label="${a} plus ${b}">
      <span class="g-cell"></span>${places.map((p) => `<span class="g-cell g-head pv-${p}">${PLACE[p].name}</span>`).join('')}
      <span class="g-cell"></span>${places.map(carryCell).join('')}
      <span class="g-cell"></span>${places.map((p) => digitCell(A[p], len(a), p, 'a')).join('')}
      <span class="g-cell g-sign">+</span>${places.map((p) => digitCell(B[p], len(b), p, 'b')).join('')}
      <span class="g-line"></span>
      <span class="g-cell"></span>${places.map(ansCell).join('')}
    </div>`;
  }

  // Both numbers as money in a place-value chart (the book's base 10 blocks).
  function addMat(a, b) {
    const A = digitsOf(a), B = digitsOf(b);
    const row = (D, n) => `<div class="am-label">${n}</div>` + ['h', 't', 'o'].map((p) => `<div class="am-cell pv-${p}">${Array.from({ length: D[p] }, () => billHTML(p, 'sm')).join('')}</div>`).join('');
    return `<div class="add-mat">
      <div></div>${['h', 't', 'o'].map((p) => `<div class="pv-head am-head pv-${p}">${PLACE[p].name}</div>`).join('')}
      ${row(A, a)}<div class="am-split"></div>${row(B, b)}
    </div>`;
  }

  const RECEIPT_STORIES = [
    (a, b) => ({ text: `The bakery sold ${a} cupcakes in the morning and ${b} cupcakes in the afternoon. How many cupcakes did it sell in all?`, why: 'In all means put them together, so add.' }),
    (a, b) => ({ text: `On Saturday, ${a} shoppers visited the toy store. On Sunday, ${b} more shoppers visited than on Saturday. How many shoppers visited on Sunday?`, why: `Sunday had ${b} <b>more</b> than Saturday, so add.` }),
    (a, b) => ({ text: `The shoe store sold ${a} pairs of shoes on Monday. It sold ${b} fewer pairs on Monday than on Tuesday. How many pairs did it sell on Tuesday?`, why: `Monday had <b>fewer</b>, so Tuesday had <b>more</b>. Add to find Tuesday.` }),
    (a, b) => ({ text: `The craft store has ${a} red beads and ${b} blue beads. How many beads does it have altogether?`, why: 'Altogether means put them together, so add.' }),
    (a, b) => ({ text: `${pick(['Mia', 'Ava', 'Zoe', 'Lily'])} has ${a} stickers. She buys ${b} more stickers at the mall. How many stickers does she have now?`, why: 'She gets more, so add.' }),
    (a, b) => ({ text: `The book store sold ${a} books last week. This week it sold ${b} more books than last week. How many books did it sell this week?`, why: `This week was ${b} <b>more</b>, so add.` }),
    (a, b) => ({ text: `The pet store has ${a} goldfish and ${b} guppies. How many fish does it have in all?`, why: 'In all means put them together, so add.' }),
    (a, b) => ({ text: `The food court sold ${a} pretzels on Friday and ${b} pretzels on Saturday. How many pretzels did it sell on both days?`, why: 'Both days together means add.' }),
    (a, b) => ({ text: `The movie theatre had ${a} people at the first show. The second show had ${b} more people than the first show. How many people were at the second show?`, why: `The second show had ${b} <b>more</b>, so add.` }),
    (a, b) => ({ text: `The game store had ${a} video games. A truck brought ${b} more. How many video games does the store have now?`, why: 'More games came in, so add.' }),
    (a, b) => ({ text: `${pick(['Hannah', 'Maya', 'Emma', 'Nia'])} saved $${a}. Her grandma gave her $${b} more. How much money does she have now?`, why: 'She got more money, so add.' }),
    (a, b) => ({ text: `The flower shop sold ${a} roses and ${b} tulips. How many flowers did it sell altogether?`, why: 'Altogether means put them together, so add.' }),
    (a, b) => ({ text: `The sports store sold ${a} soccer balls in May. In May it sold ${b} fewer than in June. How many soccer balls did it sell in June?`, why: `May had <b>fewer</b>, so June had <b>more</b>. Add to find June.` }),
    (a, b) => ({ text: `The candy store has ${a} red lollipops and ${b} green lollipops. How many lollipops are there in all?`, why: 'In all means put them together, so add.' }),
    (a, b) => ({ text: `The parking lot had ${a} cars in the morning. Then ${b} more cars parked. How many cars are in the lot now?`, why: 'More cars came, so add.' }),
    (a, b) => ({ text: `The art store sold ${a} crayons on Tuesday. On Wednesday it sold ${b} more crayons than on Tuesday. How many crayons did it sell on Wednesday?`, why: `Wednesday was ${b} <b>more</b>, so add.` }),
    (a, b) => ({ text: `The mall gave out ${a} balloons at the front door and ${b} balloons at the back door. How many balloons did it give out in all?`, why: 'In all means put them together, so add.' }),
    (a, b) => ({ text: `The jewellery stand has ${a} rings. It gets ${b} more rings in a delivery. How many rings does it have now?`, why: 'More rings came, so add.' }),
  ];

  function receiptQuestion(level) {
    const [i1, i2] = items(2).map(({ emoji, name }) => ({ e: emoji, name }));
    const receipt = (a, b) => `<div class="receipt">
      <div class="r-line"><span>${i1.e} ${i1.name}</span><b>${money(a)}</b></div>
      <div class="r-line"><span>${i2.e} ${i2.name}</span><b>${money(b)}</b></div>
      <div class="r-line r-total"><span>Total</span><b>?</b></div></div>`;

    if (level <= 1) {
      const kind = pick(['none', 'ones', 'ones', 'tens', 'both', 'both']);
      const { a, b, s, c } = genAdd(kind, pick([1, 2, 3, 3, 3]));
      const steps = [];
      steps.push({
        text: `<b>Add the ones.</b><br>${unit(c.o.a, 'o')} + ${unit(c.o.b, 'o')} = ${bx('o1')} ones`,
        blanks: [{ id: 'o1', ans: c.o.tot }], voice: ['line/add-ones'], speak: 'Add the ones.',
        hint: Math.min(c.o.a, c.o.b) === 0
          ? 'Look at the ones column. Adding 0 ones does not change the number of ones!'
          : `Look at the ones column. Start at ${Math.max(c.o.a, c.o.b)} and count on ${Math.min(c.o.a, c.o.b)} more. You can count the $1 coins!`,
        reveal: `${unit(c.o.a, 'o')} + ${unit(c.o.b, 'o')} = ${unit(c.o.tot, 'o')}.`, show: { fill: c.o.cout ? [] : ['o'] },
      });
      if (c.o.cout) {
        steps.push({
          text: `<b>Regroup the ones.</b><br>${c.o.tot} ones = ${bx('o2')} ten ${bx('o3')} ones`,
          blanks: [{ id: 'o2', ans: 1 }, { id: 'o3', ans: c.o.digit }], voice: ['line/add-regroup-ones'], speak: 'Regroup the ones. Ten ones make one ten.',
          hint: `Every 10 ones make 1 ten. Take a group of 10 out of ${c.o.tot} ones. How many groups of 10, and how many ones are left?`,
          reveal: `${c.o.tot} ones = 1 ten ${unit(c.o.digit, 'o')}. The ${c.o.digit} goes in the ones place, and a small 1 goes above the tens.`,
          show: { fill: ['o'], carry: ['t'] },
        });
      }
      steps.push({
        text: `<b>Add the tens.</b><br>${c.t.cin ? '1 ten + ' : ''}${unit(c.t.a, 't')} + ${unit(c.t.b, 't')} = ${bx('t1')} tens`,
        blanks: [{ id: 't1', ans: c.t.tot }], voice: ['line/add-tens'], speak: 'Add the tens.',
        hint: `Count the $10 bills in the tens column${c.t.cin ? ', and don\'t forget the 1 ten you regrouped' : ''}.`,
        reveal: `${c.t.cin ? '1 ten + ' : ''}${unit(c.t.a, 't')} + ${unit(c.t.b, 't')} = ${unit(c.t.tot, 't')}.`,
        show: { fill: c.t.cout ? ['o'] : ['o', 't'], carry: ['t'] },
      });
      if (c.t.cout) {
        steps.push({
          text: `<b>Regroup the tens.</b><br>${c.t.tot} tens = ${bx('t2')} hundred ${bx('t3')} tens`,
          blanks: [{ id: 't2', ans: 1 }, { id: 't3', ans: c.t.digit }], voice: ['line/add-regroup-tens'], speak: 'Regroup the tens. Ten tens make one hundred.',
          hint: `Every 10 tens make 1 hundred. Take a group of 10 tens out of ${c.t.tot} tens. How many tens are left?`,
          reveal: `${c.t.tot} tens = 1 hundred ${unit(c.t.digit, 't')}. The ${c.t.digit} goes in the tens place, and a small 1 goes above the hundreds.`,
          show: { fill: ['o', 't'], carry: ['t', 'h'] },
        });
      }
      steps.push({
        text: `<b>Add the hundreds.</b><br>${c.h.cin ? '1 hundred + ' : ''}${unit(c.h.a, 'h')} + ${unit(c.h.b, 'h')} = ${bx('h1')} hundreds`,
        blanks: [{ id: 'h1', ans: c.h.tot }], voice: ['line/add-hundreds'], speak: 'Add the hundreds.',
        hint: `Count the $100 bills${c.h.cin ? ', and add the 1 hundred you regrouped' : ''}.`,
        reveal: `${c.h.cin ? '1 hundred + ' : ''}${unit(c.h.a, 'h')} + ${unit(c.h.b, 'h')} = ${unit(c.h.tot, 'h')}.`,
        show: { fill: ['o', 't', 'h'], carry: ['t', 'h'] },
      });
      steps.push({
        text: `So, ${a} + ${b} = ${bx('tot')}`,
        blanks: [{ id: 'tot', ans: s }], voice: ['line/add-total'], speak: 'Now write the total.',
        hint: 'Read the answer row from left to right: hundreds, tens, then ones.',
        reveal: `${a} + ${b} = ${s}.`, show: { fill: ['o', 't', 'h'], carry: ['t', 'h'] },
      });
      return {
        kind: 'steps', guided: true, steps, nums: { a, b, s },
        prompt: `Add up the receipt, one step at a time.`,
        board: (st) => `${receipt(a, b)}${addGrid(a, b, (steps[Math.max(0, st - 1)] || {}).show && st > 0 ? steps[st - 1].show : {})}${addMat(a, b)}`,
        explain: workedAdd(a, b),
      };
    }

    // Thinking Cap: missing digits (level 4).
    if (level >= 4 && Math.random() < 0.6) {
      const { a, b, s } = genAdd(pick(['ones', 'tens', 'both', 'both']), 3);
      const row = pick(['a', 'b', 'b']);
      const hidden = shuffle(['h', 't', 'o']).slice(0, rand(1, 3));
      const D = digitsOf(row === 'a' ? a : b);
      const order = ['o', 't', 'h'].filter((p) => hidden.includes(p));
      const miss = variant([
        ['Thinking Cap! What are the missing numbers?', 'line/add-missing'],
        ['Thinking Cap! Some digits fell off the receipt. Which digits are missing?', 'line/add-missing-2'],
        ['Thinking Cap! Find the hidden digits that make the addition true.', 'line/add-missing-3'],
      ]);
      return {
        kind: 'steps', guided: false, nums: { a, b, s, row, hidden },
        prompt: miss[0],
        steps: [{
          text: 'Fill in the missing digits so the addition is correct.',
          blanks: order.map((p) => ({ id: `${row}${p}`, ans: D[p] })), voice: [miss[1]], speak: plain(miss[0]),
        }],
        board: () => `<div class="thinking">🧢</div>${addGrid(a, b, { hide: { [row]: hidden }, fill: ['o', 't', 'h'], carry: [] })}`,
        explain: `${a} + ${b} = ${s}.${workedAdd(a, b)}`,
      };
    }

    // Word problems (levels 3 and 4).
    if (level >= 3 && Math.random() < 0.4) {
      const { a, b, s } = genAdd(pick(['ones', 'tens', 'both', 'both']), pick([2, 3, 3]));
      const story = pick(RECEIPT_STORIES)(a, b);
      return {
        kind: 'steps', guided: false, nums: { a, b, s },
        prompt: '📖 Shopping story. Read it, then solve it.',
        steps: [{ text: `<p class="story">${story.text}</p><div class="story-ans">Answer: ${bx('ans')}</div>`, blanks: [{ id: 'ans', ans: s }], speak: story.text }],
        board: () => '',
        explain: `${story.why}<br>${a} + ${b} = <b>${s}</b>.${workedAdd(a, b)}`,
      };
    }

    // On your own: the whole column (levels 2+).
    const kind = level <= 2 ? pick(['none', 'ones', 'ones', 'tens', 'tens']) : pick(['ones', 'tens', 'both', 'both', 'both']);
    const { a, b, s } = genAdd(kind, level <= 2 ? pick([2, 3]) : 3);
    const [ownPrompt, ownVoice, ownSpeak] = variant([
      ['Add up the receipt. Write the total in the boxes.', 'line/add-own', 'Add the two prices. Remember to regroup when a column makes ten or more.'],
      ['What is the total? Add the two prices.', 'line/add-own-2', 'What is the total? Add the two prices, starting with the ones.'],
      ['The cashier needs the total. Add it up!', 'line/add-own-3', 'The cashier needs your help. Add up the receipt, and remember to regroup.'],
    ]);
    return {
      kind: 'steps', guided: false, nums: { a, b, s },
      prompt: ownPrompt,
      steps: [{
        text: 'Write each digit of the total. You can write any regrouped 1s in the small boxes.',
        blanks: [{ id: 'so', ans: digitsOf(s).o }, { id: 'st', ans: digitsOf(s).t }, { id: 'sh', ans: digitsOf(s).h }, { id: 'ct', ans: null }, { id: 'ch', ans: null }],
        voice: [ownVoice], speak: ownSpeak,
      }],
      board: () => `${receipt(a, b)}${addGrid(a, b, { input: true })}`,
      explain: workedAdd(a, b),
    };
  }

  // ----- Display Window: addition patterns -----
  const PAT_EMOJI = ['🎁', '🧁', '👜', '⭐', '🌸', '🧸', '🍩', '🎈', '💎', '🦋', '🍓', '🎀', '🌈', '🐠', '🍪', '👑', '🌻', '🦄'];
  // Where the number patterns show up in the mall.
  const PAT_PLACES = ['The sale sign numbers grow in a pattern!', 'The parking spots are numbered in a pattern!',
    'The lockers at the ice rink are numbered in a pattern!', 'The raffle tickets are numbered in a pattern!',
    'The prize counter points grow in a pattern!', 'The elevator buttons skip in a pattern!'];
  const CODE_JOBS = ['number the sale tags', 'count the shopping carts', 'number the raffle tickets', 'count the gift boxes', 'number the parking spots', 'count coins in the fountain'];

  function seqBoard(terms, d, shown, opts = {}) {
    return `<div class="seq">${terms.map((t, i) => `${i ? `<span class="jump">+${opts.hideJump ? '?' : d}</span>` : ''}<span class="seq-term">${shown.includes(i) ? t : bx(`n${i}`)}</span>`).join('')}</div>`;
  }

  function figuresBoard(start, d, emoji, count, guided) {
    const fig = (n) => {
      const total = start + (n - 1) * d;
      const items = Array.from({ length: total }, (_, i) => `<span class="fig-item ${guided && i >= start ? `grow g${Math.floor((i - start) / d) % 3}` : ''}">${emoji}</span>`).join('');
      return `<div class="fig"><div class="fig-items">${items}</div><small>Figure ${n}</small></div>`;
    };
    return `<div class="figs">${Array.from({ length: count }, (_, i) => fig(i + 1)).join('')}<div class="fig fig-q">?</div></div>`;
  }

  function figTable(start, d, emoji, asked) {
    return `<table class="fig-table"><tr><th>Figure number</th><th>Number of ${emoji}</th></tr>${[1, 2, 3, 4, 5].map((n) => `<tr><td>${n}</td><td>${asked.includes(n) ? bx(`f${n}`) : start + (n - 1) * d}</td></tr>`).join('')}</table>`;
  }

  function codeBoard(s, d, r, opts = {}) {
    const outs = Array.from({ length: r }, (_, i) => s + (i + 1) * d);
    const val = (id, v, show) => (show ? `<b>${v}</b>` : bx(id));
    return `<div class="code">
      <div class="code-block set">SET <i>Value</i> to ${val('cs', s, !opts.askSet)}</div>
      <div class="code-loop"><div class="code-repeat">REPEAT <b>${r}</b></div>
        <div class="code-body"><div class="code-block add">ADD ${val('cd', d, !opts.askAdd)} to <i>Value</i></div><div class="code-block out">OUTPUT <i>Value</i></div></div></div>
      ${opts.outputs === false ? '' : `<div class="code-outs"><small>Outputs:</small>${outs.map((o, i) => `<span class="seq-term">${(opts.shownOuts || []).includes(i) ? o : bx(`o${i}`)}</span>`).join('')}</div>`}
    </div>`;
  }

  function patternQuestion(level) {
    const type = level <= 1 ? pick(['num', 'num', 'shape', 'code']) : level === 2 ? 'num' : pick(['shape', 'code', 'code']);

    if (type === 'num') {
      const d = pick(level <= 1 ? [2, 3, 4, 5, 10, 20, 25, 30, 50, 100] : [3, 4, 6, 7, 8, 9, 11, 12, 13, 15, 18, 20, 25, 30, 40, 50, 75, 100, 150]);
      let s;
      do { s = level <= 1 ? pick([0, rand(1, 60), rand(100, 400), rand(1, 8) * 100]) : rand(0, 800); } while (s + d * 6 > 999);
      const terms = Array.from({ length: 7 }, (_, i) => s + i * d);
      const rule = `Pattern rule: Start at ${s}, and add ${d} each time.`;
      const explain = `${rule}<br>${terms.join(', ')}`;
      if (level <= 1) {
        const steps = [
          {
            text: `How much is added each time?<br>${terms[0]} + ${bx('d')} = ${terms[1]}`, blanks: [{ id: 'd', ans: d }],
            voice: ['line/pat-jump'], speak: 'How much is added each time?',
            hint: `Count on from ${terms[0]} to ${terms[1]}. Try counting by tens first, then by ones.`, reveal: `${terms[0]} + ${d} = ${terms[1]}. The jump is ${d}.`,
          },
          {
            text: `Pattern rule: Start at ${bx('rs')}, and add ${bx('rd')} each time.`, blanks: [{ id: 'rs', ans: s }, { id: 'rd', ans: d }],
            voice: ['line/pat-rule'], speak: 'Write the pattern rule.',
            hint: 'The pattern starts with the first number on the line. You found the jump in the last step.', reveal: rule,
          },
          {
            text: `Continue the pattern. Add ${d} each time.`, blanks: [4, 5, 6].map((i) => ({ id: `n${i}`, ans: terms[i] })),
            voice: ['line/pat-next'], speak: 'What numbers come next?',
            hint: `Add ${d} to the last number. Then add ${d} again.`, reveal: terms.slice(4).join(', '),
          },
        ];
        return {
          kind: 'steps', guided: true, steps, pat: { s, d }, prompt: pick(PAT_PLACES),
          board: (st) => seqBoard(terms, d, [0, 1, 2, 3], { hideJump: st < 1 }), explain,
        };
      }
      const hidden = shuffle([1, 2, 3, 4, 5, 6]).slice(0, rand(2, 4)).sort((x, y) => x - y);
      const askRule = Math.random() < 0.5;
      return {
        kind: 'steps', guided: false, pat: { s, d }, prompt: 'What are the missing numbers in the pattern?',
        steps: [{
          text: askRule ? `Pattern rule: Start at ${s}, and add ${bx('rd')} each time.` : 'Fill in the missing numbers.',
          blanks: [...hidden.map((i) => ({ id: `n${i}`, ans: terms[i] })), ...(askRule ? [{ id: 'rd', ans: d }] : [])],
          voice: ['line/pat-missing'], speak: 'What are the missing numbers in the pattern?',
        }],
        board: () => seqBoard(terms, d, [0, 1, 2, 3, 4, 5, 6].filter((i) => !hidden.includes(i)), { hideJump: true }), explain,
      };
    }

    if (type === 'shape') {
      const start = rand(1, level <= 1 ? 5 : 7), d = rand(1, level <= 1 ? 3 : 5), emoji = pick(PAT_EMOJI);
      const rule = `Pattern rule: Start at ${start}, and add ${d} each time.`;
      const counts = [1, 2, 3, 4, 5].map((n) => start + (n - 1) * d);
      const explain = `${rule}<br>Figures 1 to 5: ${counts.join(', ')}.`;
      if (level <= 1) {
        const steps = [
          { text: `How many ${emoji} are in Figure 1? ${bx('c1')}`, blanks: [{ id: 'c1', ans: start }], voice: ['line/pat-count1'], speak: 'How many are in Figure 1?', hint: 'Touch each one as you count it.', reveal: `Figure 1 has ${start}.` },
          { text: `How many ${emoji} are in Figure 2? ${bx('c2')}`, blanks: [{ id: 'c2', ans: start + d }], voice: ['line/pat-count2'], speak: 'How many are in Figure 2?', hint: 'Count the ones from Figure 1, then count on the new ones.', reveal: `Figure 2 has ${start + d}.` },
          { text: `How many ${emoji} are added each time? ${start} + ${bx('dd')} = ${start + d}`, blanks: [{ id: 'dd', ans: d }], voice: ['line/pat-added'], speak: 'How many are added each time?', hint: `Look at the colored ones that are new in each figure. Or count on from ${start} to ${start + d}.`, reveal: `${d} are added each time.` },
          { text: `Pattern rule: Start at ${bx('rs')}, and add ${bx('rd')} each time.`, blanks: [{ id: 'rs', ans: start }, { id: 'rd', ans: d }], voice: ['line/pat-rule'], speak: 'Write the pattern rule.', hint: 'Start with the number in Figure 1. Add the number you found in the last step.', reveal: rule },
          { text: 'Use the pattern rule to complete the table.', blanks: [{ id: 'f4', ans: counts[3] }, { id: 'f5', ans: counts[4] }], voice: ['line/pat-table'], speak: 'Use the pattern rule to complete the table.', hint: `Figure 3 has ${counts[2]}. Add ${d} to get Figure 4, then add ${d} again.`, reveal: `Figure 4 has ${counts[3]} and Figure 5 has ${counts[4]}.` },
        ];
        return {
          kind: 'steps', guided: true, steps, pat: { s: start, d }, prompt: 'Build the window display! Each figure grows by the same amount.',
          board: (st) => `${figuresBoard(start, d, emoji, 3, true)}${st >= 4 ? figTable(start, d, emoji, [4, 5]) : ''}`, explain,
        };
      }
      return {
        kind: 'steps', guided: false, pat: { s: start, d }, prompt: 'Find the pattern rule. Then complete the table.',
        steps: [{
          text: `Pattern rule: Start at ${bx('rs')}, and add ${bx('rd')} each time.`,
          blanks: [{ id: 'rs', ans: start }, { id: 'rd', ans: d }, { id: 'f4', ans: counts[3] }, { id: 'f5', ans: counts[4] }],
          voice: ['line/pat-table'], speak: 'Find the pattern rule. Then complete the table.',
        }],
        board: () => `${figuresBoard(start, d, emoji, 3, false)}${figTable(start, d, emoji, [4, 5])}`, explain,
      };
    }

    // Robot cashier code.
    const r = pick([3, 4, 5, 5, 6]), d = pick((level <= 1 ? [2, 5, 10, 20, 25, 50, 100] : [2, 3, 4, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 200]).filter((x) => x * r <= 800));
    const job = pick(CODE_JOBS);
    let s;
    do { s = pick([0, 50, 100, 150, 200, 250, 300, 450, 500, 600, 750, rand(1, 60) * 5, rand(1, 99)]); } while (s + d * r > 999);
    const outs = Array.from({ length: r }, (_, i) => s + (i + 1) * d);
    const explain = `SET starts the Value at ${s}. Each time through the loop, ADD ${d}, then OUTPUT.<br>Pattern: ${[s, ...outs].join(', ')}.`;
    if (level <= 1) {
      const steps = [
        { text: `The starting number is ${bx('cs1')}.`, blanks: [{ id: 'cs1', ans: s }], voice: ['line/code-set'], speak: 'What is the starting number?', hint: 'The SET block tells you the starting number.', reveal: `SET Value to ${s}, so it starts at ${s}.` },
        { text: `The number added each time is ${bx('cd1')}.`, blanks: [{ id: 'cd1', ans: d }], voice: ['line/code-add'], speak: 'What number is added each time?', hint: 'The ADD block inside the loop tells you what to add.', reveal: `ADD ${d} to Value, so ${d} is added each time.` },
        { text: `The first output is ${s} + ${d} = ${bx('o0x')}.`, blanks: [{ id: 'o0x', ans: outs[0] }], voice: ['line/code-first'], speak: 'What is the first output?', hint: `Start with ${s}, then add ${d}.`, reveal: `${s} + ${d} = ${outs[0]}.` },
        { text: `The loop repeats ${r} times. What are the other outputs?`, blanks: outs.slice(1).map((o, i) => ({ id: `o${i + 1}`, ans: o })), voice: ['line/code-outputs'], speak: 'Follow the code. What are the outputs?', hint: `Each output is ${d} more than the one before.`, reveal: outs.slice(1).join(', ') },
      ];
      return {
        kind: 'steps', guided: true, steps, pat: { s, d }, prompt: `🤖 The robot cashier follows this code to ${job}.`,
        board: (st) => codeBoard(s, d, r, { shownOuts: st >= 3 ? [0] : [], outputs: st >= 2 }), explain,
      };
    }
    const form = pick(['run', 'make', 'missing']);
    if (form === 'make') {
      return {
        kind: 'steps', guided: false, pat: { s, d }, prompt: `🤖 Make a pattern that starts at ${s} and increases by ${d} each time.`,
        steps: [{ text: 'Fill in the code.', blanks: [{ id: 'cs', ans: s }, { id: 'cd', ans: d }], voice: ['line/code-make'], speak: 'Fill in the code to make this pattern.' }],
        board: () => codeBoard(s, d, r, { askSet: true, askAdd: true, outputs: false }), explain,
      };
    }
    if (form === 'missing') {
      const pattern = [s, ...outs], hidden = shuffle(outs.map((_, i) => i + 1)).slice(0, rand(2, 3));
      return {
        kind: 'steps', guided: false, pat: { s, d }, prompt: `🤖 The robot uses this code to ${job}. What are the missing numbers?`,
        steps: [{ text: 'Fill in the missing numbers.', blanks: hidden.sort((x, y) => x - y).map((i) => ({ id: `n${i}`, ans: pattern[i] })), voice: ['line/pat-missing'], speak: 'What are the missing numbers in the pattern?' }],
        board: () => `${codeBoard(s, d, r, { outputs: false })}${seqBoard(pattern, d, pattern.map((_, i) => i).filter((i) => !hidden.includes(i)), { hideJump: true })}`, explain,
      };
    }
    return {
      kind: 'steps', guided: false, pat: { s, d }, prompt: `🤖 The robot uses this code to ${job}. What are the outputs?`,
      steps: [{ text: 'Write every output.', blanks: outs.map((o, i) => ({ id: `o${i}`, ans: o })), voice: ['line/code-outputs'], speak: 'Follow the code. What are the outputs?' }],
      board: () => codeBoard(s, d, r, {}), explain,
    };
  }

  // ----- Gift Card Desk: subtraction up to 1000 (Chapter 3) -----
  // The book's method: subtract the ones, then the tens, then the hundreds. "You cannot take
  // away 8 ones from 2 ones. So, regroup the tens and ones": 4 tens 2 ones = 3 tens 12 ones.
  // Written work: cross out the digit that gives 1 and write the new number above it; put a
  // small 1 in front of the digit that gets 10 (²4̸ ¹2). Then "Check!" by adding.

  function subCols(a, b) {
    const A = digitsOf(a), B = digitsOf(b), top = { ...A }, trades = [];
    const trade = (from, to) => { top[from]--; top[to] += 10; trades.push([from, to]); };
    const ro = A.o < B.o, zero = ro && A.t === 0;
    if (ro) { if (zero) trade('h', 't'); trade('t', 'o'); }
    const afterOnes = { ...top };
    const rt = top.t < B.t;
    if (rt) trade('h', 't');
    return { A, B, top, afterOnes, trades, ro, rt, zero, d: { h: top.h - B.h, t: top.t - B.t, o: top.o - B.o } };
  }

  // How the regrouping is written on the problem. Per place: x = the digit is crossed out,
  // one = small 1 in front of the digit, above = { v, one, x } written above it.
  const newMarks = () => ({ h: {}, t: {}, o: {} });
  function markTrade(m, from, to, newFrom) {
    const f = m[from];
    f.x = true; f.above = { v: newFrom }; // a place only ever gives once
    const t = m[to];
    if (t.above && !t.above.x) t.above.one = true; else t.one = true;
  }
  function finalMarks(a, b) {
    const c = subCols(a, b), m = newMarks(), cur = { ...c.A };
    for (const [from, to] of c.trades) { cur[from]--; cur[to] += 10; markTrade(m, from, to, cur[from]); }
    return m;
  }

  // kind: none | ones | tens | both | zero (a 0 in the tens, so regroup across it). bLen: digits in b.
  function genSub(kind, bLen) {
    for (let i = 0; i < 5000; i++) {
      const a = kind === 'zero' ? rand(2, 9) * 100 + (Math.random() < 0.3 ? 0 : rand(1, 8)) : rand(200, 999);
      const b = bLen === 2 ? rand(11, 99) : rand(101, 899);
      if (a - b < 10) continue;
      const c = subCols(a, b);
      const got = c.zero ? 'zero' : c.ro && c.rt ? 'both' : c.ro ? 'ones' : c.rt ? 'tens' : 'none';
      if (got === kind) return { a, b, s: a - b, c };
    }
    return { a: 432, b: 178, s: 254, c: subCols(432, 178) };
  }

  const cannot = (need, have, p) => `You cannot take away ${unit(need, p)} from ${unit(have, p)}.`;
  const regroupName = (from, to) => `the ${PLACE[from].name} and ${PLACE[to].name}`;

  function workedSub(a, b) {
    const c = subCols(a, b), { A, B, top, afterOnes, d } = c, L = [];
    if (c.zero) {
      L.push(`<b>Subtract the ones.</b> ${cannot(B.o, A.o, 'o')} There are 0 tens, so first regroup the hundreds and tens: ${unit(A.h, 'h')} 0 tens = ${unit(A.h - 1, 'h')} 10 tens. Then regroup the tens and ones: 10 tens ${unit(A.o, 'o')} = 9 tens ${unit(afterOnes.o, 'o')}. ${unit(afterOnes.o, 'o')} − ${unit(B.o, 'o')} = ${unit(d.o, 'o')}.`);
    } else if (c.ro) {
      L.push(`<b>Subtract the ones.</b> ${cannot(B.o, A.o, 'o')} So, regroup the tens and ones: ${unit(A.t, 't')} ${unit(A.o, 'o')} = ${unit(afterOnes.t, 't')} ${unit(afterOnes.o, 'o')}. ${unit(afterOnes.o, 'o')} − ${unit(B.o, 'o')} = ${unit(d.o, 'o')}.`);
    } else L.push(`<b>Subtract the ones.</b> ${unit(A.o, 'o')} − ${unit(B.o, 'o')} = ${unit(d.o, 'o')}.`);
    if (c.rt) {
      L.push(`<b>Subtract the tens.</b> ${cannot(B.t, afterOnes.t, 't')} So, regroup the hundreds and tens: ${unit(afterOnes.h, 'h')} ${unit(afterOnes.t, 't')} = ${unit(top.h, 'h')} ${unit(top.t, 't')}. ${unit(top.t, 't')} − ${unit(B.t, 't')} = ${unit(d.t, 't')}.`);
    } else L.push(`<b>Subtract the tens.</b> ${unit(top.t, 't')} − ${unit(B.t, 't')} = ${unit(d.t, 't')}.`);
    L.push(`<b>Subtract the hundreds.</b> ${unit(top.h, 'h')} − ${unit(B.h, 'h')} = ${unit(d.h, 'h')}.`);
    L.push(`So, ${a} − ${b} = <b>${a - b}</b>.`);
    L.push(`<b>Check!</b> ${a - b} + ${b} = ${a}. The answer is correct.`);
    return `${subGrid(a, b, { marks: finalMarks(a, b), fill: ['h', 't', 'o'] })}<ol class="worked">${L.map((l) => `<li>${l}</li>`).join('')}</ol>`;
  }

  // Column subtraction. opts.marks: regrouping written so far (guided); opts.fill: answer places
  // shown; opts.hl: the column being worked on; opts.input: answer and regroup rows are boxes;
  // opts.hide: { a: [places], b: [places] } become boxes.
  function subGrid(a, b, opts = {}) {
    const { A, B, d } = subCols(a, b), places = ['h', 't', 'o'], marks = opts.marks || newMarks(), hide = opts.hide || {};
    const lenB = String(b).length, hl = (p) => (opts.hl === p ? 'g-hl' : '');
    const one = (on) => (on ? '<sup class="g-one">1</sup>' : '');
    const above = (p) => {
      if (opts.input) return `<span class="g-cell g-carry">${bx(`r${p}`, 'carry')}</span>`;
      const ab = marks[p].above;
      return `<span class="g-cell g-carry">${ab ? `<span class="${ab.x ? 'g-x' : ''}">${one(ab.one)}${ab.v}</span>` : ''}</span>`;
    };
    const topCell = (p) => ((hide.a || []).includes(p) ? `<span class="g-cell ${hl(p)}">${bx(`a${p}`, 'g')}</span>`
      : `<span class="g-cell ${hl(p)}"><span class="${marks[p].x ? 'g-x' : ''}">${one(marks[p].one)}${A[p]}</span></span>`);
    const botCell = (p) => {
      if ((hide.b || []).includes(p)) return `<span class="g-cell ${hl(p)}">${bx(`b${p}`, 'g')}</span>`;
      const show = p === 'o' || (p === 't' && lenB >= 2) || (p === 'h' && lenB >= 3);
      return `<span class="g-cell ${hl(p)}">${show ? B[p] : ''}</span>`;
    };
    const ansCell = (p) => {
      if (opts.input) return `<span class="g-cell">${bx(`s${p}`, 'g')}</span>`;
      const shown = (opts.fill || []).includes(p) && !(p === 'h' && d.h === 0); // no leading zero
      return `<span class="g-cell g-ans ${hl(p)}">${shown ? d[p] : ''}</span>`;
    };
    return `<div class="add-grid sub-grid" aria-label="${a} minus ${b}">
      <span class="g-cell"></span>${places.map((p) => `<span class="g-cell g-head pv-${p}">${PLACE[p].name}</span>`).join('')}
      <span class="g-cell"></span>${places.map(above).join('')}
      <span class="g-cell"></span>${places.map(topCell).join('')}
      <span class="g-cell g-sign">−</span>${places.map(botCell).join('')}
      <span class="g-line"></span>
      <span class="g-cell"></span>${places.map(ansCell).join('')}
    </div>`;
  }

  // The money she starts with, in a place-value chart (the book's base 10 blocks). Taken-away
  // money gets an ✗; when tapping is on, $100s and $10s can be tapped to regroup them.
  function subMat(counts, taken, tapping, label) {
    const cell = (p) => {
      const keep = counts[p] - (taken[p] || 0);
      const bills = Array.from({ length: counts[p] }, (_, i) => {
        const html = billHTML(p, `sm ${i >= keep ? 'gone' : ''}`);
        return tapping && p !== 'o' ? `<button class="tap-bill" data-p="${p}" aria-label="Regroup a ${PLACE[p].bill}">${html}</button>` : html;
      }).join('');
      return `<div class="am-cell pv-${p}">${bills}</div>`;
    };
    return `<div class="add-mat sub-mat ${tapping ? 'tapping' : ''}">
      <div></div>${['h', 't', 'o'].map((p) => `<div class="pv-head am-head pv-${p}">${PLACE[p].name}</div>`).join('')}
      <div class="am-label">${label}</div>${['h', 't', 'o'].map(cell).join('')}
    </div>`;
  }

  // Where the subtraction happens: a gift card, a sale tag or a wallet.
  const SUB_PLACES = [
    { start: '🎁 Gift card', minus: (it) => `${it.e} ${it.name}`, left: 'Left on card', learn: 'How much is left on the gift card?' },
    { start: (it) => `🏷️ ${it.name} was`, minus: () => 'Sale: take off', left: 'Sale price', learn: 'What is the sale price?' },
    { start: '👛 In my wallet', minus: (it) => `Spent on ${it.e} ${it.name}`, left: 'Money left', learn: 'How much money is left?' },
    { start: '🎟️ Arcade card', minus: (it) => `${it.e} ${it.name} prize`, left: 'Left on card', learn: 'How much is left on the arcade card?' },
  ];
  const subTicket = (a, b, ctx, it) => {
    const val = (x) => (typeof x === 'function' ? x(it) : x);
    return `<div class="receipt sub-ticket">
      <div class="r-line"><span>${val(ctx.start)}</span><b>${money(a)}</b></div>
      <div class="r-line"><span>${val(ctx.minus)}</span><b>− ${money(b)}</b></div>
      <div class="r-line r-total"><span>${ctx.left}</span><b>?</b></div></div>`;
  };

  const kid = () => pick(['Mia', 'Ava', 'Hannah', 'Nia', 'Zoe', 'Lily', 'Emma', 'Ruby']);
  const SUB_STORIES = [
    (a, b) => ({ text: `${kid()} has a $${a} gift card. She spends $${b} on a new bike. How much is left on her card?`, why: 'She spent some, so subtract to find how much is left.' }),
    (a, b) => ({ text: `The toy store had ${a} toys. It sold ${b} of them. How many toys are left?`, why: 'Some were sold, so subtract to find how many are left.' }),
    (a, b) => ({ text: `A guitar costs $${a}. Today it is $${b} off. What is the sale price?`, why: '“Off” means take away, so subtract.' }),
    (a, b) => ({ text: `The bakery made ${a} rolls in the morning. ${b} rolls are sold during the day. How many rolls are left?`, why: 'Some were sold, so subtract.' }),
    (a, b) => ({ text: `${a} people visit the food court. ${b} are adults. How many are children?`, why: 'You know all the people and the adults. Subtract to find the children.' }),
    (a, b) => ({ text: `The mall parking lot has ${a} spots. ${b} spots are in the garage. The rest are outside. How many spots are outside?`, why: 'Take the garage spots away from all the spots: subtract.' }),
    (a, b) => ({ text: `The bookstore has ${a} books. ${b} books are new. How many books are not new?`, why: 'Take the new books away from all the books: subtract.' }),
    (a, b) => ({ text: `${kid()} wants to collect ${a} stickers. She has ${b} stickers. How many more stickers does she need?`, why: '“How many more does she need” means find the difference: subtract.' }),
    (a, b) => ({ text: `Movie Theatre A has ${b} seats. Movie Theatre B has ${a} seats. How many more seats does Theatre B have than Theatre A?`, why: '“How many more” means compare: subtract the smaller number from the bigger one.' }),
    (a, b) => ({ text: `The shoe store has ${a} pairs of sneakers. The boot store has ${b} fewer pairs than the shoe store. How many pairs does the boot store have?`, why: 'The boot store has <b>fewer</b>, so subtract.' }),
    (a, b) => ({ text: `The flower shop has ${a} yellow tulips. It has ${b} fewer orange tulips. How many orange tulips are there?`, why: '<b>Fewer</b> orange tulips means subtract.' }),
    (a, b) => ({ text: `The craft store used ${a} beads to make keychains and ${b} beads to make bracelets. How many more beads were used for the keychains?`, why: '“How many more” means compare: subtract.' }),
    (a, b) => ({ text: `A tablet costs $${a}. ${pick(['Leo', 'Sam', 'Ethan', 'Malik'])} has saved $${b}. How much more money does he need?`, why: '“How much more does he need” means find the difference: subtract.' }),
    (a, b) => ({ text: `The party store had ${a} balloons. ${b} balloons floated away! How many balloons are left?`, why: 'Some floated away, so subtract.' }),
    (a, b) => ({ text: `${pick(['Leo', 'Max', 'Finn', 'Kai'])} has ${a} arcade tickets. He trades ${b} tickets for a prize. How many tickets does he have left?`, why: 'He used some tickets, so subtract.' }),
    (a, b) => ({ text: `The movie theatre has ${a} seats. ${b} people bought tickets. How many seats are still empty?`, why: 'Take the full seats away from all the seats: subtract.' }),
    (a, b) => ({ text: `A scooter costs $${a}. A skateboard costs $${b}. How much more does the scooter cost?`, why: '“How much more” means find the difference: subtract.' }),
    (a, b) => ({ text: `The pet store had ${a} fish. ${b} fish went to new homes. How many fish are still at the store?`, why: 'Some fish left, so subtract.' }),
  ];

  const choiceBtns = (labels) => `<span class="step-choices">${labels.map((l, i) => `<button class="btn step-choice" data-c="${i}">${l}</button>`).join('')}</span>`;

  // Level 1: the book's method one step at a time, with the money chart.
  function subLesson(a, b, ctx, it) {
    const c = subCols(a, b), { A, B, d } = c, s = a - b, steps = [];
    const st = { counts: { ...A }, taken: { h: 0, t: 0, o: 0 }, marks: newMarks(), fill: [] };
    const push = (x) => { x.before = JSON.parse(JSON.stringify(st)); steps.push(x); };
    const coins = { h: '$100 bills', t: '$10 bills', o: '$1 coins' };
    const asked = {};

    const ask = (p) => {
      const have = st.counts[p], need = B[p];
      if (!need) return;
      asked[p] = true;
      push({
        col: p, text: `<b>Subtract the ${PLACE[p].name}.</b><br>Can you take away ${unit(need, p)} from ${unit(have, p)}?${choiceBtns(['✔ Yes, subtract', '✖ No, regroup'])}`,
        blanks: [], choice: have >= need ? 0 : 1, voice: [`line/sub-enough-${p === 'o' ? 'ones' : 'tens'}`],
        speak: `Subtract the ${PLACE[p].name}. Can you take away ${need} ${PLACE[p].name} from ${have} ${PLACE[p].name}?`,
        hint: `Look at the ${coins[p]} on the chart. There ${have === 1 ? 'is' : 'are'} ${have}. Can you take ${need} away from ${have}?`,
        reveal: have >= need ? `You can take away ${unit(need, p)} from ${unit(have, p)}. No need to regroup!`
          : `${cannot(need, have, p)} So, regroup ${regroupName(p === 'o' ? 't' : 'h', p)}.`,
      });
    };
    const regroup = (from, to, first) => {
      const oldFrom = st.counts[from], oldTo = st.counts[to];
      push({
        col: to,
        text: first
          ? `<b>Regroup the hundreds and tens in ${a}.</b> There are 0 tens, so start with the hundreds! Tap a <b>$100 bill</b> to regroup it as 10 tens.`
          : `<b>Regroup ${regroupName(from, to)} in ${a}.</b> Tap a <b>${PLACE[from].bill}</b> to regroup it as 10 ${PLACE[to].name}.`,
        blanks: [], tap: from, voice: [first ? 'line/sub-trade-zero' : from === 't' ? 'line/sub-trade-ten' : 'line/sub-trade-hundred'],
        speak: `Regroup ${regroupName(from, to)}. Tap a ${PLACE[from].bill} to regroup it as ten ${PLACE[to].name}.`,
        hint: `You need more ${PLACE[to].name}. Which bill is worth 10 ${coins[to]}? Tap one on the chart.`,
        reveal: `Regroup 1 ${PLACE[from].one} as 10 ${PLACE[to].name}: tap a ${PLACE[from].bill}.`,
      });
      st.counts[from]--; st.counts[to] += 10;
      const id1 = `n${from}${steps.length}`, id2 = `n${to}${steps.length}`;
      push({
        col: to,
        text: `${unit(oldFrom, from)} ${unit(oldTo, to)}<br>= ${bx(id1)} ${PLACE[from].name} ${bx(id2)} ${PLACE[to].name}`,
        blanks: [{ id: id1, ans: st.counts[from] }, { id: id2, ans: st.counts[to] }],
        voice: ['line/sub-now'], speak: 'Regroup. What are the missing numbers?',
        hint: `You regrouped 1 ${PLACE[from].one} as 10 ${PLACE[to].name}. So there is 1 ${PLACE[from].one} less, and 10 more ${PLACE[to].name}. Count the chart!`,
        reveal: `${unit(oldFrom, from)} ${unit(oldTo, to)} = ${unit(st.counts[from], from)} ${unit(st.counts[to], to)}. Cross out the ${oldFrom} and write ${st.counts[from]} above it. Write a small 1 in front of the ${oldTo} to make ${st.counts[to]}.`,
      });
      markTrade(st.marks, from, to, st.counts[from]);
    };
    const take = (p) => {
      const have = st.counts[p], need = B[p];
      push({
        col: p, text: `<b>${asked[p] ? 'Subtract.' : `Subtract the ${PLACE[p].name}.`}</b><br>${unit(have, p)} − ${unit(need, p)} = ${bx(`d${p}`)} ${PLACE[p].name}`,
        blanks: [{ id: `d${p}`, ans: d[p] }], voice: [`line/sub-${PLACE[p].name}`], speak: `Subtract the ${PLACE[p].name}.`,
        hint: need === 0 ? `Taking away 0 ${PLACE[p].name} leaves the same number of ${PLACE[p].name}!`
          : `Start at ${have} and count back ${need}. Or cross out ${need} of the ${coins[p]} on the chart and count the rest.`,
        reveal: `${unit(have, p)} − ${unit(need, p)} = ${unit(d[p], p)}.`,
      });
      st.taken[p] = need; st.fill.push(p);
    };

    ask('o');
    if (c.ro) { if (c.zero) regroup('h', 't', true); regroup('t', 'o'); }
    take('o');
    ask('t');
    if (c.rt) regroup('h', 't');
    take('t');
    take('h');
    push({
      text: `So, ${a} − ${b} = ${bx('tot')}.`, blanks: [{ id: 'tot', ans: s }], voice: ['line/sub-total'], speak: 'Now write the answer.',
      hint: `Read the answer row from left to right: hundreds, tens, then ones.${d.h === 0 ? ' There are 0 hundreds, so the answer has only 2 digits.' : ''}`,
      reveal: `${a} − ${b} = ${s}.`,
    });
    push({
      text: `<b>Check!</b> If ${a} − ${b} = ${s}, then ${s} + ${b} should equal ${a}.<br>${s} + ${b} = ${bx('chk')}`,
      blanks: [{ id: 'chk', ans: a }], voice: ['line/sub-check'], speak: 'Check! Add to check your answer.',
      hint: 'Add the ones, then the tens, then the hundreds. Remember to regroup when you add!',
      reveal: `${s} + ${b} = ${a}. The answer is correct!`,
    });
    return {
      kind: 'steps', guided: true, steps, nums: { a, b, s },
      prompt: `${ctx.learn} Subtract one step at a time.`,
      board: (i) => {
        const x = steps[Math.min(i, steps.length - 1)];
        return `${subTicket(a, b, ctx, it)}${subGrid(a, b, { marks: x.before.marks, fill: x.before.fill, hl: x.col })}${subMat(x.before.counts, x.before.taken, !!x.tap && i < steps.length, a)}`;
      },
      explain: workedSub(a, b),
    };
  }

  // Answers with the usual mistakes: forgetting to cross out after regrouping, or taking the
  // smaller digit from the bigger one in every column.
  function subMistakes(a, b) {
    const A = digitsOf(a), B = digitsOf(b), c = subCols(a, b), out = new Set();
    if (c.ro || c.rt) {
      const o = c.ro ? A.o + 10 - B.o : A.o - B.o, t = (c.rt ? A.t + 10 : A.t) - B.t, h = A.h - B.h;
      if (t >= 0 && t < 10 && h >= 0) out.add(h * 100 + t * 10 + o);
      out.add(Math.abs(A.h - B.h) * 100 + Math.abs(A.t - B.t) * 10 + Math.abs(A.o - B.o));
    }
    out.add(a - b + pick([10, -10, 100]));
    return [...out].filter((v) => v > 0 && v !== a - b);
  }

  function subtractQuestion(level) {
    const it = items(1).map(({ emoji, name }) => ({ e: emoji, name }))[0], ctx = pick(SUB_PLACES);

    if (level <= 1) {
      // Lessons 2-4: regroup tens and ones, hundreds and tens, or both. (Zeros are Lesson 5.)
      const { a, b } = genSub(pick(['none', 'ones', 'ones', 'tens', 'tens', 'both', 'both', 'both']), pick([2, 3, 3]));
      return subLesson(a, b, ctx, it);
    }

    const r = Math.random();
    const form = level === 2 ? (r < 0.25 ? 'regroup' : 'own')
      : level === 3 ? (r < 0.3 ? 'story' : r < 0.45 ? 'tf' : r < 0.55 ? 'regroup' : 'own')
        : (r < 0.25 ? 'missing' : r < 0.45 ? 'story' : r < 0.6 ? 'tf' : 'own');
    const kindFor = () => (level <= 2 ? pick(['none', 'ones', 'ones', 'tens', 'tens']) : level === 3 ? pick(['ones', 'tens', 'both', 'both', 'both'])
      : pick(['both', 'both', 'zero', 'zero', 'zero']));

    // "Regroup the tens and ones. What are the missing numbers?" (Let's Practise)
    if (form === 'regroup') {
      let n, D;
      do { n = rand(110, 989); D = digitsOf(n); } while (D.t === 0);
      const H = unit(D.h, 'h'), T = unit(D.t, 't'), O = unit(D.o, 'o');
      const lines = pick([
        [`${n} = ${H} ${T} ${bx('g1')} ones`, `= ${H} ${unit(D.t - 1, 't')} ${bx('g2')} ones`, [D.o, D.o + 10]],
        [`${n} = ${bx('g1')} hundreds ${D.t + 10} tens ${O}`, null, [D.h - 1]],
        [`${n} = ${unit(D.h - 1, 'h')} ${bx('g1')} tens ${O}`, null, [D.t + 10]],
        [`${n} = ${H} ${T} ${bx('g1')} ones`, `= ${H} ${unit(D.t - 1, 't')} ${bx('g2')} ones<br>= ${unit(D.h - 1, 'h')} ${bx('g3')} tens ${bx('g4')} ones`, [D.o, D.o + 10, D.t + 9, D.o + 10]],
      ].filter(([, , ans]) => ans.every((v) => v >= 0)));
      const [l1, l2, ans] = lines;
      const blanks = ans.map((v, i) => ({ id: `g${i + 1}`, ans: v }));
      return {
        kind: 'steps', guided: false, nums: { n }, prompt: 'Regroup. What are the missing numbers? Use the money chart to help you.',
        steps: [{ text: `<div class="regroup-eq">${l1}${l2 ? `<br>${l2}` : ''}</div>`, blanks, voice: ['line/sub-now'], speak: 'Regroup. What are the missing numbers?' }],
        board: () => `${priceTag(n)}${subMat(D, {}, false, n)}`,
        explain: `Regrouping changes how the money is grouped, not how much there is.<br>${n} = ${H} ${T} ${O}<br>= ${H} ${unit(D.t - 1, 't')} ${unit(D.o + 10, 'o')}<br>= ${unit(D.h - 1, 'h')} ${unit(D.t + 10, 't')} ${O}`,
      };
    }

    // True or false? Use addition to check.
    if (form === 'tf') {
      const { a, b, s } = genSub(kindFor(), pick([2, 3, 3]));
      const wrongs = subMistakes(a, b), shown = Math.random() < 0.5 || !wrongs.length ? s : pick(wrongs);
      const [prompt, vk] = variant([
        ['True or false? Use addition to check if the answer is correct.', 'line/sub-tf'],
        ['Is the answer correct? Add to check it.', 'line/sub-tf-2'],
      ]);
      return {
        kind: 'steps', guided: false, nums: { a, b, s, shown }, prompt,
        steps: [{ text: `<div class="tf-eq">${a} − ${b} = ${shown}</div>${choiceBtns(['✔ True', '✖ False'])}`, blanks: [], choice: shown === s ? 0 : 1, voice: [vk], speak: `True or false? ${a} minus ${b} equals ${shown}.` }],
        board: () => `<div class="thinking">🤔</div>`,
        explain: `<b>Check:</b> ${shown} + ${b} = ${shown + b}. ${shown === s ? `That equals ${a}, so it is <b>true</b>. The answer is correct.` : `That is not ${a}, so it is <b>false</b>. The correct answer is ${a} − ${b} = ${s}.`}${workedSub(a, b)}`,
      };
    }

    // Thinking Cap: missing digits.
    if (form === 'missing') {
      const { a, b, s } = genSub(pick(['ones', 'tens', 'both', 'zero']), 3);
      const row = pick(['a', 'b', 'b']), hidden = shuffle(['h', 't', 'o']).slice(0, rand(1, 3));
      const D = digitsOf(row === 'a' ? a : b);
      const [prompt, vk] = variant([
        ['Thinking Cap! What are the missing digits?', 'line/sub-missing'],
        ['Thinking Cap! Some digits rubbed off the gift card. Which digits are missing?', 'line/sub-missing-2'],
        ['Thinking Cap! Find the hidden digits that make the subtraction true.', 'line/sub-missing-3'],
      ]);
      return {
        kind: 'steps', guided: false, nums: { a, b, s, row, hidden }, prompt,
        steps: [{
          text: 'Fill in the missing digits so the subtraction is correct.',
          blanks: ['o', 't', 'h'].filter((p) => hidden.includes(p)).map((p) => ({ id: `${row}${p}`, ans: D[p] })), voice: [vk], speak: prompt,
        }],
        board: () => `<div class="thinking">🧢</div>${subGrid(a, b, { hide: { [row]: hidden }, fill: ['o', 't', 'h'] })}`,
        explain: `${a} − ${b} = ${s}.${workedSub(a, b)}`,
      };
    }

    // Word problems.
    if (form === 'story') {
      const { a, b, s } = genSub(level >= 4 ? pick(['both', 'zero']) : pick(['ones', 'tens', 'both']), pick([2, 3, 3]));
      const story = pick(SUB_STORIES)(a, b);
      return {
        kind: 'steps', guided: false, nums: { a, b, s },
        prompt: '📖 Shopping story. Read it, then solve it.',
        steps: [{ text: `<p class="story">${story.text}</p><div class="story-ans">Answer: ${bx('ans')}</div>`, blanks: [{ id: 'ans', ans: s }], speak: story.text }],
        board: () => '',
        explain: `${story.why}<br>${a} − ${b} = <b>${s}</b>.${workedSub(a, b)}`,
      };
    }

    // On your own: the whole subtraction.
    const kind = kindFor();
    const { a, b, s } = genSub(kind, level <= 2 ? pick([2, 3]) : 3);
    const [prompt, vk, speak] = kind === 'zero' && Math.random() < 0.5
      ? ['Careful, there’s a zero! Subtract and write the answer.', 'line/sub-zero', 'Careful, there is a zero! Subtract, and regroup if you need to.']
      : variant([
        [`${ctx.learn} Subtract and write the answer.`, 'line/sub-own', 'How much is left? Subtract, and remember to regroup when you do not have enough to subtract.'],
        ['Subtract. Remember to regroup when you do not have enough to subtract.', 'line/sub-own-2', 'Subtract. Remember to regroup when you do not have enough to subtract.'],
        ['Write it this way, then subtract. Start with the ones!', 'line/sub-own-3', 'Work it out! Start with the ones, then the tens, then the hundreds.'],
      ]);
    const D = digitsOf(s);
    return {
      kind: 'steps', guided: false, nums: { a, b, s }, prompt,
      steps: [{
        text: 'Write each digit of the answer. You can write your regrouping in the small boxes.',
        blanks: [{ id: 'so', ans: D.o }, { id: 'st', ans: D.t }, { id: 'sh', ans: D.h, zeroOk: D.h === 0 }, { id: 'ro', ans: null, len: 2 }, { id: 'rt', ans: null, len: 2 }, { id: 'rh', ans: null, len: 1 }],
        voice: [vk], speak,
      }],
      board: () => `${subTicket(a, b, ctx, it)}${subGrid(a, b, { input: true })}`,
      explain: workedSub(a, b),
    };
  }

  // ----- Shared "steps" player -----
  function stepsBody(q) {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'].map((k) =>
      `<button class="pad-key" data-k="${k}" aria-label="${k === '⌫' ? 'Delete' : k}">${k}</button>`).join('');
    return `
      <div class="play split steps">
        <div class="q-card">
          <p class="prompt">${q.prompt} ${canSpeak ? '<button class="say" id="sayBtn" aria-label="Read it to me">🔊</button>' : ''}</p>
          ${q.guided ? '<div class="learn-chip">📘 Learn it step by step</div>' : ''}
          <div id="board"></div>
        </div>
        <div class="register-side">
          <div id="stepList" class="step-list"></div>
          <div class="keypad">${keys}<button class="pad-key give" id="checkBtn">Check ✔</button></div>
        </div>
      </div>`;
  }

  function wireSteps() {
    const q = R.q;
    Object.assign(R, { stepIdx: 0, stepTries: 0, miss: false, vals: {}, active: null });
    const step = () => q.steps[R.stepIdx];
    const allBlanks = () => q.steps.slice(0, R.stepIdx + 1).flatMap((s) => s.blanks);
    const lenOf = (id) => { const b = allBlanks().find((x) => x.id === id); return b && b.ans != null ? String(b.ans).length : (b && b.len) || 1; };

    const paint = () => {
      const cur = new Set(step() ? step().blanks.map((b) => b.id) : []);
      screen.querySelectorAll('.bx').forEach((el) => {
        const id = el.dataset.b;
        el.textContent = R.vals[id] || '';
        el.classList.toggle('on', id === R.active);
        el.disabled = R.locked || !cur.has(id);
        el.classList.toggle('done', !cur.has(id));
        el.onclick = () => { if (!el.disabled) { R.active = id; sfx.tap(); paint(); } };
      });
      const s = step(), idle = !!(s && (s.tap || s.choice != null));
      screen.querySelector('.keypad').classList.toggle('idle', idle || R.locked);
    };
    const render = () => {
      $('#board').innerHTML = q.board(R.stepIdx);
      const shown = q.guided ? q.steps.slice(0, R.stepIdx + 1) : [step()];
      $('#stepList').innerHTML = shown.map((s, i) => `<div class="step ${i < R.stepIdx ? 'step-done' : 'step-now'}">${q.guided ? `<span class="step-num">${i < R.stepIdx ? '✔' : i + 1}</span>` : ''}<div>${s.text}</div></div>`).join('');
      const first = step() && step().blanks.find((b) => !R.vals[b.id]);
      R.active = first ? first.id : null;
      // Finished yes/no steps keep showing the right answer.
      screen.querySelectorAll('#stepList .step').forEach((el, i) => {
        const s = shown[i];
        el.querySelectorAll('.step-choice').forEach((btn) => {
          if (i < shown.length - 1 || s !== step()) { btn.disabled = true; btn.classList.toggle('picked', +btn.dataset.c === s.choice); return; }
          btn.onclick = () => {
            if (R.locked) return;
            sfx.tap();
            if (+btn.dataset.c === s.choice) { btn.classList.add('picked'); sfx.coin(); toast(pick(['✔ Yes!', '✔ Great!', '✔ Right!'])); nextStep(); } else { btn.classList.add('nope'); missed([]); }
          };
        });
      });
      screen.querySelectorAll('#board .tap-bill').forEach((btn) => {
        btn.onclick = () => {
          if (R.locked || !step() || !step().tap) return;
          if (btn.dataset.p === step().tap) { btn.classList.add('break'); sfx.coin(); toast('✔ Traded!'); R.locked = true; setTimeout(() => { R.locked = false; nextStep(); }, 450); } else { sfx.tap(); missed([]); }
        };
      });
      paint();
      const now = screen.querySelector('.step-now');
      if (now && q.guided) now.scrollIntoView({ block: 'nearest' });
    };
    const type = (k) => {
      if (R.locked || !R.active) return;
      const v = R.vals[R.active] || '';
      if (k === '⌫') R.vals[R.active] = v.slice(0, -1);
      else if (v.length < lenOf(R.active)) {
        R.vals[R.active] = v + k;
        if (R.vals[R.active].length >= lenOf(R.active)) {
          const next = step().blanks.find((b) => !R.vals[b.id] && b.id !== R.active);
          if (next) R.active = next.id;
        }
      }
      sfx.tap(); paint();
    };
    const finish = (ok) => {
      R.locked = true; paint();
      screen.querySelectorAll('.pad-key').forEach((b) => { b.disabled = true; });
      if (ok) { R.attempts = R.miss ? 1 : 0; onCorrect(); return; }
      if (!R.test) recordResult(R.id, false);
      showFeedback('reveal', `<div class="fb-title">Here's how to solve it 💡</div><div class="fb-body">${q.explain}</div>`);
    };
    const nextStep = () => {
      $('#fb').hidden = true;
      R.stepIdx++; R.stepTries = 0;
      if (R.stepIdx >= q.steps.length) return finish(true);
      render();
      if (S.autoRead || q.guided) say(step().voice, [[step().speak]]);
    };
    const check = () => {
      if (R.locked) return;
      if (step().tap) return toast('Tap a bill on the chart to regroup it!');
      if (step().choice != null) return toast('Tap an answer first!');
      const graded = step().blanks.filter((b) => b.ans != null);
      if (graded.some((b) => !R.vals[b.id] && !b.zeroOk)) return toast('Fill in every box first!');
      const wrong = graded.filter((b) => +(R.vals[b.id] || 0) !== b.ans);
      screen.querySelectorAll('.bx.bad').forEach((el) => el.classList.remove('bad'));
      if (!wrong.length) {
        sfx.coin();
        if (q.guided && R.stepIdx < q.steps.length - 1) toast(pick(['✔ Yes!', '✔ Great!', '✔ Right!']));
        return nextStep();
      }
      missed(wrong);
    };
    // A wrong answer on this step: the first miss gets a hint, the second shows the step (guided) or the solution.
    const missed = (wrong) => {
      const graded = step().blanks.filter((b) => b.ans != null);
      R.miss = true; R.stepTries++;
      sfx.bad();
      const card = screen.querySelector('.play');
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      // A true/false question on your own gets one try.
      if (R.stepTries === 1 && (q.guided || step().choice == null)) {
        if (q.guided) wrong.forEach((b) => { const el = screen.querySelector(`.bx[data-b="${b.id}"]`); if (el) el.classList.add('bad'); });
        const tip = q.guided ? step().hint : 'Not quite. Check your work again.';
        showFeedback('hint', `<div class="fb-title">${q.guided ? pick(['Almost! Here is a tip:', 'Not quite. Think about it like this:']) : 'Not quite!'}</div><div class="fb-body">${tip}</div>`, false);
        return;
      }
      graded.forEach((b) => { R.vals[b.id] = String(b.ans); });
      if (q.guided) {
        R.active = null; R.locked = true; paint(); R.locked = false;
        screen.querySelectorAll('.step-now .step-choice').forEach((el) => { el.disabled = true; el.classList.toggle('picked', +el.dataset.c === step().choice); });
        screen.querySelectorAll('#board .tap-bill').forEach((el) => { el.disabled = true; });
        showFeedback('hint', `<div class="fb-title">Here's that step 💡</div><div class="fb-body">${step().reveal}</div>`, false);
        const fb = $('#fb'), btn = document.createElement('button');
        btn.className = 'btn primary big'; btn.textContent = 'Got it ➜';
        btn.onclick = () => { sfx.tap(); nextStep(); };
        fb.appendChild(btn); btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      finish(false);
    };

    screen.querySelectorAll('.pad-key[data-k]').forEach((b) => { b.onclick = () => type(b.dataset.k); });
    $('#checkBtn').onclick = check;
    R.keyHandler = (e) => {
      if (/^\d$/.test(e.key)) type(e.key);
      else if (e.key === 'Backspace') type('⌫');
      else if (e.key === 'Enter') check();
    };
    if (canSpeak) $('#sayBtn').onclick = () => { const s = step() || q.steps[q.steps.length - 1]; say(s.voice, [[s.speak]]); };
    render();
    if (S.autoRead || q.guided) say(step().voice, [[step().speak]]);
  }

  // ---------- Shop & boutique ----------
  let shopTab = 'fashion';
  // Re-render a screen without jumping back to the top.
  function rerenderKeepScroll(fn) { const y = window.scrollY; fn(); window.scrollTo(0, y); }

  function renderShop() {
    const tabs = [...MERCH_CATS, { id: 'decor', name: 'Decorations', e: '🪴' }, { id: 'walls', name: 'Walls & shelves', e: '🎨' }];
    const buyBtn = (kind, id, cost) => `<button class="btn buy" data-kind="${kind}" data-id="${id}" ${S.coins < cost ? 'disabled' : ''}>🪙 ${cost}</button>`;
    let grid, note;
    if (shopTab === 'decor') {
      note = 'Decorations make your boutique pretty. They are not for sale.';
      grid = DECOR.map((d) => {
        const own = S.owned.includes(d.id);
        return `<div class="shop-item ${own ? 'owned' : ''}"><span class="shop-emoji">${d.e}</span><span class="shop-name">${d.name}</span>
          ${own ? '<span class="owned-chip">✔ Yours</span>' : buyBtn('decor', d.id, d.cost)}</div>`;
      }).join('');
    } else if (shopTab === 'walls') {
      note = 'More shelves means more things to sell!';
      const shelf = S.shelfCount < MAX_SHELVES
        ? `<div class="shop-item"><span class="shop-emoji">🗄️</span><span class="shop-name">Extra shelf</span><small class="sells">+${SLOTS_PER_SHELF} spots · you have ${S.shelfCount}</small>${buyBtn('shelf', 'shelf', shelfCost())}</div>`
        : `<div class="shop-item owned"><span class="shop-emoji">🗄️</span><span class="shop-name">Shelves</span><span class="owned-chip">✔ All ${MAX_SHELVES}!</span></div>`;
      grid = shelf + WALLS.filter((w) => w.cost > 0).map((w) => {
        const own = S.walls.includes(w.id);
        return `<div class="shop-item ${own ? 'owned' : ''}"><span class="swatch wall-${w.id}"></span><span class="shop-name">${w.name} walls</span>
          ${own ? '<span class="owned-chip">✔ Yours</span>' : buyBtn('wall', w.id, w.cost)}</div>`;
      }).join('');
    } else {
      note = 'Buy things for your stockroom, put them on your shelves, then sell them for more coins!';
      grid = MERCH.filter((m) => m.cat === shopTab).map((m) => `<div class="shop-item">
          ${S.inv[m.id] ? `<span class="have-chip">You have ${S.inv[m.id]}</span>` : ''}
          <span class="shop-emoji">${m.e}</span><span class="shop-name">${m.name}</span>
          <small class="sells">Sells for 🪙 ${sellValue(m)}</small>
          ${buyBtn('merch', m.id, m.cost)}</div>`).join('');
    }
    setScreen(`
      <section class="shop">
        <div class="guide">${avatar('lg')}<p class="bubble">You have <b>🪙 ${S.coins}</b> Sparkle Coins. What will you buy?</p></div>
        <div class="shop-tabs" role="tablist">${tabs.map((t) => `<button class="shop-tab ${t.id === shopTab ? 'on' : ''}" data-tab="${t.id}" role="tab" aria-selected="${t.id === shopTab}"><span>${t.e}</span>${t.name}</button>`).join('')}</div>
        <p class="subtle shop-note">${note}</p>
        <div class="shop-grid">${grid}</div>
        <button class="btn primary big center" id="roomBtn">🏠 Go to my boutique</button>
      </section>`, { title: 'Sparkle Shop' });
    screen.querySelectorAll('.shop-tab').forEach((b) => { b.onclick = () => { sfx.tap(); shopTab = b.dataset.tab; renderShop(); }; });
    screen.querySelectorAll('.buy').forEach((b) => {
      b.onclick = () => {
        const { kind, id } = b.dataset;
        const it = kind === 'wall' ? WALLS.find((x) => x.id === id) : kind === 'decor' ? DECOR.find((x) => x.id === id)
          : kind === 'merch' ? MERCH_BY_ID[id] : { name: 'Extra shelf', e: '🗄️', cost: shelfCost() };
        if (S.coins < it.cost) return;
        S.coins -= it.cost;
        if (kind === 'wall') { S.walls.push(id); S.wall = id; }
        else if (kind === 'decor') S.owned.push(id);
        else if (kind === 'merch') S.inv[id] = (S.inv[id] || 0) + 1;
        else { S.shelfCount++; shelves(); }
        save(); sfx.coin();
        if (kind !== 'merch') confetti();
        toast(kind === 'merch' ? `${it.e} <b>${it.name}</b> is in your stockroom! Put it on a shelf to sell it.` : `You bought ${it.e || '🎨'} <b>${it.name}</b>!`);
        rerenderKeepScroll(renderShop);
      };
    });
    $('#roomBtn').onclick = renderRoom;
  }

  function renderRoom() {
    const owned = DECOR.filter((d) => S.owned.includes(d.id));
    const decor = owned.map((d) => `<button class="room-item" data-name="${d.name}" aria-label="${d.name}">${d.e}</button>`).join('');
    const slots = shelves(), stocked = stockedSlots().length;
    const rows = [];
    for (let r = 0; r < S.shelfCount; r++) {
      rows.push(`<div class="shelf">${slots.slice(r * SLOTS_PER_SHELF, (r + 1) * SLOTS_PER_SHELF).map((id, j) => {
        const i = r * SLOTS_PER_SHELF + j, m = id && MERCH_BY_ID[id];
        return m
          ? `<button class="slot full" data-slot="${i}" aria-label="${m.name}, tap to take it off the shelf"><span class="slot-emoji">${m.e}</span><span class="slot-tag">🪙 ${sellValue(m)}</span></button>`
          : `<button class="slot empty" data-slot="${i}" aria-label="Empty shelf spot">+</button>`;
      }).join('')}</div>`);
    }
    const stock = MERCH.filter((m) => inStockroom(m.id) > 0);
    const stockHTML = stock.length
      ? stock.map((m) => `<button class="stock-item" data-id="${m.id}" aria-label="${m.name}"><span>${m.e}</span>${inStockroom(m.id) > 1 ? `<b class="stock-count">×${inStockroom(m.id)}</b>` : ''}<small>${m.name}</small></button>`).join('')
      : '<p class="room-empty">Your stockroom is empty. Buy things in the 🛍️ Sparkle Shop, then put them on your shelves to sell!</p>';
    const walls = WALLS.filter((w) => S.walls.includes(w.id)).map((w) =>
      `<button class="wall-pick ${S.wall === w.id ? 'on' : ''}" data-id="${w.id}"><span class="swatch wall-${w.id}"></span>${w.name}</button>`).join('');
    const lv = levelOf('sell');
    setScreen(`
      <section class="room-wrap">
        <div class="room wall-${S.wall}">
          <div class="room-sign">${avatar('sm')}${escapeHTML(S.name || 'My')}${S.name ? "'s" : ''} Boutique</div>
          ${decor ? `<div class="room-items">${decor}</div>` : ''}
          <div class="shelves">${rows.join('')}</div>
          <div class="room-floor"></div>
        </div>
        <div class="open-row">
          <button class="btn primary big" id="openBtn" ${stocked ? '' : 'disabled'}>🛎️ Open for business!</button>
          <small>${stocked ? `${stocked} item${stocked === 1 ? '' : 's'} on your shelves · ${stars(lv)} ${GAMES.sell.levels[lv].label}` : 'Put items on your shelves to open your store.'}</small>
        </div>
        <h3 class="stock-title">📦 Stockroom</h3>
        <p class="subtle">Tap an item to put it on a shelf. Tap an item on a shelf to take it back off.</p>
        <div class="stockroom">${stockHTML}</div>
        <div class="wall-row">${walls}</div>
        <button class="btn ghost big center" id="shopBtn">🛍️ Go to the Sparkle Shop</button>
      </section>`, { title: 'My Boutique' });
    screen.querySelectorAll('.room-item').forEach((b) => {
      b.onclick = () => { b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce'); sfx.tap(); if (S.sound) speak(b.dataset.name); };
    });
    screen.querySelectorAll('.stock-item').forEach((b) => {
      b.onclick = () => {
        const free = shelves().indexOf(null);
        if (free < 0) return toast(S.shelfCount < MAX_SHELVES ? 'Your shelves are full! Buy another shelf in the Sparkle Shop.' : 'Your shelves are full! Sell some things first.');
        S.shelves[free] = b.dataset.id; save(); sfx.coin();
        rerenderKeepScroll(renderRoom);
      };
    });
    screen.querySelectorAll('.slot').forEach((b) => {
      b.onclick = () => {
        const i = +b.dataset.slot;
        if (!S.shelves[i]) return toast(stock.length ? 'Tap something in your stockroom to put it here.' : 'Buy things in the Sparkle Shop to fill your shelves!');
        S.shelves[i] = null; save(); sfx.tap();
        rerenderKeepScroll(renderRoom);
      };
    });
    screen.querySelectorAll('.wall-pick').forEach((b) => { b.onclick = () => { S.wall = b.dataset.id; save(); rerenderKeepScroll(renderRoom); }; });
    $('#openBtn').onclick = () => { sfx.fanfare(); startSelling(); };
    $('#shopBtn').onclick = renderShop;
  }

  // ---------- Open for Business: making change ----------
  const CUSTOMERS = [['👩', 'Mia'], ['👧', 'Ava'], ['👵', 'Grandma Rose'], ['👨', 'Mr. Lee'], ['🧒', 'Sam'], ['👦', 'Leo'],
    ['👩‍🦰', 'Ruby'], ['🧕', 'Amira'], ['👱‍♀️', 'Lily'], ['👩‍🦳', 'Mrs. Green'], ['🧑', 'Jordan'], ['👸', 'Princess Pearl'],
    ['👴', 'Grandpa Joe'], ['👩‍🦱', 'Zoe'], ['👨‍🦰', 'Mr. Fox'], ['👧🏽', 'Maya'], ['👦🏻', 'Ethan'], ['👩🏾', 'Nia'],
    ['🧑‍🍳', 'Chef Marco'], ['👮‍♀️', 'Officer Kim'], ['👩‍🚀', 'Astronaut Ally'], ['🧙', 'Wizard Wes'], ['🧚', 'Fairy Fern'], ['🤴', 'Prince Max'],
    ['👩‍🎨', 'Artist Ana'], ['👨‍🏫', 'Mr. Patel'], ['👩‍⚕️', 'Dr. Rivera'], ['🧑‍🎤', 'Rockstar Riley'], ['👱', 'Chloe'], ['👦🏾', 'Malik'],
    ['👧🏻', 'Emma'], ['👨‍🦳', 'Mr. Brown'], ['🧝‍♀️', 'Elf Ivy'], ['🦸‍♀️', 'Super Sadie'], ['🐻', 'Bear Buddy'], ['🐼', 'Panda Pip'],
    ['🦊', 'Foxy Finn'], ['🐰', 'Bunny Bea'], ['🐸', 'Frog Fred'], ['🐨', 'Koala Kai']];
  // What customers say: [text before the items, text after, voice key]. The price always comes last.
  const GREETINGS = {
    1: [["Hi! I'd like the", 'please.', 'line/sell-1'], ['Hello! Can I buy the', 'please?', 'line/sell-1b'], ["I'll take the", 'thank you!', 'line/sell-1c']],
    2: [["Hi! I'd like the", 'please.', 'line/sell-2'], ['Hello! Can I buy the', 'please?', 'line/sell-2b'], ["I'll take the", 'thank you!', 'line/sell-2c']],
  };

  // Jumps for counting up from the price to the money paid: to the next ten, the next hundred, then the rest.
  function countUpSteps(from, to) {
    const steps = [];
    let cur = from;
    const jump = (next) => { if (next > cur && next <= to) { steps.push([cur, next]); cur = next; } };
    if (cur % 10) jump(Math.ceil(cur / 10) * 10);
    if (cur % 100) jump(Math.ceil(cur / 100) * 100);
    jump(to);
    return steps;
  }
  const columnSub = (a, b) => `<div class="colsub"><div>${a}</div><div>− ${b}</div><div class="line">${a - b}</div></div>`;
  const CASH = { 20: 'c20', 50: 'c50', 100: 'c100', 500: 'c500', 1000: 'c1000' };
  const cashBill = (v) => `<span class="cash ${CASH[v] || 'c100'}"><span>${money(v)}</span></span>`;

  function changeQuestion(level) {
    let slots = stockedSlots();
    if (!slots.length) slots = [[pick(MERCH).id, -1]]; // nothing stocked (e.g. automated checks)
    const two = level >= 3 && slots.length >= 2 && Math.random() < 0.4;
    const items = shuffle(slots).slice(0, two ? 2 : 1).map(([id, slot]) => ({ m: MERCH_BY_ID[id], slot }));
    let prices, paid;
    if (two) {
      const a = rand(105, 450), b = rand(21, Math.min(399, 950 - a));
      prices = [a, b];
      paid = a + b < 500 ? pick([500, 1000]) : 1000;
    } else if (level <= 1) {
      paid = pick([20, 50, 50]);
      prices = [paid === 20 ? rand(11, 19) : rand(21, 49)];
    } else if (level === 2) {
      if (Math.random() < 0.45) { prices = [rand(12, 99)]; paid = 100; } else {
        prices = [rand(101, 899)];
        paid = Math.ceil(prices[0] / 100) * 100;
        if (paid === prices[0]) paid += 100;
      }
    } else {
      prices = [rand(101, 989)];
      paid = prices[0] < 500 ? pick([500, 1000]) : 1000;
    }
    const total = prices.reduce((x, y) => x + y, 0), answer = paid - total;
    const [ce, cname] = pick(CUSTOMERS);
    const steps = countUpSteps(total, paid);
    const jumps = `<div class="jumps">${steps.map(([a, b]) => `<span class="jump">${money(a)} → ${money(b)} <b>+${money(b - a)}</b></span>`).join('')}</div>`;
    const totalLine = two ? `First add: ${money(prices[0])} + ${money(prices[1])} = <b>${money(total)}</b>.<br>` : '';
    const wants = items.map((it) => `${it.m.e} <b>${it.m.name.toLowerCase()}</b>`).join(' and the ');
    const [before, after, vk] = pick(GREETINGS[two ? 2 : 1]);
    return {
      kind: 'change', items, prices, total, paid, answer, customer: [ce, cname],
      wantsHTML: `${before} ${wants}, ${after} Here's <b>${money(paid)}</b>.`,
      speak: `${before} ${items.map((it) => it.m.name).join(' and the ')}, ${after} Here's ${paid} dollars. How much change do I get?`,
      voice: [vk, `p/${paid}`],
      hintSteps: two
        ? `Two things! First add ${money(prices[0])} + ${money(prices[1])}. Then count up from your total to ${money(paid)}: to the next ten, then the next hundred, then to ${money(paid)}.`
        : `Count up from the price: ${[total, ...steps.map(([, b]) => b)].map(money).join(' → ')}. How much did you add in all?`,
      explain: `${totalLine}Count up from ${money(total)} to ${money(paid)}:${jumps}${steps.map(([a, b]) => b - a).join(' + ')} = <b>${money(answer)}</b> change.`,
      work: columnSub(paid, total),
    };
  }

  function changeBody(q) {
    const [ce, cname] = q.customer;
    const itemsHTML = q.items.map((it, i) => `<div class="sale-item"><span class="sale-emoji">${it.m.e}</span>${priceTag(q.prices[i])}</div>`)
      .join('<span class="sale-plus">+</span>');
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'].map((k) =>
      `<button class="pad-key" data-k="${k}" aria-label="${k === '⌫' ? 'Delete' : k}">${k}</button>`).join('');
    return `
      <div class="play split sell">
        <div class="q-card">
          <div class="customer"><span class="cust-emoji" aria-label="${cname}">${ce}</span>
            <p class="bubble cust-bubble"><small>${cname}</small>${q.wantsHTML}${canSpeak ? ' <button class="say" id="sayBtn" aria-label="Read it to me">🔊</button>' : ''}</p></div>
          <div class="sale-row">
            <div class="sale-items">${itemsHTML}</div>
            <div class="paid"><small>${cname} pays</small>${cashBill(q.paid)}</div>
          </div>
        </div>
        <div class="register-side">
          <p class="prompt">How much change do you give back?</p>
          <div class="change-box"><span class="cb-display" id="cbDisplay">$<span id="cbDigits"></span><span class="cb-cursor">▌</span></span></div>
          <div class="keypad">${keys}<button class="pad-key give" id="giveBtn">Give change ✔</button></div>
        </div>
      </div>`;
  }

  // Take sold items off the shelves.
  function sellItems(q) {
    for (const it of q.items) {
      if (it.slot < 0 || S.shelves[it.slot] !== it.m.id) continue;
      S.shelves[it.slot] = null;
      S.inv[it.m.id] = Math.max(0, (S.inv[it.m.id] || 0) - 1);
      if (!S.inv[it.m.id]) delete S.inv[it.m.id];
    }
    save();
  }
  const saleValue = (q) => q.items.reduce((a, it) => a + sellValue(it.m), 0);
  const saleCost = (q) => q.items.reduce((a, it) => a + it.m.cost, 0);

  function wireChange() {
    const q = R.q;
    R.typed = '';
    const draw = () => { $('#cbDigits').textContent = R.typed; };
    const add = (k) => {
      if (R.locked) return;
      if (k === '⌫') R.typed = R.typed.slice(0, -1);
      else if (R.typed.length < 4) R.typed = (R.typed + k).replace(/^0+(?=\d)/, '');
      sfx.tap(); draw();
    };
    const give = () => {
      if (R.locked) return;
      if (!R.typed) return toast('Type the change on the keypad first!');
      const typed = +R.typed;
      if (typed === q.answer) {
        sellItems(q);
        q.payout = (first) => saleValue(q) + (first ? 2 : 0);
        lockChange(); onCorrect();
        return;
      }
      const dir = typed > q.answer ? 'That is too much change. 😮' : 'That is not enough change.';
      const revealed = onWrong(`${dir} ${q.hintSteps}`, {
        title: `Here's how to make change 💡`,
        body: `You gave ${money(typed)}. ${q.explain}${q.work}<br>🛍️ ${q.customer[1]} still bought it. You got your 🪙 ${saleCost(q)} back.`,
      });
      if (revealed) {
        sellItems(q);
        S.coins += saleCost(q); R.coins += saleCost(q); save();
        R.typed = String(q.answer); draw();
        lockChange();
      } else { R.typed = ''; draw(); }
    };
    screen.querySelectorAll('.pad-key[data-k]').forEach((b) => { b.onclick = () => add(b.dataset.k); });
    $('#giveBtn').onclick = give;
    R.keyHandler = (e) => {
      if (/^\d$/.test(e.key)) add(e.key);
      else if (e.key === 'Backspace') add('⌫');
      else if (e.key === 'Enter') give();
    };
    if (canSpeak) $('#sayBtn').onclick = () => say(q.voice, [[q.speak]]);
    if (S.autoRead) say(q.voice, [[q.speak]]);
  }

  function lockChange() {
    screen.querySelectorAll('.pad-key').forEach((b) => { b.disabled = true; });
    const cur = screen.querySelector('.cb-cursor');
    if (cur) cur.remove();
  }

  function startSelling() {
    const n = stockedSlots().length;
    if (!n) { toast('Put some items on your shelves first!'); return renderRoom(); }
    startRound('sell');
  }

  // ---------- Grown-ups ----------
  function renderParentGate() {
    const a = rand(6, 9), b = rand(6, 9);
    setScreen(`
      <section class="gate">
        <h2>🔒 Grown-ups only</h2>
        <p>What is ${a} × ${b}?</p>
        <input id="gateInput" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off">
        <button class="btn primary big" id="gateBtn">Enter</button>
      </section>`, { title: 'Grown-ups' });
    const check = () => {
      if (+$('#gateInput').value === a * b) renderParent();
      else { toast('Not quite, ask a grown-up!'); renderMall(); }
    };
    $('#gateBtn').onclick = check;
    $('#gateInput').onkeydown = (e) => { if (e.key === 'Enter') check(); };
  }

  function renderParent() {
    const rows = ALL_IDS.map((id) => {
      const g = GAMES[id], st = S.stats[id] || { right: 0, total: 0 };
      const pct = st.total ? Math.round((st.right / st.total) * 100) : null;
      const bar = pct === null ? '<span class="subtle">Not played yet</span>'
        : `<div class="bar"><span style="width:${pct}%" class="${pct >= 80 ? 'ok' : pct >= 60 ? 'mid' : 'low'}"></span></div><span class="pct">${pct}%</span>`;
      return `<tr>
        <td><b>${g.emoji} ${g.name}</b><br><small>${g.skill}</small></td>
        <td class="bar-cell">${bar}<small>${st.right}/${st.total} first try</small></td>
        <td><select data-id="${id}" aria-label="Level for ${g.name}">${Array.from({ length: maxLevel(id) }, (_, i) => i + 1).map((l) => `<option value="${l}" ${levelOf(id) === l ? 'selected' : ''}>${l}: ${levelInfo(id, l).label}</option>`).join('')}</select></td>
      </tr>`;
    }).join('');
    setScreen(`
      <section class="parent">
        <h2>Progress report</h2>
        <p class="subtle">App version ${APP_VERSION}</p>
        <p class="subtle">Accuracy counts only answers that were right on the first try. Each store levels up after 5 first-try answers in a row and steps back down after 3 misses in a row. You can also set the level yourself.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Store</th><th>First-try accuracy</th><th>Level</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
        <h3>Spelling words</h3>
        <p class="subtle">One word per line. You can add a sentence after a <b>|</b> so the game can say it the way the teacher will, e.g. <code>light | Turn on the light, please.</code></p>
        <div class="word-scores">${spellWords().map((w) => { const st = S.spell[w.word.toLowerCase()]; return `<span class="word-chip ${!st ? '' : st.right === st.total ? 'ok' : st.right / st.total >= 0.5 ? 'mid' : 'low'}">${escapeHTML(w.word)} <small>${st ? `${st.right}/${st.total}` : '–'}</small></span>`; }).join('')}</div>
        <textarea id="wordList" rows="8" spellcheck="false">${escapeHTML(spellWords().map((w) => (w.sentence ? `${w.word} | ${w.sentence}` : w.word)).join('\n'))}</textarea>
        <div class="actions left">
          <button class="btn" id="saveWords">Save word list</button>
          <button class="btn ghost" id="defaultWords">Use this week's list</button>
        </div>
        <h3>Settings</h3>
        <label class="toggle"><input type="checkbox" id="optSound" ${S.sound ? 'checked' : ''}> Sound effects</label>
        ${canSpeak ? `<label class="toggle"><input type="checkbox" id="optRead" ${S.autoRead ? 'checked' : ''}> Read every question out loud automatically</label>` : ''}
        <label class="field">Player name <input id="optName" maxlength="16" value="${escapeHTML(S.name)}"></label>
        <div class="actions">
          <button class="btn primary" id="doneBtn">Save & back to the mall</button>
          <button class="btn danger" id="resetBtn">Reset all progress</button>
        </div>
      </section>`, { title: 'Grown-ups' });
    screen.querySelectorAll('select').forEach((s) => { s.onchange = () => { S.levels[s.dataset.id] = +s.value; S.streaks[s.dataset.id] = 0; save(); }; });
    $('#saveWords').onclick = () => {
      const list = $('#wordList').value.split('\n').map((line) => line.split('|')).map(([w, s]) => [(w || '').trim(), (s || '').trim()])
        .filter(([w]) => /^[a-zA-Z]+$/.test(w)).slice(0, 40);
      if (!list.length) return toast('Type at least one word (letters only).');
      S.spellList = list; save(); toast(`Saved ${list.length} spelling words.`); renderParent();
    };
    $('#defaultWords').onclick = () => { S.spellList = null; save(); renderParent(); };
    $('#optSound').onchange = (e) => { S.sound = e.target.checked; save(); };
    if (canSpeak) $('#optRead').onchange = (e) => { S.autoRead = e.target.checked; save(); };
    $('#doneBtn').onclick = () => { S.name = $('#optName').value.trim().slice(0, 16); save(); renderMall(); };
    $('#resetBtn').onclick = () => {
      if (!confirm('Erase all coins, purchases and progress?')) return;
      S = fresh(); save(); renderWelcome();
    };
  }

  // ---------- Boot ----------
  $('#homeBtn').onclick = () => { sfx.tap(); renderMall(); };
  $('#soundBtn').onclick = () => { S.sound = !S.sound; save(); if (S.sound) sfx.tap(); };
  $('#coinPill').onclick = () => renderShop();
  $('#avatarBtn').onclick = () => { sfx.tap(); renderRoom(); };

  // Loading screen: a tap also unlocks sound on iPad.
  const splash = $('#splash');
  const closeSplash = () => {
    if (splash.classList.contains('out')) return;
    audio(); if (S.sound) sfx.fanfare();
    splash.classList.add('out');
    setTimeout(() => splash.remove(), 500);
  };
  splash.onclick = closeSplash;
  splash.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') closeSplash(); };
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ } }
  document.addEventListener('keydown', (e) => {
    if (!R || !R.q || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if ((R.q.kind === 'spell' && $('#bracelet')) || (R.q.kind === 'change' && $('#cbDigits')) || (R.q.kind === 'steps' && $('#checkBtn'))) R.keyHandler(e);
  });

  if (S.started || S.name) renderMall(); else renderWelcome();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {}));
    // When a newer version takes over, reload right away if she's still on the loading screen.
    if (navigator.serviceWorker.controller) {
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        if ($('#splash')) { reloading = true; location.reload(); } else toast('✨ The game was updated! Close and reopen it to see what\'s new.');
      });
    }
  }

  // Exposed for automated checks of the question generators.
  window.__PVB = { GAMES, words, price, MERCH_BY_ID, get round() { return R; } };
})();
