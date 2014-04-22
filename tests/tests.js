(function(root) {
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

	// Avoid using `regenerate.range` here since it slows down the coverage
	// tests greatly
	var range = function(start, stop) { // inclusive, e.g. `range(1, 3)` → `[1, 2, 3]`
		for (var result = []; start <= stop; result.push(start++));
		return result;
	};

	// var bmp = range(0x0, 0xFFFF);
	// var astral = range(0x010000, 0x10FFFF);
	// var unicode = bmp.concat(astral);

	// `throws` is a reserved word in ES3; alias it to avoid errors
	var raises = QUnit.assert['throws'];

	// explicitly call `QUnit.module()` instead of `module()`
	// in case we are in a CLI environment
	QUnit.module('regenerate');

	test('set (chaining)', function() {

		var set = regenerate(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
				.add(0x1D306)
				.add([15, 16, 20])
				.remove(20)
				.difference([9, 15])
				.intersection([3, 7, 10, 16, 0x1D306, 9001])
				.remove(7, 16);
		var setB = regenerate(0x1337, 0x31337);
		var setC = regenerate(0x42);
		deepEqual(
			set.clone().add(setB).add(setC).toArray(),
			[3, 10, 0x42, 0x1337, 0x1D306, 0x31337],
			'add(set) + clone'
		);
		deepEqual(
			regenerate(3, 10, 0x42, 0x1337, 0x1D306, 0x31337).remove(setB).remove(setC).toArray(),
			[3, 10, 0x1D306],
			'remove(set)'
		);
		deepEqual(
			regenerate(3, 10, 0x42, 0x1337, 0x1D306, 0x31337).difference(setB).toArray(),
			[3, 10, 0x42, 0x1D306],
			'difference(set)'
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
			set.toArray(),
			[3, 10, 0x1D306],
			'Set: add, remove, difference, intersection'
		);
		equal(
			set.toString(),
			'[\\x03\\x0A]|\\uD834\\uDF06',
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
		deepEqual(
			regenerate(0x1D306).addRange(0x0, 0xFF).removeRange('\0', '\xFE').toArray(),
			[0xFF, 0x1D306],
			'removeRange'
		);
		deepEqual(
			regenerate().addRange(0x0000, 0x0300).removeRange(0x0100, 0x0200).toRegExp(),
			/[\0-\xFF\u0201-\u0300]/,
			'toRegExp'
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
		equal(
			set.clone().add('a', '.', '-', ']').toString(),
			'[\\x03\\x0A\\x2D\\x2E\\x5Da]|\\uD834\\uDF06',
			'toString escapes special characters'
		);
		deepEqual(
			regenerate().addRange(3, 6).add(2).toArray(),
			[2, 3, 4, 5, 6],
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
			regenerate(0x10, 0x11, 0x12, 0x13, 0x40, 0x41, 0x42, 0x43, 0x44, 0x2603, 0xFD3F, 0xFFFF).toString(),
			'[\\x10-\\x13\\x40-D\\u2603\\uFD3F\\uFFFF]',
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
			regenerate(0x20, 0x21, 0x23).toString(),
			'[\\x20\\x21\\x23]',
			'Random BMP code points'
		);
		equal(
			regenerate(0xD800, 0xD801, 0xD802, 0xD803, 0xDBFF).toString(),
			'[\\uD800-\\uD803\\uDBFF]',
			'Unmatched high surrogates'
		);
		equal(
			regenerate(0xDC00, 0xDC01, 0xDC02, 0xDC03, 0xDC04, 0xDC05, 0xDFFB, 0xDFFD, 0xDFFE, 0xDFFF).toString(),
			'[\\uDC00-\\uDC05\\uDFFB\\uDFFD-\\uDFFF]',
			'Unmatched low surrogates'
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
			'[\\0-\\uFFFF]',
			'All BMP code points'
		);
		equal(
			regenerate().addRange(0x010000, 0x10FFFF).toString(),
			'[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]',
			'All astral code points'
		);
		equal(
			regenerate().addRange(0x0, 0x10FFFF).toString(),
			'[\\0-\\uD7FF\\uDC00-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF]',
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
			'[\\x10-\\x13\\x40-D\\u2603\\uFD3F\\uFFFF]',
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
			'[\\uD800-\\uD803\\uDBFF]',
			'Unmatched high surrogates, using symbols as input'
		);
		equal(
			regenerate('\uDC00', '\uDC01', '\uDC02', '\uDC03', '\uDC04', '\uDC05', '\uDFFB', '\uDFFD', '\uDFFE', '\uDFFF').toString(),
			'[\\uDC00-\\uDC05\\uDFFB\\uDFFD-\\uDFFF]',
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
			regenerate(1, 2, 3, 4, 5, 6, 7).difference([1, 3, 7]).toArray(),
			[2, 4, 5, 6],
			'difference'
		);
		deepEqual(
			regenerate(1, 2, 3, 4).difference([0]).toArray(),
			[1, 2, 3, 4],
			'difference'
		);
		raises(
			function() {
				regenerate(1, 2, 3, 4).difference().toArray();
			},
			TypeError,
			'difference without an argument'
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
			'[\\uD800-\\uDFFF\\uFFFF]',
			'BMP-only symbols incl. lone surrogates but with higher code points too'
		);
		equal(
			regenerate().addRange(0xD800, 0xDBFF).addRange(0xDC00, 0xDFFF).add(0xFFFF, 0x1D306).toString(),
			'[\\uDC00-\\uDFFF\\uFFFF]|\\uD834\\uDF06|[\\uD800-\\uDBFF]',
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

	});

	/*--------------------------------------------------------------------------*/

	// configure QUnit and call `QUnit.start()` for
	// Narwhal, Node.js, PhantomJS, Rhino, and RingoJS
	if (!root.document || root.phantom) {
		QUnit.config.noglobals = true;
		QUnit.start();
	}
}(typeof global == 'object' && global || this));
