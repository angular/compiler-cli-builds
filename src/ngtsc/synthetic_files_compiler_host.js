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
            if (delegate.getDirectories !== undefined) {
                this.getDirectories = (path) => delegate.getDirectories(path);
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
        readFile(fileName) { return this.delegate.readFile(fileName); }
        trace(s) { console.error(s); }
    }
    exports.SyntheticFilesCompilerHost = SyntheticFilesCompilerHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ludGhldGljX2ZpbGVzX2NvbXBpbGVyX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3N5bnRoZXRpY19maWxlc19jb21waWxlcl9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBS0g7Ozs7Ozs7Ozs7T0FVRztJQUNILE1BQWEsMEJBQTBCO1FBTXJDLFlBQ1ksU0FBbUIsRUFBVSxRQUF5QixFQUM5RCxjQUVDO1lBSE8sY0FBUyxHQUFULFNBQVMsQ0FBVTtZQUFVLGFBQVEsR0FBUixRQUFRLENBQWlCO1lBTmxFOztlQUVHO1lBQ0gsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBeUIsQ0FBQztZQU9oRCw0RUFBNEU7WUFDNUUsK0NBQStDO1lBQy9DLE1BQU0scUJBQXFCLEdBQUcsY0FBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMxRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsRUFBRTtnQkFDbEQsTUFBTSxTQUFTLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxTQUFTLEVBQUU7b0JBQ2IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztpQkFDeEQ7YUFDRjtZQUNELElBQUksUUFBUSxDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQUU7Z0JBQ3pDLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxjQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3pFO1FBQ0gsQ0FBQztRQUVELFVBQVUsQ0FBQyxRQUFnQjtZQUN6QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNyQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsNERBQTREO1FBQzVELGFBQWEsQ0FDVCxRQUFnQixFQUFFLGVBQWdDLEVBQ2xELE9BQW1DO1lBQ3JDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3hELElBQUksYUFBYSxFQUFFO2dCQUNqQixPQUFPLGFBQWUsQ0FBQzthQUN4QjtZQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6RSxDQUFDO1FBRUQsSUFBSSxVQUFVLEtBQUssT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTNGLGtCQUFrQixDQUFDLFFBQWdCO1lBQ2pDLE9BQU8sUUFBUSxDQUFDLENBQUUsd0VBQXdFO1FBQzVGLENBQUM7UUFFRCwwREFBMEQ7UUFFMUQscUJBQXFCLENBQUMsT0FBMkI7WUFDL0MsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFFRCxTQUFTLENBQ0wsUUFBZ0IsRUFBRSxPQUFlLEVBQUUsa0JBQTJCLEVBQzlELE9BQThDLEVBQzlDLFdBQW1EO1lBQ3JELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7UUFFRCxvQkFBb0IsQ0FBQyxJQUFZLElBQUksT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV2RixtQkFBbUIsS0FBYSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0UseUJBQXlCLEtBQWMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTFGLFVBQVUsS0FBYSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBSTNELFFBQVEsQ0FBQyxRQUFnQixJQUFzQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV6RixLQUFLLENBQUMsQ0FBUyxJQUFVLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzdDO0lBNUVELGdFQTRFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtQbHVnaW5Db21waWxlckhvc3R9IGZyb20gJ0BiYXplbC90eXBlc2NyaXB0L2ludGVybmFsL3RzY193cmFwcGVkL3BsdWdpbl9hcGknO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbi8qKlxuICogRXh0ZW5zaW9uIG9mIHRoZSBUeXBlU2NyaXB0IGNvbXBpbGVyIGhvc3QgdGhhdCBzdXBwb3J0cyBmaWxlcyBhZGRlZCB0byB0aGUgUHJvZ3JhbSB3aGljaFxuICogd2VyZSBuZXZlciBvbiBkaXNrLlxuICpcbiAqIFRoaXMgaXMgdXNlZCBmb3IgYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgd2l0aCB0aGUgVmlld0VuZ2luZSBjb21waWxlciwgd2hpY2ggdXNlZCBuZ3N1bW1hcnlcbiAqIGFuZCBuZ2ZhY3RvcnkgZmlsZXMgYXMgaW5wdXRzIHRvIHRoZSBwcm9ncmFtLiBXZSBjYWxsIHRoZXNlIGlucHV0cyBcInN5bnRoZXRpY1wiLlxuICpcbiAqIFRoZXkgbmVlZCB0byBiZSBwcm9ncmFtIGlucHV0cyBiZWNhdXNlIHVzZXIgY29kZSBtYXkgaW1wb3J0IGZyb20gdGhlc2UgZ2VuZXJhdGVkIGZpbGVzLlxuICpcbiAqIFRPRE8oYWx4aHViKTogcmVtb3ZlIHRoaXMgYWZ0ZXIgYWxsIG5nX21vZHVsZSB1c2VycyBoYXZlIG1pZ3JhdGVkIHRvIEl2eVxuICovXG5leHBvcnQgY2xhc3MgU3ludGhldGljRmlsZXNDb21waWxlckhvc3QgaW1wbGVtZW50cyBQbHVnaW5Db21waWxlckhvc3Qge1xuICAvKipcbiAgICogU291cmNlRmlsZXMgd2hpY2ggYXJlIGFkZGVkIHRvIHRoZSBwcm9ncmFtIGJ1dCB3aGljaCBuZXZlciBleGlzdGVkIG9uIGRpc2suXG4gICAqL1xuICBzeW50aGV0aWNGaWxlcyA9IG5ldyBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb290RmlsZXM6IHN0cmluZ1tdLCBwcml2YXRlIGRlbGVnYXRlOiB0cy5Db21waWxlckhvc3QsXG4gICAgICBnZW5lcmF0ZWRGaWxlczogKHJvb3RGaWxlczogc3RyaW5nW10pID0+IHtcbiAgICAgICAgW2ZpbGVOYW1lOiBzdHJpbmddOiAoaG9zdDogdHMuQ29tcGlsZXJIb3N0KSA9PiB0cy5Tb3VyY2VGaWxlIHwgdW5kZWZpbmVkXG4gICAgICB9KSB7XG4gICAgLy8gQWxsb3cgbmd0c2MgdG8gY29udHJpYnV0ZSBpbi1tZW1vcnkgc3ludGhldGljIGZpbGVzLCB3aGljaCB3aWxsIGJlIGxvYWRlZFxuICAgIC8vIGFzIGlmIHRoZXkgZXhpc3RlZCBvbiBkaXNrIGFzIGFjdGlvbiBpbnB1dHMuXG4gICAgY29uc3QgYW5ndWxhckdlbmVyYXRlZEZpbGVzID0gZ2VuZXJhdGVkRmlsZXMgIShyb290RmlsZXMpO1xuICAgIGZvciAoY29uc3QgZiBvZiBPYmplY3Qua2V5cyhhbmd1bGFyR2VuZXJhdGVkRmlsZXMpKSB7XG4gICAgICBjb25zdCBnZW5lcmF0b3IgPSBhbmd1bGFyR2VuZXJhdGVkRmlsZXNbZl07XG4gICAgICBjb25zdCBnZW5lcmF0ZWQgPSBnZW5lcmF0b3IoZGVsZWdhdGUpO1xuICAgICAgaWYgKGdlbmVyYXRlZCkge1xuICAgICAgICB0aGlzLnN5bnRoZXRpY0ZpbGVzLnNldChnZW5lcmF0ZWQuZmlsZU5hbWUsIGdlbmVyYXRlZCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChkZWxlZ2F0ZS5nZXREaXJlY3RvcmllcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmdldERpcmVjdG9yaWVzID0gKHBhdGg6IHN0cmluZykgPT4gZGVsZWdhdGUuZ2V0RGlyZWN0b3JpZXMgIShwYXRoKTtcbiAgICB9XG4gIH1cblxuICBmaWxlRXhpc3RzKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5zeW50aGV0aWNGaWxlcy5oYXMoZmlsZVBhdGgpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZmlsZUV4aXN0cyhmaWxlUGF0aCk7XG4gIH1cblxuICAvKiogTG9hZHMgYSBzb3VyY2UgZmlsZSBmcm9tIGluLW1lbW9yeSBtYXAsIG9yIGRlbGVnYXRlcy4gKi9cbiAgZ2V0U291cmNlRmlsZShcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIGxhbmd1YWdlVmVyc2lvbjogdHMuU2NyaXB0VGFyZ2V0LFxuICAgICAgb25FcnJvcj86IChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpOiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3ludGhldGljRmlsZSA9IHRoaXMuc3ludGhldGljRmlsZXMuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoc3ludGhldGljRmlsZSkge1xuICAgICAgcmV0dXJuIHN5bnRoZXRpY0ZpbGUgITtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0U291cmNlRmlsZShmaWxlTmFtZSwgbGFuZ3VhZ2VWZXJzaW9uLCBvbkVycm9yKTtcbiAgfVxuXG4gIGdldCBpbnB1dEZpbGVzKCkgeyByZXR1cm4gWy4uLnRoaXMucm9vdEZpbGVzLCAuLi5BcnJheS5mcm9tKHRoaXMuc3ludGhldGljRmlsZXMua2V5cygpKV07IH1cblxuICBmaWxlTmFtZVRvTW9kdWxlSWQoZmlsZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBmaWxlTmFtZTsgIC8vIFRPRE86IEl2eSBsb2dpYy4gZG9uJ3QgZm9yZ2V0IHRoYXQgdGhlIGRlbGVnYXRlIGhhcyB0aGUgZ29vZ2xlMyBsb2dpY1xuICB9XG5cbiAgLy8gRGVsZWdhdGUgZXZlcnl0aGluZyBlbHNlIHRvIHRoZSBvcmlnaW5hbCBjb21waWxlciBob3N0LlxuXG4gIGdldERlZmF1bHRMaWJGaWxlTmFtZShvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldERlZmF1bHRMaWJGaWxlTmFtZShvcHRpb25zKTtcbiAgfVxuXG4gIHdyaXRlRmlsZShcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgb25FcnJvcjogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCxcbiAgICAgIHNvdXJjZUZpbGVzOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+fHVuZGVmaW5lZCk6IHZvaWQge1xuICAgIHRoaXMuZGVsZWdhdGUud3JpdGVGaWxlKGZpbGVOYW1lLCBjb250ZW50LCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKTtcbiAgfVxuXG4gIGdldENhbm9uaWNhbEZpbGVOYW1lKHBhdGg6IHN0cmluZykgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXRDYW5vbmljYWxGaWxlTmFtZShwYXRoKTsgfVxuXG4gIGdldEN1cnJlbnREaXJlY3RvcnkoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0Q3VycmVudERpcmVjdG9yeSgpOyB9XG5cbiAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOyB9XG5cbiAgZ2V0TmV3TGluZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXROZXdMaW5lKCk7IH1cblxuICBnZXREaXJlY3Rvcmllcz86IChwYXRoOiBzdHJpbmcpID0+IHN0cmluZ1tdO1xuXG4gIHJlYWRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmd8dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUucmVhZEZpbGUoZmlsZU5hbWUpOyB9XG5cbiAgdHJhY2Uoczogc3RyaW5nKTogdm9pZCB7IGNvbnNvbGUuZXJyb3Iocyk7IH1cbn1cbiJdfQ==