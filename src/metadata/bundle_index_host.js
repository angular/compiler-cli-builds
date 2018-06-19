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
            var bundler = new bundler_1.MetadataBundler(indexModule, ngOptions.flatModuleId, new bundler_1.CompilerHostAdapter(host, cache), ngOptions.flatModulePrivateSymbolPrefix);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlX2luZGV4X2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL21ldGFkYXRhL2J1bmRsZV9pbmRleF9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUdILDJCQUE2QjtJQUM3QiwrQkFBaUM7SUFLakMsc0VBQStEO0lBQy9ELGdGQUFxRDtJQUVyRCxJQUFNLEdBQUcsR0FBRyxVQUFVLENBQUM7SUFDdkIsSUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDO0lBRTFCLGtDQUNJLFFBQVcsRUFBRSxjQUEwRTtRQUN6RixJQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXJFLElBQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEMsT0FBTyxDQUFDLFVBQVUsR0FBRyxVQUFDLFFBQWdCO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSx3QkFBd0IsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9GLENBQUMsQ0FBQztRQUVGLE9BQU8sQ0FBQyxRQUFRLEdBQUcsVUFBQyxRQUFnQjtZQUNsQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksd0JBQXdCLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDeEIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1RixDQUFDLENBQUM7UUFFRixPQUFPLENBQUMsYUFBYTtZQUNqQixVQUFDLFFBQWdCLEVBQUUsZUFBZ0MsRUFBRSxPQUFtQztnQkFDdEYsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJ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TyxFQUFDLElBQUksTUFBQSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUMsQ0FBQzs7SUFDakMsQ0FBQztJQWxFRCxzREFrRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJy4uL3RyYW5zZm9ybWVycy9hcGknO1xuaW1wb3J0IHtNZXRhZGF0YUNhY2hlfSBmcm9tICcuLi90cmFuc2Zvcm1lcnMvbWV0YWRhdGFfY2FjaGUnO1xuXG5pbXBvcnQge0NvbXBpbGVySG9zdEFkYXB0ZXIsIE1ldGFkYXRhQnVuZGxlcn0gZnJvbSAnLi9idW5kbGVyJztcbmltcG9ydCB7cHJpdmF0ZUVudHJpZXNUb0luZGV4fSBmcm9tICcuL2luZGV4X3dyaXRlcic7XG5cbmNvbnN0IERUUyA9IC9cXC5kXFwudHMkLztcbmNvbnN0IEpTX0VYVCA9IC8oXFwuanN8KSQvO1xuXG5mdW5jdGlvbiBjcmVhdGVTeW50aGV0aWNJbmRleEhvc3Q8SCBleHRlbmRzIHRzLkNvbXBpbGVySG9zdD4oXG4gICAgZGVsZWdhdGU6IEgsIHN5bnRoZXRpY0luZGV4OiB7bmFtZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsIGdldE1ldGFkYXRhOiAoKSA9PiBzdHJpbmd9KTogSCB7XG4gIGNvbnN0IG5vcm1hbFN5bnRoZXRpY0luZGV4TmFtZSA9IHBhdGgubm9ybWFsaXplKHN5bnRoZXRpY0luZGV4Lm5hbWUpO1xuXG4gIGNvbnN0IG5ld0hvc3QgPSBPYmplY3QuY3JlYXRlKGRlbGVnYXRlKTtcbiAgbmV3SG9zdC5maWxlRXhpc3RzID0gKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICByZXR1cm4gcGF0aC5ub3JtYWxpemUoZmlsZU5hbWUpID09IG5vcm1hbFN5bnRoZXRpY0luZGV4TmFtZSB8fCBkZWxlZ2F0ZS5maWxlRXhpc3RzKGZpbGVOYW1lKTtcbiAgfTtcblxuICBuZXdIb3N0LnJlYWRGaWxlID0gKGZpbGVOYW1lOiBzdHJpbmcpID0+IHtcbiAgICByZXR1cm4gcGF0aC5ub3JtYWxpemUoZmlsZU5hbWUpID09IG5vcm1hbFN5bnRoZXRpY0luZGV4TmFtZSA/IHN5bnRoZXRpY0luZGV4LmNvbnRlbnQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZWdhdGUucmVhZEZpbGUoZmlsZU5hbWUpO1xuICB9O1xuXG4gIG5ld0hvc3QuZ2V0U291cmNlRmlsZSA9XG4gICAgICAoZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQsIG9uRXJyb3I/OiAobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKSA9PiB7XG4gICAgICAgIGlmIChwYXRoLm5vcm1hbGl6ZShmaWxlTmFtZSkgPT0gbm9ybWFsU3ludGhldGljSW5kZXhOYW1lKSB7XG4gICAgICAgICAgY29uc3Qgc2YgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGVOYW1lLCBzeW50aGV0aWNJbmRleC5jb250ZW50LCBsYW5ndWFnZVZlcnNpb24sIHRydWUpO1xuICAgICAgICAgIGlmICgoZGVsZWdhdGUgYXMgYW55KS5maWxlTmFtZVRvTW9kdWxlTmFtZSkge1xuICAgICAgICAgICAgc2YubW9kdWxlTmFtZSA9IChkZWxlZ2F0ZSBhcyBhbnkpLmZpbGVOYW1lVG9Nb2R1bGVOYW1lKGZpbGVOYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHNmO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWxlZ2F0ZS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lLCBsYW5ndWFnZVZlcnNpb24sIG9uRXJyb3IpO1xuICAgICAgfTtcblxuICBuZXdIb3N0LndyaXRlRmlsZSA9XG4gICAgICAoZmlsZU5hbWU6IHN0cmluZywgZGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICAgb25FcnJvcjogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpIHwgdW5kZWZpbmVkLFxuICAgICAgIHNvdXJjZUZpbGVzOiBSZWFkb25seTx0cy5Tb3VyY2VGaWxlPltdKSA9PiB7XG4gICAgICAgIGRlbGVnYXRlLndyaXRlRmlsZShmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gICAgICAgIGlmIChmaWxlTmFtZS5tYXRjaChEVFMpICYmIHNvdXJjZUZpbGVzICYmIHNvdXJjZUZpbGVzLmxlbmd0aCA9PSAxICYmXG4gICAgICAgICAgICBwYXRoLm5vcm1hbGl6ZShzb3VyY2VGaWxlc1swXS5maWxlTmFtZSkgPT09IG5vcm1hbFN5bnRoZXRpY0luZGV4TmFtZSkge1xuICAgICAgICAgIC8vIElmIHdlIGFyZSB3cml0aW5nIHRoZSBzeW50aGV0aWMgaW5kZXgsIHdyaXRlIHRoZSBtZXRhZGF0YSBhbG9uZyBzaWRlLlxuICAgICAgICAgIGNvbnN0IG1ldGFkYXRhTmFtZSA9IGZpbGVOYW1lLnJlcGxhY2UoRFRTLCAnLm1ldGFkYXRhLmpzb24nKTtcbiAgICAgICAgICBjb25zdCBpbmRleE1ldGFkYXRhID0gc3ludGhldGljSW5kZXguZ2V0TWV0YWRhdGEoKTtcbiAgICAgICAgICBkZWxlZ2F0ZS53cml0ZUZpbGUobWV0YWRhdGFOYW1lLCBpbmRleE1ldGFkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIFtdKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgcmV0dXJuIG5ld0hvc3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVCdW5kbGVJbmRleEhvc3Q8SCBleHRlbmRzIHRzLkNvbXBpbGVySG9zdD4oXG4gICAgbmdPcHRpb25zOiBDb21waWxlck9wdGlvbnMsIHJvb3RGaWxlczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LCBob3N0OiBILFxuICAgIGdldE1ldGFkYXRhQ2FjaGU6ICgpID0+XG4gICAgICAgIE1ldGFkYXRhQ2FjaGUpOiB7aG9zdDogSCwgaW5kZXhOYW1lPzogc3RyaW5nLCBlcnJvcnM/OiB0cy5EaWFnbm9zdGljW119IHtcbiAgY29uc3QgZmlsZXMgPSByb290RmlsZXMuZmlsdGVyKGYgPT4gIURUUy50ZXN0KGYpKTtcbiAgbGV0IGluZGV4RmlsZTogc3RyaW5nfHVuZGVmaW5lZDtcbiAgaWYgKGZpbGVzLmxlbmd0aCA9PT0gMSkge1xuICAgIGluZGV4RmlsZSA9IGZpbGVzWzBdO1xuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3QgZiBvZiBmaWxlcykge1xuICAgICAgLy8gQXNzdW1lIHRoZSBzaG9ydGVzdCBmaWxlIHBhdGggY2FsbGVkIGluZGV4LnRzIGlzIHRoZSBlbnRyeSBwb2ludFxuICAgICAgaWYgKGYuZW5kc1dpdGgocGF0aC5zZXAgKyAnaW5kZXgudHMnKSkge1xuICAgICAgICBpZiAoIWluZGV4RmlsZSB8fCBpbmRleEZpbGUubGVuZ3RoID4gZi5sZW5ndGgpIHtcbiAgICAgICAgICBpbmRleEZpbGUgPSBmO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICghaW5kZXhGaWxlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGhvc3QsXG4gICAgICBlcnJvcnM6IFt7XG4gICAgICAgIGZpbGU6IG51bGwgYXMgYW55IGFzIHRzLlNvdXJjZUZpbGUsXG4gICAgICAgIHN0YXJ0OiBudWxsIGFzIGFueSBhcyBudW1iZXIsXG4gICAgICAgIGxlbmd0aDogbnVsbCBhcyBhbnkgYXMgbnVtYmVyLFxuICAgICAgICBtZXNzYWdlVGV4dDpcbiAgICAgICAgICAgICdBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbiBcImZsYXRNb2R1bGVJbmRleFwiIHJlcXVpcmVzIG9uZSBhbmQgb25seSBvbmUgLnRzIGZpbGUgaW4gdGhlIFwiZmlsZXNcIiBmaWVsZC4nLFxuICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICBjb2RlOiAwXG4gICAgICB9XVxuICAgIH07XG4gIH1cblxuICBjb25zdCBpbmRleE1vZHVsZSA9IGluZGV4RmlsZS5yZXBsYWNlKC9cXC50cyQvLCAnJyk7XG5cbiAgLy8gVGhlIG9wZXJhdGlvbiBvZiBwcm9kdWNpbmcgYSBtZXRhZGF0YSBidW5kbGUgaGFwcGVucyB0d2ljZSAtIG9uY2UgZHVyaW5nIHNldHVwIGFuZCBvbmNlIGR1cmluZ1xuICAvLyB0aGUgZW1pdCBwaGFzZS4gVGhlIGZpcnN0IHRpbWUsIHRoZSBidW5kbGUgaXMgcHJvZHVjZWQgd2l0aG91dCBhIG1ldGFkYXRhIGNhY2hlLCB0byBjb21wdXRlIHRoZVxuICAvLyBjb250ZW50cyBvZiB0aGUgZmxhdCBtb2R1bGUgaW5kZXguIFRoZSBidW5kbGUgcHJvZHVjZWQgZHVyaW5nIGVtaXQgZG9lcyB1c2UgdGhlIG1ldGFkYXRhIGNhY2hlXG4gIC8vIHdpdGggYXNzb2NpYXRlZCB0cmFuc2Zvcm1zLCBzbyB0aGUgbWV0YWRhdGEgd2lsbCBoYXZlIGxvd2VyZWQgZXhwcmVzc2lvbnMsIHJlc291cmNlIGlubGluaW5nLFxuICAvLyBldGMuXG4gIGNvbnN0IGdldE1ldGFkYXRhQnVuZGxlID0gKGNhY2hlOiBNZXRhZGF0YUNhY2hlIHwgbnVsbCkgPT4ge1xuICAgIGNvbnN0IGJ1bmRsZXIgPSBuZXcgTWV0YWRhdGFCdW5kbGVyKFxuICAgICAgICBpbmRleE1vZHVsZSwgbmdPcHRpb25zLmZsYXRNb2R1bGVJZCwgbmV3IENvbXBpbGVySG9zdEFkYXB0ZXIoaG9zdCwgY2FjaGUpLFxuICAgICAgICBuZ09wdGlvbnMuZmxhdE1vZHVsZVByaXZhdGVTeW1ib2xQcmVmaXgpO1xuICAgIHJldHVybiBidW5kbGVyLmdldE1ldGFkYXRhQnVuZGxlKCk7XG4gIH07XG5cbiAgLy8gRmlyc3QsIHByb2R1Y2UgdGhlIGJ1bmRsZSB3aXRoIG5vIE1ldGFkYXRhQ2FjaGUuXG4gIGNvbnN0IG1ldGFkYXRhQnVuZGxlID0gZ2V0TWV0YWRhdGFCdW5kbGUoLyogTWV0YWRhdGFDYWNoZSAqLyBudWxsKTtcbiAgY29uc3QgbmFtZSA9XG4gICAgICBwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKGluZGV4TW9kdWxlKSwgbmdPcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlICEucmVwbGFjZShKU19FWFQsICcudHMnKSk7XG4gIGNvbnN0IGxpYnJhcnlJbmRleCA9IGAuLyR7cGF0aC5iYXNlbmFtZShpbmRleE1vZHVsZSl9YDtcbiAgY29uc3QgY29udGVudCA9IHByaXZhdGVFbnRyaWVzVG9JbmRleChsaWJyYXJ5SW5kZXgsIG1ldGFkYXRhQnVuZGxlLnByaXZhdGVzKTtcblxuICBob3N0ID0gY3JlYXRlU3ludGhldGljSW5kZXhIb3N0KGhvc3QsIHtcbiAgICBuYW1lLFxuICAgIGNvbnRlbnQsXG4gICAgZ2V0TWV0YWRhdGE6ICgpID0+IHtcbiAgICAgIC8vIFRoZSBzZWNvbmQgbWV0YWRhdGEgYnVuZGxlIHByb2R1Y3Rpb24gaGFwcGVucyBvbi1kZW1hbmQsIGFuZCB1c2VzIHRoZSBnZXRNZXRhZGF0YUNhY2hlXG4gICAgICAvLyBjbG9zdXJlIHRvIHJldHJpZXZlIGFuIHVwLXRvLWRhdGUgTWV0YWRhdGFDYWNoZSB3aGljaCBpcyBjb25maWd1cmVkIHdpdGggd2hhdGV2ZXIgbWV0YWRhdGFcbiAgICAgIC8vIHRyYW5zZm9ybXMgd2VyZSB1c2VkIHRvIHByb2R1Y2UgdGhlIEpTIG91dHB1dC5cbiAgICAgIGNvbnN0IG1ldGFkYXRhQnVuZGxlID0gZ2V0TWV0YWRhdGFCdW5kbGUoZ2V0TWV0YWRhdGFDYWNoZSgpKTtcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShtZXRhZGF0YUJ1bmRsZS5tZXRhZGF0YSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHtob3N0LCBpbmRleE5hbWU6IG5hbWV9O1xufVxuIl19