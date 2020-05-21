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
        define("@angular/compiler-cli/ngcc/src/host/delegating_host", ["require", "exports", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DelegatingReflectionHost = void 0;
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    /**
     * A reflection host implementation that delegates reflector queries depending on whether they
     * reflect on declaration files (for dependent libraries) or source files within the entry-point
     * that is being compiled. The first type of queries are handled by the regular TypeScript
     * reflection host, whereas the other queries are handled by an `NgccReflectionHost` that is
     * specific to the entry-point's format.
     */
    var DelegatingReflectionHost = /** @class */ (function () {
        function DelegatingReflectionHost(tsHost, ngccHost) {
            this.tsHost = tsHost;
            this.ngccHost = ngccHost;
        }
        DelegatingReflectionHost.prototype.getConstructorParameters = function (clazz) {
            if (typescript_1.isFromDtsFile(clazz)) {
                return this.tsHost.getConstructorParameters(clazz);
            }
            return this.ngccHost.getConstructorParameters(clazz);
        };
        DelegatingReflectionHost.prototype.getDeclarationOfIdentifier = function (id) {
            if (typescript_1.isFromDtsFile(id)) {
                var declaration = this.tsHost.getDeclarationOfIdentifier(id);
                return declaration !== null ? this.detectKnownDeclaration(declaration) : null;
            }
            return this.ngccHost.getDeclarationOfIdentifier(id);
        };
        DelegatingReflectionHost.prototype.getDecoratorsOfDeclaration = function (declaration) {
            if (typescript_1.isFromDtsFile(declaration)) {
                return this.tsHost.getDecoratorsOfDeclaration(declaration);
            }
            return this.ngccHost.getDecoratorsOfDeclaration(declaration);
        };
        DelegatingReflectionHost.prototype.getDefinitionOfFunction = function (fn) {
            if (typescript_1.isFromDtsFile(fn)) {
                return this.tsHost.getDefinitionOfFunction(fn);
            }
            return this.ngccHost.getDefinitionOfFunction(fn);
        };
        DelegatingReflectionHost.prototype.getDtsDeclaration = function (declaration) {
            if (typescript_1.isFromDtsFile(declaration)) {
                return this.tsHost.getDtsDeclaration(declaration);
            }
            return this.ngccHost.getDtsDeclaration(declaration);
        };
        DelegatingReflectionHost.prototype.getExportsOfModule = function (module) {
            var _this = this;
            if (typescript_1.isFromDtsFile(module)) {
                var exportMap = this.tsHost.getExportsOfModule(module);
                if (exportMap !== null) {
                    exportMap.forEach(function (decl) { return _this.detectKnownDeclaration(decl); });
                }
                return exportMap;
            }
            return this.ngccHost.getExportsOfModule(module);
        };
        DelegatingReflectionHost.prototype.getGenericArityOfClass = function (clazz) {
            if (typescript_1.isFromDtsFile(clazz)) {
                return this.tsHost.getGenericArityOfClass(clazz);
            }
            return this.ngccHost.getGenericArityOfClass(clazz);
        };
        DelegatingReflectionHost.prototype.getImportOfIdentifier = function (id) {
            if (typescript_1.isFromDtsFile(id)) {
                return this.tsHost.getImportOfIdentifier(id);
            }
            return this.ngccHost.getImportOfIdentifier(id);
        };
        DelegatingReflectionHost.prototype.getInternalNameOfClass = function (clazz) {
            if (typescript_1.isFromDtsFile(clazz)) {
                return this.tsHost.getInternalNameOfClass(clazz);
            }
            return this.ngccHost.getInternalNameOfClass(clazz);
        };
        DelegatingReflectionHost.prototype.getAdjacentNameOfClass = function (clazz) {
            if (typescript_1.isFromDtsFile(clazz)) {
                return this.tsHost.getAdjacentNameOfClass(clazz);
            }
            return this.ngccHost.getAdjacentNameOfClass(clazz);
        };
        DelegatingReflectionHost.prototype.getMembersOfClass = function (clazz) {
            if (typescript_1.isFromDtsFile(clazz)) {
                return this.tsHost.getMembersOfClass(clazz);
            }
            return this.ngccHost.getMembersOfClass(clazz);
        };
        DelegatingReflectionHost.prototype.getVariableValue = function (declaration) {
            if (typescript_1.isFromDtsFile(declaration)) {
                return this.tsHost.getVariableValue(declaration);
            }
            return this.ngccHost.getVariableValue(declaration);
        };
        DelegatingReflectionHost.prototype.hasBaseClass = function (clazz) {
            if (typescript_1.isFromDtsFile(clazz)) {
                return this.tsHost.hasBaseClass(clazz);
            }
            return this.ngccHost.hasBaseClass(clazz);
        };
        DelegatingReflectionHost.prototype.getBaseClassExpression = function (clazz) {
            if (typescript_1.isFromDtsFile(clazz)) {
                return this.tsHost.getBaseClassExpression(clazz);
            }
            return this.ngccHost.getBaseClassExpression(clazz);
        };
        DelegatingReflectionHost.prototype.isClass = function (node) {
            if (typescript_1.isFromDtsFile(node)) {
                return this.tsHost.isClass(node);
            }
            return this.ngccHost.isClass(node);
        };
        // Note: the methods below are specific to ngcc and the entry-point that is being compiled, so
        // they don't take declaration files into account.
        DelegatingReflectionHost.prototype.findClassSymbols = function (sourceFile) {
            return this.ngccHost.findClassSymbols(sourceFile);
        };
        DelegatingReflectionHost.prototype.getClassSymbol = function (node) {
            return this.ngccHost.getClassSymbol(node);
        };
        DelegatingReflectionHost.prototype.getDecoratorsOfSymbol = function (symbol) {
            return this.ngccHost.getDecoratorsOfSymbol(symbol);
        };
        DelegatingReflectionHost.prototype.getSwitchableDeclarations = function (module) {
            return this.ngccHost.getSwitchableDeclarations(module);
        };
        DelegatingReflectionHost.prototype.getEndOfClass = function (classSymbol) {
            return this.ngccHost.getEndOfClass(classSymbol);
        };
        DelegatingReflectionHost.prototype.detectKnownDeclaration = function (decl) {
            return this.ngccHost.detectKnownDeclaration(decl);
        };
        return DelegatingReflectionHost;
    }());
    exports.DelegatingReflectionHost = DelegatingReflectionHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsZWdhdGluZ19ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZGVsZWdhdGluZ19ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUtILGtGQUFxRTtJQUlyRTs7Ozs7O09BTUc7SUFDSDtRQUNFLGtDQUFvQixNQUFzQixFQUFVLFFBQTRCO1lBQTVELFdBQU0sR0FBTixNQUFNLENBQWdCO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBb0I7UUFBRyxDQUFDO1FBRXBGLDJEQUF3QixHQUF4QixVQUF5QixLQUF1QjtZQUM5QyxJQUFJLDBCQUFhLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3hCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNwRDtZQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsNkRBQTBCLEdBQTFCLFVBQTJCLEVBQWlCO1lBQzFDLElBQUksMEJBQWEsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDckIsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDL0QsT0FBTyxXQUFXLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQzthQUMvRTtZQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsNkRBQTBCLEdBQTFCLFVBQTJCLFdBQTJCO1lBQ3BELElBQUksMEJBQWEsQ0FBQyxXQUFXLENBQUMsRUFB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UUFFRCw4RkFBOEY7UUFDOUYsa0RBQWtEO1FBRWxELG1EQUFnQixHQUFoQixVQUFpQixVQUF5QjtZQUN4QyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUVELGlEQUFjLEdBQWQsVUFBZSxJQUFhO1lBQzFCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUVELHdEQUFxQixHQUFyQixVQUFzQixNQUF1QjtZQUMzQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckQsQ0FBQztRQUVELDREQUF5QixHQUF6QixVQUEwQixNQUFlO1lBQ3ZDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBRUQsZ0RBQWEsR0FBYixVQUFjLFdBQTRCO1lBQ3hDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELHlEQUFzQixHQUF0QixVQUE4QyxJQUFPO1lBQ25ELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBQ0gsK0JBQUM7SUFBRCxDQUFDLEFBN0lELElBNklDO0lBN0lZLDREQUF3QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NNZW1iZXIsIEN0b3JQYXJhbWV0ZXIsIERlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIEZ1bmN0aW9uRGVmaW5pdGlvbiwgSW1wb3J0LCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtpc0Zyb21EdHNGaWxlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7TmdjY0NsYXNzU3ltYm9sLCBOZ2NjUmVmbGVjdGlvbkhvc3QsIFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9ufSBmcm9tICcuL25nY2NfaG9zdCc7XG5cbi8qKlxuICogQSByZWZsZWN0aW9uIGhvc3QgaW1wbGVtZW50YXRpb24gdGhhdCBkZWxlZ2F0ZXMgcmVmbGVjdG9yIHF1ZXJpZXMgZGVwZW5kaW5nIG9uIHdoZXRoZXIgdGhleVxuICogcmVmbGVjdCBvbiBkZWNsYXJhdGlvbiBmaWxlcyAoZm9yIGRlcGVuZGVudCBsaWJyYXJpZXMpIG9yIHNvdXJjZSBmaWxlcyB3aXRoaW4gdGhlIGVudHJ5LXBvaW50XG4gKiB0aGF0IGlzIGJlaW5nIGNvbXBpbGVkLiBUaGUgZmlyc3QgdHlwZSBvZiBxdWVyaWVzIGFyZSBoYW5kbGVkIGJ5IHRoZSByZWd1bGFyIFR5cGVTY3JpcHRcbiAqIHJlZmxlY3Rpb24gaG9zdCwgd2hlcmVhcyB0aGUgb3RoZXIgcXVlcmllcyBhcmUgaGFuZGxlZCBieSBhbiBgTmdjY1JlZmxlY3Rpb25Ib3N0YCB0aGF0IGlzXG4gKiBzcGVjaWZpYyB0byB0aGUgZW50cnktcG9pbnQncyBmb3JtYXQuXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWxlZ2F0aW5nUmVmbGVjdGlvbkhvc3QgaW1wbGVtZW50cyBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRzSG9zdDogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgbmdjY0hvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCkge31cblxuICBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDdG9yUGFyYW1ldGVyW118bnVsbCB7XG4gICAgaWYgKGlzRnJvbUR0c0ZpbGUoY2xhenopKSB7XG4gICAgICByZXR1cm4gdGhpcy50c0hvc3QuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubmdjY0hvc3QuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6KTtcbiAgfVxuXG4gIGdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgaWYgKGlzRnJvbUR0c0ZpbGUoaWQpKSB7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHRoaXMudHNIb3N0LmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkKTtcbiAgICAgIHJldHVybiBkZWNsYXJhdGlvbiAhPT0gbnVsbCA/IHRoaXMuZGV0ZWN0S25vd25EZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgOiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5uZ2NjSG9zdC5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZCk7XG4gIH1cblxuICBnZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBpZiAoaXNGcm9tRHRzRmlsZShkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB0aGlzLnRzSG9zdC5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5nY2NIb3N0LmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIGdldERlZmluaXRpb25PZkZ1bmN0aW9uKGZuOiB0cy5Ob2RlKTogRnVuY3Rpb25EZWZpbml0aW9ufG51bGwge1xuICAgIGlmIChpc0Zyb21EdHNGaWxlKGZuKSkge1xuICAgICAgcmV0dXJuIHRoaXMudHNIb3N0LmdldERlZmluaXRpb25PZkZ1bmN0aW9uKGZuKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubmdjY0hvc3QuZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24oZm4pO1xuICB9XG5cbiAgZ2V0RHRzRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogdHMuRGVjbGFyYXRpb258bnVsbCB7XG4gICAgaWYgKGlzRnJvbUR0c0ZpbGUoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdGhpcy50c0hvc3QuZ2V0RHRzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5uZ2NjSG9zdC5nZXREdHNEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gIH1cblxuICBnZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlOiB0cy5Ob2RlKTogTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGwge1xuICAgIGlmIChpc0Zyb21EdHNGaWxlKG1vZHVsZSkpIHtcbiAgICAgIGNvbnN0IGV4cG9ydE1hcCA9IHRoaXMudHNIb3N0LmdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGUpO1xuXG4gICAgICBpZiAoZXhwb3J0TWFwICE9PSBudWxsKSB7XG4gICAgICAgIGV4cG9ydE1hcC5mb3JFYWNoKGRlY2wgPT4gdGhpcy5kZXRlY3RLbm93bkRlY2xhcmF0aW9uKGRlY2wpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGV4cG9ydE1hcDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubmdjY0hvc3QuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZSk7XG4gIH1cblxuICBnZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogbnVtYmVyfG51bGwge1xuICAgIGlmIChpc0Zyb21EdHNGaWxlKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIHRoaXMudHNIb3N0LmdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xhenopO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5uZ2NjSG9zdC5nZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6KTtcbiAgfVxuXG4gIGdldEltcG9ydE9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEltcG9ydHxudWxsIHtcbiAgICBpZiAoaXNGcm9tRHRzRmlsZShpZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnRzSG9zdC5nZXRJbXBvcnRPZklkZW50aWZpZXIoaWQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5uZ2NjSG9zdC5nZXRJbXBvcnRPZklkZW50aWZpZXIoaWQpO1xuICB9XG5cbiAgZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHRzLklkZW50aWZpZXIge1xuICAgIGlmIChpc0Zyb21EdHNGaWxlKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIHRoaXMudHNIb3N0LmdldEludGVybmFsTmFtZU9mQ2xhc3MoY2xhenopO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5uZ2NjSG9zdC5nZXRJbnRlcm5hbE5hbWVPZkNsYXNzKGNsYXp6KTtcbiAgfVxuXG4gIGdldEFkamFjZW50TmFtZU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyIHtcbiAgICBpZiAoaXNGcm9tRHRzRmlsZShjbGF6eikpIHtcbiAgICAgIHJldHVybiB0aGlzLnRzSG9zdC5nZXRBZGphY2VudE5hbWVPZkNsYXNzKGNsYXp6KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubmdjY0hvc3QuZ2V0QWRqYWNlbnROYW1lT2ZDbGFzcyhjbGF6eik7XG4gIH1cblxuICBnZXRNZW1iZXJzT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyW10ge1xuICAgIGlmIChpc0Zyb21EdHNGaWxlKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIHRoaXMudHNIb3N0LmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubmdjY0hvc3QuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopO1xuICB9XG5cbiAgZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbjogdHMuVmFyaWFibGVEZWNsYXJhdGlvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKGlzRnJvbUR0c0ZpbGUoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdGhpcy50c0hvc3QuZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5nY2NIb3N0LmdldFZhcmlhYmxlVmFsdWUoZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgaGFzQmFzZUNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgaWYgKGlzRnJvbUR0c0ZpbGUoY2xhenopKSB7XG4gICAgICByZXR1cm4gdGhpcy50c0hvc3QuaGFzQmFzZUNsYXNzKGNsYXp6KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubmdjY0hvc3QuaGFzQmFzZUNsYXNzKGNsYXp6KTtcbiAgfVxuXG4gIGdldEJhc2VDbGFzc0V4cHJlc3Npb24oY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmIChpc0Zyb21EdHNGaWxlKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIHRoaXMudHNIb3N0LmdldEJhc2VDbGFzc0V4cHJlc3Npb24oY2xhenopO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5uZ2NjSG9zdC5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6KTtcbiAgfVxuXG4gIGlzQ2xhc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgQ2xhc3NEZWNsYXJhdGlvbiB7XG4gICAgaWYgKGlzRnJvbUR0c0ZpbGUobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnRzSG9zdC5pc0NsYXNzKG5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5uZ2NjSG9zdC5pc0NsYXNzKG5vZGUpO1xuICB9XG5cbiAgLy8gTm90ZTogdGhlIG1ldGhvZHMgYmVsb3cgYXJlIHNwZWNpZmljIHRvIG5nY2MgYW5kIHRoZSBlbnRyeS1wb2ludCB0aGF0IGlzIGJlaW5nIGNvbXBpbGVkLCBzb1xuICAvLyB0aGV5IGRvbid0IHRha2UgZGVjbGFyYXRpb24gZmlsZXMgaW50byBhY2NvdW50LlxuXG4gIGZpbmRDbGFzc1N5bWJvbHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE5nY2NDbGFzc1N5bWJvbFtdIHtcbiAgICByZXR1cm4gdGhpcy5uZ2NjSG9zdC5maW5kQ2xhc3NTeW1ib2xzKHNvdXJjZUZpbGUpO1xuICB9XG5cbiAgZ2V0Q2xhc3NTeW1ib2wobm9kZTogdHMuTm9kZSk6IE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLm5nY2NIb3N0LmdldENsYXNzU3ltYm9sKG5vZGUpO1xuICB9XG5cbiAgZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMubmdjY0hvc3QuZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbCk7XG4gIH1cblxuICBnZXRTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKG1vZHVsZTogdHMuTm9kZSk6IFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uW10ge1xuICAgIHJldHVybiB0aGlzLm5nY2NIb3N0LmdldFN3aXRjaGFibGVEZWNsYXJhdGlvbnMobW9kdWxlKTtcbiAgfVxuXG4gIGdldEVuZE9mQ2xhc3MoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IHRzLk5vZGUge1xuICAgIHJldHVybiB0aGlzLm5nY2NIb3N0LmdldEVuZE9mQ2xhc3MoY2xhc3NTeW1ib2wpO1xuICB9XG5cbiAgZGV0ZWN0S25vd25EZWNsYXJhdGlvbjxUIGV4dGVuZHMgRGVjbGFyYXRpb24+KGRlY2w6IFQpOiBUIHtcbiAgICByZXR1cm4gdGhpcy5uZ2NjSG9zdC5kZXRlY3RLbm93bkRlY2xhcmF0aW9uKGRlY2wpO1xuICB9XG59XG4iXX0=