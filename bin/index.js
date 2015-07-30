#!/usr/bin/env node

var _ = require('lodash');
var updateNotifier = require('update-notifier');


var MAP_OMIT = {
	'$0': true,
	'_': true
};

var notifier = updateNotifier(
	{
		pkg: require('../package.json')
	}
);

if (notifier.update) {
	notifier.notify();
}

var argv = require('../lib/argv');

var flags = _.reduce(
	argv,
	function(res, item, index) {
		if (index.length > 1 && !MAP_OMIT[index]) {
			index = _.camelCase(index);

			res[index] = item;
		}

		return res;
	},
	{}
);

var CLI = require('cli-base').CLI;

new CLI({
	args: argv._,
	flags: flags
}).init();
