const fs = require('fs');
const helper = require('./console-helper.js');

fs.lstat('./node_modules/oskari-frontend', (err, stats) => {
    if (err) {
        helper.oskariModuleNotFound();
        helper.exit(1);
    }
    const isEnabled = stats.isSymbolicLink();
    isEnabled ? helper.devModeEnabled() : helper.devModeDisabled();

    let expectEnabled = true;
    if (process.argv.length > 3) {
        helper.devModeCheckInvalidArgs();
        helper.exit(2);
    }
    const mode = process.argv[2] || 'check';
    if (mode !== 'enabled' && mode !== 'disabled' && mode !== 'check') {
        helper.devModeCheckInvalidArgs();
        helper.exit(3);
    }
    if (mode === 'check') {
        helper.exit();
    }
    expectEnabled = mode === 'enabled';
    if (expectEnabled !== isEnabled) {
        isEnabled ? helper.runInDevMode() : helper.runInNormalMode();
        helper.exit(4);
    }
});
