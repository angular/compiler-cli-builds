/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
"use strict";
/**
 * Extract i18n messages from source code
 */
// Must be imported first, because angular2 decorators throws on load.
require("reflect-metadata");
const compiler = require("@angular/compiler");
const path = require("path");
const compiler_host_1 = require("./compiler_host");
const path_mapped_compiler_host_1 = require("./path_mapped_compiler_host");
class Extractor {
    constructor(options, ngExtractor, host, ngCompilerHost, program) {
        this.options = options;
        this.ngExtractor = ngExtractor;
        this.host = host;
        this.ngCompilerHost = ngCompilerHost;
        this.program = program;
    }
    extract(formatName) {
        // Checks the format and returns the extension
        const ext = this.getExtension(formatName);
        const promiseBundle = this.extractBundle();
        return promiseBundle.then(bundle => {
            const content = this.serialize(bundle, ext);
            const dstPath = path.join(this.options.genDir, `messages.${ext}`);
            this.host.writeFile(dstPath, content, false);
        });
    }
    extractBundle() {
        const files = this.program.getSourceFiles().map(sf => this.ngCompilerHost.getCanonicalFileName(sf.fileName));
        return this.ngExtractor.extract(files);
    }
    serialize(bundle, ext) {
        let serializer;
        switch (ext) {
            case 'xmb':
                serializer = new compiler.Xmb();
                break;
            case 'xlf':
            default:
                serializer = new compiler.Xliff();
        }
        return bundle.write(serializer);
    }
    getExtension(formatName) {
        const format = (formatName || 'xlf').toLowerCase();
        if (format === 'xmb')
            return 'xmb';
        if (format === 'xlf' || format === 'xlif')
            return 'xlf';
        throw new Error('Unsupported format "${formatName}"');
    }
    static create(options, program, tsCompilerHost, compilerHostContext, ngCompilerHost) {
        if (!ngCompilerHost) {
            const usePathMapping = !!options.rootDirs && options.rootDirs.length > 0;
            const context = compilerHostContext || new compiler_host_1.ModuleResolutionHostAdapter(tsCompilerHost);
            ngCompilerHost = usePathMapping ? new path_mapped_compiler_host_1.PathMappedCompilerHost(program, options, context) :
                new compiler_host_1.CompilerHost(program, options, context);
        }
        const { extractor: ngExtractor } = compiler.Extractor.create(ngCompilerHost);
        return new Extractor(options, ngExtractor, tsCompilerHost, ngCompilerHost, program);
    }
}
exports.Extractor = Extractor;
//# sourceMappingURL=extractor.js.map