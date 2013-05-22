# Regenerate

[![Build status](https://travis-ci.org/mathiasbynens/regenerate.png?branch=master)](https://travis-ci.org/mathiasbynens/regenerate)
[![Dependency status](https://gemnasium.com/mathiasbynens/regenerate.png)](https://gemnasium.com/mathiasbynens/regenerate)

_Regenerate_ is a Unicode-aware regex generator for JavaScript. It allows you to easily generate JavaScript-compatible regular expressions based on a given set of Unicode symbols or code points.

Feel free to fork if you see possible improvements!

## Installation

In a browser:

~~~html
<script src="regenerate.js"></script>
~~~

Via [npm](http://npmjs.org/):

~~~bash
npm install regenerate
~~~

In [Narwhal](http://narwhaljs.org/), [Node.js](http://nodejs.org/), and [RingoJS](http://ringojs.org/):

~~~js
var regenerate = require('regenerate');
~~~

In [Rhino](http://www.mozilla.org/rhino/):

~~~js
load('regenerate.js');
~~~

Using an AMD loader like [RequireJS](http://requirejs.org/):

~~~js
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
~~~

## API

### `regenerate.version`

A string representing the semantic version number.

### `regenerate.fromCodePoints(codePoints)`

This function takes an array of numerical code point values and returns a string representing (part of) a regular expression that would match all the symbols mapped to those code points.

### `regenerate.fromCodePointRange(start, end)`

This function takes a `start` and an `end` code point value, and returns a string representing (part of) a regular expression that would match all the symbols mapped to the code points within the range _[start, end]_ (inclusive).

### `regenerate.fromCodePointRanges(ranges)`

This function takes an array of code point ranges or separate code points, and returns a string representing (part of) a regular expression that would match all the symbols mapped to the code points within the listed code points or code point ranges.

### `regenerate.fromSymbols(symbols)`

This function takes an array of strings that each contain a single Unicode symbol. It returns a string representing (part of) a regular expression that would match all those symbols.

### `regenerate.fromSymbolRange(start, end)`

This function takes a `start` and an `end` string which each contain a single Unicode symbol. It returns a string representing (part of) a regular expression that would match all the symbols within the range _[start, end]_ (inclusive).

### `regenerate.fromSymbolRanges(ranges)`

This function takes an array of symbol ranges or separate strings, each containing a single Unicode symbol, and returns a string representing (part of) a regular expression that would match all the symbols within the listed symbols or symbol ranges.

### `regenerate.range(start, end)`

This function takes a `start` and an `end` number and returns an array of numbers progressing from `start` up to and including `end`, i.e. all the numbers within the range _[start, end]_ (inclusive).

## Usage examples

Some basic examples:

~~~js
// Create a regular expression that matches any of the given code points:
regenerate.fromCodePoints([0x1F604, 0x1F605, 0x1F606, 0x1F607]);
// → '\\uD83D[\\uDE04-\\uDE07]'

// Create a regular expression that matches any code point in the given range:
regenerate.fromCodePointRange(0x1F604, 0x1F607);
// → '\\uD83D[\\uDE04-\\uDE07]'

// Create a regular expression that matches any Unicode code point:
regenerate.fromCodePointRange(0x000000, 0x10FFFF);
// → '[\\0-\\uD7FF\\uDC00-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF]'

// Create a regular expression that matches any of the given Unicode symbols:
regenerate.fromSymbols(['𝐀', '𝐁', '𝐂', '𝐃', '𝐄']);
// → '\\uD835[\\uDC00-\\uDC04]'

// Create a regular expression that matches any Unicode symbol in the given range:
regenerate.fromSymbolRange('𝐏', '𝐟');
// → '\\uD835[\\uDC0F-\\uDC1F]'
~~~

Note that all of Regenerate’s methods return **strings** that can be used as (part of) a regular expression literal. To convert an output string into a regular expression dynamically, just wrap it in `RegExp(…)`:

```js
// Create a regular expression that matches any code point in the given range:
var result = regenerate.fromCodePointRange(0x1F604, 0x1F607);
// → '\\uD83D[\\uDE04-\\uDE07]'
var regex = RegExp(result);
// → /\uD83D[\uDE04-\uDE07]/
regex.test('\uD83D\uDE03'); // 0x1F603
// → false
regex.test('\uD83D\uDE04'); // 0x1F604
// → true
```

Here’s a slightly more advanced example, showing how to create a regular expression based on a dynamically generated range of code points:

```js
// Create a regular expression based on a dynamically created range of code points:
var part1 = regenerate.range(0x00, 0xFF);
// → [0x00, 0x01, 0x02, 0x03, …, 0xFC, 0xFD, 0xFE, 0xFF]
var part2 = regenerate.range(0x2603, 0x2608);
// → [0x2603, 0x2604, 0x2605, 0x2606, 0x2607, 0x2608]
var part3 = [0x1F4A9, 0x1F4BB]; // add U+1F4A9 PILE OF POO and U+1F4BB PERSONAL COMPUTER
var codePoints = part1.concat(part2).concat(part3);
// → [0x00, 0x01, …, 0xFE, 0xFF, 0x2603, 0x2604, …, 0x2607, 0x2608, 0x1F4A9, 0x1F4BB]
regenerate.fromCodePoints(codePoints);
// → '[\\0-\\xFF\\u2603-\\u2608]|\\uD83D[\\uDCA9\\uDCBB]'
```

The previous example can be rewritten as follows:

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

Or, by using the symbols directly instead of the code points:

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

Similarly, to create a regular expression that matches any Unicode symbol except for a few blacklisted symbols:

```js
// Allow all Unicode symbols except U+2603 SNOWMAN and U+1F4A9 PILE OF POO
regenerate.fromCodePointRanges([
	[0x0000, 0x2602],  // skip 0x2603
	[0x2604, 0x1F4A8], // skip 0x1F4A9
	[0x1F4AA, 0x10FFFF]
]);
// → '[\\0-\\u2602\\u2604-\\uD7FF\\uDC00-\\uFFFF]|[\\uD800-\\uD83C\\uD83E-\\uDBFF][\\uDC00-\\uDFFF]|\\uD83D[\\uDC00-\\uDCA8\\uDCAA-\\uDFFF]|[\\uD800-\\uDBFF]'
```

Regenerate gets even better when combined with other libraries such as [Lo-Dash](http://lodash.com/) or [Punycode.js](http://mths.be/punycode). Here’s a more readable (albeit slightly more verbose) solution to the previous problem:

```js
var regenerate = require('regenerate');
var _ = require('lodash');

// Start with all Unicode code points:
var allowed = regenerate.range(0x000000, 0x10FFFF);
// Disallow U+2603 SNOWMAN and U+1F4A9 PILE OF POO:
var disallowed = [0x2603, 0x1F4A9];
// Create the resulting array of code points:
var codePoints = _.difference(allowed, disallowed);

// Generate a regular expression that matches any of those code points:
regenerate.fromCodePoints(codePoints);
// → '[\\0-\\u2602\\u2604-\\uD7FF\\uDC00-\\uFFFF]|[\\uD800-\\uD83C\\uD83E-\\uDBFF][\\uDC00-\\uDFFF]|\\uD83D[\\uDC00-\\uDCA8\\uDCAA-\\uDFFF]|[\\uD800-\\uDBFF]'
```

Here’s an example where [Punycode.js](http://mths.be/punycode) is used to convert a string into an array of code points, that is then passed on to Regenerate:

```js
var regenerate = require('regenerate');
var _ = require('lodash');
var punycode = require('punycode');

var string = 'Lorem ipsum dolor sit amet.';
// Get an array of all code points used in the string
var codePoints = punycode.ucs2.decode(string);
// Remove duplicates and sort the array
codePoints = _.uniq(codePoints);

// Generate a regular expression that matches any of the symbols used in the string:
regenerate.fromCodePoints(codePoints);
// → '[\\x20\\x2ELad-eil-mo-pr-u]'
```

## Unit tests & code coverage

After cloning this repository, run `npm install` to install the dependencies needed for Regenerate development and testing. You may want to install Istanbul _globally_ using `npm install istanbul -g`.

Once that’s done, you can run the unit tests in Node using `npm test` or `node tests/tests.js`. To run the tests in Rhino, Ringo, Narwhal, and web browsers as well, use `grunt test`.

To generate [the code coverage report](http://rawgithub.com/mathiasbynens/regenerate/master/coverage/regenerate/regenerate.js.html), use `grunt cover`.

## Author

| [![twitter/mathias](http://gravatar.com/avatar/24e08a9ea84deb17ae121074d0f17125?s=70)](http://twitter.com/mathias "Follow @mathias on Twitter") |
|---|
| [Mathias Bynens](http://mathiasbynens.be/) |

## License

Regenerate is dual licensed under the [MIT](http://mths.be/mit) and [GPL](http://mths.be/gpl) licenses.
