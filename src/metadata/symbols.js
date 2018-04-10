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
class Symbols {
    constructor(sourceFile) {
        this.sourceFile = sourceFile;
        this.references = new Map();
    }
    resolve(name, preferReference) {
        return (preferReference && this.references.get(name)) || this.symbols.get(name);
    }
    define(name, value) { this.symbols.set(name, value); }
    defineReference(name, value) {
        this.references.set(name, value);
    }
    has(name) { return this.symbols.has(name); }
    get symbols() {
        let result = this._symbols;
        if (!result) {
            result = this._symbols = new Map();
            populateBuiltins(result);
            this.buildImports();
        }
        return result;
    }
    buildImports() {
        const symbols = this._symbols;
        // Collect the imported symbols into this.symbols
        const stripQuotes = (s) => s.replace(/^['"]|['"]$/g, '');
        const visit = (node) => {
            switch (node.kind) {
                case ts.SyntaxKind.ImportEqualsDeclaration:
                    const importEqualsDeclaration = node;
                    if (importEqualsDeclaration.moduleReference.kind ===
                        ts.SyntaxKind.ExternalModuleReference) {
                        const externalReference = importEqualsDeclaration.moduleReference;
                        if (externalReference.expression) {
                            // An `import <identifier> = require(<module-specifier>);
                            if (!externalReference.expression.parent) {
                                // The `parent` field of a node is set by the TypeScript binder (run as
                                // part of the type checker). Setting it here allows us to call `getText()`
                                // even if the `SourceFile` was not type checked (which looks for `SourceFile`
                                // in the parent chain). This doesn't damage the node as the binder unconditionally
                                // sets the parent.
                                externalReference.expression.parent = externalReference;
                                externalReference.parent = this.sourceFile;
                            }
                            const from = stripQuotes(externalReference.expression.getText());
                            symbols.set(importEqualsDeclaration.name.text, { __symbolic: 'reference', module: from });
                            break;
                        }
                    }
                    symbols.set(importEqualsDeclaration.name.text, { __symbolic: 'error', message: `Unsupported import syntax` });
                    break;
                case ts.SyntaxKind.ImportDeclaration:
                    const importDecl = node;
                    if (!importDecl.importClause) {
                        // An `import <module-specifier>` clause which does not bring symbols into scope.
                        break;
                    }
                    if (!importDecl.moduleSpecifier.parent) {
                        // See note above in the `ImportEqualDeclaration` case.
                        importDecl.moduleSpecifier.parent = importDecl;
                        importDecl.parent = this.sourceFile;
                    }
                    const from = stripQuotes(importDecl.moduleSpecifier.getText());
                    if (importDecl.importClause.name) {
                        // An `import <identifier> form <module-specifier>` clause. Record the default symbol.
                        symbols.set(importDecl.importClause.name.text, { __symbolic: 'reference', module: from, default: true });
                    }
                    const bindings = importDecl.importClause.namedBindings;
                    if (bindings) {
                        switch (bindings.kind) {
                            case ts.SyntaxKind.NamedImports:
                                // An `import { [<identifier> [, <identifier>] } from <module-specifier>` clause
                                for (const binding of bindings.elements) {
                                    symbols.set(binding.name.text, {
                                        __symbolic: 'reference',
                                        module: from,
                                        name: binding.propertyName ? binding.propertyName.text : binding.name.text
                                    });
                                }
                                break;
                            case ts.SyntaxKind.NamespaceImport:
                                // An `input * as <identifier> from <module-specifier>` clause.
                                symbols.set(bindings.name.text, { __symbolic: 'reference', module: from });
                                break;
                        }
                    }
                    break;
            }
            ts.forEachChild(node, visit);
        };
        if (this.sourceFile) {
            ts.forEachChild(this.sourceFile, visit);
        }
    }
}
exports.Symbols = Symbols;
function populateBuiltins(symbols) {
    // From lib.core.d.ts (all "define const")
    ['Object', 'Function', 'String', 'Number', 'Array', 'Boolean', 'Map', 'NaN', 'Infinity', 'Math',
        'Date', 'RegExp', 'Error', 'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError',
        'TypeError', 'URIError', 'JSON', 'ArrayBuffer', 'DataView', 'Int8Array', 'Uint8Array',
        'Uint8ClampedArray', 'Uint16Array', 'Int16Array', 'Int32Array', 'Uint32Array', 'Float32Array',
        'Float64Array']
        .forEach(name => symbols.set(name, { __symbolic: 'reference', name }));
}
//# sourceMappingURL=symbols.js.map