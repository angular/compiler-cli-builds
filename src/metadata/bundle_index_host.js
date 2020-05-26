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
    exports.createBundleIndexHost = void 0;
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
        var e_1, _a;
        var files = rootFiles.filter(function (f) { return !DTS.test(f); });
        var indexFile;
        if (files.length === 1) {
            indexFile = files[0];
        }
        else {
            try {
                for (var files_1 = tslib_1.__values(files), files_1_1 = files_1.next(); !files_1_1.done; files_1_1 = files_1.next()) {
                    var f = files_1_1.value;
                    // Assume the shortest file path called index.ts is the entry point. Note that we
                    // need to use the posix path delimiter here because TypeScript internally only
                    // passes posix paths.
                    if (f.endsWith('/index.ts')) {
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
    }
    exports.createBundleIndexHost = createBundleIndexHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlX2luZGV4X2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL21ldGFkYXRhL2J1bmRsZV9pbmRleF9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBS2pDLHNFQUErRDtJQUMvRCxnRkFBcUQ7SUFFckQsSUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDO0lBQ3ZCLElBQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQztJQUUxQixTQUFTLHdCQUF3QixDQUM3QixRQUFXLEVBQUUsY0FBMEU7UUFDekYsSUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVyRSxJQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsVUFBQyxRQUFnQjtZQUNwQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksd0JBQXdCLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvRixDQUFDLENBQUM7UUFFRixPQUFPLENBQUMsUUFBUSxHQUFHLFVBQUMsUUFBZ0I7WUFDbEMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3hCLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUYsQ0FBQyxDQUFDO1FBRUYsT0FBTyxDQUFDLGFBQWE7WUFDakIsVUFBQyxRQUFnQixFQUFFLGVBQWdDLEVBQUUsT0FBbUM7Z0JBQ3RGLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FB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LFFBQVEsQ0FBQyxDQUFDO1lBQ2pELENBQUM7U0FDRixDQUFDLENBQUM7UUFDSCxPQUFPLEVBQUMsSUFBSSxNQUFBLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBQyxDQUFDO0lBQ2pDLENBQUM7SUFwRUQsc0RBb0VDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zfSBmcm9tICcuLi90cmFuc2Zvcm1lcnMvYXBpJztcbmltcG9ydCB7TWV0YWRhdGFDYWNoZX0gZnJvbSAnLi4vdHJhbnNmb3JtZXJzL21ldGFkYXRhX2NhY2hlJztcblxuaW1wb3J0IHtDb21waWxlckhvc3RBZGFwdGVyLCBNZXRhZGF0YUJ1bmRsZXJ9IGZyb20gJy4vYnVuZGxlcic7XG5pbXBvcnQge3ByaXZhdGVFbnRyaWVzVG9JbmRleH0gZnJvbSAnLi9pbmRleF93cml0ZXInO1xuXG5jb25zdCBEVFMgPSAvXFwuZFxcLnRzJC87XG5jb25zdCBKU19FWFQgPSAvKFxcLmpzfCkkLztcblxuZnVuY3Rpb24gY3JlYXRlU3ludGhldGljSW5kZXhIb3N0PEggZXh0ZW5kcyB0cy5Db21waWxlckhvc3Q+KFxuICAgIGRlbGVnYXRlOiBILCBzeW50aGV0aWNJbmRleDoge25hbWU6IHN0cmluZywgY29udGVudDogc3RyaW5nLCBnZXRNZXRhZGF0YTogKCkgPT4gc3RyaW5nfSk6IEgge1xuICBjb25zdCBub3JtYWxTeW50aGV0aWNJbmRleE5hbWUgPSBwYXRoLm5vcm1hbGl6ZShzeW50aGV0aWNJbmRleC5uYW1lKTtcblxuICBjb25zdCBuZXdIb3N0ID0gT2JqZWN0LmNyZWF0ZShkZWxlZ2F0ZSk7XG4gIG5ld0hvc3QuZmlsZUV4aXN0cyA9IChmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuIHBhdGgubm9ybWFsaXplKGZpbGVOYW1lKSA9PSBub3JtYWxTeW50aGV0aWNJbmRleE5hbWUgfHwgZGVsZWdhdGUuZmlsZUV4aXN0cyhmaWxlTmFtZSk7XG4gIH07XG5cbiAgbmV3SG9zdC5yZWFkRmlsZSA9IChmaWxlTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgcmV0dXJuIHBhdGgubm9ybWFsaXplKGZpbGVOYW1lKSA9PSBub3JtYWxTeW50aGV0aWNJbmRleE5hbWUgPyBzeW50aGV0aWNJbmRleC5jb250ZW50IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGVnYXRlLnJlYWRGaWxlKGZpbGVOYW1lKTtcbiAgfTtcblxuICBuZXdIb3N0LmdldFNvdXJjZUZpbGUgPVxuICAgICAgKGZpbGVOYW1lOiBzdHJpbmcsIGxhbmd1YWdlVmVyc2lvbjogdHMuU2NyaXB0VGFyZ2V0LCBvbkVycm9yPzogKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCkgPT4ge1xuICAgICAgICBpZiAocGF0aC5ub3JtYWxpemUoZmlsZU5hbWUpID09IG5vcm1hbFN5bnRoZXRpY0luZGV4TmFtZSkge1xuICAgICAgICAgIGNvbnN0IHNmID0gdHMuY3JlYXRlU291cmNlRmlsZShmaWxlTmFtZSwgc3ludGhldGljSW5kZXguY29udGVudCwgbGFuZ3VhZ2VWZXJzaW9uLCB0cnVlKTtcbiAgICAgICAgICBpZiAoKGRlbGVnYXRlIGFzIGFueSkuZmlsZU5hbWVUb01vZHVsZU5hbWUpIHtcbiAgICAgICAgICAgIHNmLm1vZHVsZU5hbWUgPSAoZGVsZWdhdGUgYXMgYW55KS5maWxlTmFtZVRvTW9kdWxlTmFtZShmaWxlTmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzZjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVsZWdhdGUuZ2V0U291cmNlRmlsZShmaWxlTmFtZSwgbGFuZ3VhZ2VWZXJzaW9uLCBvbkVycm9yKTtcbiAgICAgIH07XG5cbiAgbmV3SG9zdC53cml0ZUZpbGUgPVxuICAgICAgKGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgIG9uRXJyb3I6ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQsIHNvdXJjZUZpbGVzOiBSZWFkb25seTx0cy5Tb3VyY2VGaWxlPltdKSA9PiB7XG4gICAgICAgIGRlbGVnYXRlLndyaXRlRmlsZShmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gICAgICAgIGlmIChmaWxlTmFtZS5tYXRjaChEVFMpICYmIHNvdXJjZUZpbGVzICYmIHNvdXJjZUZpbGVzLmxlbmd0aCA9PSAxICYmXG4gICAgICAgICAgICBwYXRoLm5vcm1hbGl6ZShzb3VyY2VGaWxlc1swXS5maWxlTmFtZSkgPT09IG5vcm1hbFN5bnRoZXRpY0luZGV4TmFtZSkge1xuICAgICAgICAgIC8vIElmIHdlIGFyZSB3cml0aW5nIHRoZSBzeW50aGV0aWMgaW5kZXgsIHdyaXRlIHRoZSBtZXRhZGF0YSBhbG9uZyBzaWRlLlxuICAgICAgICAgIGNvbnN0IG1ldGFkYXRhTmFtZSA9IGZpbGVOYW1lLnJlcGxhY2UoRFRTLCAnLm1ldGFkYXRhLmpzb24nKTtcbiAgICAgICAgICBjb25zdCBpbmRleE1ldGFkYXRhID0gc3ludGhldGljSW5kZXguZ2V0TWV0YWRhdGEoKTtcbiAgICAgICAgICBkZWxlZ2F0ZS53cml0ZUZpbGUobWV0YWRhdGFOYW1lLCBpbmRleE1ldGFkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIFtdKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgcmV0dXJuIG5ld0hvc3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVCdW5kbGVJbmRleEhvc3Q8SCBleHRlbmRzIHRzLkNvbXBpbGVySG9zdD4oXG4gICAgbmdPcHRpb25zOiBDb21waWxlck9wdGlvbnMsIHJvb3RGaWxlczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LCBob3N0OiBILFxuICAgIGdldE1ldGFkYXRhQ2FjaGU6ICgpID0+XG4gICAgICAgIE1ldGFkYXRhQ2FjaGUpOiB7aG9zdDogSCwgaW5kZXhOYW1lPzogc3RyaW5nLCBlcnJvcnM/OiB0cy5EaWFnbm9zdGljW119IHtcbiAgY29uc3QgZmlsZXMgPSByb290RmlsZXMuZmlsdGVyKGYgPT4gIURUUy50ZXN0KGYpKTtcbiAgbGV0IGluZGV4RmlsZTogc3RyaW5nfHVuZGVmaW5lZDtcbiAgaWYgKGZpbGVzLmxlbmd0aCA9PT0gMSkge1xuICAgIGluZGV4RmlsZSA9IGZpbGVzWzBdO1xuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3QgZiBvZiBmaWxlcykge1xuICAgICAgLy8gQXNzdW1lIHRoZSBzaG9ydGVzdCBmaWxlIHBhdGggY2FsbGVkIGluZGV4LnRzIGlzIHRoZSBlbnRyeSBwb2ludC4gTm90ZSB0aGF0IHdlXG4gICAgICAvLyBuZWVkIHRvIHVzZSB0aGUgcG9zaXggcGF0aCBkZWxpbWl0ZXIgaGVyZSBiZWNhdXNlIFR5cGVTY3JpcHQgaW50ZXJuYWxseSBvbmx5XG4gICAgICAvLyBwYXNzZXMgcG9zaXggcGF0aHMuXG4gICAgICBpZiAoZi5lbmRzV2l0aCgnL2luZGV4LnRzJykpIHtcbiAgICAgICAgaWYgKCFpbmRleEZpbGUgfHwgaW5kZXhGaWxlLmxlbmd0aCA+IGYubGVuZ3RoKSB7XG4gICAgICAgICAgaW5kZXhGaWxlID0gZjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAoIWluZGV4RmlsZSkge1xuICAgIHJldHVybiB7XG4gICAgICBob3N0LFxuICAgICAgZXJyb3JzOiBbe1xuICAgICAgICBmaWxlOiBudWxsIGFzIGFueSBhcyB0cy5Tb3VyY2VGaWxlLFxuICAgICAgICBzdGFydDogbnVsbCBhcyBhbnkgYXMgbnVtYmVyLFxuICAgICAgICBsZW5ndGg6IG51bGwgYXMgYW55IGFzIG51bWJlcixcbiAgICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgICAnQW5ndWxhciBjb21waWxlciBvcHRpb24gXCJmbGF0TW9kdWxlSW5kZXhcIiByZXF1aXJlcyBvbmUgYW5kIG9ubHkgb25lIC50cyBmaWxlIGluIHRoZSBcImZpbGVzXCIgZmllbGQuJyxcbiAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgY29kZTogMFxuICAgICAgfV1cbiAgICB9O1xuICB9XG5cbiAgY29uc3QgaW5kZXhNb2R1bGUgPSBpbmRleEZpbGUucmVwbGFjZSgvXFwudHMkLywgJycpO1xuXG4gIC8vIFRoZSBvcGVyYXRpb24gb2YgcHJvZHVjaW5nIGEgbWV0YWRhdGEgYnVuZGxlIGhhcHBlbnMgdHdpY2UgLSBvbmNlIGR1cmluZyBzZXR1cCBhbmQgb25jZSBkdXJpbmdcbiAgLy8gdGhlIGVtaXQgcGhhc2UuIFRoZSBmaXJzdCB0aW1lLCB0aGUgYnVuZGxlIGlzIHByb2R1Y2VkIHdpdGhvdXQgYSBtZXRhZGF0YSBjYWNoZSwgdG8gY29tcHV0ZSB0aGVcbiAgLy8gY29udGVudHMgb2YgdGhlIGZsYXQgbW9kdWxlIGluZGV4LiBUaGUgYnVuZGxlIHByb2R1Y2VkIGR1cmluZyBlbWl0IGRvZXMgdXNlIHRoZSBtZXRhZGF0YSBjYWNoZVxuICAvLyB3aXRoIGFzc29jaWF0ZWQgdHJhbnNmb3Jtcywgc28gdGhlIG1ldGFkYXRhIHdpbGwgaGF2ZSBsb3dlcmVkIGV4cHJlc3Npb25zLCByZXNvdXJjZSBpbmxpbmluZyxcbiAgLy8gZXRjLlxuICBjb25zdCBnZXRNZXRhZGF0YUJ1bmRsZSA9IChjYWNoZTogTWV0YWRhdGFDYWNoZXxudWxsKSA9PiB7XG4gICAgY29uc3QgYnVuZGxlciA9IG5ldyBNZXRhZGF0YUJ1bmRsZXIoXG4gICAgICAgIGluZGV4TW9kdWxlLCBuZ09wdGlvbnMuZmxhdE1vZHVsZUlkLCBuZXcgQ29tcGlsZXJIb3N0QWRhcHRlcihob3N0LCBjYWNoZSwgbmdPcHRpb25zKSxcbiAgICAgICAgbmdPcHRpb25zLmZsYXRNb2R1bGVQcml2YXRlU3ltYm9sUHJlZml4KTtcbiAgICByZXR1cm4gYnVuZGxlci5nZXRNZXRhZGF0YUJ1bmRsZSgpO1xuICB9O1xuXG4gIC8vIEZpcnN0LCBwcm9kdWNlIHRoZSBidW5kbGUgd2l0aCBubyBNZXRhZGF0YUNhY2hlLlxuICBjb25zdCBtZXRhZGF0YUJ1bmRsZSA9IGdldE1ldGFkYXRhQnVuZGxlKC8qIE1ldGFkYXRhQ2FjaGUgKi8gbnVsbCk7XG4gIGNvbnN0IG5hbWUgPVxuICAgICAgcGF0aC5qb2luKHBhdGguZGlybmFtZShpbmRleE1vZHVsZSksIG5nT3B0aW9ucy5mbGF0TW9kdWxlT3V0RmlsZSEucmVwbGFjZShKU19FWFQsICcudHMnKSk7XG4gIGNvbnN0IGxpYnJhcnlJbmRleCA9IGAuLyR7cGF0aC5iYXNlbmFtZShpbmRleE1vZHVsZSl9YDtcbiAgY29uc3QgY29udGVudCA9IHByaXZhdGVFbnRyaWVzVG9JbmRleChsaWJyYXJ5SW5kZXgsIG1ldGFkYXRhQnVuZGxlLnByaXZhdGVzKTtcblxuICBob3N0ID0gY3JlYXRlU3ludGhldGljSW5kZXhIb3N0KGhvc3QsIHtcbiAgICBuYW1lLFxuICAgIGNvbnRlbnQsXG4gICAgZ2V0TWV0YWRhdGE6ICgpID0+IHtcbiAgICAgIC8vIFRoZSBzZWNvbmQgbWV0YWRhdGEgYnVuZGxlIHByb2R1Y3Rpb24gaGFwcGVucyBvbi1kZW1hbmQsIGFuZCB1c2VzIHRoZSBnZXRNZXRhZGF0YUNhY2hlXG4gICAgICAvLyBjbG9zdXJlIHRvIHJldHJpZXZlIGFuIHVwLXRvLWRhdGUgTWV0YWRhdGFDYWNoZSB3aGljaCBpcyBjb25maWd1cmVkIHdpdGggd2hhdGV2ZXIgbWV0YWRhdGFcbiAgICAgIC8vIHRyYW5zZm9ybXMgd2VyZSB1c2VkIHRvIHByb2R1Y2UgdGhlIEpTIG91dHB1dC5cbiAgICAgIGNvbnN0IG1ldGFkYXRhQnVuZGxlID0gZ2V0TWV0YWRhdGFCdW5kbGUoZ2V0TWV0YWRhdGFDYWNoZSgpKTtcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShtZXRhZGF0YUJ1bmRsZS5tZXRhZGF0YSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHtob3N0LCBpbmRleE5hbWU6IG5hbWV9O1xufVxuIl19