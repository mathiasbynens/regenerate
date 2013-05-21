/*! http://mths.be/regenerate v0.1.0 by @mathias */
;(function(root) {

	// Detect free variables `exports`
	var freeExports = typeof exports == 'object' && exports;

	// Detect free variable `module`
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;

	// Detect free variable `global`, from Node.js or Browserified code,
	// and use it as `root`
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/*--------------------------------------------------------------------------*/

	var object = {};
	var hasOwnProperty = object.hasOwnProperty;
	var hasKey = function(object, key) {
		return hasOwnProperty.call(object, key);
	};

	var toString = object.toString;
	var isArray = function(object) {
		return toString.call(object) == '[object Array]';
	};

	var forEach = function(array, callback) {
		var index = -1;
		var length = array.length;
		while (++index < length) {
			callback(array[index]);
		}
	};

	var forOwn = function(object, callback) {
		var key;
		for (key in object) {
			if (hasKey(object, key)) {
				callback(key, object[key]);
			}
		}
	};

	var append = function(object, key, value) {
		if (hasKey(object, key)) {
			object[key].push(value);
		} else {
			object[key] = [value];
		}
	};

	var range = function(start, stop) { // inclusive, e.g. `range(1, 3)` → `[1, 2, 3]`
		if (stop < start) {
			throw Error('A range\u2019s `stop` value must be greater than or equal to the `start` value.');
		}
		for (var result = []; start <= stop; result.push(start++));
		return result;
	};

	// This assumes that `number` is a positive integer that `toString()`s nicely
	// (which is the case for all code point values).
	var pad = function(number, totalCharacters) {
		var string = String(number);
		return string.length < totalCharacters
			? (Array(totalCharacters + 1).join('0') + string).slice(-totalCharacters)
			: string;
	};

	var hex = function(number) {
		return Number(number).toString(16).toUpperCase();
	};

	/*--------------------------------------------------------------------------*/

	// http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
	var floor = Math.floor;
	var highSurrogate = function(codePoint) {
		return parseInt(floor((codePoint - 0x10000) / 0x400) + 0xD800, 10);
	};

	var lowSurrogate = function(codePoint) {
		return parseInt((codePoint - 0x10000) % 0x400 + 0xDC00, 10);
	};

	var stringFromCharCode = String.fromCharCode;
	var codePointToString = function(codePoint) {
		var string;
		if (
			(codePoint >= 0x41 && codePoint <= 0x5A) ||
			(codePoint >= 0x61 && codePoint <= 0x7A) ||
			(codePoint >= 0x30 && codePoint <= 0x39)
		) {
			// [a-zA-Z0-9]
			string = stringFromCharCode(codePoint);
		} else if (codePoint <= 0xFF) {
			// http://mathiasbynens.be/notes/javascript-escapes#hexadecimal
			string = '\\x' + pad(hex(codePoint), 2);
		} else { // if (codePoint <= 0xFFFF)
			// http://mathiasbynens.be/notes/javascript-escapes#unicode
			string = '\\u' + pad(hex(codePoint), 4);
		}

		// There’s no need to account for astral symbols / surrogate pairs here,
		// since `codePointToString` is private and only used for BMP code points.
		// But if that’s what you need, just add an `else` block with this code:
		//     string = '\\u' + pad(hex(highSurrogate(codePoint)), 4)
		//     	+ '\\u' + pad(hex(lowSurrogate(codePoint)), 4);

		return string;
	};

	var createBMPRange = function(codePoints) {
		var tmp = [];
		var start = codePoints[0];
		var end = codePoints[0];
		var predict = start + 1;

		codePoints = codePoints.slice(1);

		var counter = 0;
		forEach(codePoints, function(code) {
			if (predict == code) {
				end = code;
				predict = code + 1;
				return;
			}
			if (start == end) {
				tmp.push(codePointToString(start));
				counter += 1;
			} else {
				tmp.push(codePointToString(start) + '-' + codePointToString(end));
				counter += 2;
			}
			start = code;
			end = code;
			predict = code + 1;
		});

		if (start == end) {
			tmp.push(codePointToString(start));
			counter += 1;
		} else if (end == start + 1) {
			tmp.push(codePointToString(start) + codePointToString(end));
			counter += 2;
		} else {
			tmp.push(codePointToString(start) + '-' + codePointToString(end));
			counter += 2;
		}

		if (counter == 1) {
			return tmp.join('');
		} else {
			return '[' + tmp.join('') + ']';
		}
	};

	/*--------------------------------------------------------------------------*/

	var fromCodePoints = function(codePoints) {
		var bmp = [];
		var astralMap = {};
		var surrogates = [];

		if (!isArray(codePoints)) {
			throw TypeError('The argument to `fromCodePoints` must be an array.');
		}

		if (!codePoints.length) {
			return '';
		}

		// Sort code points numerically
		codePoints = codePoints.sort(function(a, b) {
			return a - b;
		});

		forEach(codePoints, function(codePoint) {
			if (codePoint >= 0xD800 && codePoint <= 0xDBFF) {
				// If a high surrogate is followed by a low surrogate, the two code
				// units should be matched together, so that the regex always matches a
				// full code point. For this reason, separate code points that are
				// (unmatched) high surrogates go at the end.
				surrogates.push(codePoint);
			} else if (codePoint >= 0x0000 && codePoint <= 0xFFFF) {
				// non-surrogate BMP code point
				bmp.push(codePoint);
			} else if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
				// astral code point
				append(
					astralMap,
					highSurrogate(codePoint),
					lowSurrogate(codePoint)
				);
			} else {
				throw RangeError('Invalid code point value. Code points range from U+000000 to U+10FFFF.');
			}
		});

		var astralMapByLowRanges = {};

		forOwn(astralMap, function(highSurrogate, lowSurrogate) {
			var bmpRange = createBMPRange(lowSurrogate);
			append(astralMapByLowRanges, bmpRange, +highSurrogate);
			// `astralMapByLowRanges` looks like this:
			// { 'low surrogate range': [list of high surrogates that have this exact low surrogate range] }
		});

		var tmp = [];
		if (bmp.length) {
			tmp.push(createBMPRange(bmp));
		}
		forOwn(astralMapByLowRanges, function(lowSurrogate, highSurrogate) {
			tmp.push(createBMPRange(highSurrogate) + lowSurrogate);
		});
		// individual code points that are high surrogates must go at the end
		if (surrogates.length) {
			tmp.push(createBMPRange(surrogates));
		}
		return tmp
			.join('|')
			// use `\0` instead of `\x00` where possible
			.replace(/\\x00([^01234567]|$)/g, '\\0$1');
	};

	var fromCodePointRange = function(start, end) {
		return fromCodePoints(range(start, end));
	};

	/*--------------------------------------------------------------------------*/

	var regenerate = {
		'version': '0.1.0',
		'fromCodePoints': fromCodePoints,
		'fromCodePointRange': fromCodePointRange,
		// TODO: fromSymbols
		// TODO: fromSymbolRange
		'range': range
	};

	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define(function() {
			return regenerate;
		});
	}	else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = regenerate;
		} else { // in Narwhal or RingoJS v0.7.0-
			forOwn(regenerate, function(key, value) {
				freeExports[key] = value;
			});
		}
	} else { // in Rhino or a web browser
		root.regenerate = regenerate;
	}

}(this));
