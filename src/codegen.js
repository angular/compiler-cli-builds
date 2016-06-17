"use strict";
/**
 * Transform template html and css into executable code.
 * Intended to be used in a build step.
 */
var compiler = require('@angular/compiler');
var core_1 = require('@angular/core');
var platform_server_1 = require('@angular/platform-server');
var path = require('path');
var compiler_private_1 = require('./compiler_private');
var reflector_host_1 = require('./reflector_host');
var static_reflection_capabilities_1 = require('./static_reflection_capabilities');
var static_reflector_1 = require('./static_reflector');
var GENERATED_FILES = /\.ngfactory\.ts$|\.css\.ts$|\.css\.shim\.ts$/;
var PREAMBLE = "/**\n * This file is generated by the Angular 2 template compiler.\n * Do not edit.\n */\n /* tslint:disable */\n\n";
var CodeGenerator = (function () {
    function CodeGenerator(options, program, host, staticReflector, resolver, compiler, reflectorHost) {
        this.options = options;
        this.program = program;
        this.host = host;
        this.staticReflector = staticReflector;
        this.resolver = resolver;
        this.compiler = compiler;
        this.reflectorHost = reflectorHost;
        core_1.lockRunMode();
    }
    CodeGenerator.prototype.generateSource = function (metadatas) {
        var _this = this;
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
            .then(function (normalizedCompWithDirectives) {
            return _this.compiler.compileTemplates(normalizedCompWithDirectives);
        });
    };
    CodeGenerator.prototype.readComponents = function (absSourcePath) {
        var result = [];
        var moduleMetadata = this.staticReflector.getModuleMetadata(absSourcePath);
        if (!moduleMetadata) {
            console.log("WARNING: no metadata found for " + absSourcePath);
            return result;
        }
        var metadata = moduleMetadata['metadata'];
        var symbols = metadata && Object.keys(metadata);
        if (!symbols || !symbols.length) {
            return result;
        }
        for (var _i = 0, symbols_1 = symbols; _i < symbols_1.length; _i++) {
            var symbol = symbols_1[_i];
            if (metadata[symbol] && metadata[symbol].__symbolic == 'error') {
                // Ignore symbols that are only included to record error information.
                continue;
            }
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
    // Write codegen in a directory structure matching the sources.
    CodeGenerator.prototype.calculateEmitPath = function (filePath) {
        var root = this.options.basePath;
        for (var _i = 0, _a = this.options.rootDirs || []; _i < _a.length; _i++) {
            var eachRootDir = _a[_i];
            if (this.options.trace) {
                console.log("Check if " + filePath + " is under rootDirs element " + eachRootDir);
            }
            if (path.relative(eachRootDir, filePath).indexOf('.') !== 0) {
                root = eachRootDir;
            }
        }
        return path.join(this.options.genDir, path.relative(root, filePath));
    };
    // TODO(tbosch): add a cache for shared css files
    // TODO(tbosch): detect cycles!
    CodeGenerator.prototype.generateStylesheet = function (filepath, shim) {
        var _this = this;
        return this.compiler.loadAndCompileStylesheet(filepath, shim, '.ts')
            .then(function (sourceWithImports) {
            var emitPath = _this.calculateEmitPath(sourceWithImports.source.moduleUrl);
            // TODO(alexeagle): should include the sourceFile to the WriteFileCallback
            _this.host.writeFile(emitPath, PREAMBLE + sourceWithImports.source.source, false);
            return Promise.all(sourceWithImports.importedUrls.map(function (url) { return _this.generateStylesheet(url, shim); }));
        });
    };
    CodeGenerator.prototype.codegen = function () {
        var _this = this;
        platform_server_1.Parse5DomAdapter.makeCurrent();
        var stylesheetPromises = [];
        var generateOneFile = function (absSourcePath) {
            return Promise.all(_this.readComponents(absSourcePath))
                .then(function (metadatas) {
                if (!metadatas || !metadatas.length) {
                    return;
                }
                metadatas.forEach(function (metadata) {
                    var stylesheetPaths = metadata && metadata.template && metadata.template.styleUrls;
                    if (stylesheetPaths) {
                        stylesheetPaths.forEach(function (path) {
                            stylesheetPromises.push(_this.generateStylesheet(path, metadata.template.encapsulation === core_1.ViewEncapsulation.Emulated));
                        });
                    }
                });
                return _this.generateSource(metadatas);
            })
                .then(function (generated) {
                if (generated) {
                    var sourceFile = _this.program.getSourceFile(absSourcePath);
                    var emitPath = _this.calculateEmitPath(generated.moduleUrl);
                    _this.host.writeFile(emitPath, PREAMBLE + generated.source, false, function () { }, [sourceFile]);
                }
            })
                .catch(function (e) { console.error(e.stack); });
        };
        var compPromises = this.program.getSourceFiles()
            .map(function (sf) { return sf.fileName; })
            .filter(function (f) { return !GENERATED_FILES.test(f); })
            .map(generateOneFile);
        return Promise.all(stylesheetPromises.concat(compPromises));
    };
    CodeGenerator.create = function (options, program, compilerHost, reflectorHostContext) {
        var xhr = { get: function (s) { return Promise.resolve(compilerHost.readFile(s)); } };
        var urlResolver = compiler.createOfflineCompileUrlResolver();
        var reflectorHost = new reflector_host_1.ReflectorHost(program, compilerHost, options, reflectorHostContext);
        var staticReflector = new static_reflector_1.StaticReflector(reflectorHost);
        static_reflection_capabilities_1.StaticAndDynamicReflectionCapabilities.install(staticReflector);
        var htmlParser = new compiler_private_1.HtmlParser();
        var config = new compiler.CompilerConfig({
            genDebugInfo: options.debug === true,
            defaultEncapsulation: core_1.ViewEncapsulation.Emulated,
            logBindingUpdate: false,
            useJit: false,
            platformDirectives: [],
            platformPipes: []
        });
        var normalizer = new compiler_private_1.DirectiveNormalizer(xhr, urlResolver, htmlParser, config);
        var parser = new compiler_private_1.Parser(new compiler_private_1.Lexer());
        var tmplParser = new compiler_private_1.TemplateParser(parser, new compiler_private_1.DomElementSchemaRegistry(), htmlParser, 
        /*console*/ null, []);
        var offlineCompiler = new compiler.OfflineCompiler(normalizer, tmplParser, new compiler_private_1.StyleCompiler(urlResolver), new compiler_private_1.ViewCompiler(config), new compiler_private_1.TypeScriptEmitter(reflectorHost), xhr);
        var resolver = new compiler_private_1.CompileMetadataResolver(new compiler.DirectiveResolver(staticReflector), new compiler.PipeResolver(staticReflector), new compiler.ViewResolver(staticReflector), config, staticReflector);
        return new CodeGenerator(options, program, compilerHost, staticReflector, resolver, offlineCompiler, reflectorHost);
    };
    return CodeGenerator;
}());
exports.CodeGenerator = CodeGenerator;
//# sourceMappingURL=codegen.js.map