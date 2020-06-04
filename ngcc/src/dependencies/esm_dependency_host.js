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
        EsmDependencyHost.prototype.extractImports = function (file, fileContents) {
            var imports = new Set();
            var templateStack = [];
            var lastToken = ts.SyntaxKind.Unknown;
            var currentToken = ts.SyntaxKind.Unknown;
            this.scanner.setText(fileContents);
            while ((currentToken = this.scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
                switch (currentToken) {
                    case ts.SyntaxKind.TemplateHead:
                        templateStack.push(currentToken);
                        break;
                    case ts.SyntaxKind.OpenBraceToken:
                        if (templateStack.length > 0) {
                            templateStack.push(currentToken);
                        }
                        break;
                    case ts.SyntaxKind.CloseBraceToken:
                        if (templateStack.length > 0) {
                            var templateToken = templateStack[templateStack.length - 1];
                            if (templateToken === ts.SyntaxKind.TemplateHead) {
                                currentToken = this.scanner.reScanTemplateToken(/* isTaggedTemplate */ false);
                                if (currentToken === ts.SyntaxKind.TemplateTail) {
                                    templateStack.pop();
                                }
                            }
                            else {
                                templateStack.pop();
                            }
                        }
                        break;
                    case ts.SyntaxKind.SlashToken:
                    case ts.SyntaxKind.SlashEqualsToken:
                        if (canPrecedeARegex(lastToken)) {
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
            // Clear the text from the scanner.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtX2RlcGVuZGVuY3lfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9kZXBlbmRlbmNpZXMvZXNtX2RlcGVuZGVuY3lfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLCtGQUFxRDtJQUVyRDs7T0FFRztJQUNIO1FBQXVDLDZDQUFrQjtRQUF6RDtZQUFBLHFFQXdNQztZQXZNQyxrRkFBa0Y7WUFDbEYsNENBQTRDO1lBQ3BDLGFBQU8sR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDOztRQXFNcEYsQ0FBQztRQW5NVyx1Q0FBVyxHQUFyQixVQUFzQixZQUFvQjtZQUN4QyxPQUFPLENBQUMsNkJBQTZCLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUVTLDBDQUFjLEdBQXhCLFVBQXlCLElBQW9CLEVBQUUsWUFBb0I7WUFDakUsSUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztZQUNsQyxJQUFNLGFBQWEsR0FBb0IsRUFBRSxDQUFDO1lBQzFDLElBQUksU0FBUyxHQUFrQixFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQztZQUNyRCxJQUFJLFlBQVksR0FBa0IsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7WUFFeEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFbkMsT0FBTyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUU7Z0JBQzVFLFFBQVEsWUFBWSxFQUFFO29CQUNwQixL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akMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDO1lBQzVDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDL0IsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztZQUNqQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDO1lBQ25DLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUM7WUFDbkMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDO1lBQ3JDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUM7WUFDbkMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUMvQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWTtnQkFDN0IsT0FBTyxLQUFLLENBQUM7WUFDZjtnQkFDRSxPQUFPLElBQUksQ0FBQztTQUNmO0lBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEZXBlbmRlbmN5SG9zdEJhc2V9IGZyb20gJy4vZGVwZW5kZW5jeV9ob3N0JztcblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb25zIGZvciBjb21wdXRpbmcgZGVwZW5kZW5jaWVzLlxuICovXG5leHBvcnQgY2xhc3MgRXNtRGVwZW5kZW5jeUhvc3QgZXh0ZW5kcyBEZXBlbmRlbmN5SG9zdEJhc2Uge1xuICAvLyBCeSBza2lwcGluZyB0cml2aWEgaGVyZSB3ZSBkb24ndCBoYXZlIHRvIGFjY291bnQgZm9yIGl0IGluIHRoZSBwcm9jZXNzaW5nIGJlbG93XG4gIC8vIEl0IGhhcyBubyByZWxldmFuY2UgdG8gY2FwdHVyaW5nIGltcG9ydHMuXG4gIHByaXZhdGUgc2Nhbm5lciA9IHRzLmNyZWF0ZVNjYW5uZXIodHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgLyogc2tpcFRyaXZpYSAqLyB0cnVlKTtcblxuICBwcm90ZWN0ZWQgY2FuU2tpcEZpbGUoZmlsZUNvbnRlbnRzOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIWhhc0ltcG9ydE9yUmVleHBvcnRTdGF0ZW1lbnRzKGZpbGVDb250ZW50cyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZXh0cmFjdEltcG9ydHMoZmlsZTogQWJzb2x1dGVGc1BhdGgsIGZpbGVDb250ZW50czogc3RyaW5nKTogU2V0PHN0cmluZz4ge1xuICAgIGNvbnN0IGltcG9ydHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCB0ZW1wbGF0ZVN0YWNrOiB0cy5TeW50YXhLaW5kW10gPSBbXTtcbiAgICBsZXQgbGFzdFRva2VuOiB0cy5TeW50YXhLaW5kID0gdHMuU3ludGF4S2luZC5Vbmtub3duO1xuICAgIGxldCBjdXJyZW50VG9rZW46IHRzLlN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kLlVua25vd247XG5cbiAgICB0aGlzLnNjYW5uZXIuc2V0VGV4dChmaWxlQ29udGVudHMpO1xuXG4gICAgd2hpbGUgKChjdXJyZW50VG9rZW4gPSB0aGlzLnNjYW5uZXIuc2NhbigpKSAhPT0gdHMuU3ludGF4S2luZC5FbmRPZkZpbGVUb2tlbikge1xuICAgICAgc3dpdGNoIChjdXJyZW50VG9rZW4pIHtcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlRlbXBsYXRlSGVhZDpcbiAgICAgICAgICB0ZW1wbGF0ZVN0YWNrLnB1c2goY3VycmVudFRva2VuKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLk9wZW5CcmFjZVRva2VuOlxuICAgICAgICAgIGlmICh0ZW1wbGF0ZVN0YWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRlbXBsYXRlU3RhY2sucHVzaChjdXJyZW50VG9rZW4pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkNsb3NlQnJhY2VUb2tlbjpcbiAgICAgICAgICBpZiAodGVtcGxhdGVTdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZVRva2VuID0gdGVtcGxhdGVTdGFja1t0ZW1wbGF0ZVN0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlVG9rZW4gPT09IHRzLlN5bnRheEtpbmQuVGVtcGxhdGVIZWFkKSB7XG4gICAgICAgICAgICAgIGN1cnJlbnRUb2tlbiA9IHRoaXMuc2Nhbm5lci5yZVNjYW5UZW1wbGF0ZVRva2VuKC8qIGlzVGFnZ2VkVGVtcGxhdGUgKi8gZmFsc2UpO1xuICAgICAgICAgICAgICBpZiAoY3VycmVudFRva2VuID09PSB0cy5TeW50YXhLaW5kLlRlbXBsYXRlVGFpbCkge1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlU3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRlbXBsYXRlU3RhY2sucG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuU2xhc2hUb2tlbjpcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlNsYXNoRXF1YWxzVG9rZW46XG4gICAgICAgICAgaWYgKGNhblByZWNlZGVBUmVnZXgobGFzdFRva2VuKSkge1xuICAgICAgICAgICAgY3VycmVudFRva2VuID0gdGhpcy5zY2FubmVyLnJlU2NhblNsYXNoVG9rZW4oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5JbXBvcnRLZXl3b3JkOlxuICAgICAgICAgIGNvbnN0IGltcG9ydFBhdGggPSB0aGlzLmV4dHJhY3RJbXBvcnRQYXRoKCk7XG4gICAgICAgICAgaWYgKGltcG9ydFBhdGggIT09IG51bGwpIHtcbiAgICAgICAgICAgIGltcG9ydHMuYWRkKGltcG9ydFBhdGgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQ6XG4gICAgICAgICAgY29uc3QgcmVleHBvcnRQYXRoID0gdGhpcy5leHRyYWN0UmVleHBvcnRQYXRoKCk7XG4gICAgICAgICAgaWYgKHJlZXhwb3J0UGF0aCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaW1wb3J0cy5hZGQocmVleHBvcnRQYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBsYXN0VG9rZW4gPSBjdXJyZW50VG9rZW47XG4gICAgfVxuXG4gICAgLy8gQ2xlYXIgdGhlIHRleHQgZnJvbSB0aGUgc2Nhbm5lci5cbiAgICB0aGlzLnNjYW5uZXIuc2V0VGV4dCgnJyk7XG5cbiAgICByZXR1cm4gaW1wb3J0cztcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFdlIGhhdmUgZm91bmQgYW4gYGltcG9ydGAgdG9rZW4gc28gbm93IHRyeSB0byBpZGVudGlmeSB0aGUgaW1wb3J0IHBhdGguXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHdpbGwgdXNlIHRoZSBjdXJyZW50IHN0YXRlIG9mIGB0aGlzLnNjYW5uZXJgIHRvIGV4dHJhY3QgYSBzdHJpbmcgbGl0ZXJhbCBtb2R1bGVcbiAgICogc3BlY2lmaWVyLiBJdCBleHBlY3RzIHRoYXQgdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIHNjYW5uZXIgaXMgdGhhdCBhbiBgaW1wb3J0YCB0b2tlbiBoYXMganVzdFxuICAgKiBiZWVuIHNjYW5uZWQuXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgZm9ybXMgb2YgaW1wb3J0IGFyZSBtYXRjaGVkOlxuICAgKlxuICAgKiAqIGBpbXBvcnQgXCJtb2R1bGUtc3BlY2lmaWVyXCI7YFxuICAgKiAqIGBpbXBvcnQoXCJtb2R1bGUtc3BlY2lmaWVyXCIpYFxuICAgKiAqIGBpbXBvcnQgZGVmYXVsdEJpbmRpbmcgZnJvbSBcIm1vZHVsZS1zcGVjaWZpZXJcIjtgXG4gICAqICogYGltcG9ydCBkZWZhdWx0QmluZGluZywgKiBhcyBpZGVudGlmaWVyIGZyb20gXCJtb2R1bGUtc3BlY2lmaWVyXCI7YFxuICAgKiAqIGBpbXBvcnQgZGVmYXVsdEJpbmRpbmcsIHsuLi59IGZyb20gXCJtb2R1bGUtc3BlY2lmaWVyXCI7YFxuICAgKiAqIGBpbXBvcnQgKiBhcyBpZGVudGlmaWVyIGZyb20gXCJtb2R1bGUtc3BlY2lmaWVyXCI7YFxuICAgKiAqIGBpbXBvcnQgey4uLn0gZnJvbSBcIm1vZHVsZS1zcGVjaWZpZXJcIjtgXG4gICAqXG4gICAqIEByZXR1cm5zIHRoZSBpbXBvcnQgcGF0aCBvciBudWxsIGlmIHRoZXJlIGlzIG5vIGltcG9ydCBvciBpdCBpcyBub3QgYSBzdHJpbmcgbGl0ZXJhbC5cbiAgICovXG4gIHByb3RlY3RlZCBleHRyYWN0SW1wb3J0UGF0aCgpOiBzdHJpbmd8bnVsbCB7XG4gICAgLy8gQ2hlY2sgZm9yIHNpZGUtZWZmZWN0IGltcG9ydFxuICAgIGxldCBzaWRlRWZmZWN0SW1wb3J0UGF0aCA9IHRoaXMudHJ5U3RyaW5nTGl0ZXJhbCgpO1xuICAgIGlmIChzaWRlRWZmZWN0SW1wb3J0UGF0aCAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHNpZGVFZmZlY3RJbXBvcnRQYXRoO1xuICAgIH1cblxuICAgIGxldCBraW5kOiB0cy5TeW50YXhLaW5kfG51bGwgPSB0aGlzLnNjYW5uZXIuZ2V0VG9rZW4oKTtcblxuICAgIC8vIENoZWNrIGZvciBkeW5hbWljIGltcG9ydCBleHByZXNzaW9uXG4gICAgaWYgKGtpbmQgPT09IHRzLlN5bnRheEtpbmQuT3BlblBhcmVuVG9rZW4pIHtcbiAgICAgIHJldHVybiB0aGlzLnRyeVN0cmluZ0xpdGVyYWwoKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgZGVmYXVsdEJpbmRpbmdcbiAgICBpZiAoa2luZCA9PT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG4gICAgICAvLyBTa2lwIGRlZmF1bHQgYmluZGluZ1xuICAgICAga2luZCA9IHRoaXMuc2Nhbm5lci5zY2FuKCk7XG4gICAgICBpZiAoa2luZCA9PT0gdHMuU3ludGF4S2luZC5Db21tYVRva2VuKSB7XG4gICAgICAgIC8vIFNraXAgY29tbWEgdGhhdCBpbmRpY2F0ZXMgYWRkaXRpb25hbCBpbXBvcnQgYmluZGluZ3NcbiAgICAgICAga2luZCA9IHRoaXMuc2Nhbm5lci5zY2FuKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIG5hbWVzcGFjZSBpbXBvcnQgY2xhdXNlXG4gICAgaWYgKGtpbmQgPT09IHRzLlN5bnRheEtpbmQuQXN0ZXJpc2tUb2tlbikge1xuICAgICAga2luZCA9IHRoaXMuc2tpcE5hbWVzcGFjZWRDbGF1c2UoKTtcbiAgICAgIGlmIChraW5kID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBDaGVjayBmb3IgbmFtZWQgaW1wb3J0cyBjbGF1c2VcbiAgICBlbHNlIGlmIChraW5kID09PSB0cy5TeW50YXhLaW5kLk9wZW5CcmFjZVRva2VuKSB7XG4gICAgICBraW5kID0gdGhpcy5za2lwTmFtZWRDbGF1c2UoKTtcbiAgICB9XG5cbiAgICAvLyBFeHBlY3QgYSBgZnJvbWAgY2xhdXNlLCBpZiBub3QgYmFpbCBvdXRcbiAgICBpZiAoa2luZCAhPT0gdHMuU3ludGF4S2luZC5Gcm9tS2V5d29yZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudHJ5U3RyaW5nTGl0ZXJhbCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdlIGhhdmUgZm91bmQgYW4gYGV4cG9ydGAgdG9rZW4gc28gbm93IHRyeSB0byBpZGVudGlmeSBhIHJlLWV4cG9ydCBwYXRoLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCB3aWxsIHVzZSB0aGUgY3VycmVudCBzdGF0ZSBvZiBgdGhpcy5zY2FubmVyYCB0byBleHRyYWN0IGEgc3RyaW5nIGxpdGVyYWwgbW9kdWxlXG4gICAqIHNwZWNpZmllci4gSXQgZXhwZWN0cyB0aGF0IHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBzY2FubmVyIGlzIHRoYXQgYW4gYGV4cG9ydGAgdG9rZW4gaGFzXG4gICAqIGp1c3QgYmVlbiBzY2FubmVkLlxuICAgKlxuICAgKiBUaGVyZSBhcmUgdGhyZWUgZm9ybXMgb2YgcmUtZXhwb3J0IHRoYXQgYXJlIG1hdGNoZWQ6XG4gICAqXG4gICAqICogYGV4cG9ydCAqIGZyb20gJy4uLic7XG4gICAqICogYGV4cG9ydCAqIGFzIGFsaWFzIGZyb20gJy4uLic7XG4gICAqICogYGV4cG9ydCB7Li4ufSBmcm9tICcuLi4nO1xuICAgKi9cbiAgcHJvdGVjdGVkIGV4dHJhY3RSZWV4cG9ydFBhdGgoKTogc3RyaW5nfG51bGwge1xuICAgIC8vIFNraXAgdGhlIGBleHBvcnRgIGtleXdvcmRcbiAgICBsZXQgdG9rZW46IHRzLlN5bnRheEtpbmR8bnVsbCA9IHRoaXMuc2Nhbm5lci5zY2FuKCk7XG4gICAgaWYgKHRva2VuID09PSB0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW4pIHtcbiAgICAgIHRva2VuID0gdGhpcy5za2lwTmFtZXNwYWNlZENsYXVzZSgpO1xuICAgICAgaWYgKHRva2VuID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodG9rZW4gPT09IHRzLlN5bnRheEtpbmQuT3BlbkJyYWNlVG9rZW4pIHtcbiAgICAgIHRva2VuID0gdGhpcy5za2lwTmFtZWRDbGF1c2UoKTtcbiAgICB9XG4gICAgLy8gRXhwZWN0IGEgYGZyb21gIGNsYXVzZSwgaWYgbm90IGJhaWwgb3V0XG4gICAgaWYgKHRva2VuICE9PSB0cy5TeW50YXhLaW5kLkZyb21LZXl3b3JkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudHJ5U3RyaW5nTGl0ZXJhbCgpO1xuICB9XG5cbiAgcHJvdGVjdGVkIHNraXBOYW1lc3BhY2VkQ2xhdXNlKCk6IHRzLlN5bnRheEtpbmR8bnVsbCB7XG4gICAgLy8gU2tpcCBwYXN0IHRoZSBgKmBcbiAgICBsZXQgdG9rZW4gPSB0aGlzLnNjYW5uZXIuc2NhbigpO1xuICAgIC8vIENoZWNrIGZvciBhIGAqIGFzIGlkZW50aWZpZXJgIGFsaWFzIGNsYXVzZVxuICAgIGlmICh0b2tlbiA9PT0gdHMuU3ludGF4S2luZC5Bc0tleXdvcmQpIHtcbiAgICAgIC8vIFNraXAgcGFzdCB0aGUgYGFzYCBrZXl3b3JkXG4gICAgICB0b2tlbiA9IHRoaXMuc2Nhbm5lci5zY2FuKCk7XG4gICAgICAvLyBFeHBlY3QgYW4gaWRlbnRpZmllciwgaWYgbm90IGJhaWwgb3V0XG4gICAgICBpZiAodG9rZW4gIT09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcikge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIFNraXAgcGFzdCB0aGUgaWRlbnRpZmllclxuICAgICAgdG9rZW4gPSB0aGlzLnNjYW5uZXIuc2NhbigpO1xuICAgIH1cbiAgICByZXR1cm4gdG9rZW47XG4gIH1cblxuICBwcm90ZWN0ZWQgc2tpcE5hbWVkQ2xhdXNlKCk6IHRzLlN5bnRheEtpbmQge1xuICAgIGxldCBicmFjZUNvdW50ID0gMTtcbiAgICAvLyBTa2lwIHBhc3QgdGhlIGluaXRpYWwgb3BlbmluZyBicmFjZSBge2BcbiAgICBsZXQgdG9rZW4gPSB0aGlzLnNjYW5uZXIuc2NhbigpO1xuICAgIC8vIFNlYXJjaCBmb3IgdGhlIG1hdGNoaW5nIGNsb3NpbmcgYnJhY2UgYH1gXG4gICAgd2hpbGUgKGJyYWNlQ291bnQgPiAwICYmIHRva2VuICE9PSB0cy5TeW50YXhLaW5kLkVuZE9mRmlsZVRva2VuKSB7XG4gICAgICBpZiAodG9rZW4gPT09IHRzLlN5bnRheEtpbmQuT3BlbkJyYWNlVG9rZW4pIHtcbiAgICAgICAgYnJhY2VDb3VudCsrO1xuICAgICAgfSBlbHNlIGlmICh0b2tlbiA9PT0gdHMuU3ludGF4S2luZC5DbG9zZUJyYWNlVG9rZW4pIHtcbiAgICAgICAgYnJhY2VDb3VudC0tO1xuICAgICAgfVxuICAgICAgdG9rZW4gPSB0aGlzLnNjYW5uZXIuc2NhbigpO1xuICAgIH1cbiAgICByZXR1cm4gdG9rZW47XG4gIH1cblxuICBwcm90ZWN0ZWQgdHJ5U3RyaW5nTGl0ZXJhbCgpOiBzdHJpbmd8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuc2Nhbm5lci5zY2FuKCkgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCA/IHRoaXMuc2Nhbm5lci5nZXRUb2tlblZhbHVlKCkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBhIHNvdXJjZSBmaWxlIG5lZWRzIHRvIGJlIHBhcnNlZCBmb3IgaW1wb3J0cy5cbiAqIFRoaXMgaXMgYSBwZXJmb3JtYW5jZSBzaG9ydC1jaXJjdWl0LCB3aGljaCBzYXZlcyB1cyBmcm9tIGNyZWF0aW5nXG4gKiBhIFR5cGVTY3JpcHQgQVNUIHVubmVjZXNzYXJpbHkuXG4gKlxuICogQHBhcmFtIHNvdXJjZSBUaGUgY29udGVudCBvZiB0aGUgc291cmNlIGZpbGUgdG8gY2hlY2suXG4gKlxuICogQHJldHVybnMgZmFsc2UgaWYgdGhlcmUgYXJlIGRlZmluaXRlbHkgbm8gaW1wb3J0IG9yIHJlLWV4cG9ydCBzdGF0ZW1lbnRzXG4gKiBpbiB0aGlzIGZpbGUsIHRydWUgb3RoZXJ3aXNlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzSW1wb3J0T3JSZWV4cG9ydFN0YXRlbWVudHMoc291cmNlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIC8oPzppbXBvcnR8ZXhwb3J0KVtcXHNcXFNdKz8oW1wiJ10pKD86KD86XFxcXFxcMXwuKSo/KVxcMS8udGVzdChzb3VyY2UpO1xufVxuXG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciB0aGUgZ2l2ZW4gc3RhdGVtZW50IGlzIGFuIGltcG9ydCB3aXRoIGEgc3RyaW5nIGxpdGVyYWwgbW9kdWxlIHNwZWNpZmllci5cbiAqIEBwYXJhbSBzdG10IHRoZSBzdGF0ZW1lbnQgbm9kZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCBpcyBhbiBpbXBvcnQgd2l0aCBhIHN0cmluZyBsaXRlcmFsIG1vZHVsZSBzcGVjaWZpZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZ0ltcG9ydE9yUmVleHBvcnQoc3RtdDogdHMuU3RhdGVtZW50KTogc3RtdCBpcyB0cy5JbXBvcnREZWNsYXJhdGlvbiZcbiAgICB7bW9kdWxlU3BlY2lmaWVyOiB0cy5TdHJpbmdMaXRlcmFsfSB7XG4gIHJldHVybiB0cy5pc0ltcG9ydERlY2xhcmF0aW9uKHN0bXQpIHx8XG4gICAgICB0cy5pc0V4cG9ydERlY2xhcmF0aW9uKHN0bXQpICYmICEhc3RtdC5tb2R1bGVTcGVjaWZpZXIgJiZcbiAgICAgIHRzLmlzU3RyaW5nTGl0ZXJhbChzdG10Lm1vZHVsZVNwZWNpZmllcik7XG59XG5cblxuZnVuY3Rpb24gY2FuUHJlY2VkZUFSZWdleChraW5kOiB0cy5TeW50YXhLaW5kKTogYm9vbGVhbiB7XG4gIHN3aXRjaCAoa2luZCkge1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5OdW1lcmljTGl0ZXJhbDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuQmlnSW50TGl0ZXJhbDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuUmVndWxhckV4cHJlc3Npb25MaXRlcmFsOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5UaGlzS2V5d29yZDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuUGx1c1BsdXNUb2tlbjpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuTWludXNNaW51c1Rva2VuOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5DbG9zZVBhcmVuVG9rZW46XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkNsb3NlQnJhY2tldFRva2VuOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5DbG9zZUJyYWNlVG9rZW46XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5GYWxzZUtleXdvcmQ6XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB0cnVlO1xuICB9XG59Il19