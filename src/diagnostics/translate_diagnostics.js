"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const api_1 = require("../transformers/api");
const util_1 = require("../transformers/util");
function translateDiagnostics(host, untranslatedDiagnostics) {
    const ts = [];
    const ng = [];
    untranslatedDiagnostics.forEach((diagnostic) => {
        if (diagnostic.file && diagnostic.start && util_1.GENERATED_FILES.test(diagnostic.file.fileName)) {
            // We need to filter out diagnostics about unused functions as
            // they are in fact referenced by nobody and only serve to surface
            // type check errors.
            if (diagnostic.code === /* ... is declared but never used */ 6133) {
                return;
            }
            const span = sourceSpanOf(host, diagnostic.file, diagnostic.start);
            if (span) {
                const fileName = span.start.file.url;
                ng.push({
                    messageText: diagnosticMessageToString(diagnostic.messageText),
                    category: diagnostic.category, span,
                    source: api_1.SOURCE,
                    code: api_1.DEFAULT_ERROR_CODE
                });
            }
        }
        else {
            ts.push(diagnostic);
        }
    });
    return { ts, ng };
}
exports.translateDiagnostics = translateDiagnostics;
function sourceSpanOf(host, source, start) {
    const { line, character } = ts.getLineAndCharacterOfPosition(source, start);
    return host.parseSourceSpanOf(source.fileName, line, character);
}
function diagnosticMessageToString(message) {
    return ts.flattenDiagnosticMessageText(message, '\n');
}
//# sourceMappingURL=translate_diagnostics.js.map