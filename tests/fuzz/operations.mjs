// Runs random sequences of operations on a set and checks after every step
// that:
//   - its data matches a reference model, and stays sorted and merged,
//   - the operation left its argument sets and arrays unchanged,
//   - the set shares no data with its arguments afterwards.
// At the end of each sequence, it checks `toArray`, `valueOf`, `contains`, and
// that every kind of output compiles and matches exactly the code points in
// the set, and only depends on its contents.
import {
	MAX,
	createRandom,
	hex,
	symbol,
	createModel,
	modelToData,
	sameArray,
	supportsUnicodeSetsFlag,
} from './common.mjs';

// Sets with more code points than this are checked by sampling `toArray()`,
// and aren't rebuilt from arrays, which would make cases slow.
const LARGE = 20000;

const sizeOf = (data) => {
	let size = 0;
	for (let index = 0; index < data.length; index += 2) {
		size += data[index + 1] - data[index];
	}
	return size;
};

const OPERATIONS = [
	'add', 'add', 'addSeveral', 'remove', 'removeSeveral', 'addRange',
	'addRange', 'removeRange', 'intersection', 'intersection', 'clone',
	'construct',
];

export const name = 'operations';

export const runCase = (seed, regenerate) => {
	const random = createRandom(seed);
	const { int, pick, codePoint } = random;
	const failures = [];
	const log = ['let set = regenerate();'];
	const fail = (kind, detail) => {
		failures.push({ kind, detail, repro: log.join('\n') });
	};

	// A valid value as `add` and `remove` accept it: a code point, a symbol, a
	// `Number` object, a (nested) array, or a set. `make` returns a fresh copy.
	const value = (depth) => {
		const kind = random.next();
		if (kind < 0.4) {
			const c = codePoint();
			return { make: () => c, codePoints: [c], source: hex(c) };
		}
		if (kind < 0.52) {
			const c = codePoint();
			return { make: () => symbol(c), codePoints: [c], source: JSON.stringify(symbol(c)) };
		}
		if (kind < 0.58) {
			const c = codePoint();
			return { make: () => new Number(c), codePoints: [c], source: `new Number(${hex(c)})` };
		}
		if (kind < 0.78 && depth < 2) {
			const items = Array.from({ length: int(6) }, () => value(depth + 1));
			return {
				make: () => items.map((item) => item.make()),
				codePoints: items.flatMap((item) => item.codePoints),
				source: `[${items.map((item) => item.source).join(', ')}]`,
			};
		}
		const codePoints = Array.from({ length: random.next() < 0.2 ? 0 : 1 + int(5) }, codePoint);
		let range = null;
		if (random.next() < 0.3) {
			const start = codePoint();
			range = [start, Math.min(MAX, start + int(300))];
		}
		const all = codePoints.slice();
		if (range) {
			for (let c = range[0]; c <= range[1]; c++) {
				all.push(c);
			}
		}
		return {
			make: () => {
				const set = regenerate(codePoints);
				return range ? set.addRange(range[0], range[1]) : set;
			},
			codePoints: all,
			source: `regenerate(${codePoints.map(hex).join(', ')})` +
				(range ? `.addRange(${hex(range[0])}, ${hex(range[1])})` : ''),
			isSet: true,
		};
	};

	// Snapshots of arguments, to check that operations don't change them.
	const snapshot = (argument) => {
		if (argument instanceof regenerate) {
			return { set: argument, data: argument.data.slice() };
		}
		if (Array.isArray(argument)) {
			return { array: argument, items: argument.slice(), children: argument.map(snapshot) };
		}
		return null;
	};
	const isUnchanged = (snap) => {
		if (!snap) {
			return true;
		}
		if (snap.set) {
			return sameArray(snap.set.data, snap.data);
		}
		return sameArray(snap.array, snap.items) && snap.children.every(isUnchanged);
	};
	const setsIn = (argument, sets = []) => {
		if (argument instanceof regenerate) {
			sets.push(argument);
		} else if (Array.isArray(argument)) {
			argument.forEach((item) => setsIn(item, sets));
		}
		return sets;
	};

	const model = createModel();
	let set = regenerate();
	const steps = 1 + int(12);
	for (let step = 0; step < steps; step++) {
		const operation = pick(OPERATIONS);
		let args = [];
		if (operation === 'add' || operation === 'remove' || operation === 'intersection') {
			let val = value(0);
			if (operation === 'intersection') {
				if (random.next() < 0.3) {
					// An array of code points, as documented, often unsorted and with
					// duplicates.
					const codePoints = Array.from({ length: int(10) }, codePoint);
					if (random.next() < 0.3) {
						codePoints.push(...codePoints.slice(0, 2));
					}
					val = { make: () => codePoints.slice(), codePoints, source: `[${codePoints.map(hex).join(', ')}]` };
				} else if (!val.isSet && !val.source.startsWith('[')) {
					// `intersection` takes an array or a set.
					const inner = val;
					val = { make: () => [inner.make()], codePoints: inner.codePoints, source: `[${inner.source}]` };
				}
			}
			const argument = val.make();
			args = [argument];
			const snap = snapshot(argument);
			log.push(`set.${operation}(${val.source});`);
			let result;
			try {
				result = set[operation](argument);
			} catch (exception) {
				fail(`${operation} throws on valid input`, exception.message);
				return failures;
			}
			if (result !== set) {
				fail(`${operation} is not chainable`, '');
			}
			if (!isUnchanged(snap)) {
				fail(`${operation} changes its argument`, '');
			}
			if (operation === 'add') {
				for (const c of val.codePoints) {
					model[c] = 1;
				}
			} else if (operation === 'remove') {
				for (const c of val.codePoints) {
					model[c] = 0;
				}
			} else {
				const kept = val.codePoints.filter((c) => model[c]);
				model.fill(0);
				for (const c of kept) {
					model[c] = 1;
				}
			}
		} else if (operation === 'addSeveral' || operation === 'removeSeveral') {
			const method = operation === 'addSeveral' ? 'add' : 'remove';
			// Depth 1, so that some of the arguments are (flat) arrays.
			const values = Array.from({ length: 2 + int(4) }, () => value(1));
			const made = values.map((val) => val.make());
			args = made;
			const snaps = made.map(snapshot);
			log.push(`set.${method}(${values.map((val) => val.source).join(', ')});`);
			try {
				set[method](...made);
			} catch (exception) {
				fail(`${method} with several arguments throws on valid input`, exception.message);
				return failures;
			}
			if (!snaps.every(isUnchanged)) {
				fail(`${method} with several arguments changes an argument`, '');
			}
			for (const val of values) {
				for (const c of val.codePoints) {
					model[c] = method === 'add' ? 1 : 0;
				}
			}
		} else if (operation === 'addRange' || operation === 'removeRange') {
			let start = codePoint();
			let end = random.next() < 0.1 ?
				codePoint() :
				Math.min(MAX, start + int(random.next() < 0.2 ? 5000 : 40));
			if (random.next() < 0.03) {
				start = 0;
				end = MAX;
			}
			// Pass the bounds as code points, symbols, or `Number` objects.
			const form = int(3);
			const convert = (c) => form === 0 ? c : form === 1 ? symbol(c) : new Number(c);
			const show = (c) => form === 0 ? hex(c) : form === 1 ? JSON.stringify(symbol(c)) : `new Number(${hex(c)})`;
			log.push(`set.${operation}(${show(start)}, ${show(end)});`);
			let error = null;
			try {
				if (set[operation](convert(start), convert(end)) !== set) {
					fail(`${operation} is not chainable`, '');
				}
			} catch (exception) {
				error = exception;
			}
			if (end < start) {
				if (!error) {
					fail(`${operation} with end < start doesn't throw`, '');
				}
			} else if (error) {
				fail(`${operation} throws on a valid range`, error.message);
				return failures;
			} else {
				model.fill(operation === 'addRange' ? 1 : 0, start, end + 1);
			}
		} else if (operation === 'clone') {
			const clone = set.clone();
			if (clone === set || clone.data === set.data) {
				fail('clone returns the same set or data', '');
			}
			if (!sameArray(clone.data, set.data)) {
				fail('clone has different contents', '');
			}
			clone.addRange(0, MAX);
			if (!sameArray(set.data, modelToData(model))) {
				fail('changing a clone changes the original', '');
				return failures;
			}
			// Continue with a clone half the time, to fuzz cloned sets too.
			if (random.next() < 0.5) {
				log.push('set = set.clone();');
				set = set.clone();
			}
		} else if (operation === 'construct') {
			// Rebuild the set through the constructor, from several argument forms.
			const isLarge = sizeOf(set.data) > LARGE;
			const codePoints = isLarge ? [] : set.toArray();
			const form = isLarge ? 0 : int(4);
			log.push(`set = ${[
				'regenerate(set)',
				'regenerate(set.toArray())',
				'regenerate(...set.toArray().slice(0, 2000))',
				'regenerate(set.toArray().slice(0, 2000).map((c) => String.fromCodePoint(c)))',
			][form]};`);
			let next;
			if (form === 0) {
				next = regenerate(set);
				if (next === set || next.data === set.data) {
					fail('regenerate(set) shares data with set', '');
				}
			} else if (form === 1) {
				next = regenerate(codePoints);
			} else {
				// Spreading or mapping huge sets is slow, so keep the first 2000.
				const first = codePoints.slice(0, 2000);
				next = form === 2 ?
					(first.length ? regenerate(...first) : regenerate()) :
					regenerate(first.map(symbol));
				for (const c of codePoints.slice(2000)) {
					model[c] = 0;
				}
			}
			args = [set];
			set = next;
		}

		const data = set.data;
		const problem = checkData(data);
		if (problem) {
			fail('data isn’t sorted and merged', problem);
			return failures;
		}
		const want = modelToData(model);
		if (!sameArray(data, want)) {
			fail('data differs from the model', `got ${JSON.stringify(data).slice(0, 200)}\nwant ${JSON.stringify(want).slice(0, 200)}`);
			return failures;
		}
		// The set must not share data with its arguments: change them all, and
		// check again.
		for (const argument of args) {
			for (const other of setsIn(argument)) {
				other.addRange(0, MAX);
			}
		}
		if (!sameArray(set.data, want)) {
			fail('set shares data with an argument', '');
			return failures;
		}
	}

	const array = set.toArray();
	const wantData = modelToData(model);
	const size = sizeOf(wantData);
	if (size > LARGE) {
		// Check the length and a sample of code points.
		let sampleOk = array.length == size;
		for (let i = 0; sampleOk && i < 200; i++) {
			const index = int(size);
			sampleOk = model[array[index]] == 1 && (index == 0 || array[index - 1] < array[index]);
		}
		if (!sampleOk) {
			fail('toArray differs from the model', `${array.length} code points; want ${size}`);
		}
	} else {
		const wantArray = [];
		for (let index = 0; index < wantData.length; index += 2) {
			for (let c = wantData[index]; c < wantData[index + 1]; c++) {
				wantArray.push(c);
			}
		}
		if (!sameArray(array, wantArray)) {
			fail('toArray differs from the model', '');
		}
		if (!sameArray(set.valueOf(), array)) {
			fail('valueOf differs from toArray', '');
		}
	}
	for (let i = 0; i < 30; i++) {
		const c = codePoint();
		const form = int(3);
		const got = set.contains(form === 0 ? c : form === 1 ? symbol(c) : new Number(c));
		if (got !== Boolean(model[c])) {
			fail('contains disagrees with the model', `${['code point', 'symbol', 'Number object'][form]} ${hex(c)}: got ${got}`);
			break;
		}
	}
	const outputs = checkOutput(set, model, random, fail);
	if (!outputs) {
		return failures;
	}
	// The output must only depend on the contents, not on how the set was built.
	const rebuilt = size > LARGE ? regenerate().add(set.clone()) : regenerate(array);
	for (const options of [undefined, { bmpOnly: true }, { hasUnicodeFlag: true }]) {
		if (rebuilt.toString(options) !== set.toString(options)) {
			fail(
				`toString(${options ? JSON.stringify(options) : ''}) depends on how the set was built`,
				`built: ${set.toString(options).slice(0, 150)}\nfresh: ${rebuilt.toString(options).slice(0, 150)}`
			);
		}
	}
	if (set.toString() !== outputs.plain) {
		fail('toString() changes between calls', '');
	}
	return failures;
};

const checkData = (data) => {
	if (!Array.isArray(data) || data.length % 2) {
		return 'not an array of pairs';
	}
	for (let index = 0; index < data.length; index += 2) {
		const start = data[index];
		const end = data[index + 1];
		if (!Number.isInteger(start) || !Number.isInteger(end)) {
			return `pair ${index} isn’t made of primitive integers`;
		}
		if (!(start < end) || start < 0 || end > MAX + 1) {
			return `pair ${index} is invalid: [${start}, ${end})`;
		}
		if (index && !(data[index - 1] < start)) {
			return `pair ${index} isn’t sorted or merged`;
		}
	}
	return null;
};

// Checks that each kind of output matches exactly the code points in the set:
// around every range boundary, at random, and for every combination of the
// high and low surrogates in play (to catch over-merged surrogate classes).
const checkOutput = (set, model, random, fail) => {
	const data = modelToData(model);
	const probes = new Set([0x0, 0xD7FF, 0xD800, 0xDBFF, 0xDC00, 0xDFFF, 0xE000, 0xFFFF, 0x10000, MAX]);
	for (const boundary of data) {
		for (const delta of [-1, 0, 1]) {
			const c = boundary + delta;
			if (c >= 0 && c <= MAX) {
				probes.add(c);
			}
		}
	}
	const highs = new Set();
	const lows = new Set();
	for (let index = 0; index < data.length; index += 2) {
		for (const c of [data[index], data[index + 1] - 1]) {
			if (c > 0xFFFF) {
				highs.add(0xD800 + ((c - 0x10000) >> 10));
				lows.add(0xDC00 + ((c - 0x10000) & 0x3FF));
			}
		}
	}
	for (const high of highs) {
		for (const low of lows) {
			probes.add(0x10000 + ((high - 0xD800) << 10) + (low - 0xDC00));
		}
	}
	for (let i = 0; i < 40; i++) {
		probes.add(random.codePoint());
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
			unicodeSets: supportsUnicodeSetsFlag ?
				new RegExp(`^(?:${set.toRegExp('v').source})$`, 'v') :
				null,
		};
	} catch (exception) {
		fail('output doesn’t compile', exception.message.slice(0, 160));
		return null;
	}
	if (set.toRegExp().source !== new RegExp(outputs.plain).source) {
		fail('toRegExp() differs from toString()', outputs.plain.slice(0, 200));
	}
	const withFlags = set.toRegExp('gu');
	if (withFlags.source !== new RegExp(outputs.unicode, 'u').source || withFlags.flags !== 'gu') {
		fail("toRegExp('gu') differs from toString({ hasUnicodeFlag: true })", outputs.unicode.slice(0, 200));
	}
	for (const c of probes) {
		const string = symbol(c);
		const want = Boolean(model[c]);
		const check = (name, regex, pattern) => {
			if (regex.test(string) !== want) {
				fail(
					`${name} matches the wrong code points`,
					`${hex(c)} should ${want ? '' : 'not '}match; pattern ${pattern.slice(0, 200)}`
				);
			}
		};
		check('toString()', regexes.plain, outputs.plain);
		check('toString({ hasUnicodeFlag: true })', regexes.unicode, outputs.unicode);
		if (regexes.unicodeSets) {
			check("toRegExp('v')", regexes.unicodeSets, outputs.unicode);
		}
		if (c <= 0xFFFF) {
			check('toString({ bmpOnly: true })', regexes.bmpOnly, outputs.bmpOnly);
		}
		// An astral symbol that isn't in the set mustn't be matched anywhere,
		// even partially through one of its surrogates.
		if (c > 0xFFFF && !want && regexes.plainSearch.test(string)) {
			fail('toString() matches part of a surrogate pair', `${hex(c)}; pattern ${outputs.plain.slice(0, 200)}`);
		}
	}
	return outputs;
};
