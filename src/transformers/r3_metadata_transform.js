"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var compiler_1 = require("@angular/compiler");
var ts = require("typescript");
var index_1 = require("../metadata/index");
var PartialModuleMetadataTransformer = /** @class */ (function () {
    function PartialModuleMetadataTransformer(modules) {
        this.moduleMap = new Map(modules.map(function (m) { return [m.fileName, m]; }));
    }
    PartialModuleMetadataTransformer.prototype.start = function (sourceFile) {
        var partialModule = this.moduleMap.get(sourceFile.fileName);
        if (partialModule) {
            var classMap_1 = new Map(partialModule.statements.filter(isClassStmt).map(function (s) { return [s.name, s]; }));
            if (classMap_1.size > 0) {
                return function (value, node) {
                    // For class metadata that is going to be transformed to have a static method ensure the
                    // metadata contains a static declaration the new static method.
                    if (index_1.isClassMetadata(value) && node.kind === ts.SyntaxKind.ClassDeclaration) {
                        var classDeclaration = node;
                        if (classDeclaration.name) {
                            var partialClass = classMap_1.get(classDeclaration.name.text);
                            if (partialClass) {
                                for (var _i = 0, _a = partialClass.fields; _i < _a.length; _i++) {
                                    var field = _a[_i];
                                    if (field.name && field.modifiers &&
                                        field.modifiers.some(function (modifier) { return modifier === compiler_1.StmtModifier.Static; })) {
                                        value.statics = __assign({}, (value.statics || {}), (_b = {}, _b[field.name] = {}, _b));
                                    }
                                }
                            }
                        }
                    }
                    return value;
                    var _b;
                };
            }
        }
    };
    return PartialModuleMetadataTransformer;
}());
exports.PartialModuleMetadataTransformer = PartialModuleMetadataTransformer;
function isClassStmt(v) {
    return v instanceof compiler_1.ClassStmt;
}
//# sourceMappingURL=r3_metadata_transform.js.map