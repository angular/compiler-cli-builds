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
        define("@angular/compiler-cli/src/ngtsc/shims/src/factory_generator", ["require", "exports", "tslib", "path", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/path", "@angular/compiler-cli/src/ngtsc/shims/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var path = require("path");
    var ts = require("typescript");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
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
        FactoryGenerator.prototype.getOriginalSourceOfShim = function (fileName) { return this.map.get(fileName) || null; };
        FactoryGenerator.prototype.generate = function (original, genFilePath) {
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
            files.filter(function (sourceFile) { return util_1.isNonDeclarationTsFile(sourceFile); })
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
    function generatedFactoryTransform(factoryMap, coreImportsFrom) {
        return function (context) {
            return function (file) {
                return transformFactorySourceFile(factoryMap, context, coreImportsFrom, file);
            };
        };
    }
    exports.generatedFactoryTransform = generatedFactoryTransform;
    function transformFactorySourceFile(factoryMap, context, coreImportsFrom, file) {
        var e_1, _a;
        // If this is not a generated file, it won't have factory info associated with it.
        if (!factoryMap.has(file.fileName)) {
            // Don't transform non-generated code.
            return file;
        }
        var _b = factoryMap.get(file.fileName), moduleSymbolNames = _b.moduleSymbolNames, sourceFilePath = _b.sourceFilePath;
        var clone = ts.getMutableClone(file);
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
        try {
            // Consider all the statements.
            for (var _c = tslib_1.__values(file.statements), _d = _c.next(); !_d.done; _d = _c.next()) {
                var stmt = _d.value;
                // Look for imports to @angular/core.
                if (coreImportsFrom !== null && ts.isImportDeclaration(stmt) &&
                    ts.isStringLiteral(stmt.moduleSpecifier) && stmt.moduleSpecifier.text === '@angular/core') {
                    // Update the import path to point to the correct file (coreImportsFrom).
                    var path_2 = path_1.relativePathBetween(sourceFilePath, coreImportsFrom.fileName);
                    if (path_2 !== null) {
                        transformedStatements.push(ts.updateImportDeclaration(stmt, stmt.decorators, stmt.modifiers, stmt.importClause, ts.createStringLiteral(path_2)));
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
        clone.statements = ts.createNodeArray(transformedStatements);
        return clone;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeV9nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zL3NyYy9mYWN0b3J5X2dlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDLHNFQUF3RDtJQUd4RCx1RUFBbUU7SUFFbkUsSUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDO0lBQ3BDLElBQU0sZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7SUFFMUM7OztPQUdHO0lBQ0g7UUFDRSwwQkFBNEIsR0FBd0I7WUFBeEIsUUFBRyxHQUFILEdBQUcsQ0FBcUI7UUFBRyxDQUFDO1FBRXhELHNCQUFJLDRDQUFjO2lCQUFsQixjQUE0QyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUU5RCxrREFBdUIsR0FBdkIsVUFBd0IsUUFBZ0IsSUFBaUIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRWpHLG1DQUFRLEdBQVIsVUFBUyxRQUF1QixFQUFFLFdBQW1CO1lBQ25ELElBQU0sb0JBQW9CLEdBQ3RCLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3RSwyRkFBMkY7WUFDM0YsNkZBQTZGO1lBQzdGLGdHQUFnRztZQUNoRyxFQUFFO1lBQ0YsOEVBQThFO1lBQzlFLElBQU0sV0FBVyxHQUFHLFFBQVE7aUJBQ0gsVUFBVTtnQkFDWCwyQ0FBMkM7aUJBQzFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUM7Z0JB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QUMsQ0FBQztpQkFDbEM7YUFDRjs7Ozs7Ozs7O1FBRUQseURBQXlEO1FBQ3pELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksY0FBYyxLQUFLLElBQUksRUFBRTtZQUNsRixxRUFBcUU7WUFDckUsNEJBQTRCO1lBQzVCLHFCQUFxQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztTQUM1QztRQUNELEtBQUssQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzdELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge3JlbGF0aXZlUGF0aEJldHdlZW59IGZyb20gJy4uLy4uL3V0aWwvc3JjL3BhdGgnO1xuXG5pbXBvcnQge1NoaW1HZW5lcmF0b3J9IGZyb20gJy4vaG9zdCc7XG5pbXBvcnQge2dlbmVyYXRlZE1vZHVsZU5hbWUsIGlzTm9uRGVjbGFyYXRpb25Uc0ZpbGV9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IFRTX0RUU19TVUZGSVggPSAvKFxcLmQpP1xcLnRzJC87XG5jb25zdCBTVFJJUF9OR19GQUNUT1JZID0gLyguKilOZ0ZhY3RvcnkkLztcblxuLyoqXG4gKiBHZW5lcmF0ZXMgdHMuU291cmNlRmlsZXMgd2hpY2ggY29udGFpbiB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgZm9yIE5nRmFjdG9yaWVzIGZvciBldmVyeSBleHBvcnRlZFxuICogY2xhc3Mgb2YgYW4gaW5wdXQgdHMuU291cmNlRmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEZhY3RvcnlHZW5lcmF0b3IgaW1wbGVtZW50cyBTaGltR2VuZXJhdG9yIHtcbiAgcHJpdmF0ZSBjb25zdHJ1Y3Rvcihwcml2YXRlIG1hcDogTWFwPHN0cmluZywgc3RyaW5nPikge31cblxuICBnZXQgZmFjdG9yeUZpbGVNYXAoKTogTWFwPHN0cmluZywgc3RyaW5nPiB7IHJldHVybiB0aGlzLm1hcDsgfVxuXG4gIGdldE9yaWdpbmFsU291cmNlT2ZTaGltKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7IHJldHVybiB0aGlzLm1hcC5nZXQoZmlsZU5hbWUpIHx8IG51bGw7IH1cblxuICBnZW5lcmF0ZShvcmlnaW5hbDogdHMuU291cmNlRmlsZSwgZ2VuRmlsZVBhdGg6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGUge1xuICAgIGNvbnN0IHJlbGF0aXZlUGF0aFRvU291cmNlID1cbiAgICAgICAgJy4vJyArIHBhdGgucG9zaXguYmFzZW5hbWUob3JpZ2luYWwuZmlsZU5hbWUpLnJlcGxhY2UoVFNfRFRTX1NVRkZJWCwgJycpO1xuICAgIC8vIENvbGxlY3QgYSBsaXN0IG9mIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGhhdmUgZmFjdG9yeSB0eXBlcyBlbWl0dGVkIGZvciB0aGVtLiBUaGlzIGxpc3QgaXNcbiAgICAvLyBvdmVybHkgYnJvYWQgYXMgYXQgdGhpcyBwb2ludCB0aGUgdHMuVHlwZUNoZWNrZXIgaGFzbid0IGJlZW4gY3JlYXRlZCwgYW5kIGNhbid0IGJlIHVzZWQgdG9cbiAgICAvLyBzZW1hbnRpY2FsbHkgdW5kZXJzdGFuZCB3aGljaCBkZWNvcmF0ZWQgdHlwZXMgYXJlIGFjdHVhbGx5IGRlY29yYXRlZCB3aXRoIEFuZ3VsYXIgZGVjb3JhdG9ycy5cbiAgICAvL1xuICAgIC8vIFRoZSBleHBvcnRzIGdlbmVyYXRlZCBoZXJlIGFyZSBwcnVuZWQgaW4gdGhlIGZhY3RvcnkgdHJhbnNmb3JtIGR1cmluZyBlbWl0LlxuICAgIGNvbnN0IHN5bWJvbE5hbWVzID0gb3JpZ2luYWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGVtZW50c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBpY2sgb3V0IHRvcCBsZXZlbCBjbGFzcyBkZWNsYXJhdGlvbnMuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3aGljaCBhcmUgbmFtZWQsIGV4cG9ydGVkLCBhbmQgaGF2ZSBkZWNvcmF0b3JzLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlY2wgPT4gaXNFeHBvcnRlZChkZWNsKSAmJiBkZWNsLmRlY29yYXRvcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVjbC5uYW1lICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR3JhYiB0aGUgc3ltYm9sIG5hbWUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChkZWNsID0+IGRlY2wubmFtZSAhLnRleHQpO1xuXG4gICAgbGV0IHNvdXJjZVRleHQgPSAnJztcbiAgICBpZiAoc3ltYm9sTmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gRm9yIGVhY2ggc3ltYm9sIG5hbWUsIGdlbmVyYXRlIGEgY29uc3RhbnQgZXhwb3J0IG9mIHRoZSBjb3JyZXNwb25kaW5nIE5nRmFjdG9yeS5cbiAgICAgIC8vIFRoaXMgd2lsbCBlbmNvbXBhc3MgYSBsb3Qgb2Ygc3ltYm9scyB3aGljaCBkb24ndCBuZWVkIGZhY3RvcmllcywgYnV0IHRoYXQncyBva2F5XG4gICAgICAvLyBiZWNhdXNlIGl0IHdvbid0IG1pc3MgYW55IHRoYXQgZG8uXG4gICAgICBjb25zdCB2YXJMaW5lcyA9IHN5bWJvbE5hbWVzLm1hcChcbiAgICAgICAgICBuYW1lID0+IGBleHBvcnQgY29uc3QgJHtuYW1lfU5nRmFjdG9yeSA9IG5ldyBpMC7JtU5nTW9kdWxlRmFjdG9yeSgke25hbWV9KTtgKTtcbiAgICAgIHNvdXJjZVRleHQgPSBbXG4gICAgICAgIC8vIFRoaXMgbWlnaHQgYmUgaW5jb3JyZWN0IGlmIHRoZSBjdXJyZW50IHBhY2thZ2UgYmVpbmcgY29tcGlsZWQgaXMgQW5ndWxhciBjb3JlLCBidXQgaXQnc1xuICAgICAgICAvLyBva2F5IHRvIGxlYXZlIGluIGF0IHR5cGUgY2hlY2tpbmcgdGltZS4gVHlwZVNjcmlwdCBjYW4gaGFuZGxlIHRoaXMgcmVmZXJlbmNlIHZpYSBpdHMgcGF0aFxuICAgICAgICAvLyBtYXBwaW5nLCBidXQgZG93bnN0cmVhbSBidW5kbGVycyBjYW4ndC4gSWYgdGhlIGN1cnJlbnQgcGFja2FnZSBpcyBjb3JlIGl0c2VsZiwgdGhpcyB3aWxsXG4gICAgICAgIC8vIGJlIHJlcGxhY2VkIGluIHRoZSBmYWN0b3J5IHRyYW5zZm9ybWVyIGJlZm9yZSBlbWl0LlxuICAgICAgICBgaW1wb3J0ICogYXMgaTAgZnJvbSAnQGFuZ3VsYXIvY29yZSc7YCxcbiAgICAgICAgYGltcG9ydCB7JHtzeW1ib2xOYW1lcy5qb2luKCcsICcpfX0gZnJvbSAnJHtyZWxhdGl2ZVBhdGhUb1NvdXJjZX0nO2AsXG4gICAgICAgIC4uLnZhckxpbmVzLFxuICAgICAgXS5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgYW4gZXh0cmEgZXhwb3J0IHRvIGVuc3VyZSB0aGlzIG1vZHVsZSBoYXMgYXQgbGVhc3Qgb25lLiBJdCdsbCBiZSByZW1vdmVkIGxhdGVyIGluIHRoZVxuICAgIC8vIGZhY3RvcnkgdHJhbnNmb3JtZXIgaWYgaXQgZW5kcyB1cCBub3QgYmVpbmcgbmVlZGVkLlxuICAgIHNvdXJjZVRleHQgKz0gJ1xcbmV4cG9ydCBjb25zdCDJtU5vbkVtcHR5TW9kdWxlID0gdHJ1ZTsnO1xuXG4gICAgY29uc3QgZ2VuRmlsZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoXG4gICAgICAgIGdlbkZpbGVQYXRoLCBzb3VyY2VUZXh0LCBvcmlnaW5hbC5sYW5ndWFnZVZlcnNpb24sIHRydWUsIHRzLlNjcmlwdEtpbmQuVFMpO1xuICAgIGlmIChvcmlnaW5hbC5tb2R1bGVOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGdlbkZpbGUubW9kdWxlTmFtZSA9XG4gICAgICAgICAgZ2VuZXJhdGVkTW9kdWxlTmFtZShvcmlnaW5hbC5tb2R1bGVOYW1lLCBvcmlnaW5hbC5maWxlTmFtZSwgJy5uZ2ZhY3RvcnknKTtcbiAgICB9XG4gICAgcmV0dXJuIGdlbkZpbGU7XG4gIH1cblxuICBzdGF0aWMgZm9yUm9vdEZpbGVzKGZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz4pOiBGYWN0b3J5R2VuZXJhdG9yIHtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIGZpbGVzLmZpbHRlcihzb3VyY2VGaWxlID0+IGlzTm9uRGVjbGFyYXRpb25Uc0ZpbGUoc291cmNlRmlsZSkpXG4gICAgICAgIC5mb3JFYWNoKHNvdXJjZUZpbGUgPT4gbWFwLnNldChzb3VyY2VGaWxlLnJlcGxhY2UoL1xcLnRzJC8sICcubmdmYWN0b3J5LnRzJyksIHNvdXJjZUZpbGUpKTtcbiAgICByZXR1cm4gbmV3IEZhY3RvcnlHZW5lcmF0b3IobWFwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0V4cG9ydGVkKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIHJldHVybiBkZWNsLm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICBkZWNsLm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZhY3RvcnlJbmZvIHtcbiAgc291cmNlRmlsZVBhdGg6IHN0cmluZztcbiAgbW9kdWxlU3ltYm9sTmFtZXM6IFNldDxzdHJpbmc+O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybShcbiAgICBmYWN0b3J5TWFwOiBNYXA8c3RyaW5nLCBGYWN0b3J5SW5mbz4sXG4gICAgY29yZUltcG9ydHNGcm9tOiB0cy5Tb3VyY2VGaWxlIHwgbnVsbCk6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPiB7XG4gIHJldHVybiAoY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KTogdHMuVHJhbnNmb3JtZXI8dHMuU291cmNlRmlsZT4gPT4ge1xuICAgIHJldHVybiAoZmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUgPT4ge1xuICAgICAgcmV0dXJuIHRyYW5zZm9ybUZhY3RvcnlTb3VyY2VGaWxlKGZhY3RvcnlNYXAsIGNvbnRleHQsIGNvcmVJbXBvcnRzRnJvbSwgZmlsZSk7XG4gICAgfTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtRmFjdG9yeVNvdXJjZUZpbGUoXG4gICAgZmFjdG9yeU1hcDogTWFwPHN0cmluZywgRmFjdG9yeUluZm8+LCBjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQsXG4gICAgY29yZUltcG9ydHNGcm9tOiB0cy5Tb3VyY2VGaWxlIHwgbnVsbCwgZmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICAvLyBJZiB0aGlzIGlzIG5vdCBhIGdlbmVyYXRlZCBmaWxlLCBpdCB3b24ndCBoYXZlIGZhY3RvcnkgaW5mbyBhc3NvY2lhdGVkIHdpdGggaXQuXG4gIGlmICghZmFjdG9yeU1hcC5oYXMoZmlsZS5maWxlTmFtZSkpIHtcbiAgICAvLyBEb24ndCB0cmFuc2Zvcm0gbm9uLWdlbmVyYXRlZCBjb2RlLlxuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgY29uc3Qge21vZHVsZVN5bWJvbE5hbWVzLCBzb3VyY2VGaWxlUGF0aH0gPSBmYWN0b3J5TWFwLmdldChmaWxlLmZpbGVOYW1lKSAhO1xuXG4gIGNvbnN0IGNsb25lID0gdHMuZ2V0TXV0YWJsZUNsb25lKGZpbGUpO1xuXG4gIC8vIE5vdCBldmVyeSBleHBvcnRlZCBmYWN0b3J5IHN0YXRlbWVudCBpcyB2YWxpZC4gVGhleSB3ZXJlIGdlbmVyYXRlZCBiZWZvcmUgdGhlIHByb2dyYW0gd2FzXG4gIC8vIGFuYWx5emVkLCBhbmQgYmVmb3JlIG5ndHNjIGtuZXcgd2hpY2ggc3ltYm9scyB3ZXJlIGFjdHVhbGx5IE5nTW9kdWxlcy4gZmFjdG9yeU1hcCBjb250YWluc1xuICAvLyB0aGF0IGtub3dsZWRnZSBub3csIHNvIHRoaXMgdHJhbnNmb3JtIGZpbHRlcnMgdGhlIHN0YXRlbWVudCBsaXN0IGFuZCByZW1vdmVzIGV4cG9ydGVkIGZhY3Rvcmllc1xuICAvLyB0aGF0IGFyZW4ndCBhY3R1YWxseSBmYWN0b3JpZXMuXG4gIC8vXG4gIC8vIFRoaXMgY291bGQgbGVhdmUgdGhlIGdlbmVyYXRlZCBmYWN0b3J5IGZpbGUgZW1wdHkuIFRvIHByZXZlbnQgdGhpcyAoaXQgY2F1c2VzIGlzc3VlcyB3aXRoXG4gIC8vIGNsb3N1cmUgY29tcGlsZXIpIGEgJ8m1Tm9uRW1wdHlNb2R1bGUnIGV4cG9ydCB3YXMgYWRkZWQgd2hlbiB0aGUgZmFjdG9yeSBzaGltIHdhcyBjcmVhdGVkLlxuICAvLyBQcmVzZXJ2ZSB0aGF0IGV4cG9ydCBpZiBuZWVkZWQsIGFuZCByZW1vdmUgaXQgb3RoZXJ3aXNlLlxuICAvL1xuICAvLyBBZGRpdGlvbmFsbHksIGFuIGltcG9ydCB0byBAYW5ndWxhci9jb3JlIGlzIGdlbmVyYXRlZCwgYnV0IHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgY291bGRcbiAgLy8gYWN0dWFsbHkgYmUgQGFuZ3VsYXIvY29yZSwgaW4gd2hpY2ggY2FzZSBzdWNoIGFuIGltcG9ydCBpcyBpbnZhbGlkIGFuZCBzaG91bGQgYmUgcmVwbGFjZWQgd2l0aFxuICAvLyB0aGUgcHJvcGVyIHBhdGggdG8gYWNjZXNzIEl2eSBzeW1ib2xzIGluIGNvcmUuXG5cbiAgLy8gVGhlIGZpbHRlcmVkIHNldCBvZiBzdGF0ZW1lbnRzLlxuICBjb25zdCB0cmFuc2Zvcm1lZFN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdID0gW107XG5cbiAgLy8gVGhlIHN0YXRlbWVudCBpZGVudGlmaWVkIGFzIHRoZSDJtU5vbkVtcHR5TW9kdWxlIGV4cG9ydC5cbiAgbGV0IG5vbkVtcHR5RXhwb3J0OiB0cy5TdGF0ZW1lbnR8bnVsbCA9IG51bGw7XG5cbiAgLy8gQ29uc2lkZXIgYWxsIHRoZSBzdGF0ZW1lbnRzLlxuICBmb3IgKGNvbnN0IHN0bXQgb2YgZmlsZS5zdGF0ZW1lbnRzKSB7XG4gICAgLy8gTG9vayBmb3IgaW1wb3J0cyB0byBAYW5ndWxhci9jb3JlLlxuICAgIGlmIChjb3JlSW1wb3J0c0Zyb20gIT09IG51bGwgJiYgdHMuaXNJbXBvcnREZWNsYXJhdGlvbihzdG10KSAmJlxuICAgICAgICB0cy5pc1N0cmluZ0xpdGVyYWwoc3RtdC5tb2R1bGVTcGVjaWZpZXIpICYmIHN0bXQubW9kdWxlU3BlY2lmaWVyLnRleHQgPT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgLy8gVXBkYXRlIHRoZSBpbXBvcnQgcGF0aCB0byBwb2ludCB0byB0aGUgY29ycmVjdCBmaWxlIChjb3JlSW1wb3J0c0Zyb20pLlxuICAgICAgY29uc3QgcGF0aCA9IHJlbGF0aXZlUGF0aEJldHdlZW4oc291cmNlRmlsZVBhdGgsIGNvcmVJbXBvcnRzRnJvbS5maWxlTmFtZSk7XG4gICAgICBpZiAocGF0aCAhPT0gbnVsbCkge1xuICAgICAgICB0cmFuc2Zvcm1lZFN0YXRlbWVudHMucHVzaCh0cy51cGRhdGVJbXBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICAgIHN0bXQsIHN0bXQuZGVjb3JhdG9ycywgc3RtdC5tb2RpZmllcnMsIHN0bXQuaW1wb3J0Q2xhdXNlLFxuICAgICAgICAgICAgdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChwYXRoKSkpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdG10KSAmJiBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICBjb25zdCBkZWNsID0gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zWzBdO1xuXG4gICAgICAvLyBJZiB0aGlzIGlzIHRoZSDJtU5vbkVtcHR5TW9kdWxlIGV4cG9ydCwgdGhlbiBzYXZlIGl0IGZvciBsYXRlci5cbiAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSkge1xuICAgICAgICBpZiAoZGVjbC5uYW1lLnRleHQgPT09ICfJtU5vbkVtcHR5TW9kdWxlJykge1xuICAgICAgICAgIG5vbkVtcHR5RXhwb3J0ID0gc3RtdDtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE90aGVyd2lzZSwgY2hlY2sgaWYgdGhpcyBleHBvcnQgaXMgYSBmYWN0b3J5IGZvciBhIGtub3duIE5nTW9kdWxlLCBhbmQgcmV0YWluIGl0IGlmIHNvLlxuICAgICAgICBjb25zdCBtYXRjaCA9IFNUUklQX05HX0ZBQ1RPUlkuZXhlYyhkZWNsLm5hbWUudGV4dCk7XG4gICAgICAgIGlmIChtYXRjaCAhPT0gbnVsbCAmJiBtb2R1bGVTeW1ib2xOYW1lcy5oYXMobWF0Y2hbMV0pKSB7XG4gICAgICAgICAgdHJhbnNmb3JtZWRTdGF0ZW1lbnRzLnB1c2goc3RtdCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIExlYXZlIHRoZSBzdGF0ZW1lbnQgYWxvbmUsIGFzIGl0IGNhbid0IGJlIHVuZGVyc3Rvb2QuXG4gICAgICAgIHRyYW5zZm9ybWVkU3RhdGVtZW50cy5wdXNoKHN0bXQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJbmNsdWRlIG5vbi12YXJpYWJsZSBzdGF0ZW1lbnRzIChpbXBvcnRzLCBldGMpLlxuICAgICAgdHJhbnNmb3JtZWRTdGF0ZW1lbnRzLnB1c2goc3RtdCk7XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hlY2sgd2hldGhlciB0aGUgZW1wdHkgbW9kdWxlIGV4cG9ydCBpcyBzdGlsbCBuZWVkZWQuXG4gIGlmICghdHJhbnNmb3JtZWRTdGF0ZW1lbnRzLnNvbWUodHMuaXNWYXJpYWJsZVN0YXRlbWVudCkgJiYgbm9uRW1wdHlFeHBvcnQgIT09IG51bGwpIHtcbiAgICAvLyBJZiB0aGUgcmVzdWx0aW5nIGZpbGUgaGFzIG5vIGZhY3RvcmllcywgaW5jbHVkZSBhbiBlbXB0eSBleHBvcnQgdG9cbiAgICAvLyBzYXRpc2Z5IGNsb3N1cmUgY29tcGlsZXIuXG4gICAgdHJhbnNmb3JtZWRTdGF0ZW1lbnRzLnB1c2gobm9uRW1wdHlFeHBvcnQpO1xuICB9XG4gIGNsb25lLnN0YXRlbWVudHMgPSB0cy5jcmVhdGVOb2RlQXJyYXkodHJhbnNmb3JtZWRTdGF0ZW1lbnRzKTtcbiAgcmV0dXJuIGNsb25lO1xufVxuIl19