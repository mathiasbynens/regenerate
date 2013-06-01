;(function(root) {
	'use strict';

	/** Use a single `load` function */
	var load = typeof require == 'function' ? require : root.load;

	/** The unit testing framework */
	var QUnit = (function() {
		var noop = Function.prototype;
		return root.QUnit || (
			root.addEventListener || (root.addEventListener = noop),
			root.setTimeout || (root.setTimeout = noop),
			root.QUnit = load('../node_modules/qunitjs/qunit/qunit.js') || root.QUnit,
			(load('../node_modules/qunit-clib/qunit-clib.js') || { 'runInContext': noop }).runInContext(root),
			addEventListener === noop && delete root.addEventListener,
			root.QUnit
		);
	}());

	// Extend `Object.prototype` to see if Regenerate can handle it.
	// 0xD834 is the high surrogate code point for U+1D306 (among others).
	Object.prototype[0xD834] = true;

	/** The `regenerate` object to test */
	var regenerate = root.regenerate || (root.regenerate = (
		regenerate = load('../regenerate.js') || root.regenerate,
		regenerate = regenerate.regenerate || regenerate
	));

	/*--------------------------------------------------------------------------*/

	function forEach(array, fn) {
		var index = -1;
		var length = array.length;
		while (++index < length) {
			fn(array[index]);
		}
	}

	// Avoid using `regenerate.range` here since it slows down the coverage
	// tests greatly
	var range = function(start, stop) { // inclusive, e.g. `range(1, 3)` → `[1, 2, 3]`
		for (var result = []; start <= stop; result.push(start++));
		return result;
	};

	var bmp = range(0x0, 0xFFFF);
	var astral = range(0x010000, 0x10FFFF);
	var unicode = bmp.concat(astral);

	var data = {

		'fromCodePoints': [
			{
				'description': 'BMP code points',
				'codePoints': [0x10, 0x11, 0x12, 0x13, 0x40, 0x41, 0x42, 0x43, 0x44, 0x2603, 0xFD3F, 0xFFFF],
				'expected': '[\\x10-\\x13\\x40-D\\u2603\\uFD3F\\uFFFF]'
			},
			{
				'description': 'BMP code points within the a-zA-Z range',
				'codePoints': [0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x5A, 0x61],
				'expected': '[A-HZa]'
			},
			{
				'description': 'BMP code points within the a-zA-Z range, unordered',
				'codePoints': [0x61, 0x5A, 0x48, 0x47, 0x46, 0x45, 0x44, 0x43, 0x42, 0x41],
				'expected': '[A-HZa]'
			},
			{
				'description': 'Unmatched high surrogates',
				'codePoints': [0xD800, 0xD801, 0xD802, 0xD803, 0xDBFF],
				'expected': '[\\uD800-\\uD803\\uDBFF]'
			},
			{
				'description': 'Unmatched low surrogates',
				'codePoints': [0xDC00, 0xDC01, 0xDC02, 0xDC03, 0xDC04, 0xDC05, 0xDFFB, 0xDFFD, 0xDFFE, 0xDFFF],
				'expected': '[\\uDC00-\\uDC05\\uDFFB\\uDFFD-\\uDFFF]'
			},
			{
				'description': 'Mixed BMP and astral code points',
				'codePoints': [0x0, 0x1, 0x2, 0x3, 0x1D306, 0x1D307, 0x1D308, 0x1D30A],
				'expected': '[\\0-\\x03]|\\uD834[\\uDF06-\\uDF08\\uDF0A]'
			},
			{
				'description': '\\0 may not be followed by a digit',
				'codePoints': [0, 0x31, 0x32],
				'expected': '[\\x0012]'
			},
			{
				'description': 'All BMP code points',
				'codePoints': bmp,
				'expected': '[\\0-\\uFFFF]'
			},
			{
				'description': 'All astral code points',
				'codePoints': astral,
				'expected': '[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]'
			},
			{
				'description': 'All Unicode code points',
				'codePoints': unicode,
				'expected': '[\\0-\\uD7FF\\uDC00-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF]'
			},
			{
				'description': 'Empty array as input',
				'codePoints': [],
				'expected': ''
			},
			{
				'description': 'Invalid code point > 0x10FFFF',
				'codePoints': [0x110000],
				'error': RangeError
			},
			{
				'description': 'Invalid code point < 0x0000',
				'codePoints': [-1],
				'error': RangeError
			},
			{
				'description': 'Incorrect argument type (not an array)',
				'codePoints': 'lolwat',
				'error': TypeError
			}
		],

		'fromCodePointRange': [
			{
				'description': 'BMP code points',
				'start': 0x10,
				'end': 0x13,
				'expected': '[\\x10-\\x13]'
			},
			{
				'description': 'BMP code points within the a-zA-Z range',
				'start': 0x41,
				'end': 0x61,
				'expected': '[A-a]'
			},
			{
				'description': 'All BMP code points',
				'start': 0x0000,
				'end': 0xFFFF,
				'expected': '[\\0-\\uFFFF]'
			},
			{
				'description': 'Start value greater than end value',
				'start': 0xFFFF,
				'end': 0x0000,
				'error': Error
			},
			{
				'description': 'All Unicode code points',
				'start': 0x000000,
				'end': 0x10FFFF,
				'expected': '[\\0-\\uD7FF\\uDC00-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF]'
			},
			{
				'description': 'Invalid code point > 0x10FFFF',
				'start': 0x110000,
				'end': 0x110000,
				'error': RangeError
			},
			{
				'description': 'Invalid code point < 0x0000',
				'start': -1,
				'end': -1,
				'error': RangeError
			}
		],

		'fromCodePointRanges': [
			{
				'description': 'Various code points',
				'ranges': [
					0x200C,
					[0xF900, 0xFDCF],
					[0xFDF0, 0xFFFD],
					[0x010000, 0x0EFFFF]
				],
				'expected': '[\\u200C\\uF900-\\uFDCF\\uFDF0-\\uFFFD]|[\\uD800-\\uDB7F][\\uDC00-\\uDFFF]'
			},
			{
				'description': 'Empty array as input',
				'ranges': [],
				'expected': ''
			},
			{
				'description': 'Incorrect argument type (not an array)',
				'ranges': 'lolwat',
				'error': TypeError
			}
		],

		'fromSymbols': [
			{
				'description': 'BMP code points',
				'symbols': ['\x10', '\x11', '\x12', '\x13', '@', 'A', 'B', 'C', 'D', '\u2603', '\uFD3F', '\uFFFF'],
				'expected': '[\\x10-\\x13\\x40-D\\u2603\\uFD3F\\uFFFF]'
			},
			{
				'description': 'BMP code points within the a-zA-Z range',
				'symbols': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Z', 'a'],
				'expected': '[A-HZa]'
			},
			{
				'description': 'BMP code points within the a-zA-Z range, unordered',
				'symbols': ['a', 'Z', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'],
				'expected': '[A-HZa]'
			},
			{
				'description': 'Unmatched high surrogates',
				'symbols': ['\uD800', '\uD801', '\uD802', '\uD803', '\uDBFF'],
				'expected': '[\\uD800-\\uD803\\uDBFF]'
			},
			{
				'description': 'Unmatched low surrogates',
				'symbols': ['\uDC00', '\uDC01', '\uDC02', '\uDC03', '\uDC04', '\uDC05', '\uDFFB', '\uDFFD', '\uDFFE', '\uDFFF'],
				'expected': '[\\uDC00-\\uDC05\\uDFFB\\uDFFD-\\uDFFF]'
			},
			{
				'description': 'Mixed BMP and astral code points',
				'symbols': ['\0', '\x01', '\x02', '\x03', '\uD834\uDF06', '\uD834\uDF07', '\uD834\uDF08', '\uD834\uDF0A'],
				'expected': '[\\0-\\x03]|\\uD834[\\uDF06-\\uDF08\\uDF0A]'
			},
			{
				'description': '\\0 may not be followed by a digit',
				'symbols': ['\0', '1', '2'],
				'expected': '[\\x0012]'
			},
			{
				'description': 'Empty array as input',
				'symbols': [],
				'expected': ''
			},
			{
				'description': 'Incorrect argument type (not an array)',
				'symbols': 'lolwat',
				'error': TypeError
			}
		],

		'fromSymbolRange': [
			{
				'description': 'BMP code points',
				'start': '\x10',
				'end': '\x13',
				'expected': '[\\x10-\\x13]'
			},
			{
				'description': 'BMP code points within the a-zA-Z range',
				'start': 'A',
				'end': 'a',
				'expected': '[A-a]'
			},
			{
				'description': 'Start value greater than end value',
				'start': '\uFFFF',
				'end': '\0',
				'error': Error
			},
			{
				'description': 'All Unicode code points',
				'start': '\0',
				'end': '\uDBFF\uDFFF',
				'expected': '[\\0-\\uD7FF\\uDC00-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF]'
			}
		],

		'fromSymbolRanges': [
			{
				'description': 'Various code points',
				'ranges': [
					'\u200C',
					['\uF900', '\uFDCF'],
					['\uFDF0', '\uFFFD'],
					['\uD800\uDC00', '\uDB7F\uDFFF'], // U+010000, U+0EFFFF
				],
				'expected': '[\\u200C\\uF900-\\uFDCF\\uFDF0-\\uFFFD]|[\\uD800-\\uDB7F][\\uDC00-\\uDFFF]'
			},
			{
				'description': 'Empty array as input',
				'ranges': [],
				'expected': ''
			},
			{
				'description': 'Incorrect argument type (not an array)',
				'ranges': 'lolwat',
				'error': TypeError
			}
		],

		'range': [
			{
				'description': 'Simple',
				'start': 0xF9FF,
				'end': 0xFA07,
				'expected': [0xF9FF, 0xFA00, 0xFA01, 0xFA02, 0xFA03, 0xFA04, 0xFA05, 0xFA06, 0xFA07]
			},
			{
				'description': 'Negative numbers',
				'start': -3,
				'end': 3,
				'expected': [-3, -2, -1, 0, 1, 2, 3]
			},
			{
				'description': 'Start value greater than end value',
				'start': 3,
				'end': -3,
				'error': Error
			}
		],

		'ranges': [
			{
				'description': 'Some code point ranges',
				'ranges': [
					[0, 3],
					0x200C,
					[0xF900, 0xF902]
				],
				'expected': [0, 1, 2, 3, 0x200C, 0xF900, 0xF901, 0xF902]
			},
			{
				'description': 'Empty array as input',
				'ranges': [],
				'expected': []
			},
			{
				'description': 'Incorrect argument type (not an array)',
				'ranges': 'lolwat',
				'error': TypeError
			}
		],

		'contains': [
			{
				'description': 'contains([1, 2, 3, 4, 5], 5)',
				'array': [1, 2, 3, 4, 5],
				'value': 5,
				'expected': true
			},
			{
				'description': 'contains([1, 2, 3, 4, 5], 0x10FFFF)',
				'array': [1, 2, 3, 4, 5],
				'value': 0x10FFFF,
				'expected': false
			}
		],

		'difference': [
			{
				'description': 'difference([1, 2, 3, 4, 5, 6, 7], [1, 3, 7])',
				'a': [1, 2, 3, 4, 5, 6, 7],
				'b': [1, 3, 7],
				'expected': [2, 4, 5, 6]
			},
			{
				'description': 'difference([1, 2, 3, 4], [0])',
				'a': [1, 2, 3, 4],
				'b': [0],
				'expected': [1, 2, 3, 4]
			},
			{
				'description': 'Not passing the second argument',
				'a': [1],
				'b': undefined,
				'error': TypeError
			}
		],

		'add': [
			{
				'description': 'Adding a symbol to an array',
				'destination': [0x1D306],
				'value': 'A',
				'expected': [0x1D306, 0x41]
			},
			{
				'description': 'Adding a code point to an array',
				'destination': [0x1D306],
				'value': 0x41,
				'expected': [0x1D306, 0x41]
			},
			{
				'description': 'Adding an array of values to an array',
				'destination': [0x1D306],
				'value': ['A', 0x1D307, ['B', 'D', '\uD83D\uDCA9']],
				'expected': [0x1D306, 0x41, 0x1D307, 0x42, 0x44, 0x1F4A9]
			},
			{
				'description': 'First argument is not an array',
				'destination': {},
				'value': 0x0,
				'error': TypeError
			}
		],

		'remove': [
			{
				'description': 'Removing a symbol from an array',
				'destination': [0x1D306, 0x41],
				'value': 'A',
				'expected': [0x1D306]
			},
			{
				'description': 'Removing a code point from an array',
				'destination': [0x1D306, 0x41],
				'value': 0x41,
				'expected': [0x1D306]
			},
			{
				'description': 'Removing an array of values from an array',
				'destination': [0x1D306, 0x41, 0x1D307, 0x42, 0x44, 0x1F4A9],
				'value': ['A', 0x1D307, ['B', 'D', '\uD83D\uDCA9']],
				'expected': [0x1D306]
			},
			{
				'description': 'First argument is not an array',
				'destination': 'not an array',
				'value': 0x0,
				'error': TypeError
			},
			{
				'description': 'Second argument is not a symbol, code point, or array consisting of those',
				'destination': [1, 2, 3],
				'value': null,
				'expected': [1, 2, 3]
			}
		]

	};

	// explicitly call `QUnit.module()` instead of `module()`
	// in case we are in a CLI environment

	// `throws` is a reserved word in ES3; alias it to avoid errors
	var raises = QUnit.assert['throws'];

	QUnit.module('regenerate');

	test('fromCodePoints', function() {
		forEach(data.fromCodePoints, function(item) {
			if (item.error) {
				raises(
					function() {
						regenerate.fromCodePoints(item.codePoints);
					},
					item.error,
					item.description
				);
			} else {
				equal(
					regenerate.fromCodePoints(item.codePoints),
					item.expected,
					item.description
				);
			}
		});
	});

	test('fromCodePointRange', function() {
		forEach(data.fromCodePointRange, function(item) {
			if (item.error) {
				raises(
					function() {
						regenerate.fromCodePointRange(item.start, item.end);
					},
					item.error,
					item.description
				);
			} else {
				equal(
					regenerate.fromCodePointRange(item.start, item.end),
					item.expected,
					item.description
				);
			}
		});
	});

	test('fromCodePointRanges', function() {
		forEach(data.fromCodePointRanges, function(item) {
			if (item.error) {
				raises(
					function() {
						regenerate.fromCodePointRanges(item.ranges);
					},
					item.error,
					item.description
				);
			} else {
				equal(
					regenerate.fromCodePointRanges(item.ranges),
					item.expected,
					item.description
				);
			}
		});
	});

	test('fromSymbols', function() {
		forEach(data.fromSymbols, function(item) {
			if (item.error) {
				raises(
					function() {
						regenerate.fromSymbols(item.symbols);
					},
					item.error,
					item.description
				);
			} else {
				equal(
					regenerate.fromSymbols(item.symbols),
					item.expected,
					item.description
				);
			}
		});
	});

	test('fromSymbolRange', function() {
		forEach(data.fromSymbolRange, function(item) {
			if (item.error) {
				raises(
					function() {
						regenerate.fromSymbolRange(item.start, item.end);
					},
					item.error,
					item.description
				);
			} else {
				equal(
					regenerate.fromSymbolRange(item.start, item.end),
					item.expected,
					item.description
				);
			}
		});
	});

	test('fromSymbolRanges', function() {
		forEach(data.fromSymbolRanges, function(item) {
			if (item.error) {
				raises(
					function() {
						regenerate.fromSymbolRanges(item.ranges);
					},
					item.error,
					item.description
				);
			} else {
				equal(
					regenerate.fromSymbolRanges(item.ranges),
					item.expected,
					item.description
				);
			}
		});
	});

	test('range', function() {
		forEach(data.range, function(item) {
			if (item.error) {
				raises(
					function() {
						regenerate.range(item.start, item.end);
					},
					item.error,
					item.description
				);
			} else {
				deepEqual(
					regenerate.range(item.start, item.end),
					item.expected,
					item.description
				);
			}
		});
	});

	test('ranges', function() {
		forEach(data.ranges, function(item) {
			if (item.error) {
				raises(
					function() {
						regenerate.ranges(item.ranges);
					},
					item.error,
					item.description
				);
			} else {
				deepEqual(
					regenerate.ranges(item.ranges),
					item.expected,
					item.description
				);
			}
		});
	});

	test('contains', function() {
		forEach(data.contains, function(item) {
			if (item.error) {
				raises(
					function() {
						regenerate.contains(item.array, item.value);
					},
					item.error,
					item.description
				);
			} else {
				equal(
					regenerate.contains(item.array, item.value),
					item.expected,
					item.description
				);
			}
		});
	});

	test('difference', function() {
		forEach(data.difference, function(item) {
			if (item.error) {
				raises(
					function() {
						regenerate.difference(item.a, item.b);
					},
					item.error,
					item.description
				);
			} else {
				deepEqual(
					regenerate.difference(item.a, item.b),
					item.expected,
					item.description
				);
			}
		});
	});

	test('add', function() {
		forEach(data.add, function(item) {
			if (item.error) {
				raises(
					function() {
						regenerate.add(item.destination, item.value);
					},
					item.error,
					item.description
				);
			} else {
				deepEqual(
					regenerate.add(item.destination, item.value),
					item.expected,
					item.description
				);
			}
		});
	});

	test('remove', function() {
		forEach(data.remove, function(item) {
			if (item.error) {
				raises(
					function() {
						regenerate.remove(item.destination, item.value);
					},
					item.error,
					item.description
				);
			} else {
				deepEqual(
					regenerate.remove(item.destination, item.value),
					item.expected,
					item.description
				);
			}
		});
	});

	test('set (chaining)', function() {
		var set = regenerate(regenerate.range(0, 10))
				.add(0x1D306)
				.add([15, 20])
				.remove(20)
				.difference([9, 15])
				.intersection([3, 7, 10, 0x1D306]);
		deepEqual(
			set.toArray(),
			[3, 7, 10, 0x1D306],
			'Set: add, remove, difference, intersection'
		);
		equal(
			set.toString(),
			'[\\x03\\x07\\x0A]|\\uD834\\uDF06',
			'Set#toString'
		);
		equal(
			set.contains(0x1D306),
			true,
			'Set#contains: true'
		);
		equal(
			set.contains(0x1D307),
			false,
			'Set#contains: false'
		);
		equal(
			regenerate(0x62).add(0x1D307).contains(0x1D306),
			false,
			'Set#contains: false'
		);
		equal(
			regenerate().add([0x1D307, 0x1D3A0, 0x1D3FF]).remove([0x1D3A0, 0x1D3FF]).contains(0x1D3A0),
			false,
			'Set#contains: false'
		);
		deepEqual(
			regenerate(0x1D3A0, 0x1D307).add(0x1D3FF, 'A').remove(0x1D3A0, 0x1D3FF).toArray(),
			[0x41, 0x1D307],
			'set(a, b, ...)'
		);
		deepEqual(
			regenerate(0x1D3A0, 0x1D307, 'A').add(0x1D3FF).remove(0x1D3A0, 0x1D3FF).toArray(),
			[0x41, 0x1D307],
			'set(a, b, ...)'
		);
		deepEqual(
			regenerate(0x0).addRange(0x5, 0x8).toArray(),
			[0x0, 0x5, 0x6, 0x7, 0x8],
			'Set#addRange with numbers'
		);
		deepEqual(
			regenerate(0x0).addRange('a', 'c').toArray(),
			[0x0, 0x61, 0x62, 0x63],
			'Set#addRange with strings'
		);
		deepEqual(
			regenerate(0x0).addRange(0x61, 'c').toArray(),
			[0x0, 0x61, 0x62, 0x63],
			'Set#addRange with a number and a string'
		);
		deepEqual(
			regenerate(new Number(0x0)).addRange(new String('a'), new Number(0x63)).toArray(),
			[0x0, 0x61, 0x62, 0x63],
			'Set#addRange with a Number object and a String object'
		);
		deepEqual(
			regenerate(0x1D306).addRange(0x0, 0xFF).removeRange('\0', '\xFE').toArray(),
			[0xFF, 0x1D306],
			'Set#removeRange'
		);
		deepEqual(
			regenerate().addRange(0x0000, 0x0300).removeRange(0x0100, 0x0200).toRegExp(),
			/[\0-\xFF\u0201-\u0300]/,
			'Set#toRegExp'
		);
		deepEqual(
			regenerate(set),
			set,
			'Don’t wrap existing sets'
		);
		deepEqual(
			regenerate(0x61).add(0x61, 0x61, 0x62).add(0x61).toArray(),
			[0x61, 0x62],
			'Remove duplicates'
		);
	});

	/*--------------------------------------------------------------------------*/

	// configure QUnit and call `QUnit.start()` for
	// Narwhal, Node.js, PhantomJS, Rhino, and RingoJS
	if (!root.document || root.phantom) {
		QUnit.config.noglobals = true;
		QUnit.start();
	}
}(typeof global == 'object' && global || this));
