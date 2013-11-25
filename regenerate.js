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

	// TODO:
	// - [x] rewrite data structure to decrease memory usage and allow faster set operations
	// - [x] remove `.remove(fn)` as it won’t be needed anymore (it was only there to provide better performance, which will soon be available at all times anyway)
	// - [ ] rewrite `createCharacterClasses` to make use of the new data structure
	// - [ ] rewrite `difference` to make use of the new data structure
	// - [ ] rewrite `intersection` to make use of the new data structure
	// - [ ] deprecate non-chaining APIs?
	// - [ ] optimization: replace calls to `array.splice(a, b, c)` where `b=1` with just `array[a] = c` (and similar for other argument counts)

	function dataFromCodePointRange(start, end) {
		// [0, 1, 2, 3, 4, 5, 6, 7] → [0, 8]
		return [start, end + 1];
	}

	function dataFromCodePoints(codePoints) {
		// [0, 3, 6, 7, 8, 9] → [0, 1, 3, 4, 6, 10]
		var index = -1;
		var length = codePoints.length;
		var max = length - 1;
		var result = [];
		var isStart = true; // start of range or not?
		var tmp;
		var previous = 0;
		while (++index < length) {
			tmp = codePoints[index];
			// console.log(tmp, isStart);
			if (isStart) {
				result.push(tmp);
				// console.log('pushing', tmp);
				previous = tmp;
				isStart = false;
			} else {
				if (tmp == previous + 1) {
					if (index != max) {
						previous = tmp;
						continue;
					} else {
						// console.log('pushing', tmp + 1);
						result.push(tmp + 1);
					}
				} else {
					// console.log('pushing', previous + 1, tmp);
					// End the previous range and start a new one
					result.push(previous + 1, tmp);
					previous = tmp;
				}
			}
		}
		return result;
	}

	// 3,4,5,8,9,10,11 →
	// [3, 6, 8, 12]
	// remove 9 → [3, 6, 8, 9, 10, 12]
	// console.log(dataRemove([3, 6, 8, 12], 9)); // [3, 6, 8, 9, 10, 12]
	function dataRemove(data, codePoint) {
		// iterate over the data per (start, end) pair
		var index = 0;
		var start;
		var end;
		var length = data.length;
		while (index < length) {
			start = data[index];
			end = data[index + 1];
			if (codePoint >= start && codePoint < end) {
				// modify this pair
				if (codePoint == start) {
					if (end == start + 1) {
						// just remove `start` and `end`
						data.splice(index, 2);
						return data;
					} else {
						// just replace `start` with a new value
						data.splice(index, 1, codePoint + 1);
						return data;
					}
				} else if (codePoint == end - 1) {
					// just replace `end` with a new value
					data.splice(index + 1, 1, codePoint);
					return data;
				} else {
					// replace [start, end] with [startA, endA, startB, endB]
					data.splice(index, 2, start, codePoint, codePoint + 1, end);
					return data;
				}
			}
			index += 2;
		}
		return data;
	}

	function dataRemoveRange(data, rangeStart, rangeEnd) {
		if (rangeEnd < rangeStart) {
			throw Error('A range\u2019s `stop` value must be greater than or equal ' +
				'to the `start` value.');
		}
		// iterate over the data per (start, end) pair
		var index = 0;
		var start;
		var end;
		var length = data.length;
		while (index < length) {
			start = data[index];
			end = data[index + 1];

			// exit as soon as no more matching pairs can be found
			if (start > rangeEnd) {
				return data;
			}

			// if the bounds of this pair match the range to be removed exactly
			// e.g. you have `[0, 11, 40, 51]` and want to remove 0-10 → `[40, 51]`
			if (rangeStart == start && rangeEnd + 1 == end) {
				// simply remove this pair
				data.splice(index, 2);
				return data;
			}

			// if both `rangeStart` and `rangeEnd` are within the bounds of this pair
			// e.g. you have `[0, 11]` and want to remove 4-6 → `[0, 4, 7, 11]`
			if (rangeStart >= start && rangeEnd < end) {
				// replace [start, end] with [startA, endA, startB, endB]
				data.splice(index, 2, start, rangeStart, rangeEnd + 1, end);
				return data;
			}

			// if only `rangeStart` is within the bounds of this pair
			// e.g. you have `[0, 11]` and want to remove 4-20 → `[0, 4]`
			if (rangeStart >= start && rangeStart < end) {
				// replace `end` with `rangeStart`
				data.splice(index + 1, 1, rangeStart);
				// NOTE: we cannot `return` just yet, in case any following pairs still
				// contain matching code points
				// e.g. you have `[0, 11, 14, 31]` and want to remove 4-20 → `[0, 4, 21, 31]`
			}

			// if only `rangeEnd` is within the bounds of this pair
			// e.g. you have `[14, 31]` and want to remove 4-20 → `[21, 31]`
			else if (rangeEnd >= start && rangeEnd < end) {
				// just replace `start`
				data.splice(index, 1, rangeEnd + 1);
				return data;
			}

			index += 2;
		}
		return data;
	}

	function dataAdd(data, codePoint) {
		// iterate over the data per (start, end) pair
		var index = 0;
		var start;
		var end;
		var lastIndex = 0;
		var length = data.length;
		while (index < length) {
			start = data[index];
			end = data[index + 1];

			// the code point is already in the set
			if (codePoint >= start && codePoint < end) {
				return data;
			}

			// if `start` is `greater` than `codePoint`, insert a new [start, end] pair
			// before the current pair, or after the current pair if there is a positive
			// last known `lastIndex`
			if (start > codePoint) {
				data.splice(lastIndex ? lastIndex + 2 : 0, 0, codePoint, codePoint + 1);
				return data;
			}

			if (codePoint == end) {
				// Check if adding this code point causes two separate ranges to become a
				// single range, e.g. `dataAdd([0, 4, 5, 10], 4)` → `[0, 10]`
				if (codePoint + 1 == data[index + 2]) {
					data.splice(index, 4, start, data[index + 3]);
					return data;
				}
				// else, just replace `end` with a new value
				data.splice(index + 1, 1, codePoint + 1);
				return data;
			} else if (codePoint == start - 1) {
				// just replace `start` with a new value
				data.splice(index, 1, codePoint);
				return data;
			}
			lastIndex = index;
			index += 2;
		}
		// the loop has finished; add the new pair to the end of the data set
		data.push(codePoint, codePoint + 1);
		return data;
	}

	function dataAddRange(data, rangeStart, rangeEnd) {
		if (rangeEnd < rangeStart) {
			throw Error('A range\u2019s `stop` value must be greater than or equal ' +
				'to the `start` value.');
		}
		// iterate over the data per (start, end) pair
		var index = 0;
		var start;
		var end;
		var added = false;
		var length = data.length;
		while (index < length) {
			start = data[index];
			end = data[index + 1];

			if (added) {
				// The range has already been added to the set; at this point, we just
				// need to get rid of the following ranges in case they overlap.

				// if this range can be combined with the previous range
				if (start == rangeEnd + 1) {
					data.splice(index - 1, 2);
					return data;
				}

				// exit as soon as no more possibly overlapping pairs can be found
				if (start > rangeEnd) {
					return data;
				}

				// e.g. `[0, 11, 12, 16]` and we’ve added 5-15, so we now have →
				// `[0, 16, 12, 16]`. Remove the `12,16` part, as it lies within the [0,16] range that was previously added.
				// start == 12, end == 16
				// rangeStart = 5, rangeEnd = 15
				//
				if (start >= rangeStart && start <= rangeEnd) { // if `start` lies within the range that was previously added

					if (end > rangeStart && end - 1 <= rangeEnd) { // if `end` lies within the range that was previously added as well
						// remove this pair
						data.splice(index, 2);
						index -= 2;
						// note: we cannot `return` just yet, as there may still be other overlapping pairs
					}
					// `start` lies within the range that was previously added, but `end` doesn’t
					else {
						// e.g. `[0, 11, 12, 31]` and we’ve added 5-15, so we now have `[0, 16, 12, 31]`
						// This must be written as `[0, 31]`.
						// remove the previously added `end` and the current `start`
						data.splice(index - 1, 2);
						index -= 2;
					}

					// note: we cannot return yet
				}

			}

			// check if a new pair must be inserted *before* the current one
			else if (start > rangeEnd) {
				data.splice(index, 0, rangeStart, rangeEnd + 1);
				return data;
			}

			// e.g. `[0, 11]` and you add 5-15 → `[0, 16]`
			else if (rangeStart >= start && rangeStart < end) {
				// replace `end` with the new value
				data.splice(index + 1, 1, rangeEnd + 1);
				// make sure the next range pair doesn’t overlap
				// e.g. `[0, 11, 12, 14]` and you add 5-15 → `[0, 16]` (i.e. remove the `12,14` part)
				added = true;
				// note: we cannot `return` just yet
			}

			index += 2;
		}
		// the loop has finished without doing anything; add the new pair to the end of the data set
		if (!added) {
			data.push(rangeStart, rangeEnd + 1);
		}
		return data;
	}

	function dataContains(data, codePoint) {
		// iterate over the data per (start, end) pair
		var index = 0;
		var start;
		var end;
		var length = data.length;
		while (index < length) {
			start = data[index];
			end = data[index + 1];
			if (codePoint >= start && codePoint < end) {
				return true;
			}
			index += 2;
		}
		return false;
	}

	function dataToArray(data) {
		// iterate over the data per (start, end) pair
		var index = 0;
		var start;
		var end;
		var result = [];
		var length = data.length;
		while (index < length) {
			start = data[index];
			end = data[index + 1];
			while (start < end) {
				result.push(start);
				++start;
			}
			index += 2;
		}
		return result;
	}

	function dataFromArray(codePoints) {
		// note: assumes a sorted list of numbers
		var index = 0;
		var length = codePoints.length;
		var current;
		var result = [];
		while (index < length) {
			current = codePoints[index];
			result.push(current);
			while (index < length) {
				if (codePoints[index] + 1 != codePoints[++index]) {
					break;
				}
			}
			current = codePoints[index - 1];
			if (current != 0x10FFFF) {
				result.push(current + 1);
			}
		}
		return result;
	}

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

	var CodePointSet = function(value) {
		this.__data__ = [];
		return this;
	};

	var proto = CodePointSet.prototype;
	extend(proto, {
		'add': function(value) {
			var $this = this;
			if (value == null) {
				return $this;
			}
			if (arguments.length > 1) {
				value = slice.call(arguments);
			}
			if (isArray(value)) {
				forEach(value, function(item) {
					var codePoint = isNumber(item) ? item : symbolToCodePoint(item);
					$this.__data__ = dataAdd($this.__data__, codePoint);
				});
				return $this;
			}
			$this.__data__ = dataAdd(
				$this.__data__,
				isNumber(value) ? value : symbolToCodePoint(value)
			);
			return $this;
		},
		'remove': function(value) {
			var $this = this;
			if (arguments.length > 1) {
				value = slice.call(arguments);
			}
			if (isArray(value)) {
				forEach(value, function(item) {
					var codePoint = isNumber(item) ? item : symbolToCodePoint(item);
					$this.__data__ = dataRemove($this.__data__, codePoint);
				});
				return $this;
			}
			$this.__data__ = dataRemove(
				$this.__data__,
				isNumber(value) ? value : symbolToCodePoint(value)
			);
			return $this;
		},
		'addRange': function(start, end) {
			var $this = this;
			$this.__data__ = dataAddRange($this.__data__,
				isNumber(start) ? start : symbolToCodePoint(start),
				isNumber(end) ? end : symbolToCodePoint(end)
			);
			return $this;
		},
		'removeRange': function(start, end) {
			var $this = this;
			var startCodePoint = isNumber(start) ? start : symbolToCodePoint(start);
			var endCodePoint = isNumber(end) ? end : symbolToCodePoint(end);
			$this.__data__ = dataRemoveRange($this.__data__, startCodePoint, endCodePoint);
			return $this;
		},
		'difference': function(array) {
			var $this = this;
			$this.__data__ = dataFromArray(difference(dataToArray($this.__data__), array));
			// TODO: rewrite `difference` to avoid the conversion to/from an unoptimized array
			return $this;
		},
		'intersection': function(array) {
			var $this = this;
			$this.__data__ = dataFromArray(intersection(dataToArray($this.__data__), array));
			// TODO: rewrite `intersection` to avoid the conversion to/from an unoptimized array
			return $this;
		},
		'contains': function(codePoint) {
			return dataContains(
				this.__data__,
				isNumber(codePoint) ? codePoint : symbolToCodePoint(codePoint)
			);
		},
		'toString': function() {
			return createCharacterClasses(this.toArray());
		},
		'toRegExp': function() {
			return RegExp(this.toString());
		},
		'valueOf': function() { // has alias `toArray`
			return dataToArray(this.__data__);
		}
	});

	proto.toArray = proto.valueOf;

	var set = function(value) {
		if (value instanceof CodePointSet) {
			// this is already a set; don’t wrap it again
			return value;
		} else if (arguments.length > 1) {
			value = slice.call(arguments);
		}
		return (new CodePointSet).add(value);
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
