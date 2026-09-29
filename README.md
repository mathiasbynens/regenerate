# Regenerate [![Build status](https://github.com/mathiasbynens/regenerate/workflows/run-checks/badge.svg)](https://github.com/mathiasbynens/regenerate/actions?query=workflow%3Arun-checks) [![regenerate on npm](https://img.shields.io/npm/v/regenerate)](https://www.npmjs.com/package/regenerate)

_Regenerate_ is a Unicode-aware regex generator for JavaScript. It allows you to easily generate ES5-compatible regular expressions based on a given set of Unicode symbols or code points. (This is trickier than you might think, because of [how JavaScript deals with astral symbols](https://mathiasbynens.be/notes/javascript-unicode).)

## Installation

Via [npm](https://npmjs.org/):

```bash
npm install regenerate
```

Via [Bower](http://bower.io/):

```bash
bower install regenerate
```

In a browser:

```html
<script src="regenerate.js"></script>
```

In [Node.js](https://nodejs.org/), [io.js](https://iojs.org/), and [RingoJS ≥ v0.8.0](http://ringojs.org/):

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
  .add(0x1D306); // add U+1D306
set.valueOf();
// → [0x60, 0x61, 0x63, 0x65, 0x66, 0x67, 0x68, 0x69, 0x1D306]
set.toString();
// → '[`ace-i]|\\uD834\\uDF06'
set.toRegExp();
// → /[`ace-i]|\uD834\uDF06/
```

Any arguments passed to `regenerate()` will be added to the set right away. Both code points (numbers) and symbols (strings consisting of a single Unicode symbol) are accepted, as well as arrays containing values of these types.

```js
regenerate(0x1D306, 'A', '©', 0x2603).toString();
// → '[A\\xA9\\u2603]|\\uD834\\uDF06'

var items = [0x1D306, 'A', '©', 0x2603];
regenerate(items).toString();
// → '[A\\xA9\\u2603]|\\uD834\\uDF06'
```

### `regenerate.prototype.add(value1, value2, value3, ...)`

Any arguments passed to `add()` are added to the set. Both code points (numbers) and symbols (strings consisting of a single Unicode symbol) are accepted, as well as arrays containing values of these types.

```js
regenerate().add(0x1D306, 'A', '©', 0x2603).toString();
// → '[A\\xA9\\u2603]|\\uD834\\uDF06'

var items = [0x1D306, 'A', '©', 0x2603];
regenerate().add(items).toString();
// → '[A\\xA9\\u2603]|\\uD834\\uDF06'
```

It’s also possible to pass in a Regenerate instance. Doing so adds all code points in that instance to the current set.

```js
var set = regenerate(0x1D306, 'A');
regenerate().add('©', 0x2603).add(set).toString();
// → '[A\\xA9\\u2603]|\\uD834\\uDF06'
```

Note that the initial call to `regenerate()` acts like `add()`. This allows you to create a new Regenerate instance and add some code points to it in one go:

```js
regenerate(0x1D306, 'A', '©', 0x2603).toString();
// → '[A\\xA9\\u2603]|\\uD834\\uDF06'
```

### `regenerate.prototype.remove(value1, value2, value3, ...)`

Any arguments passed to `remove()` are removed from the set. Both code points (numbers) and symbols (strings consisting of a single Unicode symbol) are accepted, as well as arrays containing values of these types.

```js
regenerate(0x1D306, 'A', '©', 0x2603).remove('☃').toString();
// → '[A\\xA9]|\\uD834\\uDF06'
```

It’s also possible to pass in a Regenerate instance. Doing so removes all code points in that instance from the current set.

```js
var set = regenerate('☃');
regenerate(0x1D306, 'A', '©', 0x2603).remove(set).toString();
// → '[A\\xA9]|\\uD834\\uDF06'
```

### `regenerate.prototype.addRange(start, end)`

Adds a range of code points from `start` to `end` (inclusive) to the set. Both code points (numbers) and symbols (strings consisting of a single Unicode symbol) are accepted.

```js
regenerate(0x1D306).addRange(0x00, 0xFF).toString(16);
// → '[\\0-\\xFF]|\\uD834\\uDF06'

regenerate().addRange('A', 'z').toString();
// → '[A-z]'
```

### `regenerate.prototype.removeRange(start, end)`

Removes a range of code points from `start` to `end` (inclusive) from the set. Both code points (numbers) and symbols (strings consisting of a single Unicode symbol) are accepted.

```js
regenerate()
  .addRange(0x000000, 0x10FFFF) // add all Unicode code points
  .removeRange('A', 'z') // remove all symbols from `A` to `z`
  .toString();
// → '[\\0-@\\{-\\uD7FF\\uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]'

regenerate()
  .addRange(0x000000, 0x10FFFF) // add all Unicode code points
  .removeRange(0x0041, 0x007A) // remove all code points from U+0041 to U+007A
  .toString();
// → '[\\0-@\\{-\\uD7FF\\uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]'
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

Instead of the `codePoints` array, it’s also possible to pass in a Regenerate instance.

```js
var whitelist = regenerate(0x61, 0x69);

regenerate()
  .addRange(0x00, 0xFF) // add extended ASCII code points
  .intersection(whitelist) // remove all code points from the set except for those in the `whitelist` set
  .toString();
// → '[ai]'
```

### `regenerate.prototype.contains(value)`

Returns `true` if the given value is part of the set, and `false` otherwise. Both code points (numbers) and symbols (strings consisting of a single Unicode symbol) are accepted.

```js
var set = regenerate().addRange(0x00, 0xFF);
set.contains('A');
// → true
set.contains(0x1D306);
// → false
```

### `regenerate.prototype.clone()`

Returns a clone of the current code point set. Any actions performed on the clone won’t mutate the original set.

```js
var setA = regenerate(0x1D306);
var setB = setA.clone().add(0x1F4A9);
setA.toArray();
// → [0x1D306]
setB.toArray();
// → [0x1D306, 0x1F4A9]
```

### `regenerate.prototype.toString(options)`

Returns a string representing (part of) a regular expression that matches all the symbols mapped to the code points within the set.

```js
regenerate(0x1D306, 0x1F4A9).toString();
// → '\\uD834\\uDF06|\\uD83D\\uDCA9'
```

If the `bmpOnly` property of the optional `options` object is set to `true`, the output matches surrogates individually, regardless of whether they’re lone surrogates or just part of a surrogate pair. This simplifies the output, but it can only be used in case you’re certain the strings it will be used on don’t contain any astral symbols.

```js
var highSurrogates = regenerate().addRange(0xD800, 0xDBFF);
highSurrogates.toString();
// → '[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])'
highSurrogates.toString({ 'bmpOnly': true });
// → '[\\uD800-\\uDBFF]'

var lowSurrogates = regenerate().addRange(0xDC00, 0xDFFF);
lowSurrogates.toString();
// → '(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]'
lowSurrogates.toString({ 'bmpOnly': true });
// → '[\\uDC00-\\uDFFF]'
```

Note that lone low surrogates cannot be matched accurately using regular expressions in JavaScript without the use of [lookbehind assertions](https://mathiasbynens.be/notes/es-regexp-proposals#lookbehinds), which aren't yet widely supported. Regenerate’s output makes a best-effort approach but [there can be false negatives in this regard](https://github.com/mathiasbynens/regenerate/issues/28#issuecomment-72224808).

If the `hasUnicodeFlag` property of the optional `options` object is set to `true`, the output makes use of Unicode code point escapes (`\u{…}`) where applicable. This simplifies the output at the cost of compatibility and portability, since it means the output can only be used as a pattern in a regular expression with [the ES6 `u` flag](https://mathiasbynens.be/notes/es6-unicode-regex) enabled.

```js
var set = regenerate().addRange(0x0, 0x10FFFF);

set.toString();
// → '[\\0-\\uD7FF\\uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]''

set.toString({ 'hasUnicodeFlag': true });
// → '[\\0-\\u{10FFFF}]'
```

### `regenerate.prototype.toRegExp(flags = '')`

Returns a regular expression that matches all the symbols mapped to the code points within the set. Optionally, you can pass [flags](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Parameters) to be added to the regular expression.

```js
var regex = regenerate(0x1D306, 0x1F4A9).toRegExp();
// → /\uD834\uDF06|\uD83D\uDCA9/
regex.test('𝌆');
// → true
regex.test('A');
// → false

// With flags:
var regex = regenerate(0x1D306, 0x1F4A9).toRegExp('g');
// → /\uD834\uDF06|\uD83D\uDCA9/g
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

## Combine Regenerate with other libraries

Regenerate gets even better when combined with other libraries such as [Punycode.js](https://mths.be/punycode). Here’s an example where [Punycode.js](https://mths.be/punycode) is used to convert a string into an array of code points, that is then passed on to Regenerate:

```js
var regenerate = require('regenerate');
var punycode = require('punycode');

var string = 'Lorem ipsum dolor sit amet.';
// Get an array of all code points used in the string:
var codePoints = punycode.ucs2.decode(string);

// Generate a regular expression that matches any of the symbols used in the string:
regenerate(codePoints).toString();
// → '[ \\.Ladeilmopr-u]'
```

In ES6 you can do something similar with [`Array.from`](https://mths.be/array-from) which uses [the string’s iterator](https://mathiasbynens.be/notes/javascript-unicode#iterating-over-symbols) to split the given string into an array of strings that each contain a single symbol. [`regenerate()`](#regenerateprototypeaddvalue1-value2-value3-) accepts both strings and code points, remember?

```js
var regenerate = require('regenerate');

var string = 'Lorem ipsum dolor sit amet.';
// Get an array of all symbols used in the string:
var symbols = Array.from(string);

// Generate a regular expression that matches any of the symbols used in the string:
regenerate(symbols).toString();
// → '[ \\.Ladeilmopr-u]'
```

## Support

Regenerate supports at least Chrome 27+, Firefox 3+, Safari 4+, Opera 10+, IE 6+, Node.js v0.10.0+, io.js v1.0.0+, Narwhal 0.3.2+, RingoJS 0.8+, PhantomJS 1.9.0+, and Rhino 1.7RC4+.

## Unit tests & code coverage

After cloning this repository, run `npm install` to install the dependencies needed for Regenerate development and testing. You may want to install Istanbul _globally_ using `npm install istanbul -g`.

Once that’s done, you can run the unit tests in Node using `npm test` or `node tests/tests.js`. To run the tests in Rhino, Ringo, Narwhal, and web browsers as well, use `grunt test`.

To generate the code coverage report, use `grunt cover`.

## Author

| [![twitter/mathias](https://gravatar.com/avatar/24e08a9ea84deb17ae121074d0f17125?s=70)](https://twitter.com/mathias "Follow @mathias on Twitter") |
|---|
| [Mathias Bynens](https://mathiasbynens.be/) |

## License

Regenerate is available under the [MIT](https://mths.be/mit) license.
