"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
var node_emitter_1 = require("./node_emitter");
/**
 * Returns a transformer that adds the requested static methods specified by modules.
 */
function getAngularClassTransformerFactory(modules) {
    if (modules.length === 0) {
        // If no modules are specified, just return an identity transform.
        return function () { return function (sf) { return sf; }; };
    }
    var moduleMap = new Map(modules.map(function (m) { return [m.fileName, m]; }));
    return function (context) {
        return function (sourceFile) {
            var module = moduleMap.get(sourceFile.fileName);
            if (module) {
                var newSourceFile = node_emitter_1.updateSourceFile(sourceFile, module, context)[0];
                return newSourceFile;
            }
            return sourceFile;
        };
    };
}
exports.getAngularClassTransformerFactory = getAngularClassTransformerFactory;
//# sourceMappingURL=r3_transform.js.map