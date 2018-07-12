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
        define("@angular/compiler-cli/src/metadata/bundle_index_host", ["require", "exports", "tslib", "path", "typescript", "@angular/compiler-cli/src/metadata/bundler", "@angular/compiler-cli/src/metadata/index_writer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var path = require("path");
    var ts = require("typescript");
    var bundler_1 = require("@angular/compiler-cli/src/metadata/bundler");
    var index_writer_1 = require("@angular/compiler-cli/src/metadata/index_writer");
    var DTS = /\.d\.ts$/;
    var JS_EXT = /(\.js|)$/;
    function createSyntheticIndexHost(delegate, syntheticIndex) {
        var normalSyntheticIndexName = path.normalize(syntheticIndex.name);
        var newHost = Object.create(delegate);
        newHost.fileExists = function (fileName) {
            return path.normalize(fileName) == normalSyntheticIndexName || delegate.fileExists(fileName);
        };
        newHost.readFile = function (fileName) {
            return path.normalize(fileName) == normalSyntheticIndexName ? syntheticIndex.content :
                delegate.readFile(fileName);
        };
        newHost.getSourceFile =
            function (fileName, languageVersion, onError) {
                if (path.normalize(fileName) == normalSyntheticIndexName) {
                    var sf = ts.createSourceFile(fileName, syntheticIndex.content, languageVersion, true);
                    if (delegate.fileNameToModuleName) {
                        sf.moduleName = delegate.fileNameToModuleName(fileName);
                    }
                    return sf;
                }
                return delegate.getSourceFile(fileName, languageVersion, onError);
            };
        newHost.writeFile =
            function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
                delegate.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
                if (fileName.match(DTS) && sourceFiles && sourceFiles.length == 1 &&
                    path.normalize(sourceFiles[0].fileName) === normalSyntheticIndexName) {
                    // If we are writing the synthetic index, write the metadata along side.
                    var metadataName = fileName.replace(DTS, '.metadata.json');
                    var indexMetadata = syntheticIndex.getMetadata();
                    delegate.writeFile(metadataName, indexMetadata, writeByteOrderMark, onError, []);
                }
            };
        return newHost;
    }
    function createBundleIndexHost(ngOptions, rootFiles, host, getMetadataCache) {
        var files = rootFiles.filter(function (f) { return !DTS.test(f); });
        var indexFile;
        if (files.length === 1) {
            indexFile = files[0];
        }
        else {
            try {
                for (var files_1 = tslib_1.__values(files), files_1_1 = files_1.next(); !files_1_1.done; files_1_1 = files_1.next()) {
                    var f = files_1_1.value;
                    // Assume the shortest file path called index.ts is the entry point
                    if (f.endsWith(path.sep + 'index.ts')) {
                        if (!indexFile || indexFile.length > f.length) {
                            indexFile = f;
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (files_1_1 && !files_1_1.done && (_a = files_1.return)) _a.call(files_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        if (!indexFile) {
            return {
                host: host,
                errors: [{
                        file: null,
                        start: null,
                        length: null,
                        messageText: 'Angular compiler option "flatModuleIndex" requires one and only one .ts file in the "files" field.',
                        category: ts.DiagnosticCategory.Error,
                        code: 0
                    }]
            };
        }
        var indexModule = indexFile.replace(/\.ts$/, '');
        // The operation of producing a metadata bundle happens twice - once during setup and once during
        // the emit phase. The first time, the bundle is produced without a metadata cache, to compute the
        // contents of the flat module index. The bundle produced during emit does use the metadata cache
        // with associated transforms, so the metadata will have lowered expressions, resource inlining,
        // etc.
        var getMetadataBundle = function (cache) {
            var bundler = new bundler_1.MetadataBundler(indexModule, ngOptions.flatModuleId, new bundler_1.CompilerHostAdapter(host, cache, ngOptions), ngOptions.flatModulePrivateSymbolPrefix);
            return bundler.getMetadataBundle();
        };
        // First, produce the bundle with no MetadataCache.
        var metadataBundle = getMetadataBundle(/* MetadataCache */ null);
        var name = path.join(path.dirname(indexModule), ngOptions.flatModuleOutFile.replace(JS_EXT, '.ts'));
        var libraryIndex = "./" + path.basename(indexModule);
        var content = index_writer_1.privateEntriesToIndex(libraryIndex, metadataBundle.privates);
        host = createSyntheticIndexHost(host, {
            name: name,
            content: content,
            getMetadata: function () {
                // The second metadata bundle production happens on-demand, and uses the getMetadataCache
                // closure to retrieve an up-to-date MetadataCache which is configured with whatever metadata
                // transforms were used to produce the JS output.
                var metadataBundle = getMetadataBundle(getMetadataCache());
                return JSON.stringify(metadataBundle.metadata);
            }
        });
        return { host: host, indexName: name };
        var e_1, _a;
    }
    exports.createBundleIndexHost = createBundleIndexHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlX2luZGV4X2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL21ldGFkYXRhL2J1bmRsZV9pbmRleF9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUdILDJCQUE2QjtJQUM3QiwrQkFBaUM7SUFLakMsc0VBQStEO0lBQy9ELGdGQUFxRDtJQUVyRCxJQUFNLEdBQUcsR0FBRyxVQUFVLENBQUM7SUFDdkIsSUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDO0lBRTFCLGtDQUNJLFFBQVcsRUFBRSxjQUEwRTtRQUN6RixJQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXJFLElBQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEMsT0FBTyxDQUFDLFVBQVUsR0FBRyxVQUFDLFFBQWdCO1lBQ3BDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLHdCQUF3QixJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0YsQ0FBQyxDQUFDO1FBRUYsT0FBTyxDQUFDLFFBQVEsR0FBRyxVQUFDLFFBQWdCO1lBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3hCLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUYsQ0FBQyxDQUFDO1FBRUYsT0FBTyxDQUFDLGFBQWE7WUFDakIsVUFBQyxRQUFnQixFQUFFLGVBQWdDLEVBQUUsT0FBbUM7Z0JBQ3RGLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxT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LENBQUMsSUFBSSxFQUFFO1lBQ3BDLElBQUksTUFBQTtZQUNKLE9BQU8sU0FBQTtZQUNQLFdBQVcsRUFBRTtnQkFDWCx5RkFBeUY7Z0JBQ3pGLDZGQUE2RjtnQkFDN0YsaURBQWlEO2dCQUNqRCxJQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7Z0JBQzdELE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNqRCxDQUFDO1NBQ0YsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLEVBQUMsSUFBSSxNQUFBLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBQyxDQUFDOztJQUNqQyxDQUFDO0lBbEVELHNEQWtFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQge01ldGFkYXRhQ2FjaGV9IGZyb20gJy4uL3RyYW5zZm9ybWVycy9tZXRhZGF0YV9jYWNoZSc7XG5cbmltcG9ydCB7Q29tcGlsZXJIb3N0QWRhcHRlciwgTWV0YWRhdGFCdW5kbGVyfSBmcm9tICcuL2J1bmRsZXInO1xuaW1wb3J0IHtwcml2YXRlRW50cmllc1RvSW5kZXh9IGZyb20gJy4vaW5kZXhfd3JpdGVyJztcblxuY29uc3QgRFRTID0gL1xcLmRcXC50cyQvO1xuY29uc3QgSlNfRVhUID0gLyhcXC5qc3wpJC87XG5cbmZ1bmN0aW9uIGNyZWF0ZVN5bnRoZXRpY0luZGV4SG9zdDxIIGV4dGVuZHMgdHMuQ29tcGlsZXJIb3N0PihcbiAgICBkZWxlZ2F0ZTogSCwgc3ludGhldGljSW5kZXg6IHtuYW1lOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZywgZ2V0TWV0YWRhdGE6ICgpID0+IHN0cmluZ30pOiBIIHtcbiAgY29uc3Qgbm9ybWFsU3ludGhldGljSW5kZXhOYW1lID0gcGF0aC5ub3JtYWxpemUoc3ludGhldGljSW5kZXgubmFtZSk7XG5cbiAgY29uc3QgbmV3SG9zdCA9IE9iamVjdC5jcmVhdGUoZGVsZWdhdGUpO1xuICBuZXdIb3N0LmZpbGVFeGlzdHMgPSAoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiBwYXRoLm5vcm1hbGl6ZShmaWxlTmFtZSkgPT0gbm9ybWFsU3ludGhldGljSW5kZXhOYW1lIHx8IGRlbGVnYXRlLmZpbGVFeGlzdHMoZmlsZU5hbWUpO1xuICB9O1xuXG4gIG5ld0hvc3QucmVhZEZpbGUgPSAoZmlsZU5hbWU6IHN0cmluZykgPT4ge1xuICAgIHJldHVybiBwYXRoLm5vcm1hbGl6ZShmaWxlTmFtZSkgPT0gbm9ybWFsU3ludGhldGljSW5kZXhOYW1lID8gc3ludGhldGljSW5kZXguY29udGVudCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxlZ2F0ZS5yZWFkRmlsZShmaWxlTmFtZSk7XG4gIH07XG5cbiAgbmV3SG9zdC5nZXRTb3VyY2VGaWxlID1cbiAgICAgIChmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCwgb25FcnJvcj86IChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpID0+IHtcbiAgICAgICAgaWYgKHBhdGgubm9ybWFsaXplKGZpbGVOYW1lKSA9PSBub3JtYWxTeW50aGV0aWNJbmRleE5hbWUpIHtcbiAgICAgICAgICBjb25zdCBzZiA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZU5hbWUsIHN5bnRoZXRpY0luZGV4LmNvbnRlbnQsIGxhbmd1YWdlVmVyc2lvbiwgdHJ1ZSk7XG4gICAgICAgICAgaWYgKChkZWxlZ2F0ZSBhcyBhbnkpLmZpbGVOYW1lVG9Nb2R1bGVOYW1lKSB7XG4gICAgICAgICAgICBzZi5tb2R1bGVOYW1lID0gKGRlbGVnYXRlIGFzIGFueSkuZmlsZU5hbWVUb01vZHVsZU5hbWUoZmlsZU5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gc2Y7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlbGVnYXRlLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUsIGxhbmd1YWdlVmVyc2lvbiwgb25FcnJvcik7XG4gICAgICB9O1xuXG4gIG5ld0hvc3Qud3JpdGVGaWxlID1cbiAgICAgIChmaWxlTmFtZTogc3RyaW5nLCBkYXRhOiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgICBvbkVycm9yOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCkgfCB1bmRlZmluZWQsXG4gICAgICAgc291cmNlRmlsZXM6IFJlYWRvbmx5PHRzLlNvdXJjZUZpbGU+W10pID0+IHtcbiAgICAgICAgZGVsZWdhdGUud3JpdGVGaWxlKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKTtcbiAgICAgICAgaWYgKGZpbGVOYW1lLm1hdGNoKERUUykgJiYgc291cmNlRmlsZXMgJiYgc291cmNlRmlsZXMubGVuZ3RoID09IDEgJiZcbiAgICAgICAgICAgIHBhdGgubm9ybWFsaXplKHNvdXJjZUZpbGVzWzBdLmZpbGVOYW1lKSA9PT0gbm9ybWFsU3ludGhldGljSW5kZXhOYW1lKSB7XG4gICAgICAgICAgLy8gSWYgd2UgYXJlIHdyaXRpbmcgdGhlIHN5bnRoZXRpYyBpbmRleCwgd3JpdGUgdGhlIG1ldGFkYXRhIGFsb25nIHNpZGUuXG4gICAgICAgICAgY29uc3QgbWV0YWRhdGFOYW1lID0gZmlsZU5hbWUucmVwbGFjZShEVFMsICcubWV0YWRhdGEuanNvbicpO1xuICAgICAgICAgIGNvbnN0IGluZGV4TWV0YWRhdGEgPSBzeW50aGV0aWNJbmRleC5nZXRNZXRhZGF0YSgpO1xuICAgICAgICAgIGRlbGVnYXRlLndyaXRlRmlsZShtZXRhZGF0YU5hbWUsIGluZGV4TWV0YWRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgW10pO1xuICAgICAgICB9XG4gICAgICB9O1xuICByZXR1cm4gbmV3SG9zdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUJ1bmRsZUluZGV4SG9zdDxIIGV4dGVuZHMgdHMuQ29tcGlsZXJIb3N0PihcbiAgICBuZ09wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgcm9vdEZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sIGhvc3Q6IEgsXG4gICAgZ2V0TWV0YWRhdGFDYWNoZTogKCkgPT5cbiAgICAgICAgTWV0YWRhdGFDYWNoZSk6IHtob3N0OiBILCBpbmRleE5hbWU/OiBzdHJpbmcsIGVycm9ycz86IHRzLkRpYWdub3N0aWNbXX0ge1xuICBjb25zdCBmaWxlcyA9IHJvb3RGaWxlcy5maWx0ZXIoZiA9PiAhRFRTLnRlc3QoZikpO1xuICBsZXQgaW5kZXhGaWxlOiBzdHJpbmd8dW5kZWZpbmVkO1xuICBpZiAoZmlsZXMubGVuZ3RoID09PSAxKSB7XG4gICAgaW5kZXhGaWxlID0gZmlsZXNbMF07XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCBmIG9mIGZpbGVzKSB7XG4gICAgICAvLyBBc3N1bWUgdGhlIHNob3J0ZXN0IGZpbGUgcGF0aCBjYWxsZWQgaW5kZXgudHMgaXMgdGhlIGVudHJ5IHBvaW50XG4gICAgICBpZiAoZi5lbmRzV2l0aChwYXRoLnNlcCArICdpbmRleC50cycpKSB7XG4gICAgICAgIGlmICghaW5kZXhGaWxlIHx8IGluZGV4RmlsZS5sZW5ndGggPiBmLmxlbmd0aCkge1xuICAgICAgICAgIGluZGV4RmlsZSA9IGY7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKCFpbmRleEZpbGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaG9zdCxcbiAgICAgIGVycm9yczogW3tcbiAgICAgICAgZmlsZTogbnVsbCBhcyBhbnkgYXMgdHMuU291cmNlRmlsZSxcbiAgICAgICAgc3RhcnQ6IG51bGwgYXMgYW55IGFzIG51bWJlcixcbiAgICAgICAgbGVuZ3RoOiBudWxsIGFzIGFueSBhcyBudW1iZXIsXG4gICAgICAgIG1lc3NhZ2VUZXh0OlxuICAgICAgICAgICAgJ0FuZ3VsYXIgY29tcGlsZXIgb3B0aW9uIFwiZmxhdE1vZHVsZUluZGV4XCIgcmVxdWlyZXMgb25lIGFuZCBvbmx5IG9uZSAudHMgZmlsZSBpbiB0aGUgXCJmaWxlc1wiIGZpZWxkLicsXG4gICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgIGNvZGU6IDBcbiAgICAgIH1dXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGluZGV4TW9kdWxlID0gaW5kZXhGaWxlLnJlcGxhY2UoL1xcLnRzJC8sICcnKTtcblxuICAvLyBUaGUgb3BlcmF0aW9uIG9mIHByb2R1Y2luZyBhIG1ldGFkYXRhIGJ1bmRsZSBoYXBwZW5zIHR3aWNlIC0gb25jZSBkdXJpbmcgc2V0dXAgYW5kIG9uY2UgZHVyaW5nXG4gIC8vIHRoZSBlbWl0IHBoYXNlLiBUaGUgZmlyc3QgdGltZSwgdGhlIGJ1bmRsZSBpcyBwcm9kdWNlZCB3aXRob3V0IGEgbWV0YWRhdGEgY2FjaGUsIHRvIGNvbXB1dGUgdGhlXG4gIC8vIGNvbnRlbnRzIG9mIHRoZSBmbGF0IG1vZHVsZSBpbmRleC4gVGhlIGJ1bmRsZSBwcm9kdWNlZCBkdXJpbmcgZW1pdCBkb2VzIHVzZSB0aGUgbWV0YWRhdGEgY2FjaGVcbiAgLy8gd2l0aCBhc3NvY2lhdGVkIHRyYW5zZm9ybXMsIHNvIHRoZSBtZXRhZGF0YSB3aWxsIGhhdmUgbG93ZXJlZCBleHByZXNzaW9ucywgcmVzb3VyY2UgaW5saW5pbmcsXG4gIC8vIGV0Yy5cbiAgY29uc3QgZ2V0TWV0YWRhdGFCdW5kbGUgPSAoY2FjaGU6IE1ldGFkYXRhQ2FjaGUgfCBudWxsKSA9PiB7XG4gICAgY29uc3QgYnVuZGxlciA9IG5ldyBNZXRhZGF0YUJ1bmRsZXIoXG4gICAgICAgIGluZGV4TW9kdWxlLCBuZ09wdGlvbnMuZmxhdE1vZHVsZUlkLCBuZXcgQ29tcGlsZXJIb3N0QWRhcHRlcihob3N0LCBjYWNoZSwgbmdPcHRpb25zKSxcbiAgICAgICAgbmdPcHRpb25zLmZsYXRNb2R1bGVQcml2YXRlU3ltYm9sUHJlZml4KTtcbiAgICByZXR1cm4gYnVuZGxlci5nZXRNZXRhZGF0YUJ1bmRsZSgpO1xuICB9O1xuXG4gIC8vIEZpcnN0LCBwcm9kdWNlIHRoZSBidW5kbGUgd2l0aCBubyBNZXRhZGF0YUNhY2hlLlxuICBjb25zdCBtZXRhZGF0YUJ1bmRsZSA9IGdldE1ldGFkYXRhQnVuZGxlKC8qIE1ldGFkYXRhQ2FjaGUgKi8gbnVsbCk7XG4gIGNvbnN0IG5hbWUgPVxuICAgICAgcGF0aC5qb2luKHBhdGguZGlybmFtZShpbmRleE1vZHVsZSksIG5nT3B0aW9ucy5mbGF0TW9kdWxlT3V0RmlsZSAhLnJlcGxhY2UoSlNfRVhULCAnLnRzJykpO1xuICBjb25zdCBsaWJyYXJ5SW5kZXggPSBgLi8ke3BhdGguYmFzZW5hbWUoaW5kZXhNb2R1bGUpfWA7XG4gIGNvbnN0IGNvbnRlbnQgPSBwcml2YXRlRW50cmllc1RvSW5kZXgobGlicmFyeUluZGV4LCBtZXRhZGF0YUJ1bmRsZS5wcml2YXRlcyk7XG5cbiAgaG9zdCA9IGNyZWF0ZVN5bnRoZXRpY0luZGV4SG9zdChob3N0LCB7XG4gICAgbmFtZSxcbiAgICBjb250ZW50LFxuICAgIGdldE1ldGFkYXRhOiAoKSA9PiB7XG4gICAgICAvLyBUaGUgc2Vjb25kIG1ldGFkYXRhIGJ1bmRsZSBwcm9kdWN0aW9uIGhhcHBlbnMgb24tZGVtYW5kLCBhbmQgdXNlcyB0aGUgZ2V0TWV0YWRhdGFDYWNoZVxuICAgICAgLy8gY2xvc3VyZSB0byByZXRyaWV2ZSBhbiB1cC10by1kYXRlIE1ldGFkYXRhQ2FjaGUgd2hpY2ggaXMgY29uZmlndXJlZCB3aXRoIHdoYXRldmVyIG1ldGFkYXRhXG4gICAgICAvLyB0cmFuc2Zvcm1zIHdlcmUgdXNlZCB0byBwcm9kdWNlIHRoZSBKUyBvdXRwdXQuXG4gICAgICBjb25zdCBtZXRhZGF0YUJ1bmRsZSA9IGdldE1ldGFkYXRhQnVuZGxlKGdldE1ldGFkYXRhQ2FjaGUoKSk7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkobWV0YWRhdGFCdW5kbGUubWV0YWRhdGEpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiB7aG9zdCwgaW5kZXhOYW1lOiBuYW1lfTtcbn1cbiJdfQ==