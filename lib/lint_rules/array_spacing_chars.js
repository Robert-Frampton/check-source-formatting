var base = require('cli-base').base;
var re = require('../re');

var isSingleLine = function(node) {
	return node.loc.start.line === node.loc.end.line;
};

module.exports = function(context) {
	return {
		ArrayExpression: function(node) {
			if (isSingleLine(node)) {
				var source = context.getSource(node);

				var tmpSource = source.replace(/(['"]).*?\1/g, '$1$1');

				if (re.REGEX_ARRAY_INTERNAL_SPACE.test(tmpSource)) {
					var missingSpaces = [];

					source.replace(
						re.REGEX_ARRAY_INTERNAL_SPACE,
						function(item, index, str) {
							missingSpaces.push(item.replace('\t', '\\t'));
						}
					);

					var message = base.sub('Array items should be separated by exactly one space:{0}', missingSpaces.join(''));

					context.report(node, message);
				}
			}
		}
	};
};