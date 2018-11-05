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
        define("@angular/compiler-cli/src/ngtsc/shims/src/factory_generator", ["require", "exports", "tslib", "canonical-path", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/path", "@angular/compiler-cli/src/ngtsc/shims/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var path = require("canonical-path");
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
            var relativePathToSource = './' + path.basename(original.fileName).replace(TS_DTS_SUFFIX, '');
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
            // For each symbol name, generate a constant export of the corresponding NgFactory.
            // This will encompass a lot of symbols which don't need factories, but that's okay
            // because it won't miss any that do.
            var varLines = symbolNames.map(function (name) { return "export const " + name + "NgFactory = new i0.\u0275NgModuleFactory(" + name + ");"; });
            var sourceText = tslib_1.__spread([
                // This might be incorrect if the current package being compiled is Angular core, but it's
                // okay to leave in at type checking time. TypeScript can handle this reference via its path
                // mapping, but downstream bundlers can't. If the current package is core itself, this will be
                // replaced in the factory transformer before emit.
                "import * as i0 from '@angular/core';",
                "import {" + symbolNames.join(', ') + "} from '" + relativePathToSource + "';"
            ], varLines).join('\n');
            return ts.createSourceFile(genFilePath, sourceText, original.languageVersion, true, ts.ScriptKind.TS);
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
        // If this is not a generated file, it won't have factory info associated with it.
        if (!factoryMap.has(file.fileName)) {
            // Don't transform non-generated code.
            return file;
        }
        var _a = factoryMap.get(file.fileName), moduleSymbolNames = _a.moduleSymbolNames, sourceFilePath = _a.sourceFilePath;
        var clone = ts.getMutableClone(file);
        var transformedStatements = file.statements.map(function (stmt) {
            if (coreImportsFrom !== null && ts.isImportDeclaration(stmt) &&
                ts.isStringLiteral(stmt.moduleSpecifier) && stmt.moduleSpecifier.text === '@angular/core') {
                var path_2 = path_1.relativePathBetween(sourceFilePath, coreImportsFrom.fileName);
                if (path_2 !== null) {
                    return ts.updateImportDeclaration(stmt, stmt.decorators, stmt.modifiers, stmt.importClause, ts.createStringLiteral(path_2));
                }
                else {
                    return ts.createNotEmittedStatement(stmt);
                }
            }
            else if (ts.isVariableStatement(stmt) && stmt.declarationList.declarations.length === 1) {
                var decl = stmt.declarationList.declarations[0];
                if (ts.isIdentifier(decl.name)) {
                    var match = STRIP_NG_FACTORY.exec(decl.name.text);
                    if (match === null || !moduleSymbolNames.has(match[1])) {
                        // Remove the given factory as it wasn't actually for an NgModule.
                        return ts.createNotEmittedStatement(stmt);
                    }
                }
                return stmt;
            }
            else {
                return stmt;
            }
        });
        if (!transformedStatements.some(ts.isVariableStatement)) {
            // If the resulting file has no factories, include an empty export to
            // satisfy closure compiler.
            transformedStatements.push(ts.createVariableStatement([ts.createModifier(ts.SyntaxKind.ExportKeyword)], ts.createVariableDeclarationList([ts.createVariableDeclaration('ɵNonEmptyModule', undefined, ts.createTrue())], ts.NodeFlags.Const)));
        }
        clone.statements = ts.createNodeArray(transformedStatements);
        return clone;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeV9nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zL3NyYy9mYWN0b3J5X2dlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxxQ0FBdUM7SUFDdkMsK0JBQWlDO0lBRWpDLHNFQUF3RDtJQUd4RCx1RUFBOEM7SUFFOUMsSUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDO0lBQ3BDLElBQU0sZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7SUFFMUM7OztPQUdHO0lBQ0g7UUFDRSwwQkFBNEIsR0FBd0I7WUFBeEIsUUFBRyxHQUFILEdBQUcsQ0FBcUI7UUFBRyxDQUFDO1FBRXhELHNCQUFJLDRDQUFjO2lCQUFsQixjQUE0QyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUU5RCxrREFBdUIsR0FBdkIsVUFBd0IsUUFBZ0IsSUFBaUIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRWpHLG1DQUFRLEdBQVIsVUFBUyxRQUF1QixFQUFFLFdBQW1CO1lBQ25ELElBQU0sb0JBQW9CLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDaEcsMkZBQTJGO1lBQzNGLDZGQUE2RjtZQUM3RixnR0FBZ0c7WUFDaEcsRUFBRTtZQUNGLDhFQUE4RTtZQUM5RSxJQUFNLFdBQVcsR0FBRyxRQUFRO2lCQUNILFVBQVU7Z0JBQ1gsMkNBQTJDO2lCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDO2dCQUM5QixrREFBa0Q7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Q0FBQyxFQUFFO3dCQUN0RCxrRUFBa0U7d0JBQ2xFLE9BQU8sRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUMzQztpQkFDRjtnQkFDRCxPQUFPLElBQUksQ0FBQzthQUNiO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDO2FBQ2I7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7WUFDdkQscUVBQXFFO1lBQ3JFLDRCQUE0QjtZQUM1QixxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLHVCQUF1QixDQUNqRCxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUNoRCxFQUFFLENBQUMsNkJBQTZCLENBQzVCLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLGlCQUFpQixFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUM3RSxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMvQjtRQUNELEtBQUssQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzdELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdjYW5vbmljYWwtcGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtyZWxhdGl2ZVBhdGhCZXR3ZWVufSBmcm9tICcuLi8uLi91dGlsL3NyYy9wYXRoJztcblxuaW1wb3J0IHtTaGltR2VuZXJhdG9yfSBmcm9tICcuL2hvc3QnO1xuaW1wb3J0IHtpc05vbkRlY2xhcmF0aW9uVHNGaWxlfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBUU19EVFNfU1VGRklYID0gLyhcXC5kKT9cXC50cyQvO1xuY29uc3QgU1RSSVBfTkdfRkFDVE9SWSA9IC8oLiopTmdGYWN0b3J5JC87XG5cbi8qKlxuICogR2VuZXJhdGVzIHRzLlNvdXJjZUZpbGVzIHdoaWNoIGNvbnRhaW4gdmFyaWFibGUgZGVjbGFyYXRpb25zIGZvciBOZ0ZhY3RvcmllcyBmb3IgZXZlcnkgZXhwb3J0ZWRcbiAqIGNsYXNzIG9mIGFuIGlucHV0IHRzLlNvdXJjZUZpbGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBGYWN0b3J5R2VuZXJhdG9yIGltcGxlbWVudHMgU2hpbUdlbmVyYXRvciB7XG4gIHByaXZhdGUgY29uc3RydWN0b3IocHJpdmF0ZSBtYXA6IE1hcDxzdHJpbmcsIHN0cmluZz4pIHt9XG5cbiAgZ2V0IGZhY3RvcnlGaWxlTWFwKCk6IE1hcDxzdHJpbmcsIHN0cmluZz4geyByZXR1cm4gdGhpcy5tYXA7IH1cblxuICBnZXRPcmlnaW5hbFNvdXJjZU9mU2hpbShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nfG51bGwgeyByZXR1cm4gdGhpcy5tYXAuZ2V0KGZpbGVOYW1lKSB8fCBudWxsOyB9XG5cbiAgZ2VuZXJhdGUob3JpZ2luYWw6IHRzLlNvdXJjZUZpbGUsIGdlbkZpbGVQYXRoOiBzdHJpbmcpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICBjb25zdCByZWxhdGl2ZVBhdGhUb1NvdXJjZSA9ICcuLycgKyBwYXRoLmJhc2VuYW1lKG9yaWdpbmFsLmZpbGVOYW1lKS5yZXBsYWNlKFRTX0RUU19TVUZGSVgsICcnKTtcbiAgICAvLyBDb2xsZWN0IGEgbGlzdCBvZiBjbGFzc2VzIHRoYXQgbmVlZCB0byBoYXZlIGZhY3RvcnkgdHlwZXMgZW1pdHRlZCBmb3IgdGhlbS4gVGhpcyBsaXN0IGlzXG4gICAgLy8gb3Zlcmx5IGJyb2FkIGFzIGF0IHRoaXMgcG9pbnQgdGhlIHRzLlR5cGVDaGVja2VyIGhhc24ndCBiZWVuIGNyZWF0ZWQsIGFuZCBjYW4ndCBiZSB1c2VkIHRvXG4gICAgLy8gc2VtYW50aWNhbGx5IHVuZGVyc3RhbmQgd2hpY2ggZGVjb3JhdGVkIHR5cGVzIGFyZSBhY3R1YWxseSBkZWNvcmF0ZWQgd2l0aCBBbmd1bGFyIGRlY29yYXRvcnMuXG4gICAgLy9cbiAgICAvLyBUaGUgZXhwb3J0cyBnZW5lcmF0ZWQgaGVyZSBhcmUgcHJ1bmVkIGluIHRoZSBmYWN0b3J5IHRyYW5zZm9ybSBkdXJpbmcgZW1pdC5cbiAgICBjb25zdCBzeW1ib2xOYW1lcyA9IG9yaWdpbmFsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlbWVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQaWNrIG91dCB0b3AgbGV2ZWwgY2xhc3MgZGVjbGFyYXRpb25zLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcih0cy5pc0NsYXNzRGVjbGFyYXRpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hpY2ggYXJlIG5hbWVkLCBleHBvcnRlZCwgYW5kIGhhdmUgZGVjb3JhdG9ycy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWNsID0+IGlzRXhwb3J0ZWQoZGVjbCkgJiYgZGVjbC5kZWNvcmF0b3JzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlY2wubmFtZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdyYWIgdGhlIHN5bWJvbCBuYW1lLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZGVjbCA9PiBkZWNsLm5hbWUgIS50ZXh0KTtcblxuICAgIC8vIEZvciBlYWNoIHN5bWJvbCBuYW1lLCBnZW5lcmF0ZSBhIGNvbnN0YW50IGV4cG9ydCBvZiB0aGUgY29ycmVzcG9uZGluZyBOZ0ZhY3RvcnkuXG4gICAgLy8gVGhpcyB3aWxsIGVuY29tcGFzcyBhIGxvdCBvZiBzeW1ib2xzIHdoaWNoIGRvbid0IG5lZWQgZmFjdG9yaWVzLCBidXQgdGhhdCdzIG9rYXlcbiAgICAvLyBiZWNhdXNlIGl0IHdvbid0IG1pc3MgYW55IHRoYXQgZG8uXG4gICAgY29uc3QgdmFyTGluZXMgPSBzeW1ib2xOYW1lcy5tYXAoXG4gICAgICAgIG5hbWUgPT4gYGV4cG9ydCBjb25zdCAke25hbWV9TmdGYWN0b3J5ID0gbmV3IGkwLsm1TmdNb2R1bGVGYWN0b3J5KCR7bmFtZX0pO2ApO1xuICAgIGNvbnN0IHNvdXJjZVRleHQgPSBbXG4gICAgICAvLyBUaGlzIG1pZ2h0IGJlIGluY29ycmVjdCBpZiB0aGUgY3VycmVudCBwYWNrYWdlIGJlaW5nIGNvbXBpbGVkIGlzIEFuZ3VsYXIgY29yZSwgYnV0IGl0J3NcbiAgICAgIC8vIG9rYXkgdG8gbGVhdmUgaW4gYXQgdHlwZSBjaGVja2luZyB0aW1lLiBUeXBlU2NyaXB0IGNhbiBoYW5kbGUgdGhpcyByZWZlcmVuY2UgdmlhIGl0cyBwYXRoXG4gICAgICAvLyBtYXBwaW5nLCBidXQgZG93bnN0cmVhbSBidW5kbGVycyBjYW4ndC4gSWYgdGhlIGN1cnJlbnQgcGFja2FnZSBpcyBjb3JlIGl0c2VsZiwgdGhpcyB3aWxsIGJlXG4gICAgICAvLyByZXBsYWNlZCBpbiB0aGUgZmFjdG9yeSB0cmFuc2Zvcm1lciBiZWZvcmUgZW1pdC5cbiAgICAgIGBpbXBvcnQgKiBhcyBpMCBmcm9tICdAYW5ndWxhci9jb3JlJztgLFxuICAgICAgYGltcG9ydCB7JHtzeW1ib2xOYW1lcy5qb2luKCcsICcpfX0gZnJvbSAnJHtyZWxhdGl2ZVBhdGhUb1NvdXJjZX0nO2AsXG4gICAgICAuLi52YXJMaW5lcyxcbiAgICBdLmpvaW4oJ1xcbicpO1xuICAgIHJldHVybiB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICBnZW5GaWxlUGF0aCwgc291cmNlVGV4dCwgb3JpZ2luYWwubGFuZ3VhZ2VWZXJzaW9uLCB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTKTtcbiAgfVxuXG4gIHN0YXRpYyBmb3JSb290RmlsZXMoZmlsZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPik6IEZhY3RvcnlHZW5lcmF0b3Ige1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgZmlsZXMuZmlsdGVyKHNvdXJjZUZpbGUgPT4gaXNOb25EZWNsYXJhdGlvblRzRmlsZShzb3VyY2VGaWxlKSlcbiAgICAgICAgLmZvckVhY2goc291cmNlRmlsZSA9PiBtYXAuc2V0KHNvdXJjZUZpbGUucmVwbGFjZSgvXFwudHMkLywgJy5uZ2ZhY3RvcnkudHMnKSwgc291cmNlRmlsZSkpO1xuICAgIHJldHVybiBuZXcgRmFjdG9yeUdlbmVyYXRvcihtYXApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRXhwb3J0ZWQoZGVjbDogdHMuRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIGRlY2wubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIGRlY2wubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRmFjdG9yeUluZm8ge1xuICBzb3VyY2VGaWxlUGF0aDogc3RyaW5nO1xuICBtb2R1bGVTeW1ib2xOYW1lczogU2V0PHN0cmluZz47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtKFxuICAgIGZhY3RvcnlNYXA6IE1hcDxzdHJpbmcsIEZhY3RvcnlJbmZvPixcbiAgICBjb3JlSW1wb3J0c0Zyb206IHRzLlNvdXJjZUZpbGUgfCBudWxsKTogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpOiB0cy5UcmFuc2Zvcm1lcjx0cy5Tb3VyY2VGaWxlPiA9PiB7XG4gICAgcmV0dXJuIChmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSA9PiB7XG4gICAgICByZXR1cm4gdHJhbnNmb3JtRmFjdG9yeVNvdXJjZUZpbGUoZmFjdG9yeU1hcCwgY29udGV4dCwgY29yZUltcG9ydHNGcm9tLCBmaWxlKTtcbiAgICB9O1xuICB9O1xufVxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1GYWN0b3J5U291cmNlRmlsZShcbiAgICBmYWN0b3J5TWFwOiBNYXA8c3RyaW5nLCBGYWN0b3J5SW5mbz4sIGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCxcbiAgICBjb3JlSW1wb3J0c0Zyb206IHRzLlNvdXJjZUZpbGUgfCBudWxsLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gIC8vIElmIHRoaXMgaXMgbm90IGEgZ2VuZXJhdGVkIGZpbGUsIGl0IHdvbid0IGhhdmUgZmFjdG9yeSBpbmZvIGFzc29jaWF0ZWQgd2l0aCBpdC5cbiAgaWYgKCFmYWN0b3J5TWFwLmhhcyhmaWxlLmZpbGVOYW1lKSkge1xuICAgIC8vIERvbid0IHRyYW5zZm9ybSBub24tZ2VuZXJhdGVkIGNvZGUuXG4gICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBjb25zdCB7bW9kdWxlU3ltYm9sTmFtZXMsIHNvdXJjZUZpbGVQYXRofSA9IGZhY3RvcnlNYXAuZ2V0KGZpbGUuZmlsZU5hbWUpICE7XG5cbiAgY29uc3QgY2xvbmUgPSB0cy5nZXRNdXRhYmxlQ2xvbmUoZmlsZSk7XG5cbiAgY29uc3QgdHJhbnNmb3JtZWRTdGF0ZW1lbnRzID0gZmlsZS5zdGF0ZW1lbnRzLm1hcChzdG10ID0+IHtcbiAgICBpZiAoY29yZUltcG9ydHNGcm9tICE9PSBudWxsICYmIHRzLmlzSW1wb3J0RGVjbGFyYXRpb24oc3RtdCkgJiZcbiAgICAgICAgdHMuaXNTdHJpbmdMaXRlcmFsKHN0bXQubW9kdWxlU3BlY2lmaWVyKSAmJiBzdG10Lm1vZHVsZVNwZWNpZmllci50ZXh0ID09PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgIGNvbnN0IHBhdGggPSByZWxhdGl2ZVBhdGhCZXR3ZWVuKHNvdXJjZUZpbGVQYXRoLCBjb3JlSW1wb3J0c0Zyb20uZmlsZU5hbWUpO1xuICAgICAgaWYgKHBhdGggIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRzLnVwZGF0ZUltcG9ydERlY2xhcmF0aW9uKFxuICAgICAgICAgICAgc3RtdCwgc3RtdC5kZWNvcmF0b3JzLCBzdG10Lm1vZGlmaWVycywgc3RtdC5pbXBvcnRDbGF1c2UsIHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwocGF0aCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZU5vdEVtaXR0ZWRTdGF0ZW1lbnQoc3RtdCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0bXQpICYmIHN0bXQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICAgIGNvbnN0IGRlY2wgPSBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnNbMF07XG4gICAgICBpZiAodHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkpIHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSBTVFJJUF9OR19GQUNUT1JZLmV4ZWMoZGVjbC5uYW1lLnRleHQpO1xuICAgICAgICBpZiAobWF0Y2ggPT09IG51bGwgfHwgIW1vZHVsZVN5bWJvbE5hbWVzLmhhcyhtYXRjaFsxXSkpIHtcbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIGdpdmVuIGZhY3RvcnkgYXMgaXQgd2Fzbid0IGFjdHVhbGx5IGZvciBhbiBOZ01vZHVsZS5cbiAgICAgICAgICByZXR1cm4gdHMuY3JlYXRlTm90RW1pdHRlZFN0YXRlbWVudChzdG10KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHN0bXQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzdG10O1xuICAgIH1cbiAgfSk7XG4gIGlmICghdHJhbnNmb3JtZWRTdGF0ZW1lbnRzLnNvbWUodHMuaXNWYXJpYWJsZVN0YXRlbWVudCkpIHtcbiAgICAvLyBJZiB0aGUgcmVzdWx0aW5nIGZpbGUgaGFzIG5vIGZhY3RvcmllcywgaW5jbHVkZSBhbiBlbXB0eSBleHBvcnQgdG9cbiAgICAvLyBzYXRpc2Z5IGNsb3N1cmUgY29tcGlsZXIuXG4gICAgdHJhbnNmb3JtZWRTdGF0ZW1lbnRzLnB1c2godHMuY3JlYXRlVmFyaWFibGVTdGF0ZW1lbnQoXG4gICAgICAgIFt0cy5jcmVhdGVNb2RpZmllcih0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpXSxcbiAgICAgICAgdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3QoXG4gICAgICAgICAgICBbdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbignybVOb25FbXB0eU1vZHVsZScsIHVuZGVmaW5lZCwgdHMuY3JlYXRlVHJ1ZSgpKV0sXG4gICAgICAgICAgICB0cy5Ob2RlRmxhZ3MuQ29uc3QpKSk7XG4gIH1cbiAgY2xvbmUuc3RhdGVtZW50cyA9IHRzLmNyZWF0ZU5vZGVBcnJheSh0cmFuc2Zvcm1lZFN0YXRlbWVudHMpO1xuICByZXR1cm4gY2xvbmU7XG59XG4iXX0=