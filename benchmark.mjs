// Benchmarks for Regenerate
//
//     node --expose-gc --experimental-bench --bench benchmark.mjs
//
// `--expose-gc` is optional but reduces noise: garbage is collected before
// each sample instead of during it. Other runner options can be appended, e.g.
// `--bench-name-pattern=toString` or `--bench-reporter=json`.

import { bench, suite } from 'node:bench';
import regenerate from './regenerate.js';

// All code points matching `regex`, in ascending order.
const codePointsMatching = (regex) => {
	const result = [];
	for (let codePoint = 0; codePoint <= 0x10FFFF; codePoint++) {
		if (regex.test(String.fromCodePoint(codePoint))) {
			result.push(codePoint);
		}
	}
	return result;
};

// Every other code point in `[start, end)`, i.e. one range per code point.
// This is the worst case for anything that scans or splices the range list.
const everyOther = (start, end) => {
	const result = [];
	for (let codePoint = start; codePoint < end; codePoint += 2) {
		result.push(codePoint);
	}
	return result;
};

const inputs = [
	{ name: '\\p{N}', codePoints: codePointsMatching(/\p{N}/u) },
	{ name: '\\p{L}', codePoints: codePointsMatching(/\p{L}/u) },
	{
		name: '\\p{Script=Han}',
		codePoints: codePointsMatching(/\p{Script=Han}/u),
	},
	{ name: 'every other BMP', codePoints: everyOther(0, 0x10000) },
].map((input) => {
	const set = regenerate(input.codePoints);
	const ranges = [];
	for (let index = 0; index < set.data.length; index += 2) {
		ranges.push([set.data[index], set.data[index + 1] - 1]);
	}
	// A second set whose code points interleave with the first one, so that
	// merging the two touches every range.
	const other = regenerate(
		input.codePoints.map((codePoint) => codePoint + 1)
			.filter((codePoint) => codePoint <= 0x10FFFF)
	);
	return {
		...input,
		set,
		ranges,
		other,
		otherArray: other.toArray(),
		params: {
			input: input.name,
			codePoints: input.codePoints.length,
			ranges: ranges.length,
		},
	};
});

// Fast operations are repeated within each sample until the sample takes at
// least this long, so that timer reads and per-sample overhead don't dominate
// the result.
const TARGET_SAMPLE_NS = 10_000_000n; // 10 ms
const MAX_REPEAT = 1 << 20;

// Each benchmark takes up to `MAX_SAMPLES` measured samples, but stops early
// via `context.done()` once it has `MIN_SAMPLES` and has spent
// `TIME_BUDGET_NS` in measured regions. This keeps the slowest benchmarks
// (hundreds of milliseconds per sample) from dominating the run.
const MAX_SAMPLES = 15;
const MIN_SAMPLES = 5;
const TIME_BUDGET_NS = 1_000_000_000n; // 1 s

// Declares one benchmark per input.
//
// * `prepare(input)` returns the state for one call to `run`, e.g. a fresh
//   clone of a set that `run` mutates. It is called once per repetition and
//   is never timed. By default, `run` receives `input` itself.
// * `run(state, input)` performs the measured operation and returns a number
//   derived from its result, e.g. the length of the output. The sum over all
//   repetitions is checked after each sample, so the work can't be optimized
//   away.
// * `operations(input)` is the number of operations one call to `run`
//   performs. **Default:** 1.
//
// The warmup invocation calibrates how often `run` is repeated per sample by
// doubling the repeat count until a batch reaches `TARGET_SAMPLE_NS`. When
// warmup is disabled (`--bench-warmup=0`), the first measured sample
// calibrates instead. Every sample's `detail` records the repeat count.
const benchEach = (name, {
	prepare = (input) => input,
	run,
	operations = () => 1,
}) => {
	for (const input of inputs) {
		const operationsPerRun = operations(input);
		let repeat = 0;
		let expected;
		let elapsed = 0n;

		const prepareAll = (count) => {
			const states = new Array(count);
			for (let index = 0; index < count; index++) {
				states[index] = prepare(input);
			}
			return states;
		};
		const runAll = (states) => {
			let total = 0;
			for (let index = 0; index < states.length; index++) {
				total += run(states[index], input);
			}
			return total;
		};
		const check = (total, count) => {
			if (total !== expected * count) {
				throw new Error(
					`Unexpected result: ${total} after ${count} runs, expected ` +
					`${expected} per run`
				);
			}
		};
		// Stops the benchmark once it has used up its time budget.
		const account = (b, sample) => {
			if (b.phase !== 'measurement') {
				return;
			}
			elapsed += sample.duration_ns;
			if (b.index + 1 >= MIN_SAMPLES && elapsed >= TIME_BUDGET_NS) {
				b.done();
			}
		};

		bench(name, {
			samples: MAX_SAMPLES,
			warmup: 1,
			params: input.params,
		}, (b) => {
			if (!repeat) {
				expected = run(prepare(input), input);
				let count = 1;
				let total;
				let duration;
				for (;;) {
					const states = prepareAll(count);
					const start = process.hrtime.bigint();
					total = runAll(states);
					duration = process.hrtime.bigint() - start;
					if (duration >= TARGET_SAMPLE_NS || count >= MAX_REPEAT) {
						break;
					}
					count *= 2;
				}
				check(total, count);
				repeat = count;
				account(b, b.record({
					operations: count * operationsPerRun,
					duration_ns: duration,
					detail: { repeat },
				}));
				return;
			}
			// Collect garbage from earlier samples outside the measured region, when
			// running with `--expose-gc`. This must happen before `prepareAll()`:
			// a full GC promotes the freshly prepared states to old space, which
			// makes `splice`-heavy operations on them about 3 times slower.
			globalThis.gc?.();
			const states = prepareAll(repeat);
			b.start();
			const total = runAll(states);
			const sample = b.end(repeat * operationsPerRun, { detail: { repeat } });
			check(total, repeat);
			account(b, sample);
		});
	}
};

const clone = ({ set }) => set.clone();

suite('construct', () => {
	benchEach('regenerate(array)', {
		run: ({ codePoints }) => regenerate(codePoints).data.length,
	});

	benchEach('addRange, ascending', {
		run: ({ ranges }) => {
			const set = regenerate();
			for (const [start, end] of ranges) {
				set.addRange(start, end);
			}
			return set.data.length;
		},
		operations: ({ ranges }) => ranges.length,
	});

	benchEach('addRange, descending', {
		run: ({ ranges }) => {
			const set = regenerate();
			for (let index = ranges.length - 1; index >= 0; index--) {
				set.addRange(ranges[index][0], ranges[index][1]);
			}
			return set.data.length;
		},
		operations: ({ ranges }) => ranges.length,
	});
});

suite('modify', () => {
	benchEach('add(set)', {
		prepare: clone,
		run: (set, { other }) => set.add(other).data.length,
	});

	benchEach('remove(set)', {
		prepare: clone,
		run: (set, { other }) => set.remove(other).data.length,
	});

	benchEach('remove(array)', {
		prepare: clone,
		run: (set, { otherArray }) => set.remove(otherArray).data.length,
	});

	benchEach('addRange spanning all ranges', {
		prepare: clone,
		run: (set, { ranges }) =>
			set.addRange(ranges[0][0], ranges[ranges.length - 1][1]).data.length,
	});

	benchEach('removeRange spanning all ranges', {
		prepare: clone,
		run: (set, { ranges }) =>
			set.removeRange(ranges[0][0], ranges[ranges.length - 1][1]).data.length,
	});
});

suite('query', () => {
	benchEach('intersection(set)', {
		prepare: clone,
		run: (set, { other }) => set.intersection(other).data.length,
	});

	benchEach('intersection(array)', {
		prepare: clone,
		run: (set, { otherArray }) => set.intersection(otherArray).data.length,
	});

	const lookups = 10_000;
	benchEach('contains', {
		run: ({ set }) => {
			let found = 0;
			for (let index = 0; index < lookups; index++) {
				// Spread the lookups across the whole code point space.
				found += set.contains((index * 7919) % 0x110000);
			}
			return found;
		},
		operations: () => lookups,
	});
});

suite('output', () => {
	benchEach('toString()', {
		run: ({ set }) => set.toString().length,
	});

	benchEach('toString({ bmpOnly: true })', {
		run: ({ set }) => set.toString({ bmpOnly: true }).length,
	});

	benchEach('toString({ hasUnicodeFlag: true })', {
		run: ({ set }) => set.toString({ hasUnicodeFlag: true }).length,
	});

	benchEach('toArray()', {
		run: ({ set }) => set.toArray().length,
	});
});
