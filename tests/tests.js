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

	function forOwn(object, fn) {
		var key;
		for (key in object) {
			if (object.hasOwnProperty(key)) {
				fn(object[key], key);
			}
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
				'expected': '[\\0-\\uD7FF\\uDC00-\\uFFFF]|[\\uD800-\\uDBFF]'
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
		]

	};

	// explicitly call `QUnit.module()` instead of `module()`
	// in case we are in a CLI environment

	// `throws` is a reserved word in ES3; alias it to avoid errors
	var raises = QUnit.assert['throws'];

	// Extend `Object.prototype` to see if regenerate can handle it.
	// 0xD834 is the high surrogate code point for U+1D306 (among others).
	Object.prototype[0xD834] = true;

	QUnit.module('regenerate');

	// test('fromCodePoints', function() {
	// 	forEach(data.fromCodePoints, function(item) {
	// 		if (item.error) {
	// 			raises(
	// 				function() {
	// 					regenerate.fromCodePoints(item.codePoints);
	// 				},
	// 				item.error,
	// 				item.description
	// 			);
	// 		} else {
	// 			equal(
	// 				regenerate.fromCodePoints(item.codePoints),
	// 				item.expected,
	// 				item.description
	// 			);
	// 		}
	// 	});
	// });

	// test('fromCodePointRange', function() {
	// 	forEach(data.fromCodePointRange, function(item) {
	// 		if (item.error) {
	// 			raises(
	// 				function() {
	// 					regenerate.fromCodePointRange(item.start, item.end);
	// 				},
	// 				item.error,
	// 				item.description
	// 			);
	// 		} else {
	// 			equal(
	// 				regenerate.fromCodePointRange(item.start, item.end),
	// 				item.expected,
	// 				item.description
	// 			);
	// 		}
	// 	});
	// });

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

	/*--------------------------------------------------------------------------*/

	// configure QUnit and call `QUnit.start()` for
	// Narwhal, Node.js, PhantomJS, Rhino, and RingoJS
	if (!root.document || root.phantom) {
		QUnit.config.noglobals = true;
		QUnit.start();
	}
}(typeof global == 'object' && global || this));
