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
        define("@angular/compiler-cli/src/ngtsc/synthetic_files_compiler_host", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * Extension of the TypeScript compiler host that supports files added to the Program which
     * were never on disk.
     *
     * This is used for backwards-compatibility with the ViewEngine compiler, which used ngsummary
     * and ngfactory files as inputs to the program. We call these inputs "synthetic".
     *
     * They need to be program inputs because user code may import from these generated files.
     *
     * TODO(alxhub): remove this after all ng_module users have migrated to Ivy
     */
    var SyntheticFilesCompilerHost = /** @class */ (function () {
        function SyntheticFilesCompilerHost(rootFiles, delegate, generatedFiles) {
            var e_1, _a;
            this.rootFiles = rootFiles;
            this.delegate = delegate;
            /**
             * SourceFiles which are added to the program but which never existed on disk.
             */
            this.syntheticFiles = new Map();
            // Allow ngtsc to contribute in-memory synthetic files, which will be loaded
            // as if they existed on disk as action inputs.
            var angularGeneratedFiles = generatedFiles(rootFiles);
            try {
                for (var _b = tslib_1.__values(Object.keys(angularGeneratedFiles)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var f = _c.value;
                    var generator = angularGeneratedFiles[f];
                    var generated = generator(delegate);
                    if (generated) {
                        this.syntheticFiles.set(generated.fileName, generated);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        SyntheticFilesCompilerHost.prototype.fileExists = function (filePath) {
            if (this.syntheticFiles.has(filePath)) {
                return true;
            }
            return this.delegate.fileExists(filePath);
        };
        /** Loads a source file from in-memory map, or delegates. */
        SyntheticFilesCompilerHost.prototype.getSourceFile = function (fileName, languageVersion, onError) {
            var syntheticFile = this.syntheticFiles.get(fileName);
            if (syntheticFile) {
                return syntheticFile;
            }
            return this.delegate.getSourceFile(fileName, languageVersion, onError);
        };
        Object.defineProperty(SyntheticFilesCompilerHost.prototype, "inputFiles", {
            get: function () { return tslib_1.__spread(this.rootFiles, Array.from(this.syntheticFiles.keys())); },
            enumerable: true,
            configurable: true
        });
        SyntheticFilesCompilerHost.prototype.fileNameToModuleId = function (fileName) {
            return fileName; // TODO: Ivy logic. don't forget that the delegate has the google3 logic
        };
        // Delegate everything else to the original compiler host.
        SyntheticFilesCompilerHost.prototype.getDefaultLibFileName = function (options) {
            return this.delegate.getDefaultLibFileName(options);
        };
        SyntheticFilesCompilerHost.prototype.writeFile = function (fileName, content, writeByteOrderMark, onError, sourceFiles) {
            this.delegate.writeFile(fileName, content, writeByteOrderMark, onError, sourceFiles);
        };
        SyntheticFilesCompilerHost.prototype.getCanonicalFileName = function (path) { return this.delegate.getCanonicalFileName(path); };
        SyntheticFilesCompilerHost.prototype.getCurrentDirectory = function () { return this.delegate.getCurrentDirectory(); };
        SyntheticFilesCompilerHost.prototype.useCaseSensitiveFileNames = function () { return this.delegate.useCaseSensitiveFileNames(); };
        SyntheticFilesCompilerHost.prototype.getNewLine = function () { return this.delegate.getNewLine(); };
        SyntheticFilesCompilerHost.prototype.getDirectories = function (path) { return this.delegate.getDirectories(path); };
        SyntheticFilesCompilerHost.prototype.readFile = function (fileName) { return this.delegate.readFile(fileName); };
        SyntheticFilesCompilerHost.prototype.trace = function (s) { console.error(s); };
        return SyntheticFilesCompilerHost;
    }());
    exports.SyntheticFilesCompilerHost = SyntheticFilesCompilerHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ludGhldGljX2ZpbGVzX2NvbXBpbGVyX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3N5bnRoZXRpY19maWxlc19jb21waWxlcl9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUtIOzs7Ozs7Ozs7O09BVUc7SUFDSDtRQU1FLG9DQUNZLFNBQW1CLEVBQVUsUUFBeUIsRUFDOUQsY0FFQzs7WUFITyxjQUFTLEdBQVQsU0FBUyxDQUFVO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBaUI7WUFObEU7O2VBRUc7WUFDSCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUF5QixDQUFDO1lBT2hELDRFQUE0RTtZQUM1RSwrQ0FBK0M7WUFDL0MsSUFBTSxxQkFBcUIsR0FBRyxjQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDOztnQkFDMUQsS0FBZ0IsSUFBQSxLQUFBLGlCQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBL0MsSUFBTSxDQUFDLFdBQUE7b0JBQ1YsSUFBTSxTQUFTLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzNDLElBQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDdEMsSUFBSSxTQUFTLEVBQUU7d0JBQ2IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztxQkFDeEQ7aUJBQ0Y7Ozs7Ozs7OztRQUNILENBQUM7UUFFRCwrQ0FBVSxHQUFWLFVBQVcsUUFBZ0I7WUFDekIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDckMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUVELDREQUE0RDtRQUM1RCxrREFBYSxHQUFiLFVBQ0ksUUFBZ0IsRUFBRSxlQUFnQyxFQUNsRCxPQUFtQztZQUNyQyxJQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN4RCxJQUFJLGFBQWEsRUFBRTtnQkFDakIsT0FBTyxhQUFlLENBQUM7YUFDeEI7WUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekUsQ0FBQztRQUVELHNCQUFJLGtEQUFVO2lCQUFkLGNBQW1CLHdCQUFXLElBQUksQ0FBQyxTQUFTLEVBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDOzs7V0FBQTtRQUUzRix1REFBa0IsR0FBbEIsVUFBbUIsUUFBZ0I7WUFDakMsT0FBTyxRQUFRLENBQUMsQ0FBRSx3RUFBd0U7UUFDNUYsQ0FBQztRQUVELDBEQUEwRDtRQUUxRCwwREFBcUIsR0FBckIsVUFBc0IsT0FBMkI7WUFDL0MsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFFRCw4Q0FBUyxHQUFULFVBQ0ksUUFBZ0IsRUFBRSxPQUFlLEVBQUUsa0JBQTJCLEVBQzlELE9BQThDLEVBQzlDLFdBQW1EO1lBQ3JELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7UUFFRCx5REFBb0IsR0FBcEIsVUFBcUIsSUFBWSxJQUFJLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkYsd0RBQW1CLEdBQW5CLGNBQWdDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU3RSw4REFBeUIsR0FBekIsY0FBdUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTFGLCtDQUFVLEdBQVYsY0FBdUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzRCxtREFBYyxHQUFkLFVBQWUsSUFBWSxJQUFJLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTNFLDZDQUFRLEdBQVIsVUFBUyxRQUFnQixJQUFzQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV6RiwwQ0FBSyxHQUFMLFVBQU0sQ0FBUyxJQUFVLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLGlDQUFDO0lBQUQsQ0FBQyxBQXpFRCxJQXlFQztJQXpFWSxnRUFBMEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UGx1Z2luQ29tcGlsZXJIb3N0fSBmcm9tICdAYmF6ZWwvdHlwZXNjcmlwdC90c2Nfd3JhcHBlZC9wbHVnaW5fYXBpJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG4vKipcbiAqIEV4dGVuc2lvbiBvZiB0aGUgVHlwZVNjcmlwdCBjb21waWxlciBob3N0IHRoYXQgc3VwcG9ydHMgZmlsZXMgYWRkZWQgdG8gdGhlIFByb2dyYW0gd2hpY2hcbiAqIHdlcmUgbmV2ZXIgb24gZGlzay5cbiAqXG4gKiBUaGlzIGlzIHVzZWQgZm9yIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IHdpdGggdGhlIFZpZXdFbmdpbmUgY29tcGlsZXIsIHdoaWNoIHVzZWQgbmdzdW1tYXJ5XG4gKiBhbmQgbmdmYWN0b3J5IGZpbGVzIGFzIGlucHV0cyB0byB0aGUgcHJvZ3JhbS4gV2UgY2FsbCB0aGVzZSBpbnB1dHMgXCJzeW50aGV0aWNcIi5cbiAqXG4gKiBUaGV5IG5lZWQgdG8gYmUgcHJvZ3JhbSBpbnB1dHMgYmVjYXVzZSB1c2VyIGNvZGUgbWF5IGltcG9ydCBmcm9tIHRoZXNlIGdlbmVyYXRlZCBmaWxlcy5cbiAqXG4gKiBUT0RPKGFseGh1Yik6IHJlbW92ZSB0aGlzIGFmdGVyIGFsbCBuZ19tb2R1bGUgdXNlcnMgaGF2ZSBtaWdyYXRlZCB0byBJdnlcbiAqL1xuZXhwb3J0IGNsYXNzIFN5bnRoZXRpY0ZpbGVzQ29tcGlsZXJIb3N0IGltcGxlbWVudHMgUGx1Z2luQ29tcGlsZXJIb3N0IHtcbiAgLyoqXG4gICAqIFNvdXJjZUZpbGVzIHdoaWNoIGFyZSBhZGRlZCB0byB0aGUgcHJvZ3JhbSBidXQgd2hpY2ggbmV2ZXIgZXhpc3RlZCBvbiBkaXNrLlxuICAgKi9cbiAgc3ludGhldGljRmlsZXMgPSBuZXcgTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm9vdEZpbGVzOiBzdHJpbmdbXSwgcHJpdmF0ZSBkZWxlZ2F0ZTogdHMuQ29tcGlsZXJIb3N0LFxuICAgICAgZ2VuZXJhdGVkRmlsZXM6IChyb290RmlsZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAgIFtmaWxlTmFtZTogc3RyaW5nXTogKGhvc3Q6IHRzLkNvbXBpbGVySG9zdCkgPT4gdHMuU291cmNlRmlsZSB8IHVuZGVmaW5lZFxuICAgICAgfSwgKSB7XG4gICAgLy8gQWxsb3cgbmd0c2MgdG8gY29udHJpYnV0ZSBpbi1tZW1vcnkgc3ludGhldGljIGZpbGVzLCB3aGljaCB3aWxsIGJlIGxvYWRlZFxuICAgIC8vIGFzIGlmIHRoZXkgZXhpc3RlZCBvbiBkaXNrIGFzIGFjdGlvbiBpbnB1dHMuXG4gICAgY29uc3QgYW5ndWxhckdlbmVyYXRlZEZpbGVzID0gZ2VuZXJhdGVkRmlsZXMgIShyb290RmlsZXMpO1xuICAgIGZvciAoY29uc3QgZiBvZiBPYmplY3Qua2V5cyhhbmd1bGFyR2VuZXJhdGVkRmlsZXMpKSB7XG4gICAgICBjb25zdCBnZW5lcmF0b3IgPSBhbmd1bGFyR2VuZXJhdGVkRmlsZXNbZl07XG4gICAgICBjb25zdCBnZW5lcmF0ZWQgPSBnZW5lcmF0b3IoZGVsZWdhdGUpO1xuICAgICAgaWYgKGdlbmVyYXRlZCkge1xuICAgICAgICB0aGlzLnN5bnRoZXRpY0ZpbGVzLnNldChnZW5lcmF0ZWQuZmlsZU5hbWUsIGdlbmVyYXRlZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZmlsZUV4aXN0cyhmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuc3ludGhldGljRmlsZXMuaGFzKGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmZpbGVFeGlzdHMoZmlsZVBhdGgpO1xuICB9XG5cbiAgLyoqIExvYWRzIGEgc291cmNlIGZpbGUgZnJvbSBpbi1tZW1vcnkgbWFwLCBvciBkZWxlZ2F0ZXMuICovXG4gIGdldFNvdXJjZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCxcbiAgICAgIG9uRXJyb3I/OiAobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKTogdHMuU291cmNlRmlsZXx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bnRoZXRpY0ZpbGUgPSB0aGlzLnN5bnRoZXRpY0ZpbGVzLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKHN5bnRoZXRpY0ZpbGUpIHtcbiAgICAgIHJldHVybiBzeW50aGV0aWNGaWxlICE7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUsIGxhbmd1YWdlVmVyc2lvbiwgb25FcnJvcik7XG4gIH1cblxuICBnZXQgaW5wdXRGaWxlcygpIHsgcmV0dXJuIFsuLi50aGlzLnJvb3RGaWxlcywgLi4uQXJyYXkuZnJvbSh0aGlzLnN5bnRoZXRpY0ZpbGVzLmtleXMoKSldOyB9XG5cbiAgZmlsZU5hbWVUb01vZHVsZUlkKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gZmlsZU5hbWU7ICAvLyBUT0RPOiBJdnkgbG9naWMuIGRvbid0IGZvcmdldCB0aGF0IHRoZSBkZWxlZ2F0ZSBoYXMgdGhlIGdvb2dsZTMgbG9naWNcbiAgfVxuXG4gIC8vIERlbGVnYXRlIGV2ZXJ5dGhpbmcgZWxzZSB0byB0aGUgb3JpZ2luYWwgY29tcGlsZXIgaG9zdC5cblxuICBnZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9ucyk7XG4gIH1cblxuICB3cml0ZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgIG9uRXJyb3I6ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQsXG4gICAgICBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPnx1bmRlZmluZWQpOiB2b2lkIHtcbiAgICB0aGlzLmRlbGVnYXRlLndyaXRlRmlsZShmaWxlTmFtZSwgY29udGVudCwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gIH1cblxuICBnZXRDYW5vbmljYWxGaWxlTmFtZShwYXRoOiBzdHJpbmcpIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0Q2Fub25pY2FsRmlsZU5hbWUocGF0aCk7IH1cblxuICBnZXRDdXJyZW50RGlyZWN0b3J5KCk6IHN0cmluZyB7IHJldHVybiB0aGlzLmRlbGVnYXRlLmdldEN1cnJlbnREaXJlY3RvcnkoKTsgfVxuXG4gIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmRlbGVnYXRlLnVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTsgfVxuXG4gIGdldE5ld0xpbmUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0TmV3TGluZSgpOyB9XG5cbiAgZ2V0RGlyZWN0b3JpZXMocGF0aDogc3RyaW5nKSB7IHJldHVybiB0aGlzLmRlbGVnYXRlLmdldERpcmVjdG9yaWVzKHBhdGgpOyB9XG5cbiAgcmVhZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZ3x1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5yZWFkRmlsZShmaWxlTmFtZSk7IH1cblxuICB0cmFjZShzOiBzdHJpbmcpOiB2b2lkIHsgY29uc29sZS5lcnJvcihzKTsgfVxufVxuIl19