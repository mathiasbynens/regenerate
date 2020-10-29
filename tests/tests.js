(function(root) {
	'use strict';

	var noop = Function.prototype;

	var load = (typeof require == 'function' && !(root.define && define.amd)) ?
		require :
		(!root.document && root.java && root.load) || noop;

	var QUnit = (function() {
		return root.QUnit || (
			root.addEventListener || (root.addEventListener = noop),
			root.setTimeout || (root.setTimeout = noop),
			root.QUnit = load('../node_modules/qunitjs/qunit/qunit.js') || root.QUnit,
			addEventListener === noop && delete root.addEventListener,
			root.QUnit
		);
	}());

	var qe = load('../node_modules/qunit-extras/qunit-extras.js');
	if (qe) {
		qe.runInContext(root);
	}

	// Extend `Object.prototype` to see if Regenerate can handle it.
	// 0xD834 is the high surrogate code point for U+1D306 (among others).
	Object.prototype[0xD834] = true;

	/** The `regenerate` object to test */
	var regenerate = root.regenerate || (root.regenerate = (
		regenerate = load('../regenerate.js') || root.regenerate,
		regenerate = regenerate.regenerate || regenerate
	));

	/*--------------------------------------------------------------------------*/

	// Inclusive `range`, e.g. `range(1, 3)` → `[1, 2, 3]`.
	var range = function(start, stop) {
		for (var result = []; start <= stop; result.push(start++));
		return result;
	};

	// `throws` is a reserved word in ES3; alias it to avoid errors
	var raises = QUnit.assert['throws'];

	// explicitly call `QUnit.module()` instead of `module()`
	// in case we are in a CLI environment
	QUnit.module('regenerate');

	test('general functionality', function() {
		var set = regenerate(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
				.add(0x1D306)
				.add([15, 16, 20])
				.remove(20)
				.remove([9, 15])
				.intersection([3, 7, 10, 16, 0x1D306, 9001])
				.remove(7, 16);
		var setB = regenerate(0x1337, 0x1338, 0x31337);
		var setC = regenerate(0x42);
		deepEqual(
			set.clone().add(setB).add(setC).toArray(),
			[3, 10, 0x42, 0x1337, 0x1338, 0x1D306, 0x31337],
			'add(set) + clone'
		);
		deepEqual(
			regenerate(3, 10, 0x42, 0x1337, 0x1338, 0x1D306, 0x31337).remove(setB).remove(setC).toArray(),
			[3, 10, 0x1D306],
			'remove(set)'
		);
		deepEqual(
			regenerate(3, 10, 0x42, 0x1337, 0x1D306, 0x31337).remove(setB).toArray(),
			[3, 10, 0x42, 0x1D306],
			'remove(set)'
		);
		deepEqual(
			regenerate(3, 10, 0x42, 0x1337, 0x1D306, 0x31337).intersection(setB).toArray(),
			[0x1337, 0x31337],
			'intersection(set)'
		);
		deepEqual(
			regenerate(0, 1, 2, 3, 4, 5).intersection([3, 4, 5]).toArray(),
			[3, 4, 5],
			'intersection with consecutive code points'
		);
		deepEqual(
			regenerate(0, 1, 2, 3, 4, 5).remove(5).toArray(),
			[0, 1, 2, 3, 4],
			'remove that triggers an upper limit change in the data structure'
		);
		deepEqual(
			regenerate(0, 1, 2, 3, 4, 5).remove().toArray(),
			[0, 1, 2, 3, 4, 5],
			'remove with no arguments'
		);
		deepEqual(
			set.toArray(),
			[3, 10, 0x1D306],
			'Set: add, remove, remove, intersection'
		);
		equal(
			set.toString(),
			'[\\x03\\n]|\\uD834\\uDF06',
			'toString'
		);
		equal(
			set.contains(0x1D306),
			true,
			'contains: true'
		);
		equal(
			set.contains(0x1D307),
			false,
			'contains: false'
		);
		equal(
			set.contains('\uD834\uDF07'),
			false,
			'contains: false'
		);
		equal(
			regenerate(0x62).add(0x1D307).contains('\uD834\uDF06'),
			false,
			'contains: false'
		);
		equal(
			regenerate().add([0x1D307, 0x1D3A0, 0x1D3FF]).remove([0x1D3A0, 0x1D3FF]).contains(0x1D3A0),
			false,
			'contains: false'
		);
		deepEqual(
			regenerate().addRange(0x0, 0x10FFFF).removeRange(0xA, 0x10FFFF).toArray(),
			[0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
			'Set: start with a huge set, then remove a huge subset of code points'
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
			'addRange with numbers'
		);
		deepEqual(
			regenerate(0x0).addRange('a', 'c').toArray(),
			[0x0, 0x61, 0x62, 0x63],
			'addRange with strings'
		);
		deepEqual(
			regenerate(0x0).addRange(0x61, 'c').toArray(),
			[0x0, 0x61, 0x62, 0x63],
			'addRange with a number and a string'
		);
		deepEqual(
			regenerate(new Number(0x0)).addRange(new String('a'), new Number(0x63)).toArray(),
			[0x0, 0x61, 0x62, 0x63],
			'addRange with a Number object and a String object'
		);
		equal(
			regenerate('b').addRange('a', 'c').toString(),
			'[a-c]',
			'addRange where the new range wraps an old range in the set'
		);
		equal(
			regenerate('b', 'x').addRange('a', 'c').toString(),
			'[a-cx]',
			'addRange where the new range wraps an old range in the set'
		);
		deepEqual(
			regenerate(0x1D306).addRange(0x0, 0xFF).removeRange('\0', '\xFE').toArray(),
			[0xFF, 0x1D306],
			'removeRange'
		);
		deepEqual(
			regenerate(0x1D306).addRange(0x0, 0xFF).removeRange(0x0, 0x10FFFF).toArray(),
			[],
			'removeRange removing all code points'
		);
		deepEqual(
			regenerate().addRange(0x300, 0x374).removeRange(0x370, 0x374).toString(),
			'[\\u0300-\\u036F]',
			'removeRange'
		);
		deepEqual(
			regenerate().addRange(0x300, 0x374).removeRange(0x300, 0x304).toString(),
			'[\\u0305-\\u0374]',
			'removeRange'
		);
		deepEqual(
			regenerate().addRange(0x0000, 0x0300).removeRange(0x0100, 0x0200).toRegExp(),
			/[\0-\xFF\u0201-\u0300]/,
			'toRegExp'
		);
		deepEqual(
			regenerate().addRange(0x0000, 0x0300).removeRange(0x0100, 0x0200).toRegExp('g'),
			/[\0-\xFF\u0201-\u0300]/g,
			'toRegExp with flags'
		);
		var supportsUnicodeFlag = (function() {
			try {
				var regex = new RegExp('\\u{1D306}', 'u');
				return true;
			} catch (exception) {
				return false
			}
		}());
		supportsUnicodeFlag && deepEqual(
			regenerate().addRange(0x0, 0x10FFFF).toRegExp('gu'),
			new RegExp('[\\0-\\u{10FFFF}]', 'gu'),
			'toRegExp with `u` flag triggers `hasUnicodeFlag: true`'
		);
		raises(
			function() {
				regenerate(0x10, 0x1F).removeRange(0x1F, 0x1A).toArray();
			},
			Error,
			'removeRange: incorrect usage'
		);
		raises(
			function() {
				regenerate(0x10, 0x1F).addRange(0x1F, 0x1A).toArray();
			},
			Error,
			'addRange: incorrect usage'
		);
		deepEqual(
			regenerate(0).removeRange(0x1000, 0x2000).toArray(),
			[0],
			'removeRange with no effect'
		);
		deepEqual(
			regenerate(0x1000).removeRange(0, 1).toArray(),
			[0x1000],
			'removeRange with no effect'
		);
		deepEqual(
			regenerate(42).addRange(0, 10).removeRange(0, 10).toArray(),
			[42],
			'removeRange removing an exact range'
		);
		deepEqual(
			regenerate(42).addRange(0, 10).removeRange(4, 20).toArray(),
			[0, 1, 2, 3, 42],
			'removeRange removing a partial range'
		);
		deepEqual(
			regenerate(42).addRange(14, 23).removeRange(4, 20).toArray(),
			[21, 22, 23, 42],
			'removeRange removing a partial range'
		);
		deepEqual(
			regenerate().add(42, 50, 51, 53, 57, 59, 60).removeRange(50, 60).toArray(),
			[42],
			'removeRange removing several ranges from the data'
		);
		deepEqual(
			regenerate().addRange(0, 5).addRange(3, 7).toArray(),
			[0, 1, 2, 3, 4, 5, 6, 7],
			'addRange with overlapping ranges'
		);
		deepEqual(
			regenerate().addRange(0, 5).addRange(6, 7).toArray(),
			[0, 1, 2, 3, 4, 5, 6, 7],
			'addRange extending the end of a range'
		);
		deepEqual(
			regenerate().addRange(0, 2).addRange(4, 6).addRange(3, 4).toArray(),
			[0, 1, 2, 3, 4, 5, 6],
			'addRange gluing two ranges together'
		);
		deepEqual(
			regenerate().addRange(0, 2).addRange(5, 7).addRange(3, 4).toArray(),
			[0, 1, 2, 3, 4, 5, 6, 7],
			'addRange gluing two ranges together'
		);
		deepEqual(
			regenerate().addRange(0, 2).addRange(4, 6).addRange(1, 5).toArray(),
			[0, 1, 2, 3, 4, 5, 6],
			'addRange with overlapping ranges'
		);
		deepEqual(
			regenerate().addRange(0, 5).addRange(10, 12).addRange(1, 3).toArray(),
			[0, 1, 2, 3, 4, 5, 10, 11, 12],
			'addRange with a sub-range'
		);
		deepEqual(
			regenerate().addRange(0, 2).addRange(7, 9).addRange(3, 4).toArray(),
			[0, 1, 2, 3, 4, 7, 8, 9],
			'addRange extending the end of a range'
		);
		deepEqual(
			regenerate().addRange(0, 3).addRange(5, 10).add(4).toArray(),
			[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
			'addRange gluing two ranges together'
		);
		deepEqual(
			regenerate().addRange(0, 5).addRange(10, 15).addRange(3, 17).toArray(),
			[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
			'addRange causing several sub-ranges to be deleted'
		);
		equal(
			regenerate(0x08, 0x0A, 0x0C, 0x0D, 0x22, 0x27, 0x5C).toString(),
			'[\\x08\\n\\f\\r"\'\\\\]',
			'toString escapes special characters using single escapes'
		);
		equal(
			regenerate(0x09, 'a').toString(),
			'[\\ta]',
			'toString escapes special characters using single escapes'
		);
		equal(
			set.clone().add('a', '.', '-', ']', '/').toString(),
			'[\\x03\\n\\x2D-\\/\\]a]|\\uD834\\uDF06',
			'toString uses hexadecimal and Unicode escapes when appropriate'
		);
		deepEqual(
			regenerate().addRange(3, 6).add(2).toArray(),
			[2, 3, 4, 5, 6],
			'add extending the start of a range'
		);
		deepEqual(
			regenerate().addRange(3, 6).addRange(1, 2).toArray(),
			[1, 2, 3, 4, 5, 6],
			'add extending the start of a range'
		);
		deepEqual(
			regenerate().addRange(3, 6).addRange(1, 3).toArray(),
			[1, 2, 3, 4, 5, 6],
			'add extending the start of a range'
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
		deepEqual(
			regenerate().toArray(),
			[],
			'Empty set returns empty array'
		);
		deepEqual(
			regenerate().remove(0x1D306).toArray(),
			[],
			'Empty set returns empty array'
		);
		deepEqual(
			regenerate([]).toArray(),
			[],
			'Empty array as input returns empty array'
		);
		equal(
			regenerate().toString(),
			'[]',
			'Empty set stringifies to `[]` (and not `(?:)` which matches the empty string)'
		);
		equal(
			regenerate(0x10, 0x11, 0x12, 0x13, 0x40, 0x41, 0x42, 0x43, 0x44, 0x2603, 0xFD3F, 0xFFFF).toString(),
			'[\\x10-\\x13@-D\\u2603\\uFD3F\\uFFFF]',
			'Random BMP code points'
		);
		equal(
			regenerate(0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x5A, 0x61).toString(),
			'[A-HZa]',
			'BMP code points within the a-zA-Z range'
		);
		equal(
			regenerate(0x61, 0x5A, 0x48, 0x47, 0x46, 0x45, 0x44, 0x43, 0x42, 0x41).toString(),
			'[A-HZa]',
			'BMP code points within the a-zA-Z range, unordered'
		);
		equal(
			regenerate(0x2F).toString(),
			'\\/',
			'U+002F should be escaped to enable embedding in a literal'
		);
		equal(
			regenerate(0x20, 0x21, 0x23, 0x2F).toString(),
			'[ !#\\/]',
			'Random BMP code points'
		);
		equal(
			regenerate(0xD800, 0xD801, 0xD802, 0xD803, 0xDBFF).toString(),
			'[\\uD800-\\uD803\\uDBFF](?![\\uDC00-\\uDFFF])',
			'Unmatched high surrogates'
		);
		equal(
			regenerate(0xD800, 0xD801, 0xD802, 0xD803, 0xDBFF).toString({ 'bmpOnly': false }),
			'[\\uD800-\\uD803\\uDBFF](?![\\uDC00-\\uDFFF])',
			'Unmatched high surrogates with `bmpOnly: false`'
		);
		equal(
			regenerate(0xD800, 0xD801, 0xD802, 0xD803, 0xDBFF).toString({ 'bmpOnly': true }),
			'[\\uD800-\\uD803\\uDBFF]',
			'Unmatched high surrogates with `bmpOnly: true`'
		);
		equal(
			regenerate(0xDC00, 0xDC01, 0xDC02, 0xDC03, 0xDC04, 0xDC05, 0xDFFB, 0xDFFD, 0xDFFE, 0xDFFF).toString(),
			'(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDC05\\uDFFB\\uDFFD-\\uDFFF]',
			'Unmatched low surrogates'
		);
		equal(
			regenerate(0xDC00, 0xDC01, 0xDC02, 0xDC03, 0xDC04, 0xDC05, 0xDFFB, 0xDFFD, 0xDFFE, 0xDFFF).toString({ 'bmpOnly': false }),
			'(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDC05\\uDFFB\\uDFFD-\\uDFFF]',
			'Unmatched low surrogates with `bmpOnly: false`'
		);
		equal(
			regenerate(0xDC00, 0xDC01, 0xDC02, 0xDC03, 0xDC04, 0xDC05, 0xDFFB, 0xDFFD, 0xDFFE, 0xDFFF).toString({ 'bmpOnly': true }),
			'[\\uDC00-\\uDC05\\uDFFB\\uDFFD-\\uDFFF]',
			'Unmatched low surrogates with `bmpOnly: true`'
		);
		equal(
			regenerate('a', '\xA9', 0x1D306).toString({ 'hasUnicodeFlag': true }),
			'[a\\xA9\\u{1D306}]',
			'Various code points with `hasUnicodeFlag: true`'
		);
		equal(
			regenerate().addRange(0x0, 0x10FFFF).toString({ 'hasUnicodeFlag': true }),
			'[\\0-\\u{10FFFF}]',
			'All Unicode code points with `hasUnicodeFlag: true`'
		);
		equal(
			regenerate().addRange(0xFFFE, 0x010001).toString({ 'hasUnicodeFlag': true }),
			'[\\uFFFE-\\u{10001}]',
			'Range that starts within BMP and ends in astral range with `hasUnicodeFlag: true`'
		);
		equal(
			regenerate(0x0, 0x1, 0x2, 0x3, 0x1D306, 0x1D307, 0x1D308, 0x1D30A).toString(),
			'[\\0-\\x03]|\\uD834[\\uDF06-\\uDF08\\uDF0A]',
			'Mixed BMP and astral code points'
		);
		equal(
			regenerate(0).toString(),
			'\\0',
			'\\0'
		);
		equal(
			regenerate(0, 0x31, 0x32).toString(),
			'[\\x0012]',
			'\\0 may not be followed by a digit'
		);
		equal(
			regenerate(0, 0x38, 0x39).toString(),
			'[\\x0089]',
			'\\0 may not be followed by a digit, even if it’s not an octal digit'
		);
		equal(
			regenerate().addRange(0x0, 0xFFFF).toString(),
			'[\\0-\\uD7FF\\uE000-\\uFFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]',
			'All BMP code points'
		);
		equal(
			regenerate().addRange(0x010000, 0x10FFFF).toString(),
			'[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]',
			'All astral code points'
		);
		equal(
			regenerate().addRange(0x0, 0x10FFFF).toString(),
			'[\\0-\\uD7FF\\uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]',
			'All Unicode code points'
		);
		raises(
			function() {
				regenerate(0x110000).toString();
			},
			RangeError,
			'Invalid code point > 0x10FFFF'
		);
		raises(
			function() {
				regenerate(-1).toString();
			},
			RangeError,
			'Invalid code point < 0x0000'
		);
		equal(
			regenerate().addRange(0x10, 0x13).toString(),
			'[\\x10-\\x13]',
			'BMP code points'
		);
		equal(
			regenerate().addRange(0x41, 0x61).toString(),
			'[A-a]',
			'BMP code points within the a-zA-Z range'
		);
		raises(
			function() {
				regenerate().addRange(0xFFFF, 0x0).toString();
			},
			Error,
			'addRange: start value greater than end value'
		);
		raises(
			function() {
				regenerate().removeRange(0xFFFF, 0x0).toString();
			},
			Error,
			'removeRange: start value greater than end value'
		);
		raises(
			function() {
				regenerate().addRange(0x110000, 0x110005).toString();
			},
			RangeError,
			'addRange: invalid code point > 0x10FFFF'
		);
		raises(
			function() {
				regenerate().addRange(-10, -5).toString();
			},
			RangeError,
			'addRange: Invalid code point < 0x0000'
		);
		equal(
			regenerate().addRange(0, 0xDCFF).toString(),
			'[\\0-\\uD7FF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDCFF]',
			'Range starts before the high surrogate range and ends in the low surrogate range'
		);
		equal(
			regenerate(0xD800 - 1).addRange(0xD800, 0xDBFF).toString(),
			'\\uD7FF|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])',
			'Range starts right before high surrogate range'
		);
		equal(
			regenerate(0xD800 - 1).addRange(0xD800, 0xDBFF).toString({ 'bmpOnly': true }),
			'[\\uD7FF-\\uDBFF]',
			'Range starts right before high surrogate range with `bmpOnly: true`'
		);
		equal(
			regenerate().addRange(0xD855, 0xFFFF).toString(),
			'[\\uE000-\\uFFFF]|[\\uD855-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]',
			'Range starts in the high surrogate range and ends after the low surrogate range'
		);
		equal(
			regenerate().addRange(0xDCFF, 0xDDFF).toString(),
			'(?:[^\\uD800-\\uDBFF]|^)[\\uDCFF-\\uDDFF]',
			'Range starts and ends in the low surrogate range'
		);
		equal(
			regenerate().addRange(0xDCFF, 0xFFFF).toString(),
			'[\\uE000-\\uFFFF]|(?:[^\\uD800-\\uDBFF]|^)[\\uDCFF-\\uDFFF]',
			'Range starts in the low surrogate range and ends after the low surrogate range'
		);
		equal(
			regenerate().addRange(0xDCFF, 0x10FFFF).toString(),
			'[\\uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|(?:[^\\uD800-\\uDBFF]|^)[\\uDCFF-\\uDFFF]',
			'Range starts in the low surrogate range and ends after the low surrogate range'
		);
		equal(
			regenerate(0xDC00 - 1).addRange(0xDC00, 0xDFFF).toString(),
			'\\uDBFF(?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]',
			'Range starts right before low surrogate range'
		);
		equal(
			regenerate(0xDC00 - 1).addRange(0xDC00, 0xDFFF).toString({ 'bmpOnly': true }),
			'[\\uDBFF-\\uDFFF]',
			'Range starts right before low surrogate range with `bmpOnly: true`'
		);
		equal(
			regenerate(0x200C).addRange(0xF900, 0xFDCF).addRange(0xFDF0, 0xFFFD).addRange(0x010000, 0x0EFFFF).toString(),
			'[\\u200C\\uF900-\\uFDCF\\uFDF0-\\uFFFD]|[\\uD800-\\uDB7F][\\uDC00-\\uDFFF]',
			'Various code points'
		);
		equal(
			regenerate('\u200C').addRange('\uF900', '\uFDCF').addRange('\uFDF0', '\uFFFD').addRange('\uD800\uDC00', '\uDB7F\uDFFF').toString(),
			'[\\u200C\\uF900-\\uFDCF\\uFDF0-\\uFFFD]|[\\uD800-\\uDB7F][\\uDC00-\\uDFFF]',
			'Various code points, using symbols as input'
		);
		raises(
			function() {
				regenerate({ 'lol': 'wat' }).toString();
			},
			TypeError,
			'Argument is not a symbol, code point, or array consisting of those'
		);
		raises(
			function() {
				regenerate().add({ 'lol': 'wat' }).toString();
			},
			TypeError,
			'Argument is not a symbol, code point, or array consisting of those'
		);
		raises(
			function() {
				regenerate().remove({ 'lol': 'wat' }).toString();
			},
			TypeError,
			'Argument is not a symbol, code point, or array consisting of those'
		);
		equal(
			regenerate('\x10', '\x11', '\x12', '\x13', '@', 'A', 'B', 'C', 'D', '\u2603', '\uFD3F', '\uFFFF').toString(),
			'[\\x10-\\x13@-D\\u2603\\uFD3F\\uFFFF]',
			'BMP code points, using symbols as input'
		);
		equal(
			regenerate('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Z', 'a').toString(),
			'[A-HZa]',
			'BMP code points within the a-zA-Z range, using symbols as input'
		);
		equal(
			regenerate('a', 'Z', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A').toString(),
			'[A-HZa]',
			'BMP code points within the a-zA-Z range, unordered, using symbols as input'
		);
		equal(
			regenerate('\uD800', '\uD801', '\uD802', '\uD803', '\uDBFF').toString(),
			'[\\uD800-\\uD803\\uDBFF](?![\\uDC00-\\uDFFF])',
			'Unmatched high surrogates, using symbols as input'
		);
		equal(
			regenerate('\uDC00', '\uDC01', '\uDC02', '\uDC03', '\uDC04', '\uDC05', '\uDFFB', '\uDFFD', '\uDFFE', '\uDFFF').toString(),
			'(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDC05\\uDFFB\\uDFFD-\\uDFFF]',
			'Unmatched low surrogates, using symbols as input'
		);
		equal(
			regenerate('\0', '\x01', '\x02', '\x03', '\uD834\uDF06', '\uD834\uDF07', '\uD834\uDF08', '\uD834\uDF0A').toString(),
			'[\\0-\\x03]|\\uD834[\\uDF06-\\uDF08\\uDF0A]',
			'Mixed BMP and astral code points'
		);
		deepEqual(
			regenerate().addRange(0xF9FF, 0xFA07).toArray(),
			[0xF9FF, 0xFA00, 0xFA01, 0xFA02, 0xFA03, 0xFA04, 0xFA05, 0xFA06, 0xFA07],
			'Simple range'
		);
		deepEqual(
			regenerate().addRange(0, 3).add(0x200C).addRange(0xF900, 0xF902).valueOf(),
			[0, 1, 2, 3, 0x200C, 0xF900, 0xF901, 0xF902],
			'Some code point ranges'
		);
		raises(
			function() {
				regenerate(5).addRange(5).toString();
			},
			Error,
			'addRange with a single argument'
		);
		raises(
			function() {
				regenerate(5).removeRange(5).toString();
			},
			Error,
			'removeRange with a single argument'
		);
		equal(
			regenerate().addRange('a', 'f').contains('a'),
			true,
			'contains'
		);
		equal(
			regenerate().addRange('a', 'f').contains('b'),
			true,
			'contains'
		);
		equal(
			regenerate().addRange('a', 'f').contains('f'),
			true,
			'contains'
		);
		equal(
			regenerate().addRange('a', 'f').contains('g'),
			false,
			'contains'
		);
		equal(
			regenerate().addRange('a', 'f').contains('A'),
			false,
			'contains'
		);
		equal(
			regenerate().addRange('a', 'f').contains('B'),
			false,
			'contains'
		);
		equal(
			regenerate().addRange('a', 'f').contains('F'),
			false,
			'contains'
		);
		equal(
			regenerate().addRange('a', 'f').contains('G'),
			false,
			'contains'
		);
		deepEqual(
			regenerate(1, 2, 3, 4, 5, 6, 7).remove([1, 3, 7]).toArray(),
			[2, 4, 5, 6],
			'remove'
		);
		deepEqual(
			regenerate(1, 2, 3, 4).remove([0]).toArray(),
			[1, 2, 3, 4],
			'remove'
		);
		deepEqual(
			regenerate(0x1D306, 0x41, 0x1D307, 0x42, 0x44, 0x1F4A9).remove('A', 0x1D307, ['B', 'D', '\uD83D\uDCA9']).toArray(),
			[0x1D306],
			'remove with various value types'
		);
		deepEqual(
			regenerate().add('A', 0x1D307, 119559, ['B', 0x1D306, 'D', '\uD83D\uDCA9']).toArray(),
			[0x41, 0x42, 0x44, 0x1D306, 0x1D307, 0x1F4A9],
			'add with various value types'
		);
		equal(
			regenerate().addRange(0x103FE, 0x10401).toString(),
			'\\uD800[\\uDFFE\\uDFFF]|\\uD801[\\uDC00\\uDC01]',
			'surrogate bounds (from \\uD800\\uDFFE to \\uD801\\uDC01)'
		);
		equal(
			regenerate().addRange(0x10001, 0x10401).toString(),
			'\\uD800[\\uDC01-\\uDFFF]|\\uD801[\\uDC00\\uDC01]',
			'common low surrogates (from \\uD800\\uDC01 to \\uD801\\uDC01)'
		);
		equal(
			regenerate().add(0x10001, 0x10401).toString(),
			'[\\uD800\\uD801]\\uDC01',
			'common low surrogates (\\uD800\\uDC01 and \\uD801\\uDC01)'
		);
		equal(
			regenerate().add(0x10001, 0x10401, 0x10801).toString(),
			'[\\uD800-\\uD802]\\uDC01',
			'common low surrogates (\\uD800\\uDC01 and \\uD801\\uDC01 and \\uD802\\uDC01)'
		);
		equal(
			regenerate().addRange(0xD800, 0xDBFF).addRange(0xDC00, 0xDFFF).add(0xFFFF).toString(),
			'\\uFFFF|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]',
			'BMP-only symbols incl. lone surrogates but with higher code points too'
		);
		equal(
			regenerate().addRange(0xD800, 0xDBFF).addRange(0xDC00, 0xDFFF).add(0xFFFF, 0x1D306).toString(),
			'\\uFFFF|\\uD834\\uDF06|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]',
			'BMP-only symbols incl. lone surrogates but with higher code points and an astral code point too'
		);
		equal(
			regenerate().addRange(0xD0300, 0xFABFF).toString(),
			'\\uDB00[\\uDF00-\\uDFFF]|[\\uDB01-\\uDBAA][\\uDC00-\\uDFFF]',
			'two distinct sets of common low surrogates (from \\uDB00\\uDF00 to \\uDBAA\\uDFFF)'
		);
		equal(
			regenerate().addRange(0xD0000, 0xD03FF).toString(),
			'\\uDB00[\\uDC00-\\uDFFF]',
			'common high surrogates (from \\uDB00\\uDC00 to \\uDB00\\uDFFF)'
		);
		equal(
			regenerate().add(0xD0000, 0xD03FF).toString(),
			'\\uDB00[\\uDC00\\uDFFF]',
			'common high surrogates (\\uDB00\\uDC00 and \\uDB00\\uDFFF)'
		);
		equal(
			regenerate().add(0xD0200, 0xFA9DD).toString(),
			'\\uDB00\\uDE00|\\uDBAA\\uDDDD',
			'two distinct sets of common low surrogates (\\uDB00\\uDE00 and \\uDBAA\\uDDDD)'
		);
		equal(
			regenerate().addRange(0xD0200, 0xFA9DD).toString(),
			'\\uDB00[\\uDE00-\\uDFFF]|[\\uDB01-\\uDBA9][\\uDC00-\\uDFFF]|\\uDBAA[\\uDC00-\\uDDDD]',
			'two distinct sets of common low surrogates (from \\uDB00\\uDE00 to \\uDBAA\\uDDDD)'
		);
		equal(
			regenerate().addRange(0x20, 0xD900).toString(),
			'[ -\\uD7FF]|[\\uD800-\\uD900](?![\\uDC00-\\uDFFF])',
			'adding a range that starts in ASCII and ends in the high surrogate range'
		);
		equal(
			regenerate().addRange(0x20, 0x1D306).toString(),
			'[ -\\uD7FF\\uE000-\\uFFFF]|[\\uD800-\\uD833][\\uDC00-\\uDFFF]|\\uD834[\\uDC00-\\uDF06]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]',
			'adding a range that starts in ASCII and ends in the astral range'
		);
		equal(
			regenerate().addRange(0xD900, 0x1D306).toString(),
			'[\\uE000-\\uFFFF]|[\\uD800-\\uD833][\\uDC00-\\uDFFF]|\\uD834[\\uDC00-\\uDF06]|[\\uD900-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]',
			'adding a range that starts in the high surrogate range and ends in the astral range'
		);
		equal(
			regenerate().addRange(0xF0000, 0xFFFFD).addRange(0x100000, 0x10FFFD).toString(),
			'[\\uDB80-\\uDBBE\\uDBC0-\\uDBFE][\\uDC00-\\uDFFF]|[\\uDBBF\\uDBFF][\\uDC00-\\uDFFD]',
			'all astral code points except the last one'
		);
		equal(
			regenerate().addRange(0xFFEF, 0xFFF8).addRange(0xFFFE, 0x102FF).toString(),
			'[\\uFFEF-\\uFFF8\\uFFFE\\uFFFF]|\\uD800[\\uDC00-\\uDEFF]',
			'mixed BMP + astral code points'
		);
		equal(
			'\uD834\uDF06'.match(
				RegExp('(' + regenerate().addRange(0xD800, 0xDBFF).addRange(0xDC00, 0xDFFF).toString() + ')')
			),
			null,
			'https://github.com/mathiasbynens/regenerate/issues/28'
		);
		equal(
			regenerate.prototype.valueOf,
			regenerate.prototype.toArray,
			'`valueOf` and `toArray` should be the same'
		);
		equal(
			new regenerate('a', 'b', 0x1D306).toString(),
			regenerate('a', 'b', 0x1D306).toString(),
			'`regenerate` can be called as a constructor'
		);
		deepEqual(
			[regenerate.prototype.add.length, regenerate.prototype.remove.length, regenerate.prototype.addRange.length, regenerate.prototype.removeRange.length, regenerate.prototype.remove.length, regenerate.prototype.intersection.length, regenerate.prototype.contains.length, regenerate.prototype.clone.length, regenerate.prototype.toString.length, regenerate.prototype.toRegExp.length, regenerate.prototype.valueOf.length, regenerate.prototype.toArray.length],
			[1, 1, 2, 2, 1, 1, 1, 0, 1, 1, 0, 0],
			'Regenerate methods are available on `regenerate.prototype`'
		);
		deepEqual(
			regenerate(42).data,
			[42, 43],
			'each Regenerate instance `set` stores its data in `set.data` for plugins to use'
		);
		equal(
			regenerate().add(0x11450, 0x11C50, 0x11C52).toString(),
			'\\uD805\\uDC50|\\uD807[\\uDC50\\uDC52]',
			'a test for a bug in `optimizeByLowSurrogates`'
		);
	});
	test('acid tests', function() {
		// Based on the output for https://gist.github.com/mathiasbynens/6334847
		equal(
			regenerate(0x24, 0x5F, 0xAA, 0xB5, 0xBA, 0x2EC, 0x2EE, 0x386, 0x38C, 0x559, 0x6D5, 0x6FF, 0x710, 0x7B1, 0x7FA, 0x81A, 0x824, 0x828, 0x8A0, 0x93D, 0x950, 0x9B2, 0x9BD, 0x9CE, 0xA5E, 0xABD, 0xAD0, 0xB3D, 0xB71, 0xB83, 0xB9C, 0xBD0, 0xC3D, 0xCBD, 0xCDE, 0xD3D, 0xD4E, 0xDBD, 0xE84, 0xE8A, 0xE8D, 0xEA5, 0xEA7, 0xEBD, 0xEC6, 0xF00, 0x103F, 0x1061, 0x108E, 0x10C7, 0x10CD, 0x1258, 0x12C0, 0x17D7, 0x17DC, 0x18AA, 0x1AA7, 0x1F59, 0x1F5B, 0x1F5D, 0x1FBE, 0x2071, 0x207F, 0x2102, 0x2107, 0x2115, 0x2124, 0x2126, 0x2128, 0x214E, 0x2D27, 0x2D2D, 0x2D6F, 0x2E2F, 0xA8FB, 0xA9CF, 0xAA7A, 0xAAB1, 0xAAC0, 0xAAC2, 0xFB1D, 0xFB3E).addRange(0x41, 0x5A).addRange(0x61, 0x7A).addRange(0xC0, 0xD6).addRange(0xD8, 0xF6).addRange(0xF8, 0x2C1).addRange(0x2C6, 0x2D1).addRange(0x2E0, 0x2E4).addRange(0x370, 0x374).addRange(0x376, 0x377).addRange(0x37A, 0x37D).addRange(0x388, 0x38A).addRange(0x38E, 0x3A1).addRange(0x3A3, 0x3F5).addRange(0x3F7, 0x481).addRange(0x48A, 0x527).addRange(0x531, 0x556).addRange(0x561, 0x587).addRange(0x5D0, 0x5EA).addRange(0x5F0, 0x5F2).addRange(0x620, 0x64A).addRange(0x66E, 0x66F).addRange(0x671, 0x6D3).addRange(0x6E5, 0x6E6).addRange(0x6EE, 0x6EF).addRange(0x6FA, 0x6FC).addRange(0x712, 0x72F).addRange(0x74D, 0x7A5).addRange(0x7CA, 0x7EA).addRange(0x7F4, 0x7F5).addRange(0x800, 0x815).addRange(0x840, 0x858).addRange(0x8A2, 0x8AC).addRange(0x904, 0x939).addRange(0x958, 0x961).addRange(0x971, 0x977).addRange(0x979, 0x97F).addRange(0x985, 0x98C).addRange(0x98F, 0x990).addRange(0x993, 0x9A8).addRange(0x9AA, 0x9B0).addRange(0x9B6, 0x9B9).addRange(0x9DC, 0x9DD).addRange(0x9DF, 0x9E1).addRange(0x9F0, 0x9F1).addRange(0xA05, 0xA0A).addRange(0xA0F, 0xA10).addRange(0xA13, 0xA28).addRange(0xA2A, 0xA30).addRange(0xA32, 0xA33).addRange(0xA35, 0xA36).addRange(0xA38, 0xA39).addRange(0xA59, 0xA5C).addRange(0xA72, 0xA74).addRange(0xA85, 0xA8D).addRange(0xA8F, 0xA91).addRange(0xA93, 0xAA8).addRange(0xAAA, 0xAB0).addRange(0xAB2, 0xAB3).addRange(0xAB5, 0xAB9).addRange(0xAE0, 0xAE1).addRange(0xB05, 0xB0C).addRange(0xB0F, 0xB10).addRange(0xB13, 0xB28).addRange(0xB2A, 0xB30).addRange(0xB32, 0xB33).addRange(0xB35, 0xB39).addRange(0xB5C, 0xB5D).addRange(0xB5F, 0xB61).addRange(0xB85, 0xB8A).addRange(0xB8E, 0xB90).addRange(0xB92, 0xB95).addRange(0xB99, 0xB9A).addRange(0xB9E, 0xB9F).addRange(0xBA3, 0xBA4).addRange(0xBA8, 0xBAA).addRange(0xBAE, 0xBB9).addRange(0xC05, 0xC0C).addRange(0xC0E, 0xC10).addRange(0xC12, 0xC28).addRange(0xC2A, 0xC33).addRange(0xC35, 0xC39).addRange(0xC58, 0xC59).addRange(0xC60, 0xC61).addRange(0xC85, 0xC8C).addRange(0xC8E, 0xC90).addRange(0xC92, 0xCA8).addRange(0xCAA, 0xCB3).addRange(0xCB5, 0xCB9).addRange(0xCE0, 0xCE1).addRange(0xCF1, 0xCF2).addRange(0xD05, 0xD0C).addRange(0xD0E, 0xD10).addRange(0xD12, 0xD3A).addRange(0xD60, 0xD61).addRange(0xD7A, 0xD7F).addRange(0xD85, 0xD96).addRange(0xD9A, 0xDB1).addRange(0xDB3, 0xDBB).addRange(0xDC0, 0xDC6).addRange(0xE01, 0xE30).addRange(0xE32, 0xE33).addRange(0xE40, 0xE46).addRange(0xE81, 0xE82).addRange(0xE87, 0xE88).addRange(0xE94, 0xE97).addRange(0xE99, 0xE9F).addRange(0xEA1, 0xEA3).addRange(0xEAA, 0xEAB).addRange(0xEAD, 0xEB0).addRange(0xEB2, 0xEB3).addRange(0xEC0, 0xEC4).addRange(0xEDC, 0xEDF).addRange(0xF40, 0xF47).addRange(0xF49, 0xF6C).addRange(0xF88, 0xF8C).addRange(0x1000, 0x102A).addRange(0x1050, 0x1055).addRange(0x105A, 0x105D).addRange(0x1065, 0x1066).addRange(0x106E, 0x1070).addRange(0x1075, 0x1081).addRange(0x10A0, 0x10C5).addRange(0x10D0, 0x10FA).addRange(0x10FC, 0x1248).addRange(0x124A, 0x124D).addRange(0x1250, 0x1256).addRange(0x125A, 0x125D).addRange(0x1260, 0x1288).addRange(0x128A, 0x128D).addRange(0x1290, 0x12B0).addRange(0x12B2, 0x12B5).addRange(0x12B8, 0x12BE).addRange(0x12C2, 0x12C5).addRange(0x12C8, 0x12D6).addRange(0x12D8, 0x1310).addRange(0x1312, 0x1315).addRange(0x1318, 0x135A).addRange(0x1380, 0x138F).addRange(0x13A0, 0x13F4).addRange(0x1401, 0x166C).addRange(0x166F, 0x167F).addRange(0x1681, 0x169A).addRange(0x16A0, 0x16EA).addRange(0x16EE, 0x16F0).addRange(0x1700, 0x170C).addRange(0x170E, 0x1711).addRange(0x1720, 0x1731).addRange(0x1740, 0x1751).addRange(0x1760, 0x176C).addRange(0x176E, 0x1770).addRange(0x1780, 0x17B3).addRange(0x1820, 0x1877).addRange(0x1880, 0x18A8).addRange(0x18B0, 0x18F5).addRange(0x1900, 0x191C).addRange(0x1950, 0x196D).addRange(0x1970, 0x1974).addRange(0x1980, 0x19AB).addRange(0x19C1, 0x19C7).addRange(0x1A00, 0x1A16).addRange(0x1A20, 0x1A54).addRange(0x1B05, 0x1B33).addRange(0x1B45, 0x1B4B).addRange(0x1B83, 0x1BA0).addRange(0x1BAE, 0x1BAF).addRange(0x1BBA, 0x1BE5).addRange(0x1C00, 0x1C23).addRange(0x1C4D, 0x1C4F).addRange(0x1C5A, 0x1C7D).addRange(0x1CE9, 0x1CEC).addRange(0x1CEE, 0x1CF1).addRange(0x1CF5, 0x1CF6).addRange(0x1D00, 0x1DBF).addRange(0x1E00, 0x1F15).addRange(0x1F18, 0x1F1D).addRange(0x1F20, 0x1F45).addRange(0x1F48, 0x1F4D).addRange(0x1F50, 0x1F57).addRange(0x1F5F, 0x1F7D).addRange(0x1F80, 0x1FB4).addRange(0x1FB6, 0x1FBC).addRange(0x1FC2, 0x1FC4).addRange(0x1FC6, 0x1FCC).addRange(0x1FD0, 0x1FD3).addRange(0x1FD6, 0x1FDB).addRange(0x1FE0, 0x1FEC).addRange(0x1FF2, 0x1FF4).addRange(0x1FF6, 0x1FFC).addRange(0x2090, 0x209C).addRange(0x210A, 0x2113).addRange(0x2119, 0x211D).addRange(0x212A, 0x212D).addRange(0x212F, 0x2139).addRange(0x213C, 0x213F).addRange(0x2145, 0x2149).addRange(0x2160, 0x2188).addRange(0x2C00, 0x2C2E).addRange(0x2C30, 0x2C5E).addRange(0x2C60, 0x2CE4).addRange(0x2CEB, 0x2CEE).addRange(0x2CF2, 0x2CF3).addRange(0x2D00, 0x2D25).addRange(0x2D30, 0x2D67).addRange(0x2D80, 0x2D96).addRange(0x2DA0, 0x2DA6).addRange(0x2DA8, 0x2DAE).addRange(0x2DB0, 0x2DB6).addRange(0x2DB8, 0x2DBE).addRange(0x2DC0, 0x2DC6).addRange(0x2DC8, 0x2DCE).addRange(0x2DD0, 0x2DD6).addRange(0x2DD8, 0x2DDE).addRange(0x3005, 0x3007).addRange(0x3021, 0x3029).addRange(0x3031, 0x3035).addRange(0x3038, 0x303C).addRange(0x3041, 0x3096).addRange(0x309D, 0x309F).addRange(0x30A1, 0x30FA).addRange(0x30FC, 0x30FF).addRange(0x3105, 0x312D).addRange(0x3131, 0x318E).addRange(0x31A0, 0x31BA).addRange(0x31F0, 0x31FF).addRange(0x3400, 0x4DB5).addRange(0x4E00, 0x9FCC).addRange(0xA000, 0xA48C).addRange(0xA4D0, 0xA4FD).addRange(0xA500, 0xA60C).addRange(0xA610, 0xA61F).addRange(0xA62A, 0xA62B).addRange(0xA640, 0xA66E).addRange(0xA67F, 0xA697).addRange(0xA6A0, 0xA6EF).addRange(0xA717, 0xA71F).addRange(0xA722, 0xA788).addRange(0xA78B, 0xA78E).addRange(0xA790, 0xA793).addRange(0xA7A0, 0xA7AA).addRange(0xA7F8, 0xA801).addRange(0xA803, 0xA805).addRange(0xA807, 0xA80A).addRange(0xA80C, 0xA822).addRange(0xA840, 0xA873).addRange(0xA882, 0xA8B3).addRange(0xA8F2, 0xA8F7).addRange(0xA90A, 0xA925).addRange(0xA930, 0xA946).addRange(0xA960, 0xA97C).addRange(0xA984, 0xA9B2).addRange(0xAA00, 0xAA28).addRange(0xAA40, 0xAA42).addRange(0xAA44, 0xAA4B).addRange(0xAA60, 0xAA76).addRange(0xAA80, 0xAAAF).addRange(0xAAB5, 0xAAB6).addRange(0xAAB9, 0xAABD).addRange(0xAADB, 0xAADD).addRange(0xAAE0, 0xAAEA).addRange(0xAAF2, 0xAAF4).addRange(0xAB01, 0xAB06).addRange(0xAB09, 0xAB0E).addRange(0xAB11, 0xAB16).addRange(0xAB20, 0xAB26).addRange(0xAB28, 0xAB2E).addRange(0xABC0, 0xABE2).addRange(0xAC00, 0xD7A3).addRange(0xD7B0, 0xD7C6).addRange(0xD7CB, 0xD7FB).addRange(0xF900, 0xFA6D).addRange(0xFA70, 0xFAD9).addRange(0xFB00, 0xFB06).addRange(0xFB13, 0xFB17).addRange(0xFB1F, 0xFB28).addRange(0xFB2A, 0xFB36).addRange(0xFB38, 0xFB3C).addRange(0xFB40, 0xFB41).addRange(0xFB43, 0xFB44).addRange(0xFB46, 0xFBB1).addRange(0xFBD3, 0xFD3D).addRange(0xFD50, 0xFD8F).addRange(0xFD92, 0xFDC7).addRange(0xFDF0, 0xFDFB).addRange(0xFE70, 0xFE74).addRange(0xFE76, 0xFEFC).addRange(0xFF21, 0xFF3A).addRange(0xFF41, 0xFF5A).addRange(0xFF66, 0xFFBE).addRange(0xFFC2, 0xFFC7).addRange(0xFFCA, 0xFFCF).addRange(0xFFD2, 0xFFD7).addRange(0xFFDA, 0xFFDC).toString(),
			'[\\$A-Z_a-z\\xAA\\xB5\\xBA\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u048A-\\u0527\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0620-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0800-\\u0815\\u081A\\u0824\\u0828\\u0840-\\u0858\\u08A0\\u08A2-\\u08AC\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971-\\u0977\\u0979-\\u097F\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C33\\u0C35-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0CF1\\u0CF2\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D\\u0D4E\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC-\\u0EDF\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8C\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10C7\\u10CD\\u10D0-\\u10FA\\u10FC-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u16EE-\\u16F0\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u18B0-\\u18F5\\u1900-\\u191C\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1A20-\\u1A54\\u1AA7\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1BBA-\\u1BE5\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C7D\\u1CE9-\\u1CEC\\u1CEE-\\u1CF1\\u1CF5\\u1CF6\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u209C\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2160-\\u2188\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CEE\\u2CF2\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005-\\u3007\\u3021-\\u3029\\u3031-\\u3035\\u3038-\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA66E\\uA67F-\\uA697\\uA6A0-\\uA6EF\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA793\\uA7A0-\\uA7AA\\uA7F8-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA8F7\\uA8FB\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9CF\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAA60-\\uAA76\\uAA7A\\uAA80-\\uAAAF\\uAAB1\\uAAB5\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADD\\uAAE0-\\uAAEA\\uAAF2-\\uAAF4\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uABC0-\\uABE2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]',
			'ES 5.1 / Unicode 6.3.0 `IdentifierStart`'
		);
		equal(
			regenerate(0x24, 0x5F, 0xAA, 0xB5, 0xBA, 0x2EC, 0x2EE, 0x386, 0x38C, 0x559, 0x5BF, 0x5C7, 0x6FF, 0x7FA, 0x8A0, 0x9B2, 0x9D7, 0xA3C, 0xA51, 0xA5E, 0xAD0, 0xB71, 0xB9C, 0xBD0, 0xBD7, 0xCDE, 0xD57, 0xDBD, 0xDCA, 0xDD6, 0xE84, 0xE8A, 0xE8D, 0xEA5, 0xEA7, 0xEC6, 0xF00, 0xF35, 0xF37, 0xF39, 0xFC6, 0x10C7, 0x10CD, 0x1258, 0x12C0, 0x17D7, 0x1AA7, 0x1F59, 0x1F5B, 0x1F5D, 0x1FBE, 0x2054, 0x2071, 0x207F, 0x20E1, 0x2102, 0x2107, 0x2115, 0x2124, 0x2126, 0x2128, 0x214E, 0x2D27, 0x2D2D, 0x2D6F, 0x2E2F, 0xA8FB, 0xFB3E, 0xFF3F).addRange(0x30, 0x39).addRange(0x41, 0x5A).addRange(0x61, 0x7A).addRange(0xC0, 0xD6).addRange(0xD8, 0xF6).addRange(0xF8, 0x2C1).addRange(0x2C6, 0x2D1).addRange(0x2E0, 0x2E4).addRange(0x300, 0x374).addRange(0x376, 0x377).addRange(0x37A, 0x37D).addRange(0x388, 0x38A).addRange(0x38E, 0x3A1).addRange(0x3A3, 0x3F5).addRange(0x3F7, 0x481).addRange(0x483, 0x487).addRange(0x48A, 0x527).addRange(0x531, 0x556).addRange(0x561, 0x587).addRange(0x591, 0x5BD).addRange(0x5C1, 0x5C2).addRange(0x5C4, 0x5C5).addRange(0x5D0, 0x5EA).addRange(0x5F0, 0x5F2).addRange(0x610, 0x61A).addRange(0x620, 0x669).addRange(0x66E, 0x6D3).addRange(0x6D5, 0x6DC).addRange(0x6DF, 0x6E8).addRange(0x6EA, 0x6FC).addRange(0x710, 0x74A).addRange(0x74D, 0x7B1).addRange(0x7C0, 0x7F5).addRange(0x800, 0x82D).addRange(0x840, 0x85B).addRange(0x8A2, 0x8AC).addRange(0x8E4, 0x8FE).addRange(0x900, 0x963).addRange(0x966, 0x96F).addRange(0x971, 0x977).addRange(0x979, 0x97F).addRange(0x981, 0x983).addRange(0x985, 0x98C).addRange(0x98F, 0x990).addRange(0x993, 0x9A8).addRange(0x9AA, 0x9B0).addRange(0x9B6, 0x9B9).addRange(0x9BC, 0x9C4).addRange(0x9C7, 0x9C8).addRange(0x9CB, 0x9CE).addRange(0x9DC, 0x9DD).addRange(0x9DF, 0x9E3).addRange(0x9E6, 0x9F1).addRange(0xA01, 0xA03).addRange(0xA05, 0xA0A).addRange(0xA0F, 0xA10).addRange(0xA13, 0xA28).addRange(0xA2A, 0xA30).addRange(0xA32, 0xA33).addRange(0xA35, 0xA36).addRange(0xA38, 0xA39).addRange(0xA3E, 0xA42).addRange(0xA47, 0xA48).addRange(0xA4B, 0xA4D).addRange(0xA59, 0xA5C).addRange(0xA66, 0xA75).addRange(0xA81, 0xA83).addRange(0xA85, 0xA8D).addRange(0xA8F, 0xA91).addRange(0xA93, 0xAA8).addRange(0xAAA, 0xAB0).addRange(0xAB2, 0xAB3).addRange(0xAB5, 0xAB9).addRange(0xABC, 0xAC5).addRange(0xAC7, 0xAC9).addRange(0xACB, 0xACD).addRange(0xAE0, 0xAE3).addRange(0xAE6, 0xAEF).addRange(0xB01, 0xB03).addRange(0xB05, 0xB0C).addRange(0xB0F, 0xB10).addRange(0xB13, 0xB28).addRange(0xB2A, 0xB30).addRange(0xB32, 0xB33).addRange(0xB35, 0xB39).addRange(0xB3C, 0xB44).addRange(0xB47, 0xB48).addRange(0xB4B, 0xB4D).addRange(0xB56, 0xB57).addRange(0xB5C, 0xB5D).addRange(0xB5F, 0xB63).addRange(0xB66, 0xB6F).addRange(0xB82, 0xB83).addRange(0xB85, 0xB8A).addRange(0xB8E, 0xB90).addRange(0xB92, 0xB95).addRange(0xB99, 0xB9A).addRange(0xB9E, 0xB9F).addRange(0xBA3, 0xBA4).addRange(0xBA8, 0xBAA).addRange(0xBAE, 0xBB9).addRange(0xBBE, 0xBC2).addRange(0xBC6, 0xBC8).addRange(0xBCA, 0xBCD).addRange(0xBE6, 0xBEF).addRange(0xC01, 0xC03).addRange(0xC05, 0xC0C).addRange(0xC0E, 0xC10).addRange(0xC12, 0xC28).addRange(0xC2A, 0xC33).addRange(0xC35, 0xC39).addRange(0xC3D, 0xC44).addRange(0xC46, 0xC48).addRange(0xC4A, 0xC4D).addRange(0xC55, 0xC56).addRange(0xC58, 0xC59).addRange(0xC60, 0xC63).addRange(0xC66, 0xC6F).addRange(0xC82, 0xC83).addRange(0xC85, 0xC8C).addRange(0xC8E, 0xC90).addRange(0xC92, 0xCA8).addRange(0xCAA, 0xCB3).addRange(0xCB5, 0xCB9).addRange(0xCBC, 0xCC4).addRange(0xCC6, 0xCC8).addRange(0xCCA, 0xCCD).addRange(0xCD5, 0xCD6).addRange(0xCE0, 0xCE3).addRange(0xCE6, 0xCEF).addRange(0xCF1, 0xCF2).addRange(0xD02, 0xD03).addRange(0xD05, 0xD0C).addRange(0xD0E, 0xD10).addRange(0xD12, 0xD3A).addRange(0xD3D, 0xD44).addRange(0xD46, 0xD48).addRange(0xD4A, 0xD4E).addRange(0xD60, 0xD63).addRange(0xD66, 0xD6F).addRange(0xD7A, 0xD7F).addRange(0xD82, 0xD83).addRange(0xD85, 0xD96).addRange(0xD9A, 0xDB1).addRange(0xDB3, 0xDBB).addRange(0xDC0, 0xDC6).addRange(0xDCF, 0xDD4).addRange(0xDD8, 0xDDF).addRange(0xDF2, 0xDF3).addRange(0xE01, 0xE3A).addRange(0xE40, 0xE4E).addRange(0xE50, 0xE59).addRange(0xE81, 0xE82).addRange(0xE87, 0xE88).addRange(0xE94, 0xE97).addRange(0xE99, 0xE9F).addRange(0xEA1, 0xEA3).addRange(0xEAA, 0xEAB).addRange(0xEAD, 0xEB9).addRange(0xEBB, 0xEBD).addRange(0xEC0, 0xEC4).addRange(0xEC8, 0xECD).addRange(0xED0, 0xED9).addRange(0xEDC, 0xEDF).addRange(0xF18, 0xF19).addRange(0xF20, 0xF29).addRange(0xF3E, 0xF47).addRange(0xF49, 0xF6C).addRange(0xF71, 0xF84).addRange(0xF86, 0xF97).addRange(0xF99, 0xFBC).addRange(0x1000, 0x1049).addRange(0x1050, 0x109D).addRange(0x10A0, 0x10C5).addRange(0x10D0, 0x10FA).addRange(0x10FC, 0x1248).addRange(0x124A, 0x124D).addRange(0x1250, 0x1256).addRange(0x125A, 0x125D).addRange(0x1260, 0x1288).addRange(0x128A, 0x128D).addRange(0x1290, 0x12B0).addRange(0x12B2, 0x12B5).addRange(0x12B8, 0x12BE).addRange(0x12C2, 0x12C5).addRange(0x12C8, 0x12D6).addRange(0x12D8, 0x1310).addRange(0x1312, 0x1315).addRange(0x1318, 0x135A).addRange(0x135D, 0x135F).addRange(0x1380, 0x138F).addRange(0x13A0, 0x13F4).addRange(0x1401, 0x166C).addRange(0x166F, 0x167F).addRange(0x1681, 0x169A).addRange(0x16A0, 0x16EA).addRange(0x16EE, 0x16F0).addRange(0x1700, 0x170C).addRange(0x170E, 0x1714).addRange(0x1720, 0x1734).addRange(0x1740, 0x1753).addRange(0x1760, 0x176C).addRange(0x176E, 0x1770).addRange(0x1772, 0x1773).addRange(0x1780, 0x17D3).addRange(0x17DC, 0x17DD).addRange(0x17E0, 0x17E9).addRange(0x180B, 0x180D).addRange(0x1810, 0x1819).addRange(0x1820, 0x1877).addRange(0x1880, 0x18AA).addRange(0x18B0, 0x18F5).addRange(0x1900, 0x191C).addRange(0x1920, 0x192B).addRange(0x1930, 0x193B).addRange(0x1946, 0x196D).addRange(0x1970, 0x1974).addRange(0x1980, 0x19AB).addRange(0x19B0, 0x19C9).addRange(0x19D0, 0x19D9).addRange(0x1A00, 0x1A1B).addRange(0x1A20, 0x1A5E).addRange(0x1A60, 0x1A7C).addRange(0x1A7F, 0x1A89).addRange(0x1A90, 0x1A99).addRange(0x1B00, 0x1B4B).addRange(0x1B50, 0x1B59).addRange(0x1B6B, 0x1B73).addRange(0x1B80, 0x1BF3).addRange(0x1C00, 0x1C37).addRange(0x1C40, 0x1C49).addRange(0x1C4D, 0x1C7D).addRange(0x1CD0, 0x1CD2).addRange(0x1CD4, 0x1CF6).addRange(0x1D00, 0x1DE6).addRange(0x1DFC, 0x1F15).addRange(0x1F18, 0x1F1D).addRange(0x1F20, 0x1F45).addRange(0x1F48, 0x1F4D).addRange(0x1F50, 0x1F57).addRange(0x1F5F, 0x1F7D).addRange(0x1F80, 0x1FB4).addRange(0x1FB6, 0x1FBC).addRange(0x1FC2, 0x1FC4).addRange(0x1FC6, 0x1FCC).addRange(0x1FD0, 0x1FD3).addRange(0x1FD6, 0x1FDB).addRange(0x1FE0, 0x1FEC).addRange(0x1FF2, 0x1FF4).addRange(0x1FF6, 0x1FFC).addRange(0x200C, 0x200D).addRange(0x203F, 0x2040).addRange(0x2090, 0x209C).addRange(0x20D0, 0x20DC).addRange(0x20E5, 0x20F0).addRange(0x210A, 0x2113).addRange(0x2119, 0x211D).addRange(0x212A, 0x212D).addRange(0x212F, 0x2139).addRange(0x213C, 0x213F).addRange(0x2145, 0x2149).addRange(0x2160, 0x2188).addRange(0x2C00, 0x2C2E).addRange(0x2C30, 0x2C5E).addRange(0x2C60, 0x2CE4).addRange(0x2CEB, 0x2CF3).addRange(0x2D00, 0x2D25).addRange(0x2D30, 0x2D67).addRange(0x2D7F, 0x2D96).addRange(0x2DA0, 0x2DA6).addRange(0x2DA8, 0x2DAE).addRange(0x2DB0, 0x2DB6).addRange(0x2DB8, 0x2DBE).addRange(0x2DC0, 0x2DC6).addRange(0x2DC8, 0x2DCE).addRange(0x2DD0, 0x2DD6).addRange(0x2DD8, 0x2DDE).addRange(0x2DE0, 0x2DFF).addRange(0x3005, 0x3007).addRange(0x3021, 0x302F).addRange(0x3031, 0x3035).addRange(0x3038, 0x303C).addRange(0x3041, 0x3096).addRange(0x3099, 0x309A).addRange(0x309D, 0x309F).addRange(0x30A1, 0x30FA).addRange(0x30FC, 0x30FF).addRange(0x3105, 0x312D).addRange(0x3131, 0x318E).addRange(0x31A0, 0x31BA).addRange(0x31F0, 0x31FF).addRange(0x3400, 0x4DB5).addRange(0x4E00, 0x9FCC).addRange(0xA000, 0xA48C).addRange(0xA4D0, 0xA4FD).addRange(0xA500, 0xA60C).addRange(0xA610, 0xA62B).addRange(0xA640, 0xA66F).addRange(0xA674, 0xA67D).addRange(0xA67F, 0xA697).addRange(0xA69F, 0xA6F1).addRange(0xA717, 0xA71F).addRange(0xA722, 0xA788).addRange(0xA78B, 0xA78E).addRange(0xA790, 0xA793).addRange(0xA7A0, 0xA7AA).addRange(0xA7F8, 0xA827).addRange(0xA840, 0xA873).addRange(0xA880, 0xA8C4).addRange(0xA8D0, 0xA8D9).addRange(0xA8E0, 0xA8F7).addRange(0xA900, 0xA92D).addRange(0xA930, 0xA953).addRange(0xA960, 0xA97C).addRange(0xA980, 0xA9C0).addRange(0xA9CF, 0xA9D9).addRange(0xAA00, 0xAA36).addRange(0xAA40, 0xAA4D).addRange(0xAA50, 0xAA59).addRange(0xAA60, 0xAA76).addRange(0xAA7A, 0xAA7B).addRange(0xAA80, 0xAAC2).addRange(0xAADB, 0xAADD).addRange(0xAAE0, 0xAAEF).addRange(0xAAF2, 0xAAF6).addRange(0xAB01, 0xAB06).addRange(0xAB09, 0xAB0E).addRange(0xAB11, 0xAB16).addRange(0xAB20, 0xAB26).addRange(0xAB28, 0xAB2E).addRange(0xABC0, 0xABEA).addRange(0xABEC, 0xABED).addRange(0xABF0, 0xABF9).addRange(0xAC00, 0xD7A3).addRange(0xD7B0, 0xD7C6).addRange(0xD7CB, 0xD7FB).addRange(0xF900, 0xFA6D).addRange(0xFA70, 0xFAD9).addRange(0xFB00, 0xFB06).addRange(0xFB13, 0xFB17).addRange(0xFB1D, 0xFB28).addRange(0xFB2A, 0xFB36).addRange(0xFB38, 0xFB3C).addRange(0xFB40, 0xFB41).addRange(0xFB43, 0xFB44).addRange(0xFB46, 0xFBB1).addRange(0xFBD3, 0xFD3D).addRange(0xFD50, 0xFD8F).addRange(0xFD92, 0xFDC7).addRange(0xFDF0, 0xFDFB).addRange(0xFE00, 0xFE0F).addRange(0xFE20, 0xFE26).addRange(0xFE33, 0xFE34).addRange(0xFE4D, 0xFE4F).addRange(0xFE70, 0xFE74).addRange(0xFE76, 0xFEFC).addRange(0xFF10, 0xFF19).addRange(0xFF21, 0xFF3A).addRange(0xFF41, 0xFF5A).addRange(0xFF66, 0xFFBE).addRange(0xFFC2, 0xFFC7).addRange(0xFFCA, 0xFFCF).addRange(0xFFD2, 0xFFD7).addRange(0xFFDA, 0xFFDC).toString(),
			'[\\$0-9A-Z_a-z\\xAA\\xB5\\xBA\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0300-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u0483-\\u0487\\u048A-\\u0527\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0610-\\u061A\\u0620-\\u0669\\u066E-\\u06D3\\u06D5-\\u06DC\\u06DF-\\u06E8\\u06EA-\\u06FC\\u06FF\\u0710-\\u074A\\u074D-\\u07B1\\u07C0-\\u07F5\\u07FA\\u0800-\\u082D\\u0840-\\u085B\\u08A0\\u08A2-\\u08AC\\u08E4-\\u08FE\\u0900-\\u0963\\u0966-\\u096F\\u0971-\\u0977\\u0979-\\u097F\\u0981-\\u0983\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BC-\\u09C4\\u09C7\\u09C8\\u09CB-\\u09CE\\u09D7\\u09DC\\u09DD\\u09DF-\\u09E3\\u09E6-\\u09F1\\u0A01-\\u0A03\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A3C\\u0A3E-\\u0A42\\u0A47\\u0A48\\u0A4B-\\u0A4D\\u0A51\\u0A59-\\u0A5C\\u0A5E\\u0A66-\\u0A75\\u0A81-\\u0A83\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABC-\\u0AC5\\u0AC7-\\u0AC9\\u0ACB-\\u0ACD\\u0AD0\\u0AE0-\\u0AE3\\u0AE6-\\u0AEF\\u0B01-\\u0B03\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3C-\\u0B44\\u0B47\\u0B48\\u0B4B-\\u0B4D\\u0B56\\u0B57\\u0B5C\\u0B5D\\u0B5F-\\u0B63\\u0B66-\\u0B6F\\u0B71\\u0B82\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BBE-\\u0BC2\\u0BC6-\\u0BC8\\u0BCA-\\u0BCD\\u0BD0\\u0BD7\\u0BE6-\\u0BEF\\u0C01-\\u0C03\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C33\\u0C35-\\u0C39\\u0C3D-\\u0C44\\u0C46-\\u0C48\\u0C4A-\\u0C4D\\u0C55\\u0C56\\u0C58\\u0C59\\u0C60-\\u0C63\\u0C66-\\u0C6F\\u0C82\\u0C83\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBC-\\u0CC4\\u0CC6-\\u0CC8\\u0CCA-\\u0CCD\\u0CD5\\u0CD6\\u0CDE\\u0CE0-\\u0CE3\\u0CE6-\\u0CEF\\u0CF1\\u0CF2\\u0D02\\u0D03\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D-\\u0D44\\u0D46-\\u0D48\\u0D4A-\\u0D4E\\u0D57\\u0D60-\\u0D63\\u0D66-\\u0D6F\\u0D7A-\\u0D7F\\u0D82\\u0D83\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0DCA\\u0DCF-\\u0DD4\\u0DD6\\u0DD8-\\u0DDF\\u0DF2\\u0DF3\\u0E01-\\u0E3A\\u0E40-\\u0E4E\\u0E50-\\u0E59\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB9\\u0EBB-\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EC8-\\u0ECD\\u0ED0-\\u0ED9\\u0EDC-\\u0EDF\\u0F00\\u0F18\\u0F19\\u0F20-\\u0F29\\u0F35\\u0F37\\u0F39\\u0F3E-\\u0F47\\u0F49-\\u0F6C\\u0F71-\\u0F84\\u0F86-\\u0F97\\u0F99-\\u0FBC\\u0FC6\\u1000-\\u1049\\u1050-\\u109D\\u10A0-\\u10C5\\u10C7\\u10CD\\u10D0-\\u10FA\\u10FC-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u135D-\\u135F\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u16EE-\\u16F0\\u1700-\\u170C\\u170E-\\u1714\\u1720-\\u1734\\u1740-\\u1753\\u1760-\\u176C\\u176E-\\u1770\\u1772\\u1773\\u1780-\\u17D3\\u17D7\\u17DC\\u17DD\\u17E0-\\u17E9\\u180B-\\u180D\\u1810-\\u1819\\u1820-\\u1877\\u1880-\\u18AA\\u18B0-\\u18F5\\u1900-\\u191C\\u1920-\\u192B\\u1930-\\u193B\\u1946-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19B0-\\u19C9\\u19D0-\\u19D9\\u1A00-\\u1A1B\\u1A20-\\u1A5E\\u1A60-\\u1A7C\\u1A7F-\\u1A89\\u1A90-\\u1A99\\u1AA7\\u1B00-\\u1B4B\\u1B50-\\u1B59\\u1B6B-\\u1B73\\u1B80-\\u1BF3\\u1C00-\\u1C37\\u1C40-\\u1C49\\u1C4D-\\u1C7D\\u1CD0-\\u1CD2\\u1CD4-\\u1CF6\\u1D00-\\u1DE6\\u1DFC-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u200C\\u200D\\u203F\\u2040\\u2054\\u2071\\u207F\\u2090-\\u209C\\u20D0-\\u20DC\\u20E1\\u20E5-\\u20F0\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2160-\\u2188\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D7F-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2DE0-\\u2DFF\\u2E2F\\u3005-\\u3007\\u3021-\\u302F\\u3031-\\u3035\\u3038-\\u303C\\u3041-\\u3096\\u3099\\u309A\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA62B\\uA640-\\uA66F\\uA674-\\uA67D\\uA67F-\\uA697\\uA69F-\\uA6F1\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA793\\uA7A0-\\uA7AA\\uA7F8-\\uA827\\uA840-\\uA873\\uA880-\\uA8C4\\uA8D0-\\uA8D9\\uA8E0-\\uA8F7\\uA8FB\\uA900-\\uA92D\\uA930-\\uA953\\uA960-\\uA97C\\uA980-\\uA9C0\\uA9CF-\\uA9D9\\uAA00-\\uAA36\\uAA40-\\uAA4D\\uAA50-\\uAA59\\uAA60-\\uAA76\\uAA7A\\uAA7B\\uAA80-\\uAAC2\\uAADB-\\uAADD\\uAAE0-\\uAAEF\\uAAF2-\\uAAF6\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uABC0-\\uABEA\\uABEC\\uABED\\uABF0-\\uABF9\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE00-\\uFE0F\\uFE20-\\uFE26\\uFE33\\uFE34\\uFE4D-\\uFE4F\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF10-\\uFF19\\uFF21-\\uFF3A\\uFF3F\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]',
			'ES 5.1 / Unicode 6.3.0 `IdentifierPart`'
		);
		equal(
			regenerate(0x24, 0x5F, 0xAA, 0xB5, 0xBA, 0x2EC, 0x2EE, 0x386, 0x38C, 0x559, 0x6D5, 0x6FF, 0x710, 0x7B1, 0x7FA, 0x81A, 0x824, 0x828, 0x8A0, 0x93D, 0x950, 0x9B2, 0x9BD, 0x9CE, 0xA5E, 0xABD, 0xAD0, 0xB3D, 0xB71, 0xB83, 0xB9C, 0xBD0, 0xC3D, 0xCBD, 0xCDE, 0xD3D, 0xD4E, 0xDBD, 0xE84, 0xE8A, 0xE8D, 0xEA5, 0xEA7, 0xEBD, 0xEC6, 0xF00, 0x103F, 0x1061, 0x108E, 0x10C7, 0x10CD, 0x1258, 0x12C0, 0x17D7, 0x17DC, 0x18AA, 0x1AA7, 0x1F59, 0x1F5B, 0x1F5D, 0x1FBE, 0x2071, 0x207F, 0x2102, 0x2107, 0x2115, 0x2124, 0x2126, 0x2128, 0x214E, 0x2D27, 0x2D2D, 0x2D6F, 0xA8FB, 0xA9CF, 0xAA7A, 0xAAB1, 0xAAC0, 0xAAC2, 0xFB1D, 0xFB3E, 0x10808, 0x1083C, 0x10A00, 0x16F50, 0x1D4A2, 0x1D4BB, 0x1D546, 0x1EE24, 0x1EE27, 0x1EE39, 0x1EE3B, 0x1EE42, 0x1EE47, 0x1EE49, 0x1EE4B, 0x1EE54, 0x1EE57, 0x1EE59, 0x1EE5B, 0x1EE5D, 0x1EE5F, 0x1EE64, 0x1EE7E).addRange(0x41, 0x5A).addRange(0x61, 0x7A).addRange(0xC0, 0xD6).addRange(0xD8, 0xF6).addRange(0xF8, 0x2C1).addRange(0x2C6, 0x2D1).addRange(0x2E0, 0x2E4).addRange(0x370, 0x374).addRange(0x376, 0x377).addRange(0x37A, 0x37D).addRange(0x388, 0x38A).addRange(0x38E, 0x3A1).addRange(0x3A3, 0x3F5).addRange(0x3F7, 0x481).addRange(0x48A, 0x527).addRange(0x531, 0x556).addRange(0x561, 0x587).addRange(0x5D0, 0x5EA).addRange(0x5F0, 0x5F2).addRange(0x620, 0x64A).addRange(0x66E, 0x66F).addRange(0x671, 0x6D3).addRange(0x6E5, 0x6E6).addRange(0x6EE, 0x6EF).addRange(0x6FA, 0x6FC).addRange(0x712, 0x72F).addRange(0x74D, 0x7A5).addRange(0x7CA, 0x7EA).addRange(0x7F4, 0x7F5).addRange(0x800, 0x815).addRange(0x840, 0x858).addRange(0x8A2, 0x8AC).addRange(0x904, 0x939).addRange(0x958, 0x961).addRange(0x971, 0x977).addRange(0x979, 0x97F).addRange(0x985, 0x98C).addRange(0x98F, 0x990).addRange(0x993, 0x9A8).addRange(0x9AA, 0x9B0).addRange(0x9B6, 0x9B9).addRange(0x9DC, 0x9DD).addRange(0x9DF, 0x9E1).addRange(0x9F0, 0x9F1).addRange(0xA05, 0xA0A).addRange(0xA0F, 0xA10).addRange(0xA13, 0xA28).addRange(0xA2A, 0xA30).addRange(0xA32, 0xA33).addRange(0xA35, 0xA36).addRange(0xA38, 0xA39).addRange(0xA59, 0xA5C).addRange(0xA72, 0xA74).addRange(0xA85, 0xA8D).addRange(0xA8F, 0xA91).addRange(0xA93, 0xAA8).addRange(0xAAA, 0xAB0).addRange(0xAB2, 0xAB3).addRange(0xAB5, 0xAB9).addRange(0xAE0, 0xAE1).addRange(0xB05, 0xB0C).addRange(0xB0F, 0xB10).addRange(0xB13, 0xB28).addRange(0xB2A, 0xB30).addRange(0xB32, 0xB33).addRange(0xB35, 0xB39).addRange(0xB5C, 0xB5D).addRange(0xB5F, 0xB61).addRange(0xB85, 0xB8A).addRange(0xB8E, 0xB90).addRange(0xB92, 0xB95).addRange(0xB99, 0xB9A).addRange(0xB9E, 0xB9F).addRange(0xBA3, 0xBA4).addRange(0xBA8, 0xBAA).addRange(0xBAE, 0xBB9).addRange(0xC05, 0xC0C).addRange(0xC0E, 0xC10).addRange(0xC12, 0xC28).addRange(0xC2A, 0xC33).addRange(0xC35, 0xC39).addRange(0xC58, 0xC59).addRange(0xC60, 0xC61).addRange(0xC85, 0xC8C).addRange(0xC8E, 0xC90).addRange(0xC92, 0xCA8).addRange(0xCAA, 0xCB3).addRange(0xCB5, 0xCB9).addRange(0xCE0, 0xCE1).addRange(0xCF1, 0xCF2).addRange(0xD05, 0xD0C).addRange(0xD0E, 0xD10).addRange(0xD12, 0xD3A).addRange(0xD60, 0xD61).addRange(0xD7A, 0xD7F).addRange(0xD85, 0xD96).addRange(0xD9A, 0xDB1).addRange(0xDB3, 0xDBB).addRange(0xDC0, 0xDC6).addRange(0xE01, 0xE30).addRange(0xE32, 0xE33).addRange(0xE40, 0xE46).addRange(0xE81, 0xE82).addRange(0xE87, 0xE88).addRange(0xE94, 0xE97).addRange(0xE99, 0xE9F).addRange(0xEA1, 0xEA3).addRange(0xEAA, 0xEAB).addRange(0xEAD, 0xEB0).addRange(0xEB2, 0xEB3).addRange(0xEC0, 0xEC4).addRange(0xEDC, 0xEDF).addRange(0xF40, 0xF47).addRange(0xF49, 0xF6C).addRange(0xF88, 0xF8C).addRange(0x1000, 0x102A).addRange(0x1050, 0x1055).addRange(0x105A, 0x105D).addRange(0x1065, 0x1066).addRange(0x106E, 0x1070).addRange(0x1075, 0x1081).addRange(0x10A0, 0x10C5).addRange(0x10D0, 0x10FA).addRange(0x10FC, 0x1248).addRange(0x124A, 0x124D).addRange(0x1250, 0x1256).addRange(0x125A, 0x125D).addRange(0x1260, 0x1288).addRange(0x128A, 0x128D).addRange(0x1290, 0x12B0).addRange(0x12B2, 0x12B5).addRange(0x12B8, 0x12BE).addRange(0x12C2, 0x12C5).addRange(0x12C8, 0x12D6).addRange(0x12D8, 0x1310).addRange(0x1312, 0x1315).addRange(0x1318, 0x135A).addRange(0x1380, 0x138F).addRange(0x13A0, 0x13F4).addRange(0x1401, 0x166C).addRange(0x166F, 0x167F).addRange(0x1681, 0x169A).addRange(0x16A0, 0x16EA).addRange(0x16EE, 0x16F0).addRange(0x1700, 0x170C).addRange(0x170E, 0x1711).addRange(0x1720, 0x1731).addRange(0x1740, 0x1751).addRange(0x1760, 0x176C).addRange(0x176E, 0x1770).addRange(0x1780, 0x17B3).addRange(0x1820, 0x1877).addRange(0x1880, 0x18A8).addRange(0x18B0, 0x18F5).addRange(0x1900, 0x191C).addRange(0x1950, 0x196D).addRange(0x1970, 0x1974).addRange(0x1980, 0x19AB).addRange(0x19C1, 0x19C7).addRange(0x1A00, 0x1A16).addRange(0x1A20, 0x1A54).addRange(0x1B05, 0x1B33).addRange(0x1B45, 0x1B4B).addRange(0x1B83, 0x1BA0).addRange(0x1BAE, 0x1BAF).addRange(0x1BBA, 0x1BE5).addRange(0x1C00, 0x1C23).addRange(0x1C4D, 0x1C4F).addRange(0x1C5A, 0x1C7D).addRange(0x1CE9, 0x1CEC).addRange(0x1CEE, 0x1CF1).addRange(0x1CF5, 0x1CF6).addRange(0x1D00, 0x1DBF).addRange(0x1E00, 0x1F15).addRange(0x1F18, 0x1F1D).addRange(0x1F20, 0x1F45).addRange(0x1F48, 0x1F4D).addRange(0x1F50, 0x1F57).addRange(0x1F5F, 0x1F7D).addRange(0x1F80, 0x1FB4).addRange(0x1FB6, 0x1FBC).addRange(0x1FC2, 0x1FC4).addRange(0x1FC6, 0x1FCC).addRange(0x1FD0, 0x1FD3).addRange(0x1FD6, 0x1FDB).addRange(0x1FE0, 0x1FEC).addRange(0x1FF2, 0x1FF4).addRange(0x1FF6, 0x1FFC).addRange(0x2090, 0x209C).addRange(0x210A, 0x2113).addRange(0x2119, 0x211D).addRange(0x212A, 0x212D).addRange(0x212F, 0x2139).addRange(0x213C, 0x213F).addRange(0x2145, 0x2149).addRange(0x2160, 0x2188).addRange(0x2C00, 0x2C2E).addRange(0x2C30, 0x2C5E).addRange(0x2C60, 0x2CE4).addRange(0x2CEB, 0x2CEE).addRange(0x2CF2, 0x2CF3).addRange(0x2D00, 0x2D25).addRange(0x2D30, 0x2D67).addRange(0x2D80, 0x2D96).addRange(0x2DA0, 0x2DA6).addRange(0x2DA8, 0x2DAE).addRange(0x2DB0, 0x2DB6).addRange(0x2DB8, 0x2DBE).addRange(0x2DC0, 0x2DC6).addRange(0x2DC8, 0x2DCE).addRange(0x2DD0, 0x2DD6).addRange(0x2DD8, 0x2DDE).addRange(0x3005, 0x3007).addRange(0x3021, 0x3029).addRange(0x3031, 0x3035).addRange(0x3038, 0x303C).addRange(0x3041, 0x3096).addRange(0x309D, 0x309F).addRange(0x30A1, 0x30FA).addRange(0x30FC, 0x30FF).addRange(0x3105, 0x312D).addRange(0x3131, 0x318E).addRange(0x31A0, 0x31BA).addRange(0x31F0, 0x31FF).addRange(0x3400, 0x4DB5).addRange(0x4E00, 0x9FCC).addRange(0xA000, 0xA48C).addRange(0xA4D0, 0xA4FD).addRange(0xA500, 0xA60C).addRange(0xA610, 0xA61F).addRange(0xA62A, 0xA62B).addRange(0xA640, 0xA66E).addRange(0xA67F, 0xA697).addRange(0xA6A0, 0xA6EF).addRange(0xA717, 0xA71F).addRange(0xA722, 0xA788).addRange(0xA78B, 0xA78E).addRange(0xA790, 0xA793).addRange(0xA7A0, 0xA7AA).addRange(0xA7F8, 0xA801).addRange(0xA803, 0xA805).addRange(0xA807, 0xA80A).addRange(0xA80C, 0xA822).addRange(0xA840, 0xA873).addRange(0xA882, 0xA8B3).addRange(0xA8F2, 0xA8F7).addRange(0xA90A, 0xA925).addRange(0xA930, 0xA946).addRange(0xA960, 0xA97C).addRange(0xA984, 0xA9B2).addRange(0xAA00, 0xAA28).addRange(0xAA40, 0xAA42).addRange(0xAA44, 0xAA4B).addRange(0xAA60, 0xAA76).addRange(0xAA80, 0xAAAF).addRange(0xAAB5, 0xAAB6).addRange(0xAAB9, 0xAABD).addRange(0xAADB, 0xAADD).addRange(0xAAE0, 0xAAEA).addRange(0xAAF2, 0xAAF4).addRange(0xAB01, 0xAB06).addRange(0xAB09, 0xAB0E).addRange(0xAB11, 0xAB16).addRange(0xAB20, 0xAB26).addRange(0xAB28, 0xAB2E).addRange(0xABC0, 0xABE2).addRange(0xAC00, 0xD7A3).addRange(0xD7B0, 0xD7C6).addRange(0xD7CB, 0xD7FB).addRange(0xF900, 0xFA6D).addRange(0xFA70, 0xFAD9).addRange(0xFB00, 0xFB06).addRange(0xFB13, 0xFB17).addRange(0xFB1F, 0xFB28).addRange(0xFB2A, 0xFB36).addRange(0xFB38, 0xFB3C).addRange(0xFB40, 0xFB41).addRange(0xFB43, 0xFB44).addRange(0xFB46, 0xFBB1).addRange(0xFBD3, 0xFD3D).addRange(0xFD50, 0xFD8F).addRange(0xFD92, 0xFDC7).addRange(0xFDF0, 0xFDFB).addRange(0xFE70, 0xFE74).addRange(0xFE76, 0xFEFC).addRange(0xFF21, 0xFF3A).addRange(0xFF41, 0xFF5A).addRange(0xFF66, 0xFFBE).addRange(0xFFC2, 0xFFC7).addRange(0xFFCA, 0xFFCF).addRange(0xFFD2, 0xFFD7).addRange(0xFFDA, 0xFFDC).addRange(0x10000, 0x1000B).addRange(0x1000D, 0x10026).addRange(0x10028, 0x1003A).addRange(0x1003C, 0x1003D).addRange(0x1003F, 0x1004D).addRange(0x10050, 0x1005D).addRange(0x10080, 0x100FA).addRange(0x10140, 0x10174).addRange(0x10280, 0x1029C).addRange(0x102A0, 0x102D0).addRange(0x10300, 0x1031E).addRange(0x10330, 0x1034A).addRange(0x10380, 0x1039D).addRange(0x103A0, 0x103C3).addRange(0x103C8, 0x103CF).addRange(0x103D1, 0x103D5).addRange(0x10400, 0x1049D).addRange(0x10800, 0x10805).addRange(0x1080A, 0x10835).addRange(0x10837, 0x10838).addRange(0x1083F, 0x10855).addRange(0x10900, 0x10915).addRange(0x10920, 0x10939).addRange(0x10980, 0x109B7).addRange(0x109BE, 0x109BF).addRange(0x10A10, 0x10A13).addRange(0x10A15, 0x10A17).addRange(0x10A19, 0x10A33).addRange(0x10A60, 0x10A7C).addRange(0x10B00, 0x10B35).addRange(0x10B40, 0x10B55).addRange(0x10B60, 0x10B72).addRange(0x10C00, 0x10C48).addRange(0x11003, 0x11037).addRange(0x11083, 0x110AF).addRange(0x110D0, 0x110E8).addRange(0x11103, 0x11126).addRange(0x11183, 0x111B2).addRange(0x111C1, 0x111C4).addRange(0x11680, 0x116AA).addRange(0x12000, 0x1236E).addRange(0x12400, 0x12462).addRange(0x13000, 0x1342E).addRange(0x16800, 0x16A38).addRange(0x16F00, 0x16F44).addRange(0x16F93, 0x16F9F).addRange(0x1B000, 0x1B001).addRange(0x1D400, 0x1D454).addRange(0x1D456, 0x1D49C).addRange(0x1D49E, 0x1D49F).addRange(0x1D4A5, 0x1D4A6).addRange(0x1D4A9, 0x1D4AC).addRange(0x1D4AE, 0x1D4B9).addRange(0x1D4BD, 0x1D4C3).addRange(0x1D4C5, 0x1D505).addRange(0x1D507, 0x1D50A).addRange(0x1D50D, 0x1D514).addRange(0x1D516, 0x1D51C).addRange(0x1D51E, 0x1D539).addRange(0x1D53B, 0x1D53E).addRange(0x1D540, 0x1D544).addRange(0x1D54A, 0x1D550).addRange(0x1D552, 0x1D6A5).addRange(0x1D6A8, 0x1D6C0).addRange(0x1D6C2, 0x1D6DA).addRange(0x1D6DC, 0x1D6FA).addRange(0x1D6FC, 0x1D714).addRange(0x1D716, 0x1D734).addRange(0x1D736, 0x1D74E).addRange(0x1D750, 0x1D76E).addRange(0x1D770, 0x1D788).addRange(0x1D78A, 0x1D7A8).addRange(0x1D7AA, 0x1D7C2).addRange(0x1D7C4, 0x1D7CB).addRange(0x1EE00, 0x1EE03).addRange(0x1EE05, 0x1EE1F).addRange(0x1EE21, 0x1EE22).addRange(0x1EE29, 0x1EE32).addRange(0x1EE34, 0x1EE37).addRange(0x1EE4D, 0x1EE4F).addRange(0x1EE51, 0x1EE52).addRange(0x1EE61, 0x1EE62).addRange(0x1EE67, 0x1EE6A).addRange(0x1EE6C, 0x1EE72).addRange(0x1EE74, 0x1EE77).addRange(0x1EE79, 0x1EE7C).addRange(0x1EE80, 0x1EE89).addRange(0x1EE8B, 0x1EE9B).addRange(0x1EEA1, 0x1EEA3).addRange(0x1EEA5, 0x1EEA9).addRange(0x1EEAB, 0x1EEBB).addRange(0x20000, 0x2A6D6).addRange(0x2A700, 0x2B734).addRange(0x2B740, 0x2B81D).addRange(0x2F800, 0x2FA1D).toString(),
			'[\\$A-Z_a-z\\xAA\\xB5\\xBA\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u048A-\\u0527\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0620-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0800-\\u0815\\u081A\\u0824\\u0828\\u0840-\\u0858\\u08A0\\u08A2-\\u08AC\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971-\\u0977\\u0979-\\u097F\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C33\\u0C35-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0CF1\\u0CF2\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D\\u0D4E\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC-\\u0EDF\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8C\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10C7\\u10CD\\u10D0-\\u10FA\\u10FC-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u16EE-\\u16F0\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u18B0-\\u18F5\\u1900-\\u191C\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1A20-\\u1A54\\u1AA7\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1BBA-\\u1BE5\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C7D\\u1CE9-\\u1CEC\\u1CEE-\\u1CF1\\u1CF5\\u1CF6\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u209C\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2160-\\u2188\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CEE\\u2CF2\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u3005-\\u3007\\u3021-\\u3029\\u3031-\\u3035\\u3038-\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA66E\\uA67F-\\uA697\\uA6A0-\\uA6EF\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA793\\uA7A0-\\uA7AA\\uA7F8-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA8F7\\uA8FB\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9CF\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAA60-\\uAA76\\uAA7A\\uAA80-\\uAAAF\\uAAB1\\uAAB5\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADD\\uAAE0-\\uAAEA\\uAAF2-\\uAAF4\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uABC0-\\uABE2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]|\\uD800[\\uDC00-\\uDC0B\\uDC0D-\\uDC26\\uDC28-\\uDC3A\\uDC3C\\uDC3D\\uDC3F-\\uDC4D\\uDC50-\\uDC5D\\uDC80-\\uDCFA\\uDD40-\\uDD74\\uDE80-\\uDE9C\\uDEA0-\\uDED0\\uDF00-\\uDF1E\\uDF30-\\uDF4A\\uDF80-\\uDF9D\\uDFA0-\\uDFC3\\uDFC8-\\uDFCF\\uDFD1-\\uDFD5]|\\uD801[\\uDC00-\\uDC9D]|\\uD802[\\uDC00-\\uDC05\\uDC08\\uDC0A-\\uDC35\\uDC37\\uDC38\\uDC3C\\uDC3F-\\uDC55\\uDD00-\\uDD15\\uDD20-\\uDD39\\uDD80-\\uDDB7\\uDDBE\\uDDBF\\uDE00\\uDE10-\\uDE13\\uDE15-\\uDE17\\uDE19-\\uDE33\\uDE60-\\uDE7C\\uDF00-\\uDF35\\uDF40-\\uDF55\\uDF60-\\uDF72]|\\uD803[\\uDC00-\\uDC48]|\\uD804[\\uDC03-\\uDC37\\uDC83-\\uDCAF\\uDCD0-\\uDCE8\\uDD03-\\uDD26\\uDD83-\\uDDB2\\uDDC1-\\uDDC4]|\\uD805[\\uDE80-\\uDEAA]|\\uD808[\\uDC00-\\uDF6E]|\\uD809[\\uDC00-\\uDC62]|[\\uD80C\\uD840-\\uD868\\uD86A-\\uD86C][\\uDC00-\\uDFFF]|\\uD80D[\\uDC00-\\uDC2E]|\\uD81A[\\uDC00-\\uDE38]|\\uD81B[\\uDF00-\\uDF44\\uDF50\\uDF93-\\uDF9F]|\\uD82C[\\uDC00\\uDC01]|\\uD835[\\uDC00-\\uDC54\\uDC56-\\uDC9C\\uDC9E\\uDC9F\\uDCA2\\uDCA5\\uDCA6\\uDCA9-\\uDCAC\\uDCAE-\\uDCB9\\uDCBB\\uDCBD-\\uDCC3\\uDCC5-\\uDD05\\uDD07-\\uDD0A\\uDD0D-\\uDD14\\uDD16-\\uDD1C\\uDD1E-\\uDD39\\uDD3B-\\uDD3E\\uDD40-\\uDD44\\uDD46\\uDD4A-\\uDD50\\uDD52-\\uDEA5\\uDEA8-\\uDEC0\\uDEC2-\\uDEDA\\uDEDC-\\uDEFA\\uDEFC-\\uDF14\\uDF16-\\uDF34\\uDF36-\\uDF4E\\uDF50-\\uDF6E\\uDF70-\\uDF88\\uDF8A-\\uDFA8\\uDFAA-\\uDFC2\\uDFC4-\\uDFCB]|\\uD83B[\\uDE00-\\uDE03\\uDE05-\\uDE1F\\uDE21\\uDE22\\uDE24\\uDE27\\uDE29-\\uDE32\\uDE34-\\uDE37\\uDE39\\uDE3B\\uDE42\\uDE47\\uDE49\\uDE4B\\uDE4D-\\uDE4F\\uDE51\\uDE52\\uDE54\\uDE57\\uDE59\\uDE5B\\uDE5D\\uDE5F\\uDE61\\uDE62\\uDE64\\uDE67-\\uDE6A\\uDE6C-\\uDE72\\uDE74-\\uDE77\\uDE79-\\uDE7C\\uDE7E\\uDE80-\\uDE89\\uDE8B-\\uDE9B\\uDEA1-\\uDEA3\\uDEA5-\\uDEA9\\uDEAB-\\uDEBB]|\\uD869[\\uDC00-\\uDED6\\uDF00-\\uDFFF]|\\uD86D[\\uDC00-\\uDF34\\uDF40-\\uDFFF]|\\uD86E[\\uDC00-\\uDC1D]|\\uD87E[\\uDC00-\\uDE1D]',
			'ES 6 / Unicode 6.3.0 `IdentifierStart`'
		);
		equal(
			regenerate(0x24, 0x5F, 0xAA, 0xB5, 0xBA, 0x2EC, 0x2EE, 0x386, 0x38C, 0x559, 0x5BF, 0x5C7, 0x6FF, 0x7FA, 0x8A0, 0x9B2, 0x9D7, 0xA3C, 0xA51, 0xA5E, 0xAD0, 0xB71, 0xB9C, 0xBD0, 0xBD7, 0xCDE, 0xD57, 0xDBD, 0xDCA, 0xDD6, 0xE84, 0xE8A, 0xE8D, 0xEA5, 0xEA7, 0xEC6, 0xF00, 0xF35, 0xF37, 0xF39, 0xFC6, 0x10C7, 0x10CD, 0x1258, 0x12C0, 0x17D7, 0x1AA7, 0x1F59, 0x1F5B, 0x1F5D, 0x1FBE, 0x2054, 0x2071, 0x207F, 0x20E1, 0x2102, 0x2107, 0x2115, 0x2124, 0x2126, 0x2128, 0x214E, 0x2D27, 0x2D2D, 0x2D6F, 0xA8FB, 0xFB3E, 0xFF3F, 0x101FD, 0x10808, 0x1083C, 0x10A3F, 0x1D4A2, 0x1D4BB, 0x1D546, 0x1EE24, 0x1EE27, 0x1EE39, 0x1EE3B, 0x1EE42, 0x1EE47, 0x1EE49, 0x1EE4B, 0x1EE54, 0x1EE57, 0x1EE59, 0x1EE5B, 0x1EE5D, 0x1EE5F, 0x1EE64, 0x1EE7E).addRange(0x30, 0x39).addRange(0x41, 0x5A).addRange(0x61, 0x7A).addRange(0xC0, 0xD6).addRange(0xD8, 0xF6).addRange(0xF8, 0x2C1).addRange(0x2C6, 0x2D1).addRange(0x2E0, 0x2E4).addRange(0x300, 0x374).addRange(0x376, 0x377).addRange(0x37A, 0x37D).addRange(0x388, 0x38A).addRange(0x38E, 0x3A1).addRange(0x3A3, 0x3F5).addRange(0x3F7, 0x481).addRange(0x483, 0x487).addRange(0x48A, 0x527).addRange(0x531, 0x556).addRange(0x561, 0x587).addRange(0x591, 0x5BD).addRange(0x5C1, 0x5C2).addRange(0x5C4, 0x5C5).addRange(0x5D0, 0x5EA).addRange(0x5F0, 0x5F2).addRange(0x610, 0x61A).addRange(0x620, 0x669).addRange(0x66E, 0x6D3).addRange(0x6D5, 0x6DC).addRange(0x6DF, 0x6E8).addRange(0x6EA, 0x6FC).addRange(0x710, 0x74A).addRange(0x74D, 0x7B1).addRange(0x7C0, 0x7F5).addRange(0x800, 0x82D).addRange(0x840, 0x85B).addRange(0x8A2, 0x8AC).addRange(0x8E4, 0x8FE).addRange(0x900, 0x963).addRange(0x966, 0x96F).addRange(0x971, 0x977).addRange(0x979, 0x97F).addRange(0x981, 0x983).addRange(0x985, 0x98C).addRange(0x98F, 0x990).addRange(0x993, 0x9A8).addRange(0x9AA, 0x9B0).addRange(0x9B6, 0x9B9).addRange(0x9BC, 0x9C4).addRange(0x9C7, 0x9C8).addRange(0x9CB, 0x9CE).addRange(0x9DC, 0x9DD).addRange(0x9DF, 0x9E3).addRange(0x9E6, 0x9F1).addRange(0xA01, 0xA03).addRange(0xA05, 0xA0A).addRange(0xA0F, 0xA10).addRange(0xA13, 0xA28).addRange(0xA2A, 0xA30).addRange(0xA32, 0xA33).addRange(0xA35, 0xA36).addRange(0xA38, 0xA39).addRange(0xA3E, 0xA42).addRange(0xA47, 0xA48).addRange(0xA4B, 0xA4D).addRange(0xA59, 0xA5C).addRange(0xA66, 0xA75).addRange(0xA81, 0xA83).addRange(0xA85, 0xA8D).addRange(0xA8F, 0xA91).addRange(0xA93, 0xAA8).addRange(0xAAA, 0xAB0).addRange(0xAB2, 0xAB3).addRange(0xAB5, 0xAB9).addRange(0xABC, 0xAC5).addRange(0xAC7, 0xAC9).addRange(0xACB, 0xACD).addRange(0xAE0, 0xAE3).addRange(0xAE6, 0xAEF).addRange(0xB01, 0xB03).addRange(0xB05, 0xB0C).addRange(0xB0F, 0xB10).addRange(0xB13, 0xB28).addRange(0xB2A, 0xB30).addRange(0xB32, 0xB33).addRange(0xB35, 0xB39).addRange(0xB3C, 0xB44).addRange(0xB47, 0xB48).addRange(0xB4B, 0xB4D).addRange(0xB56, 0xB57).addRange(0xB5C, 0xB5D).addRange(0xB5F, 0xB63).addRange(0xB66, 0xB6F).addRange(0xB82, 0xB83).addRange(0xB85, 0xB8A).addRange(0xB8E, 0xB90).addRange(0xB92, 0xB95).addRange(0xB99, 0xB9A).addRange(0xB9E, 0xB9F).addRange(0xBA3, 0xBA4).addRange(0xBA8, 0xBAA).addRange(0xBAE, 0xBB9).addRange(0xBBE, 0xBC2).addRange(0xBC6, 0xBC8).addRange(0xBCA, 0xBCD).addRange(0xBE6, 0xBEF).addRange(0xC01, 0xC03).addRange(0xC05, 0xC0C).addRange(0xC0E, 0xC10).addRange(0xC12, 0xC28).addRange(0xC2A, 0xC33).addRange(0xC35, 0xC39).addRange(0xC3D, 0xC44).addRange(0xC46, 0xC48).addRange(0xC4A, 0xC4D).addRange(0xC55, 0xC56).addRange(0xC58, 0xC59).addRange(0xC60, 0xC63).addRange(0xC66, 0xC6F).addRange(0xC82, 0xC83).addRange(0xC85, 0xC8C).addRange(0xC8E, 0xC90).addRange(0xC92, 0xCA8).addRange(0xCAA, 0xCB3).addRange(0xCB5, 0xCB9).addRange(0xCBC, 0xCC4).addRange(0xCC6, 0xCC8).addRange(0xCCA, 0xCCD).addRange(0xCD5, 0xCD6).addRange(0xCE0, 0xCE3).addRange(0xCE6, 0xCEF).addRange(0xCF1, 0xCF2).addRange(0xD02, 0xD03).addRange(0xD05, 0xD0C).addRange(0xD0E, 0xD10).addRange(0xD12, 0xD3A).addRange(0xD3D, 0xD44).addRange(0xD46, 0xD48).addRange(0xD4A, 0xD4E).addRange(0xD60, 0xD63).addRange(0xD66, 0xD6F).addRange(0xD7A, 0xD7F).addRange(0xD82, 0xD83).addRange(0xD85, 0xD96).addRange(0xD9A, 0xDB1).addRange(0xDB3, 0xDBB).addRange(0xDC0, 0xDC6).addRange(0xDCF, 0xDD4).addRange(0xDD8, 0xDDF).addRange(0xDF2, 0xDF3).addRange(0xE01, 0xE3A).addRange(0xE40, 0xE4E).addRange(0xE50, 0xE59).addRange(0xE81, 0xE82).addRange(0xE87, 0xE88).addRange(0xE94, 0xE97).addRange(0xE99, 0xE9F).addRange(0xEA1, 0xEA3).addRange(0xEAA, 0xEAB).addRange(0xEAD, 0xEB9).addRange(0xEBB, 0xEBD).addRange(0xEC0, 0xEC4).addRange(0xEC8, 0xECD).addRange(0xED0, 0xED9).addRange(0xEDC, 0xEDF).addRange(0xF18, 0xF19).addRange(0xF20, 0xF29).addRange(0xF3E, 0xF47).addRange(0xF49, 0xF6C).addRange(0xF71, 0xF84).addRange(0xF86, 0xF97).addRange(0xF99, 0xFBC).addRange(0x1000, 0x1049).addRange(0x1050, 0x109D).addRange(0x10A0, 0x10C5).addRange(0x10D0, 0x10FA).addRange(0x10FC, 0x1248).addRange(0x124A, 0x124D).addRange(0x1250, 0x1256).addRange(0x125A, 0x125D).addRange(0x1260, 0x1288).addRange(0x128A, 0x128D).addRange(0x1290, 0x12B0).addRange(0x12B2, 0x12B5).addRange(0x12B8, 0x12BE).addRange(0x12C2, 0x12C5).addRange(0x12C8, 0x12D6).addRange(0x12D8, 0x1310).addRange(0x1312, 0x1315).addRange(0x1318, 0x135A).addRange(0x135D, 0x135F).addRange(0x1380, 0x138F).addRange(0x13A0, 0x13F4).addRange(0x1401, 0x166C).addRange(0x166F, 0x167F).addRange(0x1681, 0x169A).addRange(0x16A0, 0x16EA).addRange(0x16EE, 0x16F0).addRange(0x1700, 0x170C).addRange(0x170E, 0x1714).addRange(0x1720, 0x1734).addRange(0x1740, 0x1753).addRange(0x1760, 0x176C).addRange(0x176E, 0x1770).addRange(0x1772, 0x1773).addRange(0x1780, 0x17D3).addRange(0x17DC, 0x17DD).addRange(0x17E0, 0x17E9).addRange(0x180B, 0x180D).addRange(0x1810, 0x1819).addRange(0x1820, 0x1877).addRange(0x1880, 0x18AA).addRange(0x18B0, 0x18F5).addRange(0x1900, 0x191C).addRange(0x1920, 0x192B).addRange(0x1930, 0x193B).addRange(0x1946, 0x196D).addRange(0x1970, 0x1974).addRange(0x1980, 0x19AB).addRange(0x19B0, 0x19C9).addRange(0x19D0, 0x19D9).addRange(0x1A00, 0x1A1B).addRange(0x1A20, 0x1A5E).addRange(0x1A60, 0x1A7C).addRange(0x1A7F, 0x1A89).addRange(0x1A90, 0x1A99).addRange(0x1B00, 0x1B4B).addRange(0x1B50, 0x1B59).addRange(0x1B6B, 0x1B73).addRange(0x1B80, 0x1BF3).addRange(0x1C00, 0x1C37).addRange(0x1C40, 0x1C49).addRange(0x1C4D, 0x1C7D).addRange(0x1CD0, 0x1CD2).addRange(0x1CD4, 0x1CF6).addRange(0x1D00, 0x1DE6).addRange(0x1DFC, 0x1F15).addRange(0x1F18, 0x1F1D).addRange(0x1F20, 0x1F45).addRange(0x1F48, 0x1F4D).addRange(0x1F50, 0x1F57).addRange(0x1F5F, 0x1F7D).addRange(0x1F80, 0x1FB4).addRange(0x1FB6, 0x1FBC).addRange(0x1FC2, 0x1FC4).addRange(0x1FC6, 0x1FCC).addRange(0x1FD0, 0x1FD3).addRange(0x1FD6, 0x1FDB).addRange(0x1FE0, 0x1FEC).addRange(0x1FF2, 0x1FF4).addRange(0x1FF6, 0x1FFC).addRange(0x200C, 0x200D).addRange(0x203F, 0x2040).addRange(0x2090, 0x209C).addRange(0x20D0, 0x20DC).addRange(0x20E5, 0x20F0).addRange(0x210A, 0x2113).addRange(0x2119, 0x211D).addRange(0x212A, 0x212D).addRange(0x212F, 0x2139).addRange(0x213C, 0x213F).addRange(0x2145, 0x2149).addRange(0x2160, 0x2188).addRange(0x2C00, 0x2C2E).addRange(0x2C30, 0x2C5E).addRange(0x2C60, 0x2CE4).addRange(0x2CEB, 0x2CF3).addRange(0x2D00, 0x2D25).addRange(0x2D30, 0x2D67).addRange(0x2D7F, 0x2D96).addRange(0x2DA0, 0x2DA6).addRange(0x2DA8, 0x2DAE).addRange(0x2DB0, 0x2DB6).addRange(0x2DB8, 0x2DBE).addRange(0x2DC0, 0x2DC6).addRange(0x2DC8, 0x2DCE).addRange(0x2DD0, 0x2DD6).addRange(0x2DD8, 0x2DDE).addRange(0x2DE0, 0x2DFF).addRange(0x3005, 0x3007).addRange(0x3021, 0x302F).addRange(0x3031, 0x3035).addRange(0x3038, 0x303C).addRange(0x3041, 0x3096).addRange(0x3099, 0x309A).addRange(0x309D, 0x309F).addRange(0x30A1, 0x30FA).addRange(0x30FC, 0x30FF).addRange(0x3105, 0x312D).addRange(0x3131, 0x318E).addRange(0x31A0, 0x31BA).addRange(0x31F0, 0x31FF).addRange(0x3400, 0x4DB5).addRange(0x4E00, 0x9FCC).addRange(0xA000, 0xA48C).addRange(0xA4D0, 0xA4FD).addRange(0xA500, 0xA60C).addRange(0xA610, 0xA62B).addRange(0xA640, 0xA66F).addRange(0xA674, 0xA67D).addRange(0xA67F, 0xA697).addRange(0xA69F, 0xA6F1).addRange(0xA717, 0xA71F).addRange(0xA722, 0xA788).addRange(0xA78B, 0xA78E).addRange(0xA790, 0xA793).addRange(0xA7A0, 0xA7AA).addRange(0xA7F8, 0xA827).addRange(0xA840, 0xA873).addRange(0xA880, 0xA8C4).addRange(0xA8D0, 0xA8D9).addRange(0xA8E0, 0xA8F7).addRange(0xA900, 0xA92D).addRange(0xA930, 0xA953).addRange(0xA960, 0xA97C).addRange(0xA980, 0xA9C0).addRange(0xA9CF, 0xA9D9).addRange(0xAA00, 0xAA36).addRange(0xAA40, 0xAA4D).addRange(0xAA50, 0xAA59).addRange(0xAA60, 0xAA76).addRange(0xAA7A, 0xAA7B).addRange(0xAA80, 0xAAC2).addRange(0xAADB, 0xAADD).addRange(0xAAE0, 0xAAEF).addRange(0xAAF2, 0xAAF6).addRange(0xAB01, 0xAB06).addRange(0xAB09, 0xAB0E).addRange(0xAB11, 0xAB16).addRange(0xAB20, 0xAB26).addRange(0xAB28, 0xAB2E).addRange(0xABC0, 0xABEA).addRange(0xABEC, 0xABED).addRange(0xABF0, 0xABF9).addRange(0xAC00, 0xD7A3).addRange(0xD7B0, 0xD7C6).addRange(0xD7CB, 0xD7FB).addRange(0xF900, 0xFA6D).addRange(0xFA70, 0xFAD9).addRange(0xFB00, 0xFB06).addRange(0xFB13, 0xFB17).addRange(0xFB1D, 0xFB28).addRange(0xFB2A, 0xFB36).addRange(0xFB38, 0xFB3C).addRange(0xFB40, 0xFB41).addRange(0xFB43, 0xFB44).addRange(0xFB46, 0xFBB1).addRange(0xFBD3, 0xFD3D).addRange(0xFD50, 0xFD8F).addRange(0xFD92, 0xFDC7).addRange(0xFDF0, 0xFDFB).addRange(0xFE00, 0xFE0F).addRange(0xFE20, 0xFE26).addRange(0xFE33, 0xFE34).addRange(0xFE4D, 0xFE4F).addRange(0xFE70, 0xFE74).addRange(0xFE76, 0xFEFC).addRange(0xFF10, 0xFF19).addRange(0xFF21, 0xFF3A).addRange(0xFF41, 0xFF5A).addRange(0xFF66, 0xFFBE).addRange(0xFFC2, 0xFFC7).addRange(0xFFCA, 0xFFCF).addRange(0xFFD2, 0xFFD7).addRange(0xFFDA, 0xFFDC).addRange(0x10000, 0x1000B).addRange(0x1000D, 0x10026).addRange(0x10028, 0x1003A).addRange(0x1003C, 0x1003D).addRange(0x1003F, 0x1004D).addRange(0x10050, 0x1005D).addRange(0x10080, 0x100FA).addRange(0x10140, 0x10174).addRange(0x10280, 0x1029C).addRange(0x102A0, 0x102D0).addRange(0x10300, 0x1031E).addRange(0x10330, 0x1034A).addRange(0x10380, 0x1039D).addRange(0x103A0, 0x103C3).addRange(0x103C8, 0x103CF).addRange(0x103D1, 0x103D5).addRange(0x10400, 0x1049D).addRange(0x104A0, 0x104A9).addRange(0x10800, 0x10805).addRange(0x1080A, 0x10835).addRange(0x10837, 0x10838).addRange(0x1083F, 0x10855).addRange(0x10900, 0x10915).addRange(0x10920, 0x10939).addRange(0x10980, 0x109B7).addRange(0x109BE, 0x109BF).addRange(0x10A00, 0x10A03).addRange(0x10A05, 0x10A06).addRange(0x10A0C, 0x10A13).addRange(0x10A15, 0x10A17).addRange(0x10A19, 0x10A33).addRange(0x10A38, 0x10A3A).addRange(0x10A60, 0x10A7C).addRange(0x10B00, 0x10B35).addRange(0x10B40, 0x10B55).addRange(0x10B60, 0x10B72).addRange(0x10C00, 0x10C48).addRange(0x11000, 0x11046).addRange(0x11066, 0x1106F).addRange(0x11080, 0x110BA).addRange(0x110D0, 0x110E8).addRange(0x110F0, 0x110F9).addRange(0x11100, 0x11134).addRange(0x11136, 0x1113F).addRange(0x11180, 0x111C4).addRange(0x111D0, 0x111D9).addRange(0x11680, 0x116B7).addRange(0x116C0, 0x116C9).addRange(0x12000, 0x1236E).addRange(0x12400, 0x12462).addRange(0x13000, 0x1342E).addRange(0x16800, 0x16A38).addRange(0x16F00, 0x16F44).addRange(0x16F50, 0x16F7E).addRange(0x16F8F, 0x16F9F).addRange(0x1B000, 0x1B001).addRange(0x1D165, 0x1D169).addRange(0x1D16D, 0x1D172).addRange(0x1D17B, 0x1D182).addRange(0x1D185, 0x1D18B).addRange(0x1D1AA, 0x1D1AD).addRange(0x1D242, 0x1D244).addRange(0x1D400, 0x1D454).addRange(0x1D456, 0x1D49C).addRange(0x1D49E, 0x1D49F).addRange(0x1D4A5, 0x1D4A6).addRange(0x1D4A9, 0x1D4AC).addRange(0x1D4AE, 0x1D4B9).addRange(0x1D4BD, 0x1D4C3).addRange(0x1D4C5, 0x1D505).addRange(0x1D507, 0x1D50A).addRange(0x1D50D, 0x1D514).addRange(0x1D516, 0x1D51C).addRange(0x1D51E, 0x1D539).addRange(0x1D53B, 0x1D53E).addRange(0x1D540, 0x1D544).addRange(0x1D54A, 0x1D550).addRange(0x1D552, 0x1D6A5).addRange(0x1D6A8, 0x1D6C0).addRange(0x1D6C2, 0x1D6DA).addRange(0x1D6DC, 0x1D6FA).addRange(0x1D6FC, 0x1D714).addRange(0x1D716, 0x1D734).addRange(0x1D736, 0x1D74E).addRange(0x1D750, 0x1D76E).addRange(0x1D770, 0x1D788).addRange(0x1D78A, 0x1D7A8).addRange(0x1D7AA, 0x1D7C2).addRange(0x1D7C4, 0x1D7CB).addRange(0x1D7CE, 0x1D7FF).addRange(0x1EE00, 0x1EE03).addRange(0x1EE05, 0x1EE1F).addRange(0x1EE21, 0x1EE22).addRange(0x1EE29, 0x1EE32).addRange(0x1EE34, 0x1EE37).addRange(0x1EE4D, 0x1EE4F).addRange(0x1EE51, 0x1EE52).addRange(0x1EE61, 0x1EE62).addRange(0x1EE67, 0x1EE6A).addRange(0x1EE6C, 0x1EE72).addRange(0x1EE74, 0x1EE77).addRange(0x1EE79, 0x1EE7C).addRange(0x1EE80, 0x1EE89).addRange(0x1EE8B, 0x1EE9B).addRange(0x1EEA1, 0x1EEA3).addRange(0x1EEA5, 0x1EEA9).addRange(0x1EEAB, 0x1EEBB).addRange(0x20000, 0x2A6D6).addRange(0x2A700, 0x2B734).addRange(0x2B740, 0x2B81D).addRange(0x2F800, 0x2FA1D).addRange(0xE0100, 0xE01EF).toString(),
			'[\\$0-9A-Z_a-z\\xAA\\xB5\\xBA\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0300-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u0483-\\u0487\\u048A-\\u0527\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0610-\\u061A\\u0620-\\u0669\\u066E-\\u06D3\\u06D5-\\u06DC\\u06DF-\\u06E8\\u06EA-\\u06FC\\u06FF\\u0710-\\u074A\\u074D-\\u07B1\\u07C0-\\u07F5\\u07FA\\u0800-\\u082D\\u0840-\\u085B\\u08A0\\u08A2-\\u08AC\\u08E4-\\u08FE\\u0900-\\u0963\\u0966-\\u096F\\u0971-\\u0977\\u0979-\\u097F\\u0981-\\u0983\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BC-\\u09C4\\u09C7\\u09C8\\u09CB-\\u09CE\\u09D7\\u09DC\\u09DD\\u09DF-\\u09E3\\u09E6-\\u09F1\\u0A01-\\u0A03\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A3C\\u0A3E-\\u0A42\\u0A47\\u0A48\\u0A4B-\\u0A4D\\u0A51\\u0A59-\\u0A5C\\u0A5E\\u0A66-\\u0A75\\u0A81-\\u0A83\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABC-\\u0AC5\\u0AC7-\\u0AC9\\u0ACB-\\u0ACD\\u0AD0\\u0AE0-\\u0AE3\\u0AE6-\\u0AEF\\u0B01-\\u0B03\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3C-\\u0B44\\u0B47\\u0B48\\u0B4B-\\u0B4D\\u0B56\\u0B57\\u0B5C\\u0B5D\\u0B5F-\\u0B63\\u0B66-\\u0B6F\\u0B71\\u0B82\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BBE-\\u0BC2\\u0BC6-\\u0BC8\\u0BCA-\\u0BCD\\u0BD0\\u0BD7\\u0BE6-\\u0BEF\\u0C01-\\u0C03\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C33\\u0C35-\\u0C39\\u0C3D-\\u0C44\\u0C46-\\u0C48\\u0C4A-\\u0C4D\\u0C55\\u0C56\\u0C58\\u0C59\\u0C60-\\u0C63\\u0C66-\\u0C6F\\u0C82\\u0C83\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBC-\\u0CC4\\u0CC6-\\u0CC8\\u0CCA-\\u0CCD\\u0CD5\\u0CD6\\u0CDE\\u0CE0-\\u0CE3\\u0CE6-\\u0CEF\\u0CF1\\u0CF2\\u0D02\\u0D03\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D-\\u0D44\\u0D46-\\u0D48\\u0D4A-\\u0D4E\\u0D57\\u0D60-\\u0D63\\u0D66-\\u0D6F\\u0D7A-\\u0D7F\\u0D82\\u0D83\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0DCA\\u0DCF-\\u0DD4\\u0DD6\\u0DD8-\\u0DDF\\u0DF2\\u0DF3\\u0E01-\\u0E3A\\u0E40-\\u0E4E\\u0E50-\\u0E59\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB9\\u0EBB-\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EC8-\\u0ECD\\u0ED0-\\u0ED9\\u0EDC-\\u0EDF\\u0F00\\u0F18\\u0F19\\u0F20-\\u0F29\\u0F35\\u0F37\\u0F39\\u0F3E-\\u0F47\\u0F49-\\u0F6C\\u0F71-\\u0F84\\u0F86-\\u0F97\\u0F99-\\u0FBC\\u0FC6\\u1000-\\u1049\\u1050-\\u109D\\u10A0-\\u10C5\\u10C7\\u10CD\\u10D0-\\u10FA\\u10FC-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u135D-\\u135F\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u16EE-\\u16F0\\u1700-\\u170C\\u170E-\\u1714\\u1720-\\u1734\\u1740-\\u1753\\u1760-\\u176C\\u176E-\\u1770\\u1772\\u1773\\u1780-\\u17D3\\u17D7\\u17DC\\u17DD\\u17E0-\\u17E9\\u180B-\\u180D\\u1810-\\u1819\\u1820-\\u1877\\u1880-\\u18AA\\u18B0-\\u18F5\\u1900-\\u191C\\u1920-\\u192B\\u1930-\\u193B\\u1946-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19B0-\\u19C9\\u19D0-\\u19D9\\u1A00-\\u1A1B\\u1A20-\\u1A5E\\u1A60-\\u1A7C\\u1A7F-\\u1A89\\u1A90-\\u1A99\\u1AA7\\u1B00-\\u1B4B\\u1B50-\\u1B59\\u1B6B-\\u1B73\\u1B80-\\u1BF3\\u1C00-\\u1C37\\u1C40-\\u1C49\\u1C4D-\\u1C7D\\u1CD0-\\u1CD2\\u1CD4-\\u1CF6\\u1D00-\\u1DE6\\u1DFC-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u200C\\u200D\\u203F\\u2040\\u2054\\u2071\\u207F\\u2090-\\u209C\\u20D0-\\u20DC\\u20E1\\u20E5-\\u20F0\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2160-\\u2188\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D7F-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2DE0-\\u2DFF\\u3005-\\u3007\\u3021-\\u302F\\u3031-\\u3035\\u3038-\\u303C\\u3041-\\u3096\\u3099\\u309A\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA62B\\uA640-\\uA66F\\uA674-\\uA67D\\uA67F-\\uA697\\uA69F-\\uA6F1\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA793\\uA7A0-\\uA7AA\\uA7F8-\\uA827\\uA840-\\uA873\\uA880-\\uA8C4\\uA8D0-\\uA8D9\\uA8E0-\\uA8F7\\uA8FB\\uA900-\\uA92D\\uA930-\\uA953\\uA960-\\uA97C\\uA980-\\uA9C0\\uA9CF-\\uA9D9\\uAA00-\\uAA36\\uAA40-\\uAA4D\\uAA50-\\uAA59\\uAA60-\\uAA76\\uAA7A\\uAA7B\\uAA80-\\uAAC2\\uAADB-\\uAADD\\uAAE0-\\uAAEF\\uAAF2-\\uAAF6\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uABC0-\\uABEA\\uABEC\\uABED\\uABF0-\\uABF9\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE00-\\uFE0F\\uFE20-\\uFE26\\uFE33\\uFE34\\uFE4D-\\uFE4F\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF10-\\uFF19\\uFF21-\\uFF3A\\uFF3F\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]|\\uD800[\\uDC00-\\uDC0B\\uDC0D-\\uDC26\\uDC28-\\uDC3A\\uDC3C\\uDC3D\\uDC3F-\\uDC4D\\uDC50-\\uDC5D\\uDC80-\\uDCFA\\uDD40-\\uDD74\\uDDFD\\uDE80-\\uDE9C\\uDEA0-\\uDED0\\uDF00-\\uDF1E\\uDF30-\\uDF4A\\uDF80-\\uDF9D\\uDFA0-\\uDFC3\\uDFC8-\\uDFCF\\uDFD1-\\uDFD5]|\\uD801[\\uDC00-\\uDC9D\\uDCA0-\\uDCA9]|\\uD802[\\uDC00-\\uDC05\\uDC08\\uDC0A-\\uDC35\\uDC37\\uDC38\\uDC3C\\uDC3F-\\uDC55\\uDD00-\\uDD15\\uDD20-\\uDD39\\uDD80-\\uDDB7\\uDDBE\\uDDBF\\uDE00-\\uDE03\\uDE05\\uDE06\\uDE0C-\\uDE13\\uDE15-\\uDE17\\uDE19-\\uDE33\\uDE38-\\uDE3A\\uDE3F\\uDE60-\\uDE7C\\uDF00-\\uDF35\\uDF40-\\uDF55\\uDF60-\\uDF72]|\\uD803[\\uDC00-\\uDC48]|\\uD804[\\uDC00-\\uDC46\\uDC66-\\uDC6F\\uDC80-\\uDCBA\\uDCD0-\\uDCE8\\uDCF0-\\uDCF9\\uDD00-\\uDD34\\uDD36-\\uDD3F\\uDD80-\\uDDC4\\uDDD0-\\uDDD9]|\\uD805[\\uDE80-\\uDEB7\\uDEC0-\\uDEC9]|\\uD808[\\uDC00-\\uDF6E]|\\uD809[\\uDC00-\\uDC62]|[\\uD80C\\uD840-\\uD868\\uD86A-\\uD86C][\\uDC00-\\uDFFF]|\\uD80D[\\uDC00-\\uDC2E]|\\uD81A[\\uDC00-\\uDE38]|\\uD81B[\\uDF00-\\uDF44\\uDF50-\\uDF7E\\uDF8F-\\uDF9F]|\\uD82C[\\uDC00\\uDC01]|\\uD834[\\uDD65-\\uDD69\\uDD6D-\\uDD72\\uDD7B-\\uDD82\\uDD85-\\uDD8B\\uDDAA-\\uDDAD\\uDE42-\\uDE44]|\\uD835[\\uDC00-\\uDC54\\uDC56-\\uDC9C\\uDC9E\\uDC9F\\uDCA2\\uDCA5\\uDCA6\\uDCA9-\\uDCAC\\uDCAE-\\uDCB9\\uDCBB\\uDCBD-\\uDCC3\\uDCC5-\\uDD05\\uDD07-\\uDD0A\\uDD0D-\\uDD14\\uDD16-\\uDD1C\\uDD1E-\\uDD39\\uDD3B-\\uDD3E\\uDD40-\\uDD44\\uDD46\\uDD4A-\\uDD50\\uDD52-\\uDEA5\\uDEA8-\\uDEC0\\uDEC2-\\uDEDA\\uDEDC-\\uDEFA\\uDEFC-\\uDF14\\uDF16-\\uDF34\\uDF36-\\uDF4E\\uDF50-\\uDF6E\\uDF70-\\uDF88\\uDF8A-\\uDFA8\\uDFAA-\\uDFC2\\uDFC4-\\uDFCB\\uDFCE-\\uDFFF]|\\uD83B[\\uDE00-\\uDE03\\uDE05-\\uDE1F\\uDE21\\uDE22\\uDE24\\uDE27\\uDE29-\\uDE32\\uDE34-\\uDE37\\uDE39\\uDE3B\\uDE42\\uDE47\\uDE49\\uDE4B\\uDE4D-\\uDE4F\\uDE51\\uDE52\\uDE54\\uDE57\\uDE59\\uDE5B\\uDE5D\\uDE5F\\uDE61\\uDE62\\uDE64\\uDE67-\\uDE6A\\uDE6C-\\uDE72\\uDE74-\\uDE77\\uDE79-\\uDE7C\\uDE7E\\uDE80-\\uDE89\\uDE8B-\\uDE9B\\uDEA1-\\uDEA3\\uDEA5-\\uDEA9\\uDEAB-\\uDEBB]|\\uD869[\\uDC00-\\uDED6\\uDF00-\\uDFFF]|\\uD86D[\\uDC00-\\uDF34\\uDF40-\\uDFFF]|\\uD86E[\\uDC00-\\uDC1D]|\\uD87E[\\uDC00-\\uDE1D]|\\uDB40[\\uDD00-\\uDDEF]',
			'ES 6 / Unicode 6.3.0 `IdentifierPart`'
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
