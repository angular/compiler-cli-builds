(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/private_declarations_analyzer", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    /**
     * This class will analyze a program to find all the declared classes
     * (i.e. on an NgModule) that are not publicly exported via an entry-point.
     */
    var PrivateDeclarationsAnalyzer = /** @class */ (function () {
        function PrivateDeclarationsAnalyzer(host, referencesRegistry) {
            this.host = host;
            this.referencesRegistry = referencesRegistry;
        }
        PrivateDeclarationsAnalyzer.prototype.analyzeProgram = function (program) {
            var rootFiles = this.getRootFiles(program);
            return this.getPrivateDeclarations(rootFiles, this.referencesRegistry.getDeclarationMap());
        };
        PrivateDeclarationsAnalyzer.prototype.getRootFiles = function (program) {
            return program.getRootFileNames().map(function (f) { return program.getSourceFile(f); }).filter(utils_1.isDefined);
        };
        PrivateDeclarationsAnalyzer.prototype.getPrivateDeclarations = function (rootFiles, declarations) {
            var _this = this;
            var privateDeclarations = new Map(declarations);
            var exportAliasDeclarations = new Map();
            rootFiles.forEach(function (f) {
                var exports = _this.host.getExportsOfModule(f);
                if (exports) {
                    exports.forEach(function (declaration, exportedName) {
                        if (declaration.node !== null && utils_1.hasNameIdentifier(declaration.node)) {
                            if (privateDeclarations.has(declaration.node.name)) {
                                var privateDeclaration = privateDeclarations.get(declaration.node.name);
                                if (privateDeclaration.node !== declaration.node) {
                                    throw new Error(declaration.node.name.text + " is declared multiple times.");
                                }
                                if (declaration.node.name.text === exportedName) {
                                    // This declaration is public so we can remove it from the list
                                    privateDeclarations.delete(declaration.node.name);
                                }
                                else if (!_this.host.getDtsDeclaration(declaration.node)) {
                                    // The referenced declaration is exported publicly but via an alias.
                                    // In some cases the original declaration is missing from the dts program, such as
                                    // when rolling up (flattening) the dts files.
                                    // This is because the original declaration gets renamed to the exported alias.
                                    // There is a constraint on this which we cannot handle. Consider the following
                                    // code:
                                    //
                                    // /src/entry_point.js:
                                    //     export {MyComponent as aliasedMyComponent} from './a';
                                    //     export {MyComponent} from './b';`
                                    //
                                    // /src/a.js:
                                    //     export class MyComponent {}
                                    //
                                    // /src/b.js:
                                    //     export class MyComponent {}
                                    //
                                    // //typings/entry_point.d.ts:
                                    //     export declare class aliasedMyComponent {}
                                    //     export declare class MyComponent {}
                                    //
                                    // In this case we would end up matching the `MyComponent` from `/src/a.js` to the
                                    // `MyComponent` declared in `/typings/entry_point.d.ts` even though that
                                    // declaration is actually for the `MyComponent` in `/src/b.js`.
                                    exportAliasDeclarations.set(declaration.node.name, exportedName);
                                }
                            }
                        }
                    });
                }
            });
            return Array.from(privateDeclarations.keys()).map(function (id) {
                var from = file_system_1.absoluteFromSourceFile(id.getSourceFile());
                var declaration = privateDeclarations.get(id);
                var alias = exportAliasDeclarations.has(id) ? exportAliasDeclarations.get(id) : null;
                var dtsDeclaration = _this.host.getDtsDeclaration(declaration.node);
                var dtsFrom = dtsDeclaration && file_system_1.absoluteFromSourceFile(dtsDeclaration.getSourceFile());
                return { identifier: id.text, from: from, dtsFrom: dtsFrom, alias: alias };
            });
        };
        return PrivateDeclarationsAnalyzer;
    }());
    exports.PrivateDeclarationsAnalyzer = PrivateDeclarationsAnalyzer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFTQSwyRUFBc0Y7SUFHdEYsOERBQXNEO0lBV3REOzs7T0FHRztJQUNIO1FBQ0UscUNBQ1ksSUFBd0IsRUFBVSxrQkFBMEM7WUFBNUUsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBVSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXdCO1FBQUcsQ0FBQztRQUU1RixvREFBYyxHQUFkLFVBQWUsT0FBbUI7WUFDaEMsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3QyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUM3RixDQUFDO1FBRU8sa0RBQVksR0FBcEIsVUFBcUIsT0FBbUI7WUFDdEMsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUF4QixDQUF3QixDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFTLENBQUMsQ0FBQztRQUN6RixDQUFDO1FBRU8sNERBQXNCLEdBQTlCLFVBQ0ksU0FBMEIsRUFDMUIsWUFBcUQ7WUFGekQsaUJBZ0VDO1lBN0RDLElBQU0sbUJBQW1CLEdBQTRDLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzNGLElBQU0sdUJBQXVCLEdBQStCLElBQUksR0FBRyxFQUFFLENBQUM7WUFFdEUsU0FBUyxDQUFDLE9BQU8sQ0FB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O1FBQ0gsa0NBQUM7SUFBRCxDQUFDLEFBOUVELElBOEVDO0lBOUVZLGtFQUEyQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDb25jcmV0ZURlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtoYXNOYW1lSWRlbnRpZmllciwgaXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge05nY2NSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4vbmdjY19yZWZlcmVuY2VzX3JlZ2lzdHJ5JztcblxuZXhwb3J0IGludGVyZmFjZSBFeHBvcnRJbmZvIHtcbiAgaWRlbnRpZmllcjogc3RyaW5nO1xuICBmcm9tOiBBYnNvbHV0ZUZzUGF0aDtcbiAgZHRzRnJvbT86IEFic29sdXRlRnNQYXRofG51bGw7XG4gIGFsaWFzPzogc3RyaW5nfG51bGw7XG59XG5leHBvcnQgdHlwZSBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMgPSBFeHBvcnRJbmZvW107XG5cbi8qKlxuICogVGhpcyBjbGFzcyB3aWxsIGFuYWx5emUgYSBwcm9ncmFtIHRvIGZpbmQgYWxsIHRoZSBkZWNsYXJlZCBjbGFzc2VzXG4gKiAoaS5lLiBvbiBhbiBOZ01vZHVsZSkgdGhhdCBhcmUgbm90IHB1YmxpY2x5IGV4cG9ydGVkIHZpYSBhbiBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IGNsYXNzIFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgcmVmZXJlbmNlc1JlZ2lzdHJ5OiBOZ2NjUmVmZXJlbmNlc1JlZ2lzdHJ5KSB7fVxuXG4gIGFuYWx5emVQcm9ncmFtKHByb2dyYW06IHRzLlByb2dyYW0pOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMge1xuICAgIGNvbnN0IHJvb3RGaWxlcyA9IHRoaXMuZ2V0Um9vdEZpbGVzKHByb2dyYW0pO1xuICAgIHJldHVybiB0aGlzLmdldFByaXZhdGVEZWNsYXJhdGlvbnMocm9vdEZpbGVzLCB0aGlzLnJlZmVyZW5jZXNSZWdpc3RyeS5nZXREZWNsYXJhdGlvbk1hcCgpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Um9vdEZpbGVzKHByb2dyYW06IHRzLlByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlW10ge1xuICAgIHJldHVybiBwcm9ncmFtLmdldFJvb3RGaWxlTmFtZXMoKS5tYXAoZiA9PiBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZikpLmZpbHRlcihpc0RlZmluZWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRQcml2YXRlRGVjbGFyYXRpb25zKFxuICAgICAgcm9vdEZpbGVzOiB0cy5Tb3VyY2VGaWxlW10sXG4gICAgICBkZWNsYXJhdGlvbnM6IE1hcDx0cy5JZGVudGlmaWVyLCBDb25jcmV0ZURlY2xhcmF0aW9uPik6IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyB7XG4gICAgY29uc3QgcHJpdmF0ZURlY2xhcmF0aW9uczogTWFwPHRzLklkZW50aWZpZXIsIENvbmNyZXRlRGVjbGFyYXRpb24+ID0gbmV3IE1hcChkZWNsYXJhdGlvbnMpO1xuICAgIGNvbnN0IGV4cG9ydEFsaWFzRGVjbGFyYXRpb25zOiBNYXA8dHMuSWRlbnRpZmllciwgc3RyaW5nPiA9IG5ldyBNYXAoKTtcblxuICAgIHJvb3RGaWxlcy5mb3JFYWNoKGYgPT4ge1xuICAgICAgY29uc3QgZXhwb3J0cyA9IHRoaXMuaG9zdC5nZXRFeHBvcnRzT2ZNb2R1bGUoZik7XG4gICAgICBpZiAoZXhwb3J0cykge1xuICAgICAgICBleHBvcnRzLmZvckVhY2goKGRlY2xhcmF0aW9uLCBleHBvcnRlZE5hbWUpID0+IHtcbiAgICAgICAgICBpZiAoZGVjbGFyYXRpb24ubm9kZSAhPT0gbnVsbCAmJiBoYXNOYW1lSWRlbnRpZmllcihkZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgICAgICAgaWYgKHByaXZhdGVEZWNsYXJhdGlvbnMuaGFzKGRlY2xhcmF0aW9uLm5vZGUubmFtZSkpIHtcbiAgICAgICAgICAgICAgY29uc3QgcHJpdmF0ZURlY2xhcmF0aW9uID0gcHJpdmF0ZURlY2xhcmF0aW9ucy5nZXQoZGVjbGFyYXRpb24ubm9kZS5uYW1lKSAhO1xuICAgICAgICAgICAgICBpZiAocHJpdmF0ZURlY2xhcmF0aW9uLm5vZGUgIT09IGRlY2xhcmF0aW9uLm5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7ZGVjbGFyYXRpb24ubm9kZS5uYW1lLnRleHR9IGlzIGRlY2xhcmVkIG11bHRpcGxlIHRpbWVzLmApO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKGRlY2xhcmF0aW9uLm5vZGUubmFtZS50ZXh0ID09PSBleHBvcnRlZE5hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGRlY2xhcmF0aW9uIGlzIHB1YmxpYyBzbyB3ZSBjYW4gcmVtb3ZlIGl0IGZyb20gdGhlIGxpc3RcbiAgICAgICAgICAgICAgICBwcml2YXRlRGVjbGFyYXRpb25zLmRlbGV0ZShkZWNsYXJhdGlvbi5ub2RlLm5hbWUpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmhvc3QuZ2V0RHRzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgcmVmZXJlbmNlZCBkZWNsYXJhdGlvbiBpcyBleHBvcnRlZCBwdWJsaWNseSBidXQgdmlhIGFuIGFsaWFzLlxuICAgICAgICAgICAgICAgIC8vIEluIHNvbWUgY2FzZXMgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGlzIG1pc3NpbmcgZnJvbSB0aGUgZHRzIHByb2dyYW0sIHN1Y2ggYXNcbiAgICAgICAgICAgICAgICAvLyB3aGVuIHJvbGxpbmcgdXAgKGZsYXR0ZW5pbmcpIHRoZSBkdHMgZmlsZXMuXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBiZWNhdXNlIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBnZXRzIHJlbmFtZWQgdG8gdGhlIGV4cG9ydGVkIGFsaWFzLlxuXG4gICAgICAgICAgICAgICAgLy8gVGhlcmUgaXMgYSBjb25zdHJhaW50IG9uIHRoaXMgd2hpY2ggd2UgY2Fubm90IGhhbmRsZS4gQ29uc2lkZXIgdGhlIGZvbGxvd2luZ1xuICAgICAgICAgICAgICAgIC8vIGNvZGU6XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAvc3JjL2VudHJ5X3BvaW50LmpzOlxuICAgICAgICAgICAgICAgIC8vICAgICBleHBvcnQge015Q29tcG9uZW50IGFzIGFsaWFzZWRNeUNvbXBvbmVudH0gZnJvbSAnLi9hJztcbiAgICAgICAgICAgICAgICAvLyAgICAgZXhwb3J0IHtNeUNvbXBvbmVudH0gZnJvbSAnLi9iJztgXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAvc3JjL2EuanM6XG4gICAgICAgICAgICAgICAgLy8gICAgIGV4cG9ydCBjbGFzcyBNeUNvbXBvbmVudCB7fVxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gL3NyYy9iLmpzOlxuICAgICAgICAgICAgICAgIC8vICAgICBleHBvcnQgY2xhc3MgTXlDb21wb25lbnQge31cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vIC8vdHlwaW5ncy9lbnRyeV9wb2ludC5kLnRzOlxuICAgICAgICAgICAgICAgIC8vICAgICBleHBvcnQgZGVjbGFyZSBjbGFzcyBhbGlhc2VkTXlDb21wb25lbnQge31cbiAgICAgICAgICAgICAgICAvLyAgICAgZXhwb3J0IGRlY2xhcmUgY2xhc3MgTXlDb21wb25lbnQge31cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vIEluIHRoaXMgY2FzZSB3ZSB3b3VsZCBlbmQgdXAgbWF0Y2hpbmcgdGhlIGBNeUNvbXBvbmVudGAgZnJvbSBgL3NyYy9hLmpzYCB0byB0aGVcbiAgICAgICAgICAgICAgICAvLyBgTXlDb21wb25lbnRgIGRlY2xhcmVkIGluIGAvdHlwaW5ncy9lbnRyeV9wb2ludC5kLnRzYCBldmVuIHRob3VnaCB0aGF0XG4gICAgICAgICAgICAgICAgLy8gZGVjbGFyYXRpb24gaXMgYWN0dWFsbHkgZm9yIHRoZSBgTXlDb21wb25lbnRgIGluIGAvc3JjL2IuanNgLlxuXG4gICAgICAgICAgICAgICAgZXhwb3J0QWxpYXNEZWNsYXJhdGlvbnMuc2V0KGRlY2xhcmF0aW9uLm5vZGUubmFtZSwgZXhwb3J0ZWROYW1lKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gQXJyYXkuZnJvbShwcml2YXRlRGVjbGFyYXRpb25zLmtleXMoKSkubWFwKGlkID0+IHtcbiAgICAgIGNvbnN0IGZyb20gPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGlkLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHByaXZhdGVEZWNsYXJhdGlvbnMuZ2V0KGlkKSAhO1xuICAgICAgY29uc3QgYWxpYXMgPSBleHBvcnRBbGlhc0RlY2xhcmF0aW9ucy5oYXMoaWQpID8gZXhwb3J0QWxpYXNEZWNsYXJhdGlvbnMuZ2V0KGlkKSAhIDogbnVsbDtcbiAgICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uLm5vZGUpO1xuICAgICAgY29uc3QgZHRzRnJvbSA9IGR0c0RlY2xhcmF0aW9uICYmIGFic29sdXRlRnJvbVNvdXJjZUZpbGUoZHRzRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpKTtcblxuICAgICAgcmV0dXJuIHtpZGVudGlmaWVyOiBpZC50ZXh0LCBmcm9tLCBkdHNGcm9tLCBhbGlhc307XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==