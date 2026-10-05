// Shared helpers for the fuzzers in this directory.

export const MAX = 0x10FFFF;

// A small, fast, seedable pseudo-random number generator, so that every case
// can be replayed from its seed.
const mulberry32 = (seed) => () => {
	seed |= 0;
	seed = seed + 0x6D2B79F5 | 0;
	let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
	t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
	return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

// Most code points are picked close to boundaries where bugs tend to hide:
// ASCII punctuation, the surrogate ranges, the end of the BMP, a few astral
// code points that share low surrogates (U+1D30x and U+B070x), and the end of
// the Unicode range.
const CLUSTERS = [
	[0x0, 0x30], [0x58, 0x80], [0xD7F0, 0xD810], [0xDBF0, 0xDC10],
	[0xDFF0, 0xE010], [0xFFF0, 0x10010], [0x1D300, 0x1D310],
	[0xB0700, 0xB0710], [0x10FFF0, MAX],
];

export const createRandom = (seed) => {
	const next = mulberry32(seed);
	const int = (n) => Math.floor(next() * n);
	const pick = (array) => array[int(array.length)];
	return {
		next,
		int,
		pick,
		codePoint: () => {
			if (next() < 0.04) {
				return int(MAX + 1);
			}
			const [start, end] = pick(CLUSTERS);
			return start + int(end - start + 1);
		},
	};
};

export const hex = (number) => '0x' + number.toString(16).toUpperCase();
// Lone surrogates become strings of one code unit.
export const symbol = (codePoint) => String.fromCodePoint(codePoint);

// The reference model: one byte per code point.
export const createModel = () => new Uint8Array(MAX + 1);

export const modelFromData = (data) => {
	const model = createModel();
	for (let index = 0; index < data.length; index += 2) {
		model.fill(1, data[index], data[index + 1]);
	}
	return model;
};

// The model as Regenerate data: sorted, merged `[start, end)` pairs. To be
// fast, this reads the model 4 bytes at a time, and skips words that are all
// outside or all inside the current range.
export const modelToData = (model) => {
	const words = new Uint32Array(model.buffer, model.byteOffset, model.length >> 2);
	const data = [];
	let isInside = false;
	for (let index = 0; index < words.length; index++) {
		if (words[index] === (isInside ? 0x01010101 : 0)) {
			continue;
		}
		for (let codePoint = index << 2; codePoint < (index + 1) << 2; codePoint++) {
			if (Boolean(model[codePoint]) !== isInside) {
				data.push(codePoint);
				isInside = !isInside;
			}
		}
	}
	if (isInside) {
		data.push(MAX + 1);
	}
	return data;
};

export const sameArray = (a, b) =>
	a.length === b.length && a.every((value, index) => value === b[index]);

export const supportsUnicodeSetsFlag = (() => {
	try {
		new RegExp('a', 'v');
		return true;
	} catch (exception) {
		return false;
	}
})();
