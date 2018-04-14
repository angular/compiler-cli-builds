"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const metadata_1 = require("../metadata");
const util_1 = require("./util");
function createMetadataReaderCache() {
    const data = new Map();
    return { data };
}
exports.createMetadataReaderCache = createMetadataReaderCache;
function readMetadata(filePath, host, cache) {
    let metadatas = cache && cache.data.get(filePath);
    if (metadatas) {
        return metadatas;
    }
    if (host.fileExists(filePath)) {
        // If the file doesn't exists then we cannot return metadata for the file.
        // This will occur if the user referenced a declared module for which no file
        // exists for the module (i.e. jQuery or angularjs).
        if (util_1.DTS.test(filePath)) {
            metadatas = readMetadataFile(host, filePath);
            if (!metadatas) {
                // If there is a .d.ts file but no metadata file we need to produce a
                // metadata from the .d.ts file as metadata files capture reexports
                // (starting with v3).
                metadatas = [upgradeMetadataWithDtsData(host, { '__symbolic': 'module', 'version': 1, 'metadata': {} }, filePath)];
            }
        }
        else {
            const metadata = host.getSourceFileMetadata(filePath);
            metadatas = metadata ? [metadata] : [];
        }
    }
    if (cache && (!host.cacheMetadata || host.cacheMetadata(filePath))) {
        cache.data.set(filePath, metadatas);
    }
    return metadatas;
}
exports.readMetadata = readMetadata;
function readMetadataFile(host, dtsFilePath) {
    const metadataPath = dtsFilePath.replace(util_1.DTS, '.metadata.json');
    if (!host.fileExists(metadataPath)) {
        return undefined;
    }
    try {
        const metadataOrMetadatas = JSON.parse(host.readFile(metadataPath));
        const metadatas = metadataOrMetadatas ?
            (Array.isArray(metadataOrMetadatas) ? metadataOrMetadatas : [metadataOrMetadatas]) :
            [];
        if (metadatas.length) {
            let maxMetadata = metadatas.reduce((p, c) => p.version > c.version ? p : c);
            if (maxMetadata.version < metadata_1.METADATA_VERSION) {
                metadatas.push(upgradeMetadataWithDtsData(host, maxMetadata, dtsFilePath));
            }
        }
        return metadatas;
    }
    catch (e) {
        console.error(`Failed to read JSON file ${metadataPath}`);
        throw e;
    }
}
function upgradeMetadataWithDtsData(host, oldMetadata, dtsFilePath) {
    // patch v1 to v3 by adding exports and the `extends` clause.
    // patch v3 to v4 by adding `interface` symbols for TypeAlias
    let newMetadata = {
        '__symbolic': 'module',
        'version': metadata_1.METADATA_VERSION,
        'metadata': Object.assign({}, oldMetadata.metadata),
    };
    if (oldMetadata.exports) {
        newMetadata.exports = oldMetadata.exports;
    }
    if (oldMetadata.importAs) {
        newMetadata.importAs = oldMetadata.importAs;
    }
    if (oldMetadata.origins) {
        newMetadata.origins = oldMetadata.origins;
    }
    const dtsMetadata = host.getSourceFileMetadata(dtsFilePath);
    if (dtsMetadata) {
        for (let prop in dtsMetadata.metadata) {
            if (!newMetadata.metadata[prop]) {
                newMetadata.metadata[prop] = dtsMetadata.metadata[prop];
            }
        }
        if (dtsMetadata['importAs'])
            newMetadata['importAs'] = dtsMetadata['importAs'];
        // Only copy exports from exports from metadata prior to version 3.
        // Starting with version 3 the collector began collecting exports and
        // this should be redundant. Also, with bundler will rewrite the exports
        // which will hoist the exports from modules referenced indirectly causing
        // the imports to be different than the .d.ts files and using the .d.ts file
        // exports would cause the StaticSymbolResolver to redirect symbols to the
        // incorrect location.
        if ((!oldMetadata.version || oldMetadata.version < 3) && dtsMetadata.exports) {
            newMetadata.exports = dtsMetadata.exports;
        }
    }
    return newMetadata;
}
//# sourceMappingURL=metadata_reader.js.map