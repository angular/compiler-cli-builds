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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/context", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/diagnostics", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/dom", "@angular/compiler-cli/src/ngtsc/typecheck/src/environment", "@angular/compiler-cli/src/ngtsc/typecheck/src/oob", "@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor"], factory);
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
        function TypeCheckContextImpl(config, compilerHost, componentMappingStrategy, refEmitter, reflector, host, inlining) {
            this.config = config;
            this.compilerHost = compilerHost;
            this.componentMappingStrategy = componentMappingStrategy;
            this.refEmitter = refEmitter;
            this.reflector = reflector;
            this.host = host;
            this.inlining = inlining;
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
                return;
            }
            var meta = {
                id: fileData.sourceManager.captureSource(ref.node, sourceMapping, file),
                boundTarget: boundTarget,
                pipes: pipes,
                schemas: schemas,
            };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwyRUFBbUY7SUFDbkYsK0JBQWlDO0lBRWpDLDJFQUF5RTtJQUN6RSxtRUFBOEU7SUFFOUUseUVBQStDO0lBRS9DLHFGQUEwRTtJQUUxRSx5RUFBaUU7SUFDakUseUZBQTBDO0lBQzFDLHlFQUFtRjtJQUVuRixtRkFBd0Q7SUFDeEQsbUdBQTBEO0lBQzFELGlHQUFnRDtJQUNoRCxtR0FBa0Y7SUE4SGxGOztPQUVHO0lBQ0gsSUFBWSxZQVVYO0lBVkQsV0FBWSxZQUFZO1FBQ3RCOztXQUVHO1FBQ0gseURBQVMsQ0FBQTtRQUVUOztXQUVHO1FBQ0gsaURBQUssQ0FBQTtJQUNQLENBQUMsRUFWVyxZQUFZLEdBQVosb0JBQVksS0FBWixvQkFBWSxRQVV2QjtJQUVEOzs7OztPQUtHO0lBQ0g7UUFHRSw4QkFDWSxNQUEwQixFQUMxQixZQUEyRCxFQUMzRCx3QkFBd0QsRUFDeEQsVUFBNEIsRUFBVSxTQUF5QixFQUMvRCxJQUFzQixFQUFVLFFBQXNCO1lBSnRELFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQzFCLGlCQUFZLEdBQVosWUFBWSxDQUErQztZQUMzRCw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQWdDO1lBQ3hELGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDL0QsU0FBSSxHQUFKLElBQUksQ0FBa0I7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFjO1lBUDFELFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBK0MsQ0FBQztZQWN6RTs7O2VBR0c7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7WUFF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O1FBQ3hELElBQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztRQUM1QixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN0QyxJQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLEtBQUssR0FBRyxLQUFLLENBQUM7U0FDZjtRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtCb3VuZFRhcmdldCwgUGFyc2VFcnJvciwgUGFyc2VTb3VyY2VGaWxlLCBSM1RhcmdldEJpbmRlciwgU2NoZW1hTWV0YWRhdGEsIFRlbXBsYXRlUGFyc2VFcnJvciwgVG1wbEFzdE5vZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7RXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9kaWFnbm9zdGljcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOb29wSW1wb3J0UmV3cml0ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5pbXBvcnQge0NvbXBvbmVudFRvU2hpbU1hcHBpbmdTdHJhdGVneSwgVGVtcGxhdGVJZCwgVGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgVHlwZUNoZWNrQ29udGV4dCwgVHlwZUNoZWNraW5nQ29uZmlnLCBUeXBlQ3Rvck1ldGFkYXRhfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHttYWtlVGVtcGxhdGVEaWFnbm9zdGljLCBUZW1wbGF0ZURpYWdub3N0aWN9IGZyb20gJy4uL2RpYWdub3N0aWNzJztcblxuaW1wb3J0IHtEb21TY2hlbWFDaGVja2VyLCBSZWdpc3RyeURvbVNjaGVtYUNoZWNrZXJ9IGZyb20gJy4vZG9tJztcbmltcG9ydCB7RW52aXJvbm1lbnR9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuaW1wb3J0IHtPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIsIE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlckltcGx9IGZyb20gJy4vb29iJztcbmltcG9ydCB7VGVtcGxhdGVTb3VyY2VNYW5hZ2VyfSBmcm9tICcuL3NvdXJjZSc7XG5pbXBvcnQge3JlcXVpcmVzSW5saW5lVHlwZUNoZWNrQmxvY2t9IGZyb20gJy4vdGNiX3V0aWwnO1xuaW1wb3J0IHtnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrfSBmcm9tICcuL3R5cGVfY2hlY2tfYmxvY2snO1xuaW1wb3J0IHtUeXBlQ2hlY2tGaWxlfSBmcm9tICcuL3R5cGVfY2hlY2tfZmlsZSc7XG5pbXBvcnQge2dlbmVyYXRlSW5saW5lVHlwZUN0b3IsIHJlcXVpcmVzSW5saW5lVHlwZUN0b3J9IGZyb20gJy4vdHlwZV9jb25zdHJ1Y3Rvcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2hpbVR5cGVDaGVja2luZ0RhdGEge1xuICAvKipcbiAgICogUGF0aCB0byB0aGUgc2hpbSBmaWxlLlxuICAgKi9cbiAgcGF0aDogQWJzb2x1dGVGc1BhdGg7XG5cbiAgLyoqXG4gICAqIEFueSBgdHMuRGlhZ25vc3RpY2BzIHdoaWNoIHdlcmUgcHJvZHVjZWQgZHVyaW5nIHRoZSBnZW5lcmF0aW9uIG9mIHRoaXMgc2hpbS5cbiAgICpcbiAgICogU29tZSBkaWFnbm9zdGljcyBhcmUgcHJvZHVjZWQgZHVyaW5nIGNyZWF0aW9uIHRpbWUgYW5kIGFyZSB0cmFja2VkIGhlcmUuXG4gICAqL1xuICBnZW5lc2lzRGlhZ25vc3RpY3M6IFRlbXBsYXRlRGlhZ25vc3RpY1tdO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGFueSBpbmxpbmUgb3BlcmF0aW9ucyBmb3IgdGhlIGlucHV0IGZpbGUgd2VyZSByZXF1aXJlZCB0byBnZW5lcmF0ZSB0aGlzIHNoaW0uXG4gICAqL1xuICBoYXNJbmxpbmVzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgYFRlbXBsYXRlSWRgIHRvIGluZm9ybWF0aW9uIGNvbGxlY3RlZCBhYm91dCB0aGUgdGVtcGxhdGUgZHVyaW5nIHRoZSB0ZW1wbGF0ZVxuICAgKiB0eXBlLWNoZWNraW5nIHByb2Nlc3MuXG4gICAqL1xuICB0ZW1wbGF0ZXM6IE1hcDxUZW1wbGF0ZUlkLCBUZW1wbGF0ZURhdGE+O1xufVxuXG4vKipcbiAqIERhdGEgdHJhY2tlZCBmb3IgZWFjaCB0ZW1wbGF0ZSBwcm9jZXNzZWQgYnkgdGhlIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgc3lzdGVtLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlRGF0YSB7XG4gIC8qKlxuICAgKiBUZW1wbGF0ZSBub2RlcyBmb3Igd2hpY2ggdGhlIFRDQiB3YXMgZ2VuZXJhdGVkLlxuICAgKi9cbiAgdGVtcGxhdGU6IFRtcGxBc3ROb2RlW107XG5cbiAgLyoqXG4gICAqIGBCb3VuZFRhcmdldGAgd2hpY2ggd2FzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIFRDQiwgYW5kIGNvbnRhaW5zIGJpbmRpbmdzIGZvciB0aGUgYXNzb2NpYXRlZFxuICAgKiB0ZW1wbGF0ZSBub2Rlcy5cbiAgICovXG4gIGJvdW5kVGFyZ2V0OiBCb3VuZFRhcmdldDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT47XG5cbiAgLyoqXG4gICAqIEVycm9ycyBmb3VuZCB3aGlsZSBwYXJzaW5nIHRoZW0gdGVtcGxhdGUsIHdoaWNoIGhhdmUgYmVlbiBjb252ZXJ0ZWQgdG8gZGlhZ25vc3RpY3MuXG4gICAqL1xuICB0ZW1wbGF0ZURpYWdub3N0aWNzOiBUZW1wbGF0ZURpYWdub3N0aWNbXTtcbn1cblxuLyoqXG4gKiBEYXRhIGZvciBhbiBpbnB1dCBmaWxlIHdoaWNoIGlzIHN0aWxsIGluIHRoZSBwcm9jZXNzIG9mIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgY29kZSBnZW5lcmF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIGFueSBpbmxpbmUgY29kZSBoYXMgYmVlbiByZXF1aXJlZCBieSB0aGUgc2hpbSB5ZXQuXG4gICAqL1xuICBoYXNJbmxpbmVzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBTb3VyY2UgbWFwcGluZyBpbmZvcm1hdGlvbiBmb3IgbWFwcGluZyBkaWFnbm9zdGljcyBmcm9tIGlubGluZWQgdHlwZSBjaGVjayBibG9ja3MgYmFjayB0byB0aGVcbiAgICogb3JpZ2luYWwgdGVtcGxhdGUuXG4gICAqL1xuICBzb3VyY2VNYW5hZ2VyOiBUZW1wbGF0ZVNvdXJjZU1hbmFnZXI7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBpbi1wcm9ncmVzcyBzaGltIGRhdGEgZm9yIHNoaW1zIGdlbmVyYXRlZCBmcm9tIHRoaXMgaW5wdXQgZmlsZS5cbiAgICovXG4gIHNoaW1EYXRhOiBNYXA8QWJzb2x1dGVGc1BhdGgsIFBlbmRpbmdTaGltRGF0YT47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGVuZGluZ1NoaW1EYXRhIHtcbiAgLyoqXG4gICAqIFJlY29yZGVyIGZvciBvdXQtb2YtYmFuZCBkaWFnbm9zdGljcyB3aGljaCBhcmUgcmFpc2VkIGR1cmluZyBnZW5lcmF0aW9uLlxuICAgKi9cbiAgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcjtcblxuICAvKipcbiAgICogVGhlIGBEb21TY2hlbWFDaGVja2VyYCBpbiB1c2UgZm9yIHRoaXMgdGVtcGxhdGUsIHdoaWNoIHJlY29yZHMgYW55IHNjaGVtYS1yZWxhdGVkIGRpYWdub3N0aWNzLlxuICAgKi9cbiAgZG9tU2NoZW1hQ2hlY2tlcjogRG9tU2NoZW1hQ2hlY2tlcjtcblxuICAvKipcbiAgICogU2hpbSBmaWxlIGluIHRoZSBwcm9jZXNzIG9mIGJlaW5nIGdlbmVyYXRlZC5cbiAgICovXG4gIGZpbGU6IFR5cGVDaGVja0ZpbGU7XG5cblxuICAvKipcbiAgICogTWFwIG9mIGBUZW1wbGF0ZUlkYCB0byBpbmZvcm1hdGlvbiBjb2xsZWN0ZWQgYWJvdXQgdGhlIHRlbXBsYXRlIGFzIGl0J3MgaW5nZXN0ZWQuXG4gICAqL1xuICB0ZW1wbGF0ZXM6IE1hcDxUZW1wbGF0ZUlkLCBUZW1wbGF0ZURhdGE+O1xufVxuXG4vKipcbiAqIEFkYXB0cyB0aGUgYFR5cGVDaGVja0NvbnRleHRJbXBsYCB0byB0aGUgbGFyZ2VyIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgc3lzdGVtLlxuICpcbiAqIFRocm91Z2ggdGhpcyBpbnRlcmZhY2UsIGEgc2luZ2xlIGBUeXBlQ2hlY2tDb250ZXh0SW1wbGAgKHdoaWNoIHJlcHJlc2VudHMgb25lIFwicGFzc1wiIG9mIHRlbXBsYXRlXG4gKiB0eXBlLWNoZWNraW5nKSByZXF1ZXN0cyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgbGFyZ2VyIHN0YXRlIG9mIHR5cGUtY2hlY2tpbmcsIGFzIHdlbGwgYXMgcmVwb3J0c1xuICogYmFjayBpdHMgcmVzdWx0cyBvbmNlIGZpbmFsaXplZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlQ2hlY2tpbmdIb3N0IHtcbiAgLyoqXG4gICAqIFJldHJpZXZlIHRoZSBgVGVtcGxhdGVTb3VyY2VNYW5hZ2VyYCByZXNwb25zaWJsZSBmb3IgY29tcG9uZW50cyBpbiB0aGUgZ2l2ZW4gaW5wdXQgZmlsZSBwYXRoLlxuICAgKi9cbiAgZ2V0U291cmNlTWFuYWdlcihzZlBhdGg6IEFic29sdXRlRnNQYXRoKTogVGVtcGxhdGVTb3VyY2VNYW5hZ2VyO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGEgcGFydGljdWxhciBjb21wb25lbnQgY2xhc3Mgc2hvdWxkIGJlIGluY2x1ZGVkIGluIHRoZSBjdXJyZW50IHR5cGUtY2hlY2tpbmcgcGFzcy5cbiAgICpcbiAgICogTm90IGFsbCBjb21wb25lbnRzIG9mZmVyZWQgdG8gdGhlIGBUeXBlQ2hlY2tDb250ZXh0YCBmb3IgY2hlY2tpbmcgbWF5IHJlcXVpcmUgcHJvY2Vzc2luZy4gRm9yXG4gICAqIGV4YW1wbGUsIHRoZSBjb21wb25lbnQgbWF5IGhhdmUgcmVzdWx0cyBhbHJlYWR5IGF2YWlsYWJsZSBmcm9tIGEgcHJpb3IgcGFzcyBvciBmcm9tIGEgcHJldmlvdXNcbiAgICogcHJvZ3JhbS5cbiAgICovXG4gIHNob3VsZENoZWNrQ29tcG9uZW50KG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBSZXBvcnQgZGF0YSBmcm9tIGEgc2hpbSBnZW5lcmF0ZWQgZnJvbSB0aGUgZ2l2ZW4gaW5wdXQgZmlsZSBwYXRoLlxuICAgKi9cbiAgcmVjb3JkU2hpbURhdGEoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogU2hpbVR5cGVDaGVja2luZ0RhdGEpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBSZWNvcmQgdGhhdCBhbGwgb2YgdGhlIGNvbXBvbmVudHMgd2l0aGluIHRoZSBnaXZlbiBpbnB1dCBmaWxlIHBhdGggaGFkIGNvZGUgZ2VuZXJhdGVkIC0gdGhhdFxuICAgKiBpcywgY292ZXJhZ2UgZm9yIHRoZSBmaWxlIGNhbiBiZSBjb25zaWRlcmVkIGNvbXBsZXRlLlxuICAgKi9cbiAgcmVjb3JkQ29tcGxldGUoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQ7XG59XG5cbi8qKlxuICogSG93IGEgdHlwZS1jaGVja2luZyBjb250ZXh0IHNob3VsZCBoYW5kbGUgb3BlcmF0aW9ucyB3aGljaCB3b3VsZCByZXF1aXJlIGlubGluaW5nLlxuICovXG5leHBvcnQgZW51bSBJbmxpbmluZ01vZGUge1xuICAvKipcbiAgICogVXNlIGlubGluaW5nIG9wZXJhdGlvbnMgd2hlbiByZXF1aXJlZC5cbiAgICovXG4gIElubGluZU9wcyxcblxuICAvKipcbiAgICogUHJvZHVjZSBkaWFnbm9zdGljcyBpZiBhbiBvcGVyYXRpb24gd291bGQgcmVxdWlyZSBpbmxpbmluZy5cbiAgICovXG4gIEVycm9yLFxufVxuXG4vKipcbiAqIEEgdGVtcGxhdGUgdHlwZSBjaGVja2luZyBjb250ZXh0IGZvciBhIHByb2dyYW0uXG4gKlxuICogVGhlIGBUeXBlQ2hlY2tDb250ZXh0YCBhbGxvd3MgcmVnaXN0cmF0aW9uIG9mIGNvbXBvbmVudHMgYW5kIHRoZWlyIHRlbXBsYXRlcyB3aGljaCBuZWVkIHRvIGJlXG4gKiB0eXBlIGNoZWNrZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlQ2hlY2tDb250ZXh0SW1wbCBpbXBsZW1lbnRzIFR5cGVDaGVja0NvbnRleHQge1xuICBwcml2YXRlIGZpbGVNYXAgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGE+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnLFxuICAgICAgcHJpdmF0ZSBjb21waWxlckhvc3Q6IFBpY2s8dHMuQ29tcGlsZXJIb3N0LCAnZ2V0Q2Fub25pY2FsRmlsZU5hbWUnPixcbiAgICAgIHByaXZhdGUgY29tcG9uZW50TWFwcGluZ1N0cmF0ZWd5OiBDb21wb25lbnRUb1NoaW1NYXBwaW5nU3RyYXRlZ3ksXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgaG9zdDogVHlwZUNoZWNraW5nSG9zdCwgcHJpdmF0ZSBpbmxpbmluZzogSW5saW5pbmdNb2RlKSB7XG4gICAgaWYgKGlubGluaW5nID09PSBJbmxpbmluZ01vZGUuRXJyb3IgJiYgY29uZmlnLnVzZUlubGluZVR5cGVDb25zdHJ1Y3RvcnMpIHtcbiAgICAgIC8vIFdlIGNhbm5vdCB1c2UgaW5saW5pbmcgZm9yIHR5cGUgY2hlY2tpbmcgc2luY2UgdGhpcyBlbnZpcm9ubWVudCBkb2VzIG5vdCBzdXBwb3J0IGl0LlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb25FcnJvcjogaW52YWxpZCBpbmxpbmluZyBjb25maWd1cmF0aW9uLmApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBIGBNYXBgIG9mIGB0cy5Tb3VyY2VGaWxlYHMgdGhhdCB0aGUgY29udGV4dCBoYXMgc2VlbiB0byB0aGUgb3BlcmF0aW9ucyAoYWRkaXRpb25zIG9mIG1ldGhvZHNcbiAgICogb3IgdHlwZS1jaGVjayBibG9ja3MpIHRoYXQgbmVlZCB0byBiZSBldmVudHVhbGx5IHBlcmZvcm1lZCBvbiB0aGF0IGZpbGUuXG4gICAqL1xuICBwcml2YXRlIG9wTWFwID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBPcFtdPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3Mgd2hlbiBhbiBhIHBhcnRpY3VsYXIgY2xhc3MgaGFzIGEgcGVuZGluZyB0eXBlIGNvbnN0cnVjdG9yIHBhdGNoaW5nIG9wZXJhdGlvbiBhbHJlYWR5XG4gICAqIHF1ZXVlZC5cbiAgICovXG4gIHByaXZhdGUgdHlwZUN0b3JQZW5kaW5nID0gbmV3IFNldDx0cy5DbGFzc0RlY2xhcmF0aW9uPigpO1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIHRlbXBsYXRlIHRvIHBvdGVudGlhbGx5IGJlIHR5cGUtY2hlY2tlZC5cbiAgICpcbiAgICogSW1wbGVtZW50cyBgVHlwZUNoZWNrQ29udGV4dC5hZGRUZW1wbGF0ZWAuXG4gICAqL1xuICBhZGRUZW1wbGF0ZShcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgYmluZGVyOiBSM1RhcmdldEJpbmRlcjxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT4sIHRlbXBsYXRlOiBUbXBsQXN0Tm9kZVtdLFxuICAgICAgcGlwZXM6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pj4sXG4gICAgICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdLCBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIGZpbGU6IFBhcnNlU291cmNlRmlsZSxcbiAgICAgIHBhcnNlRXJyb3JzOiBQYXJzZUVycm9yW118bnVsbCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5ob3N0LnNob3VsZENoZWNrQ29tcG9uZW50KHJlZi5ub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5kYXRhRm9yRmlsZShyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGNvbnN0IHNoaW1EYXRhID0gdGhpcy5wZW5kaW5nU2hpbUZvckNvbXBvbmVudChyZWYubm9kZSk7XG4gICAgY29uc3QgdGVtcGxhdGVJZCA9IGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChyZWYubm9kZSk7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZURpYWdub3N0aWNzOiBUZW1wbGF0ZURpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgaWYgKHBhcnNlRXJyb3JzICE9PSBudWxsKSB7XG4gICAgICB0ZW1wbGF0ZURpYWdub3N0aWNzLnB1c2goXG4gICAgICAgICAgLi4udGhpcy5nZXRUZW1wbGF0ZURpYWdub3N0aWNzKHBhcnNlRXJyb3JzLCB0ZW1wbGF0ZUlkLCBzb3VyY2VNYXBwaW5nKSk7XG4gICAgfVxuXG4gICAgY29uc3QgYm91bmRUYXJnZXQgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGV9KTtcblxuICAgIGlmICh0aGlzLmlubGluaW5nID09PSBJbmxpbmluZ01vZGUuSW5saW5lT3BzKSB7XG4gICAgICAvLyBHZXQgYWxsIG9mIHRoZSBkaXJlY3RpdmVzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIGFuZCByZWNvcmQgaW5saW5lIHR5cGUgY29uc3RydWN0b3JzIHdoZW5cbiAgICAgIC8vIHJlcXVpcmVkLlxuICAgICAgZm9yIChjb25zdCBkaXIgb2YgYm91bmRUYXJnZXQuZ2V0VXNlZERpcmVjdGl2ZXMoKSkge1xuICAgICAgICBjb25zdCBkaXJSZWYgPSBkaXIucmVmIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PjtcbiAgICAgICAgY29uc3QgZGlyTm9kZSA9IGRpclJlZi5ub2RlO1xuXG4gICAgICAgIGlmICghZGlyLmlzR2VuZXJpYyB8fCAhcmVxdWlyZXNJbmxpbmVUeXBlQ3RvcihkaXJOb2RlLCB0aGlzLnJlZmxlY3RvcikpIHtcbiAgICAgICAgICAvLyBpbmxpbmluZyBub3QgcmVxdWlyZWRcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBhbiBpbmxpbmUgdHlwZSBjb25zdHJ1Y3RvciBvcGVyYXRpb24gZm9yIHRoZSBkaXJlY3RpdmUuXG4gICAgICAgIHRoaXMuYWRkSW5saW5lVHlwZUN0b3IoZmlsZURhdGEsIGRpck5vZGUuZ2V0U291cmNlRmlsZSgpLCBkaXJSZWYsIHtcbiAgICAgICAgICBmbk5hbWU6ICduZ1R5cGVDdG9yJyxcbiAgICAgICAgICAvLyBUaGUgY29uc3RydWN0b3Igc2hvdWxkIGhhdmUgYSBib2R5IGlmIHRoZSBkaXJlY3RpdmUgY29tZXMgZnJvbSBhIC50cyBmaWxlLCBidXQgbm90IGlmXG4gICAgICAgICAgLy8gaXQgY29tZXMgZnJvbSBhIC5kLnRzIGZpbGUuIC5kLnRzIGRlY2xhcmF0aW9ucyBkb24ndCBoYXZlIGJvZGllcy5cbiAgICAgICAgICBib2R5OiAhZGlyTm9kZS5nZXRTb3VyY2VGaWxlKCkuaXNEZWNsYXJhdGlvbkZpbGUsXG4gICAgICAgICAgZmllbGRzOiB7XG4gICAgICAgICAgICBpbnB1dHM6IGRpci5pbnB1dHMuY2xhc3NQcm9wZXJ0eU5hbWVzLFxuICAgICAgICAgICAgb3V0cHV0czogZGlyLm91dHB1dHMuY2xhc3NQcm9wZXJ0eU5hbWVzLFxuICAgICAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBzdXBwb3J0IHF1ZXJpZXNcbiAgICAgICAgICAgIHF1ZXJpZXM6IGRpci5xdWVyaWVzLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29lcmNlZElucHV0RmllbGRzOiBkaXIuY29lcmNlZElucHV0RmllbGRzLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzaGltRGF0YS50ZW1wbGF0ZXMuc2V0KHRlbXBsYXRlSWQsIHtcbiAgICAgIHRlbXBsYXRlLFxuICAgICAgYm91bmRUYXJnZXQsXG4gICAgICB0ZW1wbGF0ZURpYWdub3N0aWNzLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdGNiUmVxdWlyZXNJbmxpbmUgPSByZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrKHJlZi5ub2RlLCBwaXBlcyk7XG5cbiAgICAvLyBJZiBpbmxpbmluZyBpcyBub3Qgc3VwcG9ydGVkLCBidXQgaXMgcmVxdWlyZWQgZm9yIGVpdGhlciB0aGUgVENCIG9yIG9uZSBvZiBpdHMgZGlyZWN0aXZlXG4gICAgLy8gZGVwZW5kZW5jaWVzLCB0aGVuIGV4aXQgaGVyZSB3aXRoIGFuIGVycm9yLlxuICAgIGlmICh0aGlzLmlubGluaW5nID09PSBJbmxpbmluZ01vZGUuRXJyb3IgJiYgdGNiUmVxdWlyZXNJbmxpbmUpIHtcbiAgICAgIC8vIFRoaXMgdGVtcGxhdGUgY2Fubm90IGJlIHN1cHBvcnRlZCBiZWNhdXNlIHRoZSB1bmRlcmx5aW5nIHN0cmF0ZWd5IGRvZXMgbm90IHN1cHBvcnQgaW5saW5pbmdcbiAgICAgIC8vIGFuZCBpbmxpbmluZyB3b3VsZCBiZSByZXF1aXJlZC5cblxuICAgICAgLy8gUmVjb3JkIGRpYWdub3N0aWNzIHRvIGluZGljYXRlIHRoZSBpc3N1ZXMgd2l0aCB0aGlzIHRlbXBsYXRlLlxuICAgICAgc2hpbURhdGEub29iUmVjb3JkZXIucmVxdWlyZXNJbmxpbmVUY2IodGVtcGxhdGVJZCwgcmVmLm5vZGUpO1xuXG4gICAgICAvLyBDaGVja2luZyB0aGlzIHRlbXBsYXRlIHdvdWxkIGJlIHVuc3VwcG9ydGVkLCBzbyBkb24ndCB0cnkuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgbWV0YSA9IHtcbiAgICAgIGlkOiBmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyLmNhcHR1cmVTb3VyY2UocmVmLm5vZGUsIHNvdXJjZU1hcHBpbmcsIGZpbGUpLFxuICAgICAgYm91bmRUYXJnZXQsXG4gICAgICBwaXBlcyxcbiAgICAgIHNjaGVtYXMsXG4gICAgfTtcbiAgICBpZiAodGNiUmVxdWlyZXNJbmxpbmUpIHtcbiAgICAgIC8vIFRoaXMgY2xhc3MgZGlkbid0IG1lZXQgdGhlIHJlcXVpcmVtZW50cyBmb3IgZXh0ZXJuYWwgdHlwZSBjaGVja2luZywgc28gZ2VuZXJhdGUgYW4gaW5saW5lXG4gICAgICAvLyBUQ0IgZm9yIHRoZSBjbGFzcy5cbiAgICAgIHRoaXMuYWRkSW5saW5lVHlwZUNoZWNrQmxvY2soZmlsZURhdGEsIHNoaW1EYXRhLCByZWYsIG1ldGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgY2xhc3MgY2FuIGJlIHR5cGUtY2hlY2tlZCBleHRlcm5hbGx5IGFzIG5vcm1hbC5cbiAgICAgIHNoaW1EYXRhLmZpbGUuYWRkVHlwZUNoZWNrQmxvY2socmVmLCBtZXRhLCBzaGltRGF0YS5kb21TY2hlbWFDaGVja2VyLCBzaGltRGF0YS5vb2JSZWNvcmRlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIHR5cGUgY29uc3RydWN0b3IgZm9yIHRoZSBnaXZlbiBgbm9kZWAgd2l0aCB0aGUgZ2l2ZW4gYGN0b3JNZXRhZGF0YWAuXG4gICAqL1xuICBhZGRJbmxpbmVUeXBlQ3RvcihcbiAgICAgIGZpbGVEYXRhOiBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEsIHNmOiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sIGN0b3JNZXRhOiBUeXBlQ3Rvck1ldGFkYXRhKTogdm9pZCB7XG4gICAgaWYgKHRoaXMudHlwZUN0b3JQZW5kaW5nLmhhcyhyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy50eXBlQ3RvclBlbmRpbmcuYWRkKHJlZi5ub2RlKTtcblxuICAgIC8vIExhemlseSBjb25zdHJ1Y3QgdGhlIG9wZXJhdGlvbiBtYXAuXG4gICAgaWYgKCF0aGlzLm9wTWFwLmhhcyhzZikpIHtcbiAgICAgIHRoaXMub3BNYXAuc2V0KHNmLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG9wcyA9IHRoaXMub3BNYXAuZ2V0KHNmKSE7XG5cbiAgICAvLyBQdXNoIGEgYFR5cGVDdG9yT3BgIGludG8gdGhlIG9wZXJhdGlvbiBxdWV1ZSBmb3IgdGhlIHNvdXJjZSBmaWxlLlxuICAgIG9wcy5wdXNoKG5ldyBUeXBlQ3Rvck9wKHJlZiwgY3Rvck1ldGEpKTtcbiAgICBmaWxlRGF0YS5oYXNJbmxpbmVzID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gYSBgdHMuU291cmNlRmlsZWAgaW50byBhIHZlcnNpb24gdGhhdCBpbmNsdWRlcyB0eXBlIGNoZWNraW5nIGNvZGUuXG4gICAqXG4gICAqIElmIHRoaXMgcGFydGljdWxhciBgdHMuU291cmNlRmlsZWAgcmVxdWlyZXMgY2hhbmdlcywgdGhlIHRleHQgcmVwcmVzZW50aW5nIGl0cyBuZXcgY29udGVudHNcbiAgICogd2lsbCBiZSByZXR1cm5lZC4gT3RoZXJ3aXNlLCBhIGBudWxsYCByZXR1cm4gaW5kaWNhdGVzIG5vIGNoYW5nZXMgd2VyZSBuZWNlc3NhcnkuXG4gICAqL1xuICB0cmFuc2Zvcm0oc2Y6IHRzLlNvdXJjZUZpbGUpOiBzdHJpbmd8bnVsbCB7XG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIG9wZXJhdGlvbnMgcGVuZGluZyBmb3IgdGhpcyBwYXJ0aWN1bGFyIGZpbGUsIHJldHVybiBgbnVsbGAgdG8gaW5kaWNhdGUgbm9cbiAgICAvLyBjaGFuZ2VzLlxuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBJbXBvcnRzIG1heSBuZWVkIHRvIGJlIGFkZGVkIHRvIHRoZSBmaWxlIHRvIHN1cHBvcnQgdHlwZS1jaGVja2luZyBvZiBkaXJlY3RpdmVzIHVzZWQgaW4gdGhlXG4gICAgLy8gdGVtcGxhdGUgd2l0aGluIGl0LlxuICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihuZXcgTm9vcEltcG9ydFJld3JpdGVyKCksICdfaScpO1xuXG4gICAgLy8gRWFjaCBPcCBoYXMgYSBzcGxpdFBvaW50IGluZGV4IGludG8gdGhlIHRleHQgd2hlcmUgaXQgbmVlZHMgdG8gYmUgaW5zZXJ0ZWQuIFNwbGl0IHRoZVxuICAgIC8vIG9yaWdpbmFsIHNvdXJjZSB0ZXh0IGludG8gY2h1bmtzIGF0IHRoZXNlIHNwbGl0IHBvaW50cywgd2hlcmUgY29kZSB3aWxsIGJlIGluc2VydGVkIGJldHdlZW5cbiAgICAvLyB0aGUgY2h1bmtzLlxuICAgIGNvbnN0IG9wcyA9IHRoaXMub3BNYXAuZ2V0KHNmKSEuc29ydChvcmRlck9wcyk7XG4gICAgY29uc3QgdGV4dFBhcnRzID0gc3BsaXRTdHJpbmdBdFBvaW50cyhzZi50ZXh0LCBvcHMubWFwKG9wID0+IG9wLnNwbGl0UG9pbnQpKTtcblxuICAgIC8vIFVzZSBhIGB0cy5QcmludGVyYCB0byBnZW5lcmF0ZSBzb3VyY2UgY29kZS5cbiAgICBjb25zdCBwcmludGVyID0gdHMuY3JlYXRlUHJpbnRlcih7b21pdFRyYWlsaW5nU2VtaWNvbG9uOiB0cnVlfSk7XG5cbiAgICAvLyBCZWdpbiB3aXRoIHRoZSBpbnRpYWwgc2VjdGlvbiBvZiB0aGUgY29kZSB0ZXh0LlxuICAgIGxldCBjb2RlID0gdGV4dFBhcnRzWzBdO1xuXG4gICAgLy8gUHJvY2VzcyBlYWNoIG9wZXJhdGlvbiBhbmQgdXNlIHRoZSBwcmludGVyIHRvIGdlbmVyYXRlIHNvdXJjZSBjb2RlIGZvciBpdCwgaW5zZXJ0aW5nIGl0IGludG9cbiAgICAvLyB0aGUgc291cmNlIGNvZGUgaW4gYmV0d2VlbiB0aGUgb3JpZ2luYWwgY2h1bmtzLlxuICAgIG9wcy5mb3JFYWNoKChvcCwgaWR4KSA9PiB7XG4gICAgICBjb25zdCB0ZXh0ID0gb3AuZXhlY3V0ZShpbXBvcnRNYW5hZ2VyLCBzZiwgdGhpcy5yZWZFbWl0dGVyLCBwcmludGVyKTtcbiAgICAgIGNvZGUgKz0gJ1xcblxcbicgKyB0ZXh0ICsgdGV4dFBhcnRzW2lkeCArIDFdO1xuICAgIH0pO1xuXG4gICAgLy8gV3JpdGUgb3V0IHRoZSBpbXBvcnRzIHRoYXQgbmVlZCB0byBiZSBhZGRlZCB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBmaWxlLlxuICAgIGxldCBpbXBvcnRzID0gaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKHNmLmZpbGVOYW1lKVxuICAgICAgICAgICAgICAgICAgICAgIC5tYXAoaSA9PiBgaW1wb3J0ICogYXMgJHtpLnF1YWxpZmllci50ZXh0fSBmcm9tICcke2kuc3BlY2lmaWVyfSc7YClcbiAgICAgICAgICAgICAgICAgICAgICAuam9pbignXFxuJyk7XG4gICAgY29kZSA9IGltcG9ydHMgKyAnXFxuJyArIGNvZGU7XG5cbiAgICByZXR1cm4gY29kZTtcbiAgfVxuXG4gIGZpbmFsaXplKCk6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPiB7XG4gICAgLy8gRmlyc3QsIGJ1aWxkIHRoZSBtYXAgb2YgdXBkYXRlcyB0byBzb3VyY2UgZmlsZXMuXG4gICAgY29uc3QgdXBkYXRlcyA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IG9yaWdpbmFsU2Ygb2YgdGhpcy5vcE1hcC5rZXlzKCkpIHtcbiAgICAgIGNvbnN0IG5ld1RleHQgPSB0aGlzLnRyYW5zZm9ybShvcmlnaW5hbFNmKTtcbiAgICAgIGlmIChuZXdUZXh0ICE9PSBudWxsKSB7XG4gICAgICAgIHVwZGF0ZXMuc2V0KGFic29sdXRlRnJvbVNvdXJjZUZpbGUob3JpZ2luYWxTZiksIG5ld1RleHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZW4gZ28gdGhyb3VnaCBlYWNoIGlucHV0IGZpbGUgdGhhdCBoYXMgcGVuZGluZyBjb2RlIGdlbmVyYXRpb24gb3BlcmF0aW9ucy5cbiAgICBmb3IgKGNvbnN0IFtzZlBhdGgsIHBlbmRpbmdGaWxlRGF0YV0gb2YgdGhpcy5maWxlTWFwKSB7XG4gICAgICAvLyBGb3IgZWFjaCBpbnB1dCBmaWxlLCBjb25zaWRlciBnZW5lcmF0aW9uIG9wZXJhdGlvbnMgZm9yIGVhY2ggb2YgaXRzIHNoaW1zLlxuICAgICAgZm9yIChjb25zdCBwZW5kaW5nU2hpbURhdGEgb2YgcGVuZGluZ0ZpbGVEYXRhLnNoaW1EYXRhLnZhbHVlcygpKSB7XG4gICAgICAgIHRoaXMuaG9zdC5yZWNvcmRTaGltRGF0YShzZlBhdGgsIHtcbiAgICAgICAgICBnZW5lc2lzRGlhZ25vc3RpY3M6IFtcbiAgICAgICAgICAgIC4uLnBlbmRpbmdTaGltRGF0YS5kb21TY2hlbWFDaGVja2VyLmRpYWdub3N0aWNzLFxuICAgICAgICAgICAgLi4ucGVuZGluZ1NoaW1EYXRhLm9vYlJlY29yZGVyLmRpYWdub3N0aWNzLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgaGFzSW5saW5lczogcGVuZGluZ0ZpbGVEYXRhLmhhc0lubGluZXMsXG4gICAgICAgICAgcGF0aDogcGVuZGluZ1NoaW1EYXRhLmZpbGUuZmlsZU5hbWUsXG4gICAgICAgICAgdGVtcGxhdGVzOiBwZW5kaW5nU2hpbURhdGEudGVtcGxhdGVzLFxuICAgICAgICB9KTtcbiAgICAgICAgdXBkYXRlcy5zZXQoXG4gICAgICAgICAgICBwZW5kaW5nU2hpbURhdGEuZmlsZS5maWxlTmFtZSwgcGVuZGluZ1NoaW1EYXRhLmZpbGUucmVuZGVyKGZhbHNlIC8qIHJlbW92ZUNvbW1lbnRzICovKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHVwZGF0ZXM7XG4gIH1cblxuICBwcml2YXRlIGFkZElubGluZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgZmlsZURhdGE6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSwgc2hpbURhdGE6IFBlbmRpbmdTaGltRGF0YSxcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgdGNiTWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IHNmID0gcmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikhO1xuICAgIG9wcy5wdXNoKG5ldyBUY2JPcChcbiAgICAgICAgcmVmLCB0Y2JNZXRhLCB0aGlzLmNvbmZpZywgdGhpcy5yZWZsZWN0b3IsIHNoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIsXG4gICAgICAgIHNoaW1EYXRhLm9vYlJlY29yZGVyKSk7XG4gICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gIH1cblxuICBwcml2YXRlIHBlbmRpbmdTaGltRm9yQ29tcG9uZW50KG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBQZW5kaW5nU2hpbURhdGEge1xuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5kYXRhRm9yRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3Qgc2hpbVBhdGggPSB0aGlzLmNvbXBvbmVudE1hcHBpbmdTdHJhdGVneS5zaGltUGF0aEZvckNvbXBvbmVudChub2RlKTtcbiAgICBpZiAoIWZpbGVEYXRhLnNoaW1EYXRhLmhhcyhzaGltUGF0aCkpIHtcbiAgICAgIGZpbGVEYXRhLnNoaW1EYXRhLnNldChzaGltUGF0aCwge1xuICAgICAgICBkb21TY2hlbWFDaGVja2VyOiBuZXcgUmVnaXN0cnlEb21TY2hlbWFDaGVja2VyKGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIpLFxuICAgICAgICBvb2JSZWNvcmRlcjogbmV3IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlckltcGwoZmlsZURhdGEuc291cmNlTWFuYWdlciksXG4gICAgICAgIGZpbGU6IG5ldyBUeXBlQ2hlY2tGaWxlKFxuICAgICAgICAgICAgc2hpbVBhdGgsIHRoaXMuY29uZmlnLCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNvbXBpbGVySG9zdCksXG4gICAgICAgIHRlbXBsYXRlczogbmV3IE1hcDxUZW1wbGF0ZUlkLCBUZW1wbGF0ZURhdGE+KCksXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGZpbGVEYXRhLnNoaW1EYXRhLmdldChzaGltUGF0aCkhO1xuICB9XG5cbiAgcHJpdmF0ZSBkYXRhRm9yRmlsZShzZjogdHMuU291cmNlRmlsZSk6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSB7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG5cbiAgICBpZiAoIXRoaXMuZmlsZU1hcC5oYXMoc2ZQYXRoKSkge1xuICAgICAgY29uc3QgZGF0YTogUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhID0ge1xuICAgICAgICBoYXNJbmxpbmVzOiBmYWxzZSxcbiAgICAgICAgc291cmNlTWFuYWdlcjogdGhpcy5ob3N0LmdldFNvdXJjZU1hbmFnZXIoc2ZQYXRoKSxcbiAgICAgICAgc2hpbURhdGE6IG5ldyBNYXAoKSxcbiAgICAgIH07XG4gICAgICB0aGlzLmZpbGVNYXAuc2V0KHNmUGF0aCwgZGF0YSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZmlsZU1hcC5nZXQoc2ZQYXRoKSE7XG4gIH1cblxuICBwcml2YXRlIGdldFRlbXBsYXRlRGlhZ25vc3RpY3MoXG4gICAgICBwYXJzZUVycm9yczogUGFyc2VFcnJvcltdLCB0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLFxuICAgICAgc291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nKTogVGVtcGxhdGVEaWFnbm9zdGljW10ge1xuICAgIHJldHVybiBwYXJzZUVycm9ycy5tYXAoZXJyb3IgPT4ge1xuICAgICAgY29uc3Qgc3BhbiA9IGVycm9yLnNwYW47XG5cbiAgICAgIGlmIChzcGFuLnN0YXJ0Lm9mZnNldCA9PT0gc3Bhbi5lbmQub2Zmc2V0KSB7XG4gICAgICAgIC8vIFRlbXBsYXRlIGVycm9ycyBjYW4gY29udGFpbiB6ZXJvLWxlbmd0aCBzcGFucywgaWYgdGhlIGVycm9yIG9jY3VycyBhdCBhIHNpbmdsZSBwb2ludC5cbiAgICAgICAgLy8gSG93ZXZlciwgVHlwZVNjcmlwdCBkb2VzIG5vdCBoYW5kbGUgZGlzcGxheWluZyBhIHplcm8tbGVuZ3RoIGRpYWdub3N0aWMgdmVyeSB3ZWxsLCBzb1xuICAgICAgICAvLyBpbmNyZWFzZSB0aGUgZW5kaW5nIG9mZnNldCBieSAxIGZvciBzdWNoIGVycm9ycywgdG8gZW5zdXJlIHRoZSBwb3NpdGlvbiBpcyBzaG93biBpbiB0aGVcbiAgICAgICAgLy8gZGlhZ25vc3RpYy5cbiAgICAgICAgc3Bhbi5lbmQub2Zmc2V0Kys7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBtYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgICAgICAgIHRlbXBsYXRlSWQsIHNvdXJjZU1hcHBpbmcsIHNwYW4sIHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBuZ0Vycm9yQ29kZShFcnJvckNvZGUuVEVNUExBVEVfUEFSU0VfRVJST1IpLCBlcnJvci5tc2cpO1xuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQSBjb2RlIGdlbmVyYXRpb24gb3BlcmF0aW9uIHRoYXQgbmVlZHMgdG8gaGFwcGVuIHdpdGhpbiBhIGdpdmVuIHNvdXJjZSBmaWxlLlxuICovXG5pbnRlcmZhY2UgT3Age1xuICAvKipcbiAgICogVGhlIG5vZGUgaW4gdGhlIGZpbGUgd2hpY2ggd2lsbCBoYXZlIGNvZGUgZ2VuZXJhdGVkIGZvciBpdC5cbiAgICovXG4gIHJlYWRvbmx5IHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+O1xuXG4gIC8qKlxuICAgKiBJbmRleCBpbnRvIHRoZSBzb3VyY2UgdGV4dCB3aGVyZSB0aGUgY29kZSBnZW5lcmF0ZWQgYnkgdGhlIG9wZXJhdGlvbiBzaG91bGQgYmUgaW5zZXJ0ZWQuXG4gICAqL1xuICByZWFkb25seSBzcGxpdFBvaW50OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgdGhlIG9wZXJhdGlvbiBhbmQgcmV0dXJuIHRoZSBnZW5lcmF0ZWQgY29kZSBhcyB0ZXh0LlxuICAgKi9cbiAgZXhlY3V0ZShpbTogSW1wb3J0TWFuYWdlciwgc2Y6IHRzLlNvdXJjZUZpbGUsIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaW50ZXI6IHRzLlByaW50ZXIpOlxuICAgICAgc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgdHlwZSBjaGVjayBibG9jayBvcGVyYXRpb24gd2hpY2ggcHJvZHVjZXMgdHlwZSBjaGVjayBjb2RlIGZvciBhIHBhcnRpY3VsYXIgY29tcG9uZW50LlxuICovXG5jbGFzcyBUY2JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHJlYWRvbmx5IG1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIHJlYWRvbmx5IGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnLFxuICAgICAgcmVhZG9ubHkgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcmVhZG9ubHkgZG9tU2NoZW1hQ2hlY2tlcjogRG9tU2NoZW1hQ2hlY2tlcixcbiAgICAgIHJlYWRvbmx5IG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY2hlY2sgYmxvY2tzIGFyZSBpbnNlcnRlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgZW5kIG9mIHRoZSBjb21wb25lbnQgY2xhc3MuXG4gICAqL1xuICBnZXQgc3BsaXRQb2ludCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnJlZi5ub2RlLmVuZCArIDE7XG4gIH1cblxuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmcge1xuICAgIGNvbnN0IGVudiA9IG5ldyBFbnZpcm9ubWVudCh0aGlzLmNvbmZpZywgaW0sIHJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yLCBzZik7XG4gICAgY29uc3QgZm5OYW1lID0gdHMuY3JlYXRlSWRlbnRpZmllcihgX3RjYl8ke3RoaXMucmVmLm5vZGUucG9zfWApO1xuICAgIGNvbnN0IGZuID0gZ2VuZXJhdGVUeXBlQ2hlY2tCbG9jayhcbiAgICAgICAgZW52LCB0aGlzLnJlZiwgZm5OYW1lLCB0aGlzLm1ldGEsIHRoaXMuZG9tU2NoZW1hQ2hlY2tlciwgdGhpcy5vb2JSZWNvcmRlcik7XG4gICAgcmV0dXJuIHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBmbiwgc2YpO1xuICB9XG59XG5cbi8qKlxuICogQSB0eXBlIGNvbnN0cnVjdG9yIG9wZXJhdGlvbiB3aGljaCBwcm9kdWNlcyB0eXBlIGNvbnN0cnVjdG9yIGNvZGUgZm9yIGEgcGFydGljdWxhciBkaXJlY3RpdmUuXG4gKi9cbmNsYXNzIFR5cGVDdG9yT3AgaW1wbGVtZW50cyBPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sXG4gICAgICByZWFkb25seSBtZXRhOiBUeXBlQ3Rvck1ldGFkYXRhKSB7fVxuXG4gIC8qKlxuICAgKiBUeXBlIGNvbnN0cnVjdG9yIG9wZXJhdGlvbnMgYXJlIGluc2VydGVkIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZW5kIG9mIHRoZSBkaXJlY3RpdmUgY2xhc3MuXG4gICAqL1xuICBnZXQgc3BsaXRQb2ludCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnJlZi5ub2RlLmVuZCAtIDE7XG4gIH1cblxuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmcge1xuICAgIGNvbnN0IHRjYiA9IGdlbmVyYXRlSW5saW5lVHlwZUN0b3IodGhpcy5yZWYubm9kZSwgdGhpcy5tZXRhKTtcbiAgICByZXR1cm4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHRjYiwgc2YpO1xuICB9XG59XG5cbi8qKlxuICogQ29tcGFyZSB0d28gb3BlcmF0aW9ucyBhbmQgcmV0dXJuIHRoZWlyIHNwbGl0IHBvaW50IG9yZGVyaW5nLlxuICovXG5mdW5jdGlvbiBvcmRlck9wcyhvcDE6IE9wLCBvcDI6IE9wKTogbnVtYmVyIHtcbiAgcmV0dXJuIG9wMS5zcGxpdFBvaW50IC0gb3AyLnNwbGl0UG9pbnQ7XG59XG5cbi8qKlxuICogU3BsaXQgYSBzdHJpbmcgaW50byBjaHVua3MgYXQgYW55IG51bWJlciBvZiBzcGxpdCBwb2ludHMuXG4gKi9cbmZ1bmN0aW9uIHNwbGl0U3RyaW5nQXRQb2ludHMoc3RyOiBzdHJpbmcsIHBvaW50czogbnVtYmVyW10pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHNwbGl0czogc3RyaW5nW10gPSBbXTtcbiAgbGV0IHN0YXJ0ID0gMDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBwb2ludCA9IHBvaW50c1tpXTtcbiAgICBzcGxpdHMucHVzaChzdHIuc3Vic3RyaW5nKHN0YXJ0LCBwb2ludCkpO1xuICAgIHN0YXJ0ID0gcG9pbnQ7XG4gIH1cbiAgc3BsaXRzLnB1c2goc3RyLnN1YnN0cmluZyhzdGFydCkpO1xuICByZXR1cm4gc3BsaXRzO1xufVxuIl19