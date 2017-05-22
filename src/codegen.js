"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Transform template html and css into executable code.
 * Intended to be used in a build step.
 */
var compiler = require("@angular/compiler");
var core_1 = require("@angular/core");
var fs_1 = require("fs");
var compiler_host_1 = require("./compiler_host");
var path_mapped_compiler_host_1 = require("./path_mapped_compiler_host");
var GENERATED_META_FILES = /\.json$/;
var PREAMBLE = "/**\n * @fileoverview This file is generated by the Angular template compiler.\n * Do not edit.\n * @suppress {suspiciousCode,uselessCode,missingProperties,missingOverride}\n */\n /* tslint:disable */\n\n";
var CodeGenerator = (function () {
    function CodeGenerator(options, program, host, compiler, ngCompilerHost) {
        this.options = options;
        this.program = program;
        this.host = host;
        this.compiler = compiler;
        this.ngCompilerHost = ngCompilerHost;
    }
    CodeGenerator.prototype.codegen = function () {
        var _this = this;
        return this.compiler
            .compileAll(this.program.getSourceFiles().map(function (sf) { return _this.ngCompilerHost.getCanonicalFileName(sf.fileName); }))
            .then(function (generatedModules) {
            generatedModules.forEach(function (generatedModule) {
                var sourceFile = _this.program.getSourceFile(generatedModule.srcFileUrl);
                var emitPath = _this.ngCompilerHost.calculateEmitPath(generatedModule.genFileUrl);
                var source = GENERATED_META_FILES.test(emitPath) ? generatedModule.source :
                    generatedModule.source;
                _this.host.writeFile(emitPath, source, false, function () { }, [sourceFile]);
            });
        });
    };
    CodeGenerator.create = function (options, cliOptions, program, tsCompilerHost, compilerHostContext, ngCompilerHost) {
        if (!ngCompilerHost) {
            var usePathMapping = !!options.rootDirs && options.rootDirs.length > 0;
            var context = compilerHostContext || new compiler_host_1.ModuleResolutionHostAdapter(tsCompilerHost);
            ngCompilerHost = usePathMapping ? new path_mapped_compiler_host_1.PathMappedCompilerHost(program, options, context) :
                new compiler_host_1.CompilerHost(program, options, context);
        }
        var transContent = '';
        if (cliOptions.i18nFile) {
            if (!cliOptions.locale) {
                throw new Error("The translation file (" + cliOptions.i18nFile + ") locale must be provided. Use the --locale option.");
            }
            transContent = fs_1.readFileSync(cliOptions.i18nFile, 'utf8');
        }
        var missingTranslation = core_1.MissingTranslationStrategy.Warning;
        if (cliOptions.missingTranslation) {
            switch (cliOptions.missingTranslation) {
                case 'error':
                    missingTranslation = core_1.MissingTranslationStrategy.Error;
                    break;
                case 'warning':
                    missingTranslation = core_1.MissingTranslationStrategy.Warning;
                    break;
                case 'ignore':
                    missingTranslation = core_1.MissingTranslationStrategy.Ignore;
                    break;
                default:
                    throw new Error("Unknown option for missingTranslation (" + cliOptions.missingTranslation + "). Use either error, warning or ignore.");
            }
        }
        var aotCompiler = compiler.createAotCompiler(ngCompilerHost, {
            translations: transContent,
            i18nFormat: cliOptions.i18nFormat,
            locale: cliOptions.locale, missingTranslation: missingTranslation,
            enableLegacyTemplate: options.enableLegacyTemplate !== false,
            genFilePreamble: PREAMBLE,
        }).compiler;
        return new CodeGenerator(options, program, tsCompilerHost, aotCompiler, ngCompilerHost);
    };
    return CodeGenerator;
}());
exports.CodeGenerator = CodeGenerator;
//# sourceMappingURL=codegen.js.map