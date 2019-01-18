/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/shims/src/factory_generator", ["require", "exports", "tslib", "path", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/shims/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var path = require("path");
    var ts = require("typescript");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
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
        FactoryGenerator.prototype.recognize = function (fileName) { return this.map.has(fileName); };
        FactoryGenerator.prototype.generate = function (genFilePath, readFile) {
            var originalPath = this.map.get(genFilePath);
            var original = readFile(originalPath);
            if (original === null) {
                return null;
            }
            var relativePathToSource = './' + path.posix.basename(original.fileName).replace(TS_DTS_SUFFIX, '');
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
            if (symbolNames.length > 0) {
                // For each symbol name, generate a constant export of the corresponding NgFactory.
                // This will encompass a lot of symbols which don't need factories, but that's okay
                // because it won't miss any that do.
                var varLines = symbolNames.map(function (name) { return "export const " + name + "NgFactory = new i0.\u0275NgModuleFactory(" + name + ");"; });
                sourceText = tslib_1.__spread([
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
                .map(function (sourceFile) { return path_1.normalizeSeparators(sourceFile); })
                .forEach(function (sourceFile) { return map.set(sourceFile.replace(/\.ts$/, '.ngfactory.ts'), sourceFile); });
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeV9nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zL3NyYy9mYWN0b3J5X2dlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBR2pDLHNFQUF3RDtJQUN4RCxrRkFBaUU7SUFHakUsdUVBQTJDO0lBRTNDLElBQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQztJQUNwQyxJQUFNLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO0lBRTFDOzs7T0FHRztJQUNIO1FBQ0UsMEJBQTRCLEdBQXdCO1lBQXhCLFFBQUcsR0FBSCxHQUFHLENBQXFCO1FBQUcsQ0FBQztRQUV4RCxzQkFBSSw0Q0FBYztpQkFBbEIsY0FBNEMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFFOUQsb0NBQVMsR0FBVCxVQUFVLFFBQWdCLElBQWEsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkUsbUNBQVEsR0FBUixVQUFTLFdBQW1CLEVBQUUsUUFBb0Q7WUFFaEYsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFHLENBQUM7WUFDakQsSUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3hDLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDckIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sb0JBQW9CLEdBQ3RCLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxF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QUFrRztRQUNsRyxJQUFJLHFCQUFxQixDQUFDLElBQUksR0FBRyxDQUFDLEVBQUU7WUFDbEMsSUFBTSxPQUFLLEdBQUcsVUFBb0IsSUFBTztnQkFDdkMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFVBQUEsS0FBSyxJQUFJLE9BQUEsT0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFaLENBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFFL0QsMkZBQTJGO2dCQUMzRix1RUFBdUU7Z0JBQ3ZFLElBQUksRUFBRSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztvQkFDdkUscUJBQXFCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ25ELDBGQUEwRjtvQkFDMUYsSUFBTSxlQUFlLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztvQkFDdEYsSUFBSSxlQUFlLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7d0JBQ3RDLElBQU0sT0FBTyxHQUNULEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQzt3QkFDekYsSUFBSSxHQUFHLE9BQTBDLENBQUM7cUJBQ25EO2lCQUNGO2dCQUNELE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxDQUFDO1lBRUYsSUFBSSxHQUFHLE9BQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNwQjtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0ltcG9ydFJld3JpdGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7bm9ybWFsaXplU2VwYXJhdG9yc30gZnJvbSAnLi4vLi4vdXRpbC9zcmMvcGF0aCc7XG5pbXBvcnQge2lzTm9uRGVjbGFyYXRpb25Uc1BhdGh9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1NoaW1HZW5lcmF0b3J9IGZyb20gJy4vaG9zdCc7XG5pbXBvcnQge2dlbmVyYXRlZE1vZHVsZU5hbWV9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IFRTX0RUU19TVUZGSVggPSAvKFxcLmQpP1xcLnRzJC87XG5jb25zdCBTVFJJUF9OR19GQUNUT1JZID0gLyguKilOZ0ZhY3RvcnkkLztcblxuLyoqXG4gKiBHZW5lcmF0ZXMgdHMuU291cmNlRmlsZXMgd2hpY2ggY29udGFpbiB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgZm9yIE5nRmFjdG9yaWVzIGZvciBldmVyeSBleHBvcnRlZFxuICogY2xhc3Mgb2YgYW4gaW5wdXQgdHMuU291cmNlRmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEZhY3RvcnlHZW5lcmF0b3IgaW1wbGVtZW50cyBTaGltR2VuZXJhdG9yIHtcbiAgcHJpdmF0ZSBjb25zdHJ1Y3Rvcihwcml2YXRlIG1hcDogTWFwPHN0cmluZywgc3RyaW5nPikge31cblxuICBnZXQgZmFjdG9yeUZpbGVNYXAoKTogTWFwPHN0cmluZywgc3RyaW5nPiB7IHJldHVybiB0aGlzLm1hcDsgfVxuXG4gIHJlY29nbml6ZShmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLm1hcC5oYXMoZmlsZU5hbWUpOyB9XG5cbiAgZ2VuZXJhdGUoZ2VuRmlsZVBhdGg6IHN0cmluZywgcmVhZEZpbGU6IChmaWxlTmFtZTogc3RyaW5nKSA9PiB0cy5Tb3VyY2VGaWxlIHwgbnVsbCk6IHRzLlNvdXJjZUZpbGVcbiAgICAgIHxudWxsIHtcbiAgICBjb25zdCBvcmlnaW5hbFBhdGggPSB0aGlzLm1hcC5nZXQoZ2VuRmlsZVBhdGgpICE7XG4gICAgY29uc3Qgb3JpZ2luYWwgPSByZWFkRmlsZShvcmlnaW5hbFBhdGgpO1xuICAgIGlmIChvcmlnaW5hbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcmVsYXRpdmVQYXRoVG9Tb3VyY2UgPVxuICAgICAgICAnLi8nICsgcGF0aC5wb3NpeC5iYXNlbmFtZShvcmlnaW5hbC5maWxlTmFtZSkucmVwbGFjZShUU19EVFNfU1VGRklYLCAnJyk7XG4gICAgLy8gQ29sbGVjdCBhIGxpc3Qgb2YgY2xhc3NlcyB0aGF0IG5lZWQgdG8gaGF2ZSBmYWN0b3J5IHR5cGVzIGVtaXR0ZWQgZm9yIHRoZW0uIFRoaXMgbGlzdCBpc1xuICAgIC8vIG92ZXJseSBicm9hZCBhcyBhdCB0aGlzIHBvaW50IHRoZSB0cy5UeXBlQ2hlY2tlciBoYXNuJ3QgYmVlbiBjcmVhdGVkLCBhbmQgY2FuJ3QgYmUgdXNlZCB0b1xuICAgIC8vIHNlbWFudGljYWxseSB1bmRlcnN0YW5kIHdoaWNoIGRlY29yYXRlZCB0eXBlcyBhcmUgYWN0dWFsbHkgZGVjb3JhdGVkIHdpdGggQW5ndWxhciBkZWNvcmF0b3JzLlxuICAgIC8vXG4gICAgLy8gVGhlIGV4cG9ydHMgZ2VuZXJhdGVkIGhlcmUgYXJlIHBydW5lZCBpbiB0aGUgZmFjdG9yeSB0cmFuc2Zvcm0gZHVyaW5nIGVtaXQuXG4gICAgY29uc3Qgc3ltYm9sTmFtZXMgPSBvcmlnaW5hbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZW1lbnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUGljayBvdXQgdG9wIGxldmVsIGNsYXNzIGRlY2xhcmF0aW9ucy4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIodHMuaXNDbGFzc0RlY2xhcmF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdoaWNoIGFyZSBuYW1lZCwgZXhwb3J0ZWQsIGFuZCBoYXZlIGRlY29yYXRvcnMuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVjbCA9PiBpc0V4cG9ydGVkKGRlY2wpICYmIGRlY2wuZGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWNsLm5hbWUgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHcmFiIHRoZSBzeW1ib2wgbmFtZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGRlY2wgPT4gZGVjbC5uYW1lICEudGV4dCk7XG5cbiAgICBsZXQgc291cmNlVGV4dCA9ICcnO1xuICAgIGlmIChzeW1ib2xOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBGb3IgZWFjaCBzeW1ib2wgbmFtZSwgZ2VuZXJhdGUgYSBjb25zdGFudCBleHBvcnQgb2YgdGhlIGNvcnJlc3BvbmRpbmcgTmdGYWN0b3J5LlxuICAgICAgLy8gVGhpcyB3aWxsIGVuY29tcGFzcyBhIGxvdCBvZiBzeW1ib2xzIHdoaWNoIGRvbid0IG5lZWQgZmFjdG9yaWVzLCBidXQgdGhhdCdzIG9rYXlcbiAgICAgIC8vIGJlY2F1c2UgaXQgd29uJ3QgbWlzcyBhbnkgdGhhdCBkby5cbiAgICAgIGNvbnN0IHZhckxpbmVzID0gc3ltYm9sTmFtZXMubWFwKFxuICAgICAgICAgIG5hbWUgPT4gYGV4cG9ydCBjb25zdCAke25hbWV9TmdGYWN0b3J5ID0gbmV3IGkwLsm1TmdNb2R1bGVGYWN0b3J5KCR7bmFtZX0pO2ApO1xuICAgICAgc291cmNlVGV4dCA9IFtcbiAgICAgICAgLy8gVGhpcyBtaWdodCBiZSBpbmNvcnJlY3QgaWYgdGhlIGN1cnJlbnQgcGFja2FnZSBiZWluZyBjb21waWxlZCBpcyBBbmd1bGFyIGNvcmUsIGJ1dCBpdCdzXG4gICAgICAgIC8vIG9rYXkgdG8gbGVhdmUgaW4gYXQgdHlwZSBjaGVja2luZyB0aW1lLiBUeXBlU2NyaXB0IGNhbiBoYW5kbGUgdGhpcyByZWZlcmVuY2UgdmlhIGl0cyBwYXRoXG4gICAgICAgIC8vIG1hcHBpbmcsIGJ1dCBkb3duc3RyZWFtIGJ1bmRsZXJzIGNhbid0LiBJZiB0aGUgY3VycmVudCBwYWNrYWdlIGlzIGNvcmUgaXRzZWxmLCB0aGlzIHdpbGxcbiAgICAgICAgLy8gYmUgcmVwbGFjZWQgaW4gdGhlIGZhY3RvcnkgdHJhbnNmb3JtZXIgYmVmb3JlIGVtaXQuXG4gICAgICAgIGBpbXBvcnQgKiBhcyBpMCBmcm9tICdAYW5ndWxhci9jb3JlJztgLFxuICAgICAgICBgaW1wb3J0IHske3N5bWJvbE5hbWVzLmpvaW4oJywgJyl9fSBmcm9tICcke3JlbGF0aXZlUGF0aFRvU291cmNlfSc7YCxcbiAgICAgICAgLi4udmFyTGluZXMsXG4gICAgICBdLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIC8vIEFkZCBhbiBleHRyYSBleHBvcnQgdG8gZW5zdXJlIHRoaXMgbW9kdWxlIGhhcyBhdCBsZWFzdCBvbmUuIEl0J2xsIGJlIHJlbW92ZWQgbGF0ZXIgaW4gdGhlXG4gICAgLy8gZmFjdG9yeSB0cmFuc2Zvcm1lciBpZiBpdCBlbmRzIHVwIG5vdCBiZWluZyBuZWVkZWQuXG4gICAgc291cmNlVGV4dCArPSAnXFxuZXhwb3J0IGNvbnN0IMm1Tm9uRW1wdHlNb2R1bGUgPSB0cnVlOyc7XG5cbiAgICBjb25zdCBnZW5GaWxlID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgZ2VuRmlsZVBhdGgsIHNvdXJjZVRleHQsIG9yaWdpbmFsLmxhbmd1YWdlVmVyc2lvbiwgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UUyk7XG4gICAgaWYgKG9yaWdpbmFsLm1vZHVsZU5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZ2VuRmlsZS5tb2R1bGVOYW1lID1cbiAgICAgICAgICBnZW5lcmF0ZWRNb2R1bGVOYW1lKG9yaWdpbmFsLm1vZHVsZU5hbWUsIG9yaWdpbmFsLmZpbGVOYW1lLCAnLm5nZmFjdG9yeScpO1xuICAgIH1cbiAgICByZXR1cm4gZ2VuRmlsZTtcbiAgfVxuXG4gIHN0YXRpYyBmb3JSb290RmlsZXMoZmlsZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPik6IEZhY3RvcnlHZW5lcmF0b3Ige1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgZmlsZXMuZmlsdGVyKHNvdXJjZUZpbGUgPT4gaXNOb25EZWNsYXJhdGlvblRzUGF0aChzb3VyY2VGaWxlKSlcbiAgICAgICAgLm1hcChzb3VyY2VGaWxlID0+IG5vcm1hbGl6ZVNlcGFyYXRvcnMoc291cmNlRmlsZSkpXG4gICAgICAgIC5mb3JFYWNoKHNvdXJjZUZpbGUgPT4gbWFwLnNldChzb3VyY2VGaWxlLnJlcGxhY2UoL1xcLnRzJC8sICcubmdmYWN0b3J5LnRzJyksIHNvdXJjZUZpbGUpKTtcbiAgICByZXR1cm4gbmV3IEZhY3RvcnlHZW5lcmF0b3IobWFwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0V4cG9ydGVkKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIHJldHVybiBkZWNsLm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICBkZWNsLm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZhY3RvcnlJbmZvIHtcbiAgc291cmNlRmlsZVBhdGg6IHN0cmluZztcbiAgbW9kdWxlU3ltYm9sTmFtZXM6IFNldDxzdHJpbmc+O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybShcbiAgICBmYWN0b3J5TWFwOiBNYXA8c3RyaW5nLCBGYWN0b3J5SW5mbz4sXG4gICAgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyKTogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpOiB0cy5UcmFuc2Zvcm1lcjx0cy5Tb3VyY2VGaWxlPiA9PiB7XG4gICAgcmV0dXJuIChmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSA9PiB7XG4gICAgICByZXR1cm4gdHJhbnNmb3JtRmFjdG9yeVNvdXJjZUZpbGUoZmFjdG9yeU1hcCwgY29udGV4dCwgaW1wb3J0UmV3cml0ZXIsIGZpbGUpO1xuICAgIH07XG4gIH07XG59XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybUZhY3RvcnlTb3VyY2VGaWxlKFxuICAgIGZhY3RvcnlNYXA6IE1hcDxzdHJpbmcsIEZhY3RvcnlJbmZvPiwgY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0LFxuICAgIGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlciwgZmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICAvLyBJZiB0aGlzIGlzIG5vdCBhIGdlbmVyYXRlZCBmaWxlLCBpdCB3b24ndCBoYXZlIGZhY3RvcnkgaW5mbyBhc3NvY2lhdGVkIHdpdGggaXQuXG4gIGlmICghZmFjdG9yeU1hcC5oYXMoZmlsZS5maWxlTmFtZSkpIHtcbiAgICAvLyBEb24ndCB0cmFuc2Zvcm0gbm9uLWdlbmVyYXRlZCBjb2RlLlxuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgY29uc3Qge21vZHVsZVN5bWJvbE5hbWVzLCBzb3VyY2VGaWxlUGF0aH0gPSBmYWN0b3J5TWFwLmdldChmaWxlLmZpbGVOYW1lKSAhO1xuXG4gIGZpbGUgPSB0cy5nZXRNdXRhYmxlQ2xvbmUoZmlsZSk7XG5cbiAgLy8gTm90IGV2ZXJ5IGV4cG9ydGVkIGZhY3Rvcnkgc3RhdGVtZW50IGlzIHZhbGlkLiBUaGV5IHdlcmUgZ2VuZXJhdGVkIGJlZm9yZSB0aGUgcHJvZ3JhbSB3YXNcbiAgLy8gYW5hbHl6ZWQsIGFuZCBiZWZvcmUgbmd0c2Mga25ldyB3aGljaCBzeW1ib2xzIHdlcmUgYWN0dWFsbHkgTmdNb2R1bGVzLiBmYWN0b3J5TWFwIGNvbnRhaW5zXG4gIC8vIHRoYXQga25vd2xlZGdlIG5vdywgc28gdGhpcyB0cmFuc2Zvcm0gZmlsdGVycyB0aGUgc3RhdGVtZW50IGxpc3QgYW5kIHJlbW92ZXMgZXhwb3J0ZWQgZmFjdG9yaWVzXG4gIC8vIHRoYXQgYXJlbid0IGFjdHVhbGx5IGZhY3Rvcmllcy5cbiAgLy9cbiAgLy8gVGhpcyBjb3VsZCBsZWF2ZSB0aGUgZ2VuZXJhdGVkIGZhY3RvcnkgZmlsZSBlbXB0eS4gVG8gcHJldmVudCB0aGlzIChpdCBjYXVzZXMgaXNzdWVzIHdpdGhcbiAgLy8gY2xvc3VyZSBjb21waWxlcikgYSAnybVOb25FbXB0eU1vZHVsZScgZXhwb3J0IHdhcyBhZGRlZCB3aGVuIHRoZSBmYWN0b3J5IHNoaW0gd2FzIGNyZWF0ZWQuXG4gIC8vIFByZXNlcnZlIHRoYXQgZXhwb3J0IGlmIG5lZWRlZCwgYW5kIHJlbW92ZSBpdCBvdGhlcndpc2UuXG4gIC8vXG4gIC8vIEFkZGl0aW9uYWxseSwgYW4gaW1wb3J0IHRvIEBhbmd1bGFyL2NvcmUgaXMgZ2VuZXJhdGVkLCBidXQgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gdW5pdCBjb3VsZFxuICAvLyBhY3R1YWxseSBiZSBAYW5ndWxhci9jb3JlLCBpbiB3aGljaCBjYXNlIHN1Y2ggYW4gaW1wb3J0IGlzIGludmFsaWQgYW5kIHNob3VsZCBiZSByZXBsYWNlZCB3aXRoXG4gIC8vIHRoZSBwcm9wZXIgcGF0aCB0byBhY2Nlc3MgSXZ5IHN5bWJvbHMgaW4gY29yZS5cblxuICAvLyBUaGUgZmlsdGVyZWQgc2V0IG9mIHN0YXRlbWVudHMuXG4gIGNvbnN0IHRyYW5zZm9ybWVkU3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcblxuICAvLyBUaGUgc3RhdGVtZW50IGlkZW50aWZpZWQgYXMgdGhlIMm1Tm9uRW1wdHlNb2R1bGUgZXhwb3J0LlxuICBsZXQgbm9uRW1wdHlFeHBvcnQ6IHRzLlN0YXRlbWVudHxudWxsID0gbnVsbDtcblxuICAvLyBFeHRyYWN0ZWQgaWRlbnRpZmllcnMgd2hpY2ggcmVmZXIgdG8gaW1wb3J0IHN0YXRlbWVudHMgZnJvbSBAYW5ndWxhci9jb3JlLlxuICBjb25zdCBjb3JlSW1wb3J0SWRlbnRpZmllcnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAvLyBDb25zaWRlciBhbGwgdGhlIHN0YXRlbWVudHMuXG4gIGZvciAoY29uc3Qgc3RtdCBvZiBmaWxlLnN0YXRlbWVudHMpIHtcbiAgICAvLyBMb29rIGZvciBpbXBvcnRzIHRvIEBhbmd1bGFyL2NvcmUuXG4gICAgaWYgKHRzLmlzSW1wb3J0RGVjbGFyYXRpb24oc3RtdCkgJiYgdHMuaXNTdHJpbmdMaXRlcmFsKHN0bXQubW9kdWxlU3BlY2lmaWVyKSAmJlxuICAgICAgICBzdG10Lm1vZHVsZVNwZWNpZmllci50ZXh0ID09PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgIC8vIFVwZGF0ZSB0aGUgaW1wb3J0IHBhdGggdG8gcG9pbnQgdG8gdGhlIGNvcnJlY3QgZmlsZSB1c2luZyB0aGUgSW1wb3J0UmV3cml0ZXIuXG4gICAgICBjb25zdCByZXdyaXR0ZW5Nb2R1bGVTcGVjaWZpZXIgPVxuICAgICAgICAgIGltcG9ydFJld3JpdGVyLnJld3JpdGVTcGVjaWZpZXIoJ0Bhbmd1bGFyL2NvcmUnLCBzb3VyY2VGaWxlUGF0aCk7XG4gICAgICBpZiAocmV3cml0dGVuTW9kdWxlU3BlY2lmaWVyICE9PSBzdG10Lm1vZHVsZVNwZWNpZmllci50ZXh0KSB7XG4gICAgICAgIHRyYW5zZm9ybWVkU3RhdGVtZW50cy5wdXNoKHRzLnVwZGF0ZUltcG9ydERlY2xhcmF0aW9uKFxuICAgICAgICAgICAgc3RtdCwgc3RtdC5kZWNvcmF0b3JzLCBzdG10Lm1vZGlmaWVycywgc3RtdC5pbXBvcnRDbGF1c2UsXG4gICAgICAgICAgICB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKHJld3JpdHRlbk1vZHVsZVNwZWNpZmllcikpKTtcblxuICAgICAgICAvLyBSZWNvcmQgdGhlIGlkZW50aWZpZXIgYnkgd2hpY2ggdGhpcyBpbXBvcnRlZCBtb2R1bGUgZ29lcywgc28gcmVmZXJlbmNlcyB0byBpdHMgc3ltYm9sc1xuICAgICAgICAvLyBjYW4gYmUgZGlzY292ZXJlZCBsYXRlci5cbiAgICAgICAgaWYgKHN0bXQuaW1wb3J0Q2xhdXNlICE9PSB1bmRlZmluZWQgJiYgc3RtdC5pbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICB0cy5pc05hbWVzcGFjZUltcG9ydChzdG10LmltcG9ydENsYXVzZS5uYW1lZEJpbmRpbmdzKSkge1xuICAgICAgICAgIGNvcmVJbXBvcnRJZGVudGlmaWVycy5hZGQoc3RtdC5pbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncy5uYW1lLnRleHQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0cmFuc2Zvcm1lZFN0YXRlbWVudHMucHVzaChzdG10KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RtdCkgJiYgc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgY29uc3QgZGVjbCA9IHN0bXQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9uc1swXTtcblxuICAgICAgLy8gSWYgdGhpcyBpcyB0aGUgybVOb25FbXB0eU1vZHVsZSBleHBvcnQsIHRoZW4gc2F2ZSBpdCBmb3IgbGF0ZXIuXG4gICAgICBpZiAodHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkpIHtcbiAgICAgICAgaWYgKGRlY2wubmFtZS50ZXh0ID09PSAnybVOb25FbXB0eU1vZHVsZScpIHtcbiAgICAgICAgICBub25FbXB0eUV4cG9ydCA9IHN0bXQ7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPdGhlcndpc2UsIGNoZWNrIGlmIHRoaXMgZXhwb3J0IGlzIGEgZmFjdG9yeSBmb3IgYSBrbm93biBOZ01vZHVsZSwgYW5kIHJldGFpbiBpdCBpZiBzby5cbiAgICAgICAgY29uc3QgbWF0Y2ggPSBTVFJJUF9OR19GQUNUT1JZLmV4ZWMoZGVjbC5uYW1lLnRleHQpO1xuICAgICAgICBpZiAobWF0Y2ggIT09IG51bGwgJiYgbW9kdWxlU3ltYm9sTmFtZXMuaGFzKG1hdGNoWzFdKSkge1xuICAgICAgICAgIHRyYW5zZm9ybWVkU3RhdGVtZW50cy5wdXNoKHN0bXQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBMZWF2ZSB0aGUgc3RhdGVtZW50IGFsb25lLCBhcyBpdCBjYW4ndCBiZSB1bmRlcnN0b29kLlxuICAgICAgICB0cmFuc2Zvcm1lZFN0YXRlbWVudHMucHVzaChzdG10KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSW5jbHVkZSBub24tdmFyaWFibGUgc3RhdGVtZW50cyAoaW1wb3J0cywgZXRjKS5cbiAgICAgIHRyYW5zZm9ybWVkU3RhdGVtZW50cy5wdXNoKHN0bXQpO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoZWNrIHdoZXRoZXIgdGhlIGVtcHR5IG1vZHVsZSBleHBvcnQgaXMgc3RpbGwgbmVlZGVkLlxuICBpZiAoIXRyYW5zZm9ybWVkU3RhdGVtZW50cy5zb21lKHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQpICYmIG5vbkVtcHR5RXhwb3J0ICE9PSBudWxsKSB7XG4gICAgLy8gSWYgdGhlIHJlc3VsdGluZyBmaWxlIGhhcyBubyBmYWN0b3JpZXMsIGluY2x1ZGUgYW4gZW1wdHkgZXhwb3J0IHRvXG4gICAgLy8gc2F0aXNmeSBjbG9zdXJlIGNvbXBpbGVyLlxuICAgIHRyYW5zZm9ybWVkU3RhdGVtZW50cy5wdXNoKG5vbkVtcHR5RXhwb3J0KTtcbiAgfVxuICBmaWxlLnN0YXRlbWVudHMgPSB0cy5jcmVhdGVOb2RlQXJyYXkodHJhbnNmb3JtZWRTdGF0ZW1lbnRzKTtcblxuICAvLyBJZiBhbnkgaW1wb3J0cyB0byBAYW5ndWxhci9jb3JlIHdlcmUgZGV0ZWN0ZWQgYW5kIHJld3JpdHRlbiAod2hpY2ggaGFwcGVucyB3aGVuIGNvbXBpbGluZ1xuICAvLyBAYW5ndWxhci9jb3JlKSwgZ28gdGhyb3VnaCB0aGUgU291cmNlRmlsZSBhbmQgcmV3cml0ZSByZWZlcmVuY2VzIHRvIHN5bWJvbHMgaW1wb3J0ZWQgZnJvbSBjb3JlLlxuICBpZiAoY29yZUltcG9ydElkZW50aWZpZXJzLnNpemUgPiAwKSB7XG4gICAgY29uc3QgdmlzaXQgPSA8VCBleHRlbmRzIHRzLk5vZGU+KG5vZGU6IFQpOiBUID0+IHtcbiAgICAgIG5vZGUgPSB0cy52aXNpdEVhY2hDaGlsZChub2RlLCBjaGlsZCA9PiB2aXNpdChjaGlsZCksIGNvbnRleHQpO1xuXG4gICAgICAvLyBMb29rIGZvciBleHByZXNzaW9ucyBvZiB0aGUgZm9ybSBcImkuc1wiIHdoZXJlICdpJyBpcyBhIGRldGVjdGVkIG5hbWUgZm9yIGFuIEBhbmd1bGFyL2NvcmVcbiAgICAgIC8vIGltcG9ydCB0aGF0IHdhcyBjaGFuZ2VkIGFib3ZlLiBSZXdyaXRlICdzJyB1c2luZyB0aGUgSW1wb3J0UmVzb2x2ZXIuXG4gICAgICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSkgJiYgdHMuaXNJZGVudGlmaWVyKG5vZGUuZXhwcmVzc2lvbikgJiZcbiAgICAgICAgICBjb3JlSW1wb3J0SWRlbnRpZmllcnMuaGFzKG5vZGUuZXhwcmVzc2lvbi50ZXh0KSkge1xuICAgICAgICAvLyBUaGlzIGlzIGFuIGltcG9ydCBvZiBhIHN5bWJvbCBmcm9tIEBhbmd1bGFyL2NvcmUuIFRyYW5zZm9ybSBpdCB3aXRoIHRoZSBpbXBvcnRSZXdyaXRlci5cbiAgICAgICAgY29uc3QgcmV3cml0dGVuU3ltYm9sID0gaW1wb3J0UmV3cml0ZXIucmV3cml0ZVN5bWJvbChub2RlLm5hbWUudGV4dCwgJ0Bhbmd1bGFyL2NvcmUnKTtcbiAgICAgICAgaWYgKHJld3JpdHRlblN5bWJvbCAhPT0gbm9kZS5uYW1lLnRleHQpIHtcbiAgICAgICAgICBjb25zdCB1cGRhdGVkID1cbiAgICAgICAgICAgICAgdHMudXBkYXRlUHJvcGVydHlBY2Nlc3Mobm9kZSwgbm9kZS5leHByZXNzaW9uLCB0cy5jcmVhdGVJZGVudGlmaWVyKHJld3JpdHRlblN5bWJvbCkpO1xuICAgICAgICAgIG5vZGUgPSB1cGRhdGVkIGFzIFQgJiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb247XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlO1xuICAgIH07XG5cbiAgICBmaWxlID0gdmlzaXQoZmlsZSk7XG4gIH1cblxuICByZXR1cm4gZmlsZTtcbn1cbiJdfQ==