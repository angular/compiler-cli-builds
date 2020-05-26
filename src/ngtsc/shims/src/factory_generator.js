(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/shims/src/factory_generator", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/shims/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.generatedFactoryTransform = exports.FactoryGenerator = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/util");
    var TS_DTS_SUFFIX = /(\.d)?\.ts$/;
    var STRIP_NG_FACTORY = /(.*)NgFactory$/;
    /**
     * Generates ts.SourceFiles which contain variable declarations for NgFactories for every exported
     * class of an input ts.SourceFile.
     */
    var FactoryGenerator = /** @class */ (function () {
        function FactoryGenerator() {
            this.sourceInfo = new Map();
            this.sourceToFactorySymbols = new Map();
            this.shouldEmit = true;
            this.extensionPrefix = 'ngfactory';
        }
        FactoryGenerator.prototype.generateShimForFile = function (sf, genFilePath) {
            var absoluteSfPath = file_system_1.absoluteFromSourceFile(sf);
            var relativePathToSource = './' + file_system_1.basename(sf.fileName).replace(TS_DTS_SUFFIX, '');
            // Collect a list of classes that need to have factory types emitted for them. This list is
            // overly broad as at this point the ts.TypeChecker hasn't been created, and can't be used to
            // semantically understand which decorated types are actually decorated with Angular decorators.
            //
            // The exports generated here are pruned in the factory transform during emit.
            var symbolNames = sf.statements
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
            var leadingComment = getFileoverviewComment(sf);
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
            var genFile = ts.createSourceFile(genFilePath, sourceText, sf.languageVersion, true, ts.ScriptKind.TS);
            if (sf.moduleName !== undefined) {
                genFile.moduleName = util_1.generatedModuleName(sf.moduleName, sf.fileName, '.ngfactory');
            }
            var moduleSymbolNames = new Set();
            this.sourceToFactorySymbols.set(absoluteSfPath, moduleSymbolNames);
            this.sourceInfo.set(genFilePath, { sourceFilePath: absoluteSfPath, moduleSymbolNames: moduleSymbolNames });
            return genFile;
        };
        FactoryGenerator.prototype.track = function (sf, factorySymbolName) {
            if (this.sourceToFactorySymbols.has(sf.fileName)) {
                this.sourceToFactorySymbols.get(sf.fileName).add(factorySymbolName);
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeV9nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zL3NyYy9mYWN0b3J5X2dlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLDJFQUFtRjtJQUluRix1RUFBMkM7SUFFM0MsSUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDO0lBQ3BDLElBQU0sZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7SUFnQjFDOzs7T0FHRztJQUNIO1FBQUE7WUFDVyxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7WUFDN0MsMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7WUFFdkQsZUFBVSxHQUFHLElBQUksQ0FBQztZQUNsQixvQkFBZSxHQUFHLFdBQVcsQ0FBQztRQXdFekMsQ0FBQztRQXRFQyw4Q0FBbUIsR0FBbkIsVUFBb0IsRUFBaUIsRUFBRSxXQUEyQjtZQUNoRSxJQUFNLGNBQWMsR0FBRyxvQ0FBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVsRCxJQUFNLG9CQUFvQixHQUFHLElBQUksR0FBRyxzQkFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3JGLDJGQUEyRjtZQUMzRiw2RkFBNkY7WUFDN0YsZ0dBQWdHO1lBQ2hHLEVBQUU7WUFDRiw4RUFBOEU7WUFDOUUsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLFVBQVU7Z0JBQ1QsMkNBQTJDO2lCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDO2dCQUM5QixrREFBa0Q7aUJBQ2pELE1BQU0sQ0FDSCxVQUFBLElBQUksSUFBSSxPQUFBLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFB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QUFFLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRXhELElBQU0sZUFBZSxHQUFHLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLGVBQWUsSUFBSSxlQUFlLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNwRCxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsSUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLHNCQUFzQixFQUFFO1lBQ3pELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxnR0FBZ0c7UUFDaEcsaUJBQWlCO1FBQ2pCLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssTUFBTSxFQUFFO1lBQzNELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzdELG1GQUFtRjtRQUNuRixJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDMUMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRoLCBiYXNlbmFtZX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge1BlckZpbGVTaGltR2VuZXJhdG9yfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge2dlbmVyYXRlZE1vZHVsZU5hbWV9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IFRTX0RUU19TVUZGSVggPSAvKFxcLmQpP1xcLnRzJC87XG5jb25zdCBTVFJJUF9OR19GQUNUT1JZID0gLyguKilOZ0ZhY3RvcnkkLztcblxuLyoqXG4gKiBNYWludGFpbnMgYSBtYXBwaW5nIG9mIHdoaWNoIHN5bWJvbHMgaW4gYSAubmdmYWN0b3J5IGZpbGUgaGF2ZSBiZWVuIHVzZWQuXG4gKlxuICogLm5nZmFjdG9yeSBmaWxlcyBhcmUgZ2VuZXJhdGVkIHdpdGggb25lIHN5bWJvbCBwZXIgZGVmaW5lZCBjbGFzcyBpbiB0aGUgc291cmNlIGZpbGUsIHJlZ2FyZGxlc3NcbiAqIG9mIHdoZXRoZXIgdGhlIGNsYXNzZXMgaW4gdGhlIHNvdXJjZSBmaWxlcyBhcmUgTmdNb2R1bGVzIChiZWNhdXNlIHRoYXQgaXNuJ3Qga25vd24gYXQgdGhlIHRpbWVcbiAqIHRoZSBmYWN0b3J5IGZpbGVzIGFyZSBnZW5lcmF0ZWQpLiBBIGBGYWN0b3J5VHJhY2tlcmAgc3VwcG9ydHMgcmVtb3ZpbmcgZmFjdG9yeSBzeW1ib2xzIHdoaWNoXG4gKiBkaWRuJ3QgZW5kIHVwIGJlaW5nIE5nTW9kdWxlcywgYnkgdHJhY2tpbmcgdGhlIG9uZXMgd2hpY2ggYXJlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEZhY3RvcnlUcmFja2VyIHtcbiAgcmVhZG9ubHkgc291cmNlSW5mbzogTWFwPHN0cmluZywgRmFjdG9yeUluZm8+O1xuXG4gIHRyYWNrKHNmOiB0cy5Tb3VyY2VGaWxlLCBmYWN0b3J5U3ltYm9sTmFtZTogc3RyaW5nKTogdm9pZDtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgdHMuU291cmNlRmlsZXMgd2hpY2ggY29udGFpbiB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgZm9yIE5nRmFjdG9yaWVzIGZvciBldmVyeSBleHBvcnRlZFxuICogY2xhc3Mgb2YgYW4gaW5wdXQgdHMuU291cmNlRmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEZhY3RvcnlHZW5lcmF0b3IgaW1wbGVtZW50cyBQZXJGaWxlU2hpbUdlbmVyYXRvciwgRmFjdG9yeVRyYWNrZXIge1xuICByZWFkb25seSBzb3VyY2VJbmZvID0gbmV3IE1hcDxzdHJpbmcsIEZhY3RvcnlJbmZvPigpO1xuICBwcml2YXRlIHNvdXJjZVRvRmFjdG9yeVN5bWJvbHMgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7XG5cbiAgcmVhZG9ubHkgc2hvdWxkRW1pdCA9IHRydWU7XG4gIHJlYWRvbmx5IGV4dGVuc2lvblByZWZpeCA9ICduZ2ZhY3RvcnknO1xuXG4gIGdlbmVyYXRlU2hpbUZvckZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUsIGdlbkZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHRzLlNvdXJjZUZpbGUge1xuICAgIGNvbnN0IGFic29sdXRlU2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG5cbiAgICBjb25zdCByZWxhdGl2ZVBhdGhUb1NvdXJjZSA9ICcuLycgKyBiYXNlbmFtZShzZi5maWxlTmFtZSkucmVwbGFjZShUU19EVFNfU1VGRklYLCAnJyk7XG4gICAgLy8gQ29sbGVjdCBhIGxpc3Qgb2YgY2xhc3NlcyB0aGF0IG5lZWQgdG8gaGF2ZSBmYWN0b3J5IHR5cGVzIGVtaXR0ZWQgZm9yIHRoZW0uIFRoaXMgbGlzdCBpc1xuICAgIC8vIG92ZXJseSBicm9hZCBhcyBhdCB0aGlzIHBvaW50IHRoZSB0cy5UeXBlQ2hlY2tlciBoYXNuJ3QgYmVlbiBjcmVhdGVkLCBhbmQgY2FuJ3QgYmUgdXNlZCB0b1xuICAgIC8vIHNlbWFudGljYWxseSB1bmRlcnN0YW5kIHdoaWNoIGRlY29yYXRlZCB0eXBlcyBhcmUgYWN0dWFsbHkgZGVjb3JhdGVkIHdpdGggQW5ndWxhciBkZWNvcmF0b3JzLlxuICAgIC8vXG4gICAgLy8gVGhlIGV4cG9ydHMgZ2VuZXJhdGVkIGhlcmUgYXJlIHBydW5lZCBpbiB0aGUgZmFjdG9yeSB0cmFuc2Zvcm0gZHVyaW5nIGVtaXQuXG4gICAgY29uc3Qgc3ltYm9sTmFtZXMgPSBzZi5zdGF0ZW1lbnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUGljayBvdXQgdG9wIGxldmVsIGNsYXNzIGRlY2xhcmF0aW9ucy4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIodHMuaXNDbGFzc0RlY2xhcmF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdoaWNoIGFyZSBuYW1lZCwgZXhwb3J0ZWQsIGFuZCBoYXZlIGRlY29yYXRvcnMuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVjbCA9PiBpc0V4cG9ydGVkKGRlY2wpICYmIGRlY2wuZGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWNsLm5hbWUgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHcmFiIHRoZSBzeW1ib2wgbmFtZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGRlY2wgPT4gZGVjbC5uYW1lIS50ZXh0KTtcblxuXG4gICAgbGV0IHNvdXJjZVRleHQgPSAnJztcblxuICAgIC8vIElmIHRoZXJlIGlzIGEgdG9wLWxldmVsIGNvbW1lbnQgaW4gdGhlIG9yaWdpbmFsIGZpbGUsIGNvcHkgaXQgb3ZlciBhdCB0aGUgdG9wIG9mIHRoZVxuICAgIC8vIGdlbmVyYXRlZCBmYWN0b3J5IGZpbGUuIFRoaXMgaXMgaW1wb3J0YW50IGZvciBwcmVzZXJ2aW5nIGFueSBsb2FkLWJlYXJpbmcganNkb2MgY29tbWVudHMuXG4gICAgY29uc3QgbGVhZGluZ0NvbW1lbnQgPSBnZXRGaWxlb3ZlcnZpZXdDb21tZW50KHNmKTtcbiAgICBpZiAobGVhZGluZ0NvbW1lbnQgIT09IG51bGwpIHtcbiAgICAgIC8vIExlYWRpbmcgY29tbWVudHMgbXVzdCBiZSBzZXBhcmF0ZWQgZnJvbSB0aGUgcmVzdCBvZiB0aGUgY29udGVudHMgYnkgYSBibGFuayBsaW5lLlxuICAgICAgc291cmNlVGV4dCA9IGxlYWRpbmdDb21tZW50ICsgJ1xcblxcbic7XG4gICAgfVxuXG4gICAgaWYgKHN5bWJvbE5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIEZvciBlYWNoIHN5bWJvbCBuYW1lLCBnZW5lcmF0ZSBhIGNvbnN0YW50IGV4cG9ydCBvZiB0aGUgY29ycmVzcG9uZGluZyBOZ0ZhY3RvcnkuXG4gICAgICAvLyBUaGlzIHdpbGwgZW5jb21wYXNzIGEgbG90IG9mIHN5bWJvbHMgd2hpY2ggZG9uJ3QgbmVlZCBmYWN0b3JpZXMsIGJ1dCB0aGF0J3Mgb2theVxuICAgICAgLy8gYmVjYXVzZSBpdCB3b24ndCBtaXNzIGFueSB0aGF0IGRvLlxuICAgICAgY29uc3QgdmFyTGluZXMgPSBzeW1ib2xOYW1lcy5tYXAoXG4gICAgICAgICAgbmFtZSA9PiBgZXhwb3J0IGNvbnN0ICR7XG4gICAgICAgICAgICAgIG5hbWV9TmdGYWN0b3J5OiBpMC7JtU5nTW9kdWxlRmFjdG9yeTxhbnk+ID0gbmV3IGkwLsm1TmdNb2R1bGVGYWN0b3J5KCR7bmFtZX0pO2ApO1xuICAgICAgc291cmNlVGV4dCArPSBbXG4gICAgICAgIC8vIFRoaXMgbWlnaHQgYmUgaW5jb3JyZWN0IGlmIHRoZSBjdXJyZW50IHBhY2thZ2UgYmVpbmcgY29tcGlsZWQgaXMgQW5ndWxhciBjb3JlLCBidXQgaXQnc1xuICAgICAgICAvLyBva2F5IHRvIGxlYXZlIGluIGF0IHR5cGUgY2hlY2tpbmcgdGltZS4gVHlwZVNjcmlwdCBjYW4gaGFuZGxlIHRoaXMgcmVmZXJlbmNlIHZpYSBpdHMgcGF0aFxuICAgICAgICAvLyBtYXBwaW5nLCBidXQgZG93bnN0cmVhbSBidW5kbGVycyBjYW4ndC4gSWYgdGhlIGN1cnJlbnQgcGFja2FnZSBpcyBjb3JlIGl0c2VsZiwgdGhpcyB3aWxsXG4gICAgICAgIC8vIGJlIHJlcGxhY2VkIGluIHRoZSBmYWN0b3J5IHRyYW5zZm9ybWVyIGJlZm9yZSBlbWl0LlxuICAgICAgICBgaW1wb3J0ICogYXMgaTAgZnJvbSAnQGFuZ3VsYXIvY29yZSc7YCxcbiAgICAgICAgYGltcG9ydCB7JHtzeW1ib2xOYW1lcy5qb2luKCcsICcpfX0gZnJvbSAnJHtyZWxhdGl2ZVBhdGhUb1NvdXJjZX0nO2AsXG4gICAgICAgIC4uLnZhckxpbmVzLFxuICAgICAgXS5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgYW4gZXh0cmEgZXhwb3J0IHRvIGVuc3VyZSB0aGlzIG1vZHVsZSBoYXMgYXQgbGVhc3Qgb25lLiBJdCdsbCBiZSByZW1vdmVkIGxhdGVyIGluIHRoZVxuICAgIC8vIGZhY3RvcnkgdHJhbnNmb3JtZXIgaWYgaXQgZW5kcyB1cCBub3QgYmVpbmcgbmVlZGVkLlxuICAgIHNvdXJjZVRleHQgKz0gJ1xcbmV4cG9ydCBjb25zdCDJtU5vbkVtcHR5TW9kdWxlID0gdHJ1ZTsnO1xuXG4gICAgY29uc3QgZ2VuRmlsZSA9XG4gICAgICAgIHRzLmNyZWF0ZVNvdXJjZUZpbGUoZ2VuRmlsZVBhdGgsIHNvdXJjZVRleHQsIHNmLmxhbmd1YWdlVmVyc2lvbiwgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UUyk7XG4gICAgaWYgKHNmLm1vZHVsZU5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZ2VuRmlsZS5tb2R1bGVOYW1lID0gZ2VuZXJhdGVkTW9kdWxlTmFtZShzZi5tb2R1bGVOYW1lLCBzZi5maWxlTmFtZSwgJy5uZ2ZhY3RvcnknKTtcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGVTeW1ib2xOYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scy5zZXQoYWJzb2x1dGVTZlBhdGgsIG1vZHVsZVN5bWJvbE5hbWVzKTtcbiAgICB0aGlzLnNvdXJjZUluZm8uc2V0KGdlbkZpbGVQYXRoLCB7c291cmNlRmlsZVBhdGg6IGFic29sdXRlU2ZQYXRoLCBtb2R1bGVTeW1ib2xOYW1lc30pO1xuXG4gICAgcmV0dXJuIGdlbkZpbGU7XG4gIH1cblxuICB0cmFjayhzZjogdHMuU291cmNlRmlsZSwgZmFjdG9yeVN5bWJvbE5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMuaGFzKHNmLmZpbGVOYW1lKSkge1xuICAgICAgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzLmdldChzZi5maWxlTmFtZSkhLmFkZChmYWN0b3J5U3ltYm9sTmFtZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzRXhwb3J0ZWQoZGVjbDogdHMuRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIGRlY2wubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIGRlY2wubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRmFjdG9yeUluZm8ge1xuICBzb3VyY2VGaWxlUGF0aDogc3RyaW5nO1xuICBtb2R1bGVTeW1ib2xOYW1lczogU2V0PHN0cmluZz47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtKFxuICAgIGZhY3RvcnlNYXA6IE1hcDxzdHJpbmcsIEZhY3RvcnlJbmZvPixcbiAgICBpbXBvcnRSZXdyaXRlcjogSW1wb3J0UmV3cml0ZXIpOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6IHRzLlRyYW5zZm9ybWVyPHRzLlNvdXJjZUZpbGU+ID0+IHtcbiAgICByZXR1cm4gKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlID0+IHtcbiAgICAgIHJldHVybiB0cmFuc2Zvcm1GYWN0b3J5U291cmNlRmlsZShmYWN0b3J5TWFwLCBjb250ZXh0LCBpbXBvcnRSZXdyaXRlciwgZmlsZSk7XG4gICAgfTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtRmFjdG9yeVNvdXJjZUZpbGUoXG4gICAgZmFjdG9yeU1hcDogTWFwPHN0cmluZywgRmFjdG9yeUluZm8+LCBjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQsXG4gICAgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gIC8vIElmIHRoaXMgaXMgbm90IGEgZ2VuZXJhdGVkIGZpbGUsIGl0IHdvbid0IGhhdmUgZmFjdG9yeSBpbmZvIGFzc29jaWF0ZWQgd2l0aCBpdC5cbiAgaWYgKCFmYWN0b3J5TWFwLmhhcyhmaWxlLmZpbGVOYW1lKSkge1xuICAgIC8vIERvbid0IHRyYW5zZm9ybSBub24tZ2VuZXJhdGVkIGNvZGUuXG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBjb25zdCB7bW9kdWxlU3ltYm9sTmFtZXMsIHNvdXJjZUZpbGVQYXRofSA9IGZhY3RvcnlNYXAuZ2V0KGZpbGUuZmlsZU5hbWUpITtcblxuICBmaWxlID0gdHMuZ2V0TXV0YWJsZUNsb25lKGZpbGUpO1xuXG4gIC8vIE5vdCBldmVyeSBleHBvcnRlZCBmYWN0b3J5IHN0YXRlbWVudCBpcyB2YWxpZC4gVGhleSB3ZXJlIGdlbmVyYXRlZCBiZWZvcmUgdGhlIHByb2dyYW0gd2FzXG4gIC8vIGFuYWx5emVkLCBhbmQgYmVmb3JlIG5ndHNjIGtuZXcgd2hpY2ggc3ltYm9scyB3ZXJlIGFjdHVhbGx5IE5nTW9kdWxlcy4gZmFjdG9yeU1hcCBjb250YWluc1xuICAvLyB0aGF0IGtub3dsZWRnZSBub3csIHNvIHRoaXMgdHJhbnNmb3JtIGZpbHRlcnMgdGhlIHN0YXRlbWVudCBsaXN0IGFuZCByZW1vdmVzIGV4cG9ydGVkIGZhY3Rvcmllc1xuICAvLyB0aGF0IGFyZW4ndCBhY3R1YWxseSBmYWN0b3JpZXMuXG4gIC8vXG4gIC8vIFRoaXMgY291bGQgbGVhdmUgdGhlIGdlbmVyYXRlZCBmYWN0b3J5IGZpbGUgZW1wdHkuIFRvIHByZXZlbnQgdGhpcyAoaXQgY2F1c2VzIGlzc3VlcyB3aXRoXG4gIC8vIGNsb3N1cmUgY29tcGlsZXIpIGEgJ8m1Tm9uRW1wdHlNb2R1bGUnIGV4cG9ydCB3YXMgYWRkZWQgd2hlbiB0aGUgZmFjdG9yeSBzaGltIHdhcyBjcmVhdGVkLlxuICAvLyBQcmVzZXJ2ZSB0aGF0IGV4cG9ydCBpZiBuZWVkZWQsIGFuZCByZW1vdmUgaXQgb3RoZXJ3aXNlLlxuICAvL1xuICAvLyBBZGRpdGlvbmFsbHksIGFuIGltcG9ydCB0byBAYW5ndWxhci9jb3JlIGlzIGdlbmVyYXRlZCwgYnV0IHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgY291bGRcbiAgLy8gYWN0dWFsbHkgYmUgQGFuZ3VsYXIvY29yZSwgaW4gd2hpY2ggY2FzZSBzdWNoIGFuIGltcG9ydCBpcyBpbnZhbGlkIGFuZCBzaG91bGQgYmUgcmVwbGFjZWQgd2l0aFxuICAvLyB0aGUgcHJvcGVyIHBhdGggdG8gYWNjZXNzIEl2eSBzeW1ib2xzIGluIGNvcmUuXG5cbiAgLy8gVGhlIGZpbHRlcmVkIHNldCBvZiBzdGF0ZW1lbnRzLlxuICBjb25zdCB0cmFuc2Zvcm1lZFN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdID0gW107XG5cbiAgLy8gVGhlIHN0YXRlbWVudCBpZGVudGlmaWVkIGFzIHRoZSDJtU5vbkVtcHR5TW9kdWxlIGV4cG9ydC5cbiAgbGV0IG5vbkVtcHR5RXhwb3J0OiB0cy5TdGF0ZW1lbnR8bnVsbCA9IG51bGw7XG5cbiAgLy8gRXh0cmFjdGVkIGlkZW50aWZpZXJzIHdoaWNoIHJlZmVyIHRvIGltcG9ydCBzdGF0ZW1lbnRzIGZyb20gQGFuZ3VsYXIvY29yZS5cbiAgY29uc3QgY29yZUltcG9ydElkZW50aWZpZXJzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgLy8gQ29uc2lkZXIgYWxsIHRoZSBzdGF0ZW1lbnRzLlxuICBmb3IgKGNvbnN0IHN0bXQgb2YgZmlsZS5zdGF0ZW1lbnRzKSB7XG4gICAgLy8gTG9vayBmb3IgaW1wb3J0cyB0byBAYW5ndWxhci9jb3JlLlxuICAgIGlmICh0cy5pc0ltcG9ydERlY2xhcmF0aW9uKHN0bXQpICYmIHRzLmlzU3RyaW5nTGl0ZXJhbChzdG10Lm1vZHVsZVNwZWNpZmllcikgJiZcbiAgICAgICAgc3RtdC5tb2R1bGVTcGVjaWZpZXIudGV4dCA9PT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICAvLyBVcGRhdGUgdGhlIGltcG9ydCBwYXRoIHRvIHBvaW50IHRvIHRoZSBjb3JyZWN0IGZpbGUgdXNpbmcgdGhlIEltcG9ydFJld3JpdGVyLlxuICAgICAgY29uc3QgcmV3cml0dGVuTW9kdWxlU3BlY2lmaWVyID1cbiAgICAgICAgICBpbXBvcnRSZXdyaXRlci5yZXdyaXRlU3BlY2lmaWVyKCdAYW5ndWxhci9jb3JlJywgc291cmNlRmlsZVBhdGgpO1xuICAgICAgaWYgKHJld3JpdHRlbk1vZHVsZVNwZWNpZmllciAhPT0gc3RtdC5tb2R1bGVTcGVjaWZpZXIudGV4dCkge1xuICAgICAgICB0cmFuc2Zvcm1lZFN0YXRlbWVudHMucHVzaCh0cy51cGRhdGVJbXBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICAgIHN0bXQsIHN0bXQuZGVjb3JhdG9ycywgc3RtdC5tb2RpZmllcnMsIHN0bXQuaW1wb3J0Q2xhdXNlLFxuICAgICAgICAgICAgdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChyZXdyaXR0ZW5Nb2R1bGVTcGVjaWZpZXIpKSk7XG5cbiAgICAgICAgLy8gUmVjb3JkIHRoZSBpZGVudGlmaWVyIGJ5IHdoaWNoIHRoaXMgaW1wb3J0ZWQgbW9kdWxlIGdvZXMsIHNvIHJlZmVyZW5jZXMgdG8gaXRzIHN5bWJvbHNcbiAgICAgICAgLy8gY2FuIGJlIGRpc2NvdmVyZWQgbGF0ZXIuXG4gICAgICAgIGlmIChzdG10LmltcG9ydENsYXVzZSAhPT0gdW5kZWZpbmVkICYmIHN0bXQuaW1wb3J0Q2xhdXNlLm5hbWVkQmluZGluZ3MgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgdHMuaXNOYW1lc3BhY2VJbXBvcnQoc3RtdC5pbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncykpIHtcbiAgICAgICAgICBjb3JlSW1wb3J0SWRlbnRpZmllcnMuYWRkKHN0bXQuaW1wb3J0Q2xhdXNlLm5hbWVkQmluZGluZ3MubmFtZS50ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJhbnNmb3JtZWRTdGF0ZW1lbnRzLnB1c2goc3RtdCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0bXQpICYmIHN0bXQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICAgIGNvbnN0IGRlY2wgPSBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnNbMF07XG5cbiAgICAgIC8vIElmIHRoaXMgaXMgdGhlIMm1Tm9uRW1wdHlNb2R1bGUgZXhwb3J0LCB0aGVuIHNhdmUgaXQgZm9yIGxhdGVyLlxuICAgICAgaWYgKHRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpKSB7XG4gICAgICAgIGlmIChkZWNsLm5hbWUudGV4dCA9PT0gJ8m1Tm9uRW1wdHlNb2R1bGUnKSB7XG4gICAgICAgICAgbm9uRW1wdHlFeHBvcnQgPSBzdG10O1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT3RoZXJ3aXNlLCBjaGVjayBpZiB0aGlzIGV4cG9ydCBpcyBhIGZhY3RvcnkgZm9yIGEga25vd24gTmdNb2R1bGUsIGFuZCByZXRhaW4gaXQgaWYgc28uXG4gICAgICAgIGNvbnN0IG1hdGNoID0gU1RSSVBfTkdfRkFDVE9SWS5leGVjKGRlY2wubmFtZS50ZXh0KTtcbiAgICAgICAgaWYgKG1hdGNoICE9PSBudWxsICYmIG1vZHVsZVN5bWJvbE5hbWVzLmhhcyhtYXRjaFsxXSkpIHtcbiAgICAgICAgICB0cmFuc2Zvcm1lZFN0YXRlbWVudHMucHVzaChzdG10KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTGVhdmUgdGhlIHN0YXRlbWVudCBhbG9uZSwgYXMgaXQgY2FuJ3QgYmUgdW5kZXJzdG9vZC5cbiAgICAgICAgdHJhbnNmb3JtZWRTdGF0ZW1lbnRzLnB1c2goc3RtdCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEluY2x1ZGUgbm9uLXZhcmlhYmxlIHN0YXRlbWVudHMgKGltcG9ydHMsIGV0YykuXG4gICAgICB0cmFuc2Zvcm1lZFN0YXRlbWVudHMucHVzaChzdG10KTtcbiAgICB9XG4gIH1cblxuICAvLyBDaGVjayB3aGV0aGVyIHRoZSBlbXB0eSBtb2R1bGUgZXhwb3J0IGlzIHN0aWxsIG5lZWRlZC5cbiAgaWYgKCF0cmFuc2Zvcm1lZFN0YXRlbWVudHMuc29tZSh0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KSAmJiBub25FbXB0eUV4cG9ydCAhPT0gbnVsbCkge1xuICAgIC8vIElmIHRoZSByZXN1bHRpbmcgZmlsZSBoYXMgbm8gZmFjdG9yaWVzLCBpbmNsdWRlIGFuIGVtcHR5IGV4cG9ydCB0b1xuICAgIC8vIHNhdGlzZnkgY2xvc3VyZSBjb21waWxlci5cbiAgICB0cmFuc2Zvcm1lZFN0YXRlbWVudHMucHVzaChub25FbXB0eUV4cG9ydCk7XG4gIH1cbiAgZmlsZS5zdGF0ZW1lbnRzID0gdHMuY3JlYXRlTm9kZUFycmF5KHRyYW5zZm9ybWVkU3RhdGVtZW50cyk7XG5cbiAgLy8gSWYgYW55IGltcG9ydHMgdG8gQGFuZ3VsYXIvY29yZSB3ZXJlIGRldGVjdGVkIGFuZCByZXdyaXR0ZW4gKHdoaWNoIGhhcHBlbnMgd2hlbiBjb21waWxpbmdcbiAgLy8gQGFuZ3VsYXIvY29yZSksIGdvIHRocm91Z2ggdGhlIFNvdXJjZUZpbGUgYW5kIHJld3JpdGUgcmVmZXJlbmNlcyB0byBzeW1ib2xzIGltcG9ydGVkIGZyb20gY29yZS5cbiAgaWYgKGNvcmVJbXBvcnRJZGVudGlmaWVycy5zaXplID4gMCkge1xuICAgIGNvbnN0IHZpc2l0ID0gPFQgZXh0ZW5kcyB0cy5Ob2RlPihub2RlOiBUKTogVCA9PiB7XG4gICAgICBub2RlID0gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgY2hpbGQgPT4gdmlzaXQoY2hpbGQpLCBjb250ZXh0KTtcblxuICAgICAgLy8gTG9vayBmb3IgZXhwcmVzc2lvbnMgb2YgdGhlIGZvcm0gXCJpLnNcIiB3aGVyZSAnaScgaXMgYSBkZXRlY3RlZCBuYW1lIGZvciBhbiBAYW5ndWxhci9jb3JlXG4gICAgICAvLyBpbXBvcnQgdGhhdCB3YXMgY2hhbmdlZCBhYm92ZS4gUmV3cml0ZSAncycgdXNpbmcgdGhlIEltcG9ydFJlc29sdmVyLlxuICAgICAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpICYmIHRzLmlzSWRlbnRpZmllcihub2RlLmV4cHJlc3Npb24pICYmXG4gICAgICAgICAgY29yZUltcG9ydElkZW50aWZpZXJzLmhhcyhub2RlLmV4cHJlc3Npb24udGV4dCkpIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhbiBpbXBvcnQgb2YgYSBzeW1ib2wgZnJvbSBAYW5ndWxhci9jb3JlLiBUcmFuc2Zvcm0gaXQgd2l0aCB0aGUgaW1wb3J0UmV3cml0ZXIuXG4gICAgICAgIGNvbnN0IHJld3JpdHRlblN5bWJvbCA9IGltcG9ydFJld3JpdGVyLnJld3JpdGVTeW1ib2wobm9kZS5uYW1lLnRleHQsICdAYW5ndWxhci9jb3JlJyk7XG4gICAgICAgIGlmIChyZXdyaXR0ZW5TeW1ib2wgIT09IG5vZGUubmFtZS50ZXh0KSB7XG4gICAgICAgICAgY29uc3QgdXBkYXRlZCA9XG4gICAgICAgICAgICAgIHRzLnVwZGF0ZVByb3BlcnR5QWNjZXNzKG5vZGUsIG5vZGUuZXhwcmVzc2lvbiwgdHMuY3JlYXRlSWRlbnRpZmllcihyZXdyaXR0ZW5TeW1ib2wpKTtcbiAgICAgICAgICBub2RlID0gdXBkYXRlZCBhcyBUICYgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9O1xuXG4gICAgZmlsZSA9IHZpc2l0KGZpbGUpO1xuICB9XG5cbiAgcmV0dXJuIGZpbGU7XG59XG5cblxuLyoqXG4gKiBQYXJzZXMgYW5kIHJldHVybnMgdGhlIGNvbW1lbnQgdGV4dCBvZiBhIFxcQGZpbGVvdmVydmlldyBjb21tZW50IGluIHRoZSBnaXZlbiBzb3VyY2UgZmlsZS5cbiAqL1xuZnVuY3Rpb24gZ2V0RmlsZW92ZXJ2aWV3Q29tbWVudChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nfG51bGwge1xuICBjb25zdCB0ZXh0ID0gc291cmNlRmlsZS5nZXRGdWxsVGV4dCgpO1xuICBjb25zdCB0cml2aWEgPSB0ZXh0LnN1YnN0cmluZygwLCBzb3VyY2VGaWxlLmdldFN0YXJ0KCkpO1xuXG4gIGNvbnN0IGxlYWRpbmdDb21tZW50cyA9IHRzLmdldExlYWRpbmdDb21tZW50UmFuZ2VzKHRyaXZpYSwgMCk7XG4gIGlmICghbGVhZGluZ0NvbW1lbnRzIHx8IGxlYWRpbmdDb21tZW50cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGNvbW1lbnQgPSBsZWFkaW5nQ29tbWVudHNbMF07XG4gIGlmIChjb21tZW50LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gT25seSBjb21tZW50cyBzZXBhcmF0ZWQgd2l0aCBhIFxcblxcbiBmcm9tIHRoZSBmaWxlIGNvbnRlbnRzIGFyZSBjb25zaWRlcmVkIGZpbGUtbGV2ZWwgY29tbWVudHNcbiAgLy8gaW4gVHlwZVNjcmlwdC5cbiAgaWYgKHRleHQuc3Vic3RyaW5nKGNvbW1lbnQuZW5kLCBjb21tZW50LmVuZCArIDIpICE9PSAnXFxuXFxuJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgY29tbWVudFRleHQgPSB0ZXh0LnN1YnN0cmluZyhjb21tZW50LnBvcywgY29tbWVudC5lbmQpO1xuICAvLyBDbG9zdXJlIENvbXBpbGVyIGlnbm9yZXMgQHN1cHByZXNzIGFuZCBzaW1pbGFyIGlmIHRoZSBjb21tZW50IGNvbnRhaW5zIEBsaWNlbnNlLlxuICBpZiAoY29tbWVudFRleHQuaW5kZXhPZignQGxpY2Vuc2UnKSAhPT0gLTEpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiBjb21tZW50VGV4dDtcbn1cbiJdfQ==