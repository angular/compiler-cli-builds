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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/context", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/diagnostics", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/dom", "@angular/compiler-cli/src/ngtsc/typecheck/src/environment", "@angular/compiler-cli/src/ngtsc/typecheck/src/oob", "@angular/compiler-cli/src/ngtsc/typecheck/src/shim", "@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor"], factory);
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
    var shim_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/shim");
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
        function TypeCheckContextImpl(config, compilerHost, refEmitter, reflector, host, inlining, perf) {
            this.config = config;
            this.compilerHost = compilerHost;
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
                templateDiagnostics.push.apply(templateDiagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(this.getTemplateDiagnostics(parseErrors, templateId, sourceMapping)), false));
            }
            var boundTarget = binder.bind({ template: template });
            if (this.inlining === InliningMode.InlineOps) {
                try {
                    // Get all of the directives used in the template and record inline type constructors when
                    // required.
                    for (var _b = (0, tslib_1.__values)(boundTarget.getUsedDirectives()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var dir = _c.value;
                        var dirRef = dir.ref;
                        var dirNode = dirRef.node;
                        if (!dir.isGeneric || !(0, type_constructor_1.requiresInlineTypeCtor)(dirNode, this.reflector)) {
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
            var inliningRequirement = (0, tcb_util_1.requiresInlineTypeCheckBlock)(ref.node, pipes, this.reflector);
            // If inlining is not supported, but is required for either the TCB or one of its directive
            // dependencies, then exit here with an error.
            if (this.inlining === InliningMode.Error &&
                inliningRequirement === tcb_util_1.TcbInliningRequirement.MustInline) {
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
            if (inliningRequirement !== tcb_util_1.TcbInliningRequirement.None &&
                this.inlining === InliningMode.InlineOps) {
                // This class didn't meet the requirements for external type checking, so generate an inline
                // TCB for the class.
                this.addInlineTypeCheckBlock(fileData, shimData, ref, meta);
            }
            else if (inliningRequirement === tcb_util_1.TcbInliningRequirement.ShouldInlineForGenericBounds &&
                this.inlining === InliningMode.Error) {
                // It's suggested that this TCB should be generated inline due to the component's generic
                // bounds, but inlining is not supported by the current environment. Use a non-inline type
                // check block, but fall back to `any` generic parameters since the generic bounds can't be
                // referenced in that context. This will infer a less useful type for the component, but allow
                // for type-checking it in an environment where that would not be possible otherwise.
                shimData.file.addTypeCheckBlock(ref, meta, shimData.domSchemaChecker, shimData.oobRecorder, type_check_block_1.TcbGenericContextBehavior.FallbackToAny);
            }
            else {
                shimData.file.addTypeCheckBlock(ref, meta, shimData.domSchemaChecker, shimData.oobRecorder, type_check_block_1.TcbGenericContextBehavior.UseEmitter);
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
                for (var _d = (0, tslib_1.__values)(this.opMap.keys()), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var originalSf = _e.value;
                    var newText = this.transform(originalSf);
                    if (newText !== null) {
                        updates.set((0, file_system_1.absoluteFromSourceFile)(originalSf), {
                            newText: newText,
                            originalFile: originalSf,
                        });
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
                for (var _f = (0, tslib_1.__values)(this.fileMap), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var _h = (0, tslib_1.__read)(_g.value, 2), sfPath = _h[0], pendingFileData = _h[1];
                    try {
                        // For each input file, consider generation operations for each of its shims.
                        for (var _j = (e_4 = void 0, (0, tslib_1.__values)(pendingFileData.shimData.values())), _k = _j.next(); !_k.done; _k = _j.next()) {
                            var pendingShimData = _k.value;
                            this.host.recordShimData(sfPath, {
                                genesisDiagnostics: (0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(pendingShimData.domSchemaChecker.diagnostics), false), (0, tslib_1.__read)(pendingShimData.oobRecorder.diagnostics), false),
                                hasInlines: pendingFileData.hasInlines,
                                path: pendingShimData.file.fileName,
                                templates: pendingShimData.templates,
                            });
                            var sfText = pendingShimData.file.render(false /* removeComments */);
                            updates.set(pendingShimData.file.fileName, {
                                newText: sfText,
                                // Shim files do not have an associated original file.
                                originalFile: null,
                            });
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
            ops.push(new InlineTcbOp(ref, tcbMeta, this.config, this.reflector, shimData.domSchemaChecker, shimData.oobRecorder));
            fileData.hasInlines = true;
        };
        TypeCheckContextImpl.prototype.pendingShimForComponent = function (node) {
            var fileData = this.dataForFile(node.getSourceFile());
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor((0, file_system_1.absoluteFromSourceFile)(node.getSourceFile()));
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
            var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
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
                return (0, diagnostics_2.makeTemplateDiagnostic)(templateId, sourceMapping, span, ts.DiagnosticCategory.Error, (0, diagnostics_1.ngErrorCode)(diagnostics_1.ErrorCode.TEMPLATE_PARSE_ERROR), error.msg);
            });
        };
        return TypeCheckContextImpl;
    }());
    exports.TypeCheckContextImpl = TypeCheckContextImpl;
    /**
     * A type check block operation which produces inline type check code for a particular component.
     */
    var InlineTcbOp = /** @class */ (function () {
        function InlineTcbOp(ref, meta, config, reflector, domSchemaChecker, oobRecorder) {
            this.ref = ref;
            this.meta = meta;
            this.config = config;
            this.reflector = reflector;
            this.domSchemaChecker = domSchemaChecker;
            this.oobRecorder = oobRecorder;
        }
        Object.defineProperty(InlineTcbOp.prototype, "splitPoint", {
            /**
             * Type check blocks are inserted immediately after the end of the component class.
             */
            get: function () {
                return this.ref.node.end + 1;
            },
            enumerable: false,
            configurable: true
        });
        InlineTcbOp.prototype.execute = function (im, sf, refEmitter, printer) {
            var env = new environment_1.Environment(this.config, im, refEmitter, this.reflector, sf);
            var fnName = ts.createIdentifier("_tcb_" + this.ref.node.pos);
            // Inline TCBs should copy any generic type parameter nodes directly, as the TCB code is inlined
            // into the class in a context where that will always be legal.
            var fn = (0, type_check_block_1.generateTypeCheckBlock)(env, this.ref, fnName, this.meta, this.domSchemaChecker, this.oobRecorder, type_check_block_1.TcbGenericContextBehavior.CopyClassNodes);
            return printer.printNode(ts.EmitHint.Unspecified, fn, sf);
        };
        return InlineTcbOp;
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
            var tcb = (0, type_constructor_1.generateInlineTypeCtor)(this.ref.node, this.meta);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwyRUFBbUY7SUFDbkYsK0JBQWlDO0lBRWpDLDJFQUF5RTtJQUN6RSxtRUFBOEU7SUFDOUUsNkRBQW1EO0lBR25ELHlFQUErQztJQUUvQyxxRkFBc0Q7SUFFdEQseUVBQWlFO0lBQ2pFLHlGQUEwQztJQUMxQyx5RUFBbUY7SUFDbkYsMkVBQThDO0lBRTlDLG1GQUFnRjtJQUNoRixtR0FBcUY7SUFDckYsaUdBQWdEO0lBQ2hELG1HQUFrRjtJQThIbEY7O09BRUc7SUFDSCxJQUFZLFlBVVg7SUFWRCxXQUFZLFlBQVk7UUFDdEI7O1dBRUc7UUFDSCx5REFBUyxDQUFBO1FBRVQ7O1dBRUc7UUFDSCxpREFBSyxDQUFBO0lBQ1AsQ0FBQyxFQVZXLFlBQVksR0FBWixvQkFBWSxLQUFaLG9CQUFZLFFBVXZCO0lBRUQ7Ozs7O09BS0c7SUFDSDtRQUdFLDhCQUNZLE1BQTBCLEVBQzFCLFlBQTJELEVBQzNELFVBQTRCLEVBQVUsU0FBeUIsRUFDL0QsSUFBc0IsRUFBVSxRQUFzQixFQUFVLElBQWtCO1lBSGxGLFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQzFCLGlCQUFZLEdBQVosWUFBWSxDQUErQztZQUMzRCxlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQy9ELFNBQUksR0FBSixJQUFJLENBQWtCO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBYztZQUFVLFNBQUksR0FBSixJQUFJLENBQWM7WUFOdEYsWUFBTyxHQUFHLElBQUksR0FBRyxFQUErQyxDQUFDO1lBYXpFOzs7ZUFHRztZQUNLLFVBQUssR0FBRyxJQUFJLEdB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LENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3RDLElBQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDekMsS0FBSyxHQUFHLEtBQUssQ0FBQztTQUNmO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0JvdW5kVGFyZ2V0LCBQYXJzZUVycm9yLCBQYXJzZVNvdXJjZUZpbGUsIFIzVGFyZ2V0QmluZGVyLCBTY2hlbWFNZXRhZGF0YSwgVGVtcGxhdGVQYXJzZUVycm9yLCBUbXBsQXN0Tm9kZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge05vb3BJbXBvcnRSZXdyaXRlciwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7UGVyZkV2ZW50LCBQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtGaWxlVXBkYXRlfSBmcm9tICcuLi8uLi9wcm9ncmFtX2RyaXZlcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5pbXBvcnQge1RlbXBsYXRlRGlhZ25vc3RpYywgVGVtcGxhdGVJZCwgVGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgVHlwZUNoZWNrQ29udGV4dCwgVHlwZUNoZWNraW5nQ29uZmlnLCBUeXBlQ3Rvck1ldGFkYXRhfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHttYWtlVGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuLi9kaWFnbm9zdGljcyc7XG5cbmltcG9ydCB7RG9tU2NoZW1hQ2hlY2tlciwgUmVnaXN0cnlEb21TY2hlbWFDaGVja2VyfSBmcm9tICcuL2RvbSc7XG5pbXBvcnQge0Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7T3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyLCBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXJJbXBsfSBmcm9tICcuL29vYic7XG5pbXBvcnQge1R5cGVDaGVja1NoaW1HZW5lcmF0b3J9IGZyb20gJy4vc2hpbSc7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFuYWdlcn0gZnJvbSAnLi9zb3VyY2UnO1xuaW1wb3J0IHtyZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrLCBUY2JJbmxpbmluZ1JlcXVpcmVtZW50fSBmcm9tICcuL3RjYl91dGlsJztcbmltcG9ydCB7Z2VuZXJhdGVUeXBlQ2hlY2tCbG9jaywgVGNiR2VuZXJpY0NvbnRleHRCZWhhdmlvcn0gZnJvbSAnLi90eXBlX2NoZWNrX2Jsb2NrJztcbmltcG9ydCB7VHlwZUNoZWNrRmlsZX0gZnJvbSAnLi90eXBlX2NoZWNrX2ZpbGUnO1xuaW1wb3J0IHtnZW5lcmF0ZUlubGluZVR5cGVDdG9yLCByZXF1aXJlc0lubGluZVR5cGVDdG9yfSBmcm9tICcuL3R5cGVfY29uc3RydWN0b3InO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNoaW1UeXBlQ2hlY2tpbmdEYXRhIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIHNoaW0gZmlsZS5cbiAgICovXG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuXG4gIC8qKlxuICAgKiBBbnkgYHRzLkRpYWdub3N0aWNgcyB3aGljaCB3ZXJlIHByb2R1Y2VkIGR1cmluZyB0aGUgZ2VuZXJhdGlvbiBvZiB0aGlzIHNoaW0uXG4gICAqXG4gICAqIFNvbWUgZGlhZ25vc3RpY3MgYXJlIHByb2R1Y2VkIGR1cmluZyBjcmVhdGlvbiB0aW1lIGFuZCBhcmUgdHJhY2tlZCBoZXJlLlxuICAgKi9cbiAgZ2VuZXNpc0RpYWdub3N0aWNzOiBUZW1wbGF0ZURpYWdub3N0aWNbXTtcblxuICAvKipcbiAgICogV2hldGhlciBhbnkgaW5saW5lIG9wZXJhdGlvbnMgZm9yIHRoZSBpbnB1dCBmaWxlIHdlcmUgcmVxdWlyZWQgdG8gZ2VuZXJhdGUgdGhpcyBzaGltLlxuICAgKi9cbiAgaGFzSW5saW5lczogYm9vbGVhbjtcblxuICAvKipcbiAgICogTWFwIG9mIGBUZW1wbGF0ZUlkYCB0byBpbmZvcm1hdGlvbiBjb2xsZWN0ZWQgYWJvdXQgdGhlIHRlbXBsYXRlIGR1cmluZyB0aGUgdGVtcGxhdGVcbiAgICogdHlwZS1jaGVja2luZyBwcm9jZXNzLlxuICAgKi9cbiAgdGVtcGxhdGVzOiBNYXA8VGVtcGxhdGVJZCwgVGVtcGxhdGVEYXRhPjtcbn1cblxuLyoqXG4gKiBEYXRhIHRyYWNrZWQgZm9yIGVhY2ggdGVtcGxhdGUgcHJvY2Vzc2VkIGJ5IHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHN5c3RlbS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZURhdGEge1xuICAvKipcbiAgICogVGVtcGxhdGUgbm9kZXMgZm9yIHdoaWNoIHRoZSBUQ0Igd2FzIGdlbmVyYXRlZC5cbiAgICovXG4gIHRlbXBsYXRlOiBUbXBsQXN0Tm9kZVtdO1xuXG4gIC8qKlxuICAgKiBgQm91bmRUYXJnZXRgIHdoaWNoIHdhcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSBUQ0IsIGFuZCBjb250YWlucyBiaW5kaW5ncyBmb3IgdGhlIGFzc29jaWF0ZWRcbiAgICogdGVtcGxhdGUgbm9kZXMuXG4gICAqL1xuICBib3VuZFRhcmdldDogQm91bmRUYXJnZXQ8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+O1xuXG4gIC8qKlxuICAgKiBFcnJvcnMgZm91bmQgd2hpbGUgcGFyc2luZyB0aGVtIHRlbXBsYXRlLCB3aGljaCBoYXZlIGJlZW4gY29udmVydGVkIHRvIGRpYWdub3N0aWNzLlxuICAgKi9cbiAgdGVtcGxhdGVEaWFnbm9zdGljczogVGVtcGxhdGVEaWFnbm9zdGljW107XG59XG5cbi8qKlxuICogRGF0YSBmb3IgYW4gaW5wdXQgZmlsZSB3aGljaCBpcyBzdGlsbCBpbiB0aGUgcHJvY2VzcyBvZiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGNvZGUgZ2VuZXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEge1xuICAvKipcbiAgICogV2hldGhlciBhbnkgaW5saW5lIGNvZGUgaGFzIGJlZW4gcmVxdWlyZWQgYnkgdGhlIHNoaW0geWV0LlxuICAgKi9cbiAgaGFzSW5saW5lczogYm9vbGVhbjtcblxuICAvKipcbiAgICogU291cmNlIG1hcHBpbmcgaW5mb3JtYXRpb24gZm9yIG1hcHBpbmcgZGlhZ25vc3RpY3MgZnJvbSBpbmxpbmVkIHR5cGUgY2hlY2sgYmxvY2tzIGJhY2sgdG8gdGhlXG4gICAqIG9yaWdpbmFsIHRlbXBsYXRlLlxuICAgKi9cbiAgc291cmNlTWFuYWdlcjogVGVtcGxhdGVTb3VyY2VNYW5hZ2VyO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgaW4tcHJvZ3Jlc3Mgc2hpbSBkYXRhIGZvciBzaGltcyBnZW5lcmF0ZWQgZnJvbSB0aGlzIGlucHV0IGZpbGUuXG4gICAqL1xuICBzaGltRGF0YTogTWFwPEFic29sdXRlRnNQYXRoLCBQZW5kaW5nU2hpbURhdGE+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBlbmRpbmdTaGltRGF0YSB7XG4gIC8qKlxuICAgKiBSZWNvcmRlciBmb3Igb3V0LW9mLWJhbmQgZGlhZ25vc3RpY3Mgd2hpY2ggYXJlIHJhaXNlZCBkdXJpbmcgZ2VuZXJhdGlvbi5cbiAgICovXG4gIG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAgaW4gdXNlIGZvciB0aGlzIHRlbXBsYXRlLCB3aGljaCByZWNvcmRzIGFueSBzY2hlbWEtcmVsYXRlZCBkaWFnbm9zdGljcy5cbiAgICovXG4gIGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXI7XG5cbiAgLyoqXG4gICAqIFNoaW0gZmlsZSBpbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBnZW5lcmF0ZWQuXG4gICAqL1xuICBmaWxlOiBUeXBlQ2hlY2tGaWxlO1xuXG5cbiAgLyoqXG4gICAqIE1hcCBvZiBgVGVtcGxhdGVJZGAgdG8gaW5mb3JtYXRpb24gY29sbGVjdGVkIGFib3V0IHRoZSB0ZW1wbGF0ZSBhcyBpdCdzIGluZ2VzdGVkLlxuICAgKi9cbiAgdGVtcGxhdGVzOiBNYXA8VGVtcGxhdGVJZCwgVGVtcGxhdGVEYXRhPjtcbn1cblxuLyoqXG4gKiBBZGFwdHMgdGhlIGBUeXBlQ2hlY2tDb250ZXh0SW1wbGAgdG8gdGhlIGxhcmdlciB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHN5c3RlbS5cbiAqXG4gKiBUaHJvdWdoIHRoaXMgaW50ZXJmYWNlLCBhIHNpbmdsZSBgVHlwZUNoZWNrQ29udGV4dEltcGxgICh3aGljaCByZXByZXNlbnRzIG9uZSBcInBhc3NcIiBvZiB0ZW1wbGF0ZVxuICogdHlwZS1jaGVja2luZykgcmVxdWVzdHMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGxhcmdlciBzdGF0ZSBvZiB0eXBlLWNoZWNraW5nLCBhcyB3ZWxsIGFzIHJlcG9ydHNcbiAqIGJhY2sgaXRzIHJlc3VsdHMgb25jZSBmaW5hbGl6ZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZUNoZWNraW5nSG9zdCB7XG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgYFRlbXBsYXRlU291cmNlTWFuYWdlcmAgcmVzcG9uc2libGUgZm9yIGNvbXBvbmVudHMgaW4gdGhlIGdpdmVuIGlucHV0IGZpbGUgcGF0aC5cbiAgICovXG4gIGdldFNvdXJjZU1hbmFnZXIoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFRlbXBsYXRlU291cmNlTWFuYWdlcjtcblxuICAvKipcbiAgICogV2hldGhlciBhIHBhcnRpY3VsYXIgY29tcG9uZW50IGNsYXNzIHNob3VsZCBiZSBpbmNsdWRlZCBpbiB0aGUgY3VycmVudCB0eXBlLWNoZWNraW5nIHBhc3MuXG4gICAqXG4gICAqIE5vdCBhbGwgY29tcG9uZW50cyBvZmZlcmVkIHRvIHRoZSBgVHlwZUNoZWNrQ29udGV4dGAgZm9yIGNoZWNraW5nIG1heSByZXF1aXJlIHByb2Nlc3NpbmcuIEZvclxuICAgKiBleGFtcGxlLCB0aGUgY29tcG9uZW50IG1heSBoYXZlIHJlc3VsdHMgYWxyZWFkeSBhdmFpbGFibGUgZnJvbSBhIHByaW9yIHBhc3Mgb3IgZnJvbSBhIHByZXZpb3VzXG4gICAqIHByb2dyYW0uXG4gICAqL1xuICBzaG91bGRDaGVja0NvbXBvbmVudChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbjtcblxuICAvKipcbiAgICogUmVwb3J0IGRhdGEgZnJvbSBhIHNoaW0gZ2VuZXJhdGVkIGZyb20gdGhlIGdpdmVuIGlucHV0IGZpbGUgcGF0aC5cbiAgICovXG4gIHJlY29yZFNoaW1EYXRhKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIGRhdGE6IFNoaW1UeXBlQ2hlY2tpbmdEYXRhKTogdm9pZDtcblxuICAvKipcbiAgICogUmVjb3JkIHRoYXQgYWxsIG9mIHRoZSBjb21wb25lbnRzIHdpdGhpbiB0aGUgZ2l2ZW4gaW5wdXQgZmlsZSBwYXRoIGhhZCBjb2RlIGdlbmVyYXRlZCAtIHRoYXRcbiAgICogaXMsIGNvdmVyYWdlIGZvciB0aGUgZmlsZSBjYW4gYmUgY29uc2lkZXJlZCBjb21wbGV0ZS5cbiAgICovXG4gIHJlY29yZENvbXBsZXRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkO1xufVxuXG4vKipcbiAqIEhvdyBhIHR5cGUtY2hlY2tpbmcgY29udGV4dCBzaG91bGQgaGFuZGxlIG9wZXJhdGlvbnMgd2hpY2ggd291bGQgcmVxdWlyZSBpbmxpbmluZy5cbiAqL1xuZXhwb3J0IGVudW0gSW5saW5pbmdNb2RlIHtcbiAgLyoqXG4gICAqIFVzZSBpbmxpbmluZyBvcGVyYXRpb25zIHdoZW4gcmVxdWlyZWQuXG4gICAqL1xuICBJbmxpbmVPcHMsXG5cbiAgLyoqXG4gICAqIFByb2R1Y2UgZGlhZ25vc3RpY3MgaWYgYW4gb3BlcmF0aW9uIHdvdWxkIHJlcXVpcmUgaW5saW5pbmcuXG4gICAqL1xuICBFcnJvcixcbn1cblxuLyoqXG4gKiBBIHRlbXBsYXRlIHR5cGUgY2hlY2tpbmcgY29udGV4dCBmb3IgYSBwcm9ncmFtLlxuICpcbiAqIFRoZSBgVHlwZUNoZWNrQ29udGV4dGAgYWxsb3dzIHJlZ2lzdHJhdGlvbiBvZiBjb21wb25lbnRzIGFuZCB0aGVpciB0ZW1wbGF0ZXMgd2hpY2ggbmVlZCB0byBiZVxuICogdHlwZSBjaGVja2VkLlxuICovXG5leHBvcnQgY2xhc3MgVHlwZUNoZWNrQ29udGV4dEltcGwgaW1wbGVtZW50cyBUeXBlQ2hlY2tDb250ZXh0IHtcbiAgcHJpdmF0ZSBmaWxlTWFwID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZyxcbiAgICAgIHByaXZhdGUgY29tcGlsZXJIb3N0OiBQaWNrPHRzLkNvbXBpbGVySG9zdCwgJ2dldENhbm9uaWNhbEZpbGVOYW1lJz4sXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgaG9zdDogVHlwZUNoZWNraW5nSG9zdCwgcHJpdmF0ZSBpbmxpbmluZzogSW5saW5pbmdNb2RlLCBwcml2YXRlIHBlcmY6IFBlcmZSZWNvcmRlcikge1xuICAgIGlmIChpbmxpbmluZyA9PT0gSW5saW5pbmdNb2RlLkVycm9yICYmIGNvbmZpZy51c2VJbmxpbmVUeXBlQ29uc3RydWN0b3JzKSB7XG4gICAgICAvLyBXZSBjYW5ub3QgdXNlIGlubGluaW5nIGZvciB0eXBlIGNoZWNraW5nIHNpbmNlIHRoaXMgZW52aXJvbm1lbnQgZG9lcyBub3Qgc3VwcG9ydCBpdC5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uRXJyb3I6IGludmFsaWQgaW5saW5pbmcgY29uZmlndXJhdGlvbi5gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQSBgTWFwYCBvZiBgdHMuU291cmNlRmlsZWBzIHRoYXQgdGhlIGNvbnRleHQgaGFzIHNlZW4gdG8gdGhlIG9wZXJhdGlvbnMgKGFkZGl0aW9ucyBvZiBtZXRob2RzXG4gICAqIG9yIHR5cGUtY2hlY2sgYmxvY2tzKSB0aGF0IG5lZWQgdG8gYmUgZXZlbnR1YWxseSBwZXJmb3JtZWQgb24gdGhhdCBmaWxlLlxuICAgKi9cbiAgcHJpdmF0ZSBvcE1hcCA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgT3BbXT4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIHdoZW4gYW4gYSBwYXJ0aWN1bGFyIGNsYXNzIGhhcyBhIHBlbmRpbmcgdHlwZSBjb25zdHJ1Y3RvciBwYXRjaGluZyBvcGVyYXRpb24gYWxyZWFkeVxuICAgKiBxdWV1ZWQuXG4gICAqL1xuICBwcml2YXRlIHR5cGVDdG9yUGVuZGluZyA9IG5ldyBTZXQ8dHMuQ2xhc3NEZWNsYXJhdGlvbj4oKTtcblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSB0ZW1wbGF0ZSB0byBwb3RlbnRpYWxseSBiZSB0eXBlLWNoZWNrZWQuXG4gICAqXG4gICAqIEltcGxlbWVudHMgYFR5cGVDaGVja0NvbnRleHQuYWRkVGVtcGxhdGVgLlxuICAgKi9cbiAgYWRkVGVtcGxhdGUoXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIGJpbmRlcjogUjNUYXJnZXRCaW5kZXI8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+LCB0ZW1wbGF0ZTogVG1wbEFzdE5vZGVbXSxcbiAgICAgIHBpcGVzOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4+LFxuICAgICAgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSwgc291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBmaWxlOiBQYXJzZVNvdXJjZUZpbGUsXG4gICAgICBwYXJzZUVycm9yczogUGFyc2VFcnJvcltdfG51bGwpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaG9zdC5zaG91bGRDaGVja0NvbXBvbmVudChyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZGF0YUZvckZpbGUocmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICBjb25zdCBzaGltRGF0YSA9IHRoaXMucGVuZGluZ1NoaW1Gb3JDb21wb25lbnQocmVmLm5vZGUpO1xuICAgIGNvbnN0IHRlbXBsYXRlSWQgPSBmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQocmVmLm5vZGUpO1xuXG4gICAgY29uc3QgdGVtcGxhdGVEaWFnbm9zdGljczogVGVtcGxhdGVEaWFnbm9zdGljW10gPSBbXTtcblxuICAgIGlmIChwYXJzZUVycm9ycyAhPT0gbnVsbCkge1xuICAgICAgdGVtcGxhdGVEaWFnbm9zdGljcy5wdXNoKFxuICAgICAgICAgIC4uLnRoaXMuZ2V0VGVtcGxhdGVEaWFnbm9zdGljcyhwYXJzZUVycm9ycywgdGVtcGxhdGVJZCwgc291cmNlTWFwcGluZykpO1xuICAgIH1cblxuICAgIGNvbnN0IGJvdW5kVGFyZ2V0ID0gYmluZGVyLmJpbmQoe3RlbXBsYXRlfSk7XG5cbiAgICBpZiAodGhpcy5pbmxpbmluZyA9PT0gSW5saW5pbmdNb2RlLklubGluZU9wcykge1xuICAgICAgLy8gR2V0IGFsbCBvZiB0aGUgZGlyZWN0aXZlcyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBhbmQgcmVjb3JkIGlubGluZSB0eXBlIGNvbnN0cnVjdG9ycyB3aGVuXG4gICAgICAvLyByZXF1aXJlZC5cbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIGJvdW5kVGFyZ2V0LmdldFVzZWREaXJlY3RpdmVzKCkpIHtcbiAgICAgICAgY29uc3QgZGlyUmVmID0gZGlyLnJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG4gICAgICAgIGNvbnN0IGRpck5vZGUgPSBkaXJSZWYubm9kZTtcblxuICAgICAgICBpZiAoIWRpci5pc0dlbmVyaWMgfHwgIXJlcXVpcmVzSW5saW5lVHlwZUN0b3IoZGlyTm9kZSwgdGhpcy5yZWZsZWN0b3IpKSB7XG4gICAgICAgICAgLy8gaW5saW5pbmcgbm90IHJlcXVpcmVkXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgYW4gaW5saW5lIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIGZvciB0aGUgZGlyZWN0aXZlLlxuICAgICAgICB0aGlzLmFkZElubGluZVR5cGVDdG9yKGZpbGVEYXRhLCBkaXJOb2RlLmdldFNvdXJjZUZpbGUoKSwgZGlyUmVmLCB7XG4gICAgICAgICAgZm5OYW1lOiAnbmdUeXBlQ3RvcicsXG4gICAgICAgICAgLy8gVGhlIGNvbnN0cnVjdG9yIHNob3VsZCBoYXZlIGEgYm9keSBpZiB0aGUgZGlyZWN0aXZlIGNvbWVzIGZyb20gYSAudHMgZmlsZSwgYnV0IG5vdCBpZlxuICAgICAgICAgIC8vIGl0IGNvbWVzIGZyb20gYSAuZC50cyBmaWxlLiAuZC50cyBkZWNsYXJhdGlvbnMgZG9uJ3QgaGF2ZSBib2RpZXMuXG4gICAgICAgICAgYm9keTogIWRpck5vZGUuZ2V0U291cmNlRmlsZSgpLmlzRGVjbGFyYXRpb25GaWxlLFxuICAgICAgICAgIGZpZWxkczoge1xuICAgICAgICAgICAgaW5wdXRzOiBkaXIuaW5wdXRzLmNsYXNzUHJvcGVydHlOYW1lcyxcbiAgICAgICAgICAgIG91dHB1dHM6IGRpci5vdXRwdXRzLmNsYXNzUHJvcGVydHlOYW1lcyxcbiAgICAgICAgICAgIC8vIFRPRE8oYWx4aHViKTogc3VwcG9ydCBxdWVyaWVzXG4gICAgICAgICAgICBxdWVyaWVzOiBkaXIucXVlcmllcyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvZXJjZWRJbnB1dEZpZWxkczogZGlyLmNvZXJjZWRJbnB1dEZpZWxkcyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2hpbURhdGEudGVtcGxhdGVzLnNldCh0ZW1wbGF0ZUlkLCB7XG4gICAgICB0ZW1wbGF0ZSxcbiAgICAgIGJvdW5kVGFyZ2V0LFxuICAgICAgdGVtcGxhdGVEaWFnbm9zdGljcyxcbiAgICB9KTtcblxuICAgIGNvbnN0IGlubGluaW5nUmVxdWlyZW1lbnQgPSByZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrKHJlZi5ub2RlLCBwaXBlcywgdGhpcy5yZWZsZWN0b3IpO1xuXG4gICAgLy8gSWYgaW5saW5pbmcgaXMgbm90IHN1cHBvcnRlZCwgYnV0IGlzIHJlcXVpcmVkIGZvciBlaXRoZXIgdGhlIFRDQiBvciBvbmUgb2YgaXRzIGRpcmVjdGl2ZVxuICAgIC8vIGRlcGVuZGVuY2llcywgdGhlbiBleGl0IGhlcmUgd2l0aCBhbiBlcnJvci5cbiAgICBpZiAodGhpcy5pbmxpbmluZyA9PT0gSW5saW5pbmdNb2RlLkVycm9yICYmXG4gICAgICAgIGlubGluaW5nUmVxdWlyZW1lbnQgPT09IFRjYklubGluaW5nUmVxdWlyZW1lbnQuTXVzdElubGluZSkge1xuICAgICAgLy8gVGhpcyB0ZW1wbGF0ZSBjYW5ub3QgYmUgc3VwcG9ydGVkIGJlY2F1c2UgdGhlIHVuZGVybHlpbmcgc3RyYXRlZ3kgZG9lcyBub3Qgc3VwcG9ydCBpbmxpbmluZ1xuICAgICAgLy8gYW5kIGlubGluaW5nIHdvdWxkIGJlIHJlcXVpcmVkLlxuXG4gICAgICAvLyBSZWNvcmQgZGlhZ25vc3RpY3MgdG8gaW5kaWNhdGUgdGhlIGlzc3VlcyB3aXRoIHRoaXMgdGVtcGxhdGUuXG4gICAgICBzaGltRGF0YS5vb2JSZWNvcmRlci5yZXF1aXJlc0lubGluZVRjYih0ZW1wbGF0ZUlkLCByZWYubm9kZSk7XG5cbiAgICAgIC8vIENoZWNraW5nIHRoaXMgdGVtcGxhdGUgd291bGQgYmUgdW5zdXBwb3J0ZWQsIHNvIGRvbid0IHRyeS5cbiAgICAgIHRoaXMucGVyZi5ldmVudENvdW50KFBlcmZFdmVudC5Ta2lwR2VuZXJhdGVUY2JOb0lubGluZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgbWV0YSA9IHtcbiAgICAgIGlkOiBmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyLmNhcHR1cmVTb3VyY2UocmVmLm5vZGUsIHNvdXJjZU1hcHBpbmcsIGZpbGUpLFxuICAgICAgYm91bmRUYXJnZXQsXG4gICAgICBwaXBlcyxcbiAgICAgIHNjaGVtYXMsXG4gICAgfTtcbiAgICB0aGlzLnBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuR2VuZXJhdGVUY2IpO1xuICAgIGlmIChpbmxpbmluZ1JlcXVpcmVtZW50ICE9PSBUY2JJbmxpbmluZ1JlcXVpcmVtZW50Lk5vbmUgJiZcbiAgICAgICAgdGhpcy5pbmxpbmluZyA9PT0gSW5saW5pbmdNb2RlLklubGluZU9wcykge1xuICAgICAgLy8gVGhpcyBjbGFzcyBkaWRuJ3QgbWVldCB0aGUgcmVxdWlyZW1lbnRzIGZvciBleHRlcm5hbCB0eXBlIGNoZWNraW5nLCBzbyBnZW5lcmF0ZSBhbiBpbmxpbmVcbiAgICAgIC8vIFRDQiBmb3IgdGhlIGNsYXNzLlxuICAgICAgdGhpcy5hZGRJbmxpbmVUeXBlQ2hlY2tCbG9jayhmaWxlRGF0YSwgc2hpbURhdGEsIHJlZiwgbWV0YSk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgaW5saW5pbmdSZXF1aXJlbWVudCA9PT0gVGNiSW5saW5pbmdSZXF1aXJlbWVudC5TaG91bGRJbmxpbmVGb3JHZW5lcmljQm91bmRzICYmXG4gICAgICAgIHRoaXMuaW5saW5pbmcgPT09IElubGluaW5nTW9kZS5FcnJvcikge1xuICAgICAgLy8gSXQncyBzdWdnZXN0ZWQgdGhhdCB0aGlzIFRDQiBzaG91bGQgYmUgZ2VuZXJhdGVkIGlubGluZSBkdWUgdG8gdGhlIGNvbXBvbmVudCdzIGdlbmVyaWNcbiAgICAgIC8vIGJvdW5kcywgYnV0IGlubGluaW5nIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQuIFVzZSBhIG5vbi1pbmxpbmUgdHlwZVxuICAgICAgLy8gY2hlY2sgYmxvY2ssIGJ1dCBmYWxsIGJhY2sgdG8gYGFueWAgZ2VuZXJpYyBwYXJhbWV0ZXJzIHNpbmNlIHRoZSBnZW5lcmljIGJvdW5kcyBjYW4ndCBiZVxuICAgICAgLy8gcmVmZXJlbmNlZCBpbiB0aGF0IGNvbnRleHQuIFRoaXMgd2lsbCBpbmZlciBhIGxlc3MgdXNlZnVsIHR5cGUgZm9yIHRoZSBjb21wb25lbnQsIGJ1dCBhbGxvd1xuICAgICAgLy8gZm9yIHR5cGUtY2hlY2tpbmcgaXQgaW4gYW4gZW52aXJvbm1lbnQgd2hlcmUgdGhhdCB3b3VsZCBub3QgYmUgcG9zc2libGUgb3RoZXJ3aXNlLlxuICAgICAgc2hpbURhdGEuZmlsZS5hZGRUeXBlQ2hlY2tCbG9jayhcbiAgICAgICAgICByZWYsIG1ldGEsIHNoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIsIHNoaW1EYXRhLm9vYlJlY29yZGVyLFxuICAgICAgICAgIFRjYkdlbmVyaWNDb250ZXh0QmVoYXZpb3IuRmFsbGJhY2tUb0FueSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNoaW1EYXRhLmZpbGUuYWRkVHlwZUNoZWNrQmxvY2soXG4gICAgICAgICAgcmVmLCBtZXRhLCBzaGltRGF0YS5kb21TY2hlbWFDaGVja2VyLCBzaGltRGF0YS5vb2JSZWNvcmRlcixcbiAgICAgICAgICBUY2JHZW5lcmljQ29udGV4dEJlaGF2aW9yLlVzZUVtaXR0ZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmQgYSB0eXBlIGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gYG5vZGVgIHdpdGggdGhlIGdpdmVuIGBjdG9yTWV0YWRhdGFgLlxuICAgKi9cbiAgYWRkSW5saW5lVHlwZUN0b3IoXG4gICAgICBmaWxlRGF0YTogUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhLCBzZjogdHMuU291cmNlRmlsZSxcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LCBjdG9yTWV0YTogVHlwZUN0b3JNZXRhZGF0YSk6IHZvaWQge1xuICAgIGlmICh0aGlzLnR5cGVDdG9yUGVuZGluZy5oYXMocmVmLm5vZGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMudHlwZUN0b3JQZW5kaW5nLmFkZChyZWYubm9kZSk7XG5cbiAgICAvLyBMYXppbHkgY29uc3RydWN0IHRoZSBvcGVyYXRpb24gbWFwLlxuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikhO1xuXG4gICAgLy8gUHVzaCBhIGBUeXBlQ3Rvck9wYCBpbnRvIHRoZSBvcGVyYXRpb24gcXVldWUgZm9yIHRoZSBzb3VyY2UgZmlsZS5cbiAgICBvcHMucHVzaChuZXcgVHlwZUN0b3JPcChyZWYsIGN0b3JNZXRhKSk7XG4gICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIGEgYHRzLlNvdXJjZUZpbGVgIGludG8gYSB2ZXJzaW9uIHRoYXQgaW5jbHVkZXMgdHlwZSBjaGVja2luZyBjb2RlLlxuICAgKlxuICAgKiBJZiB0aGlzIHBhcnRpY3VsYXIgYHRzLlNvdXJjZUZpbGVgIHJlcXVpcmVzIGNoYW5nZXMsIHRoZSB0ZXh0IHJlcHJlc2VudGluZyBpdHMgbmV3IGNvbnRlbnRzXG4gICAqIHdpbGwgYmUgcmV0dXJuZWQuIE90aGVyd2lzZSwgYSBgbnVsbGAgcmV0dXJuIGluZGljYXRlcyBubyBjaGFuZ2VzIHdlcmUgbmVjZXNzYXJ5LlxuICAgKi9cbiAgdHJhbnNmb3JtKHNmOiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nfG51bGwge1xuICAgIC8vIElmIHRoZXJlIGFyZSBubyBvcGVyYXRpb25zIHBlbmRpbmcgZm9yIHRoaXMgcGFydGljdWxhciBmaWxlLCByZXR1cm4gYG51bGxgIHRvIGluZGljYXRlIG5vXG4gICAgLy8gY2hhbmdlcy5cbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSW1wb3J0cyBtYXkgbmVlZCB0byBiZSBhZGRlZCB0byB0aGUgZmlsZSB0byBzdXBwb3J0IHR5cGUtY2hlY2tpbmcgb2YgZGlyZWN0aXZlcyB1c2VkIGluIHRoZVxuICAgIC8vIHRlbXBsYXRlIHdpdGhpbiBpdC5cbiAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIobmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpLCAnX2knKTtcblxuICAgIC8vIEVhY2ggT3AgaGFzIGEgc3BsaXRQb2ludCBpbmRleCBpbnRvIHRoZSB0ZXh0IHdoZXJlIGl0IG5lZWRzIHRvIGJlIGluc2VydGVkLiBTcGxpdCB0aGVcbiAgICAvLyBvcmlnaW5hbCBzb3VyY2UgdGV4dCBpbnRvIGNodW5rcyBhdCB0aGVzZSBzcGxpdCBwb2ludHMsIHdoZXJlIGNvZGUgd2lsbCBiZSBpbnNlcnRlZCBiZXR3ZWVuXG4gICAgLy8gdGhlIGNodW5rcy5cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikhLnNvcnQob3JkZXJPcHMpO1xuICAgIGNvbnN0IHRleHRQYXJ0cyA9IHNwbGl0U3RyaW5nQXRQb2ludHMoc2YudGV4dCwgb3BzLm1hcChvcCA9PiBvcC5zcGxpdFBvaW50KSk7XG5cbiAgICAvLyBVc2UgYSBgdHMuUHJpbnRlcmAgdG8gZ2VuZXJhdGUgc291cmNlIGNvZGUuXG4gICAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoe29taXRUcmFpbGluZ1NlbWljb2xvbjogdHJ1ZX0pO1xuXG4gICAgLy8gQmVnaW4gd2l0aCB0aGUgaW50aWFsIHNlY3Rpb24gb2YgdGhlIGNvZGUgdGV4dC5cbiAgICBsZXQgY29kZSA9IHRleHRQYXJ0c1swXTtcblxuICAgIC8vIFByb2Nlc3MgZWFjaCBvcGVyYXRpb24gYW5kIHVzZSB0aGUgcHJpbnRlciB0byBnZW5lcmF0ZSBzb3VyY2UgY29kZSBmb3IgaXQsIGluc2VydGluZyBpdCBpbnRvXG4gICAgLy8gdGhlIHNvdXJjZSBjb2RlIGluIGJldHdlZW4gdGhlIG9yaWdpbmFsIGNodW5rcy5cbiAgICBvcHMuZm9yRWFjaCgob3AsIGlkeCkgPT4ge1xuICAgICAgY29uc3QgdGV4dCA9IG9wLmV4ZWN1dGUoaW1wb3J0TWFuYWdlciwgc2YsIHRoaXMucmVmRW1pdHRlciwgcHJpbnRlcik7XG4gICAgICBjb2RlICs9ICdcXG5cXG4nICsgdGV4dCArIHRleHRQYXJ0c1tpZHggKyAxXTtcbiAgICB9KTtcblxuICAgIC8vIFdyaXRlIG91dCB0aGUgaW1wb3J0cyB0aGF0IG5lZWQgdG8gYmUgYWRkZWQgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgZmlsZS5cbiAgICBsZXQgaW1wb3J0cyA9IGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhzZi5maWxlTmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAubWFwKGkgPT4gYGltcG9ydCAqIGFzICR7aS5xdWFsaWZpZXIudGV4dH0gZnJvbSAnJHtpLnNwZWNpZmllcn0nO2ApXG4gICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcbicpO1xuICAgIGNvZGUgPSBpbXBvcnRzICsgJ1xcbicgKyBjb2RlO1xuXG4gICAgcmV0dXJuIGNvZGU7XG4gIH1cblxuICBmaW5hbGl6ZSgpOiBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVVcGRhdGU+IHtcbiAgICAvLyBGaXJzdCwgYnVpbGQgdGhlIG1hcCBvZiB1cGRhdGVzIHRvIHNvdXJjZSBmaWxlcy5cbiAgICBjb25zdCB1cGRhdGVzID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRmlsZVVwZGF0ZT4oKTtcbiAgICBmb3IgKGNvbnN0IG9yaWdpbmFsU2Ygb2YgdGhpcy5vcE1hcC5rZXlzKCkpIHtcbiAgICAgIGNvbnN0IG5ld1RleHQgPSB0aGlzLnRyYW5zZm9ybShvcmlnaW5hbFNmKTtcbiAgICAgIGlmIChuZXdUZXh0ICE9PSBudWxsKSB7XG4gICAgICAgIHVwZGF0ZXMuc2V0KGFic29sdXRlRnJvbVNvdXJjZUZpbGUob3JpZ2luYWxTZiksIHtcbiAgICAgICAgICBuZXdUZXh0LFxuICAgICAgICAgIG9yaWdpbmFsRmlsZTogb3JpZ2luYWxTZixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhlbiBnbyB0aHJvdWdoIGVhY2ggaW5wdXQgZmlsZSB0aGF0IGhhcyBwZW5kaW5nIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb25zLlxuICAgIGZvciAoY29uc3QgW3NmUGF0aCwgcGVuZGluZ0ZpbGVEYXRhXSBvZiB0aGlzLmZpbGVNYXApIHtcbiAgICAgIC8vIEZvciBlYWNoIGlucHV0IGZpbGUsIGNvbnNpZGVyIGdlbmVyYXRpb24gb3BlcmF0aW9ucyBmb3IgZWFjaCBvZiBpdHMgc2hpbXMuXG4gICAgICBmb3IgKGNvbnN0IHBlbmRpbmdTaGltRGF0YSBvZiBwZW5kaW5nRmlsZURhdGEuc2hpbURhdGEudmFsdWVzKCkpIHtcbiAgICAgICAgdGhpcy5ob3N0LnJlY29yZFNoaW1EYXRhKHNmUGF0aCwge1xuICAgICAgICAgIGdlbmVzaXNEaWFnbm9zdGljczogW1xuICAgICAgICAgICAgLi4ucGVuZGluZ1NoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIuZGlhZ25vc3RpY3MsXG4gICAgICAgICAgICAuLi5wZW5kaW5nU2hpbURhdGEub29iUmVjb3JkZXIuZGlhZ25vc3RpY3MsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBoYXNJbmxpbmVzOiBwZW5kaW5nRmlsZURhdGEuaGFzSW5saW5lcyxcbiAgICAgICAgICBwYXRoOiBwZW5kaW5nU2hpbURhdGEuZmlsZS5maWxlTmFtZSxcbiAgICAgICAgICB0ZW1wbGF0ZXM6IHBlbmRpbmdTaGltRGF0YS50ZW1wbGF0ZXMsXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBzZlRleHQgPSBwZW5kaW5nU2hpbURhdGEuZmlsZS5yZW5kZXIoZmFsc2UgLyogcmVtb3ZlQ29tbWVudHMgKi8pO1xuICAgICAgICB1cGRhdGVzLnNldChwZW5kaW5nU2hpbURhdGEuZmlsZS5maWxlTmFtZSwge1xuICAgICAgICAgIG5ld1RleHQ6IHNmVGV4dCxcblxuICAgICAgICAgIC8vIFNoaW0gZmlsZXMgZG8gbm90IGhhdmUgYW4gYXNzb2NpYXRlZCBvcmlnaW5hbCBmaWxlLlxuICAgICAgICAgIG9yaWdpbmFsRmlsZTogbnVsbCxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHVwZGF0ZXM7XG4gIH1cblxuICBwcml2YXRlIGFkZElubGluZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgZmlsZURhdGE6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSwgc2hpbURhdGE6IFBlbmRpbmdTaGltRGF0YSxcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgdGNiTWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IHNmID0gcmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikhO1xuICAgIG9wcy5wdXNoKG5ldyBJbmxpbmVUY2JPcChcbiAgICAgICAgcmVmLCB0Y2JNZXRhLCB0aGlzLmNvbmZpZywgdGhpcy5yZWZsZWN0b3IsIHNoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIsXG4gICAgICAgIHNoaW1EYXRhLm9vYlJlY29yZGVyKSk7XG4gICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gIH1cblxuICBwcml2YXRlIHBlbmRpbmdTaGltRm9yQ29tcG9uZW50KG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBQZW5kaW5nU2hpbURhdGEge1xuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5kYXRhRm9yRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3Qgc2hpbVBhdGggPSBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3IoYWJzb2x1dGVGcm9tU291cmNlRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSkpO1xuICAgIGlmICghZmlsZURhdGEuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgZmlsZURhdGEuc2hpbURhdGEuc2V0KHNoaW1QYXRoLCB7XG4gICAgICAgIGRvbVNjaGVtYUNoZWNrZXI6IG5ldyBSZWdpc3RyeURvbVNjaGVtYUNoZWNrZXIoZmlsZURhdGEuc291cmNlTWFuYWdlciksXG4gICAgICAgIG9vYlJlY29yZGVyOiBuZXcgT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVySW1wbChmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyKSxcbiAgICAgICAgZmlsZTogbmV3IFR5cGVDaGVja0ZpbGUoXG4gICAgICAgICAgICBzaGltUGF0aCwgdGhpcy5jb25maWcsIHRoaXMucmVmRW1pdHRlciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY29tcGlsZXJIb3N0KSxcbiAgICAgICAgdGVtcGxhdGVzOiBuZXcgTWFwPFRlbXBsYXRlSWQsIFRlbXBsYXRlRGF0YT4oKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZmlsZURhdGEuc2hpbURhdGEuZ2V0KHNoaW1QYXRoKSE7XG4gIH1cblxuICBwcml2YXRlIGRhdGFGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlKTogUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhIHtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcblxuICAgIGlmICghdGhpcy5maWxlTWFwLmhhcyhzZlBhdGgpKSB7XG4gICAgICBjb25zdCBkYXRhOiBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEgPSB7XG4gICAgICAgIGhhc0lubGluZXM6IGZhbHNlLFxuICAgICAgICBzb3VyY2VNYW5hZ2VyOiB0aGlzLmhvc3QuZ2V0U291cmNlTWFuYWdlcihzZlBhdGgpLFxuICAgICAgICBzaGltRGF0YTogbmV3IE1hcCgpLFxuICAgICAgfTtcbiAgICAgIHRoaXMuZmlsZU1hcC5zZXQoc2ZQYXRoLCBkYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5maWxlTWFwLmdldChzZlBhdGgpITtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVEaWFnbm9zdGljcyhcbiAgICAgIHBhcnNlRXJyb3JzOiBQYXJzZUVycm9yW10sIHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsXG4gICAgICBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmcpOiBUZW1wbGF0ZURpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHBhcnNlRXJyb3JzLm1hcChlcnJvciA9PiB7XG4gICAgICBjb25zdCBzcGFuID0gZXJyb3Iuc3BhbjtcblxuICAgICAgaWYgKHNwYW4uc3RhcnQub2Zmc2V0ID09PSBzcGFuLmVuZC5vZmZzZXQpIHtcbiAgICAgICAgLy8gVGVtcGxhdGUgZXJyb3JzIGNhbiBjb250YWluIHplcm8tbGVuZ3RoIHNwYW5zLCBpZiB0aGUgZXJyb3Igb2NjdXJzIGF0IGEgc2luZ2xlIHBvaW50LlxuICAgICAgICAvLyBIb3dldmVyLCBUeXBlU2NyaXB0IGRvZXMgbm90IGhhbmRsZSBkaXNwbGF5aW5nIGEgemVyby1sZW5ndGggZGlhZ25vc3RpYyB2ZXJ5IHdlbGwsIHNvXG4gICAgICAgIC8vIGluY3JlYXNlIHRoZSBlbmRpbmcgb2Zmc2V0IGJ5IDEgZm9yIHN1Y2ggZXJyb3JzLCB0byBlbnN1cmUgdGhlIHBvc2l0aW9uIGlzIHNob3duIGluIHRoZVxuICAgICAgICAvLyBkaWFnbm9zdGljLlxuICAgICAgICBzcGFuLmVuZC5vZmZzZXQrKztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgICAgdGVtcGxhdGVJZCwgc291cmNlTWFwcGluZywgc3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIG5nRXJyb3JDb2RlKEVycm9yQ29kZS5URU1QTEFURV9QQVJTRV9FUlJPUiksIGVycm9yLm1zZyk7XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb24gdGhhdCBuZWVkcyB0byBoYXBwZW4gd2l0aGluIGEgZ2l2ZW4gc291cmNlIGZpbGUuXG4gKi9cbmludGVyZmFjZSBPcCB7XG4gIC8qKlxuICAgKiBUaGUgbm9kZSBpbiB0aGUgZmlsZSB3aGljaCB3aWxsIGhhdmUgY29kZSBnZW5lcmF0ZWQgZm9yIGl0LlxuICAgKi9cbiAgcmVhZG9ubHkgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG5cbiAgLyoqXG4gICAqIEluZGV4IGludG8gdGhlIHNvdXJjZSB0ZXh0IHdoZXJlIHRoZSBjb2RlIGdlbmVyYXRlZCBieSB0aGUgb3BlcmF0aW9uIHNob3VsZCBiZSBpbnNlcnRlZC5cbiAgICovXG4gIHJlYWRvbmx5IHNwbGl0UG9pbnQ6IG51bWJlcjtcblxuICAvKipcbiAgICogRXhlY3V0ZSB0aGUgb3BlcmF0aW9uIGFuZCByZXR1cm4gdGhlIGdlbmVyYXRlZCBjb2RlIGFzIHRleHQuXG4gICAqL1xuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB0eXBlIGNoZWNrIGJsb2NrIG9wZXJhdGlvbiB3aGljaCBwcm9kdWNlcyBpbmxpbmUgdHlwZSBjaGVjayBjb2RlIGZvciBhIHBhcnRpY3VsYXIgY29tcG9uZW50LlxuICovXG5jbGFzcyBJbmxpbmVUY2JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHJlYWRvbmx5IG1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIHJlYWRvbmx5IGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnLFxuICAgICAgcmVhZG9ubHkgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcmVhZG9ubHkgZG9tU2NoZW1hQ2hlY2tlcjogRG9tU2NoZW1hQ2hlY2tlcixcbiAgICAgIHJlYWRvbmx5IG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY2hlY2sgYmxvY2tzIGFyZSBpbnNlcnRlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgZW5kIG9mIHRoZSBjb21wb25lbnQgY2xhc3MuXG4gICAqL1xuICBnZXQgc3BsaXRQb2ludCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnJlZi5ub2RlLmVuZCArIDE7XG4gIH1cblxuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmcge1xuICAgIGNvbnN0IGVudiA9IG5ldyBFbnZpcm9ubWVudCh0aGlzLmNvbmZpZywgaW0sIHJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yLCBzZik7XG4gICAgY29uc3QgZm5OYW1lID0gdHMuY3JlYXRlSWRlbnRpZmllcihgX3RjYl8ke3RoaXMucmVmLm5vZGUucG9zfWApO1xuXG4gICAgLy8gSW5saW5lIFRDQnMgc2hvdWxkIGNvcHkgYW55IGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXIgbm9kZXMgZGlyZWN0bHksIGFzIHRoZSBUQ0IgY29kZSBpcyBpbmxpbmVkXG4gICAgLy8gaW50byB0aGUgY2xhc3MgaW4gYSBjb250ZXh0IHdoZXJlIHRoYXQgd2lsbCBhbHdheXMgYmUgbGVnYWwuXG4gICAgY29uc3QgZm4gPSBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgICBlbnYsIHRoaXMucmVmLCBmbk5hbWUsIHRoaXMubWV0YSwgdGhpcy5kb21TY2hlbWFDaGVja2VyLCB0aGlzLm9vYlJlY29yZGVyLFxuICAgICAgICBUY2JHZW5lcmljQ29udGV4dEJlaGF2aW9yLkNvcHlDbGFzc05vZGVzKTtcbiAgICByZXR1cm4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIGZuLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIHdoaWNoIHByb2R1Y2VzIHR5cGUgY29uc3RydWN0b3IgY29kZSBmb3IgYSBwYXJ0aWN1bGFyIGRpcmVjdGl2ZS5cbiAqL1xuY2xhc3MgVHlwZUN0b3JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHJlYWRvbmx5IG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9ucyBhcmUgaW5zZXJ0ZWQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBlbmQgb2YgdGhlIGRpcmVjdGl2ZSBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucmVmLm5vZGUuZW5kIC0gMTtcbiAgfVxuXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZyB7XG4gICAgY29uc3QgdGNiID0gZ2VuZXJhdGVJbmxpbmVUeXBlQ3Rvcih0aGlzLnJlZi5ub2RlLCB0aGlzLm1ldGEpO1xuICAgIHJldHVybiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdGNiLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wYXJlIHR3byBvcGVyYXRpb25zIGFuZCByZXR1cm4gdGhlaXIgc3BsaXQgcG9pbnQgb3JkZXJpbmcuXG4gKi9cbmZ1bmN0aW9uIG9yZGVyT3BzKG9wMTogT3AsIG9wMjogT3ApOiBudW1iZXIge1xuICByZXR1cm4gb3AxLnNwbGl0UG9pbnQgLSBvcDIuc3BsaXRQb2ludDtcbn1cblxuLyoqXG4gKiBTcGxpdCBhIHN0cmluZyBpbnRvIGNodW5rcyBhdCBhbnkgbnVtYmVyIG9mIHNwbGl0IHBvaW50cy5cbiAqL1xuZnVuY3Rpb24gc3BsaXRTdHJpbmdBdFBvaW50cyhzdHI6IHN0cmluZywgcG9pbnRzOiBudW1iZXJbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgc3BsaXRzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgc3RhcnQgPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBvaW50ID0gcG9pbnRzW2ldO1xuICAgIHNwbGl0cy5wdXNoKHN0ci5zdWJzdHJpbmcoc3RhcnQsIHBvaW50KSk7XG4gICAgc3RhcnQgPSBwb2ludDtcbiAgfVxuICBzcGxpdHMucHVzaChzdHIuc3Vic3RyaW5nKHN0YXJ0KSk7XG4gIHJldHVybiBzcGxpdHM7XG59XG4iXX0=