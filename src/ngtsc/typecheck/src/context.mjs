/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ErrorCode, ngErrorCode } from '@angular/compiler-cli/src/ngtsc/diagnostics';
import * as ts from 'typescript';
import { absoluteFromSourceFile } from '../../file_system';
import { NoopImportRewriter } from '../../imports';
import { PerfEvent } from '../../perf';
import { ImportManager } from '../../translator';
import { makeTemplateDiagnostic } from '../diagnostics';
import { RegistryDomSchemaChecker } from './dom';
import { Environment } from './environment';
import { OutOfBandDiagnosticRecorderImpl } from './oob';
import { TypeCheckShimGenerator } from './shim';
import { requiresInlineTypeCheckBlock, TcbInliningRequirement } from './tcb_util';
import { generateTypeCheckBlock, TcbGenericContextBehavior } from './type_check_block';
import { TypeCheckFile } from './type_check_file';
import { generateInlineTypeCtor, requiresInlineTypeCtor } from './type_constructor';
/**
 * How a type-checking context should handle operations which would require inlining.
 */
export var InliningMode;
(function (InliningMode) {
    /**
     * Use inlining operations when required.
     */
    InliningMode[InliningMode["InlineOps"] = 0] = "InlineOps";
    /**
     * Produce diagnostics if an operation would require inlining.
     */
    InliningMode[InliningMode["Error"] = 1] = "Error";
})(InliningMode || (InliningMode = {}));
/**
 * A template type checking context for a program.
 *
 * The `TypeCheckContext` allows registration of components and their templates which need to be
 * type checked.
 */
export class TypeCheckContextImpl {
    constructor(config, compilerHost, refEmitter, reflector, host, inlining, perf) {
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
            throw new Error(`AssertionError: invalid inlining configuration.`);
        }
    }
    /**
     * Register a template to potentially be type-checked.
     *
     * Implements `TypeCheckContext.addTemplate`.
     */
    addTemplate(ref, binder, template, pipes, schemas, sourceMapping, file, parseErrors) {
        if (!this.host.shouldCheckComponent(ref.node)) {
            return;
        }
        const fileData = this.dataForFile(ref.node.getSourceFile());
        const shimData = this.pendingShimForComponent(ref.node);
        const templateId = fileData.sourceManager.getTemplateId(ref.node);
        const templateDiagnostics = [];
        if (parseErrors !== null) {
            templateDiagnostics.push(...this.getTemplateDiagnostics(parseErrors, templateId, sourceMapping));
        }
        const boundTarget = binder.bind({ template });
        if (this.inlining === InliningMode.InlineOps) {
            // Get all of the directives used in the template and record inline type constructors when
            // required.
            for (const dir of boundTarget.getUsedDirectives()) {
                const dirRef = dir.ref;
                const dirNode = dirRef.node;
                if (!dir.isGeneric || !requiresInlineTypeCtor(dirNode, this.reflector)) {
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
        shimData.templates.set(templateId, {
            template,
            boundTarget,
            templateDiagnostics,
        });
        const inliningRequirement = requiresInlineTypeCheckBlock(ref.node, pipes, this.reflector);
        // If inlining is not supported, but is required for either the TCB or one of its directive
        // dependencies, then exit here with an error.
        if (this.inlining === InliningMode.Error &&
            inliningRequirement === TcbInliningRequirement.MustInline) {
            // This template cannot be supported because the underlying strategy does not support inlining
            // and inlining would be required.
            // Record diagnostics to indicate the issues with this template.
            shimData.oobRecorder.requiresInlineTcb(templateId, ref.node);
            // Checking this template would be unsupported, so don't try.
            this.perf.eventCount(PerfEvent.SkipGenerateTcbNoInline);
            return;
        }
        const meta = {
            id: fileData.sourceManager.captureSource(ref.node, sourceMapping, file),
            boundTarget,
            pipes,
            schemas,
        };
        this.perf.eventCount(PerfEvent.GenerateTcb);
        if (inliningRequirement !== TcbInliningRequirement.None &&
            this.inlining === InliningMode.InlineOps) {
            // This class didn't meet the requirements for external type checking, so generate an inline
            // TCB for the class.
            this.addInlineTypeCheckBlock(fileData, shimData, ref, meta);
        }
        else if (inliningRequirement === TcbInliningRequirement.ShouldInlineForGenericBounds &&
            this.inlining === InliningMode.Error) {
            // It's suggested that this TCB should be generated inline due to the component's generic
            // bounds, but inlining is not supported by the current environment. Use a non-inline type
            // check block, but fall back to `any` generic parameters since the generic bounds can't be
            // referenced in that context. This will infer a less useful type for the component, but allow
            // for type-checking it in an environment where that would not be possible otherwise.
            shimData.file.addTypeCheckBlock(ref, meta, shimData.domSchemaChecker, shimData.oobRecorder, TcbGenericContextBehavior.FallbackToAny);
        }
        else {
            shimData.file.addTypeCheckBlock(ref, meta, shimData.domSchemaChecker, shimData.oobRecorder, TcbGenericContextBehavior.UseEmitter);
        }
    }
    /**
     * Record a type constructor for the given `node` with the given `ctorMetadata`.
     */
    addInlineTypeCtor(fileData, sf, ref, ctorMeta) {
        if (this.typeCtorPending.has(ref.node)) {
            return;
        }
        this.typeCtorPending.add(ref.node);
        // Lazily construct the operation map.
        if (!this.opMap.has(sf)) {
            this.opMap.set(sf, []);
        }
        const ops = this.opMap.get(sf);
        // Push a `TypeCtorOp` into the operation queue for the source file.
        ops.push(new TypeCtorOp(ref, ctorMeta));
        fileData.hasInlines = true;
    }
    /**
     * Transform a `ts.SourceFile` into a version that includes type checking code.
     *
     * If this particular `ts.SourceFile` requires changes, the text representing its new contents
     * will be returned. Otherwise, a `null` return indicates no changes were necessary.
     */
    transform(sf) {
        // If there are no operations pending for this particular file, return `null` to indicate no
        // changes.
        if (!this.opMap.has(sf)) {
            return null;
        }
        // Imports may need to be added to the file to support type-checking of directives used in the
        // template within it.
        const importManager = new ImportManager(new NoopImportRewriter(), '_i');
        // Each Op has a splitPoint index into the text where it needs to be inserted. Split the
        // original source text into chunks at these split points, where code will be inserted between
        // the chunks.
        const ops = this.opMap.get(sf).sort(orderOps);
        const textParts = splitStringAtPoints(sf.text, ops.map(op => op.splitPoint));
        // Use a `ts.Printer` to generate source code.
        const printer = ts.createPrinter({ omitTrailingSemicolon: true });
        // Begin with the intial section of the code text.
        let code = textParts[0];
        // Process each operation and use the printer to generate source code for it, inserting it into
        // the source code in between the original chunks.
        ops.forEach((op, idx) => {
            const text = op.execute(importManager, sf, this.refEmitter, printer);
            code += '\n\n' + text + textParts[idx + 1];
        });
        // Write out the imports that need to be added to the beginning of the file.
        let imports = importManager.getAllImports(sf.fileName)
            .map(i => `import * as ${i.qualifier.text} from '${i.specifier}';`)
            .join('\n');
        code = imports + '\n' + code;
        return code;
    }
    finalize() {
        // First, build the map of updates to source files.
        const updates = new Map();
        for (const originalSf of this.opMap.keys()) {
            const newText = this.transform(originalSf);
            if (newText !== null) {
                updates.set(absoluteFromSourceFile(originalSf), {
                    newText,
                    originalFile: originalSf,
                });
            }
        }
        // Then go through each input file that has pending code generation operations.
        for (const [sfPath, pendingFileData] of this.fileMap) {
            // For each input file, consider generation operations for each of its shims.
            for (const pendingShimData of pendingFileData.shimData.values()) {
                this.host.recordShimData(sfPath, {
                    genesisDiagnostics: [
                        ...pendingShimData.domSchemaChecker.diagnostics,
                        ...pendingShimData.oobRecorder.diagnostics,
                    ],
                    hasInlines: pendingFileData.hasInlines,
                    path: pendingShimData.file.fileName,
                    templates: pendingShimData.templates,
                });
                const sfText = pendingShimData.file.render(false /* removeComments */);
                updates.set(pendingShimData.file.fileName, {
                    newText: sfText,
                    // Shim files do not have an associated original file.
                    originalFile: null,
                });
            }
        }
        return updates;
    }
    addInlineTypeCheckBlock(fileData, shimData, ref, tcbMeta) {
        const sf = ref.node.getSourceFile();
        if (!this.opMap.has(sf)) {
            this.opMap.set(sf, []);
        }
        const ops = this.opMap.get(sf);
        ops.push(new InlineTcbOp(ref, tcbMeta, this.config, this.reflector, shimData.domSchemaChecker, shimData.oobRecorder));
        fileData.hasInlines = true;
    }
    pendingShimForComponent(node) {
        const fileData = this.dataForFile(node.getSourceFile());
        const shimPath = TypeCheckShimGenerator.shimFor(absoluteFromSourceFile(node.getSourceFile()));
        if (!fileData.shimData.has(shimPath)) {
            fileData.shimData.set(shimPath, {
                domSchemaChecker: new RegistryDomSchemaChecker(fileData.sourceManager),
                oobRecorder: new OutOfBandDiagnosticRecorderImpl(fileData.sourceManager),
                file: new TypeCheckFile(shimPath, this.config, this.refEmitter, this.reflector, this.compilerHost),
                templates: new Map(),
            });
        }
        return fileData.shimData.get(shimPath);
    }
    dataForFile(sf) {
        const sfPath = absoluteFromSourceFile(sf);
        if (!this.fileMap.has(sfPath)) {
            const data = {
                hasInlines: false,
                sourceManager: this.host.getSourceManager(sfPath),
                shimData: new Map(),
            };
            this.fileMap.set(sfPath, data);
        }
        return this.fileMap.get(sfPath);
    }
    getTemplateDiagnostics(parseErrors, templateId, sourceMapping) {
        return parseErrors.map(error => {
            const span = error.span;
            if (span.start.offset === span.end.offset) {
                // Template errors can contain zero-length spans, if the error occurs at a single point.
                // However, TypeScript does not handle displaying a zero-length diagnostic very well, so
                // increase the ending offset by 1 for such errors, to ensure the position is shown in the
                // diagnostic.
                span.end.offset++;
            }
            return makeTemplateDiagnostic(templateId, sourceMapping, span, ts.DiagnosticCategory.Error, ngErrorCode(ErrorCode.TEMPLATE_PARSE_ERROR), error.msg);
        });
    }
}
/**
 * A type check block operation which produces inline type check code for a particular component.
 */
class InlineTcbOp {
    constructor(ref, meta, config, reflector, domSchemaChecker, oobRecorder) {
        this.ref = ref;
        this.meta = meta;
        this.config = config;
        this.reflector = reflector;
        this.domSchemaChecker = domSchemaChecker;
        this.oobRecorder = oobRecorder;
    }
    /**
     * Type check blocks are inserted immediately after the end of the component class.
     */
    get splitPoint() {
        return this.ref.node.end + 1;
    }
    execute(im, sf, refEmitter, printer) {
        const env = new Environment(this.config, im, refEmitter, this.reflector, sf);
        const fnName = ts.createIdentifier(`_tcb_${this.ref.node.pos}`);
        // Inline TCBs should copy any generic type parameter nodes directly, as the TCB code is inlined
        // into the class in a context where that will always be legal.
        const fn = generateTypeCheckBlock(env, this.ref, fnName, this.meta, this.domSchemaChecker, this.oobRecorder, TcbGenericContextBehavior.CopyClassNodes);
        return printer.printNode(ts.EmitHint.Unspecified, fn, sf);
    }
}
/**
 * A type constructor operation which produces type constructor code for a particular directive.
 */
class TypeCtorOp {
    constructor(ref, meta) {
        this.ref = ref;
        this.meta = meta;
    }
    /**
     * Type constructor operations are inserted immediately before the end of the directive class.
     */
    get splitPoint() {
        return this.ref.node.end - 1;
    }
    execute(im, sf, refEmitter, printer) {
        const tcb = generateInlineTypeCtor(this.ref.node, this.meta);
        return printer.printNode(ts.EmitHint.Unspecified, tcb, sf);
    }
}
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
    const splits = [];
    let start = 0;
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        splits.push(str.substring(start, point));
        start = point;
    }
    splits.push(str.substring(start));
    return splits;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUdILE9BQU8sRUFBQyxTQUFTLEVBQUUsV0FBVyxFQUFDLE1BQU0sNkNBQTZDLENBQUM7QUFDbkYsT0FBTyxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFakMsT0FBTyxFQUFDLHNCQUFzQixFQUFpQixNQUFNLG1CQUFtQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxrQkFBa0IsRUFBOEIsTUFBTSxlQUFlLENBQUM7QUFDOUUsT0FBTyxFQUFDLFNBQVMsRUFBZSxNQUFNLFlBQVksQ0FBQztBQUduRCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFFL0MsT0FBTyxFQUFDLHNCQUFzQixFQUFxQixNQUFNLGdCQUFnQixDQUFDO0FBRTFFLE9BQU8sRUFBbUIsd0JBQXdCLEVBQUMsTUFBTSxPQUFPLENBQUM7QUFDakUsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUMxQyxPQUFPLEVBQThCLCtCQUErQixFQUFDLE1BQU0sT0FBTyxDQUFDO0FBQ25GLE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLFFBQVEsQ0FBQztBQUU5QyxPQUFPLEVBQUMsNEJBQTRCLEVBQUUsc0JBQXNCLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDaEYsT0FBTyxFQUFDLHNCQUFzQixFQUFFLHlCQUF5QixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDckYsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBQyxzQkFBc0IsRUFBRSxzQkFBc0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBOEhsRjs7R0FFRztBQUNILE1BQU0s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QUMsRUFBRSxFQUFFO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDekMsS0FBSyxHQUFHLEtBQUssQ0FBQztLQUNmO0lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDbEMsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0JvdW5kVGFyZ2V0LCBQYXJzZUVycm9yLCBQYXJzZVNvdXJjZUZpbGUsIFIzVGFyZ2V0QmluZGVyLCBTY2hlbWFNZXRhZGF0YSwgVGVtcGxhdGVQYXJzZUVycm9yLCBUbXBsQXN0Tm9kZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge05vb3BJbXBvcnRSZXdyaXRlciwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7UGVyZkV2ZW50LCBQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtGaWxlVXBkYXRlfSBmcm9tICcuLi8uLi9wcm9ncmFtX2RyaXZlcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5pbXBvcnQge1RlbXBsYXRlSWQsIFRlbXBsYXRlU291cmNlTWFwcGluZywgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIFR5cGVDaGVja0NvbnRleHQsIFR5cGVDaGVja2luZ0NvbmZpZywgVHlwZUN0b3JNZXRhZGF0YX0gZnJvbSAnLi4vYXBpJztcbmltcG9ydCB7bWFrZVRlbXBsYXRlRGlhZ25vc3RpYywgVGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuLi9kaWFnbm9zdGljcyc7XG5cbmltcG9ydCB7RG9tU2NoZW1hQ2hlY2tlciwgUmVnaXN0cnlEb21TY2hlbWFDaGVja2VyfSBmcm9tICcuL2RvbSc7XG5pbXBvcnQge0Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7T3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyLCBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXJJbXBsfSBmcm9tICcuL29vYic7XG5pbXBvcnQge1R5cGVDaGVja1NoaW1HZW5lcmF0b3J9IGZyb20gJy4vc2hpbSc7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFuYWdlcn0gZnJvbSAnLi9zb3VyY2UnO1xuaW1wb3J0IHtyZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrLCBUY2JJbmxpbmluZ1JlcXVpcmVtZW50fSBmcm9tICcuL3RjYl91dGlsJztcbmltcG9ydCB7Z2VuZXJhdGVUeXBlQ2hlY2tCbG9jaywgVGNiR2VuZXJpY0NvbnRleHRCZWhhdmlvcn0gZnJvbSAnLi90eXBlX2NoZWNrX2Jsb2NrJztcbmltcG9ydCB7VHlwZUNoZWNrRmlsZX0gZnJvbSAnLi90eXBlX2NoZWNrX2ZpbGUnO1xuaW1wb3J0IHtnZW5lcmF0ZUlubGluZVR5cGVDdG9yLCByZXF1aXJlc0lubGluZVR5cGVDdG9yfSBmcm9tICcuL3R5cGVfY29uc3RydWN0b3InO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNoaW1UeXBlQ2hlY2tpbmdEYXRhIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIHNoaW0gZmlsZS5cbiAgICovXG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuXG4gIC8qKlxuICAgKiBBbnkgYHRzLkRpYWdub3N0aWNgcyB3aGljaCB3ZXJlIHByb2R1Y2VkIGR1cmluZyB0aGUgZ2VuZXJhdGlvbiBvZiB0aGlzIHNoaW0uXG4gICAqXG4gICAqIFNvbWUgZGlhZ25vc3RpY3MgYXJlIHByb2R1Y2VkIGR1cmluZyBjcmVhdGlvbiB0aW1lIGFuZCBhcmUgdHJhY2tlZCBoZXJlLlxuICAgKi9cbiAgZ2VuZXNpc0RpYWdub3N0aWNzOiBUZW1wbGF0ZURpYWdub3N0aWNbXTtcblxuICAvKipcbiAgICogV2hldGhlciBhbnkgaW5saW5lIG9wZXJhdGlvbnMgZm9yIHRoZSBpbnB1dCBmaWxlIHdlcmUgcmVxdWlyZWQgdG8gZ2VuZXJhdGUgdGhpcyBzaGltLlxuICAgKi9cbiAgaGFzSW5saW5lczogYm9vbGVhbjtcblxuICAvKipcbiAgICogTWFwIG9mIGBUZW1wbGF0ZUlkYCB0byBpbmZvcm1hdGlvbiBjb2xsZWN0ZWQgYWJvdXQgdGhlIHRlbXBsYXRlIGR1cmluZyB0aGUgdGVtcGxhdGVcbiAgICogdHlwZS1jaGVja2luZyBwcm9jZXNzLlxuICAgKi9cbiAgdGVtcGxhdGVzOiBNYXA8VGVtcGxhdGVJZCwgVGVtcGxhdGVEYXRhPjtcbn1cblxuLyoqXG4gKiBEYXRhIHRyYWNrZWQgZm9yIGVhY2ggdGVtcGxhdGUgcHJvY2Vzc2VkIGJ5IHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHN5c3RlbS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZURhdGEge1xuICAvKipcbiAgICogVGVtcGxhdGUgbm9kZXMgZm9yIHdoaWNoIHRoZSBUQ0Igd2FzIGdlbmVyYXRlZC5cbiAgICovXG4gIHRlbXBsYXRlOiBUbXBsQXN0Tm9kZVtdO1xuXG4gIC8qKlxuICAgKiBgQm91bmRUYXJnZXRgIHdoaWNoIHdhcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSBUQ0IsIGFuZCBjb250YWlucyBiaW5kaW5ncyBmb3IgdGhlIGFzc29jaWF0ZWRcbiAgICogdGVtcGxhdGUgbm9kZXMuXG4gICAqL1xuICBib3VuZFRhcmdldDogQm91bmRUYXJnZXQ8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+O1xuXG4gIC8qKlxuICAgKiBFcnJvcnMgZm91bmQgd2hpbGUgcGFyc2luZyB0aGVtIHRlbXBsYXRlLCB3aGljaCBoYXZlIGJlZW4gY29udmVydGVkIHRvIGRpYWdub3N0aWNzLlxuICAgKi9cbiAgdGVtcGxhdGVEaWFnbm9zdGljczogVGVtcGxhdGVEaWFnbm9zdGljW107XG59XG5cbi8qKlxuICogRGF0YSBmb3IgYW4gaW5wdXQgZmlsZSB3aGljaCBpcyBzdGlsbCBpbiB0aGUgcHJvY2VzcyBvZiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGNvZGUgZ2VuZXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEge1xuICAvKipcbiAgICogV2hldGhlciBhbnkgaW5saW5lIGNvZGUgaGFzIGJlZW4gcmVxdWlyZWQgYnkgdGhlIHNoaW0geWV0LlxuICAgKi9cbiAgaGFzSW5saW5lczogYm9vbGVhbjtcblxuICAvKipcbiAgICogU291cmNlIG1hcHBpbmcgaW5mb3JtYXRpb24gZm9yIG1hcHBpbmcgZGlhZ25vc3RpY3MgZnJvbSBpbmxpbmVkIHR5cGUgY2hlY2sgYmxvY2tzIGJhY2sgdG8gdGhlXG4gICAqIG9yaWdpbmFsIHRlbXBsYXRlLlxuICAgKi9cbiAgc291cmNlTWFuYWdlcjogVGVtcGxhdGVTb3VyY2VNYW5hZ2VyO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgaW4tcHJvZ3Jlc3Mgc2hpbSBkYXRhIGZvciBzaGltcyBnZW5lcmF0ZWQgZnJvbSB0aGlzIGlucHV0IGZpbGUuXG4gICAqL1xuICBzaGltRGF0YTogTWFwPEFic29sdXRlRnNQYXRoLCBQZW5kaW5nU2hpbURhdGE+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBlbmRpbmdTaGltRGF0YSB7XG4gIC8qKlxuICAgKiBSZWNvcmRlciBmb3Igb3V0LW9mLWJhbmQgZGlhZ25vc3RpY3Mgd2hpY2ggYXJlIHJhaXNlZCBkdXJpbmcgZ2VuZXJhdGlvbi5cbiAgICovXG4gIG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAgaW4gdXNlIGZvciB0aGlzIHRlbXBsYXRlLCB3aGljaCByZWNvcmRzIGFueSBzY2hlbWEtcmVsYXRlZCBkaWFnbm9zdGljcy5cbiAgICovXG4gIGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXI7XG5cbiAgLyoqXG4gICAqIFNoaW0gZmlsZSBpbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBnZW5lcmF0ZWQuXG4gICAqL1xuICBmaWxlOiBUeXBlQ2hlY2tGaWxlO1xuXG5cbiAgLyoqXG4gICAqIE1hcCBvZiBgVGVtcGxhdGVJZGAgdG8gaW5mb3JtYXRpb24gY29sbGVjdGVkIGFib3V0IHRoZSB0ZW1wbGF0ZSBhcyBpdCdzIGluZ2VzdGVkLlxuICAgKi9cbiAgdGVtcGxhdGVzOiBNYXA8VGVtcGxhdGVJZCwgVGVtcGxhdGVEYXRhPjtcbn1cblxuLyoqXG4gKiBBZGFwdHMgdGhlIGBUeXBlQ2hlY2tDb250ZXh0SW1wbGAgdG8gdGhlIGxhcmdlciB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHN5c3RlbS5cbiAqXG4gKiBUaHJvdWdoIHRoaXMgaW50ZXJmYWNlLCBhIHNpbmdsZSBgVHlwZUNoZWNrQ29udGV4dEltcGxgICh3aGljaCByZXByZXNlbnRzIG9uZSBcInBhc3NcIiBvZiB0ZW1wbGF0ZVxuICogdHlwZS1jaGVja2luZykgcmVxdWVzdHMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGxhcmdlciBzdGF0ZSBvZiB0eXBlLWNoZWNraW5nLCBhcyB3ZWxsIGFzIHJlcG9ydHNcbiAqIGJhY2sgaXRzIHJlc3VsdHMgb25jZSBmaW5hbGl6ZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZUNoZWNraW5nSG9zdCB7XG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgYFRlbXBsYXRlU291cmNlTWFuYWdlcmAgcmVzcG9uc2libGUgZm9yIGNvbXBvbmVudHMgaW4gdGhlIGdpdmVuIGlucHV0IGZpbGUgcGF0aC5cbiAgICovXG4gIGdldFNvdXJjZU1hbmFnZXIoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFRlbXBsYXRlU291cmNlTWFuYWdlcjtcblxuICAvKipcbiAgICogV2hldGhlciBhIHBhcnRpY3VsYXIgY29tcG9uZW50IGNsYXNzIHNob3VsZCBiZSBpbmNsdWRlZCBpbiB0aGUgY3VycmVudCB0eXBlLWNoZWNraW5nIHBhc3MuXG4gICAqXG4gICAqIE5vdCBhbGwgY29tcG9uZW50cyBvZmZlcmVkIHRvIHRoZSBgVHlwZUNoZWNrQ29udGV4dGAgZm9yIGNoZWNraW5nIG1heSByZXF1aXJlIHByb2Nlc3NpbmcuIEZvclxuICAgKiBleGFtcGxlLCB0aGUgY29tcG9uZW50IG1heSBoYXZlIHJlc3VsdHMgYWxyZWFkeSBhdmFpbGFibGUgZnJvbSBhIHByaW9yIHBhc3Mgb3IgZnJvbSBhIHByZXZpb3VzXG4gICAqIHByb2dyYW0uXG4gICAqL1xuICBzaG91bGRDaGVja0NvbXBvbmVudChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbjtcblxuICAvKipcbiAgICogUmVwb3J0IGRhdGEgZnJvbSBhIHNoaW0gZ2VuZXJhdGVkIGZyb20gdGhlIGdpdmVuIGlucHV0IGZpbGUgcGF0aC5cbiAgICovXG4gIHJlY29yZFNoaW1EYXRhKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIGRhdGE6IFNoaW1UeXBlQ2hlY2tpbmdEYXRhKTogdm9pZDtcblxuICAvKipcbiAgICogUmVjb3JkIHRoYXQgYWxsIG9mIHRoZSBjb21wb25lbnRzIHdpdGhpbiB0aGUgZ2l2ZW4gaW5wdXQgZmlsZSBwYXRoIGhhZCBjb2RlIGdlbmVyYXRlZCAtIHRoYXRcbiAgICogaXMsIGNvdmVyYWdlIGZvciB0aGUgZmlsZSBjYW4gYmUgY29uc2lkZXJlZCBjb21wbGV0ZS5cbiAgICovXG4gIHJlY29yZENvbXBsZXRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkO1xufVxuXG4vKipcbiAqIEhvdyBhIHR5cGUtY2hlY2tpbmcgY29udGV4dCBzaG91bGQgaGFuZGxlIG9wZXJhdGlvbnMgd2hpY2ggd291bGQgcmVxdWlyZSBpbmxpbmluZy5cbiAqL1xuZXhwb3J0IGVudW0gSW5saW5pbmdNb2RlIHtcbiAgLyoqXG4gICAqIFVzZSBpbmxpbmluZyBvcGVyYXRpb25zIHdoZW4gcmVxdWlyZWQuXG4gICAqL1xuICBJbmxpbmVPcHMsXG5cbiAgLyoqXG4gICAqIFByb2R1Y2UgZGlhZ25vc3RpY3MgaWYgYW4gb3BlcmF0aW9uIHdvdWxkIHJlcXVpcmUgaW5saW5pbmcuXG4gICAqL1xuICBFcnJvcixcbn1cblxuLyoqXG4gKiBBIHRlbXBsYXRlIHR5cGUgY2hlY2tpbmcgY29udGV4dCBmb3IgYSBwcm9ncmFtLlxuICpcbiAqIFRoZSBgVHlwZUNoZWNrQ29udGV4dGAgYWxsb3dzIHJlZ2lzdHJhdGlvbiBvZiBjb21wb25lbnRzIGFuZCB0aGVpciB0ZW1wbGF0ZXMgd2hpY2ggbmVlZCB0byBiZVxuICogdHlwZSBjaGVja2VkLlxuICovXG5leHBvcnQgY2xhc3MgVHlwZUNoZWNrQ29udGV4dEltcGwgaW1wbGVtZW50cyBUeXBlQ2hlY2tDb250ZXh0IHtcbiAgcHJpdmF0ZSBmaWxlTWFwID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZyxcbiAgICAgIHByaXZhdGUgY29tcGlsZXJIb3N0OiBQaWNrPHRzLkNvbXBpbGVySG9zdCwgJ2dldENhbm9uaWNhbEZpbGVOYW1lJz4sXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgaG9zdDogVHlwZUNoZWNraW5nSG9zdCwgcHJpdmF0ZSBpbmxpbmluZzogSW5saW5pbmdNb2RlLCBwcml2YXRlIHBlcmY6IFBlcmZSZWNvcmRlcikge1xuICAgIGlmIChpbmxpbmluZyA9PT0gSW5saW5pbmdNb2RlLkVycm9yICYmIGNvbmZpZy51c2VJbmxpbmVUeXBlQ29uc3RydWN0b3JzKSB7XG4gICAgICAvLyBXZSBjYW5ub3QgdXNlIGlubGluaW5nIGZvciB0eXBlIGNoZWNraW5nIHNpbmNlIHRoaXMgZW52aXJvbm1lbnQgZG9lcyBub3Qgc3VwcG9ydCBpdC5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uRXJyb3I6IGludmFsaWQgaW5saW5pbmcgY29uZmlndXJhdGlvbi5gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQSBgTWFwYCBvZiBgdHMuU291cmNlRmlsZWBzIHRoYXQgdGhlIGNvbnRleHQgaGFzIHNlZW4gdG8gdGhlIG9wZXJhdGlvbnMgKGFkZGl0aW9ucyBvZiBtZXRob2RzXG4gICAqIG9yIHR5cGUtY2hlY2sgYmxvY2tzKSB0aGF0IG5lZWQgdG8gYmUgZXZlbnR1YWxseSBwZXJmb3JtZWQgb24gdGhhdCBmaWxlLlxuICAgKi9cbiAgcHJpdmF0ZSBvcE1hcCA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgT3BbXT4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIHdoZW4gYW4gYSBwYXJ0aWN1bGFyIGNsYXNzIGhhcyBhIHBlbmRpbmcgdHlwZSBjb25zdHJ1Y3RvciBwYXRjaGluZyBvcGVyYXRpb24gYWxyZWFkeVxuICAgKiBxdWV1ZWQuXG4gICAqL1xuICBwcml2YXRlIHR5cGVDdG9yUGVuZGluZyA9IG5ldyBTZXQ8dHMuQ2xhc3NEZWNsYXJhdGlvbj4oKTtcblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSB0ZW1wbGF0ZSB0byBwb3RlbnRpYWxseSBiZSB0eXBlLWNoZWNrZWQuXG4gICAqXG4gICAqIEltcGxlbWVudHMgYFR5cGVDaGVja0NvbnRleHQuYWRkVGVtcGxhdGVgLlxuICAgKi9cbiAgYWRkVGVtcGxhdGUoXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIGJpbmRlcjogUjNUYXJnZXRCaW5kZXI8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+LCB0ZW1wbGF0ZTogVG1wbEFzdE5vZGVbXSxcbiAgICAgIHBpcGVzOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4+LFxuICAgICAgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSwgc291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBmaWxlOiBQYXJzZVNvdXJjZUZpbGUsXG4gICAgICBwYXJzZUVycm9yczogUGFyc2VFcnJvcltdfG51bGwpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaG9zdC5zaG91bGRDaGVja0NvbXBvbmVudChyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZGF0YUZvckZpbGUocmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICBjb25zdCBzaGltRGF0YSA9IHRoaXMucGVuZGluZ1NoaW1Gb3JDb21wb25lbnQocmVmLm5vZGUpO1xuICAgIGNvbnN0IHRlbXBsYXRlSWQgPSBmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQocmVmLm5vZGUpO1xuXG4gICAgY29uc3QgdGVtcGxhdGVEaWFnbm9zdGljczogVGVtcGxhdGVEaWFnbm9zdGljW10gPSBbXTtcblxuICAgIGlmIChwYXJzZUVycm9ycyAhPT0gbnVsbCkge1xuICAgICAgdGVtcGxhdGVEaWFnbm9zdGljcy5wdXNoKFxuICAgICAgICAgIC4uLnRoaXMuZ2V0VGVtcGxhdGVEaWFnbm9zdGljcyhwYXJzZUVycm9ycywgdGVtcGxhdGVJZCwgc291cmNlTWFwcGluZykpO1xuICAgIH1cblxuICAgIGNvbnN0IGJvdW5kVGFyZ2V0ID0gYmluZGVyLmJpbmQoe3RlbXBsYXRlfSk7XG5cbiAgICBpZiAodGhpcy5pbmxpbmluZyA9PT0gSW5saW5pbmdNb2RlLklubGluZU9wcykge1xuICAgICAgLy8gR2V0IGFsbCBvZiB0aGUgZGlyZWN0aXZlcyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBhbmQgcmVjb3JkIGlubGluZSB0eXBlIGNvbnN0cnVjdG9ycyB3aGVuXG4gICAgICAvLyByZXF1aXJlZC5cbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIGJvdW5kVGFyZ2V0LmdldFVzZWREaXJlY3RpdmVzKCkpIHtcbiAgICAgICAgY29uc3QgZGlyUmVmID0gZGlyLnJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG4gICAgICAgIGNvbnN0IGRpck5vZGUgPSBkaXJSZWYubm9kZTtcblxuICAgICAgICBpZiAoIWRpci5pc0dlbmVyaWMgfHwgIXJlcXVpcmVzSW5saW5lVHlwZUN0b3IoZGlyTm9kZSwgdGhpcy5yZWZsZWN0b3IpKSB7XG4gICAgICAgICAgLy8gaW5saW5pbmcgbm90IHJlcXVpcmVkXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgYW4gaW5saW5lIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIGZvciB0aGUgZGlyZWN0aXZlLlxuICAgICAgICB0aGlzLmFkZElubGluZVR5cGVDdG9yKGZpbGVEYXRhLCBkaXJOb2RlLmdldFNvdXJjZUZpbGUoKSwgZGlyUmVmLCB7XG4gICAgICAgICAgZm5OYW1lOiAnbmdUeXBlQ3RvcicsXG4gICAgICAgICAgLy8gVGhlIGNvbnN0cnVjdG9yIHNob3VsZCBoYXZlIGEgYm9keSBpZiB0aGUgZGlyZWN0aXZlIGNvbWVzIGZyb20gYSAudHMgZmlsZSwgYnV0IG5vdCBpZlxuICAgICAgICAgIC8vIGl0IGNvbWVzIGZyb20gYSAuZC50cyBmaWxlLiAuZC50cyBkZWNsYXJhdGlvbnMgZG9uJ3QgaGF2ZSBib2RpZXMuXG4gICAgICAgICAgYm9keTogIWRpck5vZGUuZ2V0U291cmNlRmlsZSgpLmlzRGVjbGFyYXRpb25GaWxlLFxuICAgICAgICAgIGZpZWxkczoge1xuICAgICAgICAgICAgaW5wdXRzOiBkaXIuaW5wdXRzLmNsYXNzUHJvcGVydHlOYW1lcyxcbiAgICAgICAgICAgIG91dHB1dHM6IGRpci5vdXRwdXRzLmNsYXNzUHJvcGVydHlOYW1lcyxcbiAgICAgICAgICAgIC8vIFRPRE8oYWx4aHViKTogc3VwcG9ydCBxdWVyaWVzXG4gICAgICAgICAgICBxdWVyaWVzOiBkaXIucXVlcmllcyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvZXJjZWRJbnB1dEZpZWxkczogZGlyLmNvZXJjZWRJbnB1dEZpZWxkcyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2hpbURhdGEudGVtcGxhdGVzLnNldCh0ZW1wbGF0ZUlkLCB7XG4gICAgICB0ZW1wbGF0ZSxcbiAgICAgIGJvdW5kVGFyZ2V0LFxuICAgICAgdGVtcGxhdGVEaWFnbm9zdGljcyxcbiAgICB9KTtcblxuICAgIGNvbnN0IGlubGluaW5nUmVxdWlyZW1lbnQgPSByZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrKHJlZi5ub2RlLCBwaXBlcywgdGhpcy5yZWZsZWN0b3IpO1xuXG4gICAgLy8gSWYgaW5saW5pbmcgaXMgbm90IHN1cHBvcnRlZCwgYnV0IGlzIHJlcXVpcmVkIGZvciBlaXRoZXIgdGhlIFRDQiBvciBvbmUgb2YgaXRzIGRpcmVjdGl2ZVxuICAgIC8vIGRlcGVuZGVuY2llcywgdGhlbiBleGl0IGhlcmUgd2l0aCBhbiBlcnJvci5cbiAgICBpZiAodGhpcy5pbmxpbmluZyA9PT0gSW5saW5pbmdNb2RlLkVycm9yICYmXG4gICAgICAgIGlubGluaW5nUmVxdWlyZW1lbnQgPT09IFRjYklubGluaW5nUmVxdWlyZW1lbnQuTXVzdElubGluZSkge1xuICAgICAgLy8gVGhpcyB0ZW1wbGF0ZSBjYW5ub3QgYmUgc3VwcG9ydGVkIGJlY2F1c2UgdGhlIHVuZGVybHlpbmcgc3RyYXRlZ3kgZG9lcyBub3Qgc3VwcG9ydCBpbmxpbmluZ1xuICAgICAgLy8gYW5kIGlubGluaW5nIHdvdWxkIGJlIHJlcXVpcmVkLlxuXG4gICAgICAvLyBSZWNvcmQgZGlhZ25vc3RpY3MgdG8gaW5kaWNhdGUgdGhlIGlzc3VlcyB3aXRoIHRoaXMgdGVtcGxhdGUuXG4gICAgICBzaGltRGF0YS5vb2JSZWNvcmRlci5yZXF1aXJlc0lubGluZVRjYih0ZW1wbGF0ZUlkLCByZWYubm9kZSk7XG5cbiAgICAgIC8vIENoZWNraW5nIHRoaXMgdGVtcGxhdGUgd291bGQgYmUgdW5zdXBwb3J0ZWQsIHNvIGRvbid0IHRyeS5cbiAgICAgIHRoaXMucGVyZi5ldmVudENvdW50KFBlcmZFdmVudC5Ta2lwR2VuZXJhdGVUY2JOb0lubGluZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgbWV0YSA9IHtcbiAgICAgIGlkOiBmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyLmNhcHR1cmVTb3VyY2UocmVmLm5vZGUsIHNvdXJjZU1hcHBpbmcsIGZpbGUpLFxuICAgICAgYm91bmRUYXJnZXQsXG4gICAgICBwaXBlcyxcbiAgICAgIHNjaGVtYXMsXG4gICAgfTtcbiAgICB0aGlzLnBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuR2VuZXJhdGVUY2IpO1xuICAgIGlmIChpbmxpbmluZ1JlcXVpcmVtZW50ICE9PSBUY2JJbmxpbmluZ1JlcXVpcmVtZW50Lk5vbmUgJiZcbiAgICAgICAgdGhpcy5pbmxpbmluZyA9PT0gSW5saW5pbmdNb2RlLklubGluZU9wcykge1xuICAgICAgLy8gVGhpcyBjbGFzcyBkaWRuJ3QgbWVldCB0aGUgcmVxdWlyZW1lbnRzIGZvciBleHRlcm5hbCB0eXBlIGNoZWNraW5nLCBzbyBnZW5lcmF0ZSBhbiBpbmxpbmVcbiAgICAgIC8vIFRDQiBmb3IgdGhlIGNsYXNzLlxuICAgICAgdGhpcy5hZGRJbmxpbmVUeXBlQ2hlY2tCbG9jayhmaWxlRGF0YSwgc2hpbURhdGEsIHJlZiwgbWV0YSk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgaW5saW5pbmdSZXF1aXJlbWVudCA9PT0gVGNiSW5saW5pbmdSZXF1aXJlbWVudC5TaG91bGRJbmxpbmVGb3JHZW5lcmljQm91bmRzICYmXG4gICAgICAgIHRoaXMuaW5saW5pbmcgPT09IElubGluaW5nTW9kZS5FcnJvcikge1xuICAgICAgLy8gSXQncyBzdWdnZXN0ZWQgdGhhdCB0aGlzIFRDQiBzaG91bGQgYmUgZ2VuZXJhdGVkIGlubGluZSBkdWUgdG8gdGhlIGNvbXBvbmVudCdzIGdlbmVyaWNcbiAgICAgIC8vIGJvdW5kcywgYnV0IGlubGluaW5nIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQuIFVzZSBhIG5vbi1pbmxpbmUgdHlwZVxuICAgICAgLy8gY2hlY2sgYmxvY2ssIGJ1dCBmYWxsIGJhY2sgdG8gYGFueWAgZ2VuZXJpYyBwYXJhbWV0ZXJzIHNpbmNlIHRoZSBnZW5lcmljIGJvdW5kcyBjYW4ndCBiZVxuICAgICAgLy8gcmVmZXJlbmNlZCBpbiB0aGF0IGNvbnRleHQuIFRoaXMgd2lsbCBpbmZlciBhIGxlc3MgdXNlZnVsIHR5cGUgZm9yIHRoZSBjb21wb25lbnQsIGJ1dCBhbGxvd1xuICAgICAgLy8gZm9yIHR5cGUtY2hlY2tpbmcgaXQgaW4gYW4gZW52aXJvbm1lbnQgd2hlcmUgdGhhdCB3b3VsZCBub3QgYmUgcG9zc2libGUgb3RoZXJ3aXNlLlxuICAgICAgc2hpbURhdGEuZmlsZS5hZGRUeXBlQ2hlY2tCbG9jayhcbiAgICAgICAgICByZWYsIG1ldGEsIHNoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIsIHNoaW1EYXRhLm9vYlJlY29yZGVyLFxuICAgICAgICAgIFRjYkdlbmVyaWNDb250ZXh0QmVoYXZpb3IuRmFsbGJhY2tUb0FueSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNoaW1EYXRhLmZpbGUuYWRkVHlwZUNoZWNrQmxvY2soXG4gICAgICAgICAgcmVmLCBtZXRhLCBzaGltRGF0YS5kb21TY2hlbWFDaGVja2VyLCBzaGltRGF0YS5vb2JSZWNvcmRlcixcbiAgICAgICAgICBUY2JHZW5lcmljQ29udGV4dEJlaGF2aW9yLlVzZUVtaXR0ZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmQgYSB0eXBlIGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gYG5vZGVgIHdpdGggdGhlIGdpdmVuIGBjdG9yTWV0YWRhdGFgLlxuICAgKi9cbiAgYWRkSW5saW5lVHlwZUN0b3IoXG4gICAgICBmaWxlRGF0YTogUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhLCBzZjogdHMuU291cmNlRmlsZSxcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LCBjdG9yTWV0YTogVHlwZUN0b3JNZXRhZGF0YSk6IHZvaWQge1xuICAgIGlmICh0aGlzLnR5cGVDdG9yUGVuZGluZy5oYXMocmVmLm5vZGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMudHlwZUN0b3JQZW5kaW5nLmFkZChyZWYubm9kZSk7XG5cbiAgICAvLyBMYXppbHkgY29uc3RydWN0IHRoZSBvcGVyYXRpb24gbWFwLlxuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikhO1xuXG4gICAgLy8gUHVzaCBhIGBUeXBlQ3Rvck9wYCBpbnRvIHRoZSBvcGVyYXRpb24gcXVldWUgZm9yIHRoZSBzb3VyY2UgZmlsZS5cbiAgICBvcHMucHVzaChuZXcgVHlwZUN0b3JPcChyZWYsIGN0b3JNZXRhKSk7XG4gICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIGEgYHRzLlNvdXJjZUZpbGVgIGludG8gYSB2ZXJzaW9uIHRoYXQgaW5jbHVkZXMgdHlwZSBjaGVja2luZyBjb2RlLlxuICAgKlxuICAgKiBJZiB0aGlzIHBhcnRpY3VsYXIgYHRzLlNvdXJjZUZpbGVgIHJlcXVpcmVzIGNoYW5nZXMsIHRoZSB0ZXh0IHJlcHJlc2VudGluZyBpdHMgbmV3IGNvbnRlbnRzXG4gICAqIHdpbGwgYmUgcmV0dXJuZWQuIE90aGVyd2lzZSwgYSBgbnVsbGAgcmV0dXJuIGluZGljYXRlcyBubyBjaGFuZ2VzIHdlcmUgbmVjZXNzYXJ5LlxuICAgKi9cbiAgdHJhbnNmb3JtKHNmOiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nfG51bGwge1xuICAgIC8vIElmIHRoZXJlIGFyZSBubyBvcGVyYXRpb25zIHBlbmRpbmcgZm9yIHRoaXMgcGFydGljdWxhciBmaWxlLCByZXR1cm4gYG51bGxgIHRvIGluZGljYXRlIG5vXG4gICAgLy8gY2hhbmdlcy5cbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSW1wb3J0cyBtYXkgbmVlZCB0byBiZSBhZGRlZCB0byB0aGUgZmlsZSB0byBzdXBwb3J0IHR5cGUtY2hlY2tpbmcgb2YgZGlyZWN0aXZlcyB1c2VkIGluIHRoZVxuICAgIC8vIHRlbXBsYXRlIHdpdGhpbiBpdC5cbiAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIobmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpLCAnX2knKTtcblxuICAgIC8vIEVhY2ggT3AgaGFzIGEgc3BsaXRQb2ludCBpbmRleCBpbnRvIHRoZSB0ZXh0IHdoZXJlIGl0IG5lZWRzIHRvIGJlIGluc2VydGVkLiBTcGxpdCB0aGVcbiAgICAvLyBvcmlnaW5hbCBzb3VyY2UgdGV4dCBpbnRvIGNodW5rcyBhdCB0aGVzZSBzcGxpdCBwb2ludHMsIHdoZXJlIGNvZGUgd2lsbCBiZSBpbnNlcnRlZCBiZXR3ZWVuXG4gICAgLy8gdGhlIGNodW5rcy5cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikhLnNvcnQob3JkZXJPcHMpO1xuICAgIGNvbnN0IHRleHRQYXJ0cyA9IHNwbGl0U3RyaW5nQXRQb2ludHMoc2YudGV4dCwgb3BzLm1hcChvcCA9PiBvcC5zcGxpdFBvaW50KSk7XG5cbiAgICAvLyBVc2UgYSBgdHMuUHJpbnRlcmAgdG8gZ2VuZXJhdGUgc291cmNlIGNvZGUuXG4gICAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoe29taXRUcmFpbGluZ1NlbWljb2xvbjogdHJ1ZX0pO1xuXG4gICAgLy8gQmVnaW4gd2l0aCB0aGUgaW50aWFsIHNlY3Rpb24gb2YgdGhlIGNvZGUgdGV4dC5cbiAgICBsZXQgY29kZSA9IHRleHRQYXJ0c1swXTtcblxuICAgIC8vIFByb2Nlc3MgZWFjaCBvcGVyYXRpb24gYW5kIHVzZSB0aGUgcHJpbnRlciB0byBnZW5lcmF0ZSBzb3VyY2UgY29kZSBmb3IgaXQsIGluc2VydGluZyBpdCBpbnRvXG4gICAgLy8gdGhlIHNvdXJjZSBjb2RlIGluIGJldHdlZW4gdGhlIG9yaWdpbmFsIGNodW5rcy5cbiAgICBvcHMuZm9yRWFjaCgob3AsIGlkeCkgPT4ge1xuICAgICAgY29uc3QgdGV4dCA9IG9wLmV4ZWN1dGUoaW1wb3J0TWFuYWdlciwgc2YsIHRoaXMucmVmRW1pdHRlciwgcHJpbnRlcik7XG4gICAgICBjb2RlICs9ICdcXG5cXG4nICsgdGV4dCArIHRleHRQYXJ0c1tpZHggKyAxXTtcbiAgICB9KTtcblxuICAgIC8vIFdyaXRlIG91dCB0aGUgaW1wb3J0cyB0aGF0IG5lZWQgdG8gYmUgYWRkZWQgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgZmlsZS5cbiAgICBsZXQgaW1wb3J0cyA9IGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhzZi5maWxlTmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAubWFwKGkgPT4gYGltcG9ydCAqIGFzICR7aS5xdWFsaWZpZXIudGV4dH0gZnJvbSAnJHtpLnNwZWNpZmllcn0nO2ApXG4gICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcbicpO1xuICAgIGNvZGUgPSBpbXBvcnRzICsgJ1xcbicgKyBjb2RlO1xuXG4gICAgcmV0dXJuIGNvZGU7XG4gIH1cblxuICBmaW5hbGl6ZSgpOiBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVVcGRhdGU+IHtcbiAgICAvLyBGaXJzdCwgYnVpbGQgdGhlIG1hcCBvZiB1cGRhdGVzIHRvIHNvdXJjZSBmaWxlcy5cbiAgICBjb25zdCB1cGRhdGVzID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRmlsZVVwZGF0ZT4oKTtcbiAgICBmb3IgKGNvbnN0IG9yaWdpbmFsU2Ygb2YgdGhpcy5vcE1hcC5rZXlzKCkpIHtcbiAgICAgIGNvbnN0IG5ld1RleHQgPSB0aGlzLnRyYW5zZm9ybShvcmlnaW5hbFNmKTtcbiAgICAgIGlmIChuZXdUZXh0ICE9PSBudWxsKSB7XG4gICAgICAgIHVwZGF0ZXMuc2V0KGFic29sdXRlRnJvbVNvdXJjZUZpbGUob3JpZ2luYWxTZiksIHtcbiAgICAgICAgICBuZXdUZXh0LFxuICAgICAgICAgIG9yaWdpbmFsRmlsZTogb3JpZ2luYWxTZixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhlbiBnbyB0aHJvdWdoIGVhY2ggaW5wdXQgZmlsZSB0aGF0IGhhcyBwZW5kaW5nIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb25zLlxuICAgIGZvciAoY29uc3QgW3NmUGF0aCwgcGVuZGluZ0ZpbGVEYXRhXSBvZiB0aGlzLmZpbGVNYXApIHtcbiAgICAgIC8vIEZvciBlYWNoIGlucHV0IGZpbGUsIGNvbnNpZGVyIGdlbmVyYXRpb24gb3BlcmF0aW9ucyBmb3IgZWFjaCBvZiBpdHMgc2hpbXMuXG4gICAgICBmb3IgKGNvbnN0IHBlbmRpbmdTaGltRGF0YSBvZiBwZW5kaW5nRmlsZURhdGEuc2hpbURhdGEudmFsdWVzKCkpIHtcbiAgICAgICAgdGhpcy5ob3N0LnJlY29yZFNoaW1EYXRhKHNmUGF0aCwge1xuICAgICAgICAgIGdlbmVzaXNEaWFnbm9zdGljczogW1xuICAgICAgICAgICAgLi4ucGVuZGluZ1NoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIuZGlhZ25vc3RpY3MsXG4gICAgICAgICAgICAuLi5wZW5kaW5nU2hpbURhdGEub29iUmVjb3JkZXIuZGlhZ25vc3RpY3MsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBoYXNJbmxpbmVzOiBwZW5kaW5nRmlsZURhdGEuaGFzSW5saW5lcyxcbiAgICAgICAgICBwYXRoOiBwZW5kaW5nU2hpbURhdGEuZmlsZS5maWxlTmFtZSxcbiAgICAgICAgICB0ZW1wbGF0ZXM6IHBlbmRpbmdTaGltRGF0YS50ZW1wbGF0ZXMsXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBzZlRleHQgPSBwZW5kaW5nU2hpbURhdGEuZmlsZS5yZW5kZXIoZmFsc2UgLyogcmVtb3ZlQ29tbWVudHMgKi8pO1xuICAgICAgICB1cGRhdGVzLnNldChwZW5kaW5nU2hpbURhdGEuZmlsZS5maWxlTmFtZSwge1xuICAgICAgICAgIG5ld1RleHQ6IHNmVGV4dCxcblxuICAgICAgICAgIC8vIFNoaW0gZmlsZXMgZG8gbm90IGhhdmUgYW4gYXNzb2NpYXRlZCBvcmlnaW5hbCBmaWxlLlxuICAgICAgICAgIG9yaWdpbmFsRmlsZTogbnVsbCxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHVwZGF0ZXM7XG4gIH1cblxuICBwcml2YXRlIGFkZElubGluZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgZmlsZURhdGE6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSwgc2hpbURhdGE6IFBlbmRpbmdTaGltRGF0YSxcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgdGNiTWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IHNmID0gcmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikhO1xuICAgIG9wcy5wdXNoKG5ldyBJbmxpbmVUY2JPcChcbiAgICAgICAgcmVmLCB0Y2JNZXRhLCB0aGlzLmNvbmZpZywgdGhpcy5yZWZsZWN0b3IsIHNoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIsXG4gICAgICAgIHNoaW1EYXRhLm9vYlJlY29yZGVyKSk7XG4gICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gIH1cblxuICBwcml2YXRlIHBlbmRpbmdTaGltRm9yQ29tcG9uZW50KG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBQZW5kaW5nU2hpbURhdGEge1xuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5kYXRhRm9yRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3Qgc2hpbVBhdGggPSBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3IoYWJzb2x1dGVGcm9tU291cmNlRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSkpO1xuICAgIGlmICghZmlsZURhdGEuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgZmlsZURhdGEuc2hpbURhdGEuc2V0KHNoaW1QYXRoLCB7XG4gICAgICAgIGRvbVNjaGVtYUNoZWNrZXI6IG5ldyBSZWdpc3RyeURvbVNjaGVtYUNoZWNrZXIoZmlsZURhdGEuc291cmNlTWFuYWdlciksXG4gICAgICAgIG9vYlJlY29yZGVyOiBuZXcgT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVySW1wbChmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyKSxcbiAgICAgICAgZmlsZTogbmV3IFR5cGVDaGVja0ZpbGUoXG4gICAgICAgICAgICBzaGltUGF0aCwgdGhpcy5jb25maWcsIHRoaXMucmVmRW1pdHRlciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY29tcGlsZXJIb3N0KSxcbiAgICAgICAgdGVtcGxhdGVzOiBuZXcgTWFwPFRlbXBsYXRlSWQsIFRlbXBsYXRlRGF0YT4oKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZmlsZURhdGEuc2hpbURhdGEuZ2V0KHNoaW1QYXRoKSE7XG4gIH1cblxuICBwcml2YXRlIGRhdGFGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlKTogUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhIHtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcblxuICAgIGlmICghdGhpcy5maWxlTWFwLmhhcyhzZlBhdGgpKSB7XG4gICAgICBjb25zdCBkYXRhOiBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEgPSB7XG4gICAgICAgIGhhc0lubGluZXM6IGZhbHNlLFxuICAgICAgICBzb3VyY2VNYW5hZ2VyOiB0aGlzLmhvc3QuZ2V0U291cmNlTWFuYWdlcihzZlBhdGgpLFxuICAgICAgICBzaGltRGF0YTogbmV3IE1hcCgpLFxuICAgICAgfTtcbiAgICAgIHRoaXMuZmlsZU1hcC5zZXQoc2ZQYXRoLCBkYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5maWxlTWFwLmdldChzZlBhdGgpITtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVEaWFnbm9zdGljcyhcbiAgICAgIHBhcnNlRXJyb3JzOiBQYXJzZUVycm9yW10sIHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsXG4gICAgICBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmcpOiBUZW1wbGF0ZURpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHBhcnNlRXJyb3JzLm1hcChlcnJvciA9PiB7XG4gICAgICBjb25zdCBzcGFuID0gZXJyb3Iuc3BhbjtcblxuICAgICAgaWYgKHNwYW4uc3RhcnQub2Zmc2V0ID09PSBzcGFuLmVuZC5vZmZzZXQpIHtcbiAgICAgICAgLy8gVGVtcGxhdGUgZXJyb3JzIGNhbiBjb250YWluIHplcm8tbGVuZ3RoIHNwYW5zLCBpZiB0aGUgZXJyb3Igb2NjdXJzIGF0IGEgc2luZ2xlIHBvaW50LlxuICAgICAgICAvLyBIb3dldmVyLCBUeXBlU2NyaXB0IGRvZXMgbm90IGhhbmRsZSBkaXNwbGF5aW5nIGEgemVyby1sZW5ndGggZGlhZ25vc3RpYyB2ZXJ5IHdlbGwsIHNvXG4gICAgICAgIC8vIGluY3JlYXNlIHRoZSBlbmRpbmcgb2Zmc2V0IGJ5IDEgZm9yIHN1Y2ggZXJyb3JzLCB0byBlbnN1cmUgdGhlIHBvc2l0aW9uIGlzIHNob3duIGluIHRoZVxuICAgICAgICAvLyBkaWFnbm9zdGljLlxuICAgICAgICBzcGFuLmVuZC5vZmZzZXQrKztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgICAgdGVtcGxhdGVJZCwgc291cmNlTWFwcGluZywgc3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIG5nRXJyb3JDb2RlKEVycm9yQ29kZS5URU1QTEFURV9QQVJTRV9FUlJPUiksIGVycm9yLm1zZyk7XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb24gdGhhdCBuZWVkcyB0byBoYXBwZW4gd2l0aGluIGEgZ2l2ZW4gc291cmNlIGZpbGUuXG4gKi9cbmludGVyZmFjZSBPcCB7XG4gIC8qKlxuICAgKiBUaGUgbm9kZSBpbiB0aGUgZmlsZSB3aGljaCB3aWxsIGhhdmUgY29kZSBnZW5lcmF0ZWQgZm9yIGl0LlxuICAgKi9cbiAgcmVhZG9ubHkgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG5cbiAgLyoqXG4gICAqIEluZGV4IGludG8gdGhlIHNvdXJjZSB0ZXh0IHdoZXJlIHRoZSBjb2RlIGdlbmVyYXRlZCBieSB0aGUgb3BlcmF0aW9uIHNob3VsZCBiZSBpbnNlcnRlZC5cbiAgICovXG4gIHJlYWRvbmx5IHNwbGl0UG9pbnQ6IG51bWJlcjtcblxuICAvKipcbiAgICogRXhlY3V0ZSB0aGUgb3BlcmF0aW9uIGFuZCByZXR1cm4gdGhlIGdlbmVyYXRlZCBjb2RlIGFzIHRleHQuXG4gICAqL1xuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB0eXBlIGNoZWNrIGJsb2NrIG9wZXJhdGlvbiB3aGljaCBwcm9kdWNlcyBpbmxpbmUgdHlwZSBjaGVjayBjb2RlIGZvciBhIHBhcnRpY3VsYXIgY29tcG9uZW50LlxuICovXG5jbGFzcyBJbmxpbmVUY2JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHJlYWRvbmx5IG1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIHJlYWRvbmx5IGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnLFxuICAgICAgcmVhZG9ubHkgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcmVhZG9ubHkgZG9tU2NoZW1hQ2hlY2tlcjogRG9tU2NoZW1hQ2hlY2tlcixcbiAgICAgIHJlYWRvbmx5IG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY2hlY2sgYmxvY2tzIGFyZSBpbnNlcnRlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgZW5kIG9mIHRoZSBjb21wb25lbnQgY2xhc3MuXG4gICAqL1xuICBnZXQgc3BsaXRQb2ludCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnJlZi5ub2RlLmVuZCArIDE7XG4gIH1cblxuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmcge1xuICAgIGNvbnN0IGVudiA9IG5ldyBFbnZpcm9ubWVudCh0aGlzLmNvbmZpZywgaW0sIHJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yLCBzZik7XG4gICAgY29uc3QgZm5OYW1lID0gdHMuY3JlYXRlSWRlbnRpZmllcihgX3RjYl8ke3RoaXMucmVmLm5vZGUucG9zfWApO1xuXG4gICAgLy8gSW5saW5lIFRDQnMgc2hvdWxkIGNvcHkgYW55IGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXIgbm9kZXMgZGlyZWN0bHksIGFzIHRoZSBUQ0IgY29kZSBpcyBpbmxpbmVkXG4gICAgLy8gaW50byB0aGUgY2xhc3MgaW4gYSBjb250ZXh0IHdoZXJlIHRoYXQgd2lsbCBhbHdheXMgYmUgbGVnYWwuXG4gICAgY29uc3QgZm4gPSBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgICBlbnYsIHRoaXMucmVmLCBmbk5hbWUsIHRoaXMubWV0YSwgdGhpcy5kb21TY2hlbWFDaGVja2VyLCB0aGlzLm9vYlJlY29yZGVyLFxuICAgICAgICBUY2JHZW5lcmljQ29udGV4dEJlaGF2aW9yLkNvcHlDbGFzc05vZGVzKTtcbiAgICByZXR1cm4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIGZuLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIHdoaWNoIHByb2R1Y2VzIHR5cGUgY29uc3RydWN0b3IgY29kZSBmb3IgYSBwYXJ0aWN1bGFyIGRpcmVjdGl2ZS5cbiAqL1xuY2xhc3MgVHlwZUN0b3JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHJlYWRvbmx5IG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9ucyBhcmUgaW5zZXJ0ZWQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBlbmQgb2YgdGhlIGRpcmVjdGl2ZSBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucmVmLm5vZGUuZW5kIC0gMTtcbiAgfVxuXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZyB7XG4gICAgY29uc3QgdGNiID0gZ2VuZXJhdGVJbmxpbmVUeXBlQ3Rvcih0aGlzLnJlZi5ub2RlLCB0aGlzLm1ldGEpO1xuICAgIHJldHVybiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdGNiLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wYXJlIHR3byBvcGVyYXRpb25zIGFuZCByZXR1cm4gdGhlaXIgc3BsaXQgcG9pbnQgb3JkZXJpbmcuXG4gKi9cbmZ1bmN0aW9uIG9yZGVyT3BzKG9wMTogT3AsIG9wMjogT3ApOiBudW1iZXIge1xuICByZXR1cm4gb3AxLnNwbGl0UG9pbnQgLSBvcDIuc3BsaXRQb2ludDtcbn1cblxuLyoqXG4gKiBTcGxpdCBhIHN0cmluZyBpbnRvIGNodW5rcyBhdCBhbnkgbnVtYmVyIG9mIHNwbGl0IHBvaW50cy5cbiAqL1xuZnVuY3Rpb24gc3BsaXRTdHJpbmdBdFBvaW50cyhzdHI6IHN0cmluZywgcG9pbnRzOiBudW1iZXJbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgc3BsaXRzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgc3RhcnQgPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBvaW50ID0gcG9pbnRzW2ldO1xuICAgIHNwbGl0cy5wdXNoKHN0ci5zdWJzdHJpbmcoc3RhcnQsIHBvaW50KSk7XG4gICAgc3RhcnQgPSBwb2ludDtcbiAgfVxuICBzcGxpdHMucHVzaChzdHIuc3Vic3RyaW5nKHN0YXJ0KSk7XG4gIHJldHVybiBzcGxpdHM7XG59XG4iXX0=