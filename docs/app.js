'use strict';
(() => {
  const APP_VERSION = '7 (Oct 3, 2026)';

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
  const item = () => { const [emoji, name] = pick(ITEMS); return { emoji, name }; };

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

  const GAMES = {
    register: {
      name: 'Cash Register', emoji: '💳', color: 'pink',
      skill: 'Build prices with $100s, $10s and $1s',
      make(level) {
        const n = price(level), it = item();
        return {
          kind: 'register', n, item: it,
          prompt: `Pay <b>exactly</b> ${money(n)} for the ${it.name}.`,
          speak: `Pay exactly ${n} dollars for the ${it.name}.`, voice: ['line/register', `p/${n}`],
          explain: `${money(n)} = ${placesFor(n).map((p) => unit(digitsOf(n)[p], p)).join(', ')}.`,
        };
      },
    },

    detective: {
      name: 'Price Tag Detective', emoji: '🔍', color: 'purple',
      skill: 'What is each digit worth?',
      make(level) {
        const n = price(level), d = digitsOf(n), places = placesFor(n);
        if (Math.random() < 0.6) {
          const p = pick(places.filter((q) => d[q] > 0)), dig = d[p], val = dig * PLACE[p].mult;
          return {
            kind: 'mc', visual: priceTag(n, p),
            prompt: `What is the <span class="hl-${p} hl-inline">${dig}</span> in ${money(n)} worth?`,
            speak: `In the price ${n} dollars, what is the highlighted ${dig} worth?`, voice: [`line/det-worth-${dig}`],
            choices: shuffle([dig, dig * 10, dig * 100]).map((v) => ({ value: v, label: money(v) })),
            answer: val,
            hint: `Which place is the ${dig} in? Check the chart:${pvChart(n, p)}`,
            explain: `The ${dig} is in the <b>${PLACE[p].name}</b> place, so it's worth ${unit(dig, p)} = <b>${money(val)}</b>.`,
          };
        }
        const p = pick(places), ans = d[p];
        const set = new Set([ans, ...places.map((q) => d[q])]);
        while (set.size < 4) set.add(rand(0, 9));
        return {
          kind: 'mc', visual: priceTag(n),
          prompt: `Which digit is in the <b>${PLACE[p].name}</b> place?`,
          speak: `In the price ${n} dollars, which digit is in the ${PLACE[p].name} place?`, voice: [`line/det-place-${p}`],
          choices: shuffle([...set]).map((v) => ({ value: v, label: String(v) })),
          answer: ans, big: true,
          hint: `From left to right the places go ${places.map((q) => PLACE[q].name).join(', ')}.`,
          explain: `${pvChart(n, p)}The ${PLACE[p].name} digit is <b>${ans}</b>.`,
        };
      },
    },

    tagmaker: {
      name: 'Tag Maker', emoji: '🏷️', color: 'teal',
      skill: 'Word form, expanded form & standard form',
      make(level) {
        let n;
        do { n = price(level); } while (expParts(n).length < 2);
        const d = digitsOf(n), three = n >= 100, type = pick(['w2s', 's2e', 'e2s']);
        const exp = joinParts(expParts(n));
        const expFull = `${exp} = ${money(n)}`;
        if (type === 'w2s') {
          const cands = three
            ? [d.h * 100 + d.o * 10 + d.t, d.h * 1000 + d.t * 10 + d.o, d.o * 100 + d.t * 10 + d.h, n + pick([100, -10, 10])]
            : [d.o * 10 + d.t, d.t * 100 + d.o, n + pick([10, -10]), d.t + d.o];
          return {
            kind: 'mc', visual: `<div class="word-tag">“${words(n)} dollars”</div>`,
            prompt: 'The shopper read the price out loud. Which tag matches?',
            speak: `The shopper said: ${words(n)} dollars. Which tag matches?`, voice: ['line/tag-w2s', `p/${n}`],
            choices: numChoices(n, cands), answer: n, tags: true,
            hint: three ? `“${words(n).split(' hundred')[0]} hundred” goes in the hundreds place. Then look at the tens and ones.` : 'The first word tells you the tens. The last word tells you the ones.',
            explain: `“${words(n)}” = ${expFull}.`,
          };
        }
        if (type === 's2e') {
          const cands = three
            ? [joinParts([d.h, d.t, d.o]), joinParts([d.h * 100, d.t, d.o]), joinParts([d.h * 10, d.t * 10, d.o]), joinParts([d.h * 100, d.t * 100, d.o]), joinParts([d.h * 100, d.o * 10, d.t])]
            : [joinParts([d.t, d.o]), joinParts([d.t * 100, d.o]), joinParts([d.t * 10, d.o * 10]), joinParts([d.o * 10, d.t])];
          return {
            kind: 'mc', visual: priceTag(n),
            prompt: `Stretch it out! Which shows ${money(n)} in <b>expanded form</b>?`,
            speak: `Which shows ${n} in expanded form?`, voice: ['line/tag-s2e', `p/${n}`],
            choices: strChoices(exp, cands), answer: exp,
            hint: `Find what each digit is worth:${pvChart(n)}`,
            explain: `${pvChart(n)}${expFull}`,
          };
        }
        const cands = [parseInt(expParts(n).join(''), 10), parseInt(String(n).replace(/0/g, ''), 10),
          three ? d.h * 100 + d.o * 10 + d.t : d.o * 10 + d.t, three ? d.h * 1000 + d.t * 10 + d.o : d.t * 100 + d.o];
        return {
          kind: 'mc', visual: `<div class="word-tag exp">${exp}</div>`,
          prompt: 'The cashier added up the money like this. What is the price?',
          speak: `The cashier added ${expParts(n).join(' plus ')}. What is the price?`, voice: ['line/tag-e2s'],
          choices: numChoices(n, cands), answer: n, tags: true,
          hint: 'Put each part in its place on the chart, then read the digits.',
          explain: `${pvChart(n)}${expFull}`,
        };
      },
    },

    bestdeal: {
      name: 'Best Deal', emoji: '⚖️', color: 'yellow',
      skill: 'Compare prices with &lt;, &gt; and =',
      make(level) {
        const a = price(level);
        if (Math.random() < 0.5) {
          const b = closeTo(a, level), itA = item();
          let itB; do { itB = item(); } while (itB.name === itA.name);
          const wantLess = Math.random() < 0.5, ans = (wantLess ? a < b : a > b) ? 0 : 1;
          const card = (it, p) => `<span class="deal-emoji">${it.emoji}</span><span class="deal-name">${it.name}</span>${priceTag(p)}`;
          return {
            kind: 'mc', layout: 'deal',
            prompt: `Which one costs <b>${wantLess ? 'less' : 'more'}</b>?`,
            speak: `Which one costs ${wantLess ? 'less' : 'more'}? The ${itA.name} for ${a} dollars, or the ${itB.name} for ${b} dollars?`,
            voice: [wantLess ? 'line/deal-less' : 'line/deal-more'],
            choices: [{ value: 0, label: card(itA, a) }, { value: 1, label: card(itB, b) }],
            answer: ans,
            hint: 'Start with the biggest place. Compare the hundreds first, then the tens, then the ones.',
            explain: compareExplain(a, b),
          };
        }
        const b = Math.random() < 0.12 ? a : closeTo(a, level);
        const ans = a < b ? '<' : a > b ? '>' : '=';
        return {
          kind: 'mc',
          visual: `<div class="compare-row">${priceTag(a)}<span class="compare-q">?</span>${priceTag(b)}</div>`,
          prompt: 'Pick the sign that makes it true.',
          speak: `Is ${a} dollars less than, greater than, or equal to ${b} dollars?`, voice: ['line/deal-sign'],
          choices: [
            { value: '<', label: '<span class="sym">&lt;</span><small>less than</small>' },
            { value: '=', label: '<span class="sym">=</span><small>equal to</small>' },
            { value: '>', label: '<span class="sym">&gt;</span><small>greater than</small>' },
          ],
          answer: ans,
          hint: 'The open side of the sign faces the bigger number, like a hungry alligator! 🐊 Compare hundreds, then tens, then ones.',
          explain: compareExplain(a, b),
        };
      },
    },

    roundit: {
      name: 'Round-It Sale', emoji: '🎯', color: 'orange',
      skill: 'Round to the nearest 10 or 100',
      make(level) {
        let n, to;
        if (level <= 1) { to = 10; do { n = rand(11, 99); } while (n % 10 === 0); }
        else if (level === 2) { to = pick([10, 100]); do { n = rand(101, 999); } while (n % to === 0); }
        else {
          to = pick([10, 100]);
          const r = Math.random();
          if (to === 10) n = r < 0.4 ? rand(10, 99) * 10 + 5 : r < 0.6 ? rand(991, 999) : rand(101, 999);
          else n = r < 0.4 ? rand(1, 9) * 100 + 50 + rand(0, 9) : r < 0.6 ? rand(951, 999) : rand(101, 999);
          if (n % to === 0) n += 1;
        }
        const low = Math.floor(n / to) * to, high = low + to, mid = low + to / 2, ans = n >= mid ? high : low;
        const other = to === 10 && n >= 100 ? Math.round(n / 100) * 100 : (low - to > 0 ? low - to : high + to);
        const it = item(), place = to === 10 ? 'ten' : 'hundred';
        return {
          kind: 'mc', visual: numberLine(n, low, high),
          prompt: `The ${it.emoji} ${it.name} costs ${money(n)}. Round it to the nearest <b>${place}</b>.`,
          speak: `The ${it.name} costs ${n} dollars. Round it to the nearest ${place}.`, voice: [`line/round-${to}`, `p/${n}`],
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
          ];
          if (level >= 2) {
            const k = rand(2, 9);
            facts.push([`How many $10 bills make ${money(k * 100)}?`, k * 10, `Each $100 is 10 tens, so ${k} hundreds = ${k * 10} tens.`, `fact-tens-${k}`]);
            facts.push(['How many $1 coins make $100?', 100, '10 tens = 100 ones.', 'fact-ones-100']);
          }
          if (level >= 3) facts.push(['How many $10 bills make $1,000?', 100, '1,000 is 10 hundreds, and each hundred is 10 tens, so that is 100 tens!', 'fact-1000']);
          const [q, ans, why, vkey] = pick(facts);
          return {
            kind: 'mc', visual: '<div class="machine">🏦 ⇄ 💵</div>', prompt: q, speak: q.replace(/\$/g, ''), voice: [`line/${vkey}`],
            choices: numChoices(ans, [ans / 10, ans * 10, ans + 1, ans - 1], String, 4), answer: ans, big: true,
            hint: 'Think about 10 of the smaller one making 1 of the bigger one.', explain: why,
          };
        }
        if (r < 0.6) {
          let c;
          if (level <= 1) c = { h: 0, t: rand(1, 7), o: rand(10, 18) };
          else if (level === 2) c = { h: rand(1, 7), t: rand(10, 16), o: rand(0, 9) };
          else c = { h: rand(1, 6), t: rand(10, 15), o: rand(10, 15) };
          const total = c.h * 100 + c.t * 10 + c.o, places = c.h ? ['h', 't', 'o'] : ['t', 'o'];
          const cands = [parseInt(places.map((p) => c[p]).join(''), 10), c.h + c.t + c.o,
            c.h * 100 + (c.t % 10) * 10 + (c.o % 10), total + pick([10, -10, 100])];
          return {
            kind: 'mc', visual: matHTML(c, places),
            prompt: 'Look at all this money in the piggy bank! How much is it?',
            speak: 'Look at the money in the piggy bank. How much is it altogether?', voice: ['line/regroup-count'],
            choices: numChoices(total, cands), answer: total, tags: true,
            hint: 'Watch out! There are more than 9 in a column. Trade 10 of them for 1 of the next bigger place.',
            explain: `${places.map((p) => unit(c[p], p)).join(' + ')} = ${places.map((p) => c[p] * PLACE[p].mult).join(' + ')} = <b>${money(total)}</b>.`,
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
        return {
          kind: 'mc', visual: `${priceTag(n)}<div class="word-tag eq">= ${line}</div>`,
          prompt: 'Break one bill into smaller ones. What goes in the box?',
          speak: q, voice: ['line/regroup-break'], choices: numChoices(ans, cands, String), answer: ans, big: true,
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
  const GAME_IDS = Object.keys(GAMES).filter((id) => !GAMES[id].featured && !GAMES[id].hidden);
  const ALL_IDS = ['spelling', ...GAME_IDS, 'sell'];
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
  const DEFAULT = { started: false, name: '', coins: 0, levels: {}, streaks: {}, stats: {}, owned: [], walls: ['pink'], wall: 'pink', sound: true, autoRead: false, spell: {}, spellList: null, inv: {}, shelves: [], shelfCount: 2 };
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
    for (const [text, rate] of parts) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = rate || 0.9; u.pitch = 1.1;
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
        <span class="store-level" aria-label="Level ${lv}">${stars(lv)} <small>${LEVELS[lv].short}</small></span>
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
    setScreen(`
      <section class="mall">
        <div class="guide">${avatar('lg')}<p class="bubble">Hi${S.name ? ' ' + escapeHTML(S.name) : ''}! Pick a store to play. 👋</p></div>
        ${featured}
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
    if (R.index >= R.len || (R.id === 'sell' && !stockedSlots().length)) return R.test ? renderTestEnd() : renderRoundEnd();
    R.q = R.test ? spellQuestion(R.order[R.index], false) : GAMES[R.id].make(levelOf(R.id));
    if (R.q.w) R.used.push(R.q.w.word);
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
      const places = q.n >= 100 || lv >= 2 ? ['h', 't', 'o'] : ['t', 'o'];
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
    } else {
      const cls = q.layout === 'deal' ? 'choices deal' : `choices ${q.big ? 'big' : ''} ${q.tags ? 'tags' : ''} n${q.choices.length}`;
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
    if (canSpeak) $('#sayBtn').onclick = () => say(q.voice, [[q.speak]]);
    if (q.kind === 'register') wireRegister();
    else screen.querySelectorAll('.choice').forEach((b) => { b.onclick = () => answerMC(b, q.choices[+b.dataset.i].value); });
    if (S.autoRead) say(q.voice, [[q.speak]]);
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
        if (R.counts[b.dataset.p] >= 19) return toast('That column is full!');
        R.counts[b.dataset.p]++; sfx.coin(); redraw();
      };
    });
    $('#clearBtn').onclick = () => { if (R.locked) return; R.counts = { h: 0, t: 0, o: 0 }; redraw(); };
    $('#payBtn').onclick = () => {
      if (R.locked) return;
      const paid = R.counts.h * 100 + R.counts.t * 10 + R.counts.o, n = R.q.n, d = digitsOf(n);
      if (paid === n) { onCorrect(); lockRegister(); return; }
      const need = placesFor(n).map((p) => unit(d[p], p)).join(', ');
      const paidMsg = `You paid <b>${money(paid)}</b>. That's ${paid < n ? 'not enough' : 'too much'}.`;
      const revealed = onWrong(`${paidMsg} ${money(n)} needs ${need}.${pvChart(n)}`, {
        title: `Here's how to pay ${money(n)} 💡`,
        body: `${paidMsg} Now the counter shows the right money: <b>${need}</b>.`,
      });
      if (revealed) {
        R.counts = { h: d.h, t: d.t, o: d.o };
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
    if (String(value) === String(R.q.answer)) {
      btn.classList.add('correct');
      onCorrect();
    } else {
      btn.classList.add('wrong');
      btn.disabled = true;
      if (onWrong(R.q.hint)) {
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
  const SPELL_DEFAULT = [
    ['pi[tch]', 'At the mall concert, the singer hit a high pitch.', 'After a short vowel, the “ch” sound is spelled <b>t-c-h</b>.'],
    ['dri[nk]', 'I bought a cold drink at the food court.', 'Stretch it out: d-r-i-n-k. It ends with <b>n-k</b>.'],
    ['sw[i]m', 'I need a new suit to swim in this summer.', 'Stretch it out: s-w-i-m. The <b>i</b> is short, like in “him”.'],
    ['l[i]f[e]', 'This is the best shopping trip of my life!', 'The silent <b>e</b> at the end makes the <b>i</b> say its name.'],
    ['[wh][i]l[e]', 'Wait here while I try on these shoes.', 'It starts with <b>w-h</b>, and the silent <b>e</b> makes the <b>i</b> say its name.'],
    ['[I]', 'I love the sparkly store at the mall.', 'When <b>I</b> means me, it is always one capital letter.'],
    ['m[y]', 'My bag is full of new clothes.', 'The <b>y</b> at the end says “i”, like in why and try.'],
    ['t[igh]t', 'These jeans are too tight, so I need a bigger size.', '<b>i-g-h</b> together says “i”, like in night and light.'],
    ['b[u]y', 'Can we buy a new backpack for school?', 'Tricky word! The <b>u</b> is silent: b-u-y.'],
    ['[eye]', 'That shiny necklace caught my eye.', 'Tricky word! <b>e-y-e</b> is spelled the same forwards and backwards.'],
    ['[wh]i[ch]', 'Which color shirt should I get?', 'It starts with <b>w-h</b> and ends with <b>c-h</b>.'],
    ['f[i]nd', 'I cannot find my size in this store.', 'The <b>i</b> says its name before <b>n-d</b>, like in kind and mind.'],
    ['[wh][y]', 'Why is the toy store so busy today?', 'It starts with <b>w-h</b>, and the <b>y</b> says “i”.'],
    ['k[i]nd', 'The cashier was very kind to us.', 'The <b>i</b> says its name before <b>n-d</b>, like in find and mind.'],
    ['tr[y]', "Let's try on the sunglasses!", 'The <b>y</b> at the end says “i”, like in my and why.'],
  ];
  const plainWord = (marked) => marked.replace(/[[\]]/g, '');
  const SPELL_INFO = Object.fromEntries(SPELL_DEFAULT.map(([m, s, tip]) => [plainWord(m).toLowerCase(), { marked: m, sentence: s, tip }]));

  // The active list: the default, or one a grown-up typed in ("word | sentence" per line).
  function spellWords() {
    const custom = Array.isArray(S.spellList) && S.spellList.length ? S.spellList : null;
    const rows = custom || SPELL_DEFAULT.map(([m, s]) => [plainWord(m), s]);
    return rows.map(([word, sentence]) => {
      const info = SPELL_INFO[word.toLowerCase()] || {};
      return { word, sentence: sentence || info.sentence || '', tip: info.tip || '', marked: info.marked || word };
    });
  }
  const markHTML = (marked) => escapeHTML(marked).replace(/\[([^\]]*)\]/g, '<mark>$1</mark>');
  const sayWord = (w) => (w.sentence ? [[w.word, 0.75], [w.sentence, 0.9], [w.word, 0.75]] : [[w.word, 0.75], [w.word, 0.75]]);
  // The recorded dictation only matches if the sentence is the one that was recorded.
  const spellVoice = (w) => {
    const info = SPELL_INFO[w.word.toLowerCase()];
    return info && info.sentence === w.sentence ? [`spell/${w.word.toLowerCase()}`] : null;
  };

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
    return {
      kind: 'spell', w, peek, speakParts: sayWord(w), speak: `${w.word}. ${w.sentence} ${w.word}.`,
      voice: spellVoice(w), slowVoice: [`slow/${w.word.toLowerCase()}`],
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
    const peek = q.peek ? `<div class="peek" id="peek"><small>Look closely, then spell it!</small><span class="peek-word">${markHTML(q.w.marked)}</span><small>${escapeHTML(q.w.sentence)}</small></div>` : '';
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
      } else say(q.slowVoice, [[q.w.word, 0.75]]);
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
      $('#slowBtn').onclick = () => say(q.slowVoice, [[q.w.word, 0.45]]);
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
    screen.querySelectorAll('.word-chip').forEach((b) => { b.onclick = () => { const w = words[+b.dataset.i]; say(spellVoice(w), sayWord(w)); }; });
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
    ['👩‍🦰', 'Ruby'], ['🧕', 'Amira'], ['👱‍♀️', 'Lily'], ['👩‍🦳', 'Mrs. Green'], ['🧑', 'Jordan'], ['👸', 'Princess Pearl']];

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
    return {
      kind: 'change', items, prices, total, paid, answer, customer: [ce, cname],
      wantsHTML: `Hi! I'd like the ${wants}, please. Here's <b>${money(paid)}</b>.`,
      speak: `Hi! I'd like the ${items.map((it) => it.m.name).join(' and the ')}, please. Here's ${paid} dollars. How much change do I get?`,
      voice: [two ? 'line/sell-2' : 'line/sell-1', `p/${paid}`],
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
    if ((R.q.kind === 'spell' && $('#bracelet')) || (R.q.kind === 'change' && $('#cbDigits'))) R.keyHandler(e);
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
