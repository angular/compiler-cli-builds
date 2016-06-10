#!/usr/bin/env node
"use strict";
require('reflect-metadata');
var tsc = require('@angular/tsc-wrapped');
var path = require('path');
var compiler = require('@angular/compiler');
var static_reflector_1 = require('./static_reflector');
var compiler_private_1 = require('./compiler_private');
var platform_server_1 = require('@angular/platform-server');
var reflector_host_1 = require('./reflector_host');
var static_reflection_capabilities_1 = require('./static_reflection_capabilities');
function extract(ngOptions, program, host) {
    return Extractor.create(ngOptions, program, host).extract();
}
var GENERATED_FILES = /\.ngfactory\.ts$|\.css\.ts$|\.css\.shim\.ts$/;
var Extractor = (function () {
    function Extractor(options, program, host, staticReflector, resolver, compiler, reflectorHost, _extractor) {
        this.options = options;
        this.program = program;
        this.host = host;
        this.staticReflector = staticReflector;
        this.resolver = resolver;
        this.compiler = compiler;
        this.reflectorHost = reflectorHost;
        this._extractor = _extractor;
    }
    Extractor.prototype.extractCmpMessages = function (metadatas) {
        var _this = this;
        if (!metadatas || !metadatas.length) {
            return null;
        }
        var normalize = function (metadata) {
            var directiveType = metadata.type.runtime;
            var directives = _this.resolver.getViewDirectivesMetadata(directiveType);
            return Promise.all(directives.map(function (d) { return _this.compiler.normalizeDirectiveMetadata(d); }))
                .then(function (normalizedDirectives) {
                var pipes = _this.resolver.getViewPipesMetadata(directiveType);
                return new compiler.NormalizedComponentWithViewDirectives(metadata, normalizedDirectives, pipes);
            });
        };
        return Promise.all(metadatas.map(normalize))
            .then(function (cmps) {
            var messages = [];
            var errors = [];
            cmps.forEach(function (cmp) {
                // TODO(vicb): url
                var result = _this._extractor.extract(cmp.component.template.template, 'url');
                errors = errors.concat(result.errors);
                messages = messages.concat(result.messages);
            });
            // Extraction Result might contain duplicate messages at this point
            return new compiler_private_1.ExtractionResult(messages, errors);
        });
    };
    Extractor.prototype.readComponents = function (absSourcePath) {
        var result = [];
        var metadata = this.staticReflector.getModuleMetadata(absSourcePath);
        if (!metadata) {
            console.log("WARNING: no metadata found for " + absSourcePath);
            return result;
        }
        var symbols = Object.keys(metadata['metadata']);
        if (!symbols || !symbols.length) {
            return result;
        }
        for (var _i = 0, symbols_1 = symbols; _i < symbols_1.length; _i++) {
            var symbol = symbols_1[_i];
            var staticType = this.reflectorHost.findDeclaration(absSourcePath, symbol, absSourcePath);
            var directive = void 0;
            directive = this.resolver.maybeGetDirectiveMetadata(staticType);
            if (!directive || !directive.isComponent) {
                continue;
            }
            result.push(this.compiler.normalizeDirectiveMetadata(directive));
        }
        return result;
    };
    Extractor.prototype.extract = function () {
        var _this = this;
        platform_server_1.Parse5DomAdapter.makeCurrent();
        var promises = this.program.getSourceFiles()
            .map(function (sf) { return sf.fileName; })
            .filter(function (f) { return !GENERATED_FILES.test(f); })
            .map(function (absSourcePath) {
            return Promise.all(_this.readComponents(absSourcePath))
                .then(function (metadatas) { return _this.extractCmpMessages(metadatas); })
                .catch(function (e) { return console.error(e.stack); });
        });
        var messages = [];
        var errors = [];
        return Promise.all(promises).then(function (extractionResults) {
            extractionResults.filter(function (result) { return !!result; }).forEach(function (result) {
                messages = messages.concat(result.messages);
                errors = errors.concat(result.errors);
            });
            if (errors.length) {
                throw errors;
            }
            messages = compiler_private_1.removeDuplicates(messages);
            var genPath = path.join(_this.options.genDir, 'messages.xmb');
            var msgBundle = compiler_private_1.serializeXmb(messages);
            _this.host.writeFile(genPath, msgBundle, false);
        });
    };
    Extractor.create = function (options, program, compilerHost) {
        var xhr = { get: function (s) { return Promise.resolve(compilerHost.readFile(s)); } };
        var urlResolver = compiler.createOfflineCompileUrlResolver();
        var reflectorHost = new reflector_host_1.ReflectorHost(program, compilerHost, options);
        var staticReflector = new static_reflector_1.StaticReflector(reflectorHost);
        static_reflection_capabilities_1.StaticAndDynamicReflectionCapabilities.install(staticReflector);
        var htmlParser = new compiler_private_1.HtmlParser();
        var config = new compiler.CompilerConfig(true, true, true);
        var normalizer = new compiler_private_1.DirectiveNormalizer(xhr, urlResolver, htmlParser, config);
        var parser = new compiler_private_1.Parser(new compiler_private_1.Lexer());
        var tmplParser = new compiler_private_1.TemplateParser(parser, new compiler_private_1.DomElementSchemaRegistry(), htmlParser, 
        /*console*/ null, []);
        var offlineCompiler = new compiler.OfflineCompiler(normalizer, tmplParser, new compiler_private_1.StyleCompiler(urlResolver), new compiler_private_1.ViewCompiler(config), new compiler_private_1.TypeScriptEmitter(reflectorHost), xhr);
        var resolver = new compiler_private_1.CompileMetadataResolver(new compiler.DirectiveResolver(staticReflector), new compiler.PipeResolver(staticReflector), new compiler.ViewResolver(staticReflector), null, null, staticReflector);
        // TODO(vicb): handle implicit
        var extractor = new compiler_private_1.MessageExtractor(htmlParser, parser, [], {});
        return new Extractor(options, program, compilerHost, staticReflector, resolver, offlineCompiler, reflectorHost, extractor);
    };
    return Extractor;
}());
// Entry point
if (require.main === module) {
    var args = require('minimist')(process.argv.slice(2));
    tsc.main(args.p || args.project || '.', args.basePath, extract)
        .then(function (exitCode) { return process.exit(exitCode); })
        .catch(function (e) {
        console.error(e.stack);
        console.error('Compilation failed');
        process.exit(1);
    });
}
//# sourceMappingURL=extract_i18n.js.map