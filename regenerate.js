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

	var ERRORS = {
		'rangeOrder': 'A range\u2019s `stop` value must be greater than or equal ' +
			'to the `start` value.',
		'codePointRange': 'Invalid code point value. Code points range from ' +
			'U+000000 to U+10FFFF.'
	};

	var object = {};
	var hasOwnProperty = object.hasOwnProperty;
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

	var forEach = function(array, callback) {
		var index = -1;
		var length = array.length;
		while (++index < length) {
			callback(array[index], index);
		}
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
			if (isStart) {
				result.push(tmp);
				previous = tmp;
				isStart = false;
			} else {
				if (tmp == previous + 1) {
					if (index != max) {
						previous = tmp;
						continue;
					} else {
						isStart = true;
						result.push(tmp + 1);
					}
				} else {
					// End the previous range and start a new one
					result.push(previous + 1, tmp);
					previous = tmp;
				}
			}
		}
		if (!isStart) {
			result.push(tmp + 1);
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
			throw Error(ERRORS.rangeOrder);
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
		var lastIndex = null;
		var length = data.length;
		if (codePoint < 0x0 || codePoint > 0x10FFFF) {
			throw RangeError(ERRORS.codePointRange);
		}
		while (index < length) {
			start = data[index];
			end = data[index + 1];

			// the code point is already in the set
			if (codePoint >= start && codePoint < end) {
				return data;
			}

			if (codePoint == start - 1) {
				// just replace `start` with a new value
				data.splice(index, 1, codePoint);
				return data;
			}

			// At this point, if `start` is `greater` than `codePoint`, insert a new
			// [start, end] pair before the current pair, or after the current pair if
			// there is a known `lastIndex`.
			if (start > codePoint) {
				data.splice(
					lastIndex != null ? lastIndex + 2 : 0,
					0,
					codePoint,
					codePoint + 1
				);
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
			}
			lastIndex = index;
			index += 2;
		}
		// The loop has finished; add the new pair to the end of the data set.
		data.push(codePoint, codePoint + 1);
		return data;
	}

	function dataAddRange(data, rangeStart, rangeEnd) {
		if (rangeEnd < rangeStart) {
			throw Error(ERRORS.rangeOrder);
		}
		if (
			rangeStart < 0x0 || rangeStart > 0x10FFFF ||
			rangeEnd < 0x0 || rangeEnd > 0x10FFFF
		) {
			throw RangeError(ERRORS.codePointRange);
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

				// E.g. `[0, 11, 12, 16]` and we’ve added 5-15, so we now have
				// `[0, 16, 12, 16]`. Remove the `12,16` part, as it lies within the
				// `0,16` range that was previously added.
				if (start >= rangeStart && start <= rangeEnd) {
					// `start` lies within the range that was previously added.

					if (end > rangeStart && end - 1 <= rangeEnd) {
						// `end` lies within the range that was previously added as well,
						// so remove this pair.
						data.splice(index, 2);
						index -= 2;
						// Note: we cannot `return` just yet, as there may still be other
						// overlapping pairs.
					}
					else {
						// `start` lies within the range that was previously added, but
						// `end` doesn’t. E.g. `[0, 11, 12, 31]` and we’ve added 5-15, so
						// now we have `[0, 16, 12, 31]`. This must be written as `[0, 31]`.
						// Remove the previously added `end` and the current `start`.
						data.splice(index - 1, 2);
						index -= 2;
					}

					// Note: we cannot return yet.
				}

			}

			// Check if a new pair must be inserted *before* the current one.
			else if (start > rangeEnd) {
				data.splice(index, 0, rangeStart, rangeEnd + 1);
				return data;
			}

			else if (rangeStart >= start && rangeStart < end && rangeEnd + 1 <= end) {
				// The new range lies entirely within an existing range pair. No action
				// needed.
				return data;
			}

			else if (
				// E.g. `[0, 11]` and you add 5-15 → `[0, 16]`.
				(rangeStart >= start && rangeStart < end) ||
				// E.g. `[0, 3]` and you add 3-6 → `[0, 7]`.
				end == rangeStart
			) {
				// Replace `end` with the new value.
				data.splice(index + 1, 1, rangeEnd + 1);
				// Make sure the next range pair doesn’t overlap, e.g. `[0, 11, 12, 14]`
				// and you add 5-15 → `[0, 16]`, i.e. remove the `12,14` part.
				added = true;
				// Note: we cannot `return` just yet.
			}

			index += 2;
		}
		// The loop has finished without doing anything; add the new pair to the end
		// of the data set.
		if (!added) {
			data.push(rangeStart, rangeEnd + 1);
		}
		return data;
	}

	function dataContains(data, codePoint) {
		// Iterate over the data per (start, end) pair.
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
		// Iterate over the data per (start, end) pair.
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
			// it’s a low surrogate (else it’s invalid usage of Regenerate anyway).
			extra = symbol.charCodeAt(1);
			return ((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;
		} else {
			return value;
		}
	};

	// In Regenerate output, `\0` will never be preceded by `\` because we sort
	// by code point value, so let’s keep this regular expression simple.
	var regexNull = /\\x00([^0123456789]|$)/g;
	var createBMPCharacterClasses = function(data) {
		// Iterate over the data per (start, end) pair.
		var result = '';
		var index = 0;
		var start;
		var end;
		var length = data.length;
		if (length == 2 && data[0] + 1 == data[1]) {
			// The set only represents a single code point.
			return codePointToString(data[0]);
		}
		while (index < length) {
			start = data[index];
			end = data[index + 1] - 1; // Note: the `- 1` makes `end` inclusive.
			if (start > 0xFFFF) {
				break;
			}
			if (end > 0xFFFF) {
				end = 0xFFFF;
			}
			if (start == end) {
				result += codePointToString(start);
			} else if (start + 1 == end) {
				result += codePointToString(start) + codePointToString(end);
			} else {
				result += codePointToString(start) + '-' + codePointToString(end);
			}
			index += 2;
		}
		// Use `\0` instead of `\x00` where possible.
		result = result.replace(regexNull, '\\0$1');
		return '[' + result + ']';
	}

	var splitAtBMP = function(data) {
		// Iterate over the data per (start, end) pair.
		var bmp = [];
		var astral = [];
		var index = 0;
		var start;
		var end;
		var length = data.length;
		while (index < length) {
			start = data[index];
			end = data[index + 1] - 1; // Note: the `- 1` makes `end` inclusive.
			if (start <= 0xFFFF && end <= 0xFFFF) {
				// Both `start` and `end` are within the BMP range.
				bmp.push(start, end + 1);
			}
			else if (start <= 0xFFFF && end > 0xFFFF) {
				// `start` is in the BMP range, but `end` lies within the astral range.
				bmp.push(start, 0xFFFF + 1);
				if (end > 0xFFFF + 1) {
					astral.push(0xFFFF + 1, end + 1);
				}
			}
			else {
				// Both `start` and `end` are in the astral range.
				astral.push(start, end + 1);
			}
			index += 2;
		}
		return {
			'bmp': bmp,
			'astral': astral
		};
	};

	var surrogateSet = function(data) {
		// Exit early if `data` is an empty set.
		if (!data.length) {
			return {
				'highSurrogatesData': [],
				'surrogateMappings': []
			};
		}

		// Iterate over the data per (start, end) pair.
		var index = 0;
		var start;
		var end;
		var highStart;
		var lowStart;
		var prevHighStart = 0;
		var prevHighEnd = 0;
		var tmpLow = [];
		var highEnd;
		var lowEnd;
		var highSurrogatesData = [];
		var surrogateMappings = [];
		var length = data.length;
		while (index < length) {
			start = data[index];
			end = data[index + 1] - 1;

			highStart = highSurrogate(start);
			lowStart = lowSurrogate(start);
			highEnd = highSurrogate(end);
			lowEnd = lowSurrogate(end);

			if (prevHighStart == highStart && prevHighEnd == highEnd) {
				// Extend the set of low surrogates for this range of high surrogates.
				tmpLow = dataAddRange(tmpLow, lowStart, lowEnd);
			} else {
				// Update the set of high surrogates.
				highSurrogatesData = dataAddRange(
					highSurrogatesData,
					highStart,
					highEnd
				);
				if (prevHighStart) {
					// Append the previous high-surrogate-to-low-surrogate mappings,
					// unless this is the first loop iteration (`prevHighStart == 0`).
					surrogateMappings.push([[prevHighStart, prevHighEnd + 1], tmpLow]);
				}
				// Create a new data set for low surrogates.
				tmpLow = [lowStart, lowEnd + 1];
			}

			prevHighStart = highStart;
			prevHighEnd = highEnd;

			index += 2;
		}

		// Append the final items.
		surrogateMappings.push([[prevHighStart, prevHighEnd + 1], tmpLow]);

		return {
			'highSurrogatesData': highSurrogatesData,
			'surrogateMappings': surrogateMappings
			// The format of `surrogateMappings` is as follows:
			//     [ surrogateMapping1, surrogateMapping2 ]
			// i.e.:
			//     [
			//       [ highSurrogates1, lowSurrogates1 ],
			//       [ highSurrogates2, lowSurrogates2 ]
			//     ]
		};
	}

	function dataIntersection(data, codePoints) {
		var index = 0;
		var length = codePoints.length;
		var codePoint;
		var result = [];
		while (index < length) {
			codePoint = codePoints[index];
			if (dataContains(data, codePoint)) {
				result.push(codePoint);
			}
			++index;
		}
		return dataFromCodePoints(result);
	}

	function dataDifference(data, codePoints) {
		var index = 0;
		var length = codePoints.length;
		var codePoint;
		// Create a clone to avoid mutating the original `data`.
		var newData = data.slice(0);
		while (index < length) {
			codePoint = codePoints[index];
			if (dataContains(newData, codePoint)) {
				newData = dataRemove(newData, codePoint);
			}
			++index;
		}
		return newData;
	}

	function dataIsEmpty(data) {
		return !data.length;
	}

	function createSurrogateCharacterClasses(surrogateMappings) {
		var result = [];
		forEach(surrogateMappings, function(surrogateMapping) {
			var highSurrogates = surrogateMapping[0];
			var lowSurrogates = surrogateMapping[1];
			result.push(
				createBMPCharacterClasses(highSurrogates) +
				createBMPCharacterClasses(lowSurrogates)
			);
		});
		return result.join('|');
	}

	var createCharacterClassesFromData = function(data) {
		var result = [];

		var parts = splitAtBMP(data);
		var bmp = parts.bmp;
		var astral = parts.astral;

		var surrogatesData = surrogateSet(astral);
		var highSurrogatesData = surrogatesData.highSurrogatesData;
		var surrogateMappings = surrogatesData.surrogateMappings;

		// TODO: Optimize this by writing and using `dataDifferenceData()` and
		// `dataIntersectionData()` (or is it not worth it?).
		var highSurrogateCodePoints = dataToArray(highSurrogatesData);
		var bmpData = dataDifference(bmp, highSurrogateCodePoints);
		var loneHighSurrogatesData = dataIntersection(bmp, highSurrogateCodePoints);

		if (!dataIsEmpty(bmpData)) {
			// The data set contains BMP code points that are not high surrogates
			// needed for astral code points in the set.
			result.push(createBMPCharacterClasses(bmpData));
		}
		if (surrogateMappings.length) {
			// The data set contains astral code points; append character classes
			// based on their surrogate pairs.
			result.push(createSurrogateCharacterClasses(surrogateMappings));
		}
		if (!dataIsEmpty(loneHighSurrogatesData)) {
			// The data set contains lone high surrogates; append these.
			result.push(createBMPCharacterClasses(highSurrogatesData));
		}
		return result.join('|');
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
			if (value instanceof CodePointSet) {
				// Allow passing other `CodePointSet`s.
				// TODO: Optimize this by writing and using `dataAddData()`.
				value = dataToArray(value.__data__);
			}
			if (arguments.length > 1) {
				value = slice.call(arguments);
			}
			if (isArray(value)) {
				forEach(value, function(item) {
					$this.add(item);
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
			if (value == null) {
				return $this;
			}
			if (value instanceof CodePointSet) {
				// Allow passing other `CodePointSet`s.
				// TODO: Optimize this by writing and using `dataRemoveData()`.
				value = dataToArray(value.__data__);
			}
			if (arguments.length > 1) {
				value = slice.call(arguments);
			}
			if (isArray(value)) {
				forEach(value, function(item) {
					$this.remove(item);
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
			$this.__data__ = dataRemoveRange(
				$this.__data__,
				startCodePoint,
				endCodePoint
			);
			return $this;
		},
		'difference': function(argument) {
			var $this = this;
			// Allow passing other `CodePointSet`s. TODO: Optimize this by writing and
			// using `dataDifferenceData()` here when appropriate.
			var array = argument instanceof CodePointSet ?
				dataToArray(argument.__data__) :
				argument;
			$this.__data__ = dataDifference($this.__data__, array);
			// TODO: allow non-code point values (i.e. strings or arrays) here?
			return $this;
		},
		'intersection': function(argument) {
			var $this = this;
			// Allow passing other `CodePointSet`s.
			// TODO: Optimize this by writing and using `dataIntersectionData()`.
			var array = argument instanceof CodePointSet ?
				dataToArray(argument.__data__) :
				argument;
			$this.__data__ = dataIntersection($this.__data__, array);
			return $this;
		},
		'contains': function(codePoint) {
			return dataContains(
				this.__data__,
				isNumber(codePoint) ? codePoint : symbolToCodePoint(codePoint)
			);
		},
		'clone': function() {
			var set = new CodePointSet;
			set.__data__ = this.__data__.slice(0);
			return set;
		},
		'toString': function() {
			return createCharacterClassesFromData(this.__data__);
		},
		'toRegExp': function() {
			return RegExp(this.toString());
		},
		'valueOf': function() { // Note: `valueOf` is aliased as `toArray`.
			return dataToArray(this.__data__);
		}
	});

	proto.toArray = proto.valueOf;

	var set = function(value) {
		if (value instanceof CodePointSet) {
			// This is already a set; don’t wrap it again.
			return value;
		} else if (arguments.length > 1) {
			value = slice.call(arguments);
		}
		return (new CodePointSet).add(value);
	};

	set.version = '0.5.4';

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
