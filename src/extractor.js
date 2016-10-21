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
 *
 * TODO(vicb): factorize code with the CodeGenerator
 */
// Must be imported first, because angular2 decorators throws on load.
require('reflect-metadata');
var compiler = require('@angular/compiler');
var core_1 = require('@angular/core');
var reflector_host_1 = require('./reflector_host');
var static_reflection_capabilities_1 = require('./static_reflection_capabilities');
var static_reflector_1 = require('./static_reflector');
var GENERATED_FILES = /\.ngfactory\.ts$|\.css\.ts$|\.css\.shim\.ts$/;
var GENERATED_OR_DTS_FILES = /\.d\.ts$|\.ngfactory\.ts$|\.css\.ts$|\.css\.shim\.ts$/;
var Extractor = (function () {
    function Extractor(options, program, host, staticReflector, messageBundle, reflectorHost, metadataResolver, directiveNormalizer) {
        this.options = options;
        this.program = program;
        this.host = host;
        this.staticReflector = staticReflector;
        this.messageBundle = messageBundle;
        this.reflectorHost = reflectorHost;
        this.metadataResolver = metadataResolver;
        this.directiveNormalizer = directiveNormalizer;
    }
    Extractor.prototype.readFileMetadata = function (absSourcePath) {
        var moduleMetadata = this.staticReflector.getModuleMetadata(absSourcePath);
        var result = { components: [], ngModules: [], fileUrl: absSourcePath };
        if (!moduleMetadata) {
            console.log("WARNING: no metadata found for " + absSourcePath);
            return result;
        }
        var metadata = moduleMetadata['metadata'];
        var symbols = metadata && Object.keys(metadata);
        if (!symbols || !symbols.length) {
            return result;
        }
        var _loop_1 = function(symbol) {
            if (metadata[symbol] && metadata[symbol].__symbolic == 'error') {
                // Ignore symbols that are only included to record error information.
                return "continue";
            }
            var staticType = this_1.reflectorHost.findDeclaration(absSourcePath, symbol, absSourcePath);
            var annotations = this_1.staticReflector.annotations(staticType);
            annotations.forEach(function (annotation) {
                if (annotation instanceof core_1.NgModule) {
                    result.ngModules.push(staticType);
                }
                else if (annotation instanceof core_1.Component) {
                    result.components.push(staticType);
                }
            });
        };
        var this_1 = this;
        for (var _i = 0, symbols_1 = symbols; _i < symbols_1.length; _i++) {
            var symbol = symbols_1[_i];
            _loop_1(symbol);
        }
        return result;
    };
    Extractor.prototype.extract = function () {
        var _this = this;
        var skipFileNames = (this.options.generateCodeForLibraries === false) ?
            GENERATED_OR_DTS_FILES :
            GENERATED_FILES;
        var filePaths = this.program.getSourceFiles().map(function (sf) { return sf.fileName; }).filter(function (f) { return !skipFileNames.test(f); });
        var fileMetas = filePaths.map(function (filePath) { return _this.readFileMetadata(filePath); });
        var ngModules = fileMetas.reduce(function (ngModules, fileMeta) {
            ngModules.push.apply(ngModules, fileMeta.ngModules);
            return ngModules;
        }, []);
        var analyzedNgModules = compiler.analyzeModules(ngModules, this.metadataResolver);
        var errors = [];
        var bundlePromise = Promise
            .all(fileMetas.map(function (fileMeta) {
            var url = fileMeta.fileUrl;
            return Promise.all(fileMeta.components.map(function (compType) {
                var compMeta = _this.metadataResolver.getDirectiveMetadata(compType);
                var ngModule = analyzedNgModules.ngModuleByDirective.get(compType);
                if (!ngModule) {
                    throw new Error("Cannot determine the module for component " + compMeta.type.name + "!");
                }
                return Promise
                    .all([compMeta].concat(ngModule.transitiveModule.directives).map(function (dirMeta) {
                    return _this.directiveNormalizer.normalizeDirective(dirMeta).asyncResult;
                }))
                    .then(function (normalizedCompWithDirectives) {
                    var compMeta = normalizedCompWithDirectives[0];
                    var html = compMeta.template.template;
                    var interpolationConfig = compiler.InterpolationConfig.fromArray(compMeta.template.interpolation);
                    errors.push.apply(errors, _this.messageBundle.updateFromTemplate(html, url, interpolationConfig));
                });
            }));
        }))
            .then(function (_) { return _this.messageBundle; });
        if (errors.length) {
            throw new Error(errors.map(function (e) { return e.toString(); }).join('\n'));
        }
        return bundlePromise;
    };
    Extractor.create = function (options, translationsFormat, program, compilerHost, resourceLoader, reflectorHost) {
        var htmlParser = new compiler.I18NHtmlParser(new compiler.HtmlParser());
        var urlResolver = compiler.createOfflineCompileUrlResolver();
        if (!reflectorHost)
            reflectorHost = new reflector_host_1.ReflectorHost(program, compilerHost, options);
        var staticReflector = new static_reflector_1.StaticReflector(reflectorHost);
        static_reflection_capabilities_1.StaticAndDynamicReflectionCapabilities.install(staticReflector);
        var config = new compiler.CompilerConfig({
            genDebugInfo: options.debug === true,
            defaultEncapsulation: core_1.ViewEncapsulation.Emulated,
            logBindingUpdate: false,
            useJit: false
        });
        var normalizer = new compiler.DirectiveNormalizer(resourceLoader, urlResolver, htmlParser, config);
        var elementSchemaRegistry = new compiler.DomElementSchemaRegistry();
        var resolver = new compiler.CompileMetadataResolver(new compiler.NgModuleResolver(staticReflector), new compiler.DirectiveResolver(staticReflector), new compiler.PipeResolver(staticReflector), elementSchemaRegistry, staticReflector);
        // TODO(vicb): implicit tags & attributes
        var messageBundle = new compiler.MessageBundle(htmlParser, [], {});
        return new Extractor(options, program, compilerHost, staticReflector, messageBundle, reflectorHost, resolver, normalizer);
    };
    return Extractor;
}());
exports.Extractor = Extractor;
//# sourceMappingURL=extractor.js.map