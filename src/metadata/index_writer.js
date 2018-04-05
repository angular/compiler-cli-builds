"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const INDEX_HEADER = `/**
 * Generated bundle index. Do not edit.
 */
`;
function privateEntriesToIndex(index, privates) {
    const results = [INDEX_HEADER];
    // Export all of the index symbols.
    results.push(`export * from '${index}';`, '');
    // Simplify the exports
    const exports = new Map();
    for (const entry of privates) {
        let entries = exports.get(entry.module);
        if (!entries) {
            entries = [];
            exports.set(entry.module, entries);
        }
        entries.push(entry);
    }
    const compareEntries = compare((e) => e.name);
    const compareModules = compare((e) => e[0]);
    const orderedExports = Array.from(exports)
        .map(([module, entries]) => [module, entries.sort(compareEntries)])
        .sort(compareModules);
    for (const [module, entries] of orderedExports) {
        let symbols = entries.map(e => `${e.name} as ${e.privateName}`);
        results.push(`export {${symbols}} from '${module}';`);
    }
    return results.join('\n');
}
exports.privateEntriesToIndex = privateEntriesToIndex;
function compare(select) {
    return (a, b) => {
        const ak = select(a);
        const bk = select(b);
        return ak > bk ? 1 : ak < bk ? -1 : 0;
    };
}
//# sourceMappingURL=index_writer.js.map