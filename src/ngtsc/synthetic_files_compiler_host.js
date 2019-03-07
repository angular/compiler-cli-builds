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
        define("@angular/compiler-cli/src/ngtsc/synthetic_files_compiler_host", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
    class SyntheticFilesCompilerHost {
        constructor(rootFiles, delegate, generatedFiles) {
            this.rootFiles = rootFiles;
            this.delegate = delegate;
            /**
             * SourceFiles which are added to the program but which never existed on disk.
             */
            this.syntheticFiles = new Map();
            // Allow ngtsc to contribute in-memory synthetic files, which will be loaded
            // as if they existed on disk as action inputs.
            const angularGeneratedFiles = generatedFiles(rootFiles);
            for (const f of Object.keys(angularGeneratedFiles)) {
                const generator = angularGeneratedFiles[f];
                const generated = generator(delegate);
                if (generated) {
                    this.syntheticFiles.set(generated.fileName, generated);
                }
            }
        }
        fileExists(filePath) {
            if (this.syntheticFiles.has(filePath)) {
                return true;
            }
            return this.delegate.fileExists(filePath);
        }
        /** Loads a source file from in-memory map, or delegates. */
        getSourceFile(fileName, languageVersion, onError) {
            const syntheticFile = this.syntheticFiles.get(fileName);
            if (syntheticFile) {
                return syntheticFile;
            }
            return this.delegate.getSourceFile(fileName, languageVersion, onError);
        }
        get inputFiles() { return [...this.rootFiles, ...Array.from(this.syntheticFiles.keys())]; }
        fileNameToModuleId(fileName) {
            return fileName; // TODO: Ivy logic. don't forget that the delegate has the google3 logic
        }
        // Delegate everything else to the original compiler host.
        getDefaultLibFileName(options) {
            return this.delegate.getDefaultLibFileName(options);
        }
        writeFile(fileName, content, writeByteOrderMark, onError, sourceFiles) {
            this.delegate.writeFile(fileName, content, writeByteOrderMark, onError, sourceFiles);
        }
        getCanonicalFileName(path) { return this.delegate.getCanonicalFileName(path); }
        getCurrentDirectory() { return this.delegate.getCurrentDirectory(); }
        useCaseSensitiveFileNames() { return this.delegate.useCaseSensitiveFileNames(); }
        getNewLine() { return this.delegate.getNewLine(); }
        getDirectories(path) { return this.delegate.getDirectories(path); }
        readFile(fileName) { return this.delegate.readFile(fileName); }
        trace(s) { console.error(s); }
    }
    exports.SyntheticFilesCompilerHost = SyntheticFilesCompilerHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ludGhldGljX2ZpbGVzX2NvbXBpbGVyX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3N5bnRoZXRpY19maWxlc19jb21waWxlcl9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBS0g7Ozs7Ozs7Ozs7T0FVRztJQUNILE1BQWEsMEJBQTBCO1FBTXJDLFlBQ1ksU0FBbUIsRUFBVSxRQUF5QixFQUM5RCxjQUVDO1lBSE8sY0FBUyxHQUFULFNBQVMsQ0FBVTtZQUFVLGFBQVEsR0FBUixRQUFRLENBQWlCO1lBTmxFOztlQUVHO1lBQ0gsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBeUIsQ0FBQztZQU9oRCw0RUFBNEU7WUFDNUUsK0NBQStDO1lBQy9DLE1BQU0scUJBQXFCLEdBQUcsY0FBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMxRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsRUFBRTtnQkFDbEQsTUFBTSxTQUFTLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxTQUFTLEVBQUU7b0JBQ2IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztpQkFDeEQ7YUFDRjtRQUNILENBQUM7UUFFRCxVQUFVLENBQUMsUUFBZ0I7WUFDekIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDckMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUVELDREQUE0RDtRQUM1RCxhQUFhLENBQ1QsUUFBZ0IsRUFBRSxlQUFnQyxFQUNsRCxPQUFtQztZQUNyQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN4RCxJQUFJLGFBQWEsRUFBRTtnQkFDakIsT0FBTyxhQUFlLENBQUM7YUFDeEI7WUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekUsQ0FBQztRQUVELElBQUksVUFBVSxLQUFLLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUzRixrQkFBa0IsQ0FBQyxRQUFnQjtZQUNqQyxPQUFPLFFBQVEsQ0FBQyxDQUFFLHdFQUF3RTtRQUM1RixDQUFDO1FBRUQsMERBQTBEO1FBRTFELHFCQUFxQixDQUFDLE9BQTJCO1lBQy9DLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsU0FBUyxDQUNMLFFBQWdCLEVBQUUsT0FBZSxFQUFFLGtCQUEyQixFQUM5RCxPQUE4QyxFQUM5QyxXQUFtRDtZQUNyRCxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN2RixDQUFDO1FBRUQsb0JBQW9CLENBQUMsSUFBWSxJQUFJLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkYsbUJBQW1CLEtBQWEsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdFLHlCQUF5QixLQUFjLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUxRixVQUFVLEtBQWEsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzRCxjQUFjLENBQUMsSUFBWSxJQUFJLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTNFLFFBQVEsQ0FBQyxRQUFnQixJQUFzQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV6RixLQUFLLENBQUMsQ0FBUyxJQUFVLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzdDO0lBekVELGdFQXlFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtQbHVnaW5Db21waWxlckhvc3R9IGZyb20gJ0BiYXplbC90eXBlc2NyaXB0L2ludGVybmFsL3RzY193cmFwcGVkL3BsdWdpbl9hcGknO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbi8qKlxuICogRXh0ZW5zaW9uIG9mIHRoZSBUeXBlU2NyaXB0IGNvbXBpbGVyIGhvc3QgdGhhdCBzdXBwb3J0cyBmaWxlcyBhZGRlZCB0byB0aGUgUHJvZ3JhbSB3aGljaFxuICogd2VyZSBuZXZlciBvbiBkaXNrLlxuICpcbiAqIFRoaXMgaXMgdXNlZCBmb3IgYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgd2l0aCB0aGUgVmlld0VuZ2luZSBjb21waWxlciwgd2hpY2ggdXNlZCBuZ3N1bW1hcnlcbiAqIGFuZCBuZ2ZhY3RvcnkgZmlsZXMgYXMgaW5wdXRzIHRvIHRoZSBwcm9ncmFtLiBXZSBjYWxsIHRoZXNlIGlucHV0cyBcInN5bnRoZXRpY1wiLlxuICpcbiAqIFRoZXkgbmVlZCB0byBiZSBwcm9ncmFtIGlucHV0cyBiZWNhdXNlIHVzZXIgY29kZSBtYXkgaW1wb3J0IGZyb20gdGhlc2UgZ2VuZXJhdGVkIGZpbGVzLlxuICpcbiAqIFRPRE8oYWx4aHViKTogcmVtb3ZlIHRoaXMgYWZ0ZXIgYWxsIG5nX21vZHVsZSB1c2VycyBoYXZlIG1pZ3JhdGVkIHRvIEl2eVxuICovXG5leHBvcnQgY2xhc3MgU3ludGhldGljRmlsZXNDb21waWxlckhvc3QgaW1wbGVtZW50cyBQbHVnaW5Db21waWxlckhvc3Qge1xuICAvKipcbiAgICogU291cmNlRmlsZXMgd2hpY2ggYXJlIGFkZGVkIHRvIHRoZSBwcm9ncmFtIGJ1dCB3aGljaCBuZXZlciBleGlzdGVkIG9uIGRpc2suXG4gICAqL1xuICBzeW50aGV0aWNGaWxlcyA9IG5ldyBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb290RmlsZXM6IHN0cmluZ1tdLCBwcml2YXRlIGRlbGVnYXRlOiB0cy5Db21waWxlckhvc3QsXG4gICAgICBnZW5lcmF0ZWRGaWxlczogKHJvb3RGaWxlczogc3RyaW5nW10pID0+IHtcbiAgICAgICAgW2ZpbGVOYW1lOiBzdHJpbmddOiAoaG9zdDogdHMuQ29tcGlsZXJIb3N0KSA9PiB0cy5Tb3VyY2VGaWxlIHwgdW5kZWZpbmVkXG4gICAgICB9KSB7XG4gICAgLy8gQWxsb3cgbmd0c2MgdG8gY29udHJpYnV0ZSBpbi1tZW1vcnkgc3ludGhldGljIGZpbGVzLCB3aGljaCB3aWxsIGJlIGxvYWRlZFxuICAgIC8vIGFzIGlmIHRoZXkgZXhpc3RlZCBvbiBkaXNrIGFzIGFjdGlvbiBpbnB1dHMuXG4gICAgY29uc3QgYW5ndWxhckdlbmVyYXRlZEZpbGVzID0gZ2VuZXJhdGVkRmlsZXMgIShyb290RmlsZXMpO1xuICAgIGZvciAoY29uc3QgZiBvZiBPYmplY3Qua2V5cyhhbmd1bGFyR2VuZXJhdGVkRmlsZXMpKSB7XG4gICAgICBjb25zdCBnZW5lcmF0b3IgPSBhbmd1bGFyR2VuZXJhdGVkRmlsZXNbZl07XG4gICAgICBjb25zdCBnZW5lcmF0ZWQgPSBnZW5lcmF0b3IoZGVsZWdhdGUpO1xuICAgICAgaWYgKGdlbmVyYXRlZCkge1xuICAgICAgICB0aGlzLnN5bnRoZXRpY0ZpbGVzLnNldChnZW5lcmF0ZWQuZmlsZU5hbWUsIGdlbmVyYXRlZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZmlsZUV4aXN0cyhmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuc3ludGhldGljRmlsZXMuaGFzKGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmZpbGVFeGlzdHMoZmlsZVBhdGgpO1xuICB9XG5cbiAgLyoqIExvYWRzIGEgc291cmNlIGZpbGUgZnJvbSBpbi1tZW1vcnkgbWFwLCBvciBkZWxlZ2F0ZXMuICovXG4gIGdldFNvdXJjZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCxcbiAgICAgIG9uRXJyb3I/OiAobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKTogdHMuU291cmNlRmlsZXx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bnRoZXRpY0ZpbGUgPSB0aGlzLnN5bnRoZXRpY0ZpbGVzLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKHN5bnRoZXRpY0ZpbGUpIHtcbiAgICAgIHJldHVybiBzeW50aGV0aWNGaWxlICE7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUsIGxhbmd1YWdlVmVyc2lvbiwgb25FcnJvcik7XG4gIH1cblxuICBnZXQgaW5wdXRGaWxlcygpIHsgcmV0dXJuIFsuLi50aGlzLnJvb3RGaWxlcywgLi4uQXJyYXkuZnJvbSh0aGlzLnN5bnRoZXRpY0ZpbGVzLmtleXMoKSldOyB9XG5cbiAgZmlsZU5hbWVUb01vZHVsZUlkKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gZmlsZU5hbWU7ICAvLyBUT0RPOiBJdnkgbG9naWMuIGRvbid0IGZvcmdldCB0aGF0IHRoZSBkZWxlZ2F0ZSBoYXMgdGhlIGdvb2dsZTMgbG9naWNcbiAgfVxuXG4gIC8vIERlbGVnYXRlIGV2ZXJ5dGhpbmcgZWxzZSB0byB0aGUgb3JpZ2luYWwgY29tcGlsZXIgaG9zdC5cblxuICBnZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9ucyk7XG4gIH1cblxuICB3cml0ZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgIG9uRXJyb3I6ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQsXG4gICAgICBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPnx1bmRlZmluZWQpOiB2b2lkIHtcbiAgICB0aGlzLmRlbGVnYXRlLndyaXRlRmlsZShmaWxlTmFtZSwgY29udGVudCwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gIH1cblxuICBnZXRDYW5vbmljYWxGaWxlTmFtZShwYXRoOiBzdHJpbmcpIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0Q2Fub25pY2FsRmlsZU5hbWUocGF0aCk7IH1cblxuICBnZXRDdXJyZW50RGlyZWN0b3J5KCk6IHN0cmluZyB7IHJldHVybiB0aGlzLmRlbGVnYXRlLmdldEN1cnJlbnREaXJlY3RvcnkoKTsgfVxuXG4gIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmRlbGVnYXRlLnVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTsgfVxuXG4gIGdldE5ld0xpbmUoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0TmV3TGluZSgpOyB9XG5cbiAgZ2V0RGlyZWN0b3JpZXMocGF0aDogc3RyaW5nKSB7IHJldHVybiB0aGlzLmRlbGVnYXRlLmdldERpcmVjdG9yaWVzKHBhdGgpOyB9XG5cbiAgcmVhZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZ3x1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5yZWFkRmlsZShmaWxlTmFtZSk7IH1cblxuICB0cmFjZShzOiBzdHJpbmcpOiB2b2lkIHsgY29uc29sZS5lcnJvcihzKTsgfVxufVxuIl19