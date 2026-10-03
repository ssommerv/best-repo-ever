// Every line the game can say in the recorded voice. The game plays these clips
// (listed in docs/audio/manifest.json); tools/voice/generate.py records them.
// Prices always come last in a sentence, so a question is at most
// "line + price" — one join.
(function (root) {
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function words(n) {
    if (n === 1000) return 'one thousand';
    const parts = [], h = Math.floor(n / 100), r = n % 100;
    if (h) parts.push(ONES[h] + ' hundred');
    if (r) parts.push(r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : ''));
    return parts.join(' ');
  }

  const PRICE_MIN = 10, PRICE_MAX = 1000;
  const LEAD_IN = 'two hundred forty-eight dollars.'; // context so a lead-in line sounds like it continues into a price
  const lines = {
    // Lead-ins: a price clip follows each of these.
    'line/register': { text: 'Tap the money to pay exactly', next: LEAD_IN },
    'line/tag-w2s': { text: 'The shopper said the price out loud. Find the tag for', next: LEAD_IN },
    'line/tag-s2e': { text: 'Find the expanded form for', next: LEAD_IN },
    'line/round-10': { text: 'Round this price to the nearest ten:', next: LEAD_IN },
    'line/round-100': { text: 'Round this price to the nearest hundred:', next: LEAD_IN },
    'line/sell-1': { text: "Hi! I'd like to buy this, please. Here's", next: 'fifty dollars.' },
    'line/sell-2': { text: "Hi! I'd like to buy these two things, please. Here's", next: 'one thousand dollars.' },
    // Whole questions.
    'line/tag-e2s': { text: 'The cashier added up the money like this. What is the price?' },
    'line/deal-less': { text: 'Which one costs less?' },
    'line/deal-more': { text: 'Which one costs more?' },
    'line/deal-sign': { text: 'Pick the sign that makes it true. Less than, greater than, or equal to?' },
    'line/det-place-h': { text: 'Which digit is in the hundreds place?' },
    'line/det-place-t': { text: 'Which digit is in the tens place?' },
    'line/det-place-o': { text: 'Which digit is in the ones place?' },
    'line/fact-100-10': { text: 'Trade one hundred-dollar bill for ten-dollar bills. How many ten-dollar bills do you get?' },
    'line/fact-10-1': { text: 'Trade one ten-dollar bill for one-dollar coins. How many coins do you get?' },
    'line/fact-ones-100': { text: 'How many one-dollar coins make one hundred dollars?' },
    'line/fact-1000': { text: 'How many ten-dollar bills make one thousand dollars?' },
    'line/regroup-count': { text: 'Look at all this money in the piggy bank! How much is it altogether?' },
    'line/regroup-break': { text: 'Break one bill into smaller ones. What number goes in the box?' },
  };
  for (let d = 1; d <= 9; d++) lines[`line/det-worth-${d}`] = { text: `What is the highlighted ${ONES[d]} worth?` };
  for (let k = 2; k <= 9; k++) lines[`line/fact-tens-${k}`] = { text: `How many ten-dollar bills make ${ONES[k]} hundred dollars?` };
  for (let n = PRICE_MIN; n <= PRICE_MAX; n++) lines[`p/${n}`] = { text: `${words(n)} dollars.`, prev: 'It costs exactly' };

  root.PVB_VOICE = { lines, words, PRICE_MIN, PRICE_MAX };
})(typeof window !== 'undefined' ? window : globalThis);
