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
        define("@angular/compiler-cli/src/ngtsc/tsc_plugin/synthetic_files_compiler_host", ["require", "exports", "tslib"], factory);
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
     * TODO(alxhub): remove this after all ts_library users have migrated to Ivy
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ludGhldGljX2ZpbGVzX2NvbXBpbGVyX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RzY19wbHVnaW4vc3ludGhldGljX2ZpbGVzX2NvbXBpbGVyX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBSUg7Ozs7Ozs7Ozs7T0FVRztJQUNIO1FBTUUsb0NBQ1ksU0FBbUIsRUFBVSxRQUF5QixFQUM5RCxjQUVDOztZQUhPLGNBQVMsR0FBVCxTQUFTLENBQVU7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFpQjtZQU5sRTs7ZUFFRztZQUNILG1CQUFjLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUM7WUFPaEQsNEVBQTRFO1lBQzVFLCtDQUErQztZQUMvQyxJQUFNLHFCQUFxQixHQUFHLGNBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7O2dCQUMxRCxLQUFnQixJQUFBLEtBQUEsaUJBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBLGdCQUFBLDRCQUFFO29CQUEvQyxJQUFNLENBQUMsV0FBQTtvQkFDVixJQUFNLFNBQVMsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDM0MsSUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN0QyxJQUFJLFNBQVMsRUFBRTt3QkFDYixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO3FCQUN4RDtpQkFDRjs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUVELCtDQUFVLEdBQVYsVUFBVyxRQUFnQjtZQUN6QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNyQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsNERBQTREO1FBQzVELGtEQUFhLEdBQWIsVUFDSSxRQUFnQixFQUFFLGVBQWdDLEVBQ2xELE9BQW1DO1lBQ3JDLElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3hELElBQUksYUFBYSxFQUFFO2dCQUNqQixPQUFPLGFBQWUsQ0FBQzthQUN4QjtZQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6RSxDQUFDO1FBRUQsc0JBQUksa0RBQVU7aUJBQWQsY0FBbUIsd0JBQVcsSUFBSSxDQUFDLFNBQVMsRUFBSyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7OztXQUFBO1FBRTNGLHVEQUFrQixHQUFsQixVQUFtQixRQUFnQjtZQUNqQyxPQUFPLFFBQVEsQ0FBQyxDQUFFLHdFQUF3RTtRQUM1RixDQUFDO1FBRUQsMERBQTBEO1FBRTFELDBEQUFxQixHQUFyQixVQUFzQixPQUEyQjtZQUMvQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUVELDhDQUFTLEdBQVQsVUFDSSxRQUFnQixFQUFFLE9BQWUsRUFBRSxrQkFBMkIsRUFDOUQsT0FBOEMsRUFDOUMsV0FBbUQ7WUFDckQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDdkYsQ0FBQztRQUVELHlEQUFvQixHQUFwQixVQUFxQixJQUFZLElBQUksT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV2Rix3REFBbUIsR0FBbkIsY0FBZ0MsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdFLDhEQUF5QixHQUF6QixjQUF1QyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFMUYsK0NBQVUsR0FBVixjQUF1QixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNELG1EQUFjLEdBQWQsVUFBZSxJQUFZLElBQUksT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFM0UsNkNBQVEsR0FBUixVQUFTLFFBQWdCLElBQXNCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXpGLDBDQUFLLEdBQUwsVUFBTSxDQUFTLElBQVUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsaUNBQUM7SUFBRCxDQUFDLEFBekVELElBeUVDO0lBekVZLGdFQUEwQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbi8qKlxuICogRXh0ZW5zaW9uIG9mIHRoZSBUeXBlU2NyaXB0IGNvbXBpbGVyIGhvc3QgdGhhdCBzdXBwb3J0cyBmaWxlcyBhZGRlZCB0byB0aGUgUHJvZ3JhbSB3aGljaFxuICogd2VyZSBuZXZlciBvbiBkaXNrLlxuICpcbiAqIFRoaXMgaXMgdXNlZCBmb3IgYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgd2l0aCB0aGUgVmlld0VuZ2luZSBjb21waWxlciwgd2hpY2ggdXNlZCBuZ3N1bW1hcnlcbiAqIGFuZCBuZ2ZhY3RvcnkgZmlsZXMgYXMgaW5wdXRzIHRvIHRoZSBwcm9ncmFtLiBXZSBjYWxsIHRoZXNlIGlucHV0cyBcInN5bnRoZXRpY1wiLlxuICpcbiAqIFRoZXkgbmVlZCB0byBiZSBwcm9ncmFtIGlucHV0cyBiZWNhdXNlIHVzZXIgY29kZSBtYXkgaW1wb3J0IGZyb20gdGhlc2UgZ2VuZXJhdGVkIGZpbGVzLlxuICpcbiAqIFRPRE8oYWx4aHViKTogcmVtb3ZlIHRoaXMgYWZ0ZXIgYWxsIHRzX2xpYnJhcnkgdXNlcnMgaGF2ZSBtaWdyYXRlZCB0byBJdnlcbiAqL1xuZXhwb3J0IGNsYXNzIFN5bnRoZXRpY0ZpbGVzQ29tcGlsZXJIb3N0IGltcGxlbWVudHMgdHMuQ29tcGlsZXJIb3N0IHtcbiAgLyoqXG4gICAqIFNvdXJjZUZpbGVzIHdoaWNoIGFyZSBhZGRlZCB0byB0aGUgcHJvZ3JhbSBidXQgd2hpY2ggbmV2ZXIgZXhpc3RlZCBvbiBkaXNrLlxuICAgKi9cbiAgc3ludGhldGljRmlsZXMgPSBuZXcgTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm9vdEZpbGVzOiBzdHJpbmdbXSwgcHJpdmF0ZSBkZWxlZ2F0ZTogdHMuQ29tcGlsZXJIb3N0LFxuICAgICAgZ2VuZXJhdGVkRmlsZXM6IChyb290RmlsZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAgIFtmaWxlTmFtZTogc3RyaW5nXTogKGhvc3Q6IHRzLkNvbXBpbGVySG9zdCkgPT4gdHMuU291cmNlRmlsZSB8IHVuZGVmaW5lZFxuICAgICAgfSwgKSB7XG4gICAgLy8gQWxsb3cgbmd0c2MgdG8gY29udHJpYnV0ZSBpbi1tZW1vcnkgc3ludGhldGljIGZpbGVzLCB3aGljaCB3aWxsIGJlIGxvYWRlZFxuICAgIC8vIGFzIGlmIHRoZXkgZXhpc3RlZCBvbiBkaXNrIGFzIGFjdGlvbiBpbnB1dHMuXG4gICAgY29uc3QgYW5ndWxhckdlbmVyYXRlZEZpbGVzID0gZ2VuZXJhdGVkRmlsZXMgIShyb290RmlsZXMpO1xuICAgIGZvciAoY29uc3QgZiBvZiBPYmplY3Qua2V5cyhhbmd1bGFyR2VuZXJhdGVkRmlsZXMpKSB7XG4gICAgICBjb25zdCBnZW5lcmF0b3IgPSBhbmd1bGFyR2VuZXJhdGVkRmlsZXNbZl07XG4gICAgICBjb25zdCBnZW5lcmF0ZWQgPSBnZW5lcmF0b3IoZGVsZWdhdGUpO1xuICAgICAgaWYgKGdlbmVyYXRlZCkge1xuICAgICAgICB0aGlzLnN5bnRoZXRpY0ZpbGVzLnNldChnZW5lcmF0ZWQuZmlsZU5hbWUsIGdlbmVyYXRlZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZmlsZUV4aXN0cyhmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuc3ludGhldGljRmlsZXMuaGFzKGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmZpbGVFeGlzdHMoZmlsZVBhdGgpO1xuICB9XG5cbiAgLyoqIExvYWRzIGEgc291cmNlIGZpbGUgZnJvbSBpbi1tZW1vcnkgbWFwLCBvciBkZWxlZ2F0ZXMuICovXG4gIGdldFNvdXJjZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCxcbiAgICAgIG9uRXJyb3I/OiAobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKTogdHMuU291cmNlRmlsZXx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bnRoZXRpY0ZpbGUgPSB0aGlzLnN5bnRoZXRpY0ZpbGVzLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKHN5bnRoZXRpY0ZpbGUpIHtcbiAgICAgIHJldHVybiBzeW50aGV0aWNGaWxlICE7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUsIGxhbmd1YWdlVmVyc2lvbiwgb25FcnJvcik7XG4gIH1cblxuICBnZXQgaW5wdXRGaWxlcygpIHsgcmV0dXJuIFsuLi50aGlzLnJvb3RGaWxlcywgLi4uQXJyYXkuZnJvbSh0aGlzLnN5bnRoZXRpY0ZpbGVzLmtleXMoKSldOyB9XG5cbiAgZmlsZU5hbWVUb01vZHVsZUlkKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gZmlsZU5hbWU7ICAvLyBUT0RPOiBJdnkgbG9naWMuIGRvbid0IGZvcmdldCB0aGF0IHRoZSBkZWxlZ2F0ZSBoYXMgdGhlIGdvb2dsZTMgbG9naWNcbiAgfVxuXG4gIC8vIERlbGVnYXRlIGV2ZXJ5dGhpbmcgZWxzZSB0byB0aGUgb3JpZ2luYWwgY29tcGlsZXIgaG9zdC5cblxuICBnZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9ucyk7XG4gIH1cblxuICB3cml0ZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgIG9uRXJyb3I6ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQsXG4gICAgICBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPnx1bmRlZmluZWQpOiB2b2lkIHtcbiAgICB0aGlzLmRlbGVnYXRlLndyaXRlRmlsZShmaWxlTmFtZSwgY29udGVudCwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gIH1cblxuICBnZXRDYW5vbmljYWxGaWxlTmFtZShwYXRoOiBzdHJpbmcpIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0Q2Fub25pY2FsRmlsZU5hbWUocGF0aCk7IH1cblxuICBnZXRDdXJyZW50RGlyZWN0b3J5KCk6IHN0cmluZyB7IHJldHVybiB0aGlzLmRlbGVnYXRlLmdldEN1cnJlbnREaXJlY3RvcnkoKTsgfVxuXG4gIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmRlbGVnYXRlLnVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTsgfVxuXG4gIGdldE5ld0xpbmUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0TmV3TGluZSgpOyB9XG5cbiAgZ2V0RGlyZWN0b3JpZXMocGF0aDogc3RyaW5nKSB7IHJldHVybiB0aGlzLmRlbGVnYXRlLmdldERpcmVjdG9yaWVzKHBhdGgpOyB9XG5cbiAgcmVhZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZ3x1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5yZWFkRmlsZShmaWxlTmFtZSk7IH1cblxuICB0cmFjZShzOiBzdHJpbmcpOiB2b2lkIHsgY29uc29sZS5lcnJvcihzKTsgfVxufVxuIl19