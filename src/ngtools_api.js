/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
"use strict";
/**
 * This is a private API for the ngtools toolkit.
 *
 * This API should be stable for NG 2. It can be removed in NG 4..., but should be replaced by
 * something else.
 */
const compiler_1 = require('@angular/compiler');
const codegen_1 = require('./codegen');
const compiler_host_1 = require('./compiler_host');
const extractor_1 = require('./extractor');
const ngtools_impl_1 = require('./ngtools_impl');
const path_mapped_compiler_host_1 = require('./path_mapped_compiler_host');
/**
 * A ModuleResolutionHostAdapter that overrides the readResource() method with the one
 * passed in the interface.
 */
class CustomLoaderModuleResolutionHostAdapter extends compiler_host_1.ModuleResolutionHostAdapter {
    constructor(_readResource, host) {
        super(host);
        this._readResource = _readResource;
    }
    readResource(path) { return this._readResource(path); }
}
/**
 * @internal
 * @private
 */
class NgTools_InternalApi_NG_2 {
    /**
     * @internal
     * @private
     */
    static codeGen(options) {
        const hostContext = new CustomLoaderModuleResolutionHostAdapter(options.readResource, options.host);
        const cliOptions = {
            i18nFormat: options.i18nFormat,
            i18nFile: options.i18nFile,
            locale: options.locale,
            basePath: options.basePath
        };
        // Create the Code Generator.
        const codeGenerator = codegen_1.CodeGenerator.create(options.angularCompilerOptions, cliOptions, options.program, options.host, hostContext);
        return codeGenerator.codegen();
    }
    /**
     * @internal
     * @private
     */
    static listLazyRoutes(options) {
        const angularCompilerOptions = options.angularCompilerOptions;
        const program = options.program;
        const moduleResolutionHost = new compiler_host_1.ModuleResolutionHostAdapter(options.host);
        const usePathMapping = !!angularCompilerOptions.rootDirs && angularCompilerOptions.rootDirs.length > 0;
        const ngCompilerHost = usePathMapping ?
            new path_mapped_compiler_host_1.PathMappedCompilerHost(program, angularCompilerOptions, moduleResolutionHost) :
            new compiler_host_1.CompilerHost(program, angularCompilerOptions, moduleResolutionHost);
        const symbolCache = new compiler_1.StaticSymbolCache();
        const summaryResolver = new compiler_1.AotSummaryResolver(ngCompilerHost, symbolCache);
        const symbolResolver = new compiler_1.StaticSymbolResolver(ngCompilerHost, symbolCache, summaryResolver);
        const staticReflector = new compiler_1.StaticReflector(symbolResolver);
        const routeMap = ngtools_impl_1.listLazyRoutesOfModule(options.entryModule, ngCompilerHost, staticReflector);
        return Object.keys(routeMap).reduce((acc, route) => {
            acc[route] = routeMap[route].absoluteFilePath;
            return acc;
        }, {});
    }
    /**
     * @internal
     * @private
     */
    static extractI18n(options) {
        const hostContext = new CustomLoaderModuleResolutionHostAdapter(options.readResource, options.host);
        // Create the i18n extractor.
        const extractor = extractor_1.Extractor.create(options.angularCompilerOptions, options.program, options.host, hostContext);
        return extractor.extract(options.i18nFormat);
    }
}
exports.NgTools_InternalApi_NG_2 = NgTools_InternalApi_NG_2;
//# sourceMappingURL=ngtools_api.js.map