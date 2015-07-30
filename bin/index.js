#!/usr/bin/env node

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var updateNotifier = require('update-notifier');

var notifier = updateNotifier(
	{
		pkg: require('../package.json')
	}
);

if (notifier.update) {
	notifier.notify();
}

var CLI = require('cli-base').CLI;

var cliInstance = new CLI({
	formattersPath: path.join(__dirname, '../formatters'),
	options: {
		'display-raw': {
			boolean: true,
			default: false
		},
		l: {
			alias: 'lint',
			boolean: true,
			default: true
		},
		m: {
			alias: 'check-metadata',
			boolean: true,
			default: false
		},
		v: {
			alias: 'verbose',
			boolean: true,
			default: false
		}
	}
});

var hasModulesFile = function(fileDir) {
	return fs.existsSync(path.join(fileDir, 'modules.js'));
};

cliInstance.plug({
	afterProcess: function(done) {
		if (this._CHECK_META) {
			require('../lib/meta').check(
				{
					done: done,
					liferayModuleDir: this._liferayModuleDir,
					verbose: this.flags.verbose
				}
			);
		}
		else {
			done();
		}
	},
	processFile: function(file) {
		if (!this._CHECK_META && this.flags.checkMetadata && path.extname(file) === '.js') {
			var fileDir = path.dirname(path.resolve(file));

			if (path.basename(fileDir) === 'liferay' && hasModulesFile(fileDir)) {
				this._CHECK_META = true;
				this._liferayModuleDir = fileDir;
			}
		}
	}
});

cliInstance.init();
