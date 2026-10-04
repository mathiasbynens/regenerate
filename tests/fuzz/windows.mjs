// Fills a few windows of up to 4096 code points, placed anywhere in Unicode,
// with dense random patterns, and checks every code point in and around each
// window: `contains`, `toArray`, and every kind of output. Where the other
// fuzzers pick code points near a few boundaries, this one covers the whole
// range, so every escape in the output gets checked, and astral windows that
// cross a multiple of 0x400 produce many different surrogate classes.
import {
	MAX,
	createRandom,
	hex,
	symbol,
	sameArray,
	supportsUnicodeSetsFlag,
} from './common.mjs';

// Windows start near these boundaries a third of the time.
const BOUNDARIES = [
	0x0, 0x7F, 0xFF, 0xD800, 0xDBFF, 0xDC00, 0xDFFF, 0xE000, 0xFFFF, 0x10000,
	0x10400, MAX,
];

// How a window's code points get into the set, so that every way of adding
// code points is covered.
const BUILDERS = ['array', 'arguments', 'add', 'addRange', 'symbols', 'removeFromRange', 'intersection'];

const runsOf = (codePoints) => {
	const runs = [];
	for (const c of codePoints) {
		const last = runs[runs.length - 1];
		if (last && last[1] + 1 == c) {
			last[1] = c;
		} else {
			runs.push([c, c]);
		}
	}
	return runs;
};

export const name = 'windows';

export const runCase = (seed, regenerate) => {
	const random = createRandom(seed);
	const { next, int, pick } = random;
	const failures = [];
	const steps = [];
	const fail = (kind, detail) => {
		failures.push({ kind, detail, repro: `const set = regenerate()${steps.join('')};` });
	};

	const set = regenerate();
	const members = new Set();
	const windows = [];
	const windowCount = 1 + int(3);
	for (let w = 0; w < windowCount; w++) {
		const size = 1 + (next() < 0.2 ? int(4096) : int(512));
		let start = next() < 0.33 ?
			pick(BOUNDARIES) - int(size) :
			int(MAX + 1);
		start = Math.max(0, Math.min(MAX - size + 1, start));
		const end = start + size - 1;
		windows.push([start, end]);

		// The pattern of code points in the window.
		const pattern = int(4);
		const density = pick([0.1, 0.5, 0.9]);
		const codePoints = [];
		let inRun = next() < 0.5;
		for (let c = start; c <= end; c++) {
			let isMember;
			if (pattern == 0) {
				isMember = next() < density;
			} else if (pattern == 1) {
				// Short runs in and out of the set.
				if (next() < 0.35) {
					inRun = !inRun;
				}
				isMember = inRun;
			} else if (pattern == 2) {
				isMember = (c - start) % 2 == 0;
			} else {
				isMember = next() < 0.95;
			}
			if (isMember && !members.has(c)) {
				codePoints.push(c);
			}
		}
		if (!codePoints.length) {
			continue;
		}

		const builder = pick(BUILDERS);
		const runs = runsOf(codePoints);
		const list = (values) => values.map(hex).join(', ');
		if (builder == 'array') {
			set.add(codePoints);
			steps.push(`.add([${list(codePoints)}])`);
		} else if (builder == 'arguments') {
			set.add(...codePoints);
			steps.push(`.add(${list(codePoints)})`);
		} else if (builder == 'add') {
			// One call per code point, in a random order.
			const shuffled = codePoints.slice();
			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = int(i + 1);
				[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
			}
			for (const c of shuffled) {
				set.add(c);
				steps.push(`.add(${hex(c)})`);
			}
		} else if (builder == 'addRange') {
			// One call per run, last run first.
			for (const [first, last] of runs.slice().reverse()) {
				set.addRange(first, last);
				steps.push(`.addRange(${hex(first)}, ${hex(last)})`);
			}
		} else if (builder == 'symbols') {
			set.add(codePoints.map(symbol));
			steps.push(`.add([${codePoints.map((c) => JSON.stringify(symbol(c))).join(', ')}])`);
		} else {
			// Add the whole window to a separate set, then cut it down.
			const window = regenerate().addRange(start, end);
			let step = `.add(regenerate().addRange(${hex(start)}, ${hex(end)})`;
			if (builder == 'removeFromRange') {
				const keep = new Set(codePoints);
				const outside = [];
				for (let c = start; c <= end; c++) {
					if (!keep.has(c)) {
						outside.push(c);
					}
				}
				window.remove(outside);
				step += `.remove([${list(outside)}])`;
			} else {
				window.intersection(codePoints);
				step += `.intersection([${list(codePoints)}])`;
			}
			set.add(window);
			steps.push(step + ')');
		}
		for (const c of codePoints) {
			members.add(c);
		}
	}

	// The set's data, from the members.
	const sorted = Array.from(members).sort((a, b) => a - b);
	const wantData = [];
	for (const [first, last] of runsOf(sorted)) {
		wantData.push(first, last + 1);
	}
	if (!sameArray(set.data, wantData)) {
		fail('data differs from the code points added', `got ${JSON.stringify(set.data).slice(0, 200)}\nwant ${JSON.stringify(wantData).slice(0, 200)}`);
		return failures;
	}
	if (!sameArray(set.toArray(), sorted)) {
		fail('toArray differs from the code points added', '');
	}

	const outputs = {
		plain: set.toString(),
		bmpOnly: set.toString({ bmpOnly: true }),
		unicode: set.toString({ hasUnicodeFlag: true }),
	};
	let regexes;
	try {
		regexes = {
			plain: new RegExp(`^(?:${outputs.plain})$`),
			plainSearch: new RegExp(outputs.plain),
			bmpOnly: new RegExp(`^(?:${outputs.bmpOnly})$`),
			unicode: new RegExp(`^(?:${outputs.unicode})$`, 'u'),
			unicodeSets: supportsUnicodeSetsFlag ? new RegExp(`^(?:${outputs.unicode})$`, 'v') : null,
		};
	} catch (exception) {
		fail('output doesn’t compile', exception.message.slice(0, 160));
		return failures;
	}

	// Every code point in and around the windows.
	const checked = new Set();
	const check = (c) => {
		if (c < 0 || c > MAX || checked.has(c)) {
			return;
		}
		checked.add(c);
		const string = symbol(c);
		const want = members.has(c);
		const report = (what, pattern) => {
			fail(`${what} is wrong`, `${hex(c)} should ${want ? '' : 'not '}be in the set${pattern ? `; pattern ${pattern.slice(0, 200)}` : ''}`);
		};
		if (set.contains(c) !== want) {
			report('contains', '');
		}
		if (regexes.plain.test(string) !== want) {
			report('toString()', outputs.plain);
		}
		if (regexes.unicode.test(string) !== want) {
			report('toString({ hasUnicodeFlag: true })', outputs.unicode);
		}
		if (regexes.unicodeSets && regexes.unicodeSets.test(string) !== want) {
			report("output with the 'v' flag", outputs.unicode);
		}
		if (c <= 0xFFFF && regexes.bmpOnly.test(string) !== want) {
			report('toString({ bmpOnly: true }) on BMP code points', outputs.bmpOnly);
		}
		if (c > 0xFFFF && !want && regexes.plainSearch.test(string)) {
			fail('toString() matches part of a surrogate pair', `${hex(c)}; pattern ${outputs.plain.slice(0, 200)}`);
		}
	};
	for (const [start, end] of windows) {
		for (let c = start - 16; c <= end + 16; c++) {
			check(c);
		}
	}
	return failures;
};
