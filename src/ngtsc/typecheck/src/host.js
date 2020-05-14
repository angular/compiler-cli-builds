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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/host", ["require", "exports", "@angular/compiler-cli/src/ngtsc/shims"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeCheckProgramHost = void 0;
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    /**
     * A `ts.CompilerHost` which augments source files with type checking code from a
     * `TypeCheckContext`.
     */
    var TypeCheckProgramHost = /** @class */ (function () {
        function TypeCheckProgramHost(sfMap, delegate, shimExtensionPrefixes) {
            this.delegate = delegate;
            this.shimExtensionPrefixes = shimExtensionPrefixes;
            /**
             * The `ShimReferenceTagger` responsible for tagging `ts.SourceFile`s loaded via this host.
             *
             * The `TypeCheckProgramHost` is used in the creation of a new `ts.Program`. Even though this new
             * program is based on a prior one, TypeScript will still start from the root files and enumerate
             * all source files to include in the new program.  This means that just like during the original
             * program's creation, these source files must be tagged with references to per-file shims in
             * order for those shims to be loaded, and then cleaned up afterwards. Thus the
             * `TypeCheckProgramHost` has its own `ShimReferenceTagger` to perform this function.
             */
            this.shimTagger = new shims_1.ShimReferenceTagger(this.shimExtensionPrefixes);
            this.sfMap = sfMap;
            if (delegate.getDirectories !== undefined) {
                this.getDirectories = function (path) { return delegate.getDirectories(path); };
            }
            if (delegate.resolveModuleNames !== undefined) {
                this.resolveModuleNames = delegate.resolveModuleNames;
            }
        }
        TypeCheckProgramHost.prototype.getSourceFile = function (fileName, languageVersion, onError, shouldCreateNewSourceFile) {
            var delegateSf = this.delegate.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
            if (delegateSf === undefined) {
                return undefined;
            }
            // Look for replacements.
            var sf;
            if (this.sfMap.has(fileName)) {
                sf = this.sfMap.get(fileName);
                shims_1.copyFileShimData(delegateSf, sf);
            }
            else {
                sf = delegateSf;
            }
            // TypeScript doesn't allow returning redirect source files. To avoid unforseen errors we
            // return the original source file instead of the redirect target.
            var redirectInfo = sf.redirectInfo;
            if (redirectInfo !== undefined) {
                sf = redirectInfo.unredirected;
            }
            this.shimTagger.tag(sf);
            return sf;
        };
        TypeCheckProgramHost.prototype.postProgramCreationCleanup = function () {
            this.shimTagger.finalize();
        };
        // The rest of the methods simply delegate to the underlying `ts.CompilerHost`.
        TypeCheckProgramHost.prototype.getDefaultLibFileName = function (options) {
            return this.delegate.getDefaultLibFileName(options);
        };
        TypeCheckProgramHost.prototype.writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
            throw new Error("TypeCheckProgramHost should never write files");
        };
        TypeCheckProgramHost.prototype.getCurrentDirectory = function () {
            return this.delegate.getCurrentDirectory();
        };
        TypeCheckProgramHost.prototype.getCanonicalFileName = function (fileName) {
            return this.delegate.getCanonicalFileName(fileName);
        };
        TypeCheckProgramHost.prototype.useCaseSensitiveFileNames = function () {
            return this.delegate.useCaseSensitiveFileNames();
        };
        TypeCheckProgramHost.prototype.getNewLine = function () {
            return this.delegate.getNewLine();
        };
        TypeCheckProgramHost.prototype.fileExists = function (fileName) {
            return this.sfMap.has(fileName) || this.delegate.fileExists(fileName);
        };
        TypeCheckProgramHost.prototype.readFile = function (fileName) {
            return this.delegate.readFile(fileName);
        };
        return TypeCheckProgramHost;
    }());
    exports.TypeCheckProgramHost = TypeCheckProgramHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUlILCtEQUFrRTtJQUVsRTs7O09BR0c7SUFDSDtRQW9CRSw4QkFDSSxLQUFpQyxFQUFVLFFBQXlCLEVBQzVELHFCQUErQjtZQURJLGFBQVEsR0FBUixRQUFRLENBQWlCO1lBQzVELDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBVTtZQWhCM0M7Ozs7Ozs7OztlQVNHO1lBQ0ssZUFBVSxHQUFHLElBQUksMkJBQW1CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFPdkUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7WUFFbkIsSUFBSSxRQUFRLENBQUMsY0FBYyxLQUFLLFNBQVMsRUFBRTtnQkFDekMsSUFBSSxDQUFDLGNBQWMsR0FBRyxVQUFDLElBQVksSUFBSyxPQUFBLFFBQVEsQ0FBQyxjQUFlLENBQUMsSUFBSSxDQUFDLEVBQTlCLENBQThCLENBQUM7YUFDeEU7WUFFRCxJQUFJLFFBQVEsQ0FBQyxrQkFBa0IsS0FBSyxTQUFTLEVBQUU7Z0JBQzdDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxRQUFRLENBQUMsa0JBQWtCLENBQUM7YUFDdkQ7UUFDSCxDQUFDO1FBRUQsNENBQWEsR0FBYixVQUNJLFFBQWdCLEVBQUUsZUFBZ0MsRUFDbEQsT0FBK0MsRUFDL0MseUJBQTZDO1lBQy9DLElBQU0sVUFBVSxHQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixDQUFFLENBQUM7WUFDaEcsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO2dCQUM1QixPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUVELHlCQUF5QjtZQUN6QixJQUFJLEVBQWlCLENBQUM7WUFDdEIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDNUIsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBRSxDQUFDO2dCQUMvQix3QkFBZ0IsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDbEM7aUJBQU07Z0JBQ0wsRUFBRSxHQUFHLFVBQVUsQ0FBQzthQUNqQjtZQUNELHlGQUF5RjtZQUN6RixrRUFBa0U7WUFDbEUsSUFBTSxZQUFZLEdBQUksRUFBVSxDQUFDLFlBQVksQ0FBQztZQUM5QyxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7Z0JBQzlCLEVBQUUsR0FBRyxZQUFZLENBQUMsWUFBWSxDQUFDO2FBQ2hDO1lBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEIsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO1FBRUQseURBQTBCLEdBQTFCO1lBQ0UsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM3QixDQUFDO1FBRUQsK0VBQStFO1FBRS9FLG9EQUFxQixHQUFyQixVQUFzQixPQUEyQjtZQUMvQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUVELHdDQUFTLEdBQVQsVUFDSSxRQUFnQixFQUFFLElBQVksRUFBRSxrQkFBMkIsRUFDM0QsT0FBOEMsRUFDOUMsV0FBbUQ7WUFDckQsTUFBTSxJQUFJLEtBQUssQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFFRCxrREFBbUIsR0FBbkI7WUFDRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUM3QyxDQUFDO1FBSUQsbURBQW9CLEdBQXBCLFVBQXFCLFFBQWdCO1lBQ25DLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsd0RBQXlCLEdBQXpCO1lBQ0UsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFDbkQsQ0FBQztRQUVELHlDQUFVLEdBQVY7WUFDRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDcEMsQ0FBQztRQUVELHlDQUFVLEdBQVYsVUFBVyxRQUFnQjtZQUN6QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFRCx1Q0FBUSxHQUFSLFVBQVMsUUFBZ0I7WUFDdkIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBQ0gsMkJBQUM7SUFBRCxDQUFDLEFBekdELElBeUdDO0lBekdZLG9EQUFvQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Y29weUZpbGVTaGltRGF0YSwgU2hpbVJlZmVyZW5jZVRhZ2dlcn0gZnJvbSAnLi4vLi4vc2hpbXMnO1xuXG4vKipcbiAqIEEgYHRzLkNvbXBpbGVySG9zdGAgd2hpY2ggYXVnbWVudHMgc291cmNlIGZpbGVzIHdpdGggdHlwZSBjaGVja2luZyBjb2RlIGZyb20gYVxuICogYFR5cGVDaGVja0NvbnRleHRgLlxuICovXG5leHBvcnQgY2xhc3MgVHlwZUNoZWNrUHJvZ3JhbUhvc3QgaW1wbGVtZW50cyB0cy5Db21waWxlckhvc3Qge1xuICAvKipcbiAgICogTWFwIG9mIHNvdXJjZSBmaWxlIG5hbWVzIHRvIGB0cy5Tb3VyY2VGaWxlYCBpbnN0YW5jZXMuXG4gICAqL1xuICBwcml2YXRlIHNmTWFwOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPjtcblxuICAvKipcbiAgICogVGhlIGBTaGltUmVmZXJlbmNlVGFnZ2VyYCByZXNwb25zaWJsZSBmb3IgdGFnZ2luZyBgdHMuU291cmNlRmlsZWBzIGxvYWRlZCB2aWEgdGhpcyBob3N0LlxuICAgKlxuICAgKiBUaGUgYFR5cGVDaGVja1Byb2dyYW1Ib3N0YCBpcyB1c2VkIGluIHRoZSBjcmVhdGlvbiBvZiBhIG5ldyBgdHMuUHJvZ3JhbWAuIEV2ZW4gdGhvdWdoIHRoaXMgbmV3XG4gICAqIHByb2dyYW0gaXMgYmFzZWQgb24gYSBwcmlvciBvbmUsIFR5cGVTY3JpcHQgd2lsbCBzdGlsbCBzdGFydCBmcm9tIHRoZSByb290IGZpbGVzIGFuZCBlbnVtZXJhdGVcbiAgICogYWxsIHNvdXJjZSBmaWxlcyB0byBpbmNsdWRlIGluIHRoZSBuZXcgcHJvZ3JhbS4gIFRoaXMgbWVhbnMgdGhhdCBqdXN0IGxpa2UgZHVyaW5nIHRoZSBvcmlnaW5hbFxuICAgKiBwcm9ncmFtJ3MgY3JlYXRpb24sIHRoZXNlIHNvdXJjZSBmaWxlcyBtdXN0IGJlIHRhZ2dlZCB3aXRoIHJlZmVyZW5jZXMgdG8gcGVyLWZpbGUgc2hpbXMgaW5cbiAgICogb3JkZXIgZm9yIHRob3NlIHNoaW1zIHRvIGJlIGxvYWRlZCwgYW5kIHRoZW4gY2xlYW5lZCB1cCBhZnRlcndhcmRzLiBUaHVzIHRoZVxuICAgKiBgVHlwZUNoZWNrUHJvZ3JhbUhvc3RgIGhhcyBpdHMgb3duIGBTaGltUmVmZXJlbmNlVGFnZ2VyYCB0byBwZXJmb3JtIHRoaXMgZnVuY3Rpb24uXG4gICAqL1xuICBwcml2YXRlIHNoaW1UYWdnZXIgPSBuZXcgU2hpbVJlZmVyZW5jZVRhZ2dlcih0aGlzLnNoaW1FeHRlbnNpb25QcmVmaXhlcyk7XG5cbiAgcmVhZG9ubHkgcmVzb2x2ZU1vZHVsZU5hbWVzPzogdHMuQ29tcGlsZXJIb3N0WydyZXNvbHZlTW9kdWxlTmFtZXMnXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHNmTWFwOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPiwgcHJpdmF0ZSBkZWxlZ2F0ZTogdHMuQ29tcGlsZXJIb3N0LFxuICAgICAgcHJpdmF0ZSBzaGltRXh0ZW5zaW9uUHJlZml4ZXM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5zZk1hcCA9IHNmTWFwO1xuXG4gICAgaWYgKGRlbGVnYXRlLmdldERpcmVjdG9yaWVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuZ2V0RGlyZWN0b3JpZXMgPSAocGF0aDogc3RyaW5nKSA9PiBkZWxlZ2F0ZS5nZXREaXJlY3RvcmllcyEocGF0aCk7XG4gICAgfVxuXG4gICAgaWYgKGRlbGVnYXRlLnJlc29sdmVNb2R1bGVOYW1lcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnJlc29sdmVNb2R1bGVOYW1lcyA9IGRlbGVnYXRlLnJlc29sdmVNb2R1bGVOYW1lcztcbiAgICB9XG4gIH1cblxuICBnZXRTb3VyY2VGaWxlKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQsXG4gICAgICBvbkVycm9yPzogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCxcbiAgICAgIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGU/OiBib29sZWFufHVuZGVmaW5lZCk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBkZWxlZ2F0ZVNmID1cbiAgICAgICAgdGhpcy5kZWxlZ2F0ZS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lLCBsYW5ndWFnZVZlcnNpb24sIG9uRXJyb3IsIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGUpITtcbiAgICBpZiAoZGVsZWdhdGVTZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIExvb2sgZm9yIHJlcGxhY2VtZW50cy5cbiAgICBsZXQgc2Y6IHRzLlNvdXJjZUZpbGU7XG4gICAgaWYgKHRoaXMuc2ZNYXAuaGFzKGZpbGVOYW1lKSkge1xuICAgICAgc2YgPSB0aGlzLnNmTWFwLmdldChmaWxlTmFtZSkhO1xuICAgICAgY29weUZpbGVTaGltRGF0YShkZWxlZ2F0ZVNmLCBzZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNmID0gZGVsZWdhdGVTZjtcbiAgICB9XG4gICAgLy8gVHlwZVNjcmlwdCBkb2Vzbid0IGFsbG93IHJldHVybmluZyByZWRpcmVjdCBzb3VyY2UgZmlsZXMuIFRvIGF2b2lkIHVuZm9yc2VlbiBlcnJvcnMgd2VcbiAgICAvLyByZXR1cm4gdGhlIG9yaWdpbmFsIHNvdXJjZSBmaWxlIGluc3RlYWQgb2YgdGhlIHJlZGlyZWN0IHRhcmdldC5cbiAgICBjb25zdCByZWRpcmVjdEluZm8gPSAoc2YgYXMgYW55KS5yZWRpcmVjdEluZm87XG4gICAgaWYgKHJlZGlyZWN0SW5mbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBzZiA9IHJlZGlyZWN0SW5mby51bnJlZGlyZWN0ZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5zaGltVGFnZ2VyLnRhZyhzZik7XG4gICAgcmV0dXJuIHNmO1xuICB9XG5cbiAgcG9zdFByb2dyYW1DcmVhdGlvbkNsZWFudXAoKTogdm9pZCB7XG4gICAgdGhpcy5zaGltVGFnZ2VyLmZpbmFsaXplKCk7XG4gIH1cblxuICAvLyBUaGUgcmVzdCBvZiB0aGUgbWV0aG9kcyBzaW1wbHkgZGVsZWdhdGUgdG8gdGhlIHVuZGVybHlpbmcgYHRzLkNvbXBpbGVySG9zdGAuXG5cbiAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lKG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0RGVmYXVsdExpYkZpbGVOYW1lKG9wdGlvbnMpO1xuICB9XG5cbiAgd3JpdGVGaWxlKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgZGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICBvbkVycm9yOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkLFxuICAgICAgc291cmNlRmlsZXM6IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT58dW5kZWZpbmVkKTogdm9pZCB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBUeXBlQ2hlY2tQcm9ncmFtSG9zdCBzaG91bGQgbmV2ZXIgd3JpdGUgZmlsZXNgKTtcbiAgfVxuXG4gIGdldEN1cnJlbnREaXJlY3RvcnkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXRDdXJyZW50RGlyZWN0b3J5KCk7XG4gIH1cblxuICBnZXREaXJlY3Rvcmllcz86IChwYXRoOiBzdHJpbmcpID0+IHN0cmluZ1tdO1xuXG4gIGdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGVOYW1lKTtcbiAgfVxuXG4gIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpO1xuICB9XG5cbiAgZ2V0TmV3TGluZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldE5ld0xpbmUoKTtcbiAgfVxuXG4gIGZpbGVFeGlzdHMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNmTWFwLmhhcyhmaWxlTmFtZSkgfHwgdGhpcy5kZWxlZ2F0ZS5maWxlRXhpc3RzKGZpbGVOYW1lKTtcbiAgfVxuXG4gIHJlYWRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmd8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5yZWFkRmlsZShmaWxlTmFtZSk7XG4gIH1cbn0iXX0=