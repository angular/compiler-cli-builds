#!/usr/bin/env node
"use strict";
require('reflect-metadata');
const tsc = require('@angular/tsc-wrapped');
const extractor_1 = require('./extractor');
function extract(ngOptions, cliOptions, program, host) {
    return extractor_1.Extractor.create(ngOptions, program, host).extract(cliOptions.i18nFormat);
}
// Entry point
if (require.main === module) {
    const args = require('minimist')(process.argv.slice(2));
    const project = args.p || args.project || '.';
    const cliOptions = new tsc.I18nExtractionCliOptions(args);
    tsc.main(project, cliOptions, extract, { noEmit: true })
        .then((exitCode) => process.exit(exitCode))
        .catch((e) => {
        console.error(e.stack);
        console.error('Extraction failed');
        process.exit(1);
    });
}
//# sourceMappingURL=extract_i18n.js.map