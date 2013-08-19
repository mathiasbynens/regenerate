/*! http://mths.be/regenerate v0.5.4 by @mathias | MIT license */
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

	var extend = function(destination, source) {
		var key;
		for (key in source) {
			if (hasOwnProperty.call(source, key)) {
				destination[key] = source[key];
			}
		}
		return destination;
	};

	var toString = object.toString;
	var isArray = function(value) {
		return toString.call(value) == '[object Array]';
	};
	var isNumber = function(value) {
		return typeof value == 'number' ||
			toString.call(value) == '[object Number]';
	};
	var isString = function(value) {
		return typeof value == 'string' ||
			toString.call(value) == '[object String]';
	};
	var isFunction = function(value) {
		return typeof value == 'function';
	};

	var map = function(array, callback) {
		var index = -1;
		var length = array.length;
		while (++index < length) {
			array[index] = callback(array[index]);
		}
		return array;
	};

	var forEach = function(array, callback) {
		var index = -1;
		var length = array.length;
		while (++index < length) {
			callback(array[index], index);
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

	var sortUniqueNumbers = function(array) {
		// Sort numerically in ascending order
		array = array.sort(function(a, b) {
			return a - b;
		});
		// Remove duplicates
		var previous;
		var result = [];
		forEach(array, function(item, index) {
			if (previous != item) {
				result.push(item);
				previous = item;
			}
		});
		return result;
	};

	// This assumes that `number` is a positive integer that `toString()`s nicely
	// (which is the case for all code point values).
	var zeroes = '0000';
	var pad = function(number, totalCharacters) {
		var string = String(number);
		return string.length < totalCharacters
			? (zeroes + string).slice(-totalCharacters)
			: string;
	};

	var hex = function(number) {
		return Number(number).toString(16).toUpperCase();
	};

	var slice = [].slice;

	/*--------------------------------------------------------------------------*/

	var range = function(start, stop) {
		// inclusive, e.g. `range(1, 3)` → `[1, 2, 3]`
		if (stop < start) {
			throw Error('A range\u2019s `stop` value must be greater than or equal ' +
				'to the `start` value.');
		}
		for (var result = []; start <= stop; result.push(start++));
		return result;
	};

	var ranges = function(codePointRanges) {
		if (!isArray(codePointRanges)) {
			throw TypeError('ranges(): The `codePointRanges` argument must be an ' +
				'array.');
		}

		if (!codePointRanges.length) {
			return [];
		}

		var codePoints = [];
		forEach(codePointRanges, function(codePointRange) {
			// If it’s a single code point (not a range)
			if (!isArray(codePointRange)) {
				codePoints.push(codePointRange);
				return;
			}
			// If it’s a range (not a single code point)
			var start = codePointRange[0];
			var stop = codePointRange[1];
			codePoints = codePoints.concat(range(start, stop));
		});
		return codePoints;
	};

	var contains = function(array, value) {
		var index = -1;
		var length = array.length;
		while (++index < length) {
			if (array[index] == value) {
				return true;
			}
		}
		return false;
	};

	var difference = function(a, b) {
		var index = -1;
		var length = a.length;
		var result = [];
		var value;
		while (++index < length) {
			value = a[index];
			if (!contains(b, value)) {
				result.push(value);
			}
		}
		return result;
	};

	var intersection = function(a, b) {
		var index = -1;
		var length = a.length;
		var result = [];
		var value;
		while (++index < length) {
			value = a[index];
			if (contains(b, value)) {
				result.push(value);
			}
		}
		return result;
	};

	var add = function(destination, value) {
		if (!isArray(destination)) {
			throw TypeError('add(): The `destination` argument must be an array.');
		}
		if (isNumber(value)) {
			destination.push(Number(value));
			return destination;
		}
		if (isString(value)) {
			destination.push(symbolToCodePoint(value));
			return destination;
		}
		if (isArray(value)) {
			forEach(value, function(item) {
				destination = add(destination, item);
			});
			return destination;
		}
		return destination;
	};

	var remove = function(destination, value) {
		if (!isArray(destination)) {
			throw TypeError('remove(): The `destination` argument must be an array.');
		}
		if (isFunction(value)) {
			var array = [];
			forEach(destination, function(item) {
				if (!value(item)) {
					array.push(item);
				}
			});
			return array;
		}
		if (isNumber(value)) {
			return difference(destination, [value]);
		}
		if (isString(value)) {
			return difference(destination, [symbolToCodePoint(value)]);
		}
		if (isArray(value)) {
			forEach(value, function(item) {
				destination = remove(destination, item);
			});
			return destination;
		}
		return destination;
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
		//
		//     string = '\\u' + pad(hex(highSurrogate(codePoint)), 4)
		//     	+ '\\u' + pad(hex(lowSurrogate(codePoint)), 4);

		return string;
	};

	// Based on `punycode.ucs2.decode`: http://mths.be/punycode
	var symbolToCodePoint = function(symbol) {
		var length = symbol.length;
		var value = symbol.charCodeAt(0);
		var extra;
		if ((value & 0xF800) == 0xD800 && length > 1) {
			// `value` is a high surrogate, and there is a next character — assume
			// it’s a low surrogate (else it’s invalid use of Regenerate anyway).
			extra = symbol.charCodeAt(1);
			return ((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;
		} else {
			return value;
		}
	};

	var createBMPCharacterClasses = function(codePoints) {
		var tmp = '';
		var start = codePoints[0];
		var end = start;
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
				tmp += codePointToString(start);
				counter += 1;
			} else if (end == start + 1) {
				tmp += codePointToString(start) + codePointToString(end);
				counter += 2;
			} else {
				tmp += codePointToString(start) + '-' + codePointToString(end);
				counter += 2;
			}
			start = code;
			end = code;
			predict = code + 1;
		});

		if (start == end) {
			tmp += codePointToString(start);
			counter += 1;
		} else if (end == start + 1) {
			tmp += codePointToString(start) + codePointToString(end);
			counter += 2;
		} else {
			tmp += codePointToString(start) + '-' + codePointToString(end);
			counter += 2;
		}

		if (counter == 1) {
			return tmp;
		} else {
			return '[' + tmp + ']';
		}
	};

	// In Regenerate output, `\0` will never be preceded by `\` because we sort
	// by code point value, so let’s keep this regular expression simple:
	var regexNull = /\\x00([^0123456789]|$)/g;
	var createCharacterClasses = function(codePoints) {
		// At this point, it’s safe to assume `codePoints` is a sorted array of
		// numeric code point values.
		var bmp = [];
		var astralMap = {};
		var surrogates = [];
		var hasAstral = false;

		forEach(codePoints, function(codePoint) {
			if (codePoint >= 0xD800 && codePoint <= 0xDBFF) {
				// If a high surrogate is followed by a low surrogate, the two code
				// units should be matched together, so that the regex always matches a
				// full code point. For this reason, separate code points that are
				// (unmatched) high surrogates are tracked separately, so they can be
				// moved to the end if astral symbols are to be matched as well.
				surrogates.push(codePoint);
			} else if (codePoint >= 0x0000 && codePoint <= 0xFFFF) {
				// non-surrogate BMP code point
				bmp.push(codePoint);
			} else if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
				// astral code point
				hasAstral = true;
				append(
					astralMap,
					highSurrogate(codePoint),
					lowSurrogate(codePoint)
				);
			} else {
				throw RangeError('Invalid code point value. Code points range from ' +
					'U+000000 to U+10FFFF.');
			}
		});

		var astralMapByLowRanges = {};

		forOwn(astralMap, function(highSurrogate, lowSurrogate) {
			var bmpRange = createBMPCharacterClasses(lowSurrogate);
			append(astralMapByLowRanges, bmpRange, +highSurrogate);
		});

		var tmp = [];
		// If we’re not dealing with any astral symbols, there’s no need to move
		// individual code points that are high surrogates to the end of the regex.
		if (!hasAstral && surrogates.length) {
			bmp = sortUniqueNumbers(bmp.concat(surrogates));
		}
		if (bmp.length) {
			tmp.push(createBMPCharacterClasses(bmp));
		}
		forOwn(astralMapByLowRanges, function(lowSurrogate, highSurrogate) {
			tmp.push(createBMPCharacterClasses(highSurrogate) + lowSurrogate);
		});
		// Individual code points that are high surrogates must go at the end
		// if astral symbols are to be matched as well.
		if (hasAstral && surrogates.length) {
			tmp.push(createBMPCharacterClasses(surrogates));
		}
		return tmp
			.join('|')
			// Use `\0` instead of `\x00` where possible
			.replace(regexNull, '\\0$1');
	};

	var fromCodePoints = function(codePoints) {
		if (!isArray(codePoints)) {
			throw TypeError('fromCodePoints(): The `codePoints` argument must be ' +
				'an array.');
		}

		if (!codePoints.length) {
			return '';
		}

		codePoints = sortUniqueNumbers(codePoints);

		return createCharacterClasses(codePoints);
	};

	var fromCodePointRange = function(start, end) {
		return createCharacterClasses(range(start, end));
	};

	var fromCodePointRanges = function(codePointRanges) {
		if (!isArray(codePointRanges)) {
			throw TypeError('fromCodePointRanges(): The `ranges` argument must be ' +
				'an array.');
		}

		if (!codePointRanges.length) {
			return '';
		}

		return createCharacterClasses(ranges(codePointRanges));
	};

	var fromSymbols = function(symbols) {
		if (!isArray(symbols)) {
			throw TypeError('fromSymbols(): The `symbols` argument must be an ' +
				'array.');
		}

		if (!symbols.length) {
			return '';
		}

		var codePoints = map(symbols, symbolToCodePoint);

		// Sort code points numerically
		codePoints = codePoints.sort(function(a, b) {
			return a - b;
		});

		return createCharacterClasses(codePoints);
	};

	var fromSymbolRange = function(start, end) {
		return createCharacterClasses(
			range(symbolToCodePoint(start), symbolToCodePoint(end))
		);
	};

	var fromSymbolRanges = function(symbolRanges) {
		if (!isArray(symbolRanges)) {
			throw TypeError('fromSymbolRanges(): The `ranges` argument must be an ' +
				'array.');
		}

		if (!symbolRanges.length) {
			return '';
		}

		var codePoints = [];
		forEach(symbolRanges, function(symbolRange) {
			// If it’s a single symbol (not a range)
			if (!isArray(symbolRange)) {
				codePoints.push(symbolToCodePoint(symbolRange));
				return;
			}
			// If it’s a range (not a single code point)
			var start = symbolToCodePoint(symbolRange[0]);
			var stop = symbolToCodePoint(symbolRange[1]);
			codePoints = codePoints.concat(range(start, stop));
		});
		return createCharacterClasses(codePoints);
	};

	/*--------------------------------------------------------------------------*/

	var Set = function(value) {
		this.__codePoints__ = [];
		return this;
	};

	var proto = Set.prototype;
	extend(proto, {
		'add': function(value) {
			if (arguments.length > 1) {
				value = slice.call(arguments);
			}
			this.__codePoints__ = add(this.__codePoints__, value);
			return this;
		},
		'remove': function(value) {
			if (arguments.length > 1) {
				value = slice.call(arguments);
			}
			this.__codePoints__ = remove(this.__codePoints__, value);
			return this;
		},
		'addRange': function(start, end) {
			this.__codePoints__ = add(this.__codePoints__, range(
				isNumber(start) ? start : symbolToCodePoint(start),
				isNumber(end) ? end : symbolToCodePoint(end)
			));
			return this;
		},
		'removeRange': function(start, end) {
			var startCodePoint = isNumber(start) ? start : symbolToCodePoint(start);
			var endCodePoint = isNumber(end) ? end : symbolToCodePoint(end);
			var array = [];
			forEach(this.__codePoints__, function(codePoint) {
				if (codePoint < startCodePoint || codePoint > endCodePoint) {
					array.push(codePoint);
				}
			});
			this.__codePoints__ = array;
			return this;
		},
		'difference': function(array) {
			this.__codePoints__ = difference(this.__codePoints__, array);
			return this;
		},
		'intersection': function(array) {
			this.__codePoints__ = intersection(this.__codePoints__, array);
			return this;
		},
		'contains': function(codePoint) {
			return contains(
				this.__codePoints__,
				isNumber(codePoint) ? codePoint : symbolToCodePoint(codePoint)
			);
		},
		'toString': function() {
			this.__codePoints__ = sortUniqueNumbers(this.__codePoints__);
			return createCharacterClasses(this.__codePoints__);
		},
		'toRegExp': function() {
			this.__codePoints__ = sortUniqueNumbers(this.__codePoints__);
			return RegExp(createCharacterClasses(this.__codePoints__));
		},
		'valueOf': function() { // has alias `toArray`
			this.__codePoints__ = sortUniqueNumbers(this.__codePoints__);
			return this.__codePoints__;
		}
	});

	proto.toArray = proto.valueOf;

	var set = function(value) {
		if (value instanceof Set) {
			// this is already a set; don’t wrap it again
			return value;
		} else if (arguments.length > 1) {
			value = slice.call(arguments);
		}
		return (new Set).add(value);
	};

	extend(set, {
		'version': '0.5.4',
		'fromCodePoints': fromCodePoints,
		'fromCodePointRange': fromCodePointRange,
		'fromCodePointRanges': fromCodePointRanges,
		'fromSymbols': fromSymbols,
		'fromSymbolRange': fromSymbolRange,
		'fromSymbolRanges': fromSymbolRanges,
		'range': range,
		'ranges': ranges,
		'contains': contains,
		'difference': difference,
		'intersection': intersection,
		'add': add,
		'remove': remove
	});

	var regenerate = set;

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
			freeExports.regenerate = regenerate;
		}
	} else { // in Rhino or a web browser
		root.regenerate = regenerate;
	}

}(this));
