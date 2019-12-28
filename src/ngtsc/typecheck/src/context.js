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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/context", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/dom", "@angular/compiler-cli/src/ngtsc/typecheck/src/environment", "@angular/compiler-cli/src/ngtsc/typecheck/src/host", "@angular/compiler-cli/src/ngtsc/typecheck/src/oob", "@angular/compiler-cli/src/ngtsc/typecheck/src/source", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    var dom_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/dom");
    var environment_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/environment");
    var host_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/host");
    var oob_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/oob");
    var source_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/source");
    var type_check_block_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block");
    var type_check_file_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file");
    var type_constructor_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor");
    /**
     * A template type checking context for a program.
     *
     * The `TypeCheckContext` allows registration of components and their templates which need to be
     * type checked. It also allows generation of modified `ts.SourceFile`s which contain the type
     * checking code.
     */
    var TypeCheckContext = /** @class */ (function () {
        function TypeCheckContext(config, refEmitter, typeCheckFilePath) {
            this.config = config;
            this.refEmitter = refEmitter;
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
            this.sourceManager = new source_1.TemplateSourceManager();
            this.domSchemaChecker = new dom_1.RegistryDomSchemaChecker(this.sourceManager);
            this.oobRecorder = new oob_1.OutOfBandDiagnosticRecorderImpl(this.sourceManager);
            this.typeCheckFile = new type_check_file_1.TypeCheckFile(typeCheckFilePath, this.config, this.refEmitter);
        }
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
            var id = this.sourceManager.captureSource(sourceMapping, file);
            try {
                // Get all of the directives used in the template and record type constructors for all of them.
                for (var _b = tslib_1.__values(boundTarget.getUsedDirectives()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var dir = _c.value;
                    var dirRef = dir.ref;
                    var dirNode = dirRef.node;
                    if (type_constructor_1.requiresInlineTypeCtor(dirNode)) {
                        // Add a type constructor operation for the directive.
                        this.addInlineTypeCtor(dirNode.getSourceFile(), dirRef, {
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
                this.addInlineTypeCheckBlock(ref, tcbMetadata);
            }
            else {
                // The class can be type-checked externally as normal.
                this.typeCheckFile.addTypeCheckBlock(ref, tcbMetadata, this.domSchemaChecker, this.oobRecorder);
            }
        };
        /**
         * Record a type constructor for the given `node` with the given `ctorMetadata`.
         */
        TypeCheckContext.prototype.addInlineTypeCtor = function (sf, ref, ctorMeta) {
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
        };
        /**
         * Transform a `ts.SourceFile` into a version that includes type checking code.
         *
         * If this particular source file has no directives that require type constructors, or components
         * that require type check blocks, then it will be returned directly. Otherwise, a new
         * `ts.SourceFile` is parsed from modified text of the original. This is necessary to ensure the
         * added code has correct positional information associated with it.
         */
        TypeCheckContext.prototype.transform = function (sf) {
            var _this = this;
            // If there are no operations pending for this particular file, return it directly.
            if (!this.opMap.has(sf)) {
                return sf;
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
            // Parse the new source file and return it.
            return ts.createSourceFile(sf.fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        };
        TypeCheckContext.prototype.calculateTemplateDiagnostics = function (originalProgram, originalHost, originalOptions) {
            var e_2, _a, e_3, _b;
            var _this = this;
            var typeCheckSf = this.typeCheckFile.render();
            // First, build the map of original source files.
            var sfMap = new Map();
            var interestingFiles = [typeCheckSf];
            try {
                for (var _c = tslib_1.__values(originalProgram.getSourceFiles()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var originalSf = _d.value;
                    var sf = this.transform(originalSf);
                    sfMap.set(sf.fileName, sf);
                    if (!sf.isDeclarationFile && this.opMap.has(originalSf)) {
                        interestingFiles.push(sf);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_2) throw e_2.error; }
            }
            sfMap.set(typeCheckSf.fileName, typeCheckSf);
            var typeCheckProgram = ts.createProgram({
                host: new host_1.TypeCheckProgramHost(sfMap, originalHost),
                options: originalOptions,
                oldProgram: originalProgram,
                rootNames: originalProgram.getRootFileNames(),
            });
            var diagnostics = [];
            var collectDiagnostics = function (diags) {
                var e_4, _a;
                try {
                    for (var diags_1 = tslib_1.__values(diags), diags_1_1 = diags_1.next(); !diags_1_1.done; diags_1_1 = diags_1.next()) {
                        var diagnostic = diags_1_1.value;
                        if (diagnostics_1.shouldReportDiagnostic(diagnostic)) {
                            var translated = diagnostics_1.translateDiagnostic(diagnostic, _this.sourceManager);
                            if (translated !== null) {
                                diagnostics.push(translated);
                            }
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (diags_1_1 && !diags_1_1.done && (_a = diags_1.return)) _a.call(diags_1);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            };
            try {
                for (var interestingFiles_1 = tslib_1.__values(interestingFiles), interestingFiles_1_1 = interestingFiles_1.next(); !interestingFiles_1_1.done; interestingFiles_1_1 = interestingFiles_1.next()) {
                    var sf = interestingFiles_1_1.value;
                    collectDiagnostics(typeCheckProgram.getSemanticDiagnostics(sf));
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (interestingFiles_1_1 && !interestingFiles_1_1.done && (_b = interestingFiles_1.return)) _b.call(interestingFiles_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            diagnostics.push.apply(diagnostics, tslib_1.__spread(this.domSchemaChecker.diagnostics));
            diagnostics.push.apply(diagnostics, tslib_1.__spread(this.oobRecorder.diagnostics));
            return {
                diagnostics: diagnostics,
                program: typeCheckProgram,
            };
        };
        TypeCheckContext.prototype.addInlineTypeCheckBlock = function (ref, tcbMeta) {
            var sf = ref.node.getSourceFile();
            if (!this.opMap.has(sf)) {
                this.opMap.set(sf, []);
            }
            var ops = this.opMap.get(sf);
            ops.push(new TcbOp(ref, tcbMeta, this.config, this.domSchemaChecker, this.oobRecorder));
        };
        return TypeCheckContext;
    }());
    exports.TypeCheckContext = TypeCheckContext;
    /**
     * A type check block operation which produces type check code for a particular component.
     */
    var TcbOp = /** @class */ (function () {
        function TcbOp(ref, meta, config, domSchemaChecker, oobRecorder) {
            this.ref = ref;
            this.meta = meta;
            this.config = config;
            this.domSchemaChecker = domSchemaChecker;
            this.oobRecorder = oobRecorder;
        }
        Object.defineProperty(TcbOp.prototype, "splitPoint", {
            /**
             * Type check blocks are inserted immediately after the end of the component class.
             */
            get: function () { return this.ref.node.end + 1; },
            enumerable: true,
            configurable: true
        });
        TcbOp.prototype.execute = function (im, sf, refEmitter, printer) {
            var env = new environment_1.Environment(this.config, im, refEmitter, sf);
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
            get: function () { return this.ref.node.end - 1; },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUdqQyxtRUFBOEU7SUFFOUUseUVBQStDO0lBRy9DLHlGQUEwRTtJQUMxRSx5RUFBaUU7SUFDakUseUZBQTBDO0lBQzFDLDJFQUE0QztJQUM1Qyx5RUFBbUY7SUFDbkYsK0VBQStDO0lBQy9DLG1HQUF3RjtJQUN4RixpR0FBZ0Q7SUFDaEQsbUdBQWtGO0lBSWxGOzs7Ozs7T0FNRztJQUNIO1FBR0UsMEJBQ1ksTUFBMEIsRUFBVSxVQUE0QixFQUN4RSxpQkFBaUM7WUFEekIsV0FBTSxHQUFOLE1BQU0sQ0FBb0I7WUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUs1RTs7O2VBR0c7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7WUFFL0M7OztlQUdHO1lBQ0ssb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztZQUVqRCxrQkFBYSxHQUFHLElBQUksOEJBQXFCLEVBQUUsQ0FBQztZQUU1QyxxQkFBZ0IsR0FBRyxJQUFJLDhCQUF3QixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUVwRSxnQkFBVyxHQUFHLElBQUkscUNBQStCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBbkI1RSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksK0JBQWEsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMxRixDQUFDO1FBb0JEOzs7Ozs7O1dBT0c7UUFDSCxzQ0FBVyxHQUFYLFVBQ0ksR0FBcUQsRUFDckQsV0FBb0QsRUFDcEQsS0FB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QUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzdELENBQUM7UUFDSCxpQkFBQztJQUFELENBQUMsQUFmRCxJQWVDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLFFBQVEsQ0FBQyxHQUFPLEVBQUUsR0FBTztRQUNoQyxPQUFPLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLG1CQUFtQixDQUFDLEdBQVcsRUFBRSxNQUFnQjtRQUN4RCxJQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDNUIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDdEMsSUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN6QyxLQUFLLEdBQUcsS0FBSyxDQUFDO1NBQ2Y7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNsQyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0JvdW5kVGFyZ2V0LCBQYXJzZVNvdXJjZUZpbGUsIFNjaGVtYU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOb29wSW1wb3J0UmV3cml0ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyfSBmcm9tICcuLi8uLi90cmFuc2xhdG9yJztcblxuaW1wb3J0IHtUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBUeXBlQ2hlY2tpbmdDb25maWcsIFR5cGVDdG9yTWV0YWRhdGF9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7c2hvdWxkUmVwb3J0RGlhZ25vc3RpYywgdHJhbnNsYXRlRGlhZ25vc3RpY30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RvbVNjaGVtYUNoZWNrZXIsIFJlZ2lzdHJ5RG9tU2NoZW1hQ2hlY2tlcn0gZnJvbSAnLi9kb20nO1xuaW1wb3J0IHtFbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge1R5cGVDaGVja1Byb2dyYW1Ib3N0fSBmcm9tICcuL2hvc3QnO1xuaW1wb3J0IHtPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIsIE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlckltcGx9IGZyb20gJy4vb29iJztcbmltcG9ydCB7VGVtcGxhdGVTb3VyY2VNYW5hZ2VyfSBmcm9tICcuL3NvdXJjZSc7XG5pbXBvcnQge2dlbmVyYXRlVHlwZUNoZWNrQmxvY2ssIHJlcXVpcmVzSW5saW5lVHlwZUNoZWNrQmxvY2t9IGZyb20gJy4vdHlwZV9jaGVja19ibG9jayc7XG5pbXBvcnQge1R5cGVDaGVja0ZpbGV9IGZyb20gJy4vdHlwZV9jaGVja19maWxlJztcbmltcG9ydCB7Z2VuZXJhdGVJbmxpbmVUeXBlQ3RvciwgcmVxdWlyZXNJbmxpbmVUeXBlQ3Rvcn0gZnJvbSAnLi90eXBlX2NvbnN0cnVjdG9yJztcblxuXG5cbi8qKlxuICogQSB0ZW1wbGF0ZSB0eXBlIGNoZWNraW5nIGNvbnRleHQgZm9yIGEgcHJvZ3JhbS5cbiAqXG4gKiBUaGUgYFR5cGVDaGVja0NvbnRleHRgIGFsbG93cyByZWdpc3RyYXRpb24gb2YgY29tcG9uZW50cyBhbmQgdGhlaXIgdGVtcGxhdGVzIHdoaWNoIG5lZWQgdG8gYmVcbiAqIHR5cGUgY2hlY2tlZC4gSXQgYWxzbyBhbGxvd3MgZ2VuZXJhdGlvbiBvZiBtb2RpZmllZCBgdHMuU291cmNlRmlsZWBzIHdoaWNoIGNvbnRhaW4gdGhlIHR5cGVcbiAqIGNoZWNraW5nIGNvZGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlQ2hlY2tDb250ZXh0IHtcbiAgcHJpdmF0ZSB0eXBlQ2hlY2tGaWxlOiBUeXBlQ2hlY2tGaWxlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZywgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLFxuICAgICAgdHlwZUNoZWNrRmlsZVBhdGg6IEFic29sdXRlRnNQYXRoKSB7XG4gICAgdGhpcy50eXBlQ2hlY2tGaWxlID0gbmV3IFR5cGVDaGVja0ZpbGUodHlwZUNoZWNrRmlsZVBhdGgsIHRoaXMuY29uZmlnLCB0aGlzLnJlZkVtaXR0ZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgYE1hcGAgb2YgYHRzLlNvdXJjZUZpbGVgcyB0aGF0IHRoZSBjb250ZXh0IGhhcyBzZWVuIHRvIHRoZSBvcGVyYXRpb25zIChhZGRpdGlvbnMgb2YgbWV0aG9kc1xuICAgKiBvciB0eXBlLWNoZWNrIGJsb2NrcykgdGhhdCBuZWVkIHRvIGJlIGV2ZW50dWFsbHkgcGVyZm9ybWVkIG9uIHRoYXQgZmlsZS5cbiAgICovXG4gIHByaXZhdGUgb3BNYXAgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIE9wW10+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyB3aGVuIGFuIGEgcGFydGljdWxhciBjbGFzcyBoYXMgYSBwZW5kaW5nIHR5cGUgY29uc3RydWN0b3IgcGF0Y2hpbmcgb3BlcmF0aW9uIGFscmVhZHlcbiAgICogcXVldWVkLlxuICAgKi9cbiAgcHJpdmF0ZSB0eXBlQ3RvclBlbmRpbmcgPSBuZXcgU2V0PHRzLkNsYXNzRGVjbGFyYXRpb24+KCk7XG5cbiAgcHJpdmF0ZSBzb3VyY2VNYW5hZ2VyID0gbmV3IFRlbXBsYXRlU291cmNlTWFuYWdlcigpO1xuXG4gIHByaXZhdGUgZG9tU2NoZW1hQ2hlY2tlciA9IG5ldyBSZWdpc3RyeURvbVNjaGVtYUNoZWNrZXIodGhpcy5zb3VyY2VNYW5hZ2VyKTtcblxuICBwcml2YXRlIG9vYlJlY29yZGVyID0gbmV3IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlckltcGwodGhpcy5zb3VyY2VNYW5hZ2VyKTtcblxuICAvKipcbiAgICogUmVjb3JkIGEgdGVtcGxhdGUgZm9yIHRoZSBnaXZlbiBjb21wb25lbnQgYG5vZGVgLCB3aXRoIGEgYFNlbGVjdG9yTWF0Y2hlcmAgZm9yIGRpcmVjdGl2ZVxuICAgKiBtYXRjaGluZy5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgY2xhc3Mgb2YgdGhlIG5vZGUgYmVpbmcgcmVjb3JkZWQuXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZSBBU1Qgbm9kZXMgb2YgdGhlIHRlbXBsYXRlIGJlaW5nIHJlY29yZGVkLlxuICAgKiBAcGFyYW0gbWF0Y2hlciBgU2VsZWN0b3JNYXRjaGVyYCB3aGljaCB0cmFja3MgZGlyZWN0aXZlcyB0aGF0IGFyZSBpbiBzY29wZSBmb3IgdGhpcyB0ZW1wbGF0ZS5cbiAgICovXG4gIGFkZFRlbXBsYXRlKFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sXG4gICAgICBib3VuZFRhcmdldDogQm91bmRUYXJnZXQ8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+LFxuICAgICAgcGlwZXM6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pj4sXG4gICAgICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdLCBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsXG4gICAgICBmaWxlOiBQYXJzZVNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCBpZCA9IHRoaXMuc291cmNlTWFuYWdlci5jYXB0dXJlU291cmNlKHNvdXJjZU1hcHBpbmcsIGZpbGUpO1xuICAgIC8vIEdldCBhbGwgb2YgdGhlIGRpcmVjdGl2ZXMgdXNlZCBpbiB0aGUgdGVtcGxhdGUgYW5kIHJlY29yZCB0eXBlIGNvbnN0cnVjdG9ycyBmb3IgYWxsIG9mIHRoZW0uXG4gICAgZm9yIChjb25zdCBkaXIgb2YgYm91bmRUYXJnZXQuZ2V0VXNlZERpcmVjdGl2ZXMoKSkge1xuICAgICAgY29uc3QgZGlyUmVmID0gZGlyLnJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG4gICAgICBjb25zdCBkaXJOb2RlID0gZGlyUmVmLm5vZGU7XG4gICAgICBpZiAocmVxdWlyZXNJbmxpbmVUeXBlQ3RvcihkaXJOb2RlKSkge1xuICAgICAgICAvLyBBZGQgYSB0eXBlIGNvbnN0cnVjdG9yIG9wZXJhdGlvbiBmb3IgdGhlIGRpcmVjdGl2ZS5cbiAgICAgICAgdGhpcy5hZGRJbmxpbmVUeXBlQ3RvcihkaXJOb2RlLmdldFNvdXJjZUZpbGUoKSwgZGlyUmVmLCB7XG4gICAgICAgICAgZm5OYW1lOiAnbmdUeXBlQ3RvcicsXG4gICAgICAgICAgLy8gVGhlIGNvbnN0cnVjdG9yIHNob3VsZCBoYXZlIGEgYm9keSBpZiB0aGUgZGlyZWN0aXZlIGNvbWVzIGZyb20gYSAudHMgZmlsZSwgYnV0IG5vdCBpZlxuICAgICAgICAgIC8vIGl0IGNvbWVzIGZyb20gYSAuZC50cyBmaWxlLiAuZC50cyBkZWNsYXJhdGlvbnMgZG9uJ3QgaGF2ZSBib2RpZXMuXG4gICAgICAgICAgYm9keTogIWRpck5vZGUuZ2V0U291cmNlRmlsZSgpLmlzRGVjbGFyYXRpb25GaWxlLFxuICAgICAgICAgIGZpZWxkczoge1xuICAgICAgICAgICAgaW5wdXRzOiBPYmplY3Qua2V5cyhkaXIuaW5wdXRzKSxcbiAgICAgICAgICAgIG91dHB1dHM6IE9iamVjdC5rZXlzKGRpci5vdXRwdXRzKSxcbiAgICAgICAgICAgIC8vIFRPRE8oYWx4aHViKTogc3VwcG9ydCBxdWVyaWVzXG4gICAgICAgICAgICBxdWVyaWVzOiBkaXIucXVlcmllcyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvZXJjZWRJbnB1dEZpZWxkczogZGlyLmNvZXJjZWRJbnB1dEZpZWxkcyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdGNiTWV0YWRhdGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEgPSB7aWQsIGJvdW5kVGFyZ2V0LCBwaXBlcywgc2NoZW1hc307XG4gICAgaWYgKHJlcXVpcmVzSW5saW5lVHlwZUNoZWNrQmxvY2socmVmLm5vZGUpKSB7XG4gICAgICAvLyBUaGlzIGNsYXNzIGRpZG4ndCBtZWV0IHRoZSByZXF1aXJlbWVudHMgZm9yIGV4dGVybmFsIHR5cGUgY2hlY2tpbmcsIHNvIGdlbmVyYXRlIGFuIGlubGluZVxuICAgICAgLy8gVENCIGZvciB0aGUgY2xhc3MuXG4gICAgICB0aGlzLmFkZElubGluZVR5cGVDaGVja0Jsb2NrKHJlZiwgdGNiTWV0YWRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgY2xhc3MgY2FuIGJlIHR5cGUtY2hlY2tlZCBleHRlcm5hbGx5IGFzIG5vcm1hbC5cbiAgICAgIHRoaXMudHlwZUNoZWNrRmlsZS5hZGRUeXBlQ2hlY2tCbG9jayhcbiAgICAgICAgICByZWYsIHRjYk1ldGFkYXRhLCB0aGlzLmRvbVNjaGVtYUNoZWNrZXIsIHRoaXMub29iUmVjb3JkZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmQgYSB0eXBlIGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gYG5vZGVgIHdpdGggdGhlIGdpdmVuIGBjdG9yTWV0YWRhdGFgLlxuICAgKi9cbiAgYWRkSW5saW5lVHlwZUN0b3IoXG4gICAgICBzZjogdHMuU291cmNlRmlsZSwgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sXG4gICAgICBjdG9yTWV0YTogVHlwZUN0b3JNZXRhZGF0YSk6IHZvaWQge1xuICAgIGlmICh0aGlzLnR5cGVDdG9yUGVuZGluZy5oYXMocmVmLm5vZGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMudHlwZUN0b3JQZW5kaW5nLmFkZChyZWYubm9kZSk7XG5cbiAgICAvLyBMYXppbHkgY29uc3RydWN0IHRoZSBvcGVyYXRpb24gbWFwLlxuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikgITtcblxuICAgIC8vIFB1c2ggYSBgVHlwZUN0b3JPcGAgaW50byB0aGUgb3BlcmF0aW9uIHF1ZXVlIGZvciB0aGUgc291cmNlIGZpbGUuXG4gICAgb3BzLnB1c2gobmV3IFR5cGVDdG9yT3AocmVmLCBjdG9yTWV0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybSBhIGB0cy5Tb3VyY2VGaWxlYCBpbnRvIGEgdmVyc2lvbiB0aGF0IGluY2x1ZGVzIHR5cGUgY2hlY2tpbmcgY29kZS5cbiAgICpcbiAgICogSWYgdGhpcyBwYXJ0aWN1bGFyIHNvdXJjZSBmaWxlIGhhcyBubyBkaXJlY3RpdmVzIHRoYXQgcmVxdWlyZSB0eXBlIGNvbnN0cnVjdG9ycywgb3IgY29tcG9uZW50c1xuICAgKiB0aGF0IHJlcXVpcmUgdHlwZSBjaGVjayBibG9ja3MsIHRoZW4gaXQgd2lsbCBiZSByZXR1cm5lZCBkaXJlY3RseS4gT3RoZXJ3aXNlLCBhIG5ld1xuICAgKiBgdHMuU291cmNlRmlsZWAgaXMgcGFyc2VkIGZyb20gbW9kaWZpZWQgdGV4dCBvZiB0aGUgb3JpZ2luYWwuIFRoaXMgaXMgbmVjZXNzYXJ5IHRvIGVuc3VyZSB0aGVcbiAgICogYWRkZWQgY29kZSBoYXMgY29ycmVjdCBwb3NpdGlvbmFsIGluZm9ybWF0aW9uIGFzc29jaWF0ZWQgd2l0aCBpdC5cbiAgICovXG4gIHRyYW5zZm9ybShzZjogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICAgIC8vIElmIHRoZXJlIGFyZSBubyBvcGVyYXRpb25zIHBlbmRpbmcgZm9yIHRoaXMgcGFydGljdWxhciBmaWxlLCByZXR1cm4gaXQgZGlyZWN0bHkuXG4gICAgaWYgKCF0aGlzLm9wTWFwLmhhcyhzZikpIHtcbiAgICAgIHJldHVybiBzZjtcbiAgICB9XG5cbiAgICAvLyBJbXBvcnRzIG1heSBuZWVkIHRvIGJlIGFkZGVkIHRvIHRoZSBmaWxlIHRvIHN1cHBvcnQgdHlwZS1jaGVja2luZyBvZiBkaXJlY3RpdmVzIHVzZWQgaW4gdGhlXG4gICAgLy8gdGVtcGxhdGUgd2l0aGluIGl0LlxuICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihuZXcgTm9vcEltcG9ydFJld3JpdGVyKCksICdfaScpO1xuXG4gICAgLy8gRWFjaCBPcCBoYXMgYSBzcGxpdFBvaW50IGluZGV4IGludG8gdGhlIHRleHQgd2hlcmUgaXQgbmVlZHMgdG8gYmUgaW5zZXJ0ZWQuIFNwbGl0IHRoZVxuICAgIC8vIG9yaWdpbmFsIHNvdXJjZSB0ZXh0IGludG8gY2h1bmtzIGF0IHRoZXNlIHNwbGl0IHBvaW50cywgd2hlcmUgY29kZSB3aWxsIGJlIGluc2VydGVkIGJldHdlZW5cbiAgICAvLyB0aGUgY2h1bmtzLlxuICAgIGNvbnN0IG9wcyA9IHRoaXMub3BNYXAuZ2V0KHNmKSAhLnNvcnQob3JkZXJPcHMpO1xuICAgIGNvbnN0IHRleHRQYXJ0cyA9IHNwbGl0U3RyaW5nQXRQb2ludHMoc2YudGV4dCwgb3BzLm1hcChvcCA9PiBvcC5zcGxpdFBvaW50KSk7XG5cbiAgICAvLyBVc2UgYSBgdHMuUHJpbnRlcmAgdG8gZ2VuZXJhdGUgc291cmNlIGNvZGUuXG4gICAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoe29taXRUcmFpbGluZ1NlbWljb2xvbjogdHJ1ZX0pO1xuXG4gICAgLy8gQmVnaW4gd2l0aCB0aGUgaW50aWFsIHNlY3Rpb24gb2YgdGhlIGNvZGUgdGV4dC5cbiAgICBsZXQgY29kZSA9IHRleHRQYXJ0c1swXTtcblxuICAgIC8vIFByb2Nlc3MgZWFjaCBvcGVyYXRpb24gYW5kIHVzZSB0aGUgcHJpbnRlciB0byBnZW5lcmF0ZSBzb3VyY2UgY29kZSBmb3IgaXQsIGluc2VydGluZyBpdCBpbnRvXG4gICAgLy8gdGhlIHNvdXJjZSBjb2RlIGluIGJldHdlZW4gdGhlIG9yaWdpbmFsIGNodW5rcy5cbiAgICBvcHMuZm9yRWFjaCgob3AsIGlkeCkgPT4ge1xuICAgICAgY29uc3QgdGV4dCA9IG9wLmV4ZWN1dGUoaW1wb3J0TWFuYWdlciwgc2YsIHRoaXMucmVmRW1pdHRlciwgcHJpbnRlcik7XG4gICAgICBjb2RlICs9ICdcXG5cXG4nICsgdGV4dCArIHRleHRQYXJ0c1tpZHggKyAxXTtcbiAgICB9KTtcblxuICAgIC8vIFdyaXRlIG91dCB0aGUgaW1wb3J0cyB0aGF0IG5lZWQgdG8gYmUgYWRkZWQgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgZmlsZS5cbiAgICBsZXQgaW1wb3J0cyA9IGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhzZi5maWxlTmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAubWFwKGkgPT4gYGltcG9ydCAqIGFzICR7aS5xdWFsaWZpZXJ9IGZyb20gJyR7aS5zcGVjaWZpZXJ9JztgKVxuICAgICAgICAgICAgICAgICAgICAgIC5qb2luKCdcXG4nKTtcbiAgICBjb2RlID0gaW1wb3J0cyArICdcXG4nICsgY29kZTtcblxuICAgIC8vIFBhcnNlIHRoZSBuZXcgc291cmNlIGZpbGUgYW5kIHJldHVybiBpdC5cbiAgICByZXR1cm4gdHMuY3JlYXRlU291cmNlRmlsZShzZi5maWxlTmFtZSwgY29kZSwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UUyk7XG4gIH1cblxuICBjYWxjdWxhdGVUZW1wbGF0ZURpYWdub3N0aWNzKFxuICAgICAgb3JpZ2luYWxQcm9ncmFtOiB0cy5Qcm9ncmFtLCBvcmlnaW5hbEhvc3Q6IHRzLkNvbXBpbGVySG9zdCxcbiAgICAgIG9yaWdpbmFsT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKToge1xuICAgIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10sXG4gICAgcHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgfSB7XG4gICAgY29uc3QgdHlwZUNoZWNrU2YgPSB0aGlzLnR5cGVDaGVja0ZpbGUucmVuZGVyKCk7XG4gICAgLy8gRmlyc3QsIGJ1aWxkIHRoZSBtYXAgb2Ygb3JpZ2luYWwgc291cmNlIGZpbGVzLlxuICAgIGNvbnN0IHNmTWFwID0gbmV3IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+KCk7XG4gICAgY29uc3QgaW50ZXJlc3RpbmdGaWxlczogdHMuU291cmNlRmlsZVtdID0gW3R5cGVDaGVja1NmXTtcbiAgICBmb3IgKGNvbnN0IG9yaWdpbmFsU2Ygb2Ygb3JpZ2luYWxQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGNvbnN0IHNmID0gdGhpcy50cmFuc2Zvcm0ob3JpZ2luYWxTZik7XG4gICAgICBzZk1hcC5zZXQoc2YuZmlsZU5hbWUsIHNmKTtcbiAgICAgIGlmICghc2YuaXNEZWNsYXJhdGlvbkZpbGUgJiYgdGhpcy5vcE1hcC5oYXMob3JpZ2luYWxTZikpIHtcbiAgICAgICAgaW50ZXJlc3RpbmdGaWxlcy5wdXNoKHNmKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzZk1hcC5zZXQodHlwZUNoZWNrU2YuZmlsZU5hbWUsIHR5cGVDaGVja1NmKTtcblxuICAgIGNvbnN0IHR5cGVDaGVja1Byb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHtcbiAgICAgIGhvc3Q6IG5ldyBUeXBlQ2hlY2tQcm9ncmFtSG9zdChzZk1hcCwgb3JpZ2luYWxIb3N0KSxcbiAgICAgIG9wdGlvbnM6IG9yaWdpbmFsT3B0aW9ucyxcbiAgICAgIG9sZFByb2dyYW06IG9yaWdpbmFsUHJvZ3JhbSxcbiAgICAgIHJvb3ROYW1lczogb3JpZ2luYWxQcm9ncmFtLmdldFJvb3RGaWxlTmFtZXMoKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBjb25zdCBjb2xsZWN0RGlhZ25vc3RpY3MgPSAoZGlhZ3M6IHJlYWRvbmx5IHRzLkRpYWdub3N0aWNbXSk6IHZvaWQgPT4ge1xuICAgICAgZm9yIChjb25zdCBkaWFnbm9zdGljIG9mIGRpYWdzKSB7XG4gICAgICAgIGlmIChzaG91bGRSZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMpKSB7XG4gICAgICAgICAgY29uc3QgdHJhbnNsYXRlZCA9IHRyYW5zbGF0ZURpYWdub3N0aWMoZGlhZ25vc3RpYywgdGhpcy5zb3VyY2VNYW5hZ2VyKTtcblxuICAgICAgICAgIGlmICh0cmFuc2xhdGVkICE9PSBudWxsKSB7XG4gICAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKHRyYW5zbGF0ZWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IHNmIG9mIGludGVyZXN0aW5nRmlsZXMpIHtcbiAgICAgIGNvbGxlY3REaWFnbm9zdGljcyh0eXBlQ2hlY2tQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc2YpKTtcbiAgICB9XG5cbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMuZG9tU2NoZW1hQ2hlY2tlci5kaWFnbm9zdGljcyk7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi50aGlzLm9vYlJlY29yZGVyLmRpYWdub3N0aWNzKTtcblxuICAgIHJldHVybiB7XG4gICAgICBkaWFnbm9zdGljcyxcbiAgICAgIHByb2dyYW06IHR5cGVDaGVja1Byb2dyYW0sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkSW5saW5lVHlwZUNoZWNrQmxvY2soXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHRjYk1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEpOiB2b2lkIHtcbiAgICBjb25zdCBzZiA9IHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgdGhpcy5vcE1hcC5zZXQoc2YsIFtdKTtcbiAgICB9XG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpICE7XG4gICAgb3BzLnB1c2gobmV3IFRjYk9wKHJlZiwgdGNiTWV0YSwgdGhpcy5jb25maWcsIHRoaXMuZG9tU2NoZW1hQ2hlY2tlciwgdGhpcy5vb2JSZWNvcmRlcikpO1xuICB9XG59XG5cbi8qKlxuICogQSBjb2RlIGdlbmVyYXRpb24gb3BlcmF0aW9uIHRoYXQgbmVlZHMgdG8gaGFwcGVuIHdpdGhpbiBhIGdpdmVuIHNvdXJjZSBmaWxlLlxuICovXG5pbnRlcmZhY2UgT3Age1xuICAvKipcbiAgICogVGhlIG5vZGUgaW4gdGhlIGZpbGUgd2hpY2ggd2lsbCBoYXZlIGNvZGUgZ2VuZXJhdGVkIGZvciBpdC5cbiAgICovXG4gIHJlYWRvbmx5IHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+O1xuXG4gIC8qKlxuICAgKiBJbmRleCBpbnRvIHRoZSBzb3VyY2UgdGV4dCB3aGVyZSB0aGUgY29kZSBnZW5lcmF0ZWQgYnkgdGhlIG9wZXJhdGlvbiBzaG91bGQgYmUgaW5zZXJ0ZWQuXG4gICAqL1xuICByZWFkb25seSBzcGxpdFBvaW50OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgdGhlIG9wZXJhdGlvbiBhbmQgcmV0dXJuIHRoZSBnZW5lcmF0ZWQgY29kZSBhcyB0ZXh0LlxuICAgKi9cbiAgZXhlY3V0ZShpbTogSW1wb3J0TWFuYWdlciwgc2Y6IHRzLlNvdXJjZUZpbGUsIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaW50ZXI6IHRzLlByaW50ZXIpOlxuICAgICAgc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgdHlwZSBjaGVjayBibG9jayBvcGVyYXRpb24gd2hpY2ggcHJvZHVjZXMgdHlwZSBjaGVjayBjb2RlIGZvciBhIHBhcnRpY3VsYXIgY29tcG9uZW50LlxuICovXG5jbGFzcyBUY2JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHJlYWRvbmx5IG1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIHJlYWRvbmx5IGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnLFxuICAgICAgcmVhZG9ubHkgZG9tU2NoZW1hQ2hlY2tlcjogRG9tU2NoZW1hQ2hlY2tlcixcbiAgICAgIHJlYWRvbmx5IG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY2hlY2sgYmxvY2tzIGFyZSBpbnNlcnRlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgZW5kIG9mIHRoZSBjb21wb25lbnQgY2xhc3MuXG4gICAqL1xuICBnZXQgc3BsaXRQb2ludCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5yZWYubm9kZS5lbmQgKyAxOyB9XG5cbiAgZXhlY3V0ZShpbTogSW1wb3J0TWFuYWdlciwgc2Y6IHRzLlNvdXJjZUZpbGUsIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaW50ZXI6IHRzLlByaW50ZXIpOlxuICAgICAgc3RyaW5nIHtcbiAgICBjb25zdCBlbnYgPSBuZXcgRW52aXJvbm1lbnQodGhpcy5jb25maWcsIGltLCByZWZFbWl0dGVyLCBzZik7XG4gICAgY29uc3QgZm5OYW1lID0gdHMuY3JlYXRlSWRlbnRpZmllcihgX3RjYl8ke3RoaXMucmVmLm5vZGUucG9zfWApO1xuICAgIGNvbnN0IGZuID0gZ2VuZXJhdGVUeXBlQ2hlY2tCbG9jayhcbiAgICAgICAgZW52LCB0aGlzLnJlZiwgZm5OYW1lLCB0aGlzLm1ldGEsIHRoaXMuZG9tU2NoZW1hQ2hlY2tlciwgdGhpcy5vb2JSZWNvcmRlcik7XG4gICAgcmV0dXJuIHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBmbiwgc2YpO1xuICB9XG59XG5cbi8qKlxuICogQSB0eXBlIGNvbnN0cnVjdG9yIG9wZXJhdGlvbiB3aGljaCBwcm9kdWNlcyB0eXBlIGNvbnN0cnVjdG9yIGNvZGUgZm9yIGEgcGFydGljdWxhciBkaXJlY3RpdmUuXG4gKi9cbmNsYXNzIFR5cGVDdG9yT3AgaW1wbGVtZW50cyBPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sXG4gICAgICByZWFkb25seSBtZXRhOiBUeXBlQ3Rvck1ldGFkYXRhKSB7fVxuXG4gIC8qKlxuICAgKiBUeXBlIGNvbnN0cnVjdG9yIG9wZXJhdGlvbnMgYXJlIGluc2VydGVkIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZW5kIG9mIHRoZSBkaXJlY3RpdmUgY2xhc3MuXG4gICAqL1xuICBnZXQgc3BsaXRQb2ludCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5yZWYubm9kZS5lbmQgLSAxOyB9XG5cbiAgZXhlY3V0ZShpbTogSW1wb3J0TWFuYWdlciwgc2Y6IHRzLlNvdXJjZUZpbGUsIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaW50ZXI6IHRzLlByaW50ZXIpOlxuICAgICAgc3RyaW5nIHtcbiAgICBjb25zdCB0Y2IgPSBnZW5lcmF0ZUlubGluZVR5cGVDdG9yKHRoaXMucmVmLm5vZGUsIHRoaXMubWV0YSk7XG4gICAgcmV0dXJuIHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCB0Y2IsIHNmKTtcbiAgfVxufVxuXG4vKipcbiAqIENvbXBhcmUgdHdvIG9wZXJhdGlvbnMgYW5kIHJldHVybiB0aGVpciBzcGxpdCBwb2ludCBvcmRlcmluZy5cbiAqL1xuZnVuY3Rpb24gb3JkZXJPcHMob3AxOiBPcCwgb3AyOiBPcCk6IG51bWJlciB7XG4gIHJldHVybiBvcDEuc3BsaXRQb2ludCAtIG9wMi5zcGxpdFBvaW50O1xufVxuXG4vKipcbiAqIFNwbGl0IGEgc3RyaW5nIGludG8gY2h1bmtzIGF0IGFueSBudW1iZXIgb2Ygc3BsaXQgcG9pbnRzLlxuICovXG5mdW5jdGlvbiBzcGxpdFN0cmluZ0F0UG9pbnRzKHN0cjogc3RyaW5nLCBwb2ludHM6IG51bWJlcltdKTogc3RyaW5nW10ge1xuICBjb25zdCBzcGxpdHM6IHN0cmluZ1tdID0gW107XG4gIGxldCBzdGFydCA9IDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcG9pbnQgPSBwb2ludHNbaV07XG4gICAgc3BsaXRzLnB1c2goc3RyLnN1YnN0cmluZyhzdGFydCwgcG9pbnQpKTtcbiAgICBzdGFydCA9IHBvaW50O1xuICB9XG4gIHNwbGl0cy5wdXNoKHN0ci5zdWJzdHJpbmcoc3RhcnQpKTtcbiAgcmV0dXJuIHNwbGl0cztcbn1cbiJdfQ==