(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/ngcc/src/dependencies/dependency_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isStringImportOrReexport = exports.hasImportOrReexportStatements = exports.EsmDependencyHost = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dependency_host");
    /**
     * Helper functions for computing dependencies.
     */
    var EsmDependencyHost = /** @class */ (function (_super) {
        tslib_1.__extends(EsmDependencyHost, _super);
        function EsmDependencyHost() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            // By skipping trivia here we don't have to account for it in the processing below
            // It has no relevance to capturing imports.
            _this.scanner = ts.createScanner(ts.ScriptTarget.Latest, /* skipTrivia */ true);
            return _this;
        }
        EsmDependencyHost.prototype.canSkipFile = function (fileContents) {
            return !hasImportOrReexportStatements(fileContents);
        };
        /**
         * Extract any import paths from imports found in the contents of this file.
         *
         * This implementation uses the TypeScript scanner, which tokenizes source code,
         * to process the string. This is halfway between working with the string directly,
         * which is too difficult due to corner cases, and parsing the string into a full
         * TypeScript Abstract Syntax Tree (AST), which ends up doing more processing than
         * is needed.
         *
         * The scanning is not trivial because we must hold state between each token since
         * the context of the token affects how it should be scanned, and the scanner does
         * not manage this for us.
         *
         * Specifically, backticked strings are particularly challenging since it is possible
         * to recursively nest backticks and TypeScript expressions within each other.
         */
        EsmDependencyHost.prototype.extractImports = function (file, fileContents) {
            var imports = new Set();
            var templateStack = [];
            var lastToken = ts.SyntaxKind.Unknown;
            var currentToken = ts.SyntaxKind.Unknown;
            this.scanner.setText(fileContents);
            while ((currentToken = this.scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
                switch (currentToken) {
                    case ts.SyntaxKind.TemplateHead:
                        // TemplateHead indicates the beginning of a backticked string
                        // Capture this in the `templateStack` to indicate we are currently processing
                        // within the static text part of a backticked string.
                        templateStack.push(currentToken);
                        break;
                    case ts.SyntaxKind.OpenBraceToken:
                        if (templateStack.length > 0) {
                            // We are processing a backticked string. This indicates that we are either
                            // entering an interpolation expression or entering an object literal expression.
                            // We add it to the `templateStack` so we can track when we leave the interpolation or
                            // object literal.
                            templateStack.push(currentToken);
                        }
                        break;
                    case ts.SyntaxKind.CloseBraceToken:
                        if (templateStack.length > 0) {
                            // We are processing a backticked string then this indicates that we are either
                            // leaving an interpolation expression or leaving an object literal expression.
                            var templateToken = templateStack[templateStack.length - 1];
                            if (templateToken === ts.SyntaxKind.TemplateHead) {
                                // We have hit a nested backticked string so we need to rescan it in that context
                                currentToken = this.scanner.reScanTemplateToken(/* isTaggedTemplate */ false);
                                if (currentToken === ts.SyntaxKind.TemplateTail) {
                                    // We got to the end of the backticked string so pop the token that started it off
                                    // the stack.
                                    templateStack.pop();
                                }
                            }
                            else {
                                // We hit the end of an object-literal expression so pop the open-brace that started
                                // it off the stack.
                                templateStack.pop();
                            }
                        }
                        break;
                    case ts.SyntaxKind.SlashToken:
                    case ts.SyntaxKind.SlashEqualsToken:
                        if (canPrecedeARegex(lastToken)) {
                            // We have hit a slash (`/`) in a context where it could be the start of a regular
                            // expression so rescan it in that context
                            currentToken = this.scanner.reScanSlashToken();
                        }
                        break;
                    case ts.SyntaxKind.ImportKeyword:
                        var importPath = this.extractImportPath();
                        if (importPath !== null) {
                            imports.add(importPath);
                        }
                        break;
                    case ts.SyntaxKind.ExportKeyword:
                        var reexportPath = this.extractReexportPath();
                        if (reexportPath !== null) {
                            imports.add(reexportPath);
                        }
                        break;
                }
                lastToken = currentToken;
            }
            // Clear the text from the scanner to avoid holding on to potentially large strings of source
            // content after the scanning has completed.
            this.scanner.setText('');
            return imports;
        };
        /**
         * We have found an `import` token so now try to identify the import path.
         *
         * This method will use the current state of `this.scanner` to extract a string literal module
         * specifier. It expects that the current state of the scanner is that an `import` token has just
         * been scanned.
         *
         * The following forms of import are matched:
         *
         * * `import "module-specifier";`
         * * `import("module-specifier")`
         * * `import defaultBinding from "module-specifier";`
         * * `import defaultBinding, * as identifier from "module-specifier";`
         * * `import defaultBinding, {...} from "module-specifier";`
         * * `import * as identifier from "module-specifier";`
         * * `import {...} from "module-specifier";`
         *
         * @returns the import path or null if there is no import or it is not a string literal.
         */
        EsmDependencyHost.prototype.extractImportPath = function () {
            // Check for side-effect import
            var sideEffectImportPath = this.tryStringLiteral();
            if (sideEffectImportPath !== null) {
                return sideEffectImportPath;
            }
            var kind = this.scanner.getToken();
            // Check for dynamic import expression
            if (kind === ts.SyntaxKind.OpenParenToken) {
                return this.tryStringLiteral();
            }
            // Check for defaultBinding
            if (kind === ts.SyntaxKind.Identifier) {
                // Skip default binding
                kind = this.scanner.scan();
                if (kind === ts.SyntaxKind.CommaToken) {
                    // Skip comma that indicates additional import bindings
                    kind = this.scanner.scan();
                }
            }
            // Check for namespace import clause
            if (kind === ts.SyntaxKind.AsteriskToken) {
                kind = this.skipNamespacedClause();
                if (kind === null) {
                    return null;
                }
            }
            // Check for named imports clause
            else if (kind === ts.SyntaxKind.OpenBraceToken) {
                kind = this.skipNamedClause();
            }
            // Expect a `from` clause, if not bail out
            if (kind !== ts.SyntaxKind.FromKeyword) {
                return null;
            }
            return this.tryStringLiteral();
        };
        /**
         * We have found an `export` token so now try to identify a re-export path.
         *
         * This method will use the current state of `this.scanner` to extract a string literal module
         * specifier. It expects that the current state of the scanner is that an `export` token has
         * just been scanned.
         *
         * There are three forms of re-export that are matched:
         *
         * * `export * from '...';
         * * `export * as alias from '...';
         * * `export {...} from '...';
         */
        EsmDependencyHost.prototype.extractReexportPath = function () {
            // Skip the `export` keyword
            var token = this.scanner.scan();
            if (token === ts.SyntaxKind.AsteriskToken) {
                token = this.skipNamespacedClause();
                if (token === null) {
                    return null;
                }
            }
            else if (token === ts.SyntaxKind.OpenBraceToken) {
                token = this.skipNamedClause();
            }
            // Expect a `from` clause, if not bail out
            if (token !== ts.SyntaxKind.FromKeyword) {
                return null;
            }
            return this.tryStringLiteral();
        };
        EsmDependencyHost.prototype.skipNamespacedClause = function () {
            // Skip past the `*`
            var token = this.scanner.scan();
            // Check for a `* as identifier` alias clause
            if (token === ts.SyntaxKind.AsKeyword) {
                // Skip past the `as` keyword
                token = this.scanner.scan();
                // Expect an identifier, if not bail out
                if (token !== ts.SyntaxKind.Identifier) {
                    return null;
                }
                // Skip past the identifier
                token = this.scanner.scan();
            }
            return token;
        };
        EsmDependencyHost.prototype.skipNamedClause = function () {
            var braceCount = 1;
            // Skip past the initial opening brace `{`
            var token = this.scanner.scan();
            // Search for the matching closing brace `}`
            while (braceCount > 0 && token !== ts.SyntaxKind.EndOfFileToken) {
                if (token === ts.SyntaxKind.OpenBraceToken) {
                    braceCount++;
                }
                else if (token === ts.SyntaxKind.CloseBraceToken) {
                    braceCount--;
                }
                token = this.scanner.scan();
            }
            return token;
        };
        EsmDependencyHost.prototype.tryStringLiteral = function () {
            return this.scanner.scan() === ts.SyntaxKind.StringLiteral ? this.scanner.getTokenValue() :
                null;
        };
        return EsmDependencyHost;
    }(dependency_host_1.DependencyHostBase));
    exports.EsmDependencyHost = EsmDependencyHost;
    /**
     * Check whether a source file needs to be parsed for imports.
     * This is a performance short-circuit, which saves us from creating
     * a TypeScript AST unnecessarily.
     *
     * @param source The content of the source file to check.
     *
     * @returns false if there are definitely no import or re-export statements
     * in this file, true otherwise.
     */
    function hasImportOrReexportStatements(source) {
        return /(?:import|export)[\s\S]+?(["'])(?:(?:\\\1|.)*?)\1/.test(source);
    }
    exports.hasImportOrReexportStatements = hasImportOrReexportStatements;
    /**
     * Check whether the given statement is an import with a string literal module specifier.
     * @param stmt the statement node to check.
     * @returns true if the statement is an import with a string literal module specifier.
     */
    function isStringImportOrReexport(stmt) {
        return ts.isImportDeclaration(stmt) ||
            ts.isExportDeclaration(stmt) && !!stmt.moduleSpecifier &&
                ts.isStringLiteral(stmt.moduleSpecifier);
    }
    exports.isStringImportOrReexport = isStringImportOrReexport;
    function canPrecedeARegex(kind) {
        switch (kind) {
            case ts.SyntaxKind.Identifier:
            case ts.SyntaxKind.StringLiteral:
            case ts.SyntaxKind.NumericLiteral:
            case ts.SyntaxKind.BigIntLiteral:
            case ts.SyntaxKind.RegularExpressionLiteral:
            case ts.SyntaxKind.ThisKeyword:
            case ts.SyntaxKind.PlusPlusToken:
            case ts.SyntaxKind.MinusMinusToken:
            case ts.SyntaxKind.CloseParenToken:
            case ts.SyntaxKind.CloseBracketToken:
            case ts.SyntaxKind.CloseBraceToken:
            case ts.SyntaxKind.TrueKeyword:
            case ts.SyntaxKind.FalseKeyword:
                return false;
            default:
                return true;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtX2RlcGVuZGVuY3lfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9kZXBlbmRlbmNpZXMvZXNtX2RlcGVuZGVuY3lfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLCtGQUFxRDtJQUVyRDs7T0FFRztJQUNIO1FBQXVDLDZDQUFrQjtRQUF6RDtZQUFBLHFFQXlPQztZQXhPQyxrRkFBa0Y7WUFDbEYsNENBQTRDO1lBQ3BDLGFBQU8sR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDOztRQXNPcEYsQ0FBQztRQXBPVyx1Q0FBVyxHQUFyQixVQUFzQixZQUFvQjtZQUN4QyxPQUFPLENBQUMsNkJBQTZCLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUVEOzs7Ozs7Ozs7Ozs7Ozs7V0FlRztRQUNPLDBDQUFjLEdBQXhCLFVBQXlCLElBQW9CLEVBQUUsWUFBb0I7WUFDakUsSUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztZQUNsQyxJQUFNLGFBQWEsR0FBb0IsRUFBRSxDQUFDO1lBQzFDLElBQUksU0FBUyxHQUFrQixFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQztZQUNyRCxJQUFJLFlBQVksR0FBa0IsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7WUFFeEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFbkMsT0FBTyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUU7Z0JBQzVF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LENBQUMsZUFBZSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUxELDREQUtDO0lBR0QsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFtQjtRQUMzQyxRQUFRLElBQUksRUFBRTtZQUNaLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7WUFDOUIsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztZQUNqQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDO1lBQ2xDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUM7WUFDakMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDO1lBQzVDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDL0IsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztZQUNqQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDO1lBQ25DLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUM7WUFDbkMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDO1lBQ3JDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUM7WUFDbkMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUMvQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWTtnQkFDN0IsT0FBTyxLQUFLLENBQUM7WUFDZjtnQkFDRSxPQUFPLElBQUksQ0FBQztTQUNmO0lBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEZXBlbmRlbmN5SG9zdEJhc2V9IGZyb20gJy4vZGVwZW5kZW5jeV9ob3N0JztcblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb25zIGZvciBjb21wdXRpbmcgZGVwZW5kZW5jaWVzLlxuICovXG5leHBvcnQgY2xhc3MgRXNtRGVwZW5kZW5jeUhvc3QgZXh0ZW5kcyBEZXBlbmRlbmN5SG9zdEJhc2Uge1xuICAvLyBCeSBza2lwcGluZyB0cml2aWEgaGVyZSB3ZSBkb24ndCBoYXZlIHRvIGFjY291bnQgZm9yIGl0IGluIHRoZSBwcm9jZXNzaW5nIGJlbG93XG4gIC8vIEl0IGhhcyBubyByZWxldmFuY2UgdG8gY2FwdHVyaW5nIGltcG9ydHMuXG4gIHByaXZhdGUgc2Nhbm5lciA9IHRzLmNyZWF0ZVNjYW5uZXIodHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgLyogc2tpcFRyaXZpYSAqLyB0cnVlKTtcblxuICBwcm90ZWN0ZWQgY2FuU2tpcEZpbGUoZmlsZUNvbnRlbnRzOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIWhhc0ltcG9ydE9yUmVleHBvcnRTdGF0ZW1lbnRzKGZpbGVDb250ZW50cyk7XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdCBhbnkgaW1wb3J0IHBhdGhzIGZyb20gaW1wb3J0cyBmb3VuZCBpbiB0aGUgY29udGVudHMgb2YgdGhpcyBmaWxlLlxuICAgKlxuICAgKiBUaGlzIGltcGxlbWVudGF0aW9uIHVzZXMgdGhlIFR5cGVTY3JpcHQgc2Nhbm5lciwgd2hpY2ggdG9rZW5pemVzIHNvdXJjZSBjb2RlLFxuICAgKiB0byBwcm9jZXNzIHRoZSBzdHJpbmcuIFRoaXMgaXMgaGFsZndheSBiZXR3ZWVuIHdvcmtpbmcgd2l0aCB0aGUgc3RyaW5nIGRpcmVjdGx5LFxuICAgKiB3aGljaCBpcyB0b28gZGlmZmljdWx0IGR1ZSB0byBjb3JuZXIgY2FzZXMsIGFuZCBwYXJzaW5nIHRoZSBzdHJpbmcgaW50byBhIGZ1bGxcbiAgICogVHlwZVNjcmlwdCBBYnN0cmFjdCBTeW50YXggVHJlZSAoQVNUKSwgd2hpY2ggZW5kcyB1cCBkb2luZyBtb3JlIHByb2Nlc3NpbmcgdGhhblxuICAgKiBpcyBuZWVkZWQuXG4gICAqXG4gICAqIFRoZSBzY2FubmluZyBpcyBub3QgdHJpdmlhbCBiZWNhdXNlIHdlIG11c3QgaG9sZCBzdGF0ZSBiZXR3ZWVuIGVhY2ggdG9rZW4gc2luY2VcbiAgICogdGhlIGNvbnRleHQgb2YgdGhlIHRva2VuIGFmZmVjdHMgaG93IGl0IHNob3VsZCBiZSBzY2FubmVkLCBhbmQgdGhlIHNjYW5uZXIgZG9lc1xuICAgKiBub3QgbWFuYWdlIHRoaXMgZm9yIHVzLlxuICAgKlxuICAgKiBTcGVjaWZpY2FsbHksIGJhY2t0aWNrZWQgc3RyaW5ncyBhcmUgcGFydGljdWxhcmx5IGNoYWxsZW5naW5nIHNpbmNlIGl0IGlzIHBvc3NpYmxlXG4gICAqIHRvIHJlY3Vyc2l2ZWx5IG5lc3QgYmFja3RpY2tzIGFuZCBUeXBlU2NyaXB0IGV4cHJlc3Npb25zIHdpdGhpbiBlYWNoIG90aGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGV4dHJhY3RJbXBvcnRzKGZpbGU6IEFic29sdXRlRnNQYXRoLCBmaWxlQ29udGVudHM6IHN0cmluZyk6IFNldDxzdHJpbmc+IHtcbiAgICBjb25zdCBpbXBvcnRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgdGVtcGxhdGVTdGFjazogdHMuU3ludGF4S2luZFtdID0gW107XG4gICAgbGV0IGxhc3RUb2tlbjogdHMuU3ludGF4S2luZCA9IHRzLlN5bnRheEtpbmQuVW5rbm93bjtcbiAgICBsZXQgY3VycmVudFRva2VuOiB0cy5TeW50YXhLaW5kID0gdHMuU3ludGF4S2luZC5Vbmtub3duO1xuXG4gICAgdGhpcy5zY2FubmVyLnNldFRleHQoZmlsZUNvbnRlbnRzKTtcblxuICAgIHdoaWxlICgoY3VycmVudFRva2VuID0gdGhpcy5zY2FubmVyLnNjYW4oKSkgIT09IHRzLlN5bnRheEtpbmQuRW5kT2ZGaWxlVG9rZW4pIHtcbiAgICAgIHN3aXRjaCAoY3VycmVudFRva2VuKSB7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5UZW1wbGF0ZUhlYWQ6XG4gICAgICAgICAgLy8gVGVtcGxhdGVIZWFkIGluZGljYXRlcyB0aGUgYmVnaW5uaW5nIG9mIGEgYmFja3RpY2tlZCBzdHJpbmdcbiAgICAgICAgICAvLyBDYXB0dXJlIHRoaXMgaW4gdGhlIGB0ZW1wbGF0ZVN0YWNrYCB0byBpbmRpY2F0ZSB3ZSBhcmUgY3VycmVudGx5IHByb2Nlc3NpbmdcbiAgICAgICAgICAvLyB3aXRoaW4gdGhlIHN0YXRpYyB0ZXh0IHBhcnQgb2YgYSBiYWNrdGlja2VkIHN0cmluZy5cbiAgICAgICAgICB0ZW1wbGF0ZVN0YWNrLnB1c2goY3VycmVudFRva2VuKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLk9wZW5CcmFjZVRva2VuOlxuICAgICAgICAgIGlmICh0ZW1wbGF0ZVN0YWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIFdlIGFyZSBwcm9jZXNzaW5nIGEgYmFja3RpY2tlZCBzdHJpbmcuIFRoaXMgaW5kaWNhdGVzIHRoYXQgd2UgYXJlIGVpdGhlclxuICAgICAgICAgICAgLy8gZW50ZXJpbmcgYW4gaW50ZXJwb2xhdGlvbiBleHByZXNzaW9uIG9yIGVudGVyaW5nIGFuIG9iamVjdCBsaXRlcmFsIGV4cHJlc3Npb24uXG4gICAgICAgICAgICAvLyBXZSBhZGQgaXQgdG8gdGhlIGB0ZW1wbGF0ZVN0YWNrYCBzbyB3ZSBjYW4gdHJhY2sgd2hlbiB3ZSBsZWF2ZSB0aGUgaW50ZXJwb2xhdGlvbiBvclxuICAgICAgICAgICAgLy8gb2JqZWN0IGxpdGVyYWwuXG4gICAgICAgICAgICB0ZW1wbGF0ZVN0YWNrLnB1c2goY3VycmVudFRva2VuKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5DbG9zZUJyYWNlVG9rZW46XG4gICAgICAgICAgaWYgKHRlbXBsYXRlU3RhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gV2UgYXJlIHByb2Nlc3NpbmcgYSBiYWNrdGlja2VkIHN0cmluZyB0aGVuIHRoaXMgaW5kaWNhdGVzIHRoYXQgd2UgYXJlIGVpdGhlclxuICAgICAgICAgICAgLy8gbGVhdmluZyBhbiBpbnRlcnBvbGF0aW9uIGV4cHJlc3Npb24gb3IgbGVhdmluZyBhbiBvYmplY3QgbGl0ZXJhbCBleHByZXNzaW9uLlxuICAgICAgICAgICAgY29uc3QgdGVtcGxhdGVUb2tlbiA9IHRlbXBsYXRlU3RhY2tbdGVtcGxhdGVTdGFjay5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZVRva2VuID09PSB0cy5TeW50YXhLaW5kLlRlbXBsYXRlSGVhZCkge1xuICAgICAgICAgICAgICAvLyBXZSBoYXZlIGhpdCBhIG5lc3RlZCBiYWNrdGlja2VkIHN0cmluZyBzbyB3ZSBuZWVkIHRvIHJlc2NhbiBpdCBpbiB0aGF0IGNvbnRleHRcbiAgICAgICAgICAgICAgY3VycmVudFRva2VuID0gdGhpcy5zY2FubmVyLnJlU2NhblRlbXBsYXRlVG9rZW4oLyogaXNUYWdnZWRUZW1wbGF0ZSAqLyBmYWxzZSk7XG4gICAgICAgICAgICAgIGlmIChjdXJyZW50VG9rZW4gPT09IHRzLlN5bnRheEtpbmQuVGVtcGxhdGVUYWlsKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgZ290IHRvIHRoZSBlbmQgb2YgdGhlIGJhY2t0aWNrZWQgc3RyaW5nIHNvIHBvcCB0aGUgdG9rZW4gdGhhdCBzdGFydGVkIGl0IG9mZlxuICAgICAgICAgICAgICAgIC8vIHRoZSBzdGFjay5cbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBXZSBoaXQgdGhlIGVuZCBvZiBhbiBvYmplY3QtbGl0ZXJhbCBleHByZXNzaW9uIHNvIHBvcCB0aGUgb3Blbi1icmFjZSB0aGF0IHN0YXJ0ZWRcbiAgICAgICAgICAgICAgLy8gaXQgb2ZmIHRoZSBzdGFjay5cbiAgICAgICAgICAgICAgdGVtcGxhdGVTdGFjay5wb3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5TbGFzaFRva2VuOlxuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuU2xhc2hFcXVhbHNUb2tlbjpcbiAgICAgICAgICBpZiAoY2FuUHJlY2VkZUFSZWdleChsYXN0VG9rZW4pKSB7XG4gICAgICAgICAgICAvLyBXZSBoYXZlIGhpdCBhIHNsYXNoIChgL2ApIGluIGEgY29udGV4dCB3aGVyZSBpdCBjb3VsZCBiZSB0aGUgc3RhcnQgb2YgYSByZWd1bGFyXG4gICAgICAgICAgICAvLyBleHByZXNzaW9uIHNvIHJlc2NhbiBpdCBpbiB0aGF0IGNvbnRleHRcbiAgICAgICAgICAgIGN1cnJlbnRUb2tlbiA9IHRoaXMuc2Nhbm5lci5yZVNjYW5TbGFzaFRva2VuKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuSW1wb3J0S2V5d29yZDpcbiAgICAgICAgICBjb25zdCBpbXBvcnRQYXRoID0gdGhpcy5leHRyYWN0SW1wb3J0UGF0aCgpO1xuICAgICAgICAgIGlmIChpbXBvcnRQYXRoICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpbXBvcnRzLmFkZChpbXBvcnRQYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkOlxuICAgICAgICAgIGNvbnN0IHJlZXhwb3J0UGF0aCA9IHRoaXMuZXh0cmFjdFJlZXhwb3J0UGF0aCgpO1xuICAgICAgICAgIGlmIChyZWV4cG9ydFBhdGggIT09IG51bGwpIHtcbiAgICAgICAgICAgIGltcG9ydHMuYWRkKHJlZXhwb3J0UGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgbGFzdFRva2VuID0gY3VycmVudFRva2VuO1xuICAgIH1cblxuICAgIC8vIENsZWFyIHRoZSB0ZXh0IGZyb20gdGhlIHNjYW5uZXIgdG8gYXZvaWQgaG9sZGluZyBvbiB0byBwb3RlbnRpYWxseSBsYXJnZSBzdHJpbmdzIG9mIHNvdXJjZVxuICAgIC8vIGNvbnRlbnQgYWZ0ZXIgdGhlIHNjYW5uaW5nIGhhcyBjb21wbGV0ZWQuXG4gICAgdGhpcy5zY2FubmVyLnNldFRleHQoJycpO1xuXG4gICAgcmV0dXJuIGltcG9ydHM7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBXZSBoYXZlIGZvdW5kIGFuIGBpbXBvcnRgIHRva2VuIHNvIG5vdyB0cnkgdG8gaWRlbnRpZnkgdGhlIGltcG9ydCBwYXRoLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCB3aWxsIHVzZSB0aGUgY3VycmVudCBzdGF0ZSBvZiBgdGhpcy5zY2FubmVyYCB0byBleHRyYWN0IGEgc3RyaW5nIGxpdGVyYWwgbW9kdWxlXG4gICAqIHNwZWNpZmllci4gSXQgZXhwZWN0cyB0aGF0IHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBzY2FubmVyIGlzIHRoYXQgYW4gYGltcG9ydGAgdG9rZW4gaGFzIGp1c3RcbiAgICogYmVlbiBzY2FubmVkLlxuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGZvcm1zIG9mIGltcG9ydCBhcmUgbWF0Y2hlZDpcbiAgICpcbiAgICogKiBgaW1wb3J0IFwibW9kdWxlLXNwZWNpZmllclwiO2BcbiAgICogKiBgaW1wb3J0KFwibW9kdWxlLXNwZWNpZmllclwiKWBcbiAgICogKiBgaW1wb3J0IGRlZmF1bHRCaW5kaW5nIGZyb20gXCJtb2R1bGUtc3BlY2lmaWVyXCI7YFxuICAgKiAqIGBpbXBvcnQgZGVmYXVsdEJpbmRpbmcsICogYXMgaWRlbnRpZmllciBmcm9tIFwibW9kdWxlLXNwZWNpZmllclwiO2BcbiAgICogKiBgaW1wb3J0IGRlZmF1bHRCaW5kaW5nLCB7Li4ufSBmcm9tIFwibW9kdWxlLXNwZWNpZmllclwiO2BcbiAgICogKiBgaW1wb3J0ICogYXMgaWRlbnRpZmllciBmcm9tIFwibW9kdWxlLXNwZWNpZmllclwiO2BcbiAgICogKiBgaW1wb3J0IHsuLi59IGZyb20gXCJtb2R1bGUtc3BlY2lmaWVyXCI7YFxuICAgKlxuICAgKiBAcmV0dXJucyB0aGUgaW1wb3J0IHBhdGggb3IgbnVsbCBpZiB0aGVyZSBpcyBubyBpbXBvcnQgb3IgaXQgaXMgbm90IGEgc3RyaW5nIGxpdGVyYWwuXG4gICAqL1xuICBwcm90ZWN0ZWQgZXh0cmFjdEltcG9ydFBhdGgoKTogc3RyaW5nfG51bGwge1xuICAgIC8vIENoZWNrIGZvciBzaWRlLWVmZmVjdCBpbXBvcnRcbiAgICBsZXQgc2lkZUVmZmVjdEltcG9ydFBhdGggPSB0aGlzLnRyeVN0cmluZ0xpdGVyYWwoKTtcbiAgICBpZiAoc2lkZUVmZmVjdEltcG9ydFBhdGggIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBzaWRlRWZmZWN0SW1wb3J0UGF0aDtcbiAgICB9XG5cbiAgICBsZXQga2luZDogdHMuU3ludGF4S2luZHxudWxsID0gdGhpcy5zY2FubmVyLmdldFRva2VuKCk7XG5cbiAgICAvLyBDaGVjayBmb3IgZHluYW1pYyBpbXBvcnQgZXhwcmVzc2lvblxuICAgIGlmIChraW5kID09PSB0cy5TeW50YXhLaW5kLk9wZW5QYXJlblRva2VuKSB7XG4gICAgICByZXR1cm4gdGhpcy50cnlTdHJpbmdMaXRlcmFsKCk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGRlZmF1bHRCaW5kaW5nXG4gICAgaWYgKGtpbmQgPT09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcikge1xuICAgICAgLy8gU2tpcCBkZWZhdWx0IGJpbmRpbmdcbiAgICAgIGtpbmQgPSB0aGlzLnNjYW5uZXIuc2NhbigpO1xuICAgICAgaWYgKGtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ29tbWFUb2tlbikge1xuICAgICAgICAvLyBTa2lwIGNvbW1hIHRoYXQgaW5kaWNhdGVzIGFkZGl0aW9uYWwgaW1wb3J0IGJpbmRpbmdzXG4gICAgICAgIGtpbmQgPSB0aGlzLnNjYW5uZXIuc2NhbigpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBuYW1lc3BhY2UgaW1wb3J0IGNsYXVzZVxuICAgIGlmIChraW5kID09PSB0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW4pIHtcbiAgICAgIGtpbmQgPSB0aGlzLnNraXBOYW1lc3BhY2VkQ2xhdXNlKCk7XG4gICAgICBpZiAoa2luZCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQ2hlY2sgZm9yIG5hbWVkIGltcG9ydHMgY2xhdXNlXG4gICAgZWxzZSBpZiAoa2luZCA9PT0gdHMuU3ludGF4S2luZC5PcGVuQnJhY2VUb2tlbikge1xuICAgICAga2luZCA9IHRoaXMuc2tpcE5hbWVkQ2xhdXNlKCk7XG4gICAgfVxuXG4gICAgLy8gRXhwZWN0IGEgYGZyb21gIGNsYXVzZSwgaWYgbm90IGJhaWwgb3V0XG4gICAgaWYgKGtpbmQgIT09IHRzLlN5bnRheEtpbmQuRnJvbUtleXdvcmQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnRyeVN0cmluZ0xpdGVyYWwoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXZSBoYXZlIGZvdW5kIGFuIGBleHBvcnRgIHRva2VuIHNvIG5vdyB0cnkgdG8gaWRlbnRpZnkgYSByZS1leHBvcnQgcGF0aC5cbiAgICpcbiAgICogVGhpcyBtZXRob2Qgd2lsbCB1c2UgdGhlIGN1cnJlbnQgc3RhdGUgb2YgYHRoaXMuc2Nhbm5lcmAgdG8gZXh0cmFjdCBhIHN0cmluZyBsaXRlcmFsIG1vZHVsZVxuICAgKiBzcGVjaWZpZXIuIEl0IGV4cGVjdHMgdGhhdCB0aGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgc2Nhbm5lciBpcyB0aGF0IGFuIGBleHBvcnRgIHRva2VuIGhhc1xuICAgKiBqdXN0IGJlZW4gc2Nhbm5lZC5cbiAgICpcbiAgICogVGhlcmUgYXJlIHRocmVlIGZvcm1zIG9mIHJlLWV4cG9ydCB0aGF0IGFyZSBtYXRjaGVkOlxuICAgKlxuICAgKiAqIGBleHBvcnQgKiBmcm9tICcuLi4nO1xuICAgKiAqIGBleHBvcnQgKiBhcyBhbGlhcyBmcm9tICcuLi4nO1xuICAgKiAqIGBleHBvcnQgey4uLn0gZnJvbSAnLi4uJztcbiAgICovXG4gIHByb3RlY3RlZCBleHRyYWN0UmVleHBvcnRQYXRoKCk6IHN0cmluZ3xudWxsIHtcbiAgICAvLyBTa2lwIHRoZSBgZXhwb3J0YCBrZXl3b3JkXG4gICAgbGV0IHRva2VuOiB0cy5TeW50YXhLaW5kfG51bGwgPSB0aGlzLnNjYW5uZXIuc2NhbigpO1xuICAgIGlmICh0b2tlbiA9PT0gdHMuU3ludGF4S2luZC5Bc3Rlcmlza1Rva2VuKSB7XG4gICAgICB0b2tlbiA9IHRoaXMuc2tpcE5hbWVzcGFjZWRDbGF1c2UoKTtcbiAgICAgIGlmICh0b2tlbiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRva2VuID09PSB0cy5TeW50YXhLaW5kLk9wZW5CcmFjZVRva2VuKSB7XG4gICAgICB0b2tlbiA9IHRoaXMuc2tpcE5hbWVkQ2xhdXNlKCk7XG4gICAgfVxuICAgIC8vIEV4cGVjdCBhIGBmcm9tYCBjbGF1c2UsIGlmIG5vdCBiYWlsIG91dFxuICAgIGlmICh0b2tlbiAhPT0gdHMuU3ludGF4S2luZC5Gcm9tS2V5d29yZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnRyeVN0cmluZ0xpdGVyYWwoKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBza2lwTmFtZXNwYWNlZENsYXVzZSgpOiB0cy5TeW50YXhLaW5kfG51bGwge1xuICAgIC8vIFNraXAgcGFzdCB0aGUgYCpgXG4gICAgbGV0IHRva2VuID0gdGhpcy5zY2FubmVyLnNjYW4oKTtcbiAgICAvLyBDaGVjayBmb3IgYSBgKiBhcyBpZGVudGlmaWVyYCBhbGlhcyBjbGF1c2VcbiAgICBpZiAodG9rZW4gPT09IHRzLlN5bnRheEtpbmQuQXNLZXl3b3JkKSB7XG4gICAgICAvLyBTa2lwIHBhc3QgdGhlIGBhc2Aga2V5d29yZFxuICAgICAgdG9rZW4gPSB0aGlzLnNjYW5uZXIuc2NhbigpO1xuICAgICAgLy8gRXhwZWN0IGFuIGlkZW50aWZpZXIsIGlmIG5vdCBiYWlsIG91dFxuICAgICAgaWYgKHRva2VuICE9PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICAvLyBTa2lwIHBhc3QgdGhlIGlkZW50aWZpZXJcbiAgICAgIHRva2VuID0gdGhpcy5zY2FubmVyLnNjYW4oKTtcbiAgICB9XG4gICAgcmV0dXJuIHRva2VuO1xuICB9XG5cbiAgcHJvdGVjdGVkIHNraXBOYW1lZENsYXVzZSgpOiB0cy5TeW50YXhLaW5kIHtcbiAgICBsZXQgYnJhY2VDb3VudCA9IDE7XG4gICAgLy8gU2tpcCBwYXN0IHRoZSBpbml0aWFsIG9wZW5pbmcgYnJhY2UgYHtgXG4gICAgbGV0IHRva2VuID0gdGhpcy5zY2FubmVyLnNjYW4oKTtcbiAgICAvLyBTZWFyY2ggZm9yIHRoZSBtYXRjaGluZyBjbG9zaW5nIGJyYWNlIGB9YFxuICAgIHdoaWxlIChicmFjZUNvdW50ID4gMCAmJiB0b2tlbiAhPT0gdHMuU3ludGF4S2luZC5FbmRPZkZpbGVUb2tlbikge1xuICAgICAgaWYgKHRva2VuID09PSB0cy5TeW50YXhLaW5kLk9wZW5CcmFjZVRva2VuKSB7XG4gICAgICAgIGJyYWNlQ291bnQrKztcbiAgICAgIH0gZWxzZSBpZiAodG9rZW4gPT09IHRzLlN5bnRheEtpbmQuQ2xvc2VCcmFjZVRva2VuKSB7XG4gICAgICAgIGJyYWNlQ291bnQtLTtcbiAgICAgIH1cbiAgICAgIHRva2VuID0gdGhpcy5zY2FubmVyLnNjYW4oKTtcbiAgICB9XG4gICAgcmV0dXJuIHRva2VuO1xuICB9XG5cbiAgcHJvdGVjdGVkIHRyeVN0cmluZ0xpdGVyYWwoKTogc3RyaW5nfG51bGwge1xuICAgIHJldHVybiB0aGlzLnNjYW5uZXIuc2NhbigpID09PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwgPyB0aGlzLnNjYW5uZXIuZ2V0VG9rZW5WYWx1ZSgpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgYSBzb3VyY2UgZmlsZSBuZWVkcyB0byBiZSBwYXJzZWQgZm9yIGltcG9ydHMuXG4gKiBUaGlzIGlzIGEgcGVyZm9ybWFuY2Ugc2hvcnQtY2lyY3VpdCwgd2hpY2ggc2F2ZXMgdXMgZnJvbSBjcmVhdGluZ1xuICogYSBUeXBlU2NyaXB0IEFTVCB1bm5lY2Vzc2FyaWx5LlxuICpcbiAqIEBwYXJhbSBzb3VyY2UgVGhlIGNvbnRlbnQgb2YgdGhlIHNvdXJjZSBmaWxlIHRvIGNoZWNrLlxuICpcbiAqIEByZXR1cm5zIGZhbHNlIGlmIHRoZXJlIGFyZSBkZWZpbml0ZWx5IG5vIGltcG9ydCBvciByZS1leHBvcnQgc3RhdGVtZW50c1xuICogaW4gdGhpcyBmaWxlLCB0cnVlIG90aGVyd2lzZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc0ltcG9ydE9yUmVleHBvcnRTdGF0ZW1lbnRzKHNvdXJjZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAvKD86aW1wb3J0fGV4cG9ydClbXFxzXFxTXSs/KFtcIiddKSg/Oig/OlxcXFxcXDF8LikqPylcXDEvLnRlc3Qoc291cmNlKTtcbn1cblxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIGdpdmVuIHN0YXRlbWVudCBpcyBhbiBpbXBvcnQgd2l0aCBhIHN0cmluZyBsaXRlcmFsIG1vZHVsZSBzcGVjaWZpZXIuXG4gKiBAcGFyYW0gc3RtdCB0aGUgc3RhdGVtZW50IG5vZGUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBzdGF0ZW1lbnQgaXMgYW4gaW1wb3J0IHdpdGggYSBzdHJpbmcgbGl0ZXJhbCBtb2R1bGUgc3BlY2lmaWVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmdJbXBvcnRPclJlZXhwb3J0KHN0bXQ6IHRzLlN0YXRlbWVudCk6IHN0bXQgaXMgdHMuSW1wb3J0RGVjbGFyYXRpb24mXG4gICAge21vZHVsZVNwZWNpZmllcjogdHMuU3RyaW5nTGl0ZXJhbH0ge1xuICByZXR1cm4gdHMuaXNJbXBvcnREZWNsYXJhdGlvbihzdG10KSB8fFxuICAgICAgdHMuaXNFeHBvcnREZWNsYXJhdGlvbihzdG10KSAmJiAhIXN0bXQubW9kdWxlU3BlY2lmaWVyICYmXG4gICAgICB0cy5pc1N0cmluZ0xpdGVyYWwoc3RtdC5tb2R1bGVTcGVjaWZpZXIpO1xufVxuXG5cbmZ1bmN0aW9uIGNhblByZWNlZGVBUmVnZXgoa2luZDogdHMuU3ludGF4S2luZCk6IGJvb2xlYW4ge1xuICBzd2l0Y2ggKGtpbmQpIHtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcjpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuTnVtZXJpY0xpdGVyYWw6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkJpZ0ludExpdGVyYWw6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlJlZ3VsYXJFeHByZXNzaW9uTGl0ZXJhbDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQ6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlBsdXNQbHVzVG9rZW46XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLk1pbnVzTWludXNUb2tlbjpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ2xvc2VQYXJlblRva2VuOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5DbG9zZUJyYWNrZXRUb2tlbjpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ2xvc2VCcmFjZVRva2VuOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5UcnVlS2V5d29yZDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuRmFsc2VLZXl3b3JkOlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufSJdfQ==