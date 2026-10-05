// Builds sets of astral code points from a few high surrogates and a small,
// shared pool of low surrogates, so that the surrogate classes in the output
// often have low surrogates in common and get merged. Then checks every pair
// of a high surrogate in play and any low surrogate against `toString()`.
import { MAX, createRandom, hex, symbol } from './common.mjs';

const fromSurrogates = (high, low) =>
	0x10000 + ((high - 0xD800) << 10) + (low - 0xDC00);

export const name = 'surrogates';

export const runCase = (seed, regenerate) => {
	const { next, int } = createRandom(seed);
	const set = regenerate();
	const members = new Set();
	const steps = [];
	const addRange = (start, end) => {
		set.addRange(start, end);
		steps.push(`addRange(${hex(start)}, ${hex(end)})`);
		for (let c = start; c <= end; c++) {
			members.add(c);
		}
	};

	// A few high surrogates, including neighbours and the extremes.
	const highs = new Set();
	const highCount = 1 + int(5);
	while (highs.size < highCount) {
		highs.add(next() < 0.2 ? [0xD800, 0xDBFF][int(2)] : 0xD800 + int(0x400));
	}
	const firstHigh = [...highs][0];
	if (next() < 0.3 && firstHigh < 0xDBFF) {
		highs.add(firstHigh + 1);
	}
	// A small pool of low surrogates, shared by the high surrogates.
	const lows = new Set();
	const lowCount = 1 + int(6);
	while (lows.size < lowCount) {
		lows.add(next() < 0.2 ? [0xDC00, 0xDFFF][int(2)] : 0xDC00 + int(0x400));
	}
	const lowList = [...lows].sort((a, b) => a - b);

	for (const high of highs) {
		if (next() < 0.1) {
			// All low surrogates.
			addRange(fromSurrogates(high, 0xDC00), fromSurrogates(high, 0xDFFF));
			continue;
		}
		for (const low of lowList) {
			if (next() < 0.5) {
				continue;
			}
			const length = next() < 0.3 ? 1 + int(4) : 1;
			const lastLow = Math.min(0xDFFF, low + length - 1);
			addRange(fromSurrogates(high, low), fromSurrogates(high, lastLow));
		}
	}
	// Sometimes a range that crosses into the next high surrogates.
	if (next() < 0.2) {
		const start = fromSurrogates(firstHigh, 0xDF00 + int(0xFF));
		addRange(start, Math.min(MAX, start + 0x200 + int(0x800)));
	}

	const pattern = set.toString();
	const regex = new RegExp(`^(?:${pattern})$`);
	const involvedHighs = new Set(highs);
	for (const c of members) {
		involvedHighs.add(0xD800 + ((c - 0x10000) >> 10));
	}
	for (const high of involvedHighs) {
		for (let low = 0xDC00; low <= 0xDFFF; low++) {
			const c = fromSurrogates(high, low);
			const want = members.has(c);
			if (regex.test(symbol(c)) !== want) {
				return [{
					kind: 'toString() matches the wrong astral code points',
					detail: `${hex(c)} should ${want ? '' : 'not '}match; pattern ${pattern.slice(0, 200)}`,
					repro: `const set = regenerate().${steps.join('.')};`,
				}];
			}
		}
	}
	return [];
};
