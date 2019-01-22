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
        define("@angular/compiler-cli/src/ngtsc/imports/src/resolver", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/imports/src/references"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var references_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/references");
    /**
     * Used by `RouterEntryPointManager` and `NgModuleRouteAnalyzer` (which is in turn is used by
     * `NgModuleDecoratorHandler`) for resolving the module source-files references in lazy-loaded
     * routes (relative to the source-file containing the `NgModule` that provides the route
     * definitions).
     */
    var ModuleResolver = /** @class */ (function () {
        function ModuleResolver(program, compilerOptions, host) {
            this.program = program;
            this.compilerOptions = compilerOptions;
            this.host = host;
        }
        ModuleResolver.prototype.resolveModuleName = function (module, containingFile) {
            var resolved = ts.resolveModuleName(module, containingFile.fileName, this.compilerOptions, this.host)
                .resolvedModule;
            if (resolved === undefined) {
                return null;
            }
            return this.program.getSourceFile(resolved.resolvedFileName) || null;
        };
        return ModuleResolver;
    }());
    exports.ModuleResolver = ModuleResolver;
    var TsReferenceResolver = /** @class */ (function () {
        function TsReferenceResolver(program, checker, options, host) {
            this.program = program;
            this.checker = checker;
            this.options = options;
            this.host = host;
            this.moduleExportsCache = new Map();
        }
        TsReferenceResolver.prototype.resolve = function (decl, importFromHint, fromFile) {
            var id = identifierOfDeclaration(decl);
            if (id === undefined) {
                throw new Error("Internal error: don't know how to refer to " + ts.SyntaxKind[decl.kind]);
            }
            if (!typescript_1.isFromDtsFile(decl) || importFromHint === null) {
                return new references_1.ResolvedReference(decl, id);
            }
            else {
                var publicName = this.resolveImportName(importFromHint, decl, fromFile);
                if (publicName !== null) {
                    return new references_1.AbsoluteReference(decl, id, importFromHint, publicName);
                }
                else {
                    throw new Error("Internal error: Symbol " + id.text + " is not exported from " + importFromHint);
                }
            }
        };
        TsReferenceResolver.prototype.resolveImportName = function (moduleName, target, fromFile) {
            var exports = this.getExportsOfModule(moduleName, fromFile);
            if (exports !== null && exports.has(target)) {
                return exports.get(target);
            }
            else {
                return null;
            }
        };
        TsReferenceResolver.prototype.getExportsOfModule = function (moduleName, fromFile) {
            if (!this.moduleExportsCache.has(moduleName)) {
                this.moduleExportsCache.set(moduleName, this.enumerateExportsOfModule(moduleName, fromFile));
            }
            return this.moduleExportsCache.get(moduleName);
        };
        TsReferenceResolver.prototype.enumerateExportsOfModule = function (moduleName, fromFile) {
            var e_1, _a;
            var resolved = ts.resolveModuleName(moduleName, fromFile, this.options, this.host);
            if (resolved.resolvedModule === undefined) {
                return null;
            }
            var indexFile = this.program.getSourceFile(resolved.resolvedModule.resolvedFileName);
            if (indexFile === undefined) {
                return null;
            }
            var indexSymbol = this.checker.getSymbolAtLocation(indexFile);
            if (indexSymbol === undefined) {
                return null;
            }
            var exportMap = new Map();
            var exports = this.checker.getExportsOfModule(indexSymbol);
            try {
                for (var exports_1 = tslib_1.__values(exports), exports_1_1 = exports_1.next(); !exports_1_1.done; exports_1_1 = exports_1.next()) {
                    var expSymbol = exports_1_1.value;
                    var declSymbol = expSymbol.flags & ts.SymbolFlags.Alias ?
                        this.checker.getAliasedSymbol(expSymbol) :
                        expSymbol;
                    var decl = declSymbol.valueDeclaration;
                    if (decl === undefined) {
                        continue;
                    }
                    if (declSymbol.name === expSymbol.name || !exportMap.has(decl)) {
                        exportMap.set(decl, expSymbol.name);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (exports_1_1 && !exports_1_1.done && (_a = exports_1.return)) _a.call(exports_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return exportMap;
        };
        return TsReferenceResolver;
    }());
    exports.TsReferenceResolver = TsReferenceResolver;
    function identifierOfDeclaration(decl) {
        if (ts.isClassDeclaration(decl)) {
            return decl.name;
        }
        else if (ts.isEnumDeclaration(decl)) {
            return decl.name;
        }
        else if (ts.isFunctionDeclaration(decl)) {
            return decl.name;
        }
        else if (ts.isVariableDeclaration(decl) && ts.isIdentifier(decl.name)) {
            return decl.name;
        }
        else if (ts.isShorthandPropertyAssignment(decl)) {
            return decl.name;
        }
        else {
            return undefined;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvc3JjL3Jlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyxrRkFBd0Q7SUFFeEQscUZBQTZFO0lBTzdFOzs7OztPQUtHO0lBQ0g7UUFDRSx3QkFDWSxPQUFtQixFQUFVLGVBQW1DLEVBQ2hFLElBQXFCO1lBRHJCLFlBQU8sR0FBUCxPQUFPLENBQVk7WUFBVSxvQkFBZSxHQUFmLGVBQWUsQ0FBb0I7WUFDaEUsU0FBSSxHQUFKLElBQUksQ0FBaUI7UUFBRyxDQUFDO1FBRXJDLDBDQUFpQixHQUFqQixVQUFrQixNQUFjLEVBQUUsY0FBNkI7WUFDN0QsSUFBTSxRQUFRLEdBQ1YsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQztpQkFDakYsY0FBYyxDQUFDO1lBQ3hCLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtnQkFDMUIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksSUFBSSxDQUFDO1FBQ3ZFLENBQUM7UUFDSCxxQkFBQztJQUFELENBQUMsQUFkRCxJQWNDO0lBZFksd0NBQWM7SUFnQjNCO1FBR0UsNkJBQ1ksT0FBbUIsRUFBVSxPQUF1QixFQUNwRCxPQUEyQixFQUFVLElBQXFCO1lBRDFELFlBQU8sR0FBUCxPQUFPLENBQVk7WUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUNwRCxZQUFPLEdBQVAsT0FBTyxDQUFvQjtZQUFVLFNBQUksR0FBSixJQUFJ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Q2xCO2FBQU0sSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkUsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ2xCO2FBQU0sSUFBSSxFQUFFLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDakQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ2xCO2FBQU07WUFDTCxPQUFPLFNBQVMsQ0FBQztTQUNsQjtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2lzRnJvbUR0c0ZpbGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlUmVmZXJlbmNlLCBSZWZlcmVuY2UsIFJlc29sdmVkUmVmZXJlbmNlfSBmcm9tICcuL3JlZmVyZW5jZXMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlZmVyZW5jZVJlc29sdmVyIHtcbiAgcmVzb2x2ZShkZWNsOiB0cy5EZWNsYXJhdGlvbiwgaW1wb3J0RnJvbUhpbnQ6IHN0cmluZ3xudWxsLCBmcm9tRmlsZTogc3RyaW5nKTpcbiAgICAgIFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj47XG59XG5cbi8qKlxuICogVXNlZCBieSBgUm91dGVyRW50cnlQb2ludE1hbmFnZXJgIGFuZCBgTmdNb2R1bGVSb3V0ZUFuYWx5emVyYCAod2hpY2ggaXMgaW4gdHVybiBpcyB1c2VkIGJ5XG4gKiBgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyYCkgZm9yIHJlc29sdmluZyB0aGUgbW9kdWxlIHNvdXJjZS1maWxlcyByZWZlcmVuY2VzIGluIGxhenktbG9hZGVkXG4gKiByb3V0ZXMgKHJlbGF0aXZlIHRvIHRoZSBzb3VyY2UtZmlsZSBjb250YWluaW5nIHRoZSBgTmdNb2R1bGVgIHRoYXQgcHJvdmlkZXMgdGhlIHJvdXRlXG4gKiBkZWZpbml0aW9ucykuXG4gKi9cbmV4cG9ydCBjbGFzcyBNb2R1bGVSZXNvbHZlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBwcml2YXRlIGNvbXBpbGVyT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBob3N0OiB0cy5Db21waWxlckhvc3QpIHt9XG5cbiAgcmVzb2x2ZU1vZHVsZU5hbWUobW9kdWxlOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgICBjb25zdCByZXNvbHZlZCA9XG4gICAgICAgIHRzLnJlc29sdmVNb2R1bGVOYW1lKG1vZHVsZSwgY29udGFpbmluZ0ZpbGUuZmlsZU5hbWUsIHRoaXMuY29tcGlsZXJPcHRpb25zLCB0aGlzLmhvc3QpXG4gICAgICAgICAgICAucmVzb2x2ZWRNb2R1bGU7XG4gICAgaWYgKHJlc29sdmVkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUocmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZSkgfHwgbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVHNSZWZlcmVuY2VSZXNvbHZlciBpbXBsZW1lbnRzIFJlZmVyZW5jZVJlc29sdmVyIHtcbiAgcHJpdmF0ZSBtb2R1bGVFeHBvcnRzQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+fG51bGw+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHByb2dyYW06IHRzLlByb2dyYW0sIHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgICBwcml2YXRlIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucywgcHJpdmF0ZSBob3N0OiB0cy5Db21waWxlckhvc3QpIHt9XG5cbiAgcmVzb2x2ZShkZWNsOiB0cy5EZWNsYXJhdGlvbiwgaW1wb3J0RnJvbUhpbnQ6IHN0cmluZ3xudWxsLCBmcm9tRmlsZTogc3RyaW5nKTpcbiAgICAgIFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4ge1xuICAgIGNvbnN0IGlkID0gaWRlbnRpZmllck9mRGVjbGFyYXRpb24oZGVjbCk7XG4gICAgaWYgKGlkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgZXJyb3I6IGRvbid0IGtub3cgaG93IHRvIHJlZmVyIHRvICR7dHMuU3ludGF4S2luZFtkZWNsLmtpbmRdfWApO1xuICAgIH1cblxuICAgIGlmICghaXNGcm9tRHRzRmlsZShkZWNsKSB8fCBpbXBvcnRGcm9tSGludCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG5ldyBSZXNvbHZlZFJlZmVyZW5jZShkZWNsLCBpZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHB1YmxpY05hbWUgPSB0aGlzLnJlc29sdmVJbXBvcnROYW1lKGltcG9ydEZyb21IaW50LCBkZWNsLCBmcm9tRmlsZSk7XG4gICAgICBpZiAocHVibGljTmFtZSAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbmV3IEFic29sdXRlUmVmZXJlbmNlKGRlY2wsIGlkLCBpbXBvcnRGcm9tSGludCwgcHVibGljTmFtZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludGVybmFsIGVycm9yOiBTeW1ib2wgJHtpZC50ZXh0fSBpcyBub3QgZXhwb3J0ZWQgZnJvbSAke2ltcG9ydEZyb21IaW50fWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZUltcG9ydE5hbWUobW9kdWxlTmFtZTogc3RyaW5nLCB0YXJnZXQ6IHRzLkRlY2xhcmF0aW9uLCBmcm9tRmlsZTogc3RyaW5nKTogc3RyaW5nXG4gICAgICB8bnVsbCB7XG4gICAgY29uc3QgZXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZU5hbWUsIGZyb21GaWxlKTtcbiAgICBpZiAoZXhwb3J0cyAhPT0gbnVsbCAmJiBleHBvcnRzLmhhcyh0YXJnZXQpKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5nZXQodGFyZ2V0KSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGVOYW1lOiBzdHJpbmcsIGZyb21GaWxlOiBzdHJpbmcpOlxuICAgICAgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+fG51bGwge1xuICAgIGlmICghdGhpcy5tb2R1bGVFeHBvcnRzQ2FjaGUuaGFzKG1vZHVsZU5hbWUpKSB7XG4gICAgICB0aGlzLm1vZHVsZUV4cG9ydHNDYWNoZS5zZXQobW9kdWxlTmFtZSwgdGhpcy5lbnVtZXJhdGVFeHBvcnRzT2ZNb2R1bGUobW9kdWxlTmFtZSwgZnJvbUZpbGUpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubW9kdWxlRXhwb3J0c0NhY2hlLmdldChtb2R1bGVOYW1lKSAhO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnVtZXJhdGVFeHBvcnRzT2ZNb2R1bGUobW9kdWxlTmFtZTogc3RyaW5nLCBmcm9tRmlsZTogc3RyaW5nKTpcbiAgICAgIE1hcDx0cy5EZWNsYXJhdGlvbiwgc3RyaW5nPnxudWxsIHtcbiAgICBjb25zdCByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKG1vZHVsZU5hbWUsIGZyb21GaWxlLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCk7XG4gICAgaWYgKHJlc29sdmVkLnJlc29sdmVkTW9kdWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGluZGV4RmlsZSA9IHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHJlc29sdmVkLnJlc29sdmVkTW9kdWxlLnJlc29sdmVkRmlsZU5hbWUpO1xuICAgIGlmIChpbmRleEZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaW5kZXhTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpbmRleEZpbGUpO1xuICAgIGlmIChpbmRleFN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHBvcnRNYXAgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+KCk7XG5cbiAgICBjb25zdCBleHBvcnRzID0gdGhpcy5jaGVja2VyLmdldEV4cG9ydHNPZk1vZHVsZShpbmRleFN5bWJvbCk7XG4gICAgZm9yIChjb25zdCBleHBTeW1ib2wgb2YgZXhwb3J0cykge1xuICAgICAgY29uc3QgZGVjbFN5bWJvbCA9IGV4cFN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzID9cbiAgICAgICAgICB0aGlzLmNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChleHBTeW1ib2wpIDpcbiAgICAgICAgICBleHBTeW1ib2w7XG4gICAgICBjb25zdCBkZWNsID0gZGVjbFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgaWYgKGRlY2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGRlY2xTeW1ib2wubmFtZSA9PT0gZXhwU3ltYm9sLm5hbWUgfHwgIWV4cG9ydE1hcC5oYXMoZGVjbCkpIHtcbiAgICAgICAgZXhwb3J0TWFwLnNldChkZWNsLCBleHBTeW1ib2wubmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGV4cG9ydE1hcDtcbiAgfVxufVxuXG5mdW5jdGlvbiBpZGVudGlmaWVyT2ZEZWNsYXJhdGlvbihkZWNsOiB0cy5EZWNsYXJhdGlvbik6IHRzLklkZW50aWZpZXJ8dW5kZWZpbmVkIHtcbiAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkZWNsKSkge1xuICAgIHJldHVybiBkZWNsLm5hbWU7XG4gIH0gZWxzZSBpZiAodHMuaXNFbnVtRGVjbGFyYXRpb24oZGVjbCkpIHtcbiAgICByZXR1cm4gZGVjbC5uYW1lO1xuICB9IGVsc2UgaWYgKHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihkZWNsKSkge1xuICAgIHJldHVybiBkZWNsLm5hbWU7XG4gIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2wpICYmIHRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpKSB7XG4gICAgcmV0dXJuIGRlY2wubmFtZTtcbiAgfSBlbHNlIGlmICh0cy5pc1Nob3J0aGFuZFByb3BlcnR5QXNzaWdubWVudChkZWNsKSkge1xuICAgIHJldHVybiBkZWNsLm5hbWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuIl19