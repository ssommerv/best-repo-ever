'use strict';
(() => {
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
          speak: `Pay exactly ${n} dollars for the ${it.name}.`,
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
            speak: `In the price ${n} dollars, what is the highlighted ${dig} worth?`,
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
          speak: `In the price ${n} dollars, which digit is in the ${PLACE[p].name} place?`,
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
            speak: `The shopper said: ${words(n)} dollars. Which tag matches?`,
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
            speak: `Which shows ${n} in expanded form?`,
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
          speak: `The cashier added ${expParts(n).join(' plus ')}. What is the price?`,
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
          speak: `Is ${a} dollars less than, greater than, or equal to ${b} dollars?`,
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
          speak: `The ${it.name} costs ${n} dollars. Round it to the nearest ${place}.`,
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
            ['Trade one $100 bill for $10 bills. How many $10 bills do you get?', 10, 'One hundred is the same as 10 tens.'],
            ['Trade one $10 bill for $1 coins. How many coins do you get?', 10, 'One ten is the same as 10 ones.'],
          ];
          if (level >= 2) {
            const k = rand(2, 9);
            facts.push([`How many $10 bills make ${money(k * 100)}?`, k * 10, `Each $100 is 10 tens, so ${k} hundreds = ${k * 10} tens.`]);
            facts.push(['How many $1 coins make $100?', 100, '10 tens = 100 ones.']);
          }
          if (level >= 3) facts.push(['How many $10 bills make $1,000?', 100, '1,000 is 10 hundreds, and each hundred is 10 tens, so that is 100 tens!']);
          const [q, ans, why] = pick(facts);
          return {
            kind: 'mc', visual: '<div class="machine">🏦 ⇄ 💵</div>', prompt: q, speak: q.replace(/\$/g, ''),
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
            speak: 'Look at the money in the piggy bank. How much is it altogether?',
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
          speak: q, choices: numChoices(ans, cands, String), answer: ans, big: true,
          hint: `One ${PLACE[big].one} was traded for 10 ${PLACE[small].name}. Add 10 to the ${PLACE[small].name} digit.`,
          explain: `Trade 1 ${PLACE[big].one} for 10 ${PLACE[small].name}: ${ans - 10} + 10 = <b>${ans}</b> ${PLACE[small].name}.`,
        };
      },
    },
  };
  const GAME_IDS = Object.keys(GAMES);

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
  const WALLS = [
    { id: 'pink', name: 'Bubblegum', cost: 0 }, { id: 'mint', name: 'Mint', cost: 30 },
    { id: 'lavender', name: 'Lavender', cost: 30 }, { id: 'ocean', name: 'Ocean', cost: 40 },
    { id: 'sunset', name: 'Sunset', cost: 45 }, { id: 'galaxy', name: 'Galaxy', cost: 75 },
  ];

  // ---------- Saved progress ----------
  const KEY = 'pvb-v1';
  const DEFAULT = { started: false, name: '', coins: 0, levels: {}, streaks: {}, stats: {}, owned: [], walls: ['pink'], wall: 'pink', sound: true, autoRead: false };
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
      if (s >= 5 && lv < 3) { S.levels[id] = lv + 1; s = 0; change = 1; }
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
  const mallName = () => (S.name ? `${S.name}'s Mall` : 'Place Value Boutique');

  function updateTopbar() {
    $('#coinCount').textContent = S.coins;
    $('#soundBtn').textContent = S.sound ? '🔔' : '🔕';
  }
  function setScreen(html, { title = mallName(), home = true } = {}) {
    if (canSpeak) speechSynthesis.cancel();
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
        <div class="welcome-art">🛍️👛🎀</div>
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

  function stars(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }

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
    setScreen(`
      <section class="mall">
        <p class="mall-hello">Hi${S.name ? ' ' + escapeHTML(S.name) : ''}! Pick a store to play. 👋</p>
        <div class="store-grid">${cards}</div>
        <div class="mall-extras">
          <button class="extra c-pink" id="shopBtn"><span>🛍️</span>Sparkle Shop<small>Spend your coins</small></button>
          <button class="extra c-purple" id="roomBtn"><span>🏠</span>My Boutique<small>See your stuff</small></button>
        </div>
        <button class="grownups" id="parentBtn">🔒 Grown-ups</button>
      </section>`, { home: false });
    screen.querySelectorAll('.store').forEach((b) => { b.onclick = () => { sfx.tap(); startRound(b.dataset.game); }; });
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
    R = { id, index: 0, firstTries: 0, coins: 0 };
    nextQuestion();
  }

  function nextQuestion() {
    if (R.index >= ROUND_LEN) return renderRoundEnd();
    R.q = GAMES[R.id].make(levelOf(R.id));
    R.attempts = 0;
    R.locked = false;
    renderQuestion();
  }

  function dotsHTML() {
    return Array.from({ length: ROUND_LEN }, (_, i) =>
      `<span class="dot ${i < R.index ? 'done' : i === R.index ? 'now' : ''}"></span>`).join('');
  }

  function renderQuestion() {
    const g = GAMES[R.id], q = R.q, lv = levelOf(R.id);
    const head = `
      <div class="game-head c-${g.color}">
        <span class="game-emoji">${g.emoji}</span>
        <div class="dots" aria-label="Question ${R.index + 1} of ${ROUND_LEN}">${dotsHTML()}</div>
        <span class="level-chip">${stars(lv)}</span>
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
    if (canSpeak) $('#sayBtn').onclick = () => speak(q.speak);
    if (q.kind === 'register') wireRegister();
    else screen.querySelectorAll('.choice').forEach((b) => { b.onclick = () => answerMC(b, q.choices[+b.dataset.i].value); });
    if (S.autoRead) speak(q.speak);
  }

  function wireRegister() {
    const redraw = () => {
      $('#matWrap').innerHTML = matHTML(R.counts, R.places, true);
      screen.querySelectorAll('.mat-bill').forEach((b) => {
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
      if (paid === n) return onCorrect();
      const need = placesFor(n).map((p) => unit(d[p], p)).join(', ');
      const dir = paid < n ? 'not enough' : 'too much';
      if (onWrong(`You paid ${money(paid)}. That's ${dir}. ${money(n)} needs ${need}.${pvChart(n)}`)) {
        R.counts = { h: d.h, t: d.t, o: d.o };
        redraw();
      }
    };
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
    const first = R.attempts === 0, earned = first ? 3 : 1;
    if (first) R.firstTries++;
    R.coins += earned;
    S.coins += earned;
    const change = recordResult(R.id, first);
    sfx.good(); confetti();
    const cheer = pick(CHEERS);
    showFeedback('good', `<div class="fb-title">${cheer} <span class="earned">+${earned} 🪙</span></div><div class="fb-body">${R.q.explain}</div>`);
    if (S.sound) setTimeout(() => speak(cheer), 350);
    if (change > 0) setTimeout(() => { sfx.fanfare(); toast(`🎉 Level up! Now playing <b>${LEVELS[levelOf(R.id)].label}</b>`); }, 700);
  }

  // Returns true when the answer is revealed (second miss).
  function onWrong(hint) {
    R.attempts++;
    sfx.bad();
    const card = screen.querySelector('.play');
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    if (R.attempts === 1) {
      showFeedback('hint', `<div class="fb-title">${pick(['So close! Here is a clue:', 'Almost! Try again.', 'Hmm, not quite. Clue:'])}</div><div class="fb-body">${hint}</div>`, false);
      return false;
    }
    R.locked = true;
    recordResult(R.id, false);
    showFeedback('reveal', `<div class="fb-title">Let's learn this one together 💡</div><div class="fb-body">${R.q.explain}</div>`);
    return true;
  }

  function showFeedback(kind, html, withNext = true) {
    const fb = $('#fb');
    fb.hidden = false;
    fb.className = `feedback fb-${kind}`;
    fb.innerHTML = html + (withNext ? `<button class="btn primary big" id="nextBtn">${R.index + 1 >= ROUND_LEN ? 'Finish ➜' : 'Next ➜'}</button>` : '');
    if (withNext) $('#nextBtn').onclick = () => { sfx.tap(); R.index++; nextQuestion(); };
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderRoundEnd() {
    const g = GAMES[R.id], starsWon = R.firstTries >= 5 ? 3 : R.firstTries >= 3 ? 2 : 1;
    const bonus = 2 + starsWon * 2;
    S.coins += bonus;
    save();
    const msg = starsWon === 3 ? 'Perfect shopping trip!' : starsWon === 2 ? 'Great job!' : 'Nice work, keep practicing!';
    setScreen(`
      <section class="round-end">
        <div class="big-stars">${'<span>★</span>'.repeat(starsWon)}${'<span class="off">★</span>'.repeat(3 - starsWon)}</div>
        <h2>${msg}</h2>
        <p>You got <b>${R.firstTries} of ${ROUND_LEN}</b> on the first try.</p>
        <div class="coin-total">🪙 ${R.coins} + ${bonus} bonus = <b>${R.coins + bonus} Sparkle Coins</b></div>
        <div class="actions">
          <button class="btn primary big" id="againBtn">Play ${g.name} again</button>
          <button class="btn ghost big" id="mallBtn">Back to the mall</button>
        </div>
      </section>`, { title: g.name });
    sfx.fanfare();
    if (starsWon === 3) confetti();
    $('#againBtn').onclick = () => startRound(R.id);
    $('#mallBtn').onclick = renderMall;
  }

  // ---------- Shop & boutique ----------
  function renderShop() {
    const decor = DECOR.map((d) => {
      const own = S.owned.includes(d.id);
      return `<div class="shop-item ${own ? 'owned' : ''}">
        <span class="shop-emoji">${d.e}</span><span class="shop-name">${d.name}</span>
        ${own ? '<span class="owned-chip">✔ Yours</span>' : `<button class="btn buy" data-kind="decor" data-id="${d.id}" ${S.coins < d.cost ? 'disabled' : ''}>🪙 ${d.cost}</button>`}
      </div>`;
    }).join('');
    const walls = WALLS.filter((w) => w.cost > 0).map((w) => {
      const own = S.walls.includes(w.id);
      return `<div class="shop-item ${own ? 'owned' : ''}">
        <span class="swatch wall-${w.id}"></span><span class="shop-name">${w.name} walls</span>
        ${own ? '<span class="owned-chip">✔ Yours</span>' : `<button class="btn buy" data-kind="wall" data-id="${w.id}" ${S.coins < w.cost ? 'disabled' : ''}>🪙 ${w.cost}</button>`}
      </div>`;
    }).join('');
    setScreen(`
      <section class="shop">
        <p class="mall-hello">You have <b>🪙 ${S.coins}</b> Sparkle Coins. What will you buy?</p>
        <h3>Decorations</h3><div class="shop-grid">${decor}</div>
        <h3>Wallpaper</h3><div class="shop-grid">${walls}</div>
        <button class="btn primary big center" id="roomBtn">🏠 See my boutique</button>
      </section>`, { title: 'Sparkle Shop' });
    screen.querySelectorAll('.buy').forEach((b) => {
      b.onclick = () => {
        const list = b.dataset.kind === 'wall' ? WALLS : DECOR;
        const it = list.find((x) => x.id === b.dataset.id);
        if (S.coins < it.cost) return;
        S.coins -= it.cost;
        if (b.dataset.kind === 'wall') { S.walls.push(it.id); S.wall = it.id; } else S.owned.push(it.id);
        save(); sfx.coin(); confetti();
        toast(`You bought ${it.e || '🎨'} <b>${it.name}</b>!`);
        renderShop();
      };
    });
    $('#roomBtn').onclick = renderRoom;
  }

  function renderRoom() {
    const owned = DECOR.filter((d) => S.owned.includes(d.id));
    const items = owned.length
      ? owned.map((d) => `<button class="room-item" data-name="${d.name}" aria-label="${d.name}">${d.e}</button>`).join('')
      : '<p class="room-empty">Your boutique is empty! Play in the stores to earn 🪙 Sparkle Coins, then visit the Sparkle Shop.</p>';
    const walls = WALLS.filter((w) => S.walls.includes(w.id)).map((w) =>
      `<button class="wall-pick ${S.wall === w.id ? 'on' : ''}" data-id="${w.id}"><span class="swatch wall-${w.id}"></span>${w.name}</button>`).join('');
    setScreen(`
      <section class="room-wrap">
        <div class="room wall-${S.wall}">
          <div class="room-sign">${escapeHTML(S.name || 'My')}${S.name ? "'s" : ''} Boutique</div>
          <div class="room-items">${items}</div>
          <div class="room-floor"></div>
        </div>
        <div class="wall-row">${walls}</div>
        <button class="btn primary big center" id="shopBtn">🛍️ Go to the Sparkle Shop</button>
      </section>`, { title: 'My Boutique' });
    screen.querySelectorAll('.room-item').forEach((b) => {
      b.onclick = () => { b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce'); sfx.tap(); if (S.sound) speak(b.dataset.name); };
    });
    screen.querySelectorAll('.wall-pick').forEach((b) => { b.onclick = () => { S.wall = b.dataset.id; save(); renderRoom(); }; });
    $('#shopBtn').onclick = renderShop;
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
    const rows = GAME_IDS.map((id) => {
      const g = GAMES[id], st = S.stats[id] || { right: 0, total: 0 };
      const pct = st.total ? Math.round((st.right / st.total) * 100) : null;
      const bar = pct === null ? '<span class="subtle">Not played yet</span>'
        : `<div class="bar"><span style="width:${pct}%" class="${pct >= 80 ? 'ok' : pct >= 60 ? 'mid' : 'low'}"></span></div><span class="pct">${pct}%</span>`;
      return `<tr>
        <td><b>${g.emoji} ${g.name}</b><br><small>${g.skill}</small></td>
        <td class="bar-cell">${bar}<small>${st.right}/${st.total} first try</small></td>
        <td><select data-id="${id}" aria-label="Level for ${g.name}">${[1, 2, 3].map((l) => `<option value="${l}" ${levelOf(id) === l ? 'selected' : ''}>${l}: ${LEVELS[l].label}</option>`).join('')}</select></td>
      </tr>`;
    }).join('');
    setScreen(`
      <section class="parent">
        <h2>Progress report</h2>
        <p class="subtle">Accuracy counts only answers that were right on the first try. Each store levels up after 5 first-try answers in a row and steps back down after 3 misses in a row. You can also set the level yourself.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Store</th><th>First-try accuracy</th><th>Level</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
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
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  if (S.started || S.name) renderMall(); else renderWelcome();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // Exposed for automated checks of the question generators.
  window.__PVB = { GAMES, words, price, get round() { return R; } };
})();
