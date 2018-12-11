(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/analysis/private_declarations_analyzer", ["require", "exports", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
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
            rootFiles.forEach(function (f) {
                var exports = _this.host.getExportsOfModule(f);
                if (exports) {
                    exports.forEach(function (declaration, exportedName) {
                        if (utils_1.hasNameIdentifier(declaration.node) && declaration.node.name.text === exportedName) {
                            privateDeclarations.delete(declaration.node.name);
                        }
                    });
                }
            });
            return Array.from(privateDeclarations.keys()).map(function (id) {
                var from = id.getSourceFile().fileName;
                var declaration = privateDeclarations.get(id);
                var dtsDeclaration = _this.host.getDtsDeclarationOfClass(declaration.node);
                var dtsFrom = dtsDeclaration && dtsDeclaration.getSourceFile().fileName;
                return { identifier: id.text, from: from, dtsFrom: dtsFrom };
            });
        };
        return PrivateDeclarationsAnalyzer;
    }());
    exports.PrivateDeclarationsAnalyzer = PrivateDeclarationsAnalyzer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXIuanMiLCJzb3VyY2VSb290IjoiLi4vLi4vLi4vLi4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL2FuYWx5c2lzL3ByaXZhdGVfZGVjbGFyYXRpb25zX2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBWUEsa0VBQXNEO0lBU3REOzs7T0FHRztJQUNIO1FBQ0UscUNBQW9CLElBQXdCLEVBQVUsa0JBQXNDO1lBQXhFLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQVUsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUFHLENBQUM7UUFFaEcsb0RBQWMsR0FBZCxVQUFlLE9BQW1CO1lBQ2hDLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDN0MsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDN0YsQ0FBQztRQUVPLGtEQUFZLEdBQXBCLFVBQXFCLE9BQW1CO1lBQ3RDLE9BQU8sT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBeEIsQ0FBd0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBUyxDQUFDLENBQUM7UUFDekYsQ0FBQztRQUVPLDREQUFzQixHQUE5QixVQUNJLFNBQTBCLEVBQzFCLFlBQTZDO1lBRmpELGlCQXFCQztZQWxCQyxJQUFNLG1CQUFtQixHQUFvQyxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNuRixTQUFTLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQztnQkFDakIsSUFBTSxPQUFPLEdBQUcsS0FBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDaEQsSUFBSSxPQUFPLEVBQUU7b0JBQ1gsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFDLFdBQVcsRUFBRSxZQUFZO3dCQUN4QyxJQUFJLHlCQUFpQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssWUFBWSxFQUFFOzRCQUN0RixtQkFBbUIsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzt5QkFDbkQ7b0JBQ0gsQ0FBQyxDQUFDLENBQUM7aUJBQ0o7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLEVBQUU7Z0JBQ2xELElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLENBQUM7Z0JBQ3pDLElBQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUcsQ0FBQztnQkFDbEQsSUFBTSxjQUFjLEdBQUcsS0FBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzVFLElBQU0sT0FBTyxHQUFHLGNBQWMsSUFBSSxjQUFjLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUSxDQUFDO2dCQUMxRSxPQUFPLEVBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxNQUFBLEVBQUUsT0FBTyxTQUFBLEVBQUMsQ0FBQztZQUM5QyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDSCxrQ0FBQztJQUFELENBQUMsQUFsQ0QsSUFrQ0M7SUFsQ1ksa0VBQTJCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9ob3N0JztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge2hhc05hbWVJZGVudGlmaWVyLCBpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBFeHBvcnRJbmZvIHtcbiAgaWRlbnRpZmllcjogc3RyaW5nO1xuICBmcm9tOiBzdHJpbmc7XG4gIGR0c0Zyb206IHN0cmluZ3xudWxsO1xufVxuZXhwb3J0IHR5cGUgUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzID0gRXhwb3J0SW5mb1tdO1xuXG4vKipcbiAqIFRoaXMgY2xhc3Mgd2lsbCBhbmFseXplIGEgcHJvZ3JhbSB0byBmaW5kIGFsbCB0aGUgZGVjbGFyZWQgY2xhc3Nlc1xuICogKGkuZS4gb24gYW4gTmdNb2R1bGUpIHRoYXQgYXJlIG5vdCBwdWJsaWNseSBleHBvcnRlZCB2aWEgYW4gZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCBjbGFzcyBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHl6ZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSkge31cblxuICBhbmFseXplUHJvZ3JhbShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzIHtcbiAgICBjb25zdCByb290RmlsZXMgPSB0aGlzLmdldFJvb3RGaWxlcyhwcm9ncmFtKTtcbiAgICByZXR1cm4gdGhpcy5nZXRQcml2YXRlRGVjbGFyYXRpb25zKHJvb3RGaWxlcywgdGhpcy5yZWZlcmVuY2VzUmVnaXN0cnkuZ2V0RGVjbGFyYXRpb25NYXAoKSk7XG4gIH1cblxuICBwcml2YXRlIGdldFJvb3RGaWxlcyhwcm9ncmFtOiB0cy5Qcm9ncmFtKTogdHMuU291cmNlRmlsZVtdIHtcbiAgICByZXR1cm4gcHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKCkubWFwKGYgPT4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGYpKS5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UHJpdmF0ZURlY2xhcmF0aW9ucyhcbiAgICAgIHJvb3RGaWxlczogdHMuU291cmNlRmlsZVtdLFxuICAgICAgZGVjbGFyYXRpb25zOiBNYXA8dHMuSWRlbnRpZmllciwgRGVjbGFyYXRpb24+KTogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzIHtcbiAgICBjb25zdCBwcml2YXRlRGVjbGFyYXRpb25zOiBNYXA8dHMuSWRlbnRpZmllciwgRGVjbGFyYXRpb24+ID0gbmV3IE1hcChkZWNsYXJhdGlvbnMpO1xuICAgIHJvb3RGaWxlcy5mb3JFYWNoKGYgPT4ge1xuICAgICAgY29uc3QgZXhwb3J0cyA9IHRoaXMuaG9zdC5nZXRFeHBvcnRzT2ZNb2R1bGUoZik7XG4gICAgICBpZiAoZXhwb3J0cykge1xuICAgICAgICBleHBvcnRzLmZvckVhY2goKGRlY2xhcmF0aW9uLCBleHBvcnRlZE5hbWUpID0+IHtcbiAgICAgICAgICBpZiAoaGFzTmFtZUlkZW50aWZpZXIoZGVjbGFyYXRpb24ubm9kZSkgJiYgZGVjbGFyYXRpb24ubm9kZS5uYW1lLnRleHQgPT09IGV4cG9ydGVkTmFtZSkge1xuICAgICAgICAgICAgcHJpdmF0ZURlY2xhcmF0aW9ucy5kZWxldGUoZGVjbGFyYXRpb24ubm9kZS5uYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBBcnJheS5mcm9tKHByaXZhdGVEZWNsYXJhdGlvbnMua2V5cygpKS5tYXAoaWQgPT4ge1xuICAgICAgY29uc3QgZnJvbSA9IGlkLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gcHJpdmF0ZURlY2xhcmF0aW9ucy5nZXQoaWQpICE7XG4gICAgICBjb25zdCBkdHNEZWNsYXJhdGlvbiA9IHRoaXMuaG9zdC5nZXREdHNEZWNsYXJhdGlvbk9mQ2xhc3MoZGVjbGFyYXRpb24ubm9kZSk7XG4gICAgICBjb25zdCBkdHNGcm9tID0gZHRzRGVjbGFyYXRpb24gJiYgZHRzRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgICAgcmV0dXJuIHtpZGVudGlmaWVyOiBpZC50ZXh0LCBmcm9tLCBkdHNGcm9tfTtcbiAgICB9KTtcbiAgfVxufVxuIl19