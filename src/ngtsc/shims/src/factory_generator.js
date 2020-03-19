(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/shims/src/factory_generator", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/shims/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/util");
    var TS_DTS_SUFFIX = /(\.d)?\.ts$/;
    var STRIP_NG_FACTORY = /(.*)NgFactory$/;
    /**
     * Generates ts.SourceFiles which contain variable declarations for NgFactories for every exported
     * class of an input ts.SourceFile.
     */
    var FactoryGenerator = /** @class */ (function () {
        function FactoryGenerator(map) {
            this.map = map;
        }
        Object.defineProperty(FactoryGenerator.prototype, "factoryFileMap", {
            get: function () { return this.map; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FactoryGenerator.prototype, "factoryFileNames", {
            get: function () { return Array.from(this.map.keys()); },
            enumerable: true,
            configurable: true
        });
        FactoryGenerator.prototype.recognize = function (fileName) { return this.map.has(fileName); };
        FactoryGenerator.prototype.generate = function (genFilePath, readFile) {
            var originalPath = this.map.get(genFilePath);
            var original = readFile(originalPath);
            if (original === null) {
                return null;
            }
            var relativePathToSource = './' + file_system_1.basename(original.fileName).replace(TS_DTS_SUFFIX, '');
            // Collect a list of classes that need to have factory types emitted for them. This list is
            // overly broad as at this point the ts.TypeChecker hasn't been created, and can't be used to
            // semantically understand which decorated types are actually decorated with Angular decorators.
            //
            // The exports generated here are pruned in the factory transform during emit.
            var symbolNames = original
                .statements
                // Pick out top level class declarations...
                .filter(ts.isClassDeclaration)
                // which are named, exported, and have decorators.
                .filter(function (decl) { return isExported(decl) && decl.decorators !== undefined &&
                decl.name !== undefined; })
                // Grab the symbol name.
                .map(function (decl) { return decl.name.text; });
            var sourceText = '';
            // If there is a top-level comment in the original file, copy it over at the top of the
            // generated factory file. This is important for preserving any load-bearing jsdoc comments.
            var leadingComment = getFileoverviewComment(original);
            if (leadingComment !== null) {
                // Leading comments must be separated from the rest of the contents by a blank line.
                sourceText = leadingComment + '\n\n';
            }
            if (symbolNames.length > 0) {
                // For each symbol name, generate a constant export of the corresponding NgFactory.
                // This will encompass a lot of symbols which don't need factories, but that's okay
                // because it won't miss any that do.
                var varLines = symbolNames.map(function (name) {
                    return "export const " + name + "NgFactory: i0.\u0275NgModuleFactory<any> = new i0.\u0275NgModuleFactory(" + name + ");";
                });
                sourceText += tslib_1.__spread([
                    // This might be incorrect if the current package being compiled is Angular core, but it's
                    // okay to leave in at type checking time. TypeScript can handle this reference via its path
                    // mapping, but downstream bundlers can't. If the current package is core itself, this will
                    // be replaced in the factory transformer before emit.
                    "import * as i0 from '@angular/core';",
                    "import {" + symbolNames.join(', ') + "} from '" + relativePathToSource + "';"
                ], varLines).join('\n');
            }
            // Add an extra export to ensure this module has at least one. It'll be removed later in the
            // factory transformer if it ends up not being needed.
            sourceText += '\nexport const ɵNonEmptyModule = true;';
            var genFile = ts.createSourceFile(genFilePath, sourceText, original.languageVersion, true, ts.ScriptKind.TS);
            if (original.moduleName !== undefined) {
                genFile.moduleName =
                    util_1.generatedModuleName(original.moduleName, original.fileName, '.ngfactory');
            }
            return genFile;
        };
        FactoryGenerator.forRootFiles = function (files) {
            var map = new Map();
            files.filter(function (sourceFile) { return typescript_1.isNonDeclarationTsPath(sourceFile); })
                .forEach(function (sourceFile) {
                return map.set(file_system_1.absoluteFrom(sourceFile.replace(/\.ts$/, '.ngfactory.ts')), sourceFile);
            });
            return new FactoryGenerator(map);
        };
        return FactoryGenerator;
    }());
    exports.FactoryGenerator = FactoryGenerator;
    function isExported(decl) {
        return decl.modifiers !== undefined &&
            decl.modifiers.some(function (mod) { return mod.kind == ts.SyntaxKind.ExportKeyword; });
    }
    function generatedFactoryTransform(factoryMap, importRewriter) {
        return function (context) {
            return function (file) {
                return transformFactorySourceFile(factoryMap, context, importRewriter, file);
            };
        };
    }
    exports.generatedFactoryTransform = generatedFactoryTransform;
    function transformFactorySourceFile(factoryMap, context, importRewriter, file) {
        var e_1, _a;
        // If this is not a generated file, it won't have factory info associated with it.
        if (!factoryMap.has(file.fileName)) {
            // Don't transform non-generated code.
            return file;
        }
        var _b = factoryMap.get(file.fileName), moduleSymbolNames = _b.moduleSymbolNames, sourceFilePath = _b.sourceFilePath;
        file = ts.getMutableClone(file);
        // Not every exported factory statement is valid. They were generated before the program was
        // analyzed, and before ngtsc knew which symbols were actually NgModules. factoryMap contains
        // that knowledge now, so this transform filters the statement list and removes exported factories
        // that aren't actually factories.
        //
        // This could leave the generated factory file empty. To prevent this (it causes issues with
        // closure compiler) a 'ɵNonEmptyModule' export was added when the factory shim was created.
        // Preserve that export if needed, and remove it otherwise.
        //
        // Additionally, an import to @angular/core is generated, but the current compilation unit could
        // actually be @angular/core, in which case such an import is invalid and should be replaced with
        // the proper path to access Ivy symbols in core.
        // The filtered set of statements.
        var transformedStatements = [];
        // The statement identified as the ɵNonEmptyModule export.
        var nonEmptyExport = null;
        // Extracted identifiers which refer to import statements from @angular/core.
        var coreImportIdentifiers = new Set();
        try {
            // Consider all the statements.
            for (var _c = tslib_1.__values(file.statements), _d = _c.next(); !_d.done; _d = _c.next()) {
                var stmt = _d.value;
                // Look for imports to @angular/core.
                if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier) &&
                    stmt.moduleSpecifier.text === '@angular/core') {
                    // Update the import path to point to the correct file using the ImportRewriter.
                    var rewrittenModuleSpecifier = importRewriter.rewriteSpecifier('@angular/core', sourceFilePath);
                    if (rewrittenModuleSpecifier !== stmt.moduleSpecifier.text) {
                        transformedStatements.push(ts.updateImportDeclaration(stmt, stmt.decorators, stmt.modifiers, stmt.importClause, ts.createStringLiteral(rewrittenModuleSpecifier)));
                        // Record the identifier by which this imported module goes, so references to its symbols
                        // can be discovered later.
                        if (stmt.importClause !== undefined && stmt.importClause.namedBindings !== undefined &&
                            ts.isNamespaceImport(stmt.importClause.namedBindings)) {
                            coreImportIdentifiers.add(stmt.importClause.namedBindings.name.text);
                        }
                    }
                    else {
                        transformedStatements.push(stmt);
                    }
                }
                else if (ts.isVariableStatement(stmt) && stmt.declarationList.declarations.length === 1) {
                    var decl = stmt.declarationList.declarations[0];
                    // If this is the ɵNonEmptyModule export, then save it for later.
                    if (ts.isIdentifier(decl.name)) {
                        if (decl.name.text === 'ɵNonEmptyModule') {
                            nonEmptyExport = stmt;
                            continue;
                        }
                        // Otherwise, check if this export is a factory for a known NgModule, and retain it if so.
                        var match = STRIP_NG_FACTORY.exec(decl.name.text);
                        if (match !== null && moduleSymbolNames.has(match[1])) {
                            transformedStatements.push(stmt);
                        }
                    }
                    else {
                        // Leave the statement alone, as it can't be understood.
                        transformedStatements.push(stmt);
                    }
                }
                else {
                    // Include non-variable statements (imports, etc).
                    transformedStatements.push(stmt);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // Check whether the empty module export is still needed.
        if (!transformedStatements.some(ts.isVariableStatement) && nonEmptyExport !== null) {
            // If the resulting file has no factories, include an empty export to
            // satisfy closure compiler.
            transformedStatements.push(nonEmptyExport);
        }
        file.statements = ts.createNodeArray(transformedStatements);
        // If any imports to @angular/core were detected and rewritten (which happens when compiling
        // @angular/core), go through the SourceFile and rewrite references to symbols imported from core.
        if (coreImportIdentifiers.size > 0) {
            var visit_1 = function (node) {
                node = ts.visitEachChild(node, function (child) { return visit_1(child); }, context);
                // Look for expressions of the form "i.s" where 'i' is a detected name for an @angular/core
                // import that was changed above. Rewrite 's' using the ImportResolver.
                if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) &&
                    coreImportIdentifiers.has(node.expression.text)) {
                    // This is an import of a symbol from @angular/core. Transform it with the importRewriter.
                    var rewrittenSymbol = importRewriter.rewriteSymbol(node.name.text, '@angular/core');
                    if (rewrittenSymbol !== node.name.text) {
                        var updated = ts.updatePropertyAccess(node, node.expression, ts.createIdentifier(rewrittenSymbol));
                        node = updated;
                    }
                }
                return node;
            };
            file = visit_1(file);
        }
        return file;
    }
    /**
     * Parses and returns the comment text of a \@fileoverview comment in the given source file.
     */
    function getFileoverviewComment(sourceFile) {
        var text = sourceFile.getFullText();
        var trivia = text.substring(0, sourceFile.getStart());
        var leadingComments = ts.getLeadingCommentRanges(trivia, 0);
        if (!leadingComments || leadingComments.length === 0) {
            return null;
        }
        var comment = leadingComments[0];
        if (comment.kind !== ts.SyntaxKind.MultiLineCommentTrivia) {
            return null;
        }
        // Only comments separated with a \n\n from the file contents are considered file-level comments
        // in TypeScript.
        if (text.substring(comment.end, comment.end + 2) !== '\n\n') {
            return null;
        }
        var commentText = text.substring(comment.pos, comment.end);
        // Closure Compiler ignores @suppress and similar if the comment contains @license.
        if (commentText.indexOf('@license') !== -1) {
            return null;
        }
        return commentText;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeV9nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zL3NyYy9mYWN0b3J5X2dlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFFakMsMkVBQXlFO0lBRXpFLGtGQUFpRTtJQUdqRSx1RUFBMkM7SUFFM0MsSUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDO0lBQ3BDLElBQU0sZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7SUFFMUM7OztPQUdHO0lBQ0g7UUFDRSwwQkFBNEIsR0FBd0M7WUFBeEMsUUFBRyxHQUFILEdBQUcsQ0FBcUM7UUFBRyxDQUFDO1FBRXhFLHNCQUFJLDRDQUFjO2lCQUFsQixjQUE0RCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUU5RSxzQkFBSSw4Q0FBZ0I7aUJBQXBCLGNBQTJDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUVoRixvQ0FBUyxHQUFULFVBQVUsUUFBd0IsSUFBYSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUvRSxtQ0FBUSxHQUFSLFVBQVMsV0FBMkIsRUFBRSxRQUFvRDtZQUV4RixJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUcsQ0FBQztZQUNqRCxJQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDeEMsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO2dCQUNyQixPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFB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c291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGFic29sdXRlRnJvbSwgYmFzZW5hbWV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7SW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtpc05vbkRlY2xhcmF0aW9uVHNQYXRofSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtTaGltR2VuZXJhdG9yfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2dlbmVyYXRlZE1vZHVsZU5hbWV9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IFRTX0RUU19TVUZGSVggPSAvKFxcLmQpP1xcLnRzJC87XG5jb25zdCBTVFJJUF9OR19GQUNUT1JZID0gLyguKilOZ0ZhY3RvcnkkLztcblxuLyoqXG4gKiBHZW5lcmF0ZXMgdHMuU291cmNlRmlsZXMgd2hpY2ggY29udGFpbiB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgZm9yIE5nRmFjdG9yaWVzIGZvciBldmVyeSBleHBvcnRlZFxuICogY2xhc3Mgb2YgYW4gaW5wdXQgdHMuU291cmNlRmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEZhY3RvcnlHZW5lcmF0b3IgaW1wbGVtZW50cyBTaGltR2VuZXJhdG9yIHtcbiAgcHJpdmF0ZSBjb25zdHJ1Y3Rvcihwcml2YXRlIG1hcDogTWFwPEFic29sdXRlRnNQYXRoLCBBYnNvbHV0ZUZzUGF0aD4pIHt9XG5cbiAgZ2V0IGZhY3RvcnlGaWxlTWFwKCk6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgQWJzb2x1dGVGc1BhdGg+IHsgcmV0dXJuIHRoaXMubWFwOyB9XG5cbiAgZ2V0IGZhY3RvcnlGaWxlTmFtZXMoKTogQWJzb2x1dGVGc1BhdGhbXSB7IHJldHVybiBBcnJheS5mcm9tKHRoaXMubWFwLmtleXMoKSk7IH1cblxuICByZWNvZ25pemUoZmlsZU5hbWU6IEFic29sdXRlRnNQYXRoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLm1hcC5oYXMoZmlsZU5hbWUpOyB9XG5cbiAgZ2VuZXJhdGUoZ2VuRmlsZVBhdGg6IEFic29sdXRlRnNQYXRoLCByZWFkRmlsZTogKGZpbGVOYW1lOiBzdHJpbmcpID0+IHRzLlNvdXJjZUZpbGUgfCBudWxsKTpcbiAgICAgIHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgY29uc3Qgb3JpZ2luYWxQYXRoID0gdGhpcy5tYXAuZ2V0KGdlbkZpbGVQYXRoKSAhO1xuICAgIGNvbnN0IG9yaWdpbmFsID0gcmVhZEZpbGUob3JpZ2luYWxQYXRoKTtcbiAgICBpZiAob3JpZ2luYWwgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHJlbGF0aXZlUGF0aFRvU291cmNlID0gJy4vJyArIGJhc2VuYW1lKG9yaWdpbmFsLmZpbGVOYW1lKS5yZXBsYWNlKFRTX0RUU19TVUZGSVgsICcnKTtcbiAgICAvLyBDb2xsZWN0IGEgbGlzdCBvZiBjbGFzc2VzIHRoYXQgbmVlZCB0byBoYXZlIGZhY3RvcnkgdHlwZXMgZW1pdHRlZCBmb3IgdGhlbS4gVGhpcyBsaXN0IGlzXG4gICAgLy8gb3Zlcmx5IGJyb2FkIGFzIGF0IHRoaXMgcG9pbnQgdGhlIHRzLlR5cGVDaGVja2VyIGhhc24ndCBiZWVuIGNyZWF0ZWQsIGFuZCBjYW4ndCBiZSB1c2VkIHRvXG4gICAgLy8gc2VtYW50aWNhbGx5IHVuZGVyc3RhbmQgd2hpY2ggZGVjb3JhdGVkIHR5cGVzIGFyZSBhY3R1YWxseSBkZWNvcmF0ZWQgd2l0aCBBbmd1bGFyIGRlY29yYXRvcnMuXG4gICAgLy9cbiAgICAvLyBUaGUgZXhwb3J0cyBnZW5lcmF0ZWQgaGVyZSBhcmUgcHJ1bmVkIGluIHRoZSBmYWN0b3J5IHRyYW5zZm9ybSBkdXJpbmcgZW1pdC5cbiAgICBjb25zdCBzeW1ib2xOYW1lcyA9IG9yaWdpbmFsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlbWVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQaWNrIG91dCB0b3AgbGV2ZWwgY2xhc3MgZGVjbGFyYXRpb25zLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcih0cy5pc0NsYXNzRGVjbGFyYXRpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hpY2ggYXJlIG5hbWVkLCBleHBvcnRlZCwgYW5kIGhhdmUgZGVjb3JhdG9ycy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWNsID0+IGlzRXhwb3J0ZWQoZGVjbCkgJiYgZGVjbC5kZWNvcmF0b3JzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlY2wubmFtZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdyYWIgdGhlIHN5bWJvbCBuYW1lLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZGVjbCA9PiBkZWNsLm5hbWUgIS50ZXh0KTtcblxuXG4gICAgbGV0IHNvdXJjZVRleHQgPSAnJztcblxuICAgIC8vIElmIHRoZXJlIGlzIGEgdG9wLWxldmVsIGNvbW1lbnQgaW4gdGhlIG9yaWdpbmFsIGZpbGUsIGNvcHkgaXQgb3ZlciBhdCB0aGUgdG9wIG9mIHRoZVxuICAgIC8vIGdlbmVyYXRlZCBmYWN0b3J5IGZpbGUuIFRoaXMgaXMgaW1wb3J0YW50IGZvciBwcmVzZXJ2aW5nIGFueSBsb2FkLWJlYXJpbmcganNkb2MgY29tbWVudHMuXG4gICAgY29uc3QgbGVhZGluZ0NvbW1lbnQgPSBnZXRGaWxlb3ZlcnZpZXdDb21tZW50KG9yaWdpbmFsKTtcbiAgICBpZiAobGVhZGluZ0NvbW1lbnQgIT09IG51bGwpIHtcbiAgICAgIC8vIExlYWRpbmcgY29tbWVudHMgbXVzdCBiZSBzZXBhcmF0ZWQgZnJvbSB0aGUgcmVzdCBvZiB0aGUgY29udGVudHMgYnkgYSBibGFuayBsaW5lLlxuICAgICAgc291cmNlVGV4dCA9IGxlYWRpbmdDb21tZW50ICsgJ1xcblxcbic7XG4gICAgfVxuXG4gICAgaWYgKHN5bWJvbE5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIEZvciBlYWNoIHN5bWJvbCBuYW1lLCBnZW5lcmF0ZSBhIGNvbnN0YW50IGV4cG9ydCBvZiB0aGUgY29ycmVzcG9uZGluZyBOZ0ZhY3RvcnkuXG4gICAgICAvLyBUaGlzIHdpbGwgZW5jb21wYXNzIGEgbG90IG9mIHN5bWJvbHMgd2hpY2ggZG9uJ3QgbmVlZCBmYWN0b3JpZXMsIGJ1dCB0aGF0J3Mgb2theVxuICAgICAgLy8gYmVjYXVzZSBpdCB3b24ndCBtaXNzIGFueSB0aGF0IGRvLlxuICAgICAgY29uc3QgdmFyTGluZXMgPSBzeW1ib2xOYW1lcy5tYXAoXG4gICAgICAgICAgbmFtZSA9PlxuICAgICAgICAgICAgICBgZXhwb3J0IGNvbnN0ICR7bmFtZX1OZ0ZhY3Rvcnk6IGkwLsm1TmdNb2R1bGVGYWN0b3J5PGFueT4gPSBuZXcgaTAuybVOZ01vZHVsZUZhY3RvcnkoJHtuYW1lfSk7YCk7XG4gICAgICBzb3VyY2VUZXh0ICs9IFtcbiAgICAgICAgLy8gVGhpcyBtaWdodCBiZSBpbmNvcnJlY3QgaWYgdGhlIGN1cnJlbnQgcGFja2FnZSBiZWluZyBjb21waWxlZCBpcyBBbmd1bGFyIGNvcmUsIGJ1dCBpdCdzXG4gICAgICAgIC8vIG9rYXkgdG8gbGVhdmUgaW4gYXQgdHlwZSBjaGVja2luZyB0aW1lLiBUeXBlU2NyaXB0IGNhbiBoYW5kbGUgdGhpcyByZWZlcmVuY2UgdmlhIGl0cyBwYXRoXG4gICAgICAgIC8vIG1hcHBpbmcsIGJ1dCBkb3duc3RyZWFtIGJ1bmRsZXJzIGNhbid0LiBJZiB0aGUgY3VycmVudCBwYWNrYWdlIGlzIGNvcmUgaXRzZWxmLCB0aGlzIHdpbGxcbiAgICAgICAgLy8gYmUgcmVwbGFjZWQgaW4gdGhlIGZhY3RvcnkgdHJhbnNmb3JtZXIgYmVmb3JlIGVtaXQuXG4gICAgICAgIGBpbXBvcnQgKiBhcyBpMCBmcm9tICdAYW5ndWxhci9jb3JlJztgLFxuICAgICAgICBgaW1wb3J0IHske3N5bWJvbE5hbWVzLmpvaW4oJywgJyl9fSBmcm9tICcke3JlbGF0aXZlUGF0aFRvU291cmNlfSc7YCxcbiAgICAgICAgLi4udmFyTGluZXMsXG4gICAgICBdLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIC8vIEFkZCBhbiBleHRyYSBleHBvcnQgdG8gZW5zdXJlIHRoaXMgbW9kdWxlIGhhcyBhdCBsZWFzdCBvbmUuIEl0J2xsIGJlIHJlbW92ZWQgbGF0ZXIgaW4gdGhlXG4gICAgLy8gZmFjdG9yeSB0cmFuc2Zvcm1lciBpZiBpdCBlbmRzIHVwIG5vdCBiZWluZyBuZWVkZWQuXG4gICAgc291cmNlVGV4dCArPSAnXFxuZXhwb3J0IGNvbnN0IMm1Tm9uRW1wdHlNb2R1bGUgPSB0cnVlOyc7XG5cbiAgICBjb25zdCBnZW5GaWxlID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgZ2VuRmlsZVBhdGgsIHNvdXJjZVRleHQsIG9yaWdpbmFsLmxhbmd1YWdlVmVyc2lvbiwgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UUyk7XG4gICAgaWYgKG9yaWdpbmFsLm1vZHVsZU5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZ2VuRmlsZS5tb2R1bGVOYW1lID1cbiAgICAgICAgICBnZW5lcmF0ZWRNb2R1bGVOYW1lKG9yaWdpbmFsLm1vZHVsZU5hbWUsIG9yaWdpbmFsLmZpbGVOYW1lLCAnLm5nZmFjdG9yeScpO1xuICAgIH1cbiAgICByZXR1cm4gZ2VuRmlsZTtcbiAgfVxuXG4gIHN0YXRpYyBmb3JSb290RmlsZXMoZmlsZXM6IFJlYWRvbmx5QXJyYXk8QWJzb2x1dGVGc1BhdGg+KTogRmFjdG9yeUdlbmVyYXRvciB7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgQWJzb2x1dGVGc1BhdGg+KCk7XG4gICAgZmlsZXMuZmlsdGVyKHNvdXJjZUZpbGUgPT4gaXNOb25EZWNsYXJhdGlvblRzUGF0aChzb3VyY2VGaWxlKSlcbiAgICAgICAgLmZvckVhY2goXG4gICAgICAgICAgICBzb3VyY2VGaWxlID0+XG4gICAgICAgICAgICAgICAgbWFwLnNldChhYnNvbHV0ZUZyb20oc291cmNlRmlsZS5yZXBsYWNlKC9cXC50cyQvLCAnLm5nZmFjdG9yeS50cycpKSwgc291cmNlRmlsZSkpO1xuICAgIHJldHVybiBuZXcgRmFjdG9yeUdlbmVyYXRvcihtYXApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRXhwb3J0ZWQoZGVjbDogdHMuRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIGRlY2wubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIGRlY2wubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRmFjdG9yeUluZm8ge1xuICBzb3VyY2VGaWxlUGF0aDogc3RyaW5nO1xuICBtb2R1bGVTeW1ib2xOYW1lczogU2V0PHN0cmluZz47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtKFxuICAgIGZhY3RvcnlNYXA6IE1hcDxzdHJpbmcsIEZhY3RvcnlJbmZvPixcbiAgICBpbXBvcnRSZXdyaXRlcjogSW1wb3J0UmV3cml0ZXIpOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6IHRzLlRyYW5zZm9ybWVyPHRzLlNvdXJjZUZpbGU+ID0+IHtcbiAgICByZXR1cm4gKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlID0+IHtcbiAgICAgIHJldHVybiB0cmFuc2Zvcm1GYWN0b3J5U291cmNlRmlsZShmYWN0b3J5TWFwLCBjb250ZXh0LCBpbXBvcnRSZXdyaXRlciwgZmlsZSk7XG4gICAgfTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtRmFjdG9yeVNvdXJjZUZpbGUoXG4gICAgZmFjdG9yeU1hcDogTWFwPHN0cmluZywgRmFjdG9yeUluZm8+LCBjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQsXG4gICAgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gIC8vIElmIHRoaXMgaXMgbm90IGEgZ2VuZXJhdGVkIGZpbGUsIGl0IHdvbid0IGhhdmUgZmFjdG9yeSBpbmZvIGFzc29jaWF0ZWQgd2l0aCBpdC5cbiAgaWYgKCFmYWN0b3J5TWFwLmhhcyhmaWxlLmZpbGVOYW1lKSkge1xuICAgIC8vIERvbid0IHRyYW5zZm9ybSBub24tZ2VuZXJhdGVkIGNvZGUuXG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBjb25zdCB7bW9kdWxlU3ltYm9sTmFtZXMsIHNvdXJjZUZpbGVQYXRofSA9IGZhY3RvcnlNYXAuZ2V0KGZpbGUuZmlsZU5hbWUpICE7XG5cbiAgZmlsZSA9IHRzLmdldE11dGFibGVDbG9uZShmaWxlKTtcblxuICAvLyBOb3QgZXZlcnkgZXhwb3J0ZWQgZmFjdG9yeSBzdGF0ZW1lbnQgaXMgdmFsaWQuIFRoZXkgd2VyZSBnZW5lcmF0ZWQgYmVmb3JlIHRoZSBwcm9ncmFtIHdhc1xuICAvLyBhbmFseXplZCwgYW5kIGJlZm9yZSBuZ3RzYyBrbmV3IHdoaWNoIHN5bWJvbHMgd2VyZSBhY3R1YWxseSBOZ01vZHVsZXMuIGZhY3RvcnlNYXAgY29udGFpbnNcbiAgLy8gdGhhdCBrbm93bGVkZ2Ugbm93LCBzbyB0aGlzIHRyYW5zZm9ybSBmaWx0ZXJzIHRoZSBzdGF0ZW1lbnQgbGlzdCBhbmQgcmVtb3ZlcyBleHBvcnRlZCBmYWN0b3JpZXNcbiAgLy8gdGhhdCBhcmVuJ3QgYWN0dWFsbHkgZmFjdG9yaWVzLlxuICAvL1xuICAvLyBUaGlzIGNvdWxkIGxlYXZlIHRoZSBnZW5lcmF0ZWQgZmFjdG9yeSBmaWxlIGVtcHR5LiBUbyBwcmV2ZW50IHRoaXMgKGl0IGNhdXNlcyBpc3N1ZXMgd2l0aFxuICAvLyBjbG9zdXJlIGNvbXBpbGVyKSBhICfJtU5vbkVtcHR5TW9kdWxlJyBleHBvcnQgd2FzIGFkZGVkIHdoZW4gdGhlIGZhY3Rvcnkgc2hpbSB3YXMgY3JlYXRlZC5cbiAgLy8gUHJlc2VydmUgdGhhdCBleHBvcnQgaWYgbmVlZGVkLCBhbmQgcmVtb3ZlIGl0IG90aGVyd2lzZS5cbiAgLy9cbiAgLy8gQWRkaXRpb25hbGx5LCBhbiBpbXBvcnQgdG8gQGFuZ3VsYXIvY29yZSBpcyBnZW5lcmF0ZWQsIGJ1dCB0aGUgY3VycmVudCBjb21waWxhdGlvbiB1bml0IGNvdWxkXG4gIC8vIGFjdHVhbGx5IGJlIEBhbmd1bGFyL2NvcmUsIGluIHdoaWNoIGNhc2Ugc3VjaCBhbiBpbXBvcnQgaXMgaW52YWxpZCBhbmQgc2hvdWxkIGJlIHJlcGxhY2VkIHdpdGhcbiAgLy8gdGhlIHByb3BlciBwYXRoIHRvIGFjY2VzcyBJdnkgc3ltYm9scyBpbiBjb3JlLlxuXG4gIC8vIFRoZSBmaWx0ZXJlZCBzZXQgb2Ygc3RhdGVtZW50cy5cbiAgY29uc3QgdHJhbnNmb3JtZWRTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIC8vIFRoZSBzdGF0ZW1lbnQgaWRlbnRpZmllZCBhcyB0aGUgybVOb25FbXB0eU1vZHVsZSBleHBvcnQuXG4gIGxldCBub25FbXB0eUV4cG9ydDogdHMuU3RhdGVtZW50fG51bGwgPSBudWxsO1xuXG4gIC8vIEV4dHJhY3RlZCBpZGVudGlmaWVycyB3aGljaCByZWZlciB0byBpbXBvcnQgc3RhdGVtZW50cyBmcm9tIEBhbmd1bGFyL2NvcmUuXG4gIGNvbnN0IGNvcmVJbXBvcnRJZGVudGlmaWVycyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIC8vIENvbnNpZGVyIGFsbCB0aGUgc3RhdGVtZW50cy5cbiAgZm9yIChjb25zdCBzdG10IG9mIGZpbGUuc3RhdGVtZW50cykge1xuICAgIC8vIExvb2sgZm9yIGltcG9ydHMgdG8gQGFuZ3VsYXIvY29yZS5cbiAgICBpZiAodHMuaXNJbXBvcnREZWNsYXJhdGlvbihzdG10KSAmJiB0cy5pc1N0cmluZ0xpdGVyYWwoc3RtdC5tb2R1bGVTcGVjaWZpZXIpICYmXG4gICAgICAgIHN0bXQubW9kdWxlU3BlY2lmaWVyLnRleHQgPT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgLy8gVXBkYXRlIHRoZSBpbXBvcnQgcGF0aCB0byBwb2ludCB0byB0aGUgY29ycmVjdCBmaWxlIHVzaW5nIHRoZSBJbXBvcnRSZXdyaXRlci5cbiAgICAgIGNvbnN0IHJld3JpdHRlbk1vZHVsZVNwZWNpZmllciA9XG4gICAgICAgICAgaW1wb3J0UmV3cml0ZXIucmV3cml0ZVNwZWNpZmllcignQGFuZ3VsYXIvY29yZScsIHNvdXJjZUZpbGVQYXRoKTtcbiAgICAgIGlmIChyZXdyaXR0ZW5Nb2R1bGVTcGVjaWZpZXIgIT09IHN0bXQubW9kdWxlU3BlY2lmaWVyLnRleHQpIHtcbiAgICAgICAgdHJhbnNmb3JtZWRTdGF0ZW1lbnRzLnB1c2godHMudXBkYXRlSW1wb3J0RGVjbGFyYXRpb24oXG4gICAgICAgICAgICBzdG10LCBzdG10LmRlY29yYXRvcnMsIHN0bXQubW9kaWZpZXJzLCBzdG10LmltcG9ydENsYXVzZSxcbiAgICAgICAgICAgIHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwocmV3cml0dGVuTW9kdWxlU3BlY2lmaWVyKSkpO1xuXG4gICAgICAgIC8vIFJlY29yZCB0aGUgaWRlbnRpZmllciBieSB3aGljaCB0aGlzIGltcG9ydGVkIG1vZHVsZSBnb2VzLCBzbyByZWZlcmVuY2VzIHRvIGl0cyBzeW1ib2xzXG4gICAgICAgIC8vIGNhbiBiZSBkaXNjb3ZlcmVkIGxhdGVyLlxuICAgICAgICBpZiAoc3RtdC5pbXBvcnRDbGF1c2UgIT09IHVuZGVmaW5lZCAmJiBzdG10LmltcG9ydENsYXVzZS5uYW1lZEJpbmRpbmdzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgIHRzLmlzTmFtZXNwYWNlSW1wb3J0KHN0bXQuaW1wb3J0Q2xhdXNlLm5hbWVkQmluZGluZ3MpKSB7XG4gICAgICAgICAgY29yZUltcG9ydElkZW50aWZpZXJzLmFkZChzdG10LmltcG9ydENsYXVzZS5uYW1lZEJpbmRpbmdzLm5hbWUudGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyYW5zZm9ybWVkU3RhdGVtZW50cy5wdXNoKHN0bXQpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdG10KSAmJiBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICBjb25zdCBkZWNsID0gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zWzBdO1xuXG4gICAgICAvLyBJZiB0aGlzIGlzIHRoZSDJtU5vbkVtcHR5TW9kdWxlIGV4cG9ydCwgdGhlbiBzYXZlIGl0IGZvciBsYXRlci5cbiAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSkge1xuICAgICAgICBpZiAoZGVjbC5uYW1lLnRleHQgPT09ICfJtU5vbkVtcHR5TW9kdWxlJykge1xuICAgICAgICAgIG5vbkVtcHR5RXhwb3J0ID0gc3RtdDtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE90aGVyd2lzZSwgY2hlY2sgaWYgdGhpcyBleHBvcnQgaXMgYSBmYWN0b3J5IGZvciBhIGtub3duIE5nTW9kdWxlLCBhbmQgcmV0YWluIGl0IGlmIHNvLlxuICAgICAgICBjb25zdCBtYXRjaCA9IFNUUklQX05HX0ZBQ1RPUlkuZXhlYyhkZWNsLm5hbWUudGV4dCk7XG4gICAgICAgIGlmIChtYXRjaCAhPT0gbnVsbCAmJiBtb2R1bGVTeW1ib2xOYW1lcy5oYXMobWF0Y2hbMV0pKSB7XG4gICAgICAgICAgdHJhbnNmb3JtZWRTdGF0ZW1lbnRzLnB1c2goc3RtdCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIExlYXZlIHRoZSBzdGF0ZW1lbnQgYWxvbmUsIGFzIGl0IGNhbid0IGJlIHVuZGVyc3Rvb2QuXG4gICAgICAgIHRyYW5zZm9ybWVkU3RhdGVtZW50cy5wdXNoKHN0bXQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJbmNsdWRlIG5vbi12YXJpYWJsZSBzdGF0ZW1lbnRzIChpbXBvcnRzLCBldGMpLlxuICAgICAgdHJhbnNmb3JtZWRTdGF0ZW1lbnRzLnB1c2goc3RtdCk7XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hlY2sgd2hldGhlciB0aGUgZW1wdHkgbW9kdWxlIGV4cG9ydCBpcyBzdGlsbCBuZWVkZWQuXG4gIGlmICghdHJhbnNmb3JtZWRTdGF0ZW1lbnRzLnNvbWUodHMuaXNWYXJpYWJsZVN0YXRlbWVudCkgJiYgbm9uRW1wdHlFeHBvcnQgIT09IG51bGwpIHtcbiAgICAvLyBJZiB0aGUgcmVzdWx0aW5nIGZpbGUgaGFzIG5vIGZhY3RvcmllcywgaW5jbHVkZSBhbiBlbXB0eSBleHBvcnQgdG9cbiAgICAvLyBzYXRpc2Z5IGNsb3N1cmUgY29tcGlsZXIuXG4gICAgdHJhbnNmb3JtZWRTdGF0ZW1lbnRzLnB1c2gobm9uRW1wdHlFeHBvcnQpO1xuICB9XG4gIGZpbGUuc3RhdGVtZW50cyA9IHRzLmNyZWF0ZU5vZGVBcnJheSh0cmFuc2Zvcm1lZFN0YXRlbWVudHMpO1xuXG4gIC8vIElmIGFueSBpbXBvcnRzIHRvIEBhbmd1bGFyL2NvcmUgd2VyZSBkZXRlY3RlZCBhbmQgcmV3cml0dGVuICh3aGljaCBoYXBwZW5zIHdoZW4gY29tcGlsaW5nXG4gIC8vIEBhbmd1bGFyL2NvcmUpLCBnbyB0aHJvdWdoIHRoZSBTb3VyY2VGaWxlIGFuZCByZXdyaXRlIHJlZmVyZW5jZXMgdG8gc3ltYm9scyBpbXBvcnRlZCBmcm9tIGNvcmUuXG4gIGlmIChjb3JlSW1wb3J0SWRlbnRpZmllcnMuc2l6ZSA+IDApIHtcbiAgICBjb25zdCB2aXNpdCA9IDxUIGV4dGVuZHMgdHMuTm9kZT4obm9kZTogVCk6IFQgPT4ge1xuICAgICAgbm9kZSA9IHRzLnZpc2l0RWFjaENoaWxkKG5vZGUsIGNoaWxkID0+IHZpc2l0KGNoaWxkKSwgY29udGV4dCk7XG5cbiAgICAgIC8vIExvb2sgZm9yIGV4cHJlc3Npb25zIG9mIHRoZSBmb3JtIFwiaS5zXCIgd2hlcmUgJ2knIGlzIGEgZGV0ZWN0ZWQgbmFtZSBmb3IgYW4gQGFuZ3VsYXIvY29yZVxuICAgICAgLy8gaW1wb3J0IHRoYXQgd2FzIGNoYW5nZWQgYWJvdmUuIFJld3JpdGUgJ3MnIHVzaW5nIHRoZSBJbXBvcnRSZXNvbHZlci5cbiAgICAgIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlKSAmJiB0cy5pc0lkZW50aWZpZXIobm9kZS5leHByZXNzaW9uKSAmJlxuICAgICAgICAgIGNvcmVJbXBvcnRJZGVudGlmaWVycy5oYXMobm9kZS5leHByZXNzaW9uLnRleHQpKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgYW4gaW1wb3J0IG9mIGEgc3ltYm9sIGZyb20gQGFuZ3VsYXIvY29yZS4gVHJhbnNmb3JtIGl0IHdpdGggdGhlIGltcG9ydFJld3JpdGVyLlxuICAgICAgICBjb25zdCByZXdyaXR0ZW5TeW1ib2wgPSBpbXBvcnRSZXdyaXRlci5yZXdyaXRlU3ltYm9sKG5vZGUubmFtZS50ZXh0LCAnQGFuZ3VsYXIvY29yZScpO1xuICAgICAgICBpZiAocmV3cml0dGVuU3ltYm9sICE9PSBub2RlLm5hbWUudGV4dCkge1xuICAgICAgICAgIGNvbnN0IHVwZGF0ZWQgPVxuICAgICAgICAgICAgICB0cy51cGRhdGVQcm9wZXJ0eUFjY2Vzcyhub2RlLCBub2RlLmV4cHJlc3Npb24sIHRzLmNyZWF0ZUlkZW50aWZpZXIocmV3cml0dGVuU3ltYm9sKSk7XG4gICAgICAgICAgbm9kZSA9IHVwZGF0ZWQgYXMgVCAmIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfTtcblxuICAgIGZpbGUgPSB2aXNpdChmaWxlKTtcbiAgfVxuXG4gIHJldHVybiBmaWxlO1xufVxuXG5cbi8qKlxuICogUGFyc2VzIGFuZCByZXR1cm5zIHRoZSBjb21tZW50IHRleHQgb2YgYSBcXEBmaWxlb3ZlcnZpZXcgY29tbWVudCBpbiB0aGUgZ2l2ZW4gc291cmNlIGZpbGUuXG4gKi9cbmZ1bmN0aW9uIGdldEZpbGVvdmVydmlld0NvbW1lbnQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHN0cmluZ3xudWxsIHtcbiAgY29uc3QgdGV4dCA9IHNvdXJjZUZpbGUuZ2V0RnVsbFRleHQoKTtcbiAgY29uc3QgdHJpdmlhID0gdGV4dC5zdWJzdHJpbmcoMCwgc291cmNlRmlsZS5nZXRTdGFydCgpKTtcblxuICBjb25zdCBsZWFkaW5nQ29tbWVudHMgPSB0cy5nZXRMZWFkaW5nQ29tbWVudFJhbmdlcyh0cml2aWEsIDApO1xuICBpZiAoIWxlYWRpbmdDb21tZW50cyB8fCBsZWFkaW5nQ29tbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBjb21tZW50ID0gbGVhZGluZ0NvbW1lbnRzWzBdO1xuICBpZiAoY29tbWVudC5raW5kICE9PSB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIE9ubHkgY29tbWVudHMgc2VwYXJhdGVkIHdpdGggYSBcXG5cXG4gZnJvbSB0aGUgZmlsZSBjb250ZW50cyBhcmUgY29uc2lkZXJlZCBmaWxlLWxldmVsIGNvbW1lbnRzXG4gIC8vIGluIFR5cGVTY3JpcHQuXG4gIGlmICh0ZXh0LnN1YnN0cmluZyhjb21tZW50LmVuZCwgY29tbWVudC5lbmQgKyAyKSAhPT0gJ1xcblxcbicpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGNvbW1lbnRUZXh0ID0gdGV4dC5zdWJzdHJpbmcoY29tbWVudC5wb3MsIGNvbW1lbnQuZW5kKTtcbiAgLy8gQ2xvc3VyZSBDb21waWxlciBpZ25vcmVzIEBzdXBwcmVzcyBhbmQgc2ltaWxhciBpZiB0aGUgY29tbWVudCBjb250YWlucyBAbGljZW5zZS5cbiAgaWYgKGNvbW1lbnRUZXh0LmluZGV4T2YoJ0BsaWNlbnNlJykgIT09IC0xKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4gY29tbWVudFRleHQ7XG59XG4iXX0=