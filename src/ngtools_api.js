"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const compiler_host_1 = require("./transformers/compiler_host");
const entry_points_1 = require("./transformers/entry_points");
/**
 * @internal
 * @deprecatd Use ngtools_api2 instead!
 */
class NgTools_InternalApi_NG_2 {
    /**
     * @internal
     */
    static codeGen(options) {
        throw throwNotSupportedError();
    }
    /**
     * @internal
     */
    static listLazyRoutes(options) {
        // TODO(tbosch): Also throwNotSupportedError once Angular CLI 1.5.1 ships,
        // as we only needed this to support Angular CLI 1.5.0 rc.*
        const ngProgram = entry_points_1.createProgram({
            rootNames: options.program.getRootFileNames(),
            options: Object.assign({}, options.angularCompilerOptions, { collectAllErrors: true }),
            host: options.host
        });
        const lazyRoutes = ngProgram.listLazyRoutes(options.entryModule);
        // reset the referencedFiles that the ng.Program added to the SourceFiles
        // as the host might be caching the source files!
        for (const sourceFile of options.program.getSourceFiles()) {
            const originalReferences = compiler_host_1.getOriginalReferences(sourceFile);
            if (originalReferences) {
                sourceFile.referencedFiles = originalReferences;
            }
        }
        const result = {};
        lazyRoutes.forEach(lazyRoute => {
            const route = lazyRoute.route;
            const referencedFilePath = lazyRoute.referencedModule.filePath;
            if (result[route] && result[route] != referencedFilePath) {
                throw new Error(`Duplicated path in loadChildren detected: "${route}" is used in 2 loadChildren, ` +
                    `but they point to different modules "(${result[route]} and ` +
                    `"${referencedFilePath}"). Webpack cannot distinguish on context and would fail to ` +
                    'load the proper one.');
            }
            result[route] = referencedFilePath;
        });
        return result;
    }
    /**
     * @internal
     */
    static extractI18n(options) {
        throw throwNotSupportedError();
    }
}
exports.NgTools_InternalApi_NG_2 = NgTools_InternalApi_NG_2;
function throwNotSupportedError() {
    throw new Error(`Please update @angular/cli. Angular 5+ requires at least Angular CLI 1.5+`);
}
//# sourceMappingURL=ngtools_api.js.map