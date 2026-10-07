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
    'line/register-2': { text: 'Count out the money for exactly', next: LEAD_IN },
    'line/register-3': { text: 'Help the shopper pay exactly', next: LEAD_IN },
    'line/register-noh': { text: 'No hundred-dollar bills this time! Use tens and ones to pay', next: LEAD_IN },
    'line/tag-w2s-2': { text: 'Which price tag shows', next: LEAD_IN },
    'line/tag-w2s-3': { text: 'The cashier said the price. Find the tag for', next: LEAD_IN },
    'line/tag-s2e-2': { text: 'What is the expanded form of', next: LEAD_IN },
    'line/tag-s2e-3': { text: 'Break this price into hundreds, tens and ones:', next: LEAD_IN },
    'line/round-10-2': { text: 'Round to the nearest ten. The price is', next: LEAD_IN },
    'line/round-10-3': { text: 'Sale sign! Estimate this price to the nearest ten:', next: LEAD_IN },
    'line/round-100-2': { text: 'Round to the nearest hundred. The price is', next: LEAD_IN },
    'line/round-100-3': { text: 'Sale sign! Estimate this price to the nearest hundred:', next: LEAD_IN },
    'line/round-which-10': { text: 'Rounding to the nearest ten, which price rounds to', next: LEAD_IN },
    'line/round-which-100': { text: 'Rounding to the nearest hundred, which price rounds to', next: LEAD_IN },
    'line/deal-over': { text: 'Which price is greater than', next: LEAD_IN },
    'line/sell-1b': { text: 'Hello! Can I buy this, please? Here is', next: 'fifty dollars.' },
    'line/sell-1c': { text: "I'll take this one, thank you! Here's", next: 'fifty dollars.' },
    'line/sell-2b': { text: 'Hello! Can I buy these two things, please? Here is', next: 'one thousand dollars.' },
    'line/sell-2c': { text: "I'll take these two, thank you! Here's", next: 'one thousand dollars.' },
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
    'line/tag-e2s-2': { text: 'Put the parts together. What price is this?' },
    'line/tag-e2s-3': { text: 'This is the price in expanded form. Which tag shows it?' },
    'line/tag-s2w': { text: 'Which words say this price?' },
    'line/tag-u2s': { text: 'What price is this many hundreds, tens and ones?' },
    'line/tag-s2u': { text: 'How many hundreds, tens and ones make this price?' },
    'line/deal-less-2': { text: 'Which one is cheaper?' },
    'line/deal-less-3': { text: 'Which price is lower?' },
    'line/deal-more-2': { text: 'Which one is more expensive?' },
    'line/deal-more-3': { text: 'Which price is higher?' },
    'line/deal-sign-2': { text: 'Which sign goes in the box? Less than, greater than, or equal to?' },
    'line/deal-sign-3': { text: 'Compare the prices. Pick less than, greater than, or equal to.' },
    'line/deal-most3': { text: 'Which of these three costs the most?' },
    'line/deal-least3': { text: 'Which of these three costs the least?' },
    'line/det-place-h-2': { text: 'Find the digit in the hundreds place.' },
    'line/det-place-t-2': { text: 'Find the digit in the tens place.' },
    'line/det-place-o-2': { text: 'Find the digit in the ones place.' },
    'line/det-place-h-3': { text: 'Look at the hundreds place. Which digit is there?' },
    'line/det-place-t-3': { text: 'Look at the tens place. Which digit is there?' },
    'line/det-place-o-3': { text: 'Look at the ones place. Which digit is there?' },
    'line/det-value-h': { text: 'What is the value of the digit in the hundreds place?' },
    'line/det-value-t': { text: 'What is the value of the digit in the tens place?' },
    'line/det-value-o': { text: 'What is the value of the digit in the ones place?' },
    'line/det-match': { text: 'Which price matches this money?' },
    'line/round-estimate-10': { text: 'About how much do both cost? Round each price to the nearest ten, then add.' },
    'line/round-estimate-100': { text: 'About how much do both cost? Round each price to the nearest hundred, then add.' },
    'line/fact-10s-in-100': { text: 'How many ten-dollar bills are the same as one hundred-dollar bill?' },
    'line/fact-100-1': { text: 'Trade one hundred-dollar bill for one-dollar coins. How many coins do you get?' },
    'line/fact-1000-100': { text: 'How many hundred-dollar bills make one thousand dollars?' },
    'line/regroup-count-2': { text: 'Count all the money. How much is there?' },
    'line/regroup-count-3': { text: 'How much money is on the mat altogether?' },
    'line/regroup-break-2': { text: 'Trade a bill for smaller bills. What number goes in the box?' },
    'line/regroup-break-3': { text: 'Fill in the box so it is the same amount of money.' },
    'line/regroup-same': { text: 'Which one shows the same amount of money?' },
    // Receipt Counter (addition up to 1000).
    'line/add-ones': { text: 'Add the ones.' },
    'line/add-regroup-ones': { text: 'Regroup the ones. Ten ones make one ten.' },
    'line/add-tens': { text: 'Add the tens.' },
    'line/add-regroup-tens': { text: 'Regroup the tens. Ten tens make one hundred.' },
    'line/add-hundreds': { text: 'Add the hundreds.' },
    'line/add-total': { text: 'Now write the total.' },
    'line/add-own': { text: 'Add the two prices. Remember to regroup when a column makes ten or more.' },
    'line/add-missing': { text: 'Thinking cap time! What are the missing numbers?' },
    'line/add-missing-2': { text: 'Thinking cap time! Some digits fell off the receipt. Which digits are missing?' },
    'line/add-missing-3': { text: 'Thinking cap time! Find the hidden digits that make the addition true.' },
    'line/add-own-2': { text: 'What is the total? Add the two prices, starting with the ones.' },
    'line/add-own-3': { text: 'The cashier needs your help. Add up the receipt, and remember to regroup.' },
    // Display Window (addition patterns and code).
    'line/pat-jump': { text: 'How much is added each time?' },
    'line/pat-rule': { text: 'Write the pattern rule.' },
    'line/pat-next': { text: 'What numbers come next?' },
    'line/pat-missing': { text: 'What are the missing numbers in the pattern?' },
    'line/pat-count1': { text: 'How many are in Figure 1?' },
    'line/pat-count2': { text: 'How many are in Figure 2?' },
    'line/pat-added': { text: 'How many are added each time?' },
    'line/pat-table': { text: 'Use the pattern rule to complete the table.' },
    'line/code-set': { text: 'What is the starting number?' },
    'line/code-add': { text: 'What number is added each time?' },
    'line/code-first': { text: 'What is the first output?' },
    'line/code-outputs': { text: 'Follow the code. What are the outputs?' },
    'line/code-make': { text: 'Fill in the code to make this pattern.' },
  };
  for (let d = 1; d <= 9; d++) {
    lines[`line/det-worth-${d}`] = { text: `What is the highlighted ${ONES[d]} worth?` };
    lines[`line/det-worth-${d}-2`] = { text: `How much is the highlighted ${ONES[d]} worth?` };
    lines[`line/det-worth-${d}-3`] = { text: `The ${ONES[d]} is highlighted. What is its value?` };
  }
  for (let k = 2; k <= 9; k++) lines[`line/fact-tens-${k}`] = { text: `How many ten-dollar bills make ${ONES[k]} hundred dollars?` };
  for (let n = PRICE_MIN; n <= PRICE_MAX; n++) lines[`p/${n}`] = { text: `${words(n)} dollars.`, prev: 'It costs exactly' };

  root.PVB_VOICE = { lines, words, PRICE_MIN, PRICE_MAX };
})(typeof window !== 'undefined' ? window : globalThis);
