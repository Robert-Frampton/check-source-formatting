var _ = require('lodash');
var base = require('cli-base').base;
var re = require('../re');

var ruleUtils = require('../rule_utils');

var LIFECYCLE_METHODS = {
	init: -1100,
	initializer: -1000,
	renderUI: -900,
	bindUI: -800,
	syncUI: -700,
	destructor: -600
};

var getCacheKey = function() {
	return Array.prototype.join.call(arguments, '_');
};

var getPropName = function(obj) {
	return obj.name || obj.value;
};

var isFunctionExpression = function(obj) {
	return obj.type === 'FunctionExpression';
};

var isLifecycle = _.memoize(
	function(propName, prevPropName) {
		return (LIFECYCLE_METHODS.hasOwnProperty(propName) || LIFECYCLE_METHODS.hasOwnProperty(prevPropName));
	},
	getCacheKey
);

var isMatchingCase = _.memoize(
	function(propName, prevPropName) {
		return isUpper(propName) === isUpper(prevPropName);
	},
	getCacheKey
);

var isMatchingType = function(item, prev) {
	return isFunctionExpression(prev.value) === isFunctionExpression(item.value);
};

var isPrivate = _.memoize(
	function(str) {
		return _.isString(str) && str.charAt(0) === '_';
	}
);

var RE_UPPER = /^[^a-z]+$/;

var isUpper = _.memoize(
	function(str) {
		return RE_UPPER.test(str);
	}
);

var naturalCompare = ruleUtils.naturalCompare;

module.exports = function(context) {
	var configuration = context.options[0] || {};
	var caseSensitive = configuration.casesensitive;

	var checkLifecyleSort = function(needsSort, propName, prevPropName, item, prev) {
		var customPropName = LIFECYCLE_METHODS[propName];
		var customPrevPropName = LIFECYCLE_METHODS[prevPropName];

		if (customPropName) {
			if (customPrevPropName) {
				needsSort = customPropName < customPrevPropName;
			}
			else {
				needsSort = (!isUpper(prevPropName) && isFunctionExpression(prev.value));
			}
		}

		return needsSort;
	};

	var checkRegPropSort = function(needsSort, propName, prevPropName, item, prev, caseSensitive) {
		var privateProp = isPrivate(propName);
		var privatePrevProp = isPrivate(prevPropName);

		needsSort = (privateProp === privatePrevProp) && isMatchingCase(propName, prevPropName) && naturalCompare(propName, prevPropName, !caseSensitive) === -1 && isMatchingType(item, prev);

		if (privateProp !== privatePrevProp && privatePrevProp && !privateProp) {
			needsSort = true;
		}

		if (needsSort && !isFunctionExpression(item.value)) {
			// Allow a set of properties to be grouped with an extra newline
			needsSort = (item.loc.start.line - prev.loc.end.line) < 2;
		}

		return needsSort;
	};

	var checkSort = function(propName, prevPropName, item, prev, caseSensitive) {
		var needsSort = false;

		if (isLifecycle(propName, prevPropName)) {
			needsSort = checkLifecyleSort(needsSort, propName, prevPropName, item, prev);
		}
		else {
			needsSort = checkRegPropSort(needsSort, propName, prevPropName, item, prev, caseSensitive);
		}

		if (re.REGEX_SERVICE_PROPS.test(propName) || re.REGEX_SERVICE_PROPS.test(prevPropName)) {
			needsSort = false;
		}

		return needsSort;
	};

	return {
		ObjectExpression: function(node) {
			var prev = null;

			node.properties.forEach(
				function(item, index, collection) {
					if (index > 0) {
						var key = item.key;
						var prevKey = prev.key;

						var propName = getPropName(key);
						var prevPropName = getPropName(prevKey);

						var needsSort = checkSort(propName, prevPropName, item, prev, caseSensitive);

						if (needsSort) {
							var note = isLifecycle(propName, prevPropName) ? ' (Lifecycle methods should come first)' : '';

							var message = base.sub('Sort properties: {0} {1}{2}', prevPropName, propName, note);

							context.report(item, message);
						}
					}

					prev = item;
				}
			);
		}
	};
};