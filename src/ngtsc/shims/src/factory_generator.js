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
                var varLines = symbolNames.map(function (name) { return "export const " + name + "NgFactory: i0.\u0275NgModuleFactory<any> = new i0.\u0275NgModuleFactory(" + name + ");"; });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeV9nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zL3NyYy9mYWN0b3J5X2dlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFFakMsMkVBQXlFO0lBRXpFLGtGQUFpRTtJQUdqRSx1RUFBMkM7SUFFM0MsSUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDO0lBQ3BDLElBQU0sZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7SUFFMUM7OztPQUdHO0lBQ0g7UUFDRSwwQkFBNEIsR0FBd0M7WUFBeEMsUUFBRyxHQUFILEdBQUcsQ0FBcUM7UUFBRyxDQUFDO1FBRXhFLHNCQUFJLDRDQUFjO2lCQUFsQixjQUE0RCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUU5RSxzQkFBSSw4Q0FBZ0I7aUJBQXBCLGNBQTJDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUVoRixvQ0FBUyxHQUFULFVBQVUsUUFBd0IsSUFBYSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUvRSxtQ0FBUSxHQUFSLFVBQVMsV0FBMkIsRUFBRSxRQUFvRDtZQUV4RixJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUcsQ0FBQztZQUNqRCxJQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDeEMsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO2dCQUNyQixPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFB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cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGFic29sdXRlRnJvbSwgYmFzZW5hbWV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7SW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtpc05vbkRlY2xhcmF0aW9uVHNQYXRofSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtTaGltR2VuZXJhdG9yfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2dlbmVyYXRlZE1vZHVsZU5hbWV9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IFRTX0RUU19TVUZGSVggPSAvKFxcLmQpP1xcLnRzJC87XG5jb25zdCBTVFJJUF9OR19GQUNUT1JZID0gLyguKilOZ0ZhY3RvcnkkLztcblxuLyoqXG4gKiBHZW5lcmF0ZXMgdHMuU291cmNlRmlsZXMgd2hpY2ggY29udGFpbiB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgZm9yIE5nRmFjdG9yaWVzIGZvciBldmVyeSBleHBvcnRlZFxuICogY2xhc3Mgb2YgYW4gaW5wdXQgdHMuU291cmNlRmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEZhY3RvcnlHZW5lcmF0b3IgaW1wbGVtZW50cyBTaGltR2VuZXJhdG9yIHtcbiAgcHJpdmF0ZSBjb25zdHJ1Y3Rvcihwcml2YXRlIG1hcDogTWFwPEFic29sdXRlRnNQYXRoLCBBYnNvbHV0ZUZzUGF0aD4pIHt9XG5cbiAgZ2V0IGZhY3RvcnlGaWxlTWFwKCk6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgQWJzb2x1dGVGc1BhdGg+IHsgcmV0dXJuIHRoaXMubWFwOyB9XG5cbiAgZ2V0IGZhY3RvcnlGaWxlTmFtZXMoKTogQWJzb2x1dGVGc1BhdGhbXSB7IHJldHVybiBBcnJheS5mcm9tKHRoaXMubWFwLmtleXMoKSk7IH1cblxuICByZWNvZ25pemUoZmlsZU5hbWU6IEFic29sdXRlRnNQYXRoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLm1hcC5oYXMoZmlsZU5hbWUpOyB9XG5cbiAgZ2VuZXJhdGUoZ2VuRmlsZVBhdGg6IEFic29sdXRlRnNQYXRoLCByZWFkRmlsZTogKGZpbGVOYW1lOiBzdHJpbmcpID0+IHRzLlNvdXJjZUZpbGUgfCBudWxsKTpcbiAgICAgIHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgY29uc3Qgb3JpZ2luYWxQYXRoID0gdGhpcy5tYXAuZ2V0KGdlbkZpbGVQYXRoKSAhO1xuICAgIGNvbnN0IG9yaWdpbmFsID0gcmVhZEZpbGUob3JpZ2luYWxQYXRoKTtcbiAgICBpZiAob3JpZ2luYWwgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHJlbGF0aXZlUGF0aFRvU291cmNlID0gJy4vJyArIGJhc2VuYW1lKG9yaWdpbmFsLmZpbGVOYW1lKS5yZXBsYWNlKFRTX0RUU19TVUZGSVgsICcnKTtcbiAgICAvLyBDb2xsZWN0IGEgbGlzdCBvZiBjbGFzc2VzIHRoYXQgbmVlZCB0byBoYXZlIGZhY3RvcnkgdHlwZXMgZW1pdHRlZCBmb3IgdGhlbS4gVGhpcyBsaXN0IGlzXG4gICAgLy8gb3Zlcmx5IGJyb2FkIGFzIGF0IHRoaXMgcG9pbnQgdGhlIHRzLlR5cGVDaGVja2VyIGhhc24ndCBiZWVuIGNyZWF0ZWQsIGFuZCBjYW4ndCBiZSB1c2VkIHRvXG4gICAgLy8gc2VtYW50aWNhbGx5IHVuZGVyc3RhbmQgd2hpY2ggZGVjb3JhdGVkIHR5cGVzIGFyZSBhY3R1YWxseSBkZWNvcmF0ZWQgd2l0aCBBbmd1bGFyIGRlY29yYXRvcnMuXG4gICAgLy9cbiAgICAvLyBUaGUgZXhwb3J0cyBnZW5lcmF0ZWQgaGVyZSBhcmUgcHJ1bmVkIGluIHRoZSBmYWN0b3J5IHRyYW5zZm9ybSBkdXJpbmcgZW1pdC5cbiAgICBjb25zdCBzeW1ib2xOYW1lcyA9IG9yaWdpbmFsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlbWVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQaWNrIG91dCB0b3AgbGV2ZWwgY2xhc3MgZGVjbGFyYXRpb25zLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcih0cy5pc0NsYXNzRGVjbGFyYXRpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hpY2ggYXJlIG5hbWVkLCBleHBvcnRlZCwgYW5kIGhhdmUgZGVjb3JhdG9ycy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWNsID0+IGlzRXhwb3J0ZWQoZGVjbCkgJiYgZGVjbC5kZWNvcmF0b3JzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlY2wubmFtZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdyYWIgdGhlIHN5bWJvbCBuYW1lLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZGVjbCA9PiBkZWNsLm5hbWUgIS50ZXh0KTtcblxuXG4gICAgbGV0IHNvdXJjZVRleHQgPSAnJztcblxuICAgIC8vIElmIHRoZXJlIGlzIGEgdG9wLWxldmVsIGNvbW1lbnQgaW4gdGhlIG9yaWdpbmFsIGZpbGUsIGNvcHkgaXQgb3ZlciBhdCB0aGUgdG9wIG9mIHRoZVxuICAgIC8vIGdlbmVyYXRlZCBmYWN0b3J5IGZpbGUuIFRoaXMgaXMgaW1wb3J0YW50IGZvciBwcmVzZXJ2aW5nIGFueSBsb2FkLWJlYXJpbmcganNkb2MgY29tbWVudHMuXG4gICAgY29uc3QgbGVhZGluZ0NvbW1lbnQgPSBnZXRGaWxlb3ZlcnZpZXdDb21tZW50KG9yaWdpbmFsKTtcbiAgICBpZiAobGVhZGluZ0NvbW1lbnQgIT09IG51bGwpIHtcbiAgICAgIC8vIExlYWRpbmcgY29tbWVudHMgbXVzdCBiZSBzZXBhcmF0ZWQgZnJvbSB0aGUgcmVzdCBvZiB0aGUgY29udGVudHMgYnkgYSBibGFuayBsaW5lLlxuICAgICAgc291cmNlVGV4dCA9IGxlYWRpbmdDb21tZW50ICsgJ1xcblxcbic7XG4gICAgfVxuXG4gICAgaWYgKHN5bWJvbE5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIEZvciBlYWNoIHN5bWJvbCBuYW1lLCBnZW5lcmF0ZSBhIGNvbnN0YW50IGV4cG9ydCBvZiB0aGUgY29ycmVzcG9uZGluZyBOZ0ZhY3RvcnkuXG4gICAgICAvLyBUaGlzIHdpbGwgZW5jb21wYXNzIGEgbG90IG9mIHN5bWJvbHMgd2hpY2ggZG9uJ3QgbmVlZCBmYWN0b3JpZXMsIGJ1dCB0aGF0J3Mgb2theVxuICAgICAgLy8gYmVjYXVzZSBpdCB3b24ndCBtaXNzIGFueSB0aGF0IGRvLlxuICAgICAgY29uc3QgdmFyTGluZXMgPSBzeW1ib2xOYW1lcy5tYXAobmFtZSA9PiBgZXhwb3J0IGNvbnN0ICR7XG4gICAgICAgICAgICAgIG5hbWV9TmdGYWN0b3J5OiBpMC7JtU5nTW9kdWxlRmFjdG9yeTxhbnk+ID0gbmV3IGkwLsm1TmdNb2R1bGVGYWN0b3J5KCR7bmFtZX0pO2ApO1xuICAgICAgc291cmNlVGV4dCArPSBbXG4gICAgICAgIC8vIFRoaXMgbWlnaHQgYmUgaW5jb3JyZWN0IGlmIHRoZSBjdXJyZW50IHBhY2thZ2UgYmVpbmcgY29tcGlsZWQgaXMgQW5ndWxhciBjb3JlLCBidXQgaXQnc1xuICAgICAgICAvLyBva2F5IHRvIGxlYXZlIGluIGF0IHR5cGUgY2hlY2tpbmcgdGltZS4gVHlwZVNjcmlwdCBjYW4gaGFuZGxlIHRoaXMgcmVmZXJlbmNlIHZpYSBpdHMgcGF0aFxuICAgICAgICAvLyBtYXBwaW5nLCBidXQgZG93bnN0cmVhbSBidW5kbGVycyBjYW4ndC4gSWYgdGhlIGN1cnJlbnQgcGFja2FnZSBpcyBjb3JlIGl0c2VsZiwgdGhpcyB3aWxsXG4gICAgICAgIC8vIGJlIHJlcGxhY2VkIGluIHRoZSBmYWN0b3J5IHRyYW5zZm9ybWVyIGJlZm9yZSBlbWl0LlxuICAgICAgICBgaW1wb3J0ICogYXMgaTAgZnJvbSAnQGFuZ3VsYXIvY29yZSc7YCxcbiAgICAgICAgYGltcG9ydCB7JHtzeW1ib2xOYW1lcy5qb2luKCcsICcpfX0gZnJvbSAnJHtyZWxhdGl2ZVBhdGhUb1NvdXJjZX0nO2AsXG4gICAgICAgIC4uLnZhckxpbmVzLFxuICAgICAgXS5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgYW4gZXh0cmEgZXhwb3J0IHRvIGVuc3VyZSB0aGlzIG1vZHVsZSBoYXMgYXQgbGVhc3Qgb25lLiBJdCdsbCBiZSByZW1vdmVkIGxhdGVyIGluIHRoZVxuICAgIC8vIGZhY3RvcnkgdHJhbnNmb3JtZXIgaWYgaXQgZW5kcyB1cCBub3QgYmVpbmcgbmVlZGVkLlxuICAgIHNvdXJjZVRleHQgKz0gJ1xcbmV4cG9ydCBjb25zdCDJtU5vbkVtcHR5TW9kdWxlID0gdHJ1ZTsnO1xuXG4gICAgY29uc3QgZ2VuRmlsZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoXG4gICAgICAgIGdlbkZpbGVQYXRoLCBzb3VyY2VUZXh0LCBvcmlnaW5hbC5sYW5ndWFnZVZlcnNpb24sIHRydWUsIHRzLlNjcmlwdEtpbmQuVFMpO1xuICAgIGlmIChvcmlnaW5hbC5tb2R1bGVOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGdlbkZpbGUubW9kdWxlTmFtZSA9XG4gICAgICAgICAgZ2VuZXJhdGVkTW9kdWxlTmFtZShvcmlnaW5hbC5tb2R1bGVOYW1lLCBvcmlnaW5hbC5maWxlTmFtZSwgJy5uZ2ZhY3RvcnknKTtcbiAgICB9XG4gICAgcmV0dXJuIGdlbkZpbGU7XG4gIH1cblxuICBzdGF0aWMgZm9yUm9vdEZpbGVzKGZpbGVzOiBSZWFkb25seUFycmF5PEFic29sdXRlRnNQYXRoPik6IEZhY3RvcnlHZW5lcmF0b3Ige1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIEFic29sdXRlRnNQYXRoPigpO1xuICAgIGZpbGVzLmZpbHRlcihzb3VyY2VGaWxlID0+IGlzTm9uRGVjbGFyYXRpb25Uc1BhdGgoc291cmNlRmlsZSkpXG4gICAgICAgIC5mb3JFYWNoKFxuICAgICAgICAgICAgc291cmNlRmlsZSA9PlxuICAgICAgICAgICAgICAgIG1hcC5zZXQoYWJzb2x1dGVGcm9tKHNvdXJjZUZpbGUucmVwbGFjZSgvXFwudHMkLywgJy5uZ2ZhY3RvcnkudHMnKSksIHNvdXJjZUZpbGUpKTtcbiAgICByZXR1cm4gbmV3IEZhY3RvcnlHZW5lcmF0b3IobWFwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0V4cG9ydGVkKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIHJldHVybiBkZWNsLm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICBkZWNsLm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZhY3RvcnlJbmZvIHtcbiAgc291cmNlRmlsZVBhdGg6IHN0cmluZztcbiAgbW9kdWxlU3ltYm9sTmFtZXM6IFNldDxzdHJpbmc+O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybShcbiAgICBmYWN0b3J5TWFwOiBNYXA8c3RyaW5nLCBGYWN0b3J5SW5mbz4sXG4gICAgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyKTogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpOiB0cy5UcmFuc2Zvcm1lcjx0cy5Tb3VyY2VGaWxlPiA9PiB7XG4gICAgcmV0dXJuIChmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSA9PiB7XG4gICAgICByZXR1cm4gdHJhbnNmb3JtRmFjdG9yeVNvdXJjZUZpbGUoZmFjdG9yeU1hcCwgY29udGV4dCwgaW1wb3J0UmV3cml0ZXIsIGZpbGUpO1xuICAgIH07XG4gIH07XG59XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybUZhY3RvcnlTb3VyY2VGaWxlKFxuICAgIGZhY3RvcnlNYXA6IE1hcDxzdHJpbmcsIEZhY3RvcnlJbmZvPiwgY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0LFxuICAgIGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlciwgZmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICAvLyBJZiB0aGlzIGlzIG5vdCBhIGdlbmVyYXRlZCBmaWxlLCBpdCB3b24ndCBoYXZlIGZhY3RvcnkgaW5mbyBhc3NvY2lhdGVkIHdpdGggaXQuXG4gIGlmICghZmFjdG9yeU1hcC5oYXMoZmlsZS5maWxlTmFtZSkpIHtcbiAgICAvLyBEb24ndCB0cmFuc2Zvcm0gbm9uLWdlbmVyYXRlZCBjb2RlLlxuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgY29uc3Qge21vZHVsZVN5bWJvbE5hbWVzLCBzb3VyY2VGaWxlUGF0aH0gPSBmYWN0b3J5TWFwLmdldChmaWxlLmZpbGVOYW1lKSAhO1xuXG4gIGZpbGUgPSB0cy5nZXRNdXRhYmxlQ2xvbmUoZmlsZSk7XG5cbiAgLy8gTm90IGV2ZXJ5IGV4cG9ydGVkIGZhY3Rvcnkgc3RhdGVtZW50IGlzIHZhbGlkLiBUaGV5IHdlcmUgZ2VuZXJhdGVkIGJlZm9yZSB0aGUgcHJvZ3JhbSB3YXNcbiAgLy8gYW5hbHl6ZWQsIGFuZCBiZWZvcmUgbmd0c2Mga25ldyB3aGljaCBzeW1ib2xzIHdlcmUgYWN0dWFsbHkgTmdNb2R1bGVzLiBmYWN0b3J5TWFwIGNvbnRhaW5zXG4gIC8vIHRoYXQga25vd2xlZGdlIG5vdywgc28gdGhpcyB0cmFuc2Zvcm0gZmlsdGVycyB0aGUgc3RhdGVtZW50IGxpc3QgYW5kIHJlbW92ZXMgZXhwb3J0ZWQgZmFjdG9yaWVzXG4gIC8vIHRoYXQgYXJlbid0IGFjdHVhbGx5IGZhY3Rvcmllcy5cbiAgLy9cbiAgLy8gVGhpcyBjb3VsZCBsZWF2ZSB0aGUgZ2VuZXJhdGVkIGZhY3RvcnkgZmlsZSBlbXB0eS4gVG8gcHJldmVudCB0aGlzIChpdCBjYXVzZXMgaXNzdWVzIHdpdGhcbiAgLy8gY2xvc3VyZSBjb21waWxlcikgYSAnybVOb25FbXB0eU1vZHVsZScgZXhwb3J0IHdhcyBhZGRlZCB3aGVuIHRoZSBmYWN0b3J5IHNoaW0gd2FzIGNyZWF0ZWQuXG4gIC8vIFByZXNlcnZlIHRoYXQgZXhwb3J0IGlmIG5lZWRlZCwgYW5kIHJlbW92ZSBpdCBvdGhlcndpc2UuXG4gIC8vXG4gIC8vIEFkZGl0aW9uYWxseSwgYW4gaW1wb3J0IHRvIEBhbmd1bGFyL2NvcmUgaXMgZ2VuZXJhdGVkLCBidXQgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gdW5pdCBjb3VsZFxuICAvLyBhY3R1YWxseSBiZSBAYW5ndWxhci9jb3JlLCBpbiB3aGljaCBjYXNlIHN1Y2ggYW4gaW1wb3J0IGlzIGludmFsaWQgYW5kIHNob3VsZCBiZSByZXBsYWNlZCB3aXRoXG4gIC8vIHRoZSBwcm9wZXIgcGF0aCB0byBhY2Nlc3MgSXZ5IHN5bWJvbHMgaW4gY29yZS5cblxuICAvLyBUaGUgZmlsdGVyZWQgc2V0IG9mIHN0YXRlbWVudHMuXG4gIGNvbnN0IHRyYW5zZm9ybWVkU3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcblxuICAvLyBUaGUgc3RhdGVtZW50IGlkZW50aWZpZWQgYXMgdGhlIMm1Tm9uRW1wdHlNb2R1bGUgZXhwb3J0LlxuICBsZXQgbm9uRW1wdHlFeHBvcnQ6IHRzLlN0YXRlbWVudHxudWxsID0gbnVsbDtcblxuICAvLyBFeHRyYWN0ZWQgaWRlbnRpZmllcnMgd2hpY2ggcmVmZXIgdG8gaW1wb3J0IHN0YXRlbWVudHMgZnJvbSBAYW5ndWxhci9jb3JlLlxuICBjb25zdCBjb3JlSW1wb3J0SWRlbnRpZmllcnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAvLyBDb25zaWRlciBhbGwgdGhlIHN0YXRlbWVudHMuXG4gIGZvciAoY29uc3Qgc3RtdCBvZiBmaWxlLnN0YXRlbWVudHMpIHtcbiAgICAvLyBMb29rIGZvciBpbXBvcnRzIHRvIEBhbmd1bGFyL2NvcmUuXG4gICAgaWYgKHRzLmlzSW1wb3J0RGVjbGFyYXRpb24oc3RtdCkgJiYgdHMuaXNTdHJpbmdMaXRlcmFsKHN0bXQubW9kdWxlU3BlY2lmaWVyKSAmJlxuICAgICAgICBzdG10Lm1vZHVsZVNwZWNpZmllci50ZXh0ID09PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgIC8vIFVwZGF0ZSB0aGUgaW1wb3J0IHBhdGggdG8gcG9pbnQgdG8gdGhlIGNvcnJlY3QgZmlsZSB1c2luZyB0aGUgSW1wb3J0UmV3cml0ZXIuXG4gICAgICBjb25zdCByZXdyaXR0ZW5Nb2R1bGVTcGVjaWZpZXIgPVxuICAgICAgICAgIGltcG9ydFJld3JpdGVyLnJld3JpdGVTcGVjaWZpZXIoJ0Bhbmd1bGFyL2NvcmUnLCBzb3VyY2VGaWxlUGF0aCk7XG4gICAgICBpZiAocmV3cml0dGVuTW9kdWxlU3BlY2lmaWVyICE9PSBzdG10Lm1vZHVsZVNwZWNpZmllci50ZXh0KSB7XG4gICAgICAgIHRyYW5zZm9ybWVkU3RhdGVtZW50cy5wdXNoKHRzLnVwZGF0ZUltcG9ydERlY2xhcmF0aW9uKFxuICAgICAgICAgICAgc3RtdCwgc3RtdC5kZWNvcmF0b3JzLCBzdG10Lm1vZGlmaWVycywgc3RtdC5pbXBvcnRDbGF1c2UsXG4gICAgICAgICAgICB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKHJld3JpdHRlbk1vZHVsZVNwZWNpZmllcikpKTtcblxuICAgICAgICAvLyBSZWNvcmQgdGhlIGlkZW50aWZpZXIgYnkgd2hpY2ggdGhpcyBpbXBvcnRlZCBtb2R1bGUgZ29lcywgc28gcmVmZXJlbmNlcyB0byBpdHMgc3ltYm9sc1xuICAgICAgICAvLyBjYW4gYmUgZGlzY292ZXJlZCBsYXRlci5cbiAgICAgICAgaWYgKHN0bXQuaW1wb3J0Q2xhdXNlICE9PSB1bmRlZmluZWQgJiYgc3RtdC5pbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICB0cy5pc05hbWVzcGFjZUltcG9ydChzdG10LmltcG9ydENsYXVzZS5uYW1lZEJpbmRpbmdzKSkge1xuICAgICAgICAgIGNvcmVJbXBvcnRJZGVudGlmaWVycy5hZGQoc3RtdC5pbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncy5uYW1lLnRleHQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0cmFuc2Zvcm1lZFN0YXRlbWVudHMucHVzaChzdG10KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RtdCkgJiYgc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgY29uc3QgZGVjbCA9IHN0bXQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9uc1swXTtcblxuICAgICAgLy8gSWYgdGhpcyBpcyB0aGUgybVOb25FbXB0eU1vZHVsZSBleHBvcnQsIHRoZW4gc2F2ZSBpdCBmb3IgbGF0ZXIuXG4gICAgICBpZiAodHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkpIHtcbiAgICAgICAgaWYgKGRlY2wubmFtZS50ZXh0ID09PSAnybVOb25FbXB0eU1vZHVsZScpIHtcbiAgICAgICAgICBub25FbXB0eUV4cG9ydCA9IHN0bXQ7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPdGhlcndpc2UsIGNoZWNrIGlmIHRoaXMgZXhwb3J0IGlzIGEgZmFjdG9yeSBmb3IgYSBrbm93biBOZ01vZHVsZSwgYW5kIHJldGFpbiBpdCBpZiBzby5cbiAgICAgICAgY29uc3QgbWF0Y2ggPSBTVFJJUF9OR19GQUNUT1JZLmV4ZWMoZGVjbC5uYW1lLnRleHQpO1xuICAgICAgICBpZiAobWF0Y2ggIT09IG51bGwgJiYgbW9kdWxlU3ltYm9sTmFtZXMuaGFzKG1hdGNoWzFdKSkge1xuICAgICAgICAgIHRyYW5zZm9ybWVkU3RhdGVtZW50cy5wdXNoKHN0bXQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBMZWF2ZSB0aGUgc3RhdGVtZW50IGFsb25lLCBhcyBpdCBjYW4ndCBiZSB1bmRlcnN0b29kLlxuICAgICAgICB0cmFuc2Zvcm1lZFN0YXRlbWVudHMucHVzaChzdG10KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSW5jbHVkZSBub24tdmFyaWFibGUgc3RhdGVtZW50cyAoaW1wb3J0cywgZXRjKS5cbiAgICAgIHRyYW5zZm9ybWVkU3RhdGVtZW50cy5wdXNoKHN0bXQpO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoZWNrIHdoZXRoZXIgdGhlIGVtcHR5IG1vZHVsZSBleHBvcnQgaXMgc3RpbGwgbmVlZGVkLlxuICBpZiAoIXRyYW5zZm9ybWVkU3RhdGVtZW50cy5zb21lKHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQpICYmIG5vbkVtcHR5RXhwb3J0ICE9PSBudWxsKSB7XG4gICAgLy8gSWYgdGhlIHJlc3VsdGluZyBmaWxlIGhhcyBubyBmYWN0b3JpZXMsIGluY2x1ZGUgYW4gZW1wdHkgZXhwb3J0IHRvXG4gICAgLy8gc2F0aXNmeSBjbG9zdXJlIGNvbXBpbGVyLlxuICAgIHRyYW5zZm9ybWVkU3RhdGVtZW50cy5wdXNoKG5vbkVtcHR5RXhwb3J0KTtcbiAgfVxuICBmaWxlLnN0YXRlbWVudHMgPSB0cy5jcmVhdGVOb2RlQXJyYXkodHJhbnNmb3JtZWRTdGF0ZW1lbnRzKTtcblxuICAvLyBJZiBhbnkgaW1wb3J0cyB0byBAYW5ndWxhci9jb3JlIHdlcmUgZGV0ZWN0ZWQgYW5kIHJld3JpdHRlbiAod2hpY2ggaGFwcGVucyB3aGVuIGNvbXBpbGluZ1xuICAvLyBAYW5ndWxhci9jb3JlKSwgZ28gdGhyb3VnaCB0aGUgU291cmNlRmlsZSBhbmQgcmV3cml0ZSByZWZlcmVuY2VzIHRvIHN5bWJvbHMgaW1wb3J0ZWQgZnJvbSBjb3JlLlxuICBpZiAoY29yZUltcG9ydElkZW50aWZpZXJzLnNpemUgPiAwKSB7XG4gICAgY29uc3QgdmlzaXQgPSA8VCBleHRlbmRzIHRzLk5vZGU+KG5vZGU6IFQpOiBUID0+IHtcbiAgICAgIG5vZGUgPSB0cy52aXNpdEVhY2hDaGlsZChub2RlLCBjaGlsZCA9PiB2aXNpdChjaGlsZCksIGNvbnRleHQpO1xuXG4gICAgICAvLyBMb29rIGZvciBleHByZXNzaW9ucyBvZiB0aGUgZm9ybSBcImkuc1wiIHdoZXJlICdpJyBpcyBhIGRldGVjdGVkIG5hbWUgZm9yIGFuIEBhbmd1bGFyL2NvcmVcbiAgICAgIC8vIGltcG9ydCB0aGF0IHdhcyBjaGFuZ2VkIGFib3ZlLiBSZXdyaXRlICdzJyB1c2luZyB0aGUgSW1wb3J0UmVzb2x2ZXIuXG4gICAgICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSkgJiYgdHMuaXNJZGVudGlmaWVyKG5vZGUuZXhwcmVzc2lvbikgJiZcbiAgICAgICAgICBjb3JlSW1wb3J0SWRlbnRpZmllcnMuaGFzKG5vZGUuZXhwcmVzc2lvbi50ZXh0KSkge1xuICAgICAgICAvLyBUaGlzIGlzIGFuIGltcG9ydCBvZiBhIHN5bWJvbCBmcm9tIEBhbmd1bGFyL2NvcmUuIFRyYW5zZm9ybSBpdCB3aXRoIHRoZSBpbXBvcnRSZXdyaXRlci5cbiAgICAgICAgY29uc3QgcmV3cml0dGVuU3ltYm9sID0gaW1wb3J0UmV3cml0ZXIucmV3cml0ZVN5bWJvbChub2RlLm5hbWUudGV4dCwgJ0Bhbmd1bGFyL2NvcmUnKTtcbiAgICAgICAgaWYgKHJld3JpdHRlblN5bWJvbCAhPT0gbm9kZS5uYW1lLnRleHQpIHtcbiAgICAgICAgICBjb25zdCB1cGRhdGVkID1cbiAgICAgICAgICAgICAgdHMudXBkYXRlUHJvcGVydHlBY2Nlc3Mobm9kZSwgbm9kZS5leHByZXNzaW9uLCB0cy5jcmVhdGVJZGVudGlmaWVyKHJld3JpdHRlblN5bWJvbCkpO1xuICAgICAgICAgIG5vZGUgPSB1cGRhdGVkIGFzIFQgJiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb247XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlO1xuICAgIH07XG5cbiAgICBmaWxlID0gdmlzaXQoZmlsZSk7XG4gIH1cblxuICByZXR1cm4gZmlsZTtcbn1cblxuXG4vKipcbiAqIFBhcnNlcyBhbmQgcmV0dXJucyB0aGUgY29tbWVudCB0ZXh0IG9mIGEgXFxAZmlsZW92ZXJ2aWV3IGNvbW1lbnQgaW4gdGhlIGdpdmVuIHNvdXJjZSBmaWxlLlxuICovXG5mdW5jdGlvbiBnZXRGaWxlb3ZlcnZpZXdDb21tZW50KHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBzdHJpbmd8bnVsbCB7XG4gIGNvbnN0IHRleHQgPSBzb3VyY2VGaWxlLmdldEZ1bGxUZXh0KCk7XG4gIGNvbnN0IHRyaXZpYSA9IHRleHQuc3Vic3RyaW5nKDAsIHNvdXJjZUZpbGUuZ2V0U3RhcnQoKSk7XG5cbiAgY29uc3QgbGVhZGluZ0NvbW1lbnRzID0gdHMuZ2V0TGVhZGluZ0NvbW1lbnRSYW5nZXModHJpdmlhLCAwKTtcbiAgaWYgKCFsZWFkaW5nQ29tbWVudHMgfHwgbGVhZGluZ0NvbW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgY29tbWVudCA9IGxlYWRpbmdDb21tZW50c1swXTtcbiAgaWYgKGNvbW1lbnQua2luZCAhPT0gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBPbmx5IGNvbW1lbnRzIHNlcGFyYXRlZCB3aXRoIGEgXFxuXFxuIGZyb20gdGhlIGZpbGUgY29udGVudHMgYXJlIGNvbnNpZGVyZWQgZmlsZS1sZXZlbCBjb21tZW50c1xuICAvLyBpbiBUeXBlU2NyaXB0LlxuICBpZiAodGV4dC5zdWJzdHJpbmcoY29tbWVudC5lbmQsIGNvbW1lbnQuZW5kICsgMikgIT09ICdcXG5cXG4nKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBjb21tZW50VGV4dCA9IHRleHQuc3Vic3RyaW5nKGNvbW1lbnQucG9zLCBjb21tZW50LmVuZCk7XG4gIC8vIENsb3N1cmUgQ29tcGlsZXIgaWdub3JlcyBAc3VwcHJlc3MgYW5kIHNpbWlsYXIgaWYgdGhlIGNvbW1lbnQgY29udGFpbnMgQGxpY2Vuc2UuXG4gIGlmIChjb21tZW50VGV4dC5pbmRleE9mKCdAbGljZW5zZScpICE9PSAtMSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIGNvbW1lbnRUZXh0O1xufVxuIl19