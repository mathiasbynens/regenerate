# Regenerate [![Build status](https://travis-ci.org/mathiasbynens/regenerate.png?branch=master)](https://travis-ci.org/mathiasbynens/regenerate) [![Dependency status](https://gemnasium.com/mathiasbynens/regenerate.png)](https://gemnasium.com/mathiasbynens/regenerate)

_Regenerate_ is a Unicode-aware regex generator for JavaScript. It allows you to easily generate JavaScript-compatible regular expressions based on a given set of Unicode symbols or code points.

Feel free to fork if you see possible improvements!

## Installation

Via [npm](http://npmjs.org/):

```bash
npm install regenerate
```

Via [Bower](http://bower.io/):

```bash
bower install regenerate
```

Via [Component](https://github.com/component/component):

```bash
component install mathiasbynens/regenerate
```

In a browser:

```html
<script src="regenerate.js"></script>
```

In [Node.js](http://nodejs.org/), and [RingoJS ≥ v0.8.0](http://ringojs.org/):

```js
var regenerate = require('regenerate');
```

In [Narwhal](http://narwhaljs.org/) and [RingoJS ≤ v0.7.0](http://ringojs.org/):

```js
var regenerate = require('regenerate').regenerate;
```

In [Rhino](http://www.mozilla.org/rhino/):

```js
load('regenerate.js');
```

Using an AMD loader like [RequireJS](http://requirejs.org/):

```js
require(
  {
    'paths': {
      'regenerate': 'path/to/regenerate'
    }
  },
  ['regenerate'],
  function(regenerate) {
    console.log(regenerate);
  }
);
```

## API

### `regenerate(value1, value2, value3, ...)`

The main Regenerate function. Calling this function creates a new set that gets a chainable API.

```js
var set = regenerate()
  .addRange(0x60, 0x69) // add U+0060 to U+0069
  .remove(0x62, 0x64) // remove U+0062 and U+0064
  .add(0x1D306) // add U+1D306
set.valueOf();
// → [0x60, 0x61, 0x63, 0x65, 0x66, 0x67, 0x68, 0x69, 0x1D306]
set.toString();
// → '[\\x60-ace-i]|\\uD834\\uDF06'
set.toRegExp();
// → /[\x60-ace-i]|\uD834\uDF06/
```

Any arguments passed to `regenerate()` will be added to the set right away. Both code points (numbers) as symbols (strings consisting of a single Unicode symbol) are accepted.

```js
regenerate(0x1D306, 'A', '©', 0x2603).toString();
// → '[A\\xA9\\u2603]|\\uD834\\uDF06'
```

### `regenerate.prototype.add(value1, value2, value3, ...)`

Any arguments passed to `add()` are added to the set. Both code points (numbers) as symbols (strings consisting of a single Unicode symbol) are accepted, as well as arrays containing values of these types.

```js
regenerate().add(0x1D306, 'A', '©', 0x2603).toString();
// → '[A\\xA9\\u2603]|\\uD834\\uDF06'
```

### `regenerate.prototype.remove(value1, value2, value3, ...)`

Any arguments passed to `remove()` are removed to the set. Both code points (numbers) as symbols (strings consisting of a single Unicode symbol) are accepted, as well as arrays containing values of these types.

```js
regenerate(0x1D306, 'A', '©', 0x2603).remove('☃').toString();
// → '[A\\xA9]|\\uD834\\uDF06'
```

Functions can also be passed. In that case, the result of calling the function against a code point value in the set determines whether the element should be removed (`true`) or not (`false`).

```js
regenerate(0x1D306, 'A', '©', 0x2603).remove(function(codePoint) {
  return codePoint > 0xFFFF; // remove astral code points from the set
}).toString();
// → '[A\\xA9\\u2603]'
```

### `regenerate.prototype.addRange(start, end)`

Adds a range of code points from `start` to `end` (inclusive) to the set. Both code points (numbers) as symbols (strings consisting of a single Unicode symbol) are accepted.

```js
regenerate(0x1D306).addRange(0x00, 0xFF).toString(16);
// → '[\\0-\\xFF]|\\uD834\\uDF06'

regenerate().addRange('A', 'z').toString();
// → '[A-z]'
```

### `regenerate.prototype.removeRange(start, end)`

Removes a range of code points from `start` to `end` (inclusive) from the set. Both code points (numbers) as symbols (strings consisting of a single Unicode symbol) are accepted.

```js
regenerate()
  .addRange(0x000000, 0x10FFFF) // add all Unicode code points
  .removeRange('A', 'z') // remove all symbols from `A` to `z`
  .toString();
// → '[\\0-\\x40\\x7B-\\uD7FF\\uDC00-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF]'

regenerate()
  .addRange(0x000000, 0x10FFFF) // add all Unicode code points
  .removeRange(0x0041, 0x007A) // remove all code points from U+0041 to U+007A
  .toString();
// → '[\\0-\\x40\\x7B-\\uD7FF\\uDC00-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF]'
```

### `regenerate.prototype.difference(codePoints)`

Removes any code points from the set that are present in both the set and the given `codePoints` array. `codePoints` must be an array of numeric code point values, i.e. numbers. If you want to use symbol values (strings) as well, use `regenerate#remove()` instead.

```js
regenerate()
  .addRange(0x00, 0xFF) // add extended ASCII code points
  .difference([0x61, 0x73]) // remove these code points from the set
  .toString();
// → '[\0-\x60b-rt-\xFF]'
```

### `regenerate.prototype.intersection(codePoints)`

Removes any code points from the set that are not present in both the set and the given `codePoints` array. `codePoints` must be an array of numeric code point values, i.e. numbers.

```js
regenerate()
  .addRange(0x00, 0xFF) // add extended ASCII code points
  .intersection([0x61, 0x69]) // remove all code points from the set except for these
  .toString();
// → '[ai]'
```

### `regenerate.prototype.contains(value)`

Returns `true` if the given value is part of the set, and `false` otherwise. Both code points (numbers) as symbols (strings consisting of a single Unicode symbol) are accepted.

```js
var set = regenerate().addRange(0x00, 0xFF);
set.contains('A');
// → true
set.contains(0x1D306);
// → false
```

### `regenerate.prototype.toString()`

Returns a string representing (part of) a regular expression that matches all the symbols mapped to the code points within the set.

```js
regenerate(0x1D306, 0x1F4A9).toString();
// → '\\uD834\\uDF06|\\uD83D\\uDCA9'
```

### `regenerate.prototype.toRegExp()`

Returns a regular expression that matches all the symbols mapped to the code points within the set.

```js
var regex = regenerate(0x1D306, 0x1F4A9).toRegExp();
// → /\uD834\uDF06|\uD83D\uDCA9/
regex.test('𝌆');
// → true
regex.test('A');
// → false
```

**Note:** This probably shouldn’t be used. Regenerate is intended as a tool that is used as part of a build process, not at runtime.

### `regenerate.prototype.valueOf()` or `regenerate.prototype.toArray()`

Returns a sorted array of unique code points in the set.

```js
regenerate(0x1D306)
  .addRange(0x60, 0x65)
  .add(0x59, 0x60) // note: 0x59 is added after 0x65, and 0x60 is a duplicate
  .valueOf();
// → [0x59, 0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x1D306]
```

### `regenerate.version`

A string representing the semantic version number.

### `regenerate.fromCodePoints(codePoints)`

This function takes an array of numerical code point values and returns a string representing (part of) a regular expression that would match all the symbols mapped to those code points.

```js
// Create a regular expression that matches any of the given code points:
regenerate.fromCodePoints([0x1F604, 0x1F605, 0x1F606, 0x1F607]);
// → '\\uD83D[\\uDE04-\\uDE07]'
```

### `regenerate.fromCodePointRange(start, end)`

This function takes a `start` and an `end` code point value, and returns a string representing (part of) a regular expression that would match all the symbols mapped to the code points within the range _[start, end]_ (inclusive).

```js
// Create a regular expression that matches any code point in the given range:
regenerate.fromCodePointRange(0x1F604, 0x1F607);
// → '\\uD83D[\\uDE04-\\uDE07]'

// Create a regular expression that matches any Unicode code point:
regenerate.fromCodePointRange(0x000000, 0x10FFFF);
// → '[\\0-\\uD7FF\\uDC00-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF]'
```

### `regenerate.fromCodePointRanges(ranges)`

This function takes an array of code point ranges or separate code points, and returns a string representing (part of) a regular expression that would match all the symbols mapped to the code points within the listed code points or code point ranges.

```js
// Create a regular expression based on a dynamically created range of code points:
regenerate.fromCodePointRanges([
  [0x00, 0xFF],          // range
  [0x2603, 0x2608],      // range
  0x1F4A9, // separate code point
  0x1F4BB  // separate code point
]);
// → '[\\0-\\xFF\\u2603-\\u2608]|\\uD83D[\\uDCA9\\uDCBB]'
```

```js
// Allow all Unicode symbols except U+2603 SNOWMAN and U+1F4A9 PILE OF POO:
regenerate.fromCodePointRanges([
  [0x0000, 0x2602],  // skip 0x2603
  [0x2604, 0x1F4A8], // skip 0x1F4A9
  [0x1F4AA, 0x10FFFF]
]);
// → '[\\0-\\u2602\\u2604-\\uD7FF\\uDC00-\\uFFFF]|[\\uD800-\\uD83C\\uD83E-\\uDBFF][\\uDC00-\\uDFFF]|\\uD83D[\\uDC00-\\uDCA8\\uDCAA-\\uDFFF]|[\\uD800-\\uDBFF]'
```

### `regenerate.fromSymbols(symbols)`

This function takes an array of strings that each contain a single Unicode symbol. It returns a string representing (part of) a regular expression that would match all those symbols.

```js
// Create a regular expression that matches any of the given Unicode symbols:
regenerate.fromSymbols(['𝐀', '𝐁', '𝐂', '𝐃', '𝐄']);
// → '\\uD835[\\uDC00-\\uDC04]'
```

### `regenerate.fromSymbolRange(start, end)`

This function takes a `start` and an `end` string which each contain a single Unicode symbol. It returns a string representing (part of) a regular expression that would match all the symbols within the range _[start, end]_ (inclusive).

```js
// Create a regular expression that matches any Unicode symbol in the given range:
regenerate.fromSymbolRange('𝐏', '𝐟');
// → '\\uD835[\\uDC0F-\\uDC1F]'
```

### `regenerate.fromSymbolRanges(ranges)`

This function takes an array of symbol ranges or separate strings, each containing a single Unicode symbol, and returns a string representing (part of) a regular expression that would match all the symbols within the listed symbols or symbol ranges.

```js
// Create a regular expression based on a dynamically created range of code points:
regenerate.fromSymbolRanges([
  ['\0', '\xFF'],           // range
  ['\u2603', '\u2608'],     // range
  '\uD83D\uDCA9', // separate symbol
  '\uD83D\uDCBB'  // separate symbol
]);
// → '[\\0-\\xFF\\u2603-\\u2608]|\\uD83D[\\uDCA9\\uDCBB]'
```

### `regenerate.range(start, end)`

This function takes a `start` and an `end` number and returns an array of numbers progressing from `start` up to and including `end`, i.e. all the numbers within the range _[start, end]_ (inclusive).

```js
// Create an array containing all extended ASCII code points:
regenerate.range(0x00, 0xFF);
// → [0x00, 0x01, 0x02, 0x03, ..., 0xFF]
```

### `regenerate.ranges(ranges)`

This function takes an array of code point ranges or separate code points, and returns an array containing all the code points within the listed code points or code point ranges.

```js
// Create a regular expression based on a dynamically created range of code points:
var codePoints = regenerate.ranges([
  [0x00, 0xFF], // → 0x00, 0x01, 0x02, 0x03, …, 0xFC, 0xFD, 0xFE, 0xFF
  [0x2603, 0x2608], // → 0x2603, 0x2604, 0x2605, 0x2606, 0x2607, 0x2608
  0x1F4A9, // add U+1F4A9 PILE OF POO
  0x1F4BB // add U+1F4BB PERSONAL COMPUTER
]);
// → [0x00, 0x01, …, 0xFE, 0xFF, 0x2603, 0x2604, …, 0x2607, 0x2608, 0x1F4A9, 0x1F4BB]
regenerate.fromCodePoints(codePoints);
// → '[\\0-\\xFF\\u2603-\\u2608]|\\uD83D[\\uDCA9\\uDCBB]'
```

### `regenerate.contains(array, value)`

Returns `true` if `array` contains `value`, and `false` otherwise.

```js
var ASCII = regenerate.range(0x00, 0xFF); // extended ASCII
// → [0x00, 0x01, 0x02, 0x03, ..., 0xFF]
regenerate.contains(ASCII, 0x61);
// → true
regenerate.contains(ASCII, 0x1D306);
// → false
```

### `regenerate.difference(array1, array2)`

Returns an array of `array1` elements that are not present in `array2`.

```js
regenerate.difference(
  [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06],
  [0x01, 0x03, 0x05]
);
// → [0x00, 0x02, 0x04, 0x06]
```

### `regenerate.intersection(array1, array2)`

Returns an array of unique elements that are present in both `array1` and `array2`.

```js
regenerate.intersection(
  [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06],
  [0x01, 0x03, 0x05, 0x07]
);
// → [0x01, 0x03, 0x05]
```

### `regenerate.add(array, value)`

Extends `array` based on `value` as follows:

* If `value` is a code point (i.e. a number), it’s appended to `array`.
* If `value` is a symbol (i.e. a string containing a single Unicode symbol), its numeric code point value is appended to `array`.
* If `value` is an array, all its values are added to `array` following the above steps.

```js
regenerate.add(
  [0x00, 0x1D306],
  0x41
);
// → [0x00, 0x1D306, 0x41]

regenerate.add(
  [0x00, 0x1D306],
  'A'
);
// → [0x00, 0x1D306, 0x41]

regenerate.add(
  [0x00, 0x1D306],
  [0x61, 0x203B, 'A']
);
// → [0x00, 0x1D306, 0x61, 0x203B, 0x41]
```

### `regenerate.remove(array, value)`

Removes values from `array` based on `value` as follows:

* If `value` is a code point (i.e. a number), it’s removed from `array`.
* If `value` is a symbol (i.e. a string containing a single Unicode symbol), its numeric code point value is removed from `array`.
* If `value` is an array, all its values are removed from `array` following on the above steps.

```js
regenerate.remove(
  [0x00, 0x1D306, 0x41],
  0x41
);
// → [0x00, 0x1D306]

regenerate.remove(
  [0x00, 0x1D306, 0x41],
  'A'
);
// → [0x00, 0x1D306]

regenerate.remove(
  [0x00, 0x1D306, 0x61, 0x203B, 0x41],
  [0x61, 0x203B, 'A']
);
// → [0x00, 0x1D306]
```

## Combine Regenerate with other libraries

Regenerate gets even better when combined with other libraries such as [Punycode.js](http://mths.be/punycode). Here’s an example where [Punycode.js](http://mths.be/punycode) is used to convert a string into an array of code points, that is then passed on to Regenerate:

```js
var regenerate = require('regenerate');
var punycode = require('punycode');

var string = 'Lorem ipsum dolor sit amet.';
// Get an array of all code points used in the string:
var codePoints = punycode.ucs2.decode(string);

// Generate a regular expression that matches any of the symbols used in the string:
regenerate(codePoints).toString();
// → '[\\x20\\x2ELad-eil-mo-pr-u]'
```

## Support

Regenerate has been tested in at least Chrome 27-29, Firefox 3-22, Safari 4-6, Opera 10-12, IE 6-10, Node.js v0.10.0, Narwhal 0.3.2, RingoJS 0.8-0.9, PhantomJS 1.9.0, and Rhino 1.7RC4.

## Unit tests & code coverage

After cloning this repository, run `npm install` to install the dependencies needed for Regenerate development and testing. You may want to install Istanbul _globally_ using `npm install istanbul -g`.

Once that’s done, you can run the unit tests in Node using `npm test` or `node tests/tests.js`. To run the tests in Rhino, Ringo, Narwhal, and web browsers as well, use `grunt test`.

To generate [the code coverage report](http://rawgithub.com/mathiasbynens/regenerate/master/coverage/regenerate/regenerate.js.html), use `grunt cover`.

## Author

| [![twitter/mathias](http://gravatar.com/avatar/24e08a9ea84deb17ae121074d0f17125?s=70)](http://twitter.com/mathias "Follow @mathias on Twitter") |
|---|
| [Mathias Bynens](http://mathiasbynens.be/) |

## License

Regenerate is available under the [MIT](http://mths.be/mit) license.
