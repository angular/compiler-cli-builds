/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { copyFileShimData, retagAllTsFiles, ShimReferenceTagger, untagAllTsFiles } from '../../shims';
import { toUnredirectedSourceFile } from '../../util/src/typescript';
import { NgOriginalFile, UpdateMode } from './api';
/**
 * Delegates all methods of `ts.CompilerHost` to a delegate, with the exception of
 * `getSourceFile`, `fileExists` and `writeFile` which are implemented in `TypeCheckProgramHost`.
 *
 * If a new method is added to `ts.CompilerHost` which is not delegated, a type error will be
 * generated for this class.
 */
export class DelegatingCompilerHost {
    constructor(delegate) {
        this.delegate = delegate;
        // Excluded are 'getSourceFile', 'fileExists' and 'writeFile', which are actually implemented by
        // `TypeCheckProgramHost` below.
        this.createHash = this.delegateMethod('createHash');
        this.directoryExists = this.delegateMethod('directoryExists');
        this.getCancellationToken = this.delegateMethod('getCancellationToken');
        this.getCanonicalFileName = this.delegateMethod('getCanonicalFileName');
        this.getCurrentDirectory = this.delegateMethod('getCurrentDirectory');
        this.getDefaultLibFileName = this.delegateMethod('getDefaultLibFileName');
        this.getDefaultLibLocation = this.delegateMethod('getDefaultLibLocation');
        this.getDirectories = this.delegateMethod('getDirectories');
        this.getEnvironmentVariable = this.delegateMethod('getEnvironmentVariable');
        this.getNewLine = this.delegateMethod('getNewLine');
        this.getParsedCommandLine = this.delegateMethod('getParsedCommandLine');
        this.getSourceFileByPath = this.delegateMethod('getSourceFileByPath');
        this.readDirectory = this.delegateMethod('readDirectory');
        this.readFile = this.delegateMethod('readFile');
        this.realpath = this.delegateMethod('realpath');
        this.resolveModuleNames = this.delegateMethod('resolveModuleNames');
        this.resolveTypeReferenceDirectives = this.delegateMethod('resolveTypeReferenceDirectives');
        this.trace = this.delegateMethod('trace');
        this.useCaseSensitiveFileNames = this.delegateMethod('useCaseSensitiveFileNames');
    }
    delegateMethod(name) {
        return this.delegate[name] !== undefined ? this.delegate[name].bind(this.delegate) :
            undefined;
    }
}
/**
 * A `ts.CompilerHost` which augments source files.
 */
class UpdatedProgramHost extends DelegatingCompilerHost {
    constructor(sfMap, originalProgram, delegate, shimExtensionPrefixes) {
        super(delegate);
        this.originalProgram = originalProgram;
        this.shimExtensionPrefixes = shimExtensionPrefixes;
        /**
         * The `ShimReferenceTagger` responsible for tagging `ts.SourceFile`s loaded via this host.
         *
         * The `UpdatedProgramHost` is used in the creation of a new `ts.Program`. Even though this new
         * program is based on a prior one, TypeScript will still start from the root files and enumerate
         * all source files to include in the new program.  This means that just like during the original
         * program's creation, these source files must be tagged with references to per-file shims in
         * order for those shims to be loaded, and then cleaned up afterwards. Thus the
         * `UpdatedProgramHost` has its own `ShimReferenceTagger` to perform this function.
         */
        this.shimTagger = new ShimReferenceTagger(this.shimExtensionPrefixes);
        this.sfMap = sfMap;
    }
    getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile) {
        // Try to use the same `ts.SourceFile` as the original program, if possible. This guarantees
        // that program reuse will be as efficient as possible.
        let delegateSf = this.originalProgram.getSourceFile(fileName);
        if (delegateSf === undefined) {
            // Something went wrong and a source file is being requested that's not in the original
            // program. Just in case, try to retrieve it from the delegate.
            delegateSf = this.delegate.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
        }
        if (delegateSf === undefined) {
            return undefined;
        }
        // Look for replacements.
        let sf;
        if (this.sfMap.has(fileName)) {
            sf = this.sfMap.get(fileName);
            copyFileShimData(delegateSf, sf);
        }
        else {
            sf = delegateSf;
        }
        // TypeScript doesn't allow returning redirect source files. To avoid unforeseen errors we
        // return the original source file instead of the redirect target.
        sf = toUnredirectedSourceFile(sf);
        this.shimTagger.tag(sf);
        return sf;
    }
    postProgramCreationCleanup() {
        this.shimTagger.finalize();
    }
    writeFile() {
        throw new Error(`TypeCheckProgramHost should never write files`);
    }
    fileExists(fileName) {
        return this.sfMap.has(fileName) || this.delegate.fileExists(fileName);
    }
}
/**
 * Updates a `ts.Program` instance with a new one that incorporates specific changes, using the
 * TypeScript compiler APIs for incremental program creation.
 */
export class TsCreateProgramDriver {
    constructor(originalProgram, originalHost, options, shimExtensionPrefixes) {
        this.originalProgram = originalProgram;
        this.originalHost = originalHost;
        this.options = options;
        this.shimExtensionPrefixes = shimExtensionPrefixes;
        /**
         * A map of source file paths to replacement `ts.SourceFile`s for those paths.
         *
         * Effectively, this tracks the delta between the user's program (represented by the
         * `originalHost`) and the template type-checking program being managed.
         */
        this.sfMap = new Map();
        this.program = this.originalProgram;
        this.supportsInlineOperations = true;
    }
    getProgram() {
        return this.program;
    }
    updateFiles(contents, updateMode) {
        if (contents.size === 0) {
            // No changes have been requested. Is it safe to skip updating entirely?
            // If UpdateMode is Incremental, then yes. If UpdateMode is Complete, then it's safe to skip
            // only if there are no active changes already (that would be cleared by the update).
            if (updateMode !== UpdateMode.Complete || this.sfMap.size === 0) {
                // No changes would be made to the `ts.Program` anyway, so it's safe to do nothing here.
                return;
            }
        }
        if (updateMode === UpdateMode.Complete) {
            this.sfMap.clear();
        }
        for (const [filePath, { newText, originalFile }] of contents.entries()) {
            const sf = ts.createSourceFile(filePath, newText, ts.ScriptTarget.Latest, true);
            if (originalFile !== null) {
                sf[NgOriginalFile] = originalFile;
            }
            this.sfMap.set(filePath, sf);
        }
        const host = new UpdatedProgramHost(this.sfMap, this.originalProgram, this.originalHost, this.shimExtensionPrefixes);
        const oldProgram = this.program;
        // Retag the old program's `ts.SourceFile`s with shim tags, to allow TypeScript to reuse the
        // most data.
        retagAllTsFiles(oldProgram);
        this.program = ts.createProgram({
            host,
            rootNames: this.program.getRootFileNames(),
            options: this.options,
            oldProgram,
        });
        host.postProgramCreationCleanup();
        // And untag them afterwards. We explicitly untag both programs here, because the oldProgram
        // may still be used for emit and needs to not contain tags.
        untagAllTsFiles(this.program);
        untagAllTsFiles(oldProgram);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfY3JlYXRlX3Byb2dyYW1fZHJpdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9wcm9ncmFtX2RyaXZlci9zcmMvdHNfY3JlYXRlX3Byb2dyYW1fZHJpdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBR2pDLE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ3BHLE9BQU8sRUFBc0Isd0JBQXdCLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUV4RixPQUFPLEVBQThDLGNBQWMsRUFBaUIsVUFBVSxFQUFDLE1BQU0sT0FBTyxDQUFDO0FBRTdHOzs7Ozs7R0FNRztBQUNILE1BQU0sT0FBTyxzQkFBc0I7SUFFakMsWUFBc0IsUUFBeUI7UUFBekIsYUFBUSxHQUFSLFFBQVEsQ0FBaUI7UUFPL0MsZ0dBQWdHO1FBQ2hHLGdDQUFnQztRQUNoQyxlQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMvQyxvQkFBZSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN6RCx5QkFBb0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDbkUseUJBQW9CLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ25FLHdCQUFtQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNqRSwwQkFBcUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDckUsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLGNBQWMs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QUMsQ0FBQztRQUNILElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1FBRWxDLDRGQUE0RjtRQUM1Riw0REFBNEQ7UUFDNUQsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QixlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDOUIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2NvcHlGaWxlU2hpbURhdGEsIHJldGFnQWxsVHNGaWxlcywgU2hpbVJlZmVyZW5jZVRhZ2dlciwgdW50YWdBbGxUc0ZpbGVzfSBmcm9tICcuLi8uLi9zaGltcyc7XG5pbXBvcnQge1JlcXVpcmVkRGVsZWdhdGlvbnMsIHRvVW5yZWRpcmVjdGVkU291cmNlRmlsZX0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RmlsZVVwZGF0ZSwgTWF5YmVTb3VyY2VGaWxlV2l0aE9yaWdpbmFsRmlsZSwgTmdPcmlnaW5hbEZpbGUsIFByb2dyYW1Ecml2ZXIsIFVwZGF0ZU1vZGV9IGZyb20gJy4vYXBpJztcblxuLyoqXG4gKiBEZWxlZ2F0ZXMgYWxsIG1ldGhvZHMgb2YgYHRzLkNvbXBpbGVySG9zdGAgdG8gYSBkZWxlZ2F0ZSwgd2l0aCB0aGUgZXhjZXB0aW9uIG9mXG4gKiBgZ2V0U291cmNlRmlsZWAsIGBmaWxlRXhpc3RzYCBhbmQgYHdyaXRlRmlsZWAgd2hpY2ggYXJlIGltcGxlbWVudGVkIGluIGBUeXBlQ2hlY2tQcm9ncmFtSG9zdGAuXG4gKlxuICogSWYgYSBuZXcgbWV0aG9kIGlzIGFkZGVkIHRvIGB0cy5Db21waWxlckhvc3RgIHdoaWNoIGlzIG5vdCBkZWxlZ2F0ZWQsIGEgdHlwZSBlcnJvciB3aWxsIGJlXG4gKiBnZW5lcmF0ZWQgZm9yIHRoaXMgY2xhc3MuXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWxlZ2F0aW5nQ29tcGlsZXJIb3N0IGltcGxlbWVudHNcbiAgICBPbWl0PFJlcXVpcmVkRGVsZWdhdGlvbnM8dHMuQ29tcGlsZXJIb3N0PiwgJ2dldFNvdXJjZUZpbGUnfCdmaWxlRXhpc3RzJ3wnd3JpdGVGaWxlJz4ge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZGVsZWdhdGU6IHRzLkNvbXBpbGVySG9zdCkge31cblxuICBwcml2YXRlIGRlbGVnYXRlTWV0aG9kPE0gZXh0ZW5kcyBrZXlvZiB0cy5Db21waWxlckhvc3Q+KG5hbWU6IE0pOiB0cy5Db21waWxlckhvc3RbTV0ge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlW25hbWVdICE9PSB1bmRlZmluZWQgPyAodGhpcy5kZWxlZ2F0ZVtuYW1lXSBhcyBhbnkpLmJpbmQodGhpcy5kZWxlZ2F0ZSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBFeGNsdWRlZCBhcmUgJ2dldFNvdXJjZUZpbGUnLCAnZmlsZUV4aXN0cycgYW5kICd3cml0ZUZpbGUnLCB3aGljaCBhcmUgYWN0dWFsbHkgaW1wbGVtZW50ZWQgYnlcbiAgLy8gYFR5cGVDaGVja1Byb2dyYW1Ib3N0YCBiZWxvdy5cbiAgY3JlYXRlSGFzaCA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2NyZWF0ZUhhc2gnKTtcbiAgZGlyZWN0b3J5RXhpc3RzID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZGlyZWN0b3J5RXhpc3RzJyk7XG4gIGdldENhbmNlbGxhdGlvblRva2VuID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0Q2FuY2VsbGF0aW9uVG9rZW4nKTtcbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWUgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXRDYW5vbmljYWxGaWxlTmFtZScpO1xuICBnZXRDdXJyZW50RGlyZWN0b3J5ID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0Q3VycmVudERpcmVjdG9yeScpO1xuICBnZXREZWZhdWx0TGliRmlsZU5hbWUgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXREZWZhdWx0TGliRmlsZU5hbWUnKTtcbiAgZ2V0RGVmYXVsdExpYkxvY2F0aW9uID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0RGVmYXVsdExpYkxvY2F0aW9uJyk7XG4gIGdldERpcmVjdG9yaWVzID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0RGlyZWN0b3JpZXMnKTtcbiAgZ2V0RW52aXJvbm1lbnRWYXJpYWJsZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2dldEVudmlyb25tZW50VmFyaWFibGUnKTtcbiAgZ2V0TmV3TGluZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2dldE5ld0xpbmUnKTtcbiAgZ2V0UGFyc2VkQ29tbWFuZExpbmUgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXRQYXJzZWRDb21tYW5kTGluZScpO1xuICBnZXRTb3VyY2VGaWxlQnlQYXRoID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0U291cmNlRmlsZUJ5UGF0aCcpO1xuICByZWFkRGlyZWN0b3J5ID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgncmVhZERpcmVjdG9yeScpO1xuICByZWFkRmlsZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ3JlYWRGaWxlJyk7XG4gIHJlYWxwYXRoID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgncmVhbHBhdGgnKTtcbiAgcmVzb2x2ZU1vZHVsZU5hbWVzID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgncmVzb2x2ZU1vZHVsZU5hbWVzJyk7XG4gIHJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcyA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ3Jlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcycpO1xuICB0cmFjZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ3RyYWNlJyk7XG4gIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCd1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzJyk7XG59XG5cbi8qKlxuICogQSBgdHMuQ29tcGlsZXJIb3N0YCB3aGljaCBhdWdtZW50cyBzb3VyY2UgZmlsZXMuXG4gKi9cbmNsYXNzIFVwZGF0ZWRQcm9ncmFtSG9zdCBleHRlbmRzIERlbGVnYXRpbmdDb21waWxlckhvc3Qge1xuICAvKipcbiAgICogTWFwIG9mIHNvdXJjZSBmaWxlIG5hbWVzIHRvIGB0cy5Tb3VyY2VGaWxlYCBpbnN0YW5jZXMuXG4gICAqL1xuICBwcml2YXRlIHNmTWFwOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPjtcblxuICAvKipcbiAgICogVGhlIGBTaGltUmVmZXJlbmNlVGFnZ2VyYCByZXNwb25zaWJsZSBmb3IgdGFnZ2luZyBgdHMuU291cmNlRmlsZWBzIGxvYWRlZCB2aWEgdGhpcyBob3N0LlxuICAgKlxuICAgKiBUaGUgYFVwZGF0ZWRQcm9ncmFtSG9zdGAgaXMgdXNlZCBpbiB0aGUgY3JlYXRpb24gb2YgYSBuZXcgYHRzLlByb2dyYW1gLiBFdmVuIHRob3VnaCB0aGlzIG5ld1xuICAgKiBwcm9ncmFtIGlzIGJhc2VkIG9uIGEgcHJpb3Igb25lLCBUeXBlU2NyaXB0IHdpbGwgc3RpbGwgc3RhcnQgZnJvbSB0aGUgcm9vdCBmaWxlcyBhbmQgZW51bWVyYXRlXG4gICAqIGFsbCBzb3VyY2UgZmlsZXMgdG8gaW5jbHVkZSBpbiB0aGUgbmV3IHByb2dyYW0uICBUaGlzIG1lYW5zIHRoYXQganVzdCBsaWtlIGR1cmluZyB0aGUgb3JpZ2luYWxcbiAgICogcHJvZ3JhbSdzIGNyZWF0aW9uLCB0aGVzZSBzb3VyY2UgZmlsZXMgbXVzdCBiZSB0YWdnZWQgd2l0aCByZWZlcmVuY2VzIHRvIHBlci1maWxlIHNoaW1zIGluXG4gICAqIG9yZGVyIGZvciB0aG9zZSBzaGltcyB0byBiZSBsb2FkZWQsIGFuZCB0aGVuIGNsZWFuZWQgdXAgYWZ0ZXJ3YXJkcy4gVGh1cyB0aGVcbiAgICogYFVwZGF0ZWRQcm9ncmFtSG9zdGAgaGFzIGl0cyBvd24gYFNoaW1SZWZlcmVuY2VUYWdnZXJgIHRvIHBlcmZvcm0gdGhpcyBmdW5jdGlvbi5cbiAgICovXG4gIHByaXZhdGUgc2hpbVRhZ2dlciA9IG5ldyBTaGltUmVmZXJlbmNlVGFnZ2VyKHRoaXMuc2hpbUV4dGVuc2lvblByZWZpeGVzKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHNmTWFwOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPiwgcHJpdmF0ZSBvcmlnaW5hbFByb2dyYW06IHRzLlByb2dyYW0sXG4gICAgICBkZWxlZ2F0ZTogdHMuQ29tcGlsZXJIb3N0LCBwcml2YXRlIHNoaW1FeHRlbnNpb25QcmVmaXhlczogc3RyaW5nW10pIHtcbiAgICBzdXBlcihkZWxlZ2F0ZSk7XG4gICAgdGhpcy5zZk1hcCA9IHNmTWFwO1xuICB9XG5cbiAgZ2V0U291cmNlRmlsZShcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIGxhbmd1YWdlVmVyc2lvbjogdHMuU2NyaXB0VGFyZ2V0LFxuICAgICAgb25FcnJvcj86ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQsXG4gICAgICBzaG91bGRDcmVhdGVOZXdTb3VyY2VGaWxlPzogYm9vbGVhbnx1bmRlZmluZWQpOiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCB7XG4gICAgLy8gVHJ5IHRvIHVzZSB0aGUgc2FtZSBgdHMuU291cmNlRmlsZWAgYXMgdGhlIG9yaWdpbmFsIHByb2dyYW0sIGlmIHBvc3NpYmxlLiBUaGlzIGd1YXJhbnRlZXNcbiAgICAvLyB0aGF0IHByb2dyYW0gcmV1c2Ugd2lsbCBiZSBhcyBlZmZpY2llbnQgYXMgcG9zc2libGUuXG4gICAgbGV0IGRlbGVnYXRlU2Y6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkID0gdGhpcy5vcmlnaW5hbFByb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgaWYgKGRlbGVnYXRlU2YgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gU29tZXRoaW5nIHdlbnQgd3JvbmcgYW5kIGEgc291cmNlIGZpbGUgaXMgYmVpbmcgcmVxdWVzdGVkIHRoYXQncyBub3QgaW4gdGhlIG9yaWdpbmFsXG4gICAgICAvLyBwcm9ncmFtLiBKdXN0IGluIGNhc2UsIHRyeSB0byByZXRyaWV2ZSBpdCBmcm9tIHRoZSBkZWxlZ2F0ZS5cbiAgICAgIGRlbGVnYXRlU2YgPSB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGUoXG4gICAgICAgICAgZmlsZU5hbWUsIGxhbmd1YWdlVmVyc2lvbiwgb25FcnJvciwgc2hvdWxkQ3JlYXRlTmV3U291cmNlRmlsZSkhO1xuICAgIH1cbiAgICBpZiAoZGVsZWdhdGVTZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIExvb2sgZm9yIHJlcGxhY2VtZW50cy5cbiAgICBsZXQgc2Y6IHRzLlNvdXJjZUZpbGU7XG4gICAgaWYgKHRoaXMuc2ZNYXAuaGFzKGZpbGVOYW1lKSkge1xuICAgICAgc2YgPSB0aGlzLnNmTWFwLmdldChmaWxlTmFtZSkhO1xuICAgICAgY29weUZpbGVTaGltRGF0YShkZWxlZ2F0ZVNmLCBzZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNmID0gZGVsZWdhdGVTZjtcbiAgICB9XG4gICAgLy8gVHlwZVNjcmlwdCBkb2Vzbid0IGFsbG93IHJldHVybmluZyByZWRpcmVjdCBzb3VyY2UgZmlsZXMuIFRvIGF2b2lkIHVuZm9yZXNlZW4gZXJyb3JzIHdlXG4gICAgLy8gcmV0dXJuIHRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZSBpbnN0ZWFkIG9mIHRoZSByZWRpcmVjdCB0YXJnZXQuXG4gICAgc2YgPSB0b1VucmVkaXJlY3RlZFNvdXJjZUZpbGUoc2YpO1xuXG4gICAgdGhpcy5zaGltVGFnZ2VyLnRhZyhzZik7XG4gICAgcmV0dXJuIHNmO1xuICB9XG5cbiAgcG9zdFByb2dyYW1DcmVhdGlvbkNsZWFudXAoKTogdm9pZCB7XG4gICAgdGhpcy5zaGltVGFnZ2VyLmZpbmFsaXplKCk7XG4gIH1cblxuICB3cml0ZUZpbGUoKTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcihgVHlwZUNoZWNrUHJvZ3JhbUhvc3Qgc2hvdWxkIG5ldmVyIHdyaXRlIGZpbGVzYCk7XG4gIH1cblxuICBmaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zZk1hcC5oYXMoZmlsZU5hbWUpIHx8IHRoaXMuZGVsZWdhdGUuZmlsZUV4aXN0cyhmaWxlTmFtZSk7XG4gIH1cbn1cblxuXG4vKipcbiAqIFVwZGF0ZXMgYSBgdHMuUHJvZ3JhbWAgaW5zdGFuY2Ugd2l0aCBhIG5ldyBvbmUgdGhhdCBpbmNvcnBvcmF0ZXMgc3BlY2lmaWMgY2hhbmdlcywgdXNpbmcgdGhlXG4gKiBUeXBlU2NyaXB0IGNvbXBpbGVyIEFQSXMgZm9yIGluY3JlbWVudGFsIHByb2dyYW0gY3JlYXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBUc0NyZWF0ZVByb2dyYW1Ecml2ZXIgaW1wbGVtZW50cyBQcm9ncmFtRHJpdmVyIHtcbiAgLyoqXG4gICAqIEEgbWFwIG9mIHNvdXJjZSBmaWxlIHBhdGhzIHRvIHJlcGxhY2VtZW50IGB0cy5Tb3VyY2VGaWxlYHMgZm9yIHRob3NlIHBhdGhzLlxuICAgKlxuICAgKiBFZmZlY3RpdmVseSwgdGhpcyB0cmFja3MgdGhlIGRlbHRhIGJldHdlZW4gdGhlIHVzZXIncyBwcm9ncmFtIChyZXByZXNlbnRlZCBieSB0aGVcbiAgICogYG9yaWdpbmFsSG9zdGApIGFuZCB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBwcm9ncmFtIGJlaW5nIG1hbmFnZWQuXG4gICAqL1xuICBwcml2YXRlIHNmTWFwID0gbmV3IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+KCk7XG5cbiAgcHJpdmF0ZSBwcm9ncmFtOiB0cy5Qcm9ncmFtID0gdGhpcy5vcmlnaW5hbFByb2dyYW07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIG9yaWdpbmFsUHJvZ3JhbTogdHMuUHJvZ3JhbSwgcHJpdmF0ZSBvcmlnaW5hbEhvc3Q6IHRzLkNvbXBpbGVySG9zdCxcbiAgICAgIHByaXZhdGUgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLCBwcml2YXRlIHNoaW1FeHRlbnNpb25QcmVmaXhlczogc3RyaW5nW10pIHt9XG5cbiAgcmVhZG9ubHkgc3VwcG9ydHNJbmxpbmVPcGVyYXRpb25zID0gdHJ1ZTtcblxuICBnZXRQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgIHJldHVybiB0aGlzLnByb2dyYW07XG4gIH1cblxuICB1cGRhdGVGaWxlcyhjb250ZW50czogTWFwPEFic29sdXRlRnNQYXRoLCBGaWxlVXBkYXRlPiwgdXBkYXRlTW9kZTogVXBkYXRlTW9kZSk6IHZvaWQge1xuICAgIGlmIChjb250ZW50cy5zaXplID09PSAwKSB7XG4gICAgICAvLyBObyBjaGFuZ2VzIGhhdmUgYmVlbiByZXF1ZXN0ZWQuIElzIGl0IHNhZmUgdG8gc2tpcCB1cGRhdGluZyBlbnRpcmVseT9cbiAgICAgIC8vIElmIFVwZGF0ZU1vZGUgaXMgSW5jcmVtZW50YWwsIHRoZW4geWVzLiBJZiBVcGRhdGVNb2RlIGlzIENvbXBsZXRlLCB0aGVuIGl0J3Mgc2FmZSB0byBza2lwXG4gICAgICAvLyBvbmx5IGlmIHRoZXJlIGFyZSBubyBhY3RpdmUgY2hhbmdlcyBhbHJlYWR5ICh0aGF0IHdvdWxkIGJlIGNsZWFyZWQgYnkgdGhlIHVwZGF0ZSkuXG5cbiAgICAgIGlmICh1cGRhdGVNb2RlICE9PSBVcGRhdGVNb2RlLkNvbXBsZXRlIHx8IHRoaXMuc2ZNYXAuc2l6ZSA9PT0gMCkge1xuICAgICAgICAvLyBObyBjaGFuZ2VzIHdvdWxkIGJlIG1hZGUgdG8gdGhlIGB0cy5Qcm9ncmFtYCBhbnl3YXksIHNvIGl0J3Mgc2FmZSB0byBkbyBub3RoaW5nIGhlcmUuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodXBkYXRlTW9kZSA9PT0gVXBkYXRlTW9kZS5Db21wbGV0ZSkge1xuICAgICAgdGhpcy5zZk1hcC5jbGVhcigpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgW2ZpbGVQYXRoLCB7bmV3VGV4dCwgb3JpZ2luYWxGaWxlfV0gb2YgY29udGVudHMuZW50cmllcygpKSB7XG4gICAgICBjb25zdCBzZiA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZVBhdGgsIG5ld1RleHQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpO1xuICAgICAgaWYgKG9yaWdpbmFsRmlsZSAhPT0gbnVsbCkge1xuICAgICAgICAoc2YgYXMgTWF5YmVTb3VyY2VGaWxlV2l0aE9yaWdpbmFsRmlsZSlbTmdPcmlnaW5hbEZpbGVdID0gb3JpZ2luYWxGaWxlO1xuICAgICAgfVxuICAgICAgdGhpcy5zZk1hcC5zZXQoZmlsZVBhdGgsIHNmKTtcbiAgICB9XG5cbiAgICBjb25zdCBob3N0ID0gbmV3IFVwZGF0ZWRQcm9ncmFtSG9zdChcbiAgICAgICAgdGhpcy5zZk1hcCwgdGhpcy5vcmlnaW5hbFByb2dyYW0sIHRoaXMub3JpZ2luYWxIb3N0LCB0aGlzLnNoaW1FeHRlbnNpb25QcmVmaXhlcyk7XG4gICAgY29uc3Qgb2xkUHJvZ3JhbSA9IHRoaXMucHJvZ3JhbTtcblxuICAgIC8vIFJldGFnIHRoZSBvbGQgcHJvZ3JhbSdzIGB0cy5Tb3VyY2VGaWxlYHMgd2l0aCBzaGltIHRhZ3MsIHRvIGFsbG93IFR5cGVTY3JpcHQgdG8gcmV1c2UgdGhlXG4gICAgLy8gbW9zdCBkYXRhLlxuICAgIHJldGFnQWxsVHNGaWxlcyhvbGRQcm9ncmFtKTtcblxuICAgIHRoaXMucHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0oe1xuICAgICAgaG9zdCxcbiAgICAgIHJvb3ROYW1lczogdGhpcy5wcm9ncmFtLmdldFJvb3RGaWxlTmFtZXMoKSxcbiAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIG9sZFByb2dyYW0sXG4gICAgfSk7XG4gICAgaG9zdC5wb3N0UHJvZ3JhbUNyZWF0aW9uQ2xlYW51cCgpO1xuXG4gICAgLy8gQW5kIHVudGFnIHRoZW0gYWZ0ZXJ3YXJkcy4gV2UgZXhwbGljaXRseSB1bnRhZyBib3RoIHByb2dyYW1zIGhlcmUsIGJlY2F1c2UgdGhlIG9sZFByb2dyYW1cbiAgICAvLyBtYXkgc3RpbGwgYmUgdXNlZCBmb3IgZW1pdCBhbmQgbmVlZHMgdG8gbm90IGNvbnRhaW4gdGFncy5cbiAgICB1bnRhZ0FsbFRzRmlsZXModGhpcy5wcm9ncmFtKTtcbiAgICB1bnRhZ0FsbFRzRmlsZXMob2xkUHJvZ3JhbSk7XG4gIH1cbn1cbiJdfQ==