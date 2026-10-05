// Builds a random set and checks how its output behaves on whole strings:
//   - a search matches exactly when the string contains a code point in the
//     set (a surrogate pair counts as one code point),
//   - `^(?:…)+$` matches exactly the strings made of code points in the set,
//   - global matching with the `u` flag returns exactly those code points,
// for every kind of output. It also checks operations that are passed the set
// itself, e.g. `set.remove(set)`.
import {
	MAX,
	createRandom,
	hex,
	symbol,
	modelFromData,
	sameArray,
	supportsUnicodeSetsFlag,
} from './common.mjs';

const isLowSurrogate = (codePoint) => codePoint >= 0xDC00 && codePoint <= 0xDFFF;

const describe = (string) =>
	`${JSON.stringify(string)} (${[...string].map((s) => hex(s.codePointAt(0))).join(' ')})`;

export const name = 'strings';

export const runCase = (seed, regenerate) => {
	const random = createRandom(seed);
	const { int, codePoint } = random;
	const failures = [];

	// Build a random set, recording how, for the reproducer.
	const set = regenerate();
	const steps = [];
	const count = 1 + int(8);
	for (let i = 0; i < count; i++) {
		const kind = random.next();
		if (kind < 0.35) {
			const codePoints = Array.from({ length: 1 + int(5) }, codePoint);
			set.add(codePoints);
			steps.push(`add([${codePoints.map(hex).join(', ')}])`);
		} else if (kind < 0.7) {
			// Sometimes long astral ranges, spanning many high surrogates.
			const start = codePoint();
			const length = random.next() < 0.15 ? int(0x30000) : random.next() < 0.4 ? int(0x900) : int(20);
			const end = Math.min(MAX, start + length);
			set.addRange(start, end);
			steps.push(`addRange(${hex(start)}, ${hex(end)})`);
		} else if (kind < 0.85) {
			const start = codePoint();
			const end = Math.min(MAX, start + int(random.next() < 0.3 ? 0x900 : 20));
			set.removeRange(start, end);
			steps.push(`removeRange(${hex(start)}, ${hex(end)})`);
		} else {
			const codePoints = Array.from({ length: 1 + int(4) }, codePoint);
			set.remove(codePoints);
			steps.push(`remove([${codePoints.map(hex).join(', ')}])`);
		}
	}
	const repro = `const set = regenerate().${steps.join('.')};`;
	const fail = (kind, detail) => {
		failures.push({ kind, detail, repro });
	};
	const model = modelFromData(set.data);
	const data = set.data.slice();

	// Operations that are passed the set itself.
	const selfOperations = [
		['set.clone().add(set)', (s) => s.add(s), data],
		['set.clone().remove(set)', (s) => s.remove(s), []],
		['set.clone().intersection(set)', (s) => s.intersection(s), data],
		['set.clone().add([set, set])', (s) => s.add([s, s]), data],
		['set.clone().add(set, set)', (s) => s.add(s, s), data],
		['set.clone().remove(set, 0x41)', (s) => s.remove(s, 0x41), []],
	];
	for (const [name, operation, want] of selfOperations) {
		const clone = set.clone();
		try {
			operation(clone);
		} catch (exception) {
			fail(`${name} throws`, exception.message);
			continue;
		}
		if (!sameArray(clone.data, want)) {
			fail(`${name} gives the wrong set`, `got ${JSON.stringify(clone.data).slice(0, 120)}`);
		}
	}

	const outputs = {
		plain: set.toString(),
		bmpOnly: set.toString({ bmpOnly: true }),
		unicode: set.toString({ hasUnicodeFlag: true }),
		both: set.toString({ bmpOnly: true, hasUnicodeFlag: true }),
	};
	let regexes;
	try {
		regexes = {
			plain: new RegExp(outputs.plain),
			plainWhole: new RegExp(`^(?:${outputs.plain})+$`),
			bmpOnly: new RegExp(outputs.bmpOnly),
			bmpOnlyWhole: new RegExp(`^(?:${outputs.bmpOnly})+$`),
			unicode: new RegExp(outputs.unicode, 'u'),
			unicodeWhole: new RegExp(`^(?:${outputs.unicode})+$`, 'u'),
			unicodeGlobal: new RegExp(outputs.unicode, 'gu'),
			both: new RegExp(outputs.both, 'u'),
			bothWhole: new RegExp(`^(?:${outputs.both})+$`, 'u'),
			unicodeSets: supportsUnicodeSetsFlag ? new RegExp(outputs.unicode, 'v') : null,
			unicodeSetsWhole: supportsUnicodeSetsFlag ? new RegExp(`^(?:${outputs.unicode})+$`, 'v') : null,
		};
	} catch (exception) {
		fail('output doesn’t compile inside a larger pattern', exception.message.slice(0, 160));
		return failures;
	}

	// A random string of code points that are all in the set (`members` is
	// `true`), all outside it (`false`), or either (`undefined`). Returns its
	// code points as JavaScript sees them, where a high surrogate followed by a
	// low surrogate forms one astral code point, or `null` if that pairing broke
	// the request.
	const randomString = (members, bmpOnly) => {
		let string = '';
		const length = 1 + int(5);
		for (let i = 0; i < length; i++) {
			let c;
			for (let tries = 0; tries < 50; tries++) {
				c = codePoint();
				if (bmpOnly && c > 0xFFFF) {
					continue;
				}
				if (members === true && !model[c]) {
					continue;
				}
				if (members === false && model[c]) {
					continue;
				}
				break;
			}
			string += symbol(c);
		}
		const codePoints = [...string].map((s) => s.codePointAt(0));
		if (bmpOnly && codePoints.some((c) => c > 0xFFFF)) {
			return null;
		}
		if (members === true && !codePoints.every((c) => model[c])) {
			return null;
		}
		if (members === false && codePoints.some((c) => model[c])) {
			return null;
		}
		return { string, codePoints };
	};

	const isEmpty = data.length === 0;
	for (let i = 0; i < 25; i++) {
		const members = isEmpty ? false : [true, false, undefined][i % 3];
		const result = randomString(members, i % 5 === 0);
		if (!result) {
			continue;
		}
		const { string, codePoints } = result;
		const hasMember = codePoints.some((c) => model[c]);
		const allMembers = codePoints.every((c) => model[c]);
		const isBmp = codePoints.every((c) => c <= 0xFFFF);
		const searchFailure = hasMember ? 'misses a code point in the set' : 'matches a string without code points in the set';
		const where = `string ${describe(string)}`;
		const check = (condition, kind, pattern) => {
			if (!condition) {
				fail(kind, `${where}; pattern ${pattern.slice(0, 160)}`);
			}
		};

		check(regexes.plain.test(string) === hasMember, `toString() search ${searchFailure}`, outputs.plain);
		check(regexes.unicode.test(string) === hasMember, `toString({ hasUnicodeFlag: true }) search ${searchFailure}`, outputs.unicode);
		check(regexes.both.test(string) === hasMember, `toString({ bmpOnly: true, hasUnicodeFlag: true }) search ${searchFailure}`, outputs.both);
		if (regexes.unicodeSets) {
			check(regexes.unicodeSets.test(string) === hasMember, `search with the \`v\` flag ${searchFailure}`, outputs.unicode);
		}
		if (isBmp) {
			check(regexes.bmpOnly.test(string) === hasMember, `toString({ bmpOnly: true }) search on a BMP string ${searchFailure}`, outputs.bmpOnly);
		}

		// Without lookbehind, a lone low surrogate can only be matched at the start
		// of the string or after a character the pattern itself consumes. That's
		// documented, so skip such strings for the plain output.
		const hasLaterLowSurrogate = codePoints.some((c, index) => index > 0 && isLowSurrogate(c));
		const whole = `whole-string match ${allMembers ? 'fails for' : 'succeeds for'} a string ${allMembers ? 'of' : 'not only of'} code points in the set`;
		if (!hasLaterLowSurrogate) {
			check(regexes.plainWhole.test(string) === allMembers, `^(?:toString())+$ ${whole}`, outputs.plain);
		}
		check(regexes.unicodeWhole.test(string) === allMembers, `^(?:toString({ hasUnicodeFlag: true }))+$ ${whole}`, outputs.unicode);
		check(regexes.bothWhole.test(string) === allMembers, `^(?:toString({ bmpOnly: true, hasUnicodeFlag: true }))+$ ${whole}`, outputs.both);
		if (regexes.unicodeSetsWhole) {
			check(regexes.unicodeSetsWhole.test(string) === allMembers, `^(?:…)+$ with the \`v\` flag ${whole}`, outputs.unicode);
		}
		if (isBmp) {
			check(regexes.bmpOnlyWhole.test(string) === allMembers, `^(?:toString({ bmpOnly: true }))+$ on a BMP string ${whole}`, outputs.bmpOnly);
		}

		const matched = (string.match(regexes.unicodeGlobal) || []).map((s) => s.codePointAt(0));
		const expected = codePoints.filter((c) => model[c]);
		if (!sameArray(matched, expected)) {
			fail(
				'global matching with the `u` flag doesn’t return exactly the code points in the set',
				`${where}; got ${matched.map(hex).join(' ')}; want ${expected.map(hex).join(' ')}`
			);
		}
	}
	return failures;
};
