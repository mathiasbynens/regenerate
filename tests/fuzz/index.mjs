// Runs the fuzzers in this directory.
//
//     npm run fuzz -- [options]
//
// Options:
//   --duration <seconds>   time to spend on each fuzzer (default: 10)
//   --seed <number>        base seed; random by default, and always printed
//   --fuzzer <name>        only run this fuzzer (operations, strings,
//                          surrogates, or windows); can be repeated
//   --replay <seed>        run the single case with this seed, as printed for
//                          a failure, with `--fuzzer`
//   --implementation <path>  fuzz another copy of `regenerate.js`
//
// Exits with status 1 if any case fails.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as operations from './operations.mjs';
import * as strings from './strings.mjs';
import * as surrogates from './surrogates.mjs';
import * as windows from './windows.mjs';

// Extend `Object.prototype` to see if Regenerate can handle it, like the tests
// do. 0xD834 is the high surrogate code point for U+1D306 (among others).
Object.prototype[0xD834] = true;

const FUZZERS = [operations, strings, surrogates, windows];

// Seeds are unsigned 32-bit integers, written in decimal as they're printed.
const parseSeed = (arg, text) => {
	if (!/^\d+$/.test(text) || Number(text) > 0xFFFFFFFF) {
		throw new Error(`${arg} must be an integer from 0 to ${0xFFFFFFFF}`);
	}
	return Number(text);
};

const parseOptions = (args) => {
	const options = { duration: 10, seed: null, fuzzers: [], replay: null, implementation: null };
	for (let index = 0; index < args.length; index++) {
		const arg = args[index];
		const next = () => {
			if (index + 1 >= args.length) {
				throw new Error(`Missing value for ${arg}`);
			}
			return args[++index];
		};
		if (arg === '--duration') {
			options.duration = Number(next());
		} else if (arg === '--seed') {
			options.seed = parseSeed(arg, next());
		} else if (arg === '--fuzzer') {
			options.fuzzers.push(next());
		} else if (arg === '--replay') {
			options.replay = parseSeed(arg, next());
		} else if (arg === '--implementation') {
			options.implementation = next();
		} else {
			throw new Error(`Unknown option: ${arg}`);
		}
	}
	for (const name of options.fuzzers) {
		if (!FUZZERS.some((fuzzer) => fuzzer.name === name)) {
			throw new Error(`Unknown fuzzer: ${name}`);
		}
	}
	if (options.replay !== null && options.fuzzers.length !== 1) {
		throw new Error('--replay needs exactly one --fuzzer');
	}
	if (!(options.duration > 0)) {
		throw new Error('--duration must be a positive number of seconds');
	}
	return options;
};

// Spreads case seeds over the 32-bit range, so that nearby base seeds don't
// repeat each other's cases.
const caseSeed = (baseSeed, index) => (baseSeed + Math.imul(index, 0x9E3779B1)) >>> 0;

// Runs one case, turning an unexpected exception into a failure.
const runCase = (fuzzer, seed, regenerate) => {
	let failures;
	try {
		failures = fuzzer.runCase(seed, regenerate);
	} catch (exception) {
		failures = [{
			kind: 'case throws',
			detail: String(exception && exception.stack || exception),
			repro: '(replay the case to see the code)',
		}];
	}
	return failures.map((failure) => Object.assign({ seed }, failure));
};

const report = (fuzzer, failures, replayOptions) => {
	// A case can fail the same way more than once, so count the cases by seed.
	const byKind = new Map();
	for (const failure of failures) {
		const entry = byKind.get(failure.kind);
		if (entry) {
			entry.seeds.add(failure.seed);
		} else {
			byKind.set(failure.kind, { seeds: new Set([failure.seed]), first: failure });
		}
	}
	for (const [kind, { seeds, first }] of byKind) {
		const count = seeds.size;
		console.log(`\n  ✖ ${kind} (${count} case${count == 1 ? '' : 's'})`);
		if (first.detail) {
			console.log(`    ${first.detail.replace(/\n/g, '\n    ')}`);
		}
		console.log(`    Replay: npm run fuzz -- --fuzzer ${fuzzer.name} --replay ${first.seed}${replayOptions}`);
		console.log(`    ${first.repro.replace(/\n/g, '\n    ')}`);
	}
};

const main = async () => {
	const options = parseOptions(process.argv.slice(2));
	const implementation = options.implementation ?
		path.resolve(options.implementation) :
		fileURLToPath(new URL('../../regenerate.js', import.meta.url));
	// `regenerate.js` is a CommonJS module, so it's the default export.
	const { default: regenerate } = await import(pathToFileURL(implementation).href);
	if (typeof regenerate != 'function') {
		throw new Error(`${implementation} doesn’t export the regenerate function`);
	}
	const replayOptions = options.implementation ?
		` --implementation ${JSON.stringify(options.implementation)}` :
		'';
	const fuzzers = options.fuzzers.length ?
		FUZZERS.filter((fuzzer) => options.fuzzers.includes(fuzzer.name)) :
		FUZZERS;

	if (options.replay !== null) {
		const fuzzer = fuzzers[0];
		const failures = runCase(fuzzer, options.replay, regenerate);
		console.log(`${fuzzer.name}: case ${options.replay}: ${failures.length ? 'failed' : 'passed'}`);
		report(fuzzer, failures, replayOptions);
		process.exitCode = failures.length ? 1 : 0;
		return;
	}

	const baseSeed = options.seed === null ?
		Math.floor(Math.random() * 0x100000000) :
		options.seed;
	console.log(`Fuzzing ${path.relative(process.cwd(), implementation) || implementation} with seed ${baseSeed} for ${options.duration}s per fuzzer`);
	let failed = false;
	for (const fuzzer of fuzzers) {
		const failures = [];
		const deadline = Date.now() + options.duration * 1000;
		let cases = 0;
		while (Date.now() < deadline) {
			failures.push(...runCase(fuzzer, caseSeed(baseSeed, cases++), regenerate));
		}
		console.log(`${failures.length ? '✖' : '✔'} ${fuzzer.name}: ${cases} cases, ${failures.length} failure${failures.length == 1 ? '' : 's'}`);
		if (failures.length) {
			failed = true;
			report(fuzzer, failures, replayOptions);
		}
	}
	process.exitCode = failed ? 1 : 0;
};

try {
	await main();
} catch (exception) {
	console.error(exception.message);
	process.exitCode = 2;
}
