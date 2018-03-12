"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const compiler_1 = require("@angular/compiler");
const ts = require("typescript");
const index_1 = require("../metadata/index");
class PartialModuleMetadataTransformer {
    constructor(modules) {
        this.moduleMap = new Map(modules.map(m => [m.fileName, m]));
    }
    start(sourceFile) {
        const partialModule = this.moduleMap.get(sourceFile.fileName);
        if (partialModule) {
            const classMap = new Map(partialModule.statements.filter(isClassStmt).map(s => [s.name, s]));
            if (classMap.size > 0) {
                return (value, node) => {
                    // For class metadata that is going to be transformed to have a static method ensure the
                    // metadata contains a static declaration the new static method.
                    if (index_1.isClassMetadata(value) && node.kind === ts.SyntaxKind.ClassDeclaration) {
                        const classDeclaration = node;
                        if (classDeclaration.name) {
                            const partialClass = classMap.get(classDeclaration.name.text);
                            if (partialClass) {
                                for (const field of partialClass.fields) {
                                    if (field.name && field.modifiers &&
                                        field.modifiers.some(modifier => modifier === compiler_1.StmtModifier.Static)) {
                                        value.statics = Object.assign({}, (value.statics || {}), { [field.name]: {} });
                                    }
                                }
                            }
                        }
                    }
                    return value;
                };
            }
        }
    }
}
exports.PartialModuleMetadataTransformer = PartialModuleMetadataTransformer;
function isClassStmt(v) {
    return v instanceof compiler_1.ClassStmt;
}
//# sourceMappingURL=r3_metadata_transform.js.map