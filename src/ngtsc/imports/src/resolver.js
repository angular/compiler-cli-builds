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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiLi4vLi4vLi4vLi4vLi4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvc3JjL3Jlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyxrRkFBd0Q7SUFFeEQscUZBQTZFO0lBTzdFO1FBR0UsNkJBQ1ksT0FBbUIsRUFBVSxPQUF1QixFQUNwRCxPQUEyQixFQUFVLElBQXFCO1lBRDFELFlBQU8sR0FBUCxPQUFPLENBQVk7WUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUNwRCxZQUFPLEdBQVAsT0FBTyxDQUFvQjtZQUFVLFNBQUksR0FBSixJQUFJLENBQWlCO1lBSjlELHVCQUFrQixHQUFHLElBQUksR0FBRyxFQUE0QyxDQUFDO1FBSVIsQ0FBQztRQUUxRSxxQ0FBTyxHQUFQLFVBQVEsSUFBb0IsRUFBRSxjQUEyQixFQUFFLFFBQWdCO1lBRXpFLElBQU0sRUFBRSxHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pDLElBQUksRUFBRSxLQUFLLFNBQVMsRUFBRTtnQkFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxnREFBOEMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFHLENBQUMsQ0FBQzthQUMzRjtZQUVELElBQUksQ0FBQywwQkFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLGNBQWMsS0FBSyxJQUFJLEVBQUU7Z0JBQ25ELE9BQU8sSUFBSSw4QkFBaUIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDeEM7aUJBQU07Z0JBQ0wsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzFFLElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtvQkFDdkIsT0FB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O3FCQUNyQztpQkFDRjs7Ozs7Ozs7O1lBRUQsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztRQUNILDBCQUFDO0lBQUQsQ0FBQyxBQWhGRCxJQWdGQztJQWhGWSxrREFBbUI7SUFrRmhDLFNBQVMsdUJBQXVCLENBQUMsSUFBb0I7UUFDbkQsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDL0IsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ2xCO2FBQU0sSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDckMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ2xCO2FBQU0sSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDekMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ2xCO2FBQU0sSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkUsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ2xCO2FBQU0sSUFBSSxFQUFFLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDakQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ2xCO2FBQU07WUFDTCxPQUFPLFNBQVMsQ0FBQztTQUNsQjtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2lzRnJvbUR0c0ZpbGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlUmVmZXJlbmNlLCBSZWZlcmVuY2UsIFJlc29sdmVkUmVmZXJlbmNlfSBmcm9tICcuL3JlZmVyZW5jZXMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlZmVyZW5jZVJlc29sdmVyIHtcbiAgcmVzb2x2ZShkZWNsOiB0cy5EZWNsYXJhdGlvbiwgaW1wb3J0RnJvbUhpbnQ6IHN0cmluZ3xudWxsLCBmcm9tRmlsZTogc3RyaW5nKTpcbiAgICAgIFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj47XG59XG5cbmV4cG9ydCBjbGFzcyBUc1JlZmVyZW5jZVJlc29sdmVyIGltcGxlbWVudHMgUmVmZXJlbmNlUmVzb2x2ZXIge1xuICBwcml2YXRlIG1vZHVsZUV4cG9ydHNDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz58bnVsbD4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIHByaXZhdGUgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLCBwcml2YXRlIGhvc3Q6IHRzLkNvbXBpbGVySG9zdCkge31cblxuICByZXNvbHZlKGRlY2w6IHRzLkRlY2xhcmF0aW9uLCBpbXBvcnRGcm9tSGludDogc3RyaW5nfG51bGwsIGZyb21GaWxlOiBzdHJpbmcpOlxuICAgICAgUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPiB7XG4gICAgY29uc3QgaWQgPSBpZGVudGlmaWVyT2ZEZWNsYXJhdGlvbihkZWNsKTtcbiAgICBpZiAoaWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcm5hbCBlcnJvcjogZG9uJ3Qga25vdyBob3cgdG8gcmVmZXIgdG8gJHt0cy5TeW50YXhLaW5kW2RlY2wua2luZF19YCk7XG4gICAgfVxuXG4gICAgaWYgKCFpc0Zyb21EdHNGaWxlKGRlY2wpIHx8IGltcG9ydEZyb21IaW50ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbmV3IFJlc29sdmVkUmVmZXJlbmNlKGRlY2wsIGlkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcHVibGljTmFtZSA9IHRoaXMucmVzb2x2ZUltcG9ydE5hbWUoaW1wb3J0RnJvbUhpbnQsIGRlY2wsIGZyb21GaWxlKTtcbiAgICAgIGlmIChwdWJsaWNOYW1lICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBuZXcgQWJzb2x1dGVSZWZlcmVuY2UoZGVjbCwgaWQsIGltcG9ydEZyb21IaW50LCBwdWJsaWNOYW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgZXJyb3I6IFN5bWJvbCAke2lkLnRleHR9IGlzIG5vdCBleHBvcnRlZCBmcm9tICR7aW1wb3J0RnJvbUhpbnR9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlSW1wb3J0TmFtZShtb2R1bGVOYW1lOiBzdHJpbmcsIHRhcmdldDogdHMuRGVjbGFyYXRpb24sIGZyb21GaWxlOiBzdHJpbmcpOiBzdHJpbmdcbiAgICAgIHxudWxsIHtcbiAgICBjb25zdCBleHBvcnRzID0gdGhpcy5nZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlTmFtZSwgZnJvbUZpbGUpO1xuICAgIGlmIChleHBvcnRzICE9PSBudWxsICYmIGV4cG9ydHMuaGFzKHRhcmdldCkpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmdldCh0YXJnZXQpICE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZU5hbWU6IHN0cmluZywgZnJvbUZpbGU6IHN0cmluZyk6XG4gICAgICBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz58bnVsbCB7XG4gICAgaWYgKCF0aGlzLm1vZHVsZUV4cG9ydHNDYWNoZS5oYXMobW9kdWxlTmFtZSkpIHtcbiAgICAgIHRoaXMubW9kdWxlRXhwb3J0c0NhY2hlLnNldChtb2R1bGVOYW1lLCB0aGlzLmVudW1lcmF0ZUV4cG9ydHNPZk1vZHVsZShtb2R1bGVOYW1lLCBmcm9tRmlsZSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tb2R1bGVFeHBvcnRzQ2FjaGUuZ2V0KG1vZHVsZU5hbWUpICE7XG4gIH1cblxuICBwcml2YXRlIGVudW1lcmF0ZUV4cG9ydHNPZk1vZHVsZShtb2R1bGVOYW1lOiBzdHJpbmcsIGZyb21GaWxlOiBzdHJpbmcpOlxuICAgICAgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+fG51bGwge1xuICAgIGNvbnN0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUobW9kdWxlTmFtZSwgZnJvbUZpbGUsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgICBpZiAocmVzb2x2ZWQucmVzb2x2ZWRNb2R1bGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaW5kZXhGaWxlID0gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUocmVzb2x2ZWQucmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZSk7XG4gICAgaWYgKGluZGV4RmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBpbmRleFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGluZGV4RmlsZSk7XG4gICAgaWYgKGluZGV4U3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGV4cG9ydE1hcCA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz4oKTtcblxuICAgIGNvbnN0IGV4cG9ydHMgPSB0aGlzLmNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKGluZGV4U3ltYm9sKTtcbiAgICBmb3IgKGNvbnN0IGV4cFN5bWJvbCBvZiBleHBvcnRzKSB7XG4gICAgICBjb25zdCBkZWNsU3ltYm9sID0gZXhwU3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMgP1xuICAgICAgICAgIHRoaXMuY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKGV4cFN5bWJvbCkgOlxuICAgICAgICAgIGV4cFN5bWJvbDtcbiAgICAgIGNvbnN0IGRlY2wgPSBkZWNsU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgICBpZiAoZGVjbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGVjbFN5bWJvbC5uYW1lID09PSBleHBTeW1ib2wubmFtZSB8fCAhZXhwb3J0TWFwLmhhcyhkZWNsKSkge1xuICAgICAgICBleHBvcnRNYXAuc2V0KGRlY2wsIGV4cFN5bWJvbC5uYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZXhwb3J0TWFwO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlkZW50aWZpZXJPZkRlY2xhcmF0aW9uKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogdHMuSWRlbnRpZmllcnx1bmRlZmluZWQge1xuICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY2wpKSB7XG4gICAgcmV0dXJuIGRlY2wubmFtZTtcbiAgfSBlbHNlIGlmICh0cy5pc0VudW1EZWNsYXJhdGlvbihkZWNsKSkge1xuICAgIHJldHVybiBkZWNsLm5hbWU7XG4gIH0gZWxzZSBpZiAodHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKGRlY2wpKSB7XG4gICAgcmV0dXJuIGRlY2wubmFtZTtcbiAgfSBlbHNlIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbCkgJiYgdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkpIHtcbiAgICByZXR1cm4gZGVjbC5uYW1lO1xuICB9IGVsc2UgaWYgKHRzLmlzU2hvcnRoYW5kUHJvcGVydHlBc3NpZ25tZW50KGRlY2wpKSB7XG4gICAgcmV0dXJuIGRlY2wubmFtZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG4iXX0=