/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/context", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/diagnostics", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/dom", "@angular/compiler-cli/src/ngtsc/typecheck/src/environment", "@angular/compiler-cli/src/ngtsc/typecheck/src/oob", "@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeCheckContextImpl = exports.InliningMode = void 0;
    var tslib_1 = require("tslib");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/diagnostics");
    var dom_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/dom");
    var environment_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/environment");
    var oob_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/oob");
    var tcb_util_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util");
    var type_check_block_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block");
    var type_check_file_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file");
    var type_constructor_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor");
    /**
     * How a type-checking context should handle operations which would require inlining.
     */
    var InliningMode;
    (function (InliningMode) {
        /**
         * Use inlining operations when required.
         */
        InliningMode[InliningMode["InlineOps"] = 0] = "InlineOps";
        /**
         * Produce diagnostics if an operation would require inlining.
         */
        InliningMode[InliningMode["Error"] = 1] = "Error";
    })(InliningMode = exports.InliningMode || (exports.InliningMode = {}));
    /**
     * A template type checking context for a program.
     *
     * The `TypeCheckContext` allows registration of components and their templates which need to be
     * type checked.
     */
    var TypeCheckContextImpl = /** @class */ (function () {
        function TypeCheckContextImpl(config, compilerHost, componentMappingStrategy, refEmitter, reflector, host, inlining, perf) {
            this.config = config;
            this.compilerHost = compilerHost;
            this.componentMappingStrategy = componentMappingStrategy;
            this.refEmitter = refEmitter;
            this.reflector = reflector;
            this.host = host;
            this.inlining = inlining;
            this.perf = perf;
            this.fileMap = new Map();
            /**
             * A `Map` of `ts.SourceFile`s that the context has seen to the operations (additions of methods
             * or type-check blocks) that need to be eventually performed on that file.
             */
            this.opMap = new Map();
            /**
             * Tracks when an a particular class has a pending type constructor patching operation already
             * queued.
             */
            this.typeCtorPending = new Set();
            if (inlining === InliningMode.Error && config.useInlineTypeConstructors) {
                // We cannot use inlining for type checking since this environment does not support it.
                throw new Error("AssertionError: invalid inlining configuration.");
            }
        }
        /**
         * Register a template to potentially be type-checked.
         *
         * Implements `TypeCheckContext.addTemplate`.
         */
        TypeCheckContextImpl.prototype.addTemplate = function (ref, binder, template, pipes, schemas, sourceMapping, file, parseErrors) {
            var e_1, _a;
            if (!this.host.shouldCheckComponent(ref.node)) {
                return;
            }
            var fileData = this.dataForFile(ref.node.getSourceFile());
            var shimData = this.pendingShimForComponent(ref.node);
            var templateId = fileData.sourceManager.getTemplateId(ref.node);
            var templateDiagnostics = [];
            if (parseErrors !== null) {
                templateDiagnostics.push.apply(templateDiagnostics, tslib_1.__spreadArray([], tslib_1.__read(this.getTemplateDiagnostics(parseErrors, templateId, sourceMapping))));
            }
            var boundTarget = binder.bind({ template: template });
            if (this.inlining === InliningMode.InlineOps) {
                try {
                    // Get all of the directives used in the template and record inline type constructors when
                    // required.
                    for (var _b = tslib_1.__values(boundTarget.getUsedDirectives()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var dir = _c.value;
                        var dirRef = dir.ref;
                        var dirNode = dirRef.node;
                        if (!dir.isGeneric || !type_constructor_1.requiresInlineTypeCtor(dirNode, this.reflector)) {
                            // inlining not required
                            continue;
                        }
                        // Add an inline type constructor operation for the directive.
                        this.addInlineTypeCtor(fileData, dirNode.getSourceFile(), dirRef, {
                            fnName: 'ngTypeCtor',
                            // The constructor should have a body if the directive comes from a .ts file, but not if
                            // it comes from a .d.ts file. .d.ts declarations don't have bodies.
                            body: !dirNode.getSourceFile().isDeclarationFile,
                            fields: {
                                inputs: dir.inputs.classPropertyNames,
                                outputs: dir.outputs.classPropertyNames,
                                // TODO(alxhub): support queries
                                queries: dir.queries,
                            },
                            coercedInputFields: dir.coercedInputFields,
                        });
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            shimData.templates.set(templateId, {
                template: template,
                boundTarget: boundTarget,
                templateDiagnostics: templateDiagnostics,
            });
            var tcbRequiresInline = tcb_util_1.requiresInlineTypeCheckBlock(ref.node, pipes);
            // If inlining is not supported, but is required for either the TCB or one of its directive
            // dependencies, then exit here with an error.
            if (this.inlining === InliningMode.Error && tcbRequiresInline) {
                // This template cannot be supported because the underlying strategy does not support inlining
                // and inlining would be required.
                // Record diagnostics to indicate the issues with this template.
                shimData.oobRecorder.requiresInlineTcb(templateId, ref.node);
                // Checking this template would be unsupported, so don't try.
                this.perf.eventCount(perf_1.PerfEvent.SkipGenerateTcbNoInline);
                return;
            }
            var meta = {
                id: fileData.sourceManager.captureSource(ref.node, sourceMapping, file),
                boundTarget: boundTarget,
                pipes: pipes,
                schemas: schemas,
            };
            this.perf.eventCount(perf_1.PerfEvent.GenerateTcb);
            if (tcbRequiresInline) {
                // This class didn't meet the requirements for external type checking, so generate an inline
                // TCB for the class.
                this.addInlineTypeCheckBlock(fileData, shimData, ref, meta);
            }
            else {
                // The class can be type-checked externally as normal.
                shimData.file.addTypeCheckBlock(ref, meta, shimData.domSchemaChecker, shimData.oobRecorder);
            }
        };
        /**
         * Record a type constructor for the given `node` with the given `ctorMetadata`.
         */
        TypeCheckContextImpl.prototype.addInlineTypeCtor = function (fileData, sf, ref, ctorMeta) {
            if (this.typeCtorPending.has(ref.node)) {
                return;
            }
            this.typeCtorPending.add(ref.node);
            // Lazily construct the operation map.
            if (!this.opMap.has(sf)) {
                this.opMap.set(sf, []);
            }
            var ops = this.opMap.get(sf);
            // Push a `TypeCtorOp` into the operation queue for the source file.
            ops.push(new TypeCtorOp(ref, ctorMeta));
            fileData.hasInlines = true;
        };
        /**
         * Transform a `ts.SourceFile` into a version that includes type checking code.
         *
         * If this particular `ts.SourceFile` requires changes, the text representing its new contents
         * will be returned. Otherwise, a `null` return indicates no changes were necessary.
         */
        TypeCheckContextImpl.prototype.transform = function (sf) {
            var _this = this;
            // If there are no operations pending for this particular file, return `null` to indicate no
            // changes.
            if (!this.opMap.has(sf)) {
                return null;
            }
            // Imports may need to be added to the file to support type-checking of directives used in the
            // template within it.
            var importManager = new translator_1.ImportManager(new imports_1.NoopImportRewriter(), '_i');
            // Each Op has a splitPoint index into the text where it needs to be inserted. Split the
            // original source text into chunks at these split points, where code will be inserted between
            // the chunks.
            var ops = this.opMap.get(sf).sort(orderOps);
            var textParts = splitStringAtPoints(sf.text, ops.map(function (op) { return op.splitPoint; }));
            // Use a `ts.Printer` to generate source code.
            var printer = ts.createPrinter({ omitTrailingSemicolon: true });
            // Begin with the intial section of the code text.
            var code = textParts[0];
            // Process each operation and use the printer to generate source code for it, inserting it into
            // the source code in between the original chunks.
            ops.forEach(function (op, idx) {
                var text = op.execute(importManager, sf, _this.refEmitter, printer);
                code += '\n\n' + text + textParts[idx + 1];
            });
            // Write out the imports that need to be added to the beginning of the file.
            var imports = importManager.getAllImports(sf.fileName)
                .map(function (i) { return "import * as " + i.qualifier.text + " from '" + i.specifier + "';"; })
                .join('\n');
            code = imports + '\n' + code;
            return code;
        };
        TypeCheckContextImpl.prototype.finalize = function () {
            var e_2, _a, e_3, _b, e_4, _c;
            // First, build the map of updates to source files.
            var updates = new Map();
            try {
                for (var _d = tslib_1.__values(this.opMap.keys()), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var originalSf = _e.value;
                    var newText = this.transform(originalSf);
                    if (newText !== null) {
                        updates.set(file_system_1.absoluteFromSourceFile(originalSf), newText);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                // Then go through each input file that has pending code generation operations.
                for (var _f = tslib_1.__values(this.fileMap), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var _h = tslib_1.__read(_g.value, 2), sfPath = _h[0], pendingFileData = _h[1];
                    try {
                        // For each input file, consider generation operations for each of its shims.
                        for (var _j = (e_4 = void 0, tslib_1.__values(pendingFileData.shimData.values())), _k = _j.next(); !_k.done; _k = _j.next()) {
                            var pendingShimData = _k.value;
                            this.host.recordShimData(sfPath, {
                                genesisDiagnostics: tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(pendingShimData.domSchemaChecker.diagnostics)), tslib_1.__read(pendingShimData.oobRecorder.diagnostics)),
                                hasInlines: pendingFileData.hasInlines,
                                path: pendingShimData.file.fileName,
                                templates: pendingShimData.templates,
                            });
                            updates.set(pendingShimData.file.fileName, pendingShimData.file.render(false /* removeComments */));
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return updates;
        };
        TypeCheckContextImpl.prototype.addInlineTypeCheckBlock = function (fileData, shimData, ref, tcbMeta) {
            var sf = ref.node.getSourceFile();
            if (!this.opMap.has(sf)) {
                this.opMap.set(sf, []);
            }
            var ops = this.opMap.get(sf);
            ops.push(new TcbOp(ref, tcbMeta, this.config, this.reflector, shimData.domSchemaChecker, shimData.oobRecorder));
            fileData.hasInlines = true;
        };
        TypeCheckContextImpl.prototype.pendingShimForComponent = function (node) {
            var fileData = this.dataForFile(node.getSourceFile());
            var shimPath = this.componentMappingStrategy.shimPathForComponent(node);
            if (!fileData.shimData.has(shimPath)) {
                fileData.shimData.set(shimPath, {
                    domSchemaChecker: new dom_1.RegistryDomSchemaChecker(fileData.sourceManager),
                    oobRecorder: new oob_1.OutOfBandDiagnosticRecorderImpl(fileData.sourceManager),
                    file: new type_check_file_1.TypeCheckFile(shimPath, this.config, this.refEmitter, this.reflector, this.compilerHost),
                    templates: new Map(),
                });
            }
            return fileData.shimData.get(shimPath);
        };
        TypeCheckContextImpl.prototype.dataForFile = function (sf) {
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            if (!this.fileMap.has(sfPath)) {
                var data = {
                    hasInlines: false,
                    sourceManager: this.host.getSourceManager(sfPath),
                    shimData: new Map(),
                };
                this.fileMap.set(sfPath, data);
            }
            return this.fileMap.get(sfPath);
        };
        TypeCheckContextImpl.prototype.getTemplateDiagnostics = function (parseErrors, templateId, sourceMapping) {
            return parseErrors.map(function (error) {
                var span = error.span;
                if (span.start.offset === span.end.offset) {
                    // Template errors can contain zero-length spans, if the error occurs at a single point.
                    // However, TypeScript does not handle displaying a zero-length diagnostic very well, so
                    // increase the ending offset by 1 for such errors, to ensure the position is shown in the
                    // diagnostic.
                    span.end.offset++;
                }
                return diagnostics_2.makeTemplateDiagnostic(templateId, sourceMapping, span, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.TEMPLATE_PARSE_ERROR), error.msg);
            });
        };
        return TypeCheckContextImpl;
    }());
    exports.TypeCheckContextImpl = TypeCheckContextImpl;
    /**
     * A type check block operation which produces type check code for a particular component.
     */
    var TcbOp = /** @class */ (function () {
        function TcbOp(ref, meta, config, reflector, domSchemaChecker, oobRecorder) {
            this.ref = ref;
            this.meta = meta;
            this.config = config;
            this.reflector = reflector;
            this.domSchemaChecker = domSchemaChecker;
            this.oobRecorder = oobRecorder;
        }
        Object.defineProperty(TcbOp.prototype, "splitPoint", {
            /**
             * Type check blocks are inserted immediately after the end of the component class.
             */
            get: function () {
                return this.ref.node.end + 1;
            },
            enumerable: false,
            configurable: true
        });
        TcbOp.prototype.execute = function (im, sf, refEmitter, printer) {
            var env = new environment_1.Environment(this.config, im, refEmitter, this.reflector, sf);
            var fnName = ts.createIdentifier("_tcb_" + this.ref.node.pos);
            var fn = type_check_block_1.generateTypeCheckBlock(env, this.ref, fnName, this.meta, this.domSchemaChecker, this.oobRecorder);
            return printer.printNode(ts.EmitHint.Unspecified, fn, sf);
        };
        return TcbOp;
    }());
    /**
     * A type constructor operation which produces type constructor code for a particular directive.
     */
    var TypeCtorOp = /** @class */ (function () {
        function TypeCtorOp(ref, meta) {
            this.ref = ref;
            this.meta = meta;
        }
        Object.defineProperty(TypeCtorOp.prototype, "splitPoint", {
            /**
             * Type constructor operations are inserted immediately before the end of the directive class.
             */
            get: function () {
                return this.ref.node.end - 1;
            },
            enumerable: false,
            configurable: true
        });
        TypeCtorOp.prototype.execute = function (im, sf, refEmitter, printer) {
            var tcb = type_constructor_1.generateInlineTypeCtor(this.ref.node, this.meta);
            return printer.printNode(ts.EmitHint.Unspecified, tcb, sf);
        };
        return TypeCtorOp;
    }());
    /**
     * Compare two operations and return their split point ordering.
     */
    function orderOps(op1, op2) {
        return op1.splitPoint - op2.splitPoint;
    }
    /**
     * Split a string into chunks at any number of split points.
     */
    function splitStringAtPoints(str, points) {
        var splits = [];
        var start = 0;
        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            splits.push(str.substring(start, point));
            start = point;
        }
        splits.push(str.substring(start));
        return splits;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwyRUFBbUY7SUFDbkYsK0JBQWlDO0lBRWpDLDJFQUF5RTtJQUN6RSxtRUFBOEU7SUFDOUUsNkRBQW1EO0lBRW5ELHlFQUErQztJQUUvQyxxRkFBMEU7SUFFMUUseUVBQWlFO0lBQ2pFLHlGQUEwQztJQUMxQyx5RUFBbUY7SUFFbkYsbUZBQXdEO0lBQ3hELG1HQUEwRDtJQUMxRCxpR0FBZ0Q7SUFDaEQsbUdBQWtGO0lBOEhsRjs7T0FFRztJQUNILElBQVksWUFVWDtJQVZELFdBQVksWUFBWTtRQUN0Qjs7V0FFRztRQUNILHlEQUFTLENBQUE7UUFFVDs7V0FFRztRQUNILGlEQUFLLENBQUE7SUFDUCxDQUFDLEVBVlcsWUFBWSxHQUFaLG9CQUFZLEtBQVosb0JBQVksUUFVdkI7SUFFRDs7Ozs7T0FLRztJQUNIO1FBR0UsOEJBQ1ksTUFBMEIsRUFDMUIsWUFBMkQsRUFDM0Qsd0JBQXdELEVBQ3hELFVBQTRCLEVBQVUsU0FBeUIsRUFDL0QsSUFBc0IsRUFBVSxRQUFzQixFQUFVLElBQWtCO1lBSmxGLFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQzFCLGlCQUFZLEdBQVosWUFBWSxDQUErQztZQUMzRCw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQWdDO1lBQ3hELGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDL0QsU0FBSSxHQUFKLElBQUksQ0FBa0I7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFjO1lBQVUsU0FBSSxHQUFKLElBQUksQ0FBYztZQVB0RixZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQStDLENBQUM7WUFj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QUQsQ0FBQyxBQWpCRCxJQWlCQztJQUVEOztPQUVHO0lBQ0gsU0FBUyxRQUFRLENBQUMsR0FBTyxFQUFFLEdBQU87UUFDaEMsT0FBTyxHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUyxtQkFBbUIsQ0FBQyxHQUFXLEVBQUUsTUFBZ0I7UUFDeEQsSUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBQzVCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3RDLElBQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDekMsS0FBSyxHQUFHLEtBQUssQ0FBQztTQUNmO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0JvdW5kVGFyZ2V0LCBQYXJzZUVycm9yLCBQYXJzZVNvdXJjZUZpbGUsIFIzVGFyZ2V0QmluZGVyLCBTY2hlbWFNZXRhZGF0YSwgVGVtcGxhdGVQYXJzZUVycm9yLCBUbXBsQXN0Tm9kZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge05vb3BJbXBvcnRSZXdyaXRlciwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7UGVyZkV2ZW50LCBQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtDb21wb25lbnRUb1NoaW1NYXBwaW5nU3RyYXRlZ3ksIFRlbXBsYXRlSWQsIFRlbXBsYXRlU291cmNlTWFwcGluZywgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIFR5cGVDaGVja0NvbnRleHQsIFR5cGVDaGVja2luZ0NvbmZpZywgVHlwZUN0b3JNZXRhZGF0YX0gZnJvbSAnLi4vYXBpJztcbmltcG9ydCB7bWFrZVRlbXBsYXRlRGlhZ25vc3RpYywgVGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuLi9kaWFnbm9zdGljcyc7XG5cbmltcG9ydCB7RG9tU2NoZW1hQ2hlY2tlciwgUmVnaXN0cnlEb21TY2hlbWFDaGVja2VyfSBmcm9tICcuL2RvbSc7XG5pbXBvcnQge0Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7T3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyLCBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXJJbXBsfSBmcm9tICcuL29vYic7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFuYWdlcn0gZnJvbSAnLi9zb3VyY2UnO1xuaW1wb3J0IHtyZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrfSBmcm9tICcuL3RjYl91dGlsJztcbmltcG9ydCB7Z2VuZXJhdGVUeXBlQ2hlY2tCbG9ja30gZnJvbSAnLi90eXBlX2NoZWNrX2Jsb2NrJztcbmltcG9ydCB7VHlwZUNoZWNrRmlsZX0gZnJvbSAnLi90eXBlX2NoZWNrX2ZpbGUnO1xuaW1wb3J0IHtnZW5lcmF0ZUlubGluZVR5cGVDdG9yLCByZXF1aXJlc0lubGluZVR5cGVDdG9yfSBmcm9tICcuL3R5cGVfY29uc3RydWN0b3InO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNoaW1UeXBlQ2hlY2tpbmdEYXRhIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIHNoaW0gZmlsZS5cbiAgICovXG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuXG4gIC8qKlxuICAgKiBBbnkgYHRzLkRpYWdub3N0aWNgcyB3aGljaCB3ZXJlIHByb2R1Y2VkIGR1cmluZyB0aGUgZ2VuZXJhdGlvbiBvZiB0aGlzIHNoaW0uXG4gICAqXG4gICAqIFNvbWUgZGlhZ25vc3RpY3MgYXJlIHByb2R1Y2VkIGR1cmluZyBjcmVhdGlvbiB0aW1lIGFuZCBhcmUgdHJhY2tlZCBoZXJlLlxuICAgKi9cbiAgZ2VuZXNpc0RpYWdub3N0aWNzOiBUZW1wbGF0ZURpYWdub3N0aWNbXTtcblxuICAvKipcbiAgICogV2hldGhlciBhbnkgaW5saW5lIG9wZXJhdGlvbnMgZm9yIHRoZSBpbnB1dCBmaWxlIHdlcmUgcmVxdWlyZWQgdG8gZ2VuZXJhdGUgdGhpcyBzaGltLlxuICAgKi9cbiAgaGFzSW5saW5lczogYm9vbGVhbjtcblxuICAvKipcbiAgICogTWFwIG9mIGBUZW1wbGF0ZUlkYCB0byBpbmZvcm1hdGlvbiBjb2xsZWN0ZWQgYWJvdXQgdGhlIHRlbXBsYXRlIGR1cmluZyB0aGUgdGVtcGxhdGVcbiAgICogdHlwZS1jaGVja2luZyBwcm9jZXNzLlxuICAgKi9cbiAgdGVtcGxhdGVzOiBNYXA8VGVtcGxhdGVJZCwgVGVtcGxhdGVEYXRhPjtcbn1cblxuLyoqXG4gKiBEYXRhIHRyYWNrZWQgZm9yIGVhY2ggdGVtcGxhdGUgcHJvY2Vzc2VkIGJ5IHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHN5c3RlbS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZURhdGEge1xuICAvKipcbiAgICogVGVtcGxhdGUgbm9kZXMgZm9yIHdoaWNoIHRoZSBUQ0Igd2FzIGdlbmVyYXRlZC5cbiAgICovXG4gIHRlbXBsYXRlOiBUbXBsQXN0Tm9kZVtdO1xuXG4gIC8qKlxuICAgKiBgQm91bmRUYXJnZXRgIHdoaWNoIHdhcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSBUQ0IsIGFuZCBjb250YWlucyBiaW5kaW5ncyBmb3IgdGhlIGFzc29jaWF0ZWRcbiAgICogdGVtcGxhdGUgbm9kZXMuXG4gICAqL1xuICBib3VuZFRhcmdldDogQm91bmRUYXJnZXQ8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+O1xuXG4gIC8qKlxuICAgKiBFcnJvcnMgZm91bmQgd2hpbGUgcGFyc2luZyB0aGVtIHRlbXBsYXRlLCB3aGljaCBoYXZlIGJlZW4gY29udmVydGVkIHRvIGRpYWdub3N0aWNzLlxuICAgKi9cbiAgdGVtcGxhdGVEaWFnbm9zdGljczogVGVtcGxhdGVEaWFnbm9zdGljW107XG59XG5cbi8qKlxuICogRGF0YSBmb3IgYW4gaW5wdXQgZmlsZSB3aGljaCBpcyBzdGlsbCBpbiB0aGUgcHJvY2VzcyBvZiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGNvZGUgZ2VuZXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEge1xuICAvKipcbiAgICogV2hldGhlciBhbnkgaW5saW5lIGNvZGUgaGFzIGJlZW4gcmVxdWlyZWQgYnkgdGhlIHNoaW0geWV0LlxuICAgKi9cbiAgaGFzSW5saW5lczogYm9vbGVhbjtcblxuICAvKipcbiAgICogU291cmNlIG1hcHBpbmcgaW5mb3JtYXRpb24gZm9yIG1hcHBpbmcgZGlhZ25vc3RpY3MgZnJvbSBpbmxpbmVkIHR5cGUgY2hlY2sgYmxvY2tzIGJhY2sgdG8gdGhlXG4gICAqIG9yaWdpbmFsIHRlbXBsYXRlLlxuICAgKi9cbiAgc291cmNlTWFuYWdlcjogVGVtcGxhdGVTb3VyY2VNYW5hZ2VyO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgaW4tcHJvZ3Jlc3Mgc2hpbSBkYXRhIGZvciBzaGltcyBnZW5lcmF0ZWQgZnJvbSB0aGlzIGlucHV0IGZpbGUuXG4gICAqL1xuICBzaGltRGF0YTogTWFwPEFic29sdXRlRnNQYXRoLCBQZW5kaW5nU2hpbURhdGE+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBlbmRpbmdTaGltRGF0YSB7XG4gIC8qKlxuICAgKiBSZWNvcmRlciBmb3Igb3V0LW9mLWJhbmQgZGlhZ25vc3RpY3Mgd2hpY2ggYXJlIHJhaXNlZCBkdXJpbmcgZ2VuZXJhdGlvbi5cbiAgICovXG4gIG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAgaW4gdXNlIGZvciB0aGlzIHRlbXBsYXRlLCB3aGljaCByZWNvcmRzIGFueSBzY2hlbWEtcmVsYXRlZCBkaWFnbm9zdGljcy5cbiAgICovXG4gIGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXI7XG5cbiAgLyoqXG4gICAqIFNoaW0gZmlsZSBpbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBnZW5lcmF0ZWQuXG4gICAqL1xuICBmaWxlOiBUeXBlQ2hlY2tGaWxlO1xuXG5cbiAgLyoqXG4gICAqIE1hcCBvZiBgVGVtcGxhdGVJZGAgdG8gaW5mb3JtYXRpb24gY29sbGVjdGVkIGFib3V0IHRoZSB0ZW1wbGF0ZSBhcyBpdCdzIGluZ2VzdGVkLlxuICAgKi9cbiAgdGVtcGxhdGVzOiBNYXA8VGVtcGxhdGVJZCwgVGVtcGxhdGVEYXRhPjtcbn1cblxuLyoqXG4gKiBBZGFwdHMgdGhlIGBUeXBlQ2hlY2tDb250ZXh0SW1wbGAgdG8gdGhlIGxhcmdlciB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHN5c3RlbS5cbiAqXG4gKiBUaHJvdWdoIHRoaXMgaW50ZXJmYWNlLCBhIHNpbmdsZSBgVHlwZUNoZWNrQ29udGV4dEltcGxgICh3aGljaCByZXByZXNlbnRzIG9uZSBcInBhc3NcIiBvZiB0ZW1wbGF0ZVxuICogdHlwZS1jaGVja2luZykgcmVxdWVzdHMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGxhcmdlciBzdGF0ZSBvZiB0eXBlLWNoZWNraW5nLCBhcyB3ZWxsIGFzIHJlcG9ydHNcbiAqIGJhY2sgaXRzIHJlc3VsdHMgb25jZSBmaW5hbGl6ZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZUNoZWNraW5nSG9zdCB7XG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgYFRlbXBsYXRlU291cmNlTWFuYWdlcmAgcmVzcG9uc2libGUgZm9yIGNvbXBvbmVudHMgaW4gdGhlIGdpdmVuIGlucHV0IGZpbGUgcGF0aC5cbiAgICovXG4gIGdldFNvdXJjZU1hbmFnZXIoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFRlbXBsYXRlU291cmNlTWFuYWdlcjtcblxuICAvKipcbiAgICogV2hldGhlciBhIHBhcnRpY3VsYXIgY29tcG9uZW50IGNsYXNzIHNob3VsZCBiZSBpbmNsdWRlZCBpbiB0aGUgY3VycmVudCB0eXBlLWNoZWNraW5nIHBhc3MuXG4gICAqXG4gICAqIE5vdCBhbGwgY29tcG9uZW50cyBvZmZlcmVkIHRvIHRoZSBgVHlwZUNoZWNrQ29udGV4dGAgZm9yIGNoZWNraW5nIG1heSByZXF1aXJlIHByb2Nlc3NpbmcuIEZvclxuICAgKiBleGFtcGxlLCB0aGUgY29tcG9uZW50IG1heSBoYXZlIHJlc3VsdHMgYWxyZWFkeSBhdmFpbGFibGUgZnJvbSBhIHByaW9yIHBhc3Mgb3IgZnJvbSBhIHByZXZpb3VzXG4gICAqIHByb2dyYW0uXG4gICAqL1xuICBzaG91bGRDaGVja0NvbXBvbmVudChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbjtcblxuICAvKipcbiAgICogUmVwb3J0IGRhdGEgZnJvbSBhIHNoaW0gZ2VuZXJhdGVkIGZyb20gdGhlIGdpdmVuIGlucHV0IGZpbGUgcGF0aC5cbiAgICovXG4gIHJlY29yZFNoaW1EYXRhKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIGRhdGE6IFNoaW1UeXBlQ2hlY2tpbmdEYXRhKTogdm9pZDtcblxuICAvKipcbiAgICogUmVjb3JkIHRoYXQgYWxsIG9mIHRoZSBjb21wb25lbnRzIHdpdGhpbiB0aGUgZ2l2ZW4gaW5wdXQgZmlsZSBwYXRoIGhhZCBjb2RlIGdlbmVyYXRlZCAtIHRoYXRcbiAgICogaXMsIGNvdmVyYWdlIGZvciB0aGUgZmlsZSBjYW4gYmUgY29uc2lkZXJlZCBjb21wbGV0ZS5cbiAgICovXG4gIHJlY29yZENvbXBsZXRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkO1xufVxuXG4vKipcbiAqIEhvdyBhIHR5cGUtY2hlY2tpbmcgY29udGV4dCBzaG91bGQgaGFuZGxlIG9wZXJhdGlvbnMgd2hpY2ggd291bGQgcmVxdWlyZSBpbmxpbmluZy5cbiAqL1xuZXhwb3J0IGVudW0gSW5saW5pbmdNb2RlIHtcbiAgLyoqXG4gICAqIFVzZSBpbmxpbmluZyBvcGVyYXRpb25zIHdoZW4gcmVxdWlyZWQuXG4gICAqL1xuICBJbmxpbmVPcHMsXG5cbiAgLyoqXG4gICAqIFByb2R1Y2UgZGlhZ25vc3RpY3MgaWYgYW4gb3BlcmF0aW9uIHdvdWxkIHJlcXVpcmUgaW5saW5pbmcuXG4gICAqL1xuICBFcnJvcixcbn1cblxuLyoqXG4gKiBBIHRlbXBsYXRlIHR5cGUgY2hlY2tpbmcgY29udGV4dCBmb3IgYSBwcm9ncmFtLlxuICpcbiAqIFRoZSBgVHlwZUNoZWNrQ29udGV4dGAgYWxsb3dzIHJlZ2lzdHJhdGlvbiBvZiBjb21wb25lbnRzIGFuZCB0aGVpciB0ZW1wbGF0ZXMgd2hpY2ggbmVlZCB0byBiZVxuICogdHlwZSBjaGVja2VkLlxuICovXG5leHBvcnQgY2xhc3MgVHlwZUNoZWNrQ29udGV4dEltcGwgaW1wbGVtZW50cyBUeXBlQ2hlY2tDb250ZXh0IHtcbiAgcHJpdmF0ZSBmaWxlTWFwID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZyxcbiAgICAgIHByaXZhdGUgY29tcGlsZXJIb3N0OiBQaWNrPHRzLkNvbXBpbGVySG9zdCwgJ2dldENhbm9uaWNhbEZpbGVOYW1lJz4sXG4gICAgICBwcml2YXRlIGNvbXBvbmVudE1hcHBpbmdTdHJhdGVneTogQ29tcG9uZW50VG9TaGltTWFwcGluZ1N0cmF0ZWd5LFxuICAgICAgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIGhvc3Q6IFR5cGVDaGVja2luZ0hvc3QsIHByaXZhdGUgaW5saW5pbmc6IElubGluaW5nTW9kZSwgcHJpdmF0ZSBwZXJmOiBQZXJmUmVjb3JkZXIpIHtcbiAgICBpZiAoaW5saW5pbmcgPT09IElubGluaW5nTW9kZS5FcnJvciAmJiBjb25maWcudXNlSW5saW5lVHlwZUNvbnN0cnVjdG9ycykge1xuICAgICAgLy8gV2UgY2Fubm90IHVzZSBpbmxpbmluZyBmb3IgdHlwZSBjaGVja2luZyBzaW5jZSB0aGlzIGVudmlyb25tZW50IGRvZXMgbm90IHN1cHBvcnQgaXQuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbkVycm9yOiBpbnZhbGlkIGlubGluaW5nIGNvbmZpZ3VyYXRpb24uYCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEEgYE1hcGAgb2YgYHRzLlNvdXJjZUZpbGVgcyB0aGF0IHRoZSBjb250ZXh0IGhhcyBzZWVuIHRvIHRoZSBvcGVyYXRpb25zIChhZGRpdGlvbnMgb2YgbWV0aG9kc1xuICAgKiBvciB0eXBlLWNoZWNrIGJsb2NrcykgdGhhdCBuZWVkIHRvIGJlIGV2ZW50dWFsbHkgcGVyZm9ybWVkIG9uIHRoYXQgZmlsZS5cbiAgICovXG4gIHByaXZhdGUgb3BNYXAgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIE9wW10+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyB3aGVuIGFuIGEgcGFydGljdWxhciBjbGFzcyBoYXMgYSBwZW5kaW5nIHR5cGUgY29uc3RydWN0b3IgcGF0Y2hpbmcgb3BlcmF0aW9uIGFscmVhZHlcbiAgICogcXVldWVkLlxuICAgKi9cbiAgcHJpdmF0ZSB0eXBlQ3RvclBlbmRpbmcgPSBuZXcgU2V0PHRzLkNsYXNzRGVjbGFyYXRpb24+KCk7XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgdGVtcGxhdGUgdG8gcG90ZW50aWFsbHkgYmUgdHlwZS1jaGVja2VkLlxuICAgKlxuICAgKiBJbXBsZW1lbnRzIGBUeXBlQ2hlY2tDb250ZXh0LmFkZFRlbXBsYXRlYC5cbiAgICovXG4gIGFkZFRlbXBsYXRlKFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sXG4gICAgICBiaW5kZXI6IFIzVGFyZ2V0QmluZGVyPFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhPiwgdGVtcGxhdGU6IFRtcGxBc3ROb2RlW10sXG4gICAgICBwaXBlczogTWFwPHN0cmluZywgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+PixcbiAgICAgIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10sIHNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZywgZmlsZTogUGFyc2VTb3VyY2VGaWxlLFxuICAgICAgcGFyc2VFcnJvcnM6IFBhcnNlRXJyb3JbXXxudWxsKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmhvc3Quc2hvdWxkQ2hlY2tDb21wb25lbnQocmVmLm5vZGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmRhdGFGb3JGaWxlKHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3Qgc2hpbURhdGEgPSB0aGlzLnBlbmRpbmdTaGltRm9yQ29tcG9uZW50KHJlZi5ub2RlKTtcbiAgICBjb25zdCB0ZW1wbGF0ZUlkID0gZmlsZURhdGEuc291cmNlTWFuYWdlci5nZXRUZW1wbGF0ZUlkKHJlZi5ub2RlKTtcblxuICAgIGNvbnN0IHRlbXBsYXRlRGlhZ25vc3RpY3M6IFRlbXBsYXRlRGlhZ25vc3RpY1tdID0gW107XG5cbiAgICBpZiAocGFyc2VFcnJvcnMgIT09IG51bGwpIHtcbiAgICAgIHRlbXBsYXRlRGlhZ25vc3RpY3MucHVzaChcbiAgICAgICAgICAuLi50aGlzLmdldFRlbXBsYXRlRGlhZ25vc3RpY3MocGFyc2VFcnJvcnMsIHRlbXBsYXRlSWQsIHNvdXJjZU1hcHBpbmcpKTtcbiAgICB9XG5cbiAgICBjb25zdCBib3VuZFRhcmdldCA9IGJpbmRlci5iaW5kKHt0ZW1wbGF0ZX0pO1xuXG4gICAgaWYgKHRoaXMuaW5saW5pbmcgPT09IElubGluaW5nTW9kZS5JbmxpbmVPcHMpIHtcbiAgICAgIC8vIEdldCBhbGwgb2YgdGhlIGRpcmVjdGl2ZXMgdXNlZCBpbiB0aGUgdGVtcGxhdGUgYW5kIHJlY29yZCBpbmxpbmUgdHlwZSBjb25zdHJ1Y3RvcnMgd2hlblxuICAgICAgLy8gcmVxdWlyZWQuXG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBib3VuZFRhcmdldC5nZXRVc2VkRGlyZWN0aXZlcygpKSB7XG4gICAgICAgIGNvbnN0IGRpclJlZiA9IGRpci5yZWYgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+O1xuICAgICAgICBjb25zdCBkaXJOb2RlID0gZGlyUmVmLm5vZGU7XG5cbiAgICAgICAgaWYgKCFkaXIuaXNHZW5lcmljIHx8ICFyZXF1aXJlc0lubGluZVR5cGVDdG9yKGRpck5vZGUsIHRoaXMucmVmbGVjdG9yKSkge1xuICAgICAgICAgIC8vIGlubGluaW5nIG5vdCByZXF1aXJlZFxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yIG9wZXJhdGlvbiBmb3IgdGhlIGRpcmVjdGl2ZS5cbiAgICAgICAgdGhpcy5hZGRJbmxpbmVUeXBlQ3RvcihmaWxlRGF0YSwgZGlyTm9kZS5nZXRTb3VyY2VGaWxlKCksIGRpclJlZiwge1xuICAgICAgICAgIGZuTmFtZTogJ25nVHlwZUN0b3InLFxuICAgICAgICAgIC8vIFRoZSBjb25zdHJ1Y3RvciBzaG91bGQgaGF2ZSBhIGJvZHkgaWYgdGhlIGRpcmVjdGl2ZSBjb21lcyBmcm9tIGEgLnRzIGZpbGUsIGJ1dCBub3QgaWZcbiAgICAgICAgICAvLyBpdCBjb21lcyBmcm9tIGEgLmQudHMgZmlsZS4gLmQudHMgZGVjbGFyYXRpb25zIGRvbid0IGhhdmUgYm9kaWVzLlxuICAgICAgICAgIGJvZHk6ICFkaXJOb2RlLmdldFNvdXJjZUZpbGUoKS5pc0RlY2xhcmF0aW9uRmlsZSxcbiAgICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICAgIGlucHV0czogZGlyLmlucHV0cy5jbGFzc1Byb3BlcnR5TmFtZXMsXG4gICAgICAgICAgICBvdXRwdXRzOiBkaXIub3V0cHV0cy5jbGFzc1Byb3BlcnR5TmFtZXMsXG4gICAgICAgICAgICAvLyBUT0RPKGFseGh1Yik6IHN1cHBvcnQgcXVlcmllc1xuICAgICAgICAgICAgcXVlcmllczogZGlyLnF1ZXJpZXMsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb2VyY2VkSW5wdXRGaWVsZHM6IGRpci5jb2VyY2VkSW5wdXRGaWVsZHMsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNoaW1EYXRhLnRlbXBsYXRlcy5zZXQodGVtcGxhdGVJZCwge1xuICAgICAgdGVtcGxhdGUsXG4gICAgICBib3VuZFRhcmdldCxcbiAgICAgIHRlbXBsYXRlRGlhZ25vc3RpY3MsXG4gICAgfSk7XG5cbiAgICBjb25zdCB0Y2JSZXF1aXJlc0lubGluZSA9IHJlcXVpcmVzSW5saW5lVHlwZUNoZWNrQmxvY2socmVmLm5vZGUsIHBpcGVzKTtcblxuICAgIC8vIElmIGlubGluaW5nIGlzIG5vdCBzdXBwb3J0ZWQsIGJ1dCBpcyByZXF1aXJlZCBmb3IgZWl0aGVyIHRoZSBUQ0Igb3Igb25lIG9mIGl0cyBkaXJlY3RpdmVcbiAgICAvLyBkZXBlbmRlbmNpZXMsIHRoZW4gZXhpdCBoZXJlIHdpdGggYW4gZXJyb3IuXG4gICAgaWYgKHRoaXMuaW5saW5pbmcgPT09IElubGluaW5nTW9kZS5FcnJvciAmJiB0Y2JSZXF1aXJlc0lubGluZSkge1xuICAgICAgLy8gVGhpcyB0ZW1wbGF0ZSBjYW5ub3QgYmUgc3VwcG9ydGVkIGJlY2F1c2UgdGhlIHVuZGVybHlpbmcgc3RyYXRlZ3kgZG9lcyBub3Qgc3VwcG9ydCBpbmxpbmluZ1xuICAgICAgLy8gYW5kIGlubGluaW5nIHdvdWxkIGJlIHJlcXVpcmVkLlxuXG4gICAgICAvLyBSZWNvcmQgZGlhZ25vc3RpY3MgdG8gaW5kaWNhdGUgdGhlIGlzc3VlcyB3aXRoIHRoaXMgdGVtcGxhdGUuXG4gICAgICBzaGltRGF0YS5vb2JSZWNvcmRlci5yZXF1aXJlc0lubGluZVRjYih0ZW1wbGF0ZUlkLCByZWYubm9kZSk7XG5cbiAgICAgIC8vIENoZWNraW5nIHRoaXMgdGVtcGxhdGUgd291bGQgYmUgdW5zdXBwb3J0ZWQsIHNvIGRvbid0IHRyeS5cbiAgICAgIHRoaXMucGVyZi5ldmVudENvdW50KFBlcmZFdmVudC5Ta2lwR2VuZXJhdGVUY2JOb0lubGluZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgbWV0YSA9IHtcbiAgICAgIGlkOiBmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyLmNhcHR1cmVTb3VyY2UocmVmLm5vZGUsIHNvdXJjZU1hcHBpbmcsIGZpbGUpLFxuICAgICAgYm91bmRUYXJnZXQsXG4gICAgICBwaXBlcyxcbiAgICAgIHNjaGVtYXMsXG4gICAgfTtcbiAgICB0aGlzLnBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuR2VuZXJhdGVUY2IpO1xuICAgIGlmICh0Y2JSZXF1aXJlc0lubGluZSkge1xuICAgICAgLy8gVGhpcyBjbGFzcyBkaWRuJ3QgbWVldCB0aGUgcmVxdWlyZW1lbnRzIGZvciBleHRlcm5hbCB0eXBlIGNoZWNraW5nLCBzbyBnZW5lcmF0ZSBhbiBpbmxpbmVcbiAgICAgIC8vIFRDQiBmb3IgdGhlIGNsYXNzLlxuICAgICAgdGhpcy5hZGRJbmxpbmVUeXBlQ2hlY2tCbG9jayhmaWxlRGF0YSwgc2hpbURhdGEsIHJlZiwgbWV0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBjbGFzcyBjYW4gYmUgdHlwZS1jaGVja2VkIGV4dGVybmFsbHkgYXMgbm9ybWFsLlxuICAgICAgc2hpbURhdGEuZmlsZS5hZGRUeXBlQ2hlY2tCbG9jayhyZWYsIG1ldGEsIHNoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIsIHNoaW1EYXRhLm9vYlJlY29yZGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkIGEgdHlwZSBjb25zdHJ1Y3RvciBmb3IgdGhlIGdpdmVuIGBub2RlYCB3aXRoIHRoZSBnaXZlbiBgY3Rvck1ldGFkYXRhYC5cbiAgICovXG4gIGFkZElubGluZVR5cGVDdG9yKFxuICAgICAgZmlsZURhdGE6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSwgc2Y6IHRzLlNvdXJjZUZpbGUsXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PiwgY3Rvck1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpOiB2b2lkIHtcbiAgICBpZiAodGhpcy50eXBlQ3RvclBlbmRpbmcuaGFzKHJlZi5ub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnR5cGVDdG9yUGVuZGluZy5hZGQocmVmLm5vZGUpO1xuXG4gICAgLy8gTGF6aWx5IGNvbnN0cnVjdCB0aGUgb3BlcmF0aW9uIG1hcC5cbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgdGhpcy5vcE1hcC5zZXQoc2YsIFtdKTtcbiAgICB9XG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpITtcblxuICAgIC8vIFB1c2ggYSBgVHlwZUN0b3JPcGAgaW50byB0aGUgb3BlcmF0aW9uIHF1ZXVlIGZvciB0aGUgc291cmNlIGZpbGUuXG4gICAgb3BzLnB1c2gobmV3IFR5cGVDdG9yT3AocmVmLCBjdG9yTWV0YSkpO1xuICAgIGZpbGVEYXRhLmhhc0lubGluZXMgPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybSBhIGB0cy5Tb3VyY2VGaWxlYCBpbnRvIGEgdmVyc2lvbiB0aGF0IGluY2x1ZGVzIHR5cGUgY2hlY2tpbmcgY29kZS5cbiAgICpcbiAgICogSWYgdGhpcyBwYXJ0aWN1bGFyIGB0cy5Tb3VyY2VGaWxlYCByZXF1aXJlcyBjaGFuZ2VzLCB0aGUgdGV4dCByZXByZXNlbnRpbmcgaXRzIG5ldyBjb250ZW50c1xuICAgKiB3aWxsIGJlIHJldHVybmVkLiBPdGhlcndpc2UsIGEgYG51bGxgIHJldHVybiBpbmRpY2F0ZXMgbm8gY2hhbmdlcyB3ZXJlIG5lY2Vzc2FyeS5cbiAgICovXG4gIHRyYW5zZm9ybShzZjogdHMuU291cmNlRmlsZSk6IHN0cmluZ3xudWxsIHtcbiAgICAvLyBJZiB0aGVyZSBhcmUgbm8gb3BlcmF0aW9ucyBwZW5kaW5nIGZvciB0aGlzIHBhcnRpY3VsYXIgZmlsZSwgcmV0dXJuIGBudWxsYCB0byBpbmRpY2F0ZSBub1xuICAgIC8vIGNoYW5nZXMuXG4gICAgaWYgKCF0aGlzLm9wTWFwLmhhcyhzZikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEltcG9ydHMgbWF5IG5lZWQgdG8gYmUgYWRkZWQgdG8gdGhlIGZpbGUgdG8gc3VwcG9ydCB0eXBlLWNoZWNraW5nIG9mIGRpcmVjdGl2ZXMgdXNlZCBpbiB0aGVcbiAgICAvLyB0ZW1wbGF0ZSB3aXRoaW4gaXQuXG4gICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKSwgJ19pJyk7XG5cbiAgICAvLyBFYWNoIE9wIGhhcyBhIHNwbGl0UG9pbnQgaW5kZXggaW50byB0aGUgdGV4dCB3aGVyZSBpdCBuZWVkcyB0byBiZSBpbnNlcnRlZC4gU3BsaXQgdGhlXG4gICAgLy8gb3JpZ2luYWwgc291cmNlIHRleHQgaW50byBjaHVua3MgYXQgdGhlc2Ugc3BsaXQgcG9pbnRzLCB3aGVyZSBjb2RlIHdpbGwgYmUgaW5zZXJ0ZWQgYmV0d2VlblxuICAgIC8vIHRoZSBjaHVua3MuXG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpIS5zb3J0KG9yZGVyT3BzKTtcbiAgICBjb25zdCB0ZXh0UGFydHMgPSBzcGxpdFN0cmluZ0F0UG9pbnRzKHNmLnRleHQsIG9wcy5tYXAob3AgPT4gb3Auc3BsaXRQb2ludCkpO1xuXG4gICAgLy8gVXNlIGEgYHRzLlByaW50ZXJgIHRvIGdlbmVyYXRlIHNvdXJjZSBjb2RlLlxuICAgIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKHtvbWl0VHJhaWxpbmdTZW1pY29sb246IHRydWV9KTtcblxuICAgIC8vIEJlZ2luIHdpdGggdGhlIGludGlhbCBzZWN0aW9uIG9mIHRoZSBjb2RlIHRleHQuXG4gICAgbGV0IGNvZGUgPSB0ZXh0UGFydHNbMF07XG5cbiAgICAvLyBQcm9jZXNzIGVhY2ggb3BlcmF0aW9uIGFuZCB1c2UgdGhlIHByaW50ZXIgdG8gZ2VuZXJhdGUgc291cmNlIGNvZGUgZm9yIGl0LCBpbnNlcnRpbmcgaXQgaW50b1xuICAgIC8vIHRoZSBzb3VyY2UgY29kZSBpbiBiZXR3ZWVuIHRoZSBvcmlnaW5hbCBjaHVua3MuXG4gICAgb3BzLmZvckVhY2goKG9wLCBpZHgpID0+IHtcbiAgICAgIGNvbnN0IHRleHQgPSBvcC5leGVjdXRlKGltcG9ydE1hbmFnZXIsIHNmLCB0aGlzLnJlZkVtaXR0ZXIsIHByaW50ZXIpO1xuICAgICAgY29kZSArPSAnXFxuXFxuJyArIHRleHQgKyB0ZXh0UGFydHNbaWR4ICsgMV07XG4gICAgfSk7XG5cbiAgICAvLyBXcml0ZSBvdXQgdGhlIGltcG9ydHMgdGhhdCBuZWVkIHRvIGJlIGFkZGVkIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZpbGUuXG4gICAgbGV0IGltcG9ydHMgPSBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoc2YuZmlsZU5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgLm1hcChpID0+IGBpbXBvcnQgKiBhcyAke2kucXVhbGlmaWVyLnRleHR9IGZyb20gJyR7aS5zcGVjaWZpZXJ9JztgKVxuICAgICAgICAgICAgICAgICAgICAgIC5qb2luKCdcXG4nKTtcbiAgICBjb2RlID0gaW1wb3J0cyArICdcXG4nICsgY29kZTtcblxuICAgIHJldHVybiBjb2RlO1xuICB9XG5cbiAgZmluYWxpemUoKTogTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+IHtcbiAgICAvLyBGaXJzdCwgYnVpbGQgdGhlIG1hcCBvZiB1cGRhdGVzIHRvIHNvdXJjZSBmaWxlcy5cbiAgICBjb25zdCB1cGRhdGVzID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPigpO1xuICAgIGZvciAoY29uc3Qgb3JpZ2luYWxTZiBvZiB0aGlzLm9wTWFwLmtleXMoKSkge1xuICAgICAgY29uc3QgbmV3VGV4dCA9IHRoaXMudHJhbnNmb3JtKG9yaWdpbmFsU2YpO1xuICAgICAgaWYgKG5ld1RleHQgIT09IG51bGwpIHtcbiAgICAgICAgdXBkYXRlcy5zZXQoYWJzb2x1dGVGcm9tU291cmNlRmlsZShvcmlnaW5hbFNmKSwgbmV3VGV4dCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhlbiBnbyB0aHJvdWdoIGVhY2ggaW5wdXQgZmlsZSB0aGF0IGhhcyBwZW5kaW5nIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb25zLlxuICAgIGZvciAoY29uc3QgW3NmUGF0aCwgcGVuZGluZ0ZpbGVEYXRhXSBvZiB0aGlzLmZpbGVNYXApIHtcbiAgICAgIC8vIEZvciBlYWNoIGlucHV0IGZpbGUsIGNvbnNpZGVyIGdlbmVyYXRpb24gb3BlcmF0aW9ucyBmb3IgZWFjaCBvZiBpdHMgc2hpbXMuXG4gICAgICBmb3IgKGNvbnN0IHBlbmRpbmdTaGltRGF0YSBvZiBwZW5kaW5nRmlsZURhdGEuc2hpbURhdGEudmFsdWVzKCkpIHtcbiAgICAgICAgdGhpcy5ob3N0LnJlY29yZFNoaW1EYXRhKHNmUGF0aCwge1xuICAgICAgICAgIGdlbmVzaXNEaWFnbm9zdGljczogW1xuICAgICAgICAgICAgLi4ucGVuZGluZ1NoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIuZGlhZ25vc3RpY3MsXG4gICAgICAgICAgICAuLi5wZW5kaW5nU2hpbURhdGEub29iUmVjb3JkZXIuZGlhZ25vc3RpY3MsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBoYXNJbmxpbmVzOiBwZW5kaW5nRmlsZURhdGEuaGFzSW5saW5lcyxcbiAgICAgICAgICBwYXRoOiBwZW5kaW5nU2hpbURhdGEuZmlsZS5maWxlTmFtZSxcbiAgICAgICAgICB0ZW1wbGF0ZXM6IHBlbmRpbmdTaGltRGF0YS50ZW1wbGF0ZXMsXG4gICAgICAgIH0pO1xuICAgICAgICB1cGRhdGVzLnNldChcbiAgICAgICAgICAgIHBlbmRpbmdTaGltRGF0YS5maWxlLmZpbGVOYW1lLCBwZW5kaW5nU2hpbURhdGEuZmlsZS5yZW5kZXIoZmFsc2UgLyogcmVtb3ZlQ29tbWVudHMgKi8pKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdXBkYXRlcztcbiAgfVxuXG4gIHByaXZhdGUgYWRkSW5saW5lVHlwZUNoZWNrQmxvY2soXG4gICAgICBmaWxlRGF0YTogUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhLCBzaGltRGF0YTogUGVuZGluZ1NoaW1EYXRhLFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sXG4gICAgICB0Y2JNZXRhOiBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhKTogdm9pZCB7XG4gICAgY29uc3Qgc2YgPSByZWYubm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgaWYgKCF0aGlzLm9wTWFwLmhhcyhzZikpIHtcbiAgICAgIHRoaXMub3BNYXAuc2V0KHNmLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG9wcyA9IHRoaXMub3BNYXAuZ2V0KHNmKSE7XG4gICAgb3BzLnB1c2gobmV3IFRjYk9wKFxuICAgICAgICByZWYsIHRjYk1ldGEsIHRoaXMuY29uZmlnLCB0aGlzLnJlZmxlY3Rvciwgc2hpbURhdGEuZG9tU2NoZW1hQ2hlY2tlcixcbiAgICAgICAgc2hpbURhdGEub29iUmVjb3JkZXIpKTtcbiAgICBmaWxlRGF0YS5oYXNJbmxpbmVzID0gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgcGVuZGluZ1NoaW1Gb3JDb21wb25lbnQobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFBlbmRpbmdTaGltRGF0YSB7XG4gICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmRhdGFGb3JGaWxlKG5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICBjb25zdCBzaGltUGF0aCA9IHRoaXMuY29tcG9uZW50TWFwcGluZ1N0cmF0ZWd5LnNoaW1QYXRoRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIGlmICghZmlsZURhdGEuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgZmlsZURhdGEuc2hpbURhdGEuc2V0KHNoaW1QYXRoLCB7XG4gICAgICAgIGRvbVNjaGVtYUNoZWNrZXI6IG5ldyBSZWdpc3RyeURvbVNjaGVtYUNoZWNrZXIoZmlsZURhdGEuc291cmNlTWFuYWdlciksXG4gICAgICAgIG9vYlJlY29yZGVyOiBuZXcgT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVySW1wbChmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyKSxcbiAgICAgICAgZmlsZTogbmV3IFR5cGVDaGVja0ZpbGUoXG4gICAgICAgICAgICBzaGltUGF0aCwgdGhpcy5jb25maWcsIHRoaXMucmVmRW1pdHRlciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY29tcGlsZXJIb3N0KSxcbiAgICAgICAgdGVtcGxhdGVzOiBuZXcgTWFwPFRlbXBsYXRlSWQsIFRlbXBsYXRlRGF0YT4oKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZmlsZURhdGEuc2hpbURhdGEuZ2V0KHNoaW1QYXRoKSE7XG4gIH1cblxuICBwcml2YXRlIGRhdGFGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlKTogUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhIHtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcblxuICAgIGlmICghdGhpcy5maWxlTWFwLmhhcyhzZlBhdGgpKSB7XG4gICAgICBjb25zdCBkYXRhOiBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEgPSB7XG4gICAgICAgIGhhc0lubGluZXM6IGZhbHNlLFxuICAgICAgICBzb3VyY2VNYW5hZ2VyOiB0aGlzLmhvc3QuZ2V0U291cmNlTWFuYWdlcihzZlBhdGgpLFxuICAgICAgICBzaGltRGF0YTogbmV3IE1hcCgpLFxuICAgICAgfTtcbiAgICAgIHRoaXMuZmlsZU1hcC5zZXQoc2ZQYXRoLCBkYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5maWxlTWFwLmdldChzZlBhdGgpITtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVEaWFnbm9zdGljcyhcbiAgICAgIHBhcnNlRXJyb3JzOiBQYXJzZUVycm9yW10sIHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsXG4gICAgICBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmcpOiBUZW1wbGF0ZURpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHBhcnNlRXJyb3JzLm1hcChlcnJvciA9PiB7XG4gICAgICBjb25zdCBzcGFuID0gZXJyb3Iuc3BhbjtcblxuICAgICAgaWYgKHNwYW4uc3RhcnQub2Zmc2V0ID09PSBzcGFuLmVuZC5vZmZzZXQpIHtcbiAgICAgICAgLy8gVGVtcGxhdGUgZXJyb3JzIGNhbiBjb250YWluIHplcm8tbGVuZ3RoIHNwYW5zLCBpZiB0aGUgZXJyb3Igb2NjdXJzIGF0IGEgc2luZ2xlIHBvaW50LlxuICAgICAgICAvLyBIb3dldmVyLCBUeXBlU2NyaXB0IGRvZXMgbm90IGhhbmRsZSBkaXNwbGF5aW5nIGEgemVyby1sZW5ndGggZGlhZ25vc3RpYyB2ZXJ5IHdlbGwsIHNvXG4gICAgICAgIC8vIGluY3JlYXNlIHRoZSBlbmRpbmcgb2Zmc2V0IGJ5IDEgZm9yIHN1Y2ggZXJyb3JzLCB0byBlbnN1cmUgdGhlIHBvc2l0aW9uIGlzIHNob3duIGluIHRoZVxuICAgICAgICAvLyBkaWFnbm9zdGljLlxuICAgICAgICBzcGFuLmVuZC5vZmZzZXQrKztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgICAgdGVtcGxhdGVJZCwgc291cmNlTWFwcGluZywgc3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIG5nRXJyb3JDb2RlKEVycm9yQ29kZS5URU1QTEFURV9QQVJTRV9FUlJPUiksIGVycm9yLm1zZyk7XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb24gdGhhdCBuZWVkcyB0byBoYXBwZW4gd2l0aGluIGEgZ2l2ZW4gc291cmNlIGZpbGUuXG4gKi9cbmludGVyZmFjZSBPcCB7XG4gIC8qKlxuICAgKiBUaGUgbm9kZSBpbiB0aGUgZmlsZSB3aGljaCB3aWxsIGhhdmUgY29kZSBnZW5lcmF0ZWQgZm9yIGl0LlxuICAgKi9cbiAgcmVhZG9ubHkgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG5cbiAgLyoqXG4gICAqIEluZGV4IGludG8gdGhlIHNvdXJjZSB0ZXh0IHdoZXJlIHRoZSBjb2RlIGdlbmVyYXRlZCBieSB0aGUgb3BlcmF0aW9uIHNob3VsZCBiZSBpbnNlcnRlZC5cbiAgICovXG4gIHJlYWRvbmx5IHNwbGl0UG9pbnQ6IG51bWJlcjtcblxuICAvKipcbiAgICogRXhlY3V0ZSB0aGUgb3BlcmF0aW9uIGFuZCByZXR1cm4gdGhlIGdlbmVyYXRlZCBjb2RlIGFzIHRleHQuXG4gICAqL1xuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB0eXBlIGNoZWNrIGJsb2NrIG9wZXJhdGlvbiB3aGljaCBwcm9kdWNlcyB0eXBlIGNoZWNrIGNvZGUgZm9yIGEgcGFydGljdWxhciBjb21wb25lbnQuXG4gKi9cbmNsYXNzIFRjYk9wIGltcGxlbWVudHMgT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgcmVhZG9ubHkgbWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgcmVhZG9ubHkgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsXG4gICAgICByZWFkb25seSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCByZWFkb25seSBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLFxuICAgICAgcmVhZG9ubHkgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcikge31cblxuICAvKipcbiAgICogVHlwZSBjaGVjayBibG9ja3MgYXJlIGluc2VydGVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBlbmQgb2YgdGhlIGNvbXBvbmVudCBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucmVmLm5vZGUuZW5kICsgMTtcbiAgfVxuXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZyB7XG4gICAgY29uc3QgZW52ID0gbmV3IEVudmlyb25tZW50KHRoaXMuY29uZmlnLCBpbSwgcmVmRW1pdHRlciwgdGhpcy5yZWZsZWN0b3IsIHNmKTtcbiAgICBjb25zdCBmbk5hbWUgPSB0cy5jcmVhdGVJZGVudGlmaWVyKGBfdGNiXyR7dGhpcy5yZWYubm9kZS5wb3N9YCk7XG4gICAgY29uc3QgZm4gPSBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgICBlbnYsIHRoaXMucmVmLCBmbk5hbWUsIHRoaXMubWV0YSwgdGhpcy5kb21TY2hlbWFDaGVja2VyLCB0aGlzLm9vYlJlY29yZGVyKTtcbiAgICByZXR1cm4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIGZuLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIHdoaWNoIHByb2R1Y2VzIHR5cGUgY29uc3RydWN0b3IgY29kZSBmb3IgYSBwYXJ0aWN1bGFyIGRpcmVjdGl2ZS5cbiAqL1xuY2xhc3MgVHlwZUN0b3JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHJlYWRvbmx5IG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9ucyBhcmUgaW5zZXJ0ZWQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBlbmQgb2YgdGhlIGRpcmVjdGl2ZSBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucmVmLm5vZGUuZW5kIC0gMTtcbiAgfVxuXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZyB7XG4gICAgY29uc3QgdGNiID0gZ2VuZXJhdGVJbmxpbmVUeXBlQ3Rvcih0aGlzLnJlZi5ub2RlLCB0aGlzLm1ldGEpO1xuICAgIHJldHVybiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdGNiLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wYXJlIHR3byBvcGVyYXRpb25zIGFuZCByZXR1cm4gdGhlaXIgc3BsaXQgcG9pbnQgb3JkZXJpbmcuXG4gKi9cbmZ1bmN0aW9uIG9yZGVyT3BzKG9wMTogT3AsIG9wMjogT3ApOiBudW1iZXIge1xuICByZXR1cm4gb3AxLnNwbGl0UG9pbnQgLSBvcDIuc3BsaXRQb2ludDtcbn1cblxuLyoqXG4gKiBTcGxpdCBhIHN0cmluZyBpbnRvIGNodW5rcyBhdCBhbnkgbnVtYmVyIG9mIHNwbGl0IHBvaW50cy5cbiAqL1xuZnVuY3Rpb24gc3BsaXRTdHJpbmdBdFBvaW50cyhzdHI6IHN0cmluZywgcG9pbnRzOiBudW1iZXJbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgc3BsaXRzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgc3RhcnQgPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBvaW50ID0gcG9pbnRzW2ldO1xuICAgIHNwbGl0cy5wdXNoKHN0ci5zdWJzdHJpbmcoc3RhcnQsIHBvaW50KSk7XG4gICAgc3RhcnQgPSBwb2ludDtcbiAgfVxuICBzcGxpdHMucHVzaChzdHIuc3Vic3RyaW5nKHN0YXJ0KSk7XG4gIHJldHVybiBzcGxpdHM7XG59XG4iXX0=