
/**
 * The main Regenerate function. Calling this function creates a new set that gets a chainable API.
 *
 * Any arguments passed to regenerate() will be added to the set right away.
 * Both code points (numbers) and symbols (strings consisting of a single Unicode symbol) are accepted,
 * as well as arrays containing values of these types.
 *
 * @param {regenerate.IRegenerateInputBase} values
 * @returns {regenerate.IRegenerateObject}
 */
declare function regenerate(...values: regenerate.IRegenerateInputBase[]): regenerate.IRegenerateObject;

declare namespace regenerate
{
	type IRegenerateInputBase = number | string;
	type IRegenerateInput = IRegenerateInputBase | IRegenerateObject;

	interface IRegenerateOptions
	{
		/**
		 * If the bmpOnly property of the optional options object is set to true, the output matches surrogates individually,
		 * regardless of whether they’re lone surrogates or just part of a surrogate pair.
		 * This simplifies the output,
		 * but it can only be used in case you’re certain the strings it will be used on don’t contain any astral symbols.
		 */
		bmpOnly?: boolean;
		/**
		 * If the hasUnicodeFlag property of the optional options object is set to true, the output makes use of Unicode code point escapes (\u{…}) where applicable.
		 * This simplifies the output at the cost of compatibility and portability,
		 * since it means the output can only be used as a pattern in a regular expression with the ES6 u flag enabled.
		 */
		hasUnicodeFlag?: boolean;
	}

	interface IRegenerateObject
	{
		/**
		 * Adds a range of code points from start to end (inclusive) to the set.
		 * Both code points (numbers) and symbols (strings consisting of a single Unicode symbol) are accepted.
		 *
		 * @param {IRegenerateInput} min
		 * @param {IRegenerateInput} max
		 * @returns {IRegenerateObject}
		 */
		addRange(min: IRegenerateInputBase, max: IRegenerateInputBase): IRegenerateObject;

		/**
		 * Removes a range of code points from start to end (inclusive) from the set.
		 * Both code points (numbers) and symbols (strings consisting of a single Unicode symbol) are accepted.
		 *
		 * @param {IRegenerateInput} min
		 * @param {IRegenerateInput} max
		 * @returns {IRegenerateObject}
		 */
		removeRange(min: IRegenerateInputBase, max: IRegenerateInputBase): IRegenerateObject;

		/**
		 * Any arguments passed to add() are added to the set.
		 * Both code points (numbers) and symbols (strings consisting of a single Unicode symbol) are accepted,
		 * as well as arrays containing values of these types.
		 *
		 * @param {IRegenerateInput} value
		 * @param {IRegenerateInput} values
		 * @returns {IRegenerateObject}
		 */
		add(value: IRegenerateInput, ...values: IRegenerateInput[]): IRegenerateObject;

		/**
		 * Any arguments passed to remove() are removed from the set.
		 * Both code points (numbers) and symbols (strings consisting of a single Unicode symbol) are accepted,
		 * as well as arrays containing values of these types.
		 *
		 * @param {IRegenerateInput} value
		 * @param {IRegenerateInput} values
		 * @returns {IRegenerateObject}
		 */
		remove(value: IRegenerateInput, ...values: IRegenerateInput[]): IRegenerateObject;

		/**
		 * Removes any code points from the set that are not present in both the set and the given codePoints array.
		 * codePoints must be an array of numeric code point values, i.e. numbers.
		 *
		 * @param {IRegenerateInput} value
		 * @param {IRegenerateInput} values
		 * @returns {IRegenerateObject}
		 */
		intersection(value: IRegenerateInput, ...values: IRegenerateInput[]): IRegenerateObject;

		/**
		 * Returns a sorted array of unique code points in the set.
		 * @returns {number[]}
		 */
		valueOf(): number[];

		/**
		 * Returns a sorted array of unique code points in the set.
		 * @returns {number[]}
		 */
		toArray(): number[];

		/**
		 * Returns true if the given value is part of the set, and false otherwise.
		 * Both code points (numbers) and symbols (strings consisting of a single Unicode symbol) are accepted.
		 *
		 * @param {IRegenerateInput} value
		 * @returns {boolean}
		 */
		contains(value: IRegenerateInput): boolean;

		/**
		 * Returns a string representing (part of) a regular expression that matches all the symbols mapped to the code points within the set.
		 *
		 * @param {IRegenerateOptions} options
		 * @returns {string}
		 */
		toString(options?: IRegenerateOptions): string;

		/**
		 * Returns a regular expression that matches all the symbols mapped to the code points within the set.
		 * Optionally,
		 * you can pass flags to be added to the regular expression.
		 *
		 * @param {string} flags
		 * @returns {RegExp}
		 */
		toRegExp(flags?: string): RegExp;

		/**
		 * Returns a clone of the current code point set.
		 * Any actions performed on the clone won’t mutate the original set.
		 *
		 * @returns {IRegenerateObject}
		 */
		clone(): IRegenerateObject;

		/**
		 * A string representing the semantic version number.
		 */
		version: string;
	}
}

export = regenerate

