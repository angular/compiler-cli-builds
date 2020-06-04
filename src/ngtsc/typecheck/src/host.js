/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUlILCtEQUFrRTtJQUVsRTs7O09BR0c7SUFDSDtRQW9CRSw4QkFDSSxLQUFpQyxFQUFVLFFBQXlCLEVBQzVELHFCQUErQjtZQURJLGFBQVEsR0FBUixRQUFRLENBQWlCO1lBQzVELDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBVTtZQWhCM0M7Ozs7Ozs7OztlQVNHO1lBQ0ssZUFBVSxHQUFHLElBQUksMkJBQW1CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFPdkUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7WUFFbkIsSUFBSSxRQUFRLENBQUMsY0FBYyxLQUFLLFNBQVMsRUFBRTtnQkFDekMsSUFBSSxDQUFDLGNBQWMsR0FBRyxVQUFDLElBQVksSUFBSyxPQUFBLFFBQVEsQ0FBQyxjQUFlLENBQUMsSUFBSSxDQUFDLEVBQTlCLENBQThCLENBQUM7YUFDeEU7WUFFRCxJQUFJLFFBQVEsQ0FBQyxrQkFBa0IsS0FBSyxTQUFTLEVBQUU7Z0JBQzdDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxRQUFRLENBQUMsa0JBQWtCLENBQUM7YUFDdkQ7UUFDSCxDQUFDO1FBRUQsNENBQWEsR0FBYixVQUNJLFFBQWdCLEVBQUUsZUFBZ0MsRUFDbEQsT0FBK0MsRUFDL0MseUJBQTZDO1lBQy9DLElBQU0sVUFBVSxHQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixDQUFFLENBQUM7WUFDaEcsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO2dCQUM1QixPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUVELHlCQUF5QjtZQUN6QixJQUFJLEVBQWlCLENBQUM7WUFDdEIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDNUIsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBRSxDQUFDO2dCQUMvQix3QkFBZ0IsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDbEM7aUJBQU07Z0JBQ0wsRUFBRSxHQUFHLFVBQVUsQ0FBQzthQUNqQjtZQUNELHlGQUF5RjtZQUN6RixrRUFBa0U7WUFDbEUsSUFBTSxZQUFZLEdBQUksRUFBVSxDQUFDLFlBQVksQ0FBQztZQUM5QyxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7Z0JBQzlCLEVBQUUsR0FBRyxZQUFZLENBQUMsWUFBWSxDQUFDO2FBQ2hDO1lBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEIsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO1FBRUQseURBQTBCLEdBQTFCO1lBQ0UsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM3QixDQUFDO1FBRUQsK0VBQStFO1FBRS9FLG9EQUFxQixHQUFyQixVQUFzQixPQUEyQjtZQUMvQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUVELHdDQUFTLEdBQVQsVUFDSSxRQUFnQixFQUFFLElBQVksRUFBRSxrQkFBMkIsRUFDM0QsT0FBOEMsRUFDOUMsV0FBbUQ7WUFDckQsTUFBTSxJQUFJLEtBQUssQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFFRCxrREFBbUIsR0FBbkI7WUFDRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUM3QyxDQUFDO1FBSUQsbURBQW9CLEdBQXBCLFVBQXFCLFFBQWdCO1lBQ25DLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsd0RBQXlCLEdBQXpCO1lBQ0UsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFDbkQsQ0FBQztRQUVELHlDQUFVLEdBQVY7WUFDRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDcEMsQ0FBQztRQUVELHlDQUFVLEdBQVYsVUFBVyxRQUFnQjtZQUN6QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFRCx1Q0FBUSxHQUFSLFVBQVMsUUFBZ0I7WUFDdkIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBQ0gsMkJBQUM7SUFBRCxDQUFDLEFBekdELElBeUdDO0lBekdZLG9EQUFvQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtjb3B5RmlsZVNoaW1EYXRhLCBTaGltUmVmZXJlbmNlVGFnZ2VyfSBmcm9tICcuLi8uLi9zaGltcyc7XG5cbi8qKlxuICogQSBgdHMuQ29tcGlsZXJIb3N0YCB3aGljaCBhdWdtZW50cyBzb3VyY2UgZmlsZXMgd2l0aCB0eXBlIGNoZWNraW5nIGNvZGUgZnJvbSBhXG4gKiBgVHlwZUNoZWNrQ29udGV4dGAuXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlQ2hlY2tQcm9ncmFtSG9zdCBpbXBsZW1lbnRzIHRzLkNvbXBpbGVySG9zdCB7XG4gIC8qKlxuICAgKiBNYXAgb2Ygc291cmNlIGZpbGUgbmFtZXMgdG8gYHRzLlNvdXJjZUZpbGVgIGluc3RhbmNlcy5cbiAgICovXG4gIHByaXZhdGUgc2ZNYXA6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+O1xuXG4gIC8qKlxuICAgKiBUaGUgYFNoaW1SZWZlcmVuY2VUYWdnZXJgIHJlc3BvbnNpYmxlIGZvciB0YWdnaW5nIGB0cy5Tb3VyY2VGaWxlYHMgbG9hZGVkIHZpYSB0aGlzIGhvc3QuXG4gICAqXG4gICAqIFRoZSBgVHlwZUNoZWNrUHJvZ3JhbUhvc3RgIGlzIHVzZWQgaW4gdGhlIGNyZWF0aW9uIG9mIGEgbmV3IGB0cy5Qcm9ncmFtYC4gRXZlbiB0aG91Z2ggdGhpcyBuZXdcbiAgICogcHJvZ3JhbSBpcyBiYXNlZCBvbiBhIHByaW9yIG9uZSwgVHlwZVNjcmlwdCB3aWxsIHN0aWxsIHN0YXJ0IGZyb20gdGhlIHJvb3QgZmlsZXMgYW5kIGVudW1lcmF0ZVxuICAgKiBhbGwgc291cmNlIGZpbGVzIHRvIGluY2x1ZGUgaW4gdGhlIG5ldyBwcm9ncmFtLiAgVGhpcyBtZWFucyB0aGF0IGp1c3QgbGlrZSBkdXJpbmcgdGhlIG9yaWdpbmFsXG4gICAqIHByb2dyYW0ncyBjcmVhdGlvbiwgdGhlc2Ugc291cmNlIGZpbGVzIG11c3QgYmUgdGFnZ2VkIHdpdGggcmVmZXJlbmNlcyB0byBwZXItZmlsZSBzaGltcyBpblxuICAgKiBvcmRlciBmb3IgdGhvc2Ugc2hpbXMgdG8gYmUgbG9hZGVkLCBhbmQgdGhlbiBjbGVhbmVkIHVwIGFmdGVyd2FyZHMuIFRodXMgdGhlXG4gICAqIGBUeXBlQ2hlY2tQcm9ncmFtSG9zdGAgaGFzIGl0cyBvd24gYFNoaW1SZWZlcmVuY2VUYWdnZXJgIHRvIHBlcmZvcm0gdGhpcyBmdW5jdGlvbi5cbiAgICovXG4gIHByaXZhdGUgc2hpbVRhZ2dlciA9IG5ldyBTaGltUmVmZXJlbmNlVGFnZ2VyKHRoaXMuc2hpbUV4dGVuc2lvblByZWZpeGVzKTtcblxuICByZWFkb25seSByZXNvbHZlTW9kdWxlTmFtZXM/OiB0cy5Db21waWxlckhvc3RbJ3Jlc29sdmVNb2R1bGVOYW1lcyddO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgc2ZNYXA6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+LCBwcml2YXRlIGRlbGVnYXRlOiB0cy5Db21waWxlckhvc3QsXG4gICAgICBwcml2YXRlIHNoaW1FeHRlbnNpb25QcmVmaXhlczogc3RyaW5nW10pIHtcbiAgICB0aGlzLnNmTWFwID0gc2ZNYXA7XG5cbiAgICBpZiAoZGVsZWdhdGUuZ2V0RGlyZWN0b3JpZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5nZXREaXJlY3RvcmllcyA9IChwYXRoOiBzdHJpbmcpID0+IGRlbGVnYXRlLmdldERpcmVjdG9yaWVzIShwYXRoKTtcbiAgICB9XG5cbiAgICBpZiAoZGVsZWdhdGUucmVzb2x2ZU1vZHVsZU5hbWVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMucmVzb2x2ZU1vZHVsZU5hbWVzID0gZGVsZWdhdGUucmVzb2x2ZU1vZHVsZU5hbWVzO1xuICAgIH1cbiAgfVxuXG4gIGdldFNvdXJjZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCxcbiAgICAgIG9uRXJyb3I/OiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkLFxuICAgICAgc2hvdWxkQ3JlYXRlTmV3U291cmNlRmlsZT86IGJvb2xlYW58dW5kZWZpbmVkKTogdHMuU291cmNlRmlsZXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGRlbGVnYXRlU2YgPVxuICAgICAgICB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUsIGxhbmd1YWdlVmVyc2lvbiwgb25FcnJvciwgc2hvdWxkQ3JlYXRlTmV3U291cmNlRmlsZSkhO1xuICAgIGlmIChkZWxlZ2F0ZVNmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gTG9vayBmb3IgcmVwbGFjZW1lbnRzLlxuICAgIGxldCBzZjogdHMuU291cmNlRmlsZTtcbiAgICBpZiAodGhpcy5zZk1hcC5oYXMoZmlsZU5hbWUpKSB7XG4gICAgICBzZiA9IHRoaXMuc2ZNYXAuZ2V0KGZpbGVOYW1lKSE7XG4gICAgICBjb3B5RmlsZVNoaW1EYXRhKGRlbGVnYXRlU2YsIHNmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2YgPSBkZWxlZ2F0ZVNmO1xuICAgIH1cbiAgICAvLyBUeXBlU2NyaXB0IGRvZXNuJ3QgYWxsb3cgcmV0dXJuaW5nIHJlZGlyZWN0IHNvdXJjZSBmaWxlcy4gVG8gYXZvaWQgdW5mb3JzZWVuIGVycm9ycyB3ZVxuICAgIC8vIHJldHVybiB0aGUgb3JpZ2luYWwgc291cmNlIGZpbGUgaW5zdGVhZCBvZiB0aGUgcmVkaXJlY3QgdGFyZ2V0LlxuICAgIGNvbnN0IHJlZGlyZWN0SW5mbyA9IChzZiBhcyBhbnkpLnJlZGlyZWN0SW5mbztcbiAgICBpZiAocmVkaXJlY3RJbmZvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHNmID0gcmVkaXJlY3RJbmZvLnVucmVkaXJlY3RlZDtcbiAgICB9XG5cbiAgICB0aGlzLnNoaW1UYWdnZXIudGFnKHNmKTtcbiAgICByZXR1cm4gc2Y7XG4gIH1cblxuICBwb3N0UHJvZ3JhbUNyZWF0aW9uQ2xlYW51cCgpOiB2b2lkIHtcbiAgICB0aGlzLnNoaW1UYWdnZXIuZmluYWxpemUoKTtcbiAgfVxuXG4gIC8vIFRoZSByZXN0IG9mIHRoZSBtZXRob2RzIHNpbXBseSBkZWxlZ2F0ZSB0byB0aGUgdW5kZXJseWluZyBgdHMuQ29tcGlsZXJIb3N0YC5cblxuICBnZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9ucyk7XG4gIH1cblxuICB3cml0ZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBkYXRhOiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgIG9uRXJyb3I6ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQsXG4gICAgICBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPnx1bmRlZmluZWQpOiB2b2lkIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFR5cGVDaGVja1Byb2dyYW1Ib3N0IHNob3VsZCBuZXZlciB3cml0ZSBmaWxlc2ApO1xuICB9XG5cbiAgZ2V0Q3VycmVudERpcmVjdG9yeSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldEN1cnJlbnREaXJlY3RvcnkoKTtcbiAgfVxuXG4gIGdldERpcmVjdG9yaWVzPzogKHBhdGg6IHN0cmluZykgPT4gc3RyaW5nW107XG5cbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpO1xuICB9XG5cbiAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS51c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzKCk7XG4gIH1cblxuICBnZXROZXdMaW5lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0TmV3TGluZSgpO1xuICB9XG5cbiAgZmlsZUV4aXN0cyhmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc2ZNYXAuaGFzKGZpbGVOYW1lKSB8fCB0aGlzLmRlbGVnYXRlLmZpbGVFeGlzdHMoZmlsZU5hbWUpO1xuICB9XG5cbiAgcmVhZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLnJlYWRGaWxlKGZpbGVOYW1lKTtcbiAgfVxufVxuIl19