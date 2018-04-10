"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const ts = require("typescript");
const bundler_1 = require("./bundler");
const index_writer_1 = require("./index_writer");
const DTS = /\.d\.ts$/;
const JS_EXT = /(\.js|)$/;
function createSyntheticIndexHost(delegate, syntheticIndex) {
    const normalSyntheticIndexName = path.normalize(syntheticIndex.name);
    const newHost = Object.create(delegate);
    newHost.fileExists = (fileName) => {
        return path.normalize(fileName) == normalSyntheticIndexName || delegate.fileExists(fileName);
    };
    newHost.readFile = (fileName) => {
        return path.normalize(fileName) == normalSyntheticIndexName ? syntheticIndex.content :
            delegate.readFile(fileName);
    };
    newHost.getSourceFile =
        (fileName, languageVersion, onError) => {
            if (path.normalize(fileName) == normalSyntheticIndexName) {
                const sf = ts.createSourceFile(fileName, syntheticIndex.content, languageVersion, true);
                if (delegate.fileNameToModuleName) {
                    sf.moduleName = delegate.fileNameToModuleName(fileName);
                }
                return sf;
            }
            return delegate.getSourceFile(fileName, languageVersion, onError);
        };
    newHost.writeFile =
        (fileName, data, writeByteOrderMark, onError, sourceFiles) => {
            delegate.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
            if (fileName.match(DTS) && sourceFiles && sourceFiles.length == 1 &&
                path.normalize(sourceFiles[0].fileName) === normalSyntheticIndexName) {
                // If we are writing the synthetic index, write the metadata along side.
                const metadataName = fileName.replace(DTS, '.metadata.json');
                const indexMetadata = syntheticIndex.getMetadata();
                delegate.writeFile(metadataName, indexMetadata, writeByteOrderMark, onError, []);
            }
        };
    return newHost;
}
function createBundleIndexHost(ngOptions, rootFiles, host, getMetadataCache) {
    const files = rootFiles.filter(f => !DTS.test(f));
    let indexFile;
    if (files.length === 1) {
        indexFile = files[0];
    }
    else {
        for (const f of files) {
            // Assume the shortest file path called index.ts is the entry point
            if (f.endsWith(path.sep + 'index.ts')) {
                if (!indexFile || indexFile.length > f.length) {
                    indexFile = f;
                }
            }
        }
    }
    if (!indexFile) {
        return {
            host,
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
    const indexModule = indexFile.replace(/\.ts$/, '');
    // The operation of producing a metadata bundle happens twice - once during setup and once during
    // the emit phase. The first time, the bundle is produced without a metadata cache, to compute the
    // contents of the flat module index. The bundle produced during emit does use the metadata cache
    // with associated transforms, so the metadata will have lowered expressions, resource inlining,
    // etc.
    const getMetadataBundle = (cache) => {
        const bundler = new bundler_1.MetadataBundler(indexModule, ngOptions.flatModuleId, new bundler_1.CompilerHostAdapter(host, cache), ngOptions.flatModulePrivateSymbolPrefix);
        return bundler.getMetadataBundle();
    };
    // First, produce the bundle with no MetadataCache.
    const metadataBundle = getMetadataBundle(/* MetadataCache */ null);
    const name = path.join(path.dirname(indexModule), ngOptions.flatModuleOutFile.replace(JS_EXT, '.ts'));
    const libraryIndex = `./${path.basename(indexModule)}`;
    const content = index_writer_1.privateEntriesToIndex(libraryIndex, metadataBundle.privates);
    host = createSyntheticIndexHost(host, {
        name,
        content,
        getMetadata: () => {
            // The second metadata bundle production happens on-demand, and uses the getMetadataCache
            // closure to retrieve an up-to-date MetadataCache which is configured with whatever metadata
            // transforms were used to produce the JS output.
            const metadataBundle = getMetadataBundle(getMetadataCache());
            return JSON.stringify(metadataBundle.metadata);
        }
    });
    return { host, indexName: name };
}
exports.createBundleIndexHost = createBundleIndexHost;
//# sourceMappingURL=bundle_index_host.js.map