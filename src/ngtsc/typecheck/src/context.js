/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/context", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/dom", "@angular/compiler-cli/src/ngtsc/typecheck/src/environment", "@angular/compiler-cli/src/ngtsc/typecheck/src/oob", "@angular/compiler-cli/src/ngtsc/typecheck/src/shim", "@angular/compiler-cli/src/ngtsc/typecheck/src/source", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var dom_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/dom");
    var environment_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/environment");
    var oob_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/oob");
    var shim_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/shim");
    var source_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/source");
    var type_check_block_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block");
    var type_check_file_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file");
    var type_constructor_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor");
    /**
     * A template type checking context for a program.
     *
     * The `TypeCheckContext` allows registration of components and their templates which need to be
     * type checked.
     */
    var TypeCheckContext = /** @class */ (function () {
        function TypeCheckContext(config, compilerHost, refEmitter, reflector) {
            this.config = config;
            this.compilerHost = compilerHost;
            this.refEmitter = refEmitter;
            this.reflector = reflector;
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
            /**
             * Map of data for file paths which was adopted from a prior compilation.
             *
             * This data allows the `TypeCheckContext` to generate a `TypeCheckRequest` which can interpret
             * diagnostics from type-checking shims included in the prior compilation.
             */
            this.adoptedFiles = new Map();
        }
        /**
         * Record the `FileTypeCheckingData` from a previous program that's associated with a particular
         * source file.
         */
        TypeCheckContext.prototype.adoptPriorResults = function (sf, data) {
            this.adoptedFiles.set(file_system_1.absoluteFromSourceFile(sf), data);
        };
        /**
         * Record a template for the given component `node`, with a `SelectorMatcher` for directive
         * matching.
         *
         * @param node class of the node being recorded.
         * @param template AST nodes of the template being recorded.
         * @param matcher `SelectorMatcher` which tracks directives that are in scope for this template.
         */
        TypeCheckContext.prototype.addTemplate = function (ref, boundTarget, pipes, schemas, sourceMapping, file) {
            var e_1, _a;
            var fileData = this.dataForFile(ref.node.getSourceFile());
            var id = fileData.sourceManager.captureSource(sourceMapping, file);
            try {
                // Get all of the directives used in the template and record type constructors for all of them.
                for (var _b = tslib_1.__values(boundTarget.getUsedDirectives()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var dir = _c.value;
                    var dirRef = dir.ref;
                    var dirNode = dirRef.node;
                    if (type_constructor_1.requiresInlineTypeCtor(dirNode, this.reflector)) {
                        // Add a type constructor operation for the directive.
                        this.addInlineTypeCtor(fileData, dirNode.getSourceFile(), dirRef, {
                            fnName: 'ngTypeCtor',
                            // The constructor should have a body if the directive comes from a .ts file, but not if
                            // it comes from a .d.ts file. .d.ts declarations don't have bodies.
                            body: !dirNode.getSourceFile().isDeclarationFile,
                            fields: {
                                inputs: Object.keys(dir.inputs),
                                outputs: Object.keys(dir.outputs),
                                // TODO(alxhub): support queries
                                queries: dir.queries,
                            },
                            coercedInputFields: dir.coercedInputFields,
                        });
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var tcbMetadata = { id: id, boundTarget: boundTarget, pipes: pipes, schemas: schemas };
            if (type_check_block_1.requiresInlineTypeCheckBlock(ref.node)) {
                // This class didn't meet the requirements for external type checking, so generate an inline
                // TCB for the class.
                this.addInlineTypeCheckBlock(fileData, ref, tcbMetadata);
            }
            else {
                // The class can be type-checked externally as normal.
                fileData.typeCheckFile.addTypeCheckBlock(ref, tcbMetadata, fileData.domSchemaChecker, fileData.oobRecorder);
            }
        };
        /**
         * Record a type constructor for the given `node` with the given `ctorMetadata`.
         */
        TypeCheckContext.prototype.addInlineTypeCtor = function (fileData, sf, ref, ctorMeta) {
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
        TypeCheckContext.prototype.transform = function (sf) {
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
                .map(function (i) { return "import * as " + i.qualifier + " from '" + i.specifier + "';"; })
                .join('\n');
            code = imports + '\n' + code;
            return code;
        };
        TypeCheckContext.prototype.finalize = function () {
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
            var results = {
                updates: updates,
                perFileData: new Map(),
            };
            try {
                for (var _f = tslib_1.__values(this.fileMap.entries()), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var _h = tslib_1.__read(_g.value, 2), sfPath = _h[0], fileData = _h[1];
                    updates.set(fileData.typeCheckFile.fileName, fileData.typeCheckFile.render());
                    results.perFileData.set(sfPath, {
                        genesisDiagnostics: tslib_1.__spread(fileData.domSchemaChecker.diagnostics, fileData.oobRecorder.diagnostics),
                        hasInlines: fileData.hasInlines,
                        sourceResolver: fileData.sourceManager,
                        typeCheckFile: fileData.typeCheckFile.fileName,
                    });
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_3) throw e_3.error; }
            }
            try {
                for (var _j = tslib_1.__values(this.adoptedFiles.entries()), _k = _j.next(); !_k.done; _k = _j.next()) {
                    var _l = tslib_1.__read(_k.value, 2), sfPath = _l[0], fileData = _l[1];
                    results.perFileData.set(sfPath, fileData);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                }
                finally { if (e_4) throw e_4.error; }
            }
            return results;
        };
        TypeCheckContext.prototype.addInlineTypeCheckBlock = function (fileData, ref, tcbMeta) {
            var sf = ref.node.getSourceFile();
            if (!this.opMap.has(sf)) {
                this.opMap.set(sf, []);
            }
            var ops = this.opMap.get(sf);
            ops.push(new TcbOp(ref, tcbMeta, this.config, this.reflector, fileData.domSchemaChecker, fileData.oobRecorder));
            fileData.hasInlines = true;
        };
        TypeCheckContext.prototype.dataForFile = function (sf) {
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            if (!this.fileMap.has(sfPath)) {
                var sourceManager = new source_1.TemplateSourceManager();
                var data = {
                    domSchemaChecker: new dom_1.RegistryDomSchemaChecker(sourceManager),
                    oobRecorder: new oob_1.OutOfBandDiagnosticRecorderImpl(sourceManager),
                    typeCheckFile: new type_check_file_1.TypeCheckFile(shim_1.TypeCheckShimGenerator.shimFor(sfPath), this.config, this.refEmitter, this.reflector, this.compilerHost),
                    hasInlines: false,
                    sourceManager: sourceManager,
                };
                this.fileMap.set(sfPath, data);
            }
            return this.fileMap.get(sfPath);
        };
        return TypeCheckContext;
    }());
    exports.TypeCheckContext = TypeCheckContext;
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
            enumerable: true,
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
            enumerable: true,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUVqQywyRUFBeUU7SUFDekUsbUVBQThFO0lBRTlFLHlFQUErQztJQUkvQyx5RUFBaUU7SUFDakUseUZBQTBDO0lBQzFDLHlFQUFtRjtJQUNuRiwyRUFBOEM7SUFDOUMsK0VBQStDO0lBQy9DLG1HQUF3RjtJQUN4RixpR0FBZ0Q7SUFDaEQsbUdBQWtGO0lBZ0ZsRjs7Ozs7T0FLRztJQUNIO1FBR0UsMEJBQ1ksTUFBMEIsRUFBVSxZQUE2QixFQUNqRSxVQUE0QixFQUFVLFNBQXlCO1lBRC9ELFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQVUsaUJBQVksR0FBWixZQUFZLENBQWlCO1lBQ2pFLGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFKbkUsWUFBTyxHQUFHLElBQUksR0FBRyxFQUErQyxDQUFDO1lBTXpFOzs7ZUFHRztZQUNLLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztZQUUvQzs7O2VBR0c7WUFDSyxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1lBRXpEOzs7OztlQUtHO1lBQ0ssaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBd0MsQ0FBQztRQXBCTyxDQUFDO1FBc0IvRTs7O1dBR0c7UUFDSCw0Q0FBaUIsR0FBakIsVUFBa0IsRUFBaUIsRUFBRSxJQUEwQjtZQUM3RCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxvQ0FBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBRUQ7Ozs7Ozs7V0FPRztRQUNILHNDQUFX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QyxTQUFTLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDekMsS0FBSyxHQUFHLEtBQUssQ0FBQztTQUNmO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtCb3VuZFRhcmdldCwgUGFyc2VTb3VyY2VGaWxlLCBTY2hlbWFNZXRhZGF0YX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Tm9vcEltcG9ydFJld3JpdGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuXG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFwcGluZywgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIFR5cGVDaGVja2luZ0NvbmZpZywgVHlwZUN0b3JNZXRhZGF0YX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtUZW1wbGF0ZVNvdXJjZVJlc29sdmVyfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RG9tU2NoZW1hQ2hlY2tlciwgUmVnaXN0cnlEb21TY2hlbWFDaGVja2VyfSBmcm9tICcuL2RvbSc7XG5pbXBvcnQge0Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7T3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyLCBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXJJbXBsfSBmcm9tICcuL29vYic7XG5pbXBvcnQge1R5cGVDaGVja1NoaW1HZW5lcmF0b3J9IGZyb20gJy4vc2hpbSc7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFuYWdlcn0gZnJvbSAnLi9zb3VyY2UnO1xuaW1wb3J0IHtnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrLCByZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrfSBmcm9tICcuL3R5cGVfY2hlY2tfYmxvY2snO1xuaW1wb3J0IHtUeXBlQ2hlY2tGaWxlfSBmcm9tICcuL3R5cGVfY2hlY2tfZmlsZSc7XG5pbXBvcnQge2dlbmVyYXRlSW5saW5lVHlwZUN0b3IsIHJlcXVpcmVzSW5saW5lVHlwZUN0b3J9IGZyb20gJy4vdHlwZV9jb25zdHJ1Y3Rvcic7XG5cbi8qKlxuICogQ29tcGxldGUgdHlwZS1jaGVja2luZyBjb2RlIGdlbmVyYXRlZCBmb3IgdGhlIHVzZXIncyBwcm9ncmFtLCByZWFkeSBmb3IgaW5wdXQgaW50byB0aGVcbiAqIHR5cGUtY2hlY2tpbmcgZW5naW5lLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFR5cGVDaGVja1JlcXVlc3Qge1xuICAvKipcbiAgICogTWFwIG9mIHNvdXJjZSBmaWxlbmFtZXMgdG8gbmV3IGNvbnRlbnRzIGZvciB0aG9zZSBmaWxlcy5cbiAgICpcbiAgICogVGhpcyBpbmNsdWRlcyBib3RoIGNvbnRlbnRzIG9mIHR5cGUtY2hlY2tpbmcgc2hpbSBmaWxlcywgYXMgd2VsbCBhcyBjaGFuZ2VzIHRvIGFueSB1c2VyIGZpbGVzXG4gICAqIHdoaWNoIG5lZWRlZCB0byBiZSBtYWRlIHRvIHN1cHBvcnQgdGVtcGxhdGUgdHlwZS1jaGVja2luZy5cbiAgICovXG4gIHVwZGF0ZXM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPjtcblxuICAvKipcbiAgICogTWFwIGNvbnRhaW5pbmcgYWRkaXRpb25hbCBkYXRhIGZvciBlYWNoIHR5cGUtY2hlY2tpbmcgc2hpbSB0aGF0IGlzIHJlcXVpcmVkIHRvIHN1cHBvcnRcbiAgICogZ2VuZXJhdGlvbiBvZiBkaWFnbm9zdGljcy5cbiAgICovXG4gIHBlckZpbGVEYXRhOiBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPjtcbn1cblxuLyoqXG4gKiBEYXRhIGZvciBhIHR5cGUtY2hlY2tpbmcgc2hpbSB3aGljaCBpcyByZXF1aXJlZCB0byBzdXBwb3J0IGdlbmVyYXRpb24gb2YgZGlhZ25vc3RpY3MuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVR5cGVDaGVja2luZ0RhdGEge1xuICAvKipcbiAgICogV2hldGhlciB0aGUgdHlwZS1jaGVja2luZyBzaGltIHJlcXVpcmVkIGFueSBpbmxpbmUgY2hhbmdlcyB0byB0aGUgb3JpZ2luYWwgZmlsZSwgd2hpY2ggYWZmZWN0c1xuICAgKiB3aGV0aGVyIHRoZSBzaGltIGNhbiBiZSByZXVzZWQuXG4gICAqL1xuICBoYXNJbmxpbmVzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBTb3VyY2UgbWFwcGluZyBpbmZvcm1hdGlvbiBmb3IgbWFwcGluZyBkaWFnbm9zdGljcyBiYWNrIHRvIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZS5cbiAgICovXG4gIHNvdXJjZVJlc29sdmVyOiBUZW1wbGF0ZVNvdXJjZVJlc29sdmVyO1xuXG4gIC8qKlxuICAgKiBBbnkgYHRzLkRpYWdub3N0aWNgcyB3aGljaCB3ZXJlIHByb2R1Y2VkIGR1cmluZyB0aGUgZ2VuZXJhdGlvbiBvZiB0aGlzIHNoaW0uXG4gICAqXG4gICAqIFNvbWUgZGlhZ25vc3RpY3MgYXJlIHByb2R1Y2VkIGR1cmluZyBjcmVhdGlvbiB0aW1lIGFuZCBhcmUgdHJhY2tlZCBoZXJlLlxuICAgKi9cbiAgZ2VuZXNpc0RpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW107XG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIHNoaW0gZmlsZS5cbiAgICovXG4gIHR5cGVDaGVja0ZpbGU6IEFic29sdXRlRnNQYXRoO1xufVxuXG4vKipcbiAqIERhdGEgZm9yIGEgdHlwZS1jaGVja2luZyBzaGltIHdoaWNoIGlzIHN0aWxsIGhhdmluZyBpdHMgY29kZSBnZW5lcmF0ZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgYW55IGlubGluZSBjb2RlIGhhcyBiZWVuIHJlcXVpcmVkIGJ5IHRoZSBzaGltIHlldC5cbiAgICovXG4gIGhhc0lubGluZXM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIGBUZW1wbGF0ZVNvdXJjZU1hbmFnZXJgIGJlaW5nIHVzZWQgdG8gdHJhY2sgc291cmNlIG1hcHBpbmcgaW5mb3JtYXRpb24gZm9yIHRoaXMgc2hpbS5cbiAgICovXG4gIHNvdXJjZU1hbmFnZXI6IFRlbXBsYXRlU291cmNlTWFuYWdlcjtcblxuICAvKipcbiAgICogUmVjb3JkZXIgZm9yIG91dC1vZi1iYW5kIGRpYWdub3N0aWNzIHdoaWNoIGFyZSByYWlzZWQgZHVyaW5nIGdlbmVyYXRpb24uXG4gICAqL1xuICBvb2JSZWNvcmRlcjogT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyO1xuXG4gIC8qKlxuICAgKiBUaGUgYERvbVNjaGVtYUNoZWNrZXJgIGluIHVzZSBmb3IgdGhpcyB0ZW1wbGF0ZSwgd2hpY2ggcmVjb3JkcyBhbnkgc2NoZW1hLXJlbGF0ZWQgZGlhZ25vc3RpY3MuXG4gICAqL1xuICBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBzaGltIGZpbGUuXG4gICAqL1xuICB0eXBlQ2hlY2tGaWxlOiBUeXBlQ2hlY2tGaWxlO1xufVxuXG4vKipcbiAqIEEgdGVtcGxhdGUgdHlwZSBjaGVja2luZyBjb250ZXh0IGZvciBhIHByb2dyYW0uXG4gKlxuICogVGhlIGBUeXBlQ2hlY2tDb250ZXh0YCBhbGxvd3MgcmVnaXN0cmF0aW9uIG9mIGNvbXBvbmVudHMgYW5kIHRoZWlyIHRlbXBsYXRlcyB3aGljaCBuZWVkIHRvIGJlXG4gKiB0eXBlIGNoZWNrZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlQ2hlY2tDb250ZXh0IHtcbiAgcHJpdmF0ZSBmaWxlTWFwID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZywgcHJpdmF0ZSBjb21waWxlckhvc3Q6IHRzLkNvbXBpbGVySG9zdCxcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIC8qKlxuICAgKiBBIGBNYXBgIG9mIGB0cy5Tb3VyY2VGaWxlYHMgdGhhdCB0aGUgY29udGV4dCBoYXMgc2VlbiB0byB0aGUgb3BlcmF0aW9ucyAoYWRkaXRpb25zIG9mIG1ldGhvZHNcbiAgICogb3IgdHlwZS1jaGVjayBibG9ja3MpIHRoYXQgbmVlZCB0byBiZSBldmVudHVhbGx5IHBlcmZvcm1lZCBvbiB0aGF0IGZpbGUuXG4gICAqL1xuICBwcml2YXRlIG9wTWFwID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBPcFtdPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3Mgd2hlbiBhbiBhIHBhcnRpY3VsYXIgY2xhc3MgaGFzIGEgcGVuZGluZyB0eXBlIGNvbnN0cnVjdG9yIHBhdGNoaW5nIG9wZXJhdGlvbiBhbHJlYWR5XG4gICAqIHF1ZXVlZC5cbiAgICovXG4gIHByaXZhdGUgdHlwZUN0b3JQZW5kaW5nID0gbmV3IFNldDx0cy5DbGFzc0RlY2xhcmF0aW9uPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgZGF0YSBmb3IgZmlsZSBwYXRocyB3aGljaCB3YXMgYWRvcHRlZCBmcm9tIGEgcHJpb3IgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIFRoaXMgZGF0YSBhbGxvd3MgdGhlIGBUeXBlQ2hlY2tDb250ZXh0YCB0byBnZW5lcmF0ZSBhIGBUeXBlQ2hlY2tSZXF1ZXN0YCB3aGljaCBjYW4gaW50ZXJwcmV0XG4gICAqIGRpYWdub3N0aWNzIGZyb20gdHlwZS1jaGVja2luZyBzaGltcyBpbmNsdWRlZCBpbiB0aGUgcHJpb3IgY29tcGlsYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGFkb3B0ZWRGaWxlcyA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPigpO1xuXG4gIC8qKlxuICAgKiBSZWNvcmQgdGhlIGBGaWxlVHlwZUNoZWNraW5nRGF0YWAgZnJvbSBhIHByZXZpb3VzIHByb2dyYW0gdGhhdCdzIGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY3VsYXJcbiAgICogc291cmNlIGZpbGUuXG4gICAqL1xuICBhZG9wdFByaW9yUmVzdWx0cyhzZjogdHMuU291cmNlRmlsZSwgZGF0YTogRmlsZVR5cGVDaGVja2luZ0RhdGEpOiB2b2lkIHtcbiAgICB0aGlzLmFkb3B0ZWRGaWxlcy5zZXQoYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZiksIGRhdGEpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIHRlbXBsYXRlIGZvciB0aGUgZ2l2ZW4gY29tcG9uZW50IGBub2RlYCwgd2l0aCBhIGBTZWxlY3Rvck1hdGNoZXJgIGZvciBkaXJlY3RpdmVcbiAgICogbWF0Y2hpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIGNsYXNzIG9mIHRoZSBub2RlIGJlaW5nIHJlY29yZGVkLlxuICAgKiBAcGFyYW0gdGVtcGxhdGUgQVNUIG5vZGVzIG9mIHRoZSB0ZW1wbGF0ZSBiZWluZyByZWNvcmRlZC5cbiAgICogQHBhcmFtIG1hdGNoZXIgYFNlbGVjdG9yTWF0Y2hlcmAgd2hpY2ggdHJhY2tzIGRpcmVjdGl2ZXMgdGhhdCBhcmUgaW4gc2NvcGUgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAqL1xuICBhZGRUZW1wbGF0ZShcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgYm91bmRUYXJnZXQ6IEJvdW5kVGFyZ2V0PFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhPixcbiAgICAgIHBpcGVzOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4+LFxuICAgICAgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSwgc291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nLFxuICAgICAgZmlsZTogUGFyc2VTb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmRhdGFGb3JGaWxlKHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG5cbiAgICBjb25zdCBpZCA9IGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIuY2FwdHVyZVNvdXJjZShzb3VyY2VNYXBwaW5nLCBmaWxlKTtcbiAgICAvLyBHZXQgYWxsIG9mIHRoZSBkaXJlY3RpdmVzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIGFuZCByZWNvcmQgdHlwZSBjb25zdHJ1Y3RvcnMgZm9yIGFsbCBvZiB0aGVtLlxuICAgIGZvciAoY29uc3QgZGlyIG9mIGJvdW5kVGFyZ2V0LmdldFVzZWREaXJlY3RpdmVzKCkpIHtcbiAgICAgIGNvbnN0IGRpclJlZiA9IGRpci5yZWYgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+O1xuICAgICAgY29uc3QgZGlyTm9kZSA9IGRpclJlZi5ub2RlO1xuICAgICAgaWYgKHJlcXVpcmVzSW5saW5lVHlwZUN0b3IoZGlyTm9kZSwgdGhpcy5yZWZsZWN0b3IpKSB7XG4gICAgICAgIC8vIEFkZCBhIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIGZvciB0aGUgZGlyZWN0aXZlLlxuICAgICAgICB0aGlzLmFkZElubGluZVR5cGVDdG9yKGZpbGVEYXRhLCBkaXJOb2RlLmdldFNvdXJjZUZpbGUoKSwgZGlyUmVmLCB7XG4gICAgICAgICAgZm5OYW1lOiAnbmdUeXBlQ3RvcicsXG4gICAgICAgICAgLy8gVGhlIGNvbnN0cnVjdG9yIHNob3VsZCBoYXZlIGEgYm9keSBpZiB0aGUgZGlyZWN0aXZlIGNvbWVzIGZyb20gYSAudHMgZmlsZSwgYnV0IG5vdCBpZlxuICAgICAgICAgIC8vIGl0IGNvbWVzIGZyb20gYSAuZC50cyBmaWxlLiAuZC50cyBkZWNsYXJhdGlvbnMgZG9uJ3QgaGF2ZSBib2RpZXMuXG4gICAgICAgICAgYm9keTogIWRpck5vZGUuZ2V0U291cmNlRmlsZSgpLmlzRGVjbGFyYXRpb25GaWxlLFxuICAgICAgICAgIGZpZWxkczoge1xuICAgICAgICAgICAgaW5wdXRzOiBPYmplY3Qua2V5cyhkaXIuaW5wdXRzKSxcbiAgICAgICAgICAgIG91dHB1dHM6IE9iamVjdC5rZXlzKGRpci5vdXRwdXRzKSxcbiAgICAgICAgICAgIC8vIFRPRE8oYWx4aHViKTogc3VwcG9ydCBxdWVyaWVzXG4gICAgICAgICAgICBxdWVyaWVzOiBkaXIucXVlcmllcyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvZXJjZWRJbnB1dEZpZWxkczogZGlyLmNvZXJjZWRJbnB1dEZpZWxkcyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdGNiTWV0YWRhdGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEgPSB7aWQsIGJvdW5kVGFyZ2V0LCBwaXBlcywgc2NoZW1hc307XG4gICAgaWYgKHJlcXVpcmVzSW5saW5lVHlwZUNoZWNrQmxvY2socmVmLm5vZGUpKSB7XG4gICAgICAvLyBUaGlzIGNsYXNzIGRpZG4ndCBtZWV0IHRoZSByZXF1aXJlbWVudHMgZm9yIGV4dGVybmFsIHR5cGUgY2hlY2tpbmcsIHNvIGdlbmVyYXRlIGFuIGlubGluZVxuICAgICAgLy8gVENCIGZvciB0aGUgY2xhc3MuXG4gICAgICB0aGlzLmFkZElubGluZVR5cGVDaGVja0Jsb2NrKGZpbGVEYXRhLCByZWYsIHRjYk1ldGFkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIGNsYXNzIGNhbiBiZSB0eXBlLWNoZWNrZWQgZXh0ZXJuYWxseSBhcyBub3JtYWwuXG4gICAgICBmaWxlRGF0YS50eXBlQ2hlY2tGaWxlLmFkZFR5cGVDaGVja0Jsb2NrKFxuICAgICAgICAgIHJlZiwgdGNiTWV0YWRhdGEsIGZpbGVEYXRhLmRvbVNjaGVtYUNoZWNrZXIsIGZpbGVEYXRhLm9vYlJlY29yZGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkIGEgdHlwZSBjb25zdHJ1Y3RvciBmb3IgdGhlIGdpdmVuIGBub2RlYCB3aXRoIHRoZSBnaXZlbiBgY3Rvck1ldGFkYXRhYC5cbiAgICovXG4gIGFkZElubGluZVR5cGVDdG9yKFxuICAgICAgZmlsZURhdGE6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSwgc2Y6IHRzLlNvdXJjZUZpbGUsXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PiwgY3Rvck1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpOiB2b2lkIHtcbiAgICBpZiAodGhpcy50eXBlQ3RvclBlbmRpbmcuaGFzKHJlZi5ub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnR5cGVDdG9yUGVuZGluZy5hZGQocmVmLm5vZGUpO1xuXG4gICAgLy8gTGF6aWx5IGNvbnN0cnVjdCB0aGUgb3BlcmF0aW9uIG1hcC5cbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgdGhpcy5vcE1hcC5zZXQoc2YsIFtdKTtcbiAgICB9XG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpITtcblxuICAgIC8vIFB1c2ggYSBgVHlwZUN0b3JPcGAgaW50byB0aGUgb3BlcmF0aW9uIHF1ZXVlIGZvciB0aGUgc291cmNlIGZpbGUuXG4gICAgb3BzLnB1c2gobmV3IFR5cGVDdG9yT3AocmVmLCBjdG9yTWV0YSkpO1xuICAgIGZpbGVEYXRhLmhhc0lubGluZXMgPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybSBhIGB0cy5Tb3VyY2VGaWxlYCBpbnRvIGEgdmVyc2lvbiB0aGF0IGluY2x1ZGVzIHR5cGUgY2hlY2tpbmcgY29kZS5cbiAgICpcbiAgICogSWYgdGhpcyBwYXJ0aWN1bGFyIGB0cy5Tb3VyY2VGaWxlYCByZXF1aXJlcyBjaGFuZ2VzLCB0aGUgdGV4dCByZXByZXNlbnRpbmcgaXRzIG5ldyBjb250ZW50c1xuICAgKiB3aWxsIGJlIHJldHVybmVkLiBPdGhlcndpc2UsIGEgYG51bGxgIHJldHVybiBpbmRpY2F0ZXMgbm8gY2hhbmdlcyB3ZXJlIG5lY2Vzc2FyeS5cbiAgICovXG4gIHRyYW5zZm9ybShzZjogdHMuU291cmNlRmlsZSk6IHN0cmluZ3xudWxsIHtcbiAgICAvLyBJZiB0aGVyZSBhcmUgbm8gb3BlcmF0aW9ucyBwZW5kaW5nIGZvciB0aGlzIHBhcnRpY3VsYXIgZmlsZSwgcmV0dXJuIGBudWxsYCB0byBpbmRpY2F0ZSBub1xuICAgIC8vIGNoYW5nZXMuXG4gICAgaWYgKCF0aGlzLm9wTWFwLmhhcyhzZikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEltcG9ydHMgbWF5IG5lZWQgdG8gYmUgYWRkZWQgdG8gdGhlIGZpbGUgdG8gc3VwcG9ydCB0eXBlLWNoZWNraW5nIG9mIGRpcmVjdGl2ZXMgdXNlZCBpbiB0aGVcbiAgICAvLyB0ZW1wbGF0ZSB3aXRoaW4gaXQuXG4gICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKSwgJ19pJyk7XG5cbiAgICAvLyBFYWNoIE9wIGhhcyBhIHNwbGl0UG9pbnQgaW5kZXggaW50byB0aGUgdGV4dCB3aGVyZSBpdCBuZWVkcyB0byBiZSBpbnNlcnRlZC4gU3BsaXQgdGhlXG4gICAgLy8gb3JpZ2luYWwgc291cmNlIHRleHQgaW50byBjaHVua3MgYXQgdGhlc2Ugc3BsaXQgcG9pbnRzLCB3aGVyZSBjb2RlIHdpbGwgYmUgaW5zZXJ0ZWQgYmV0d2VlblxuICAgIC8vIHRoZSBjaHVua3MuXG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpIS5zb3J0KG9yZGVyT3BzKTtcbiAgICBjb25zdCB0ZXh0UGFydHMgPSBzcGxpdFN0cmluZ0F0UG9pbnRzKHNmLnRleHQsIG9wcy5tYXAob3AgPT4gb3Auc3BsaXRQb2ludCkpO1xuXG4gICAgLy8gVXNlIGEgYHRzLlByaW50ZXJgIHRvIGdlbmVyYXRlIHNvdXJjZSBjb2RlLlxuICAgIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKHtvbWl0VHJhaWxpbmdTZW1pY29sb246IHRydWV9KTtcblxuICAgIC8vIEJlZ2luIHdpdGggdGhlIGludGlhbCBzZWN0aW9uIG9mIHRoZSBjb2RlIHRleHQuXG4gICAgbGV0IGNvZGUgPSB0ZXh0UGFydHNbMF07XG5cbiAgICAvLyBQcm9jZXNzIGVhY2ggb3BlcmF0aW9uIGFuZCB1c2UgdGhlIHByaW50ZXIgdG8gZ2VuZXJhdGUgc291cmNlIGNvZGUgZm9yIGl0LCBpbnNlcnRpbmcgaXQgaW50b1xuICAgIC8vIHRoZSBzb3VyY2UgY29kZSBpbiBiZXR3ZWVuIHRoZSBvcmlnaW5hbCBjaHVua3MuXG4gICAgb3BzLmZvckVhY2goKG9wLCBpZHgpID0+IHtcbiAgICAgIGNvbnN0IHRleHQgPSBvcC5leGVjdXRlKGltcG9ydE1hbmFnZXIsIHNmLCB0aGlzLnJlZkVtaXR0ZXIsIHByaW50ZXIpO1xuICAgICAgY29kZSArPSAnXFxuXFxuJyArIHRleHQgKyB0ZXh0UGFydHNbaWR4ICsgMV07XG4gICAgfSk7XG5cbiAgICAvLyBXcml0ZSBvdXQgdGhlIGltcG9ydHMgdGhhdCBuZWVkIHRvIGJlIGFkZGVkIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZpbGUuXG4gICAgbGV0IGltcG9ydHMgPSBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoc2YuZmlsZU5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgLm1hcChpID0+IGBpbXBvcnQgKiBhcyAke2kucXVhbGlmaWVyfSBmcm9tICcke2kuc3BlY2lmaWVyfSc7YClcbiAgICAgICAgICAgICAgICAgICAgICAuam9pbignXFxuJyk7XG4gICAgY29kZSA9IGltcG9ydHMgKyAnXFxuJyArIGNvZGU7XG5cbiAgICByZXR1cm4gY29kZTtcbiAgfVxuXG4gIGZpbmFsaXplKCk6IFR5cGVDaGVja1JlcXVlc3Qge1xuICAgIC8vIEZpcnN0LCBidWlsZCB0aGUgbWFwIG9mIHVwZGF0ZXMgdG8gc291cmNlIGZpbGVzLlxuICAgIGNvbnN0IHVwZGF0ZXMgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBvcmlnaW5hbFNmIG9mIHRoaXMub3BNYXAua2V5cygpKSB7XG4gICAgICBjb25zdCBuZXdUZXh0ID0gdGhpcy50cmFuc2Zvcm0ob3JpZ2luYWxTZik7XG4gICAgICBpZiAobmV3VGV4dCAhPT0gbnVsbCkge1xuICAgICAgICB1cGRhdGVzLnNldChhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKG9yaWdpbmFsU2YpLCBuZXdUZXh0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHRzOiBUeXBlQ2hlY2tSZXF1ZXN0ID0ge1xuICAgICAgdXBkYXRlczogdXBkYXRlcyxcbiAgICAgIHBlckZpbGVEYXRhOiBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBGaWxlVHlwZUNoZWNraW5nRGF0YT4oKSxcbiAgICB9O1xuXG4gICAgZm9yIChjb25zdCBbc2ZQYXRoLCBmaWxlRGF0YV0gb2YgdGhpcy5maWxlTWFwLmVudHJpZXMoKSkge1xuICAgICAgdXBkYXRlcy5zZXQoZmlsZURhdGEudHlwZUNoZWNrRmlsZS5maWxlTmFtZSwgZmlsZURhdGEudHlwZUNoZWNrRmlsZS5yZW5kZXIoKSk7XG4gICAgICByZXN1bHRzLnBlckZpbGVEYXRhLnNldChzZlBhdGgsIHtcbiAgICAgICAgZ2VuZXNpc0RpYWdub3N0aWNzOiBbXG4gICAgICAgICAgLi4uZmlsZURhdGEuZG9tU2NoZW1hQ2hlY2tlci5kaWFnbm9zdGljcyxcbiAgICAgICAgICAuLi5maWxlRGF0YS5vb2JSZWNvcmRlci5kaWFnbm9zdGljcyxcbiAgICAgICAgXSxcbiAgICAgICAgaGFzSW5saW5lczogZmlsZURhdGEuaGFzSW5saW5lcyxcbiAgICAgICAgc291cmNlUmVzb2x2ZXI6IGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIsXG4gICAgICAgIHR5cGVDaGVja0ZpbGU6IGZpbGVEYXRhLnR5cGVDaGVja0ZpbGUuZmlsZU5hbWUsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IFtzZlBhdGgsIGZpbGVEYXRhXSBvZiB0aGlzLmFkb3B0ZWRGaWxlcy5lbnRyaWVzKCkpIHtcbiAgICAgIHJlc3VsdHMucGVyRmlsZURhdGEuc2V0KHNmUGF0aCwgZmlsZURhdGEpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRJbmxpbmVUeXBlQ2hlY2tCbG9jayhcbiAgICAgIGZpbGVEYXRhOiBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEsIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgdGNiTWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IHNmID0gcmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikhO1xuICAgIG9wcy5wdXNoKG5ldyBUY2JPcChcbiAgICAgICAgcmVmLCB0Y2JNZXRhLCB0aGlzLmNvbmZpZywgdGhpcy5yZWZsZWN0b3IsIGZpbGVEYXRhLmRvbVNjaGVtYUNoZWNrZXIsXG4gICAgICAgIGZpbGVEYXRhLm9vYlJlY29yZGVyKSk7XG4gICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gIH1cblxuICBwcml2YXRlIGRhdGFGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlKTogUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhIHtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcblxuICAgIGlmICghdGhpcy5maWxlTWFwLmhhcyhzZlBhdGgpKSB7XG4gICAgICBjb25zdCBzb3VyY2VNYW5hZ2VyID0gbmV3IFRlbXBsYXRlU291cmNlTWFuYWdlcigpO1xuICAgICAgY29uc3QgZGF0YTogUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhID0ge1xuICAgICAgICBkb21TY2hlbWFDaGVja2VyOiBuZXcgUmVnaXN0cnlEb21TY2hlbWFDaGVja2VyKHNvdXJjZU1hbmFnZXIpLFxuICAgICAgICBvb2JSZWNvcmRlcjogbmV3IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlckltcGwoc291cmNlTWFuYWdlciksXG4gICAgICAgIHR5cGVDaGVja0ZpbGU6IG5ldyBUeXBlQ2hlY2tGaWxlKFxuICAgICAgICAgICAgVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKHNmUGF0aCksIHRoaXMuY29uZmlnLCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yLFxuICAgICAgICAgICAgdGhpcy5jb21waWxlckhvc3QpLFxuICAgICAgICBoYXNJbmxpbmVzOiBmYWxzZSxcbiAgICAgICAgc291cmNlTWFuYWdlcixcbiAgICAgIH07XG4gICAgICB0aGlzLmZpbGVNYXAuc2V0KHNmUGF0aCwgZGF0YSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZmlsZU1hcC5nZXQoc2ZQYXRoKSE7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb24gdGhhdCBuZWVkcyB0byBoYXBwZW4gd2l0aGluIGEgZ2l2ZW4gc291cmNlIGZpbGUuXG4gKi9cbmludGVyZmFjZSBPcCB7XG4gIC8qKlxuICAgKiBUaGUgbm9kZSBpbiB0aGUgZmlsZSB3aGljaCB3aWxsIGhhdmUgY29kZSBnZW5lcmF0ZWQgZm9yIGl0LlxuICAgKi9cbiAgcmVhZG9ubHkgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG5cbiAgLyoqXG4gICAqIEluZGV4IGludG8gdGhlIHNvdXJjZSB0ZXh0IHdoZXJlIHRoZSBjb2RlIGdlbmVyYXRlZCBieSB0aGUgb3BlcmF0aW9uIHNob3VsZCBiZSBpbnNlcnRlZC5cbiAgICovXG4gIHJlYWRvbmx5IHNwbGl0UG9pbnQ6IG51bWJlcjtcblxuICAvKipcbiAgICogRXhlY3V0ZSB0aGUgb3BlcmF0aW9uIGFuZCByZXR1cm4gdGhlIGdlbmVyYXRlZCBjb2RlIGFzIHRleHQuXG4gICAqL1xuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB0eXBlIGNoZWNrIGJsb2NrIG9wZXJhdGlvbiB3aGljaCBwcm9kdWNlcyB0eXBlIGNoZWNrIGNvZGUgZm9yIGEgcGFydGljdWxhciBjb21wb25lbnQuXG4gKi9cbmNsYXNzIFRjYk9wIGltcGxlbWVudHMgT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgcmVhZG9ubHkgbWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgcmVhZG9ubHkgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsXG4gICAgICByZWFkb25seSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCByZWFkb25seSBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLFxuICAgICAgcmVhZG9ubHkgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcikge31cblxuICAvKipcbiAgICogVHlwZSBjaGVjayBibG9ja3MgYXJlIGluc2VydGVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBlbmQgb2YgdGhlIGNvbXBvbmVudCBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucmVmLm5vZGUuZW5kICsgMTtcbiAgfVxuXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZyB7XG4gICAgY29uc3QgZW52ID0gbmV3IEVudmlyb25tZW50KHRoaXMuY29uZmlnLCBpbSwgcmVmRW1pdHRlciwgdGhpcy5yZWZsZWN0b3IsIHNmKTtcbiAgICBjb25zdCBmbk5hbWUgPSB0cy5jcmVhdGVJZGVudGlmaWVyKGBfdGNiXyR7dGhpcy5yZWYubm9kZS5wb3N9YCk7XG4gICAgY29uc3QgZm4gPSBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgICBlbnYsIHRoaXMucmVmLCBmbk5hbWUsIHRoaXMubWV0YSwgdGhpcy5kb21TY2hlbWFDaGVja2VyLCB0aGlzLm9vYlJlY29yZGVyKTtcbiAgICByZXR1cm4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIGZuLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIHdoaWNoIHByb2R1Y2VzIHR5cGUgY29uc3RydWN0b3IgY29kZSBmb3IgYSBwYXJ0aWN1bGFyIGRpcmVjdGl2ZS5cbiAqL1xuY2xhc3MgVHlwZUN0b3JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHJlYWRvbmx5IG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9ucyBhcmUgaW5zZXJ0ZWQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBlbmQgb2YgdGhlIGRpcmVjdGl2ZSBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucmVmLm5vZGUuZW5kIC0gMTtcbiAgfVxuXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZyB7XG4gICAgY29uc3QgdGNiID0gZ2VuZXJhdGVJbmxpbmVUeXBlQ3Rvcih0aGlzLnJlZi5ub2RlLCB0aGlzLm1ldGEpO1xuICAgIHJldHVybiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdGNiLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wYXJlIHR3byBvcGVyYXRpb25zIGFuZCByZXR1cm4gdGhlaXIgc3BsaXQgcG9pbnQgb3JkZXJpbmcuXG4gKi9cbmZ1bmN0aW9uIG9yZGVyT3BzKG9wMTogT3AsIG9wMjogT3ApOiBudW1iZXIge1xuICByZXR1cm4gb3AxLnNwbGl0UG9pbnQgLSBvcDIuc3BsaXRQb2ludDtcbn1cblxuLyoqXG4gKiBTcGxpdCBhIHN0cmluZyBpbnRvIGNodW5rcyBhdCBhbnkgbnVtYmVyIG9mIHNwbGl0IHBvaW50cy5cbiAqL1xuZnVuY3Rpb24gc3BsaXRTdHJpbmdBdFBvaW50cyhzdHI6IHN0cmluZywgcG9pbnRzOiBudW1iZXJbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgc3BsaXRzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgc3RhcnQgPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBvaW50ID0gcG9pbnRzW2ldO1xuICAgIHNwbGl0cy5wdXNoKHN0ci5zdWJzdHJpbmcoc3RhcnQsIHBvaW50KSk7XG4gICAgc3RhcnQgPSBwb2ludDtcbiAgfVxuICBzcGxpdHMucHVzaChzdHIuc3Vic3RyaW5nKHN0YXJ0KSk7XG4gIHJldHVybiBzcGxpdHM7XG59XG4iXX0=