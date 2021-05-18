/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Reads Angular metadata from classes declared in .d.ts files and computes an `ExportScope`.
 *
 * Given an NgModule declared in a .d.ts file, this resolver can produce a transitive `ExportScope`
 * of all of the directives/pipes it exports. It does this by reading metadata off of Ivy static
 * fields on directives, components, pipes, and NgModules.
 */
export class MetadataDtsModuleScopeResolver {
    /**
     * @param dtsMetaReader a `MetadataReader` which can read metadata from `.d.ts` files.
     */
    constructor(dtsMetaReader, aliasingHost) {
        this.dtsMetaReader = dtsMetaReader;
        this.aliasingHost = aliasingHost;
        /**
         * Cache which holds fully resolved scopes for NgModule classes from .d.ts files.
         */
        this.cache = new Map();
    }
    /**
     * Resolve a `Reference`'d NgModule from a .d.ts file and produce a transitive `ExportScope`
     * listing the directives and pipes which that NgModule exports to others.
     *
     * This operation relies on a `Reference` instead of a direct TypeScrpt node as the `Reference`s
     * produced depend on how the original NgModule was imported.
     */
    resolve(ref) {
        const clazz = ref.node;
        const sourceFile = clazz.getSourceFile();
        if (!sourceFile.isDeclarationFile) {
            throw new Error(`Debug error: DtsModuleScopeResolver.read(${ref.debugName} from ${sourceFile.fileName}), but not a .d.ts file`);
        }
        if (this.cache.has(clazz)) {
            return this.cache.get(clazz);
        }
        // Build up the export scope - those directives and pipes made visible by this module.
        const directives = [];
        const pipes = [];
        const ngModules = new Set([clazz]);
        const meta = this.dtsMetaReader.getNgModuleMetadata(ref);
        if (meta === null) {
            this.cache.set(clazz, null);
            return null;
        }
        const declarations = new Set();
        for (const declRef of meta.declarations) {
            declarations.add(declRef.node);
        }
        // Only the 'exports' field of the NgModule's metadata is important. Imports and declarations
        // don't affect the export scope.
        for (const exportRef of meta.exports) {
            // Attempt to process the export as a directive.
            const directive = this.dtsMetaReader.getDirectiveMetadata(exportRef);
            if (directive !== null) {
                const isReExport = !declarations.has(exportRef.node);
                directives.push(this.maybeAlias(directive, sourceFile, isReExport));
                continue;
            }
            // Attempt to process the export as a pipe.
            const pipe = this.dtsMetaReader.getPipeMetadata(exportRef);
            if (pipe !== null) {
                const isReExport = !declarations.has(exportRef.node);
                pipes.push(this.maybeAlias(pipe, sourceFile, isReExport));
                continue;
            }
            // Attempt to process the export as a module.
            const exportScope = this.resolve(exportRef);
            if (exportScope !== null) {
                // It is a module. Add exported directives and pipes to the current scope. This might
                // involve rewriting the `Reference`s to those types to have an alias expression if one is
                // required.
                if (this.aliasingHost === null) {
                    // Fast path when aliases aren't required.
                    directives.push(...exportScope.exported.directives);
                    pipes.push(...exportScope.exported.pipes);
                }
                else {
                    // It's necessary to rewrite the `Reference`s to add alias expressions. This way, imports
                    // generated to these directives and pipes will use a shallow import to `sourceFile`
                    // instead of a deep import directly to the directive or pipe class.
                    //
                    // One important check here is whether the directive/pipe is declared in the same
                    // source file as the re-exporting NgModule. This can happen if both a directive, its
                    // NgModule, and the re-exporting NgModule are all in the same file. In this case,
                    // no import alias is needed as it would go to the same file anyway.
                    for (const directive of exportScope.exported.directives) {
                        directives.push(this.maybeAlias(directive, sourceFile, /* isReExport */ true));
                    }
                    for (const pipe of exportScope.exported.pipes) {
                        pipes.push(this.maybeAlias(pipe, sourceFile, /* isReExport */ true));
                    }
                    for (const ngModule of exportScope.exported.ngModules) {
                        ngModules.add(ngModule);
                    }
                }
            }
            continue;
            // The export was not a directive, a pipe, or a module. This is an error.
            // TODO(alxhub): produce a ts.Diagnostic
        }
        const exportScope = {
            exported: {
                directives,
                pipes,
                ngModules: Array.from(ngModules),
                isPoisoned: false,
            },
        };
        this.cache.set(clazz, exportScope);
        return exportScope;
    }
    maybeAlias(dirOrPipe, maybeAliasFrom, isReExport) {
        const ref = dirOrPipe.ref;
        if (this.aliasingHost === null || ref.node.getSourceFile() === maybeAliasFrom) {
            return dirOrPipe;
        }
        const alias = this.aliasingHost.getAliasIn(ref.node, maybeAliasFrom, isReExport);
        if (alias === null) {
            return dirOrPipe;
        }
        return Object.assign(Object.assign({}, dirOrPipe), { ref: ref.cloneWithAlias(alias) });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2NvcGUvc3JjL2RlcGVuZGVuY3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBY0g7Ozs7OztHQU1HO0FBQ0gsTUFBTSxPQUFPLDhCQUE4QjtJQU16Qzs7T0FFRztJQUNILFlBQW9CLGFBQTZCLEVBQVUsWUFBK0I7UUFBdEUsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQVUsaUJBQVksR0FBWixZQUFZLENBQW1CO1FBUjFGOztXQUVHO1FBQ0ssVUFBSyxHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO0lBSytCLENBQUM7SUFFOUY7Ozs7OztPQU1HO0lBQ0gsT0FBTyxDQUFDLEdBQWdDO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDdkIsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQUU7WUFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsR0FBRyxDQUFDLFNBQVMsU0FDckUsVUFBVSxDQUFDLFFBQVEseUJBQXlCLENBQUMsQ0FBQztTQUNuRDtRQUVELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDekIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUUsQ0FBQztTQUMvQjtRQUVELHNGQUFzRjtRQUN0RixNQUFNLFVBQVUsR0FBb0IsRUFBRSxDQUFDO1FBQ3ZDLE1BQU0sS0FBSyxHQUFlLEVBQUUsQ0FBQztRQUM3QixNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXJELE1BQU0sSUFB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UyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztxQkFDekI7aUJBQ0Y7YUFDRjtZQUNELFNBQVM7WUFFVCx5RUFBeUU7WUFDekUsd0NBQXdDO1NBQ3pDO1FBRUQsTUFBTSxXQUFXLEdBQWdCO1lBQy9CLFFBQVEsRUFBRTtnQkFDUixVQUFVO2dCQUNWLEtBQUs7Z0JBQ0wsU0FBUyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNoQyxVQUFVLEVBQUUsS0FBSzthQUNsQjtTQUNGLENBQUM7UUFDRixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDbkMsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztJQUVPLFVBQVUsQ0FDZCxTQUFZLEVBQUUsY0FBNkIsRUFBRSxVQUFtQjtRQUNsRSxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDO1FBQzFCLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxjQUFjLEVBQUU7WUFDN0UsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNqRixJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7WUFDbEIsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFFRCx1Q0FDSyxTQUFTLEtBQ1osR0FBRyxFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQzlCO0lBQ0osQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FsaWFzaW5nSG9zdCwgUmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7RGlyZWN0aXZlTWV0YSwgTWV0YWRhdGFSZWFkZXIsIFBpcGVNZXRhfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5pbXBvcnQge0V4cG9ydFNjb3BlfSBmcm9tICcuL2FwaSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRHRzTW9kdWxlU2NvcGVSZXNvbHZlciB7XG4gIHJlc29sdmUocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiBFeHBvcnRTY29wZXxudWxsO1xufVxuXG4vKipcbiAqIFJlYWRzIEFuZ3VsYXIgbWV0YWRhdGEgZnJvbSBjbGFzc2VzIGRlY2xhcmVkIGluIC5kLnRzIGZpbGVzIGFuZCBjb21wdXRlcyBhbiBgRXhwb3J0U2NvcGVgLlxuICpcbiAqIEdpdmVuIGFuIE5nTW9kdWxlIGRlY2xhcmVkIGluIGEgLmQudHMgZmlsZSwgdGhpcyByZXNvbHZlciBjYW4gcHJvZHVjZSBhIHRyYW5zaXRpdmUgYEV4cG9ydFNjb3BlYFxuICogb2YgYWxsIG9mIHRoZSBkaXJlY3RpdmVzL3BpcGVzIGl0IGV4cG9ydHMuIEl0IGRvZXMgdGhpcyBieSByZWFkaW5nIG1ldGFkYXRhIG9mZiBvZiBJdnkgc3RhdGljXG4gKiBmaWVsZHMgb24gZGlyZWN0aXZlcywgY29tcG9uZW50cywgcGlwZXMsIGFuZCBOZ01vZHVsZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIgaW1wbGVtZW50cyBEdHNNb2R1bGVTY29wZVJlc29sdmVyIHtcbiAgLyoqXG4gICAqIENhY2hlIHdoaWNoIGhvbGRzIGZ1bGx5IHJlc29sdmVkIHNjb3BlcyBmb3IgTmdNb2R1bGUgY2xhc3NlcyBmcm9tIC5kLnRzIGZpbGVzLlxuICAgKi9cbiAgcHJpdmF0ZSBjYWNoZSA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgRXhwb3J0U2NvcGV8bnVsbD4oKTtcblxuICAvKipcbiAgICogQHBhcmFtIGR0c01ldGFSZWFkZXIgYSBgTWV0YWRhdGFSZWFkZXJgIHdoaWNoIGNhbiByZWFkIG1ldGFkYXRhIGZyb20gYC5kLnRzYCBmaWxlcy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZHRzTWV0YVJlYWRlcjogTWV0YWRhdGFSZWFkZXIsIHByaXZhdGUgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbCkge31cblxuICAvKipcbiAgICogUmVzb2x2ZSBhIGBSZWZlcmVuY2VgJ2QgTmdNb2R1bGUgZnJvbSBhIC5kLnRzIGZpbGUgYW5kIHByb2R1Y2UgYSB0cmFuc2l0aXZlIGBFeHBvcnRTY29wZWBcbiAgICogbGlzdGluZyB0aGUgZGlyZWN0aXZlcyBhbmQgcGlwZXMgd2hpY2ggdGhhdCBOZ01vZHVsZSBleHBvcnRzIHRvIG90aGVycy5cbiAgICpcbiAgICogVGhpcyBvcGVyYXRpb24gcmVsaWVzIG9uIGEgYFJlZmVyZW5jZWAgaW5zdGVhZCBvZiBhIGRpcmVjdCBUeXBlU2NycHQgbm9kZSBhcyB0aGUgYFJlZmVyZW5jZWBzXG4gICAqIHByb2R1Y2VkIGRlcGVuZCBvbiBob3cgdGhlIG9yaWdpbmFsIE5nTW9kdWxlIHdhcyBpbXBvcnRlZC5cbiAgICovXG4gIHJlc29sdmUocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiBFeHBvcnRTY29wZXxudWxsIHtcbiAgICBjb25zdCBjbGF6eiA9IHJlZi5ub2RlO1xuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSBjbGF6ei5nZXRTb3VyY2VGaWxlKCk7XG4gICAgaWYgKCFzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYERlYnVnIGVycm9yOiBEdHNNb2R1bGVTY29wZVJlc29sdmVyLnJlYWQoJHtyZWYuZGVidWdOYW1lfSBmcm9tICR7XG4gICAgICAgICAgc291cmNlRmlsZS5maWxlTmFtZX0pLCBidXQgbm90IGEgLmQudHMgZmlsZWApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNhY2hlLmhhcyhjbGF6eikpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlLmdldChjbGF6eikhO1xuICAgIH1cblxuICAgIC8vIEJ1aWxkIHVwIHRoZSBleHBvcnQgc2NvcGUgLSB0aG9zZSBkaXJlY3RpdmVzIGFuZCBwaXBlcyBtYWRlIHZpc2libGUgYnkgdGhpcyBtb2R1bGUuXG4gICAgY29uc3QgZGlyZWN0aXZlczogRGlyZWN0aXZlTWV0YVtdID0gW107XG4gICAgY29uc3QgcGlwZXM6IFBpcGVNZXRhW10gPSBbXTtcbiAgICBjb25zdCBuZ01vZHVsZXMgPSBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KFtjbGF6el0pO1xuXG4gICAgY29uc3QgbWV0YSA9IHRoaXMuZHRzTWV0YVJlYWRlci5nZXROZ01vZHVsZU1ldGFkYXRhKHJlZik7XG4gICAgaWYgKG1ldGEgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KGNsYXp6LCBudWxsKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9IG5ldyBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4oKTtcbiAgICBmb3IgKGNvbnN0IGRlY2xSZWYgb2YgbWV0YS5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIGRlY2xhcmF0aW9ucy5hZGQoZGVjbFJlZi5ub2RlKTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IHRoZSAnZXhwb3J0cycgZmllbGQgb2YgdGhlIE5nTW9kdWxlJ3MgbWV0YWRhdGEgaXMgaW1wb3J0YW50LiBJbXBvcnRzIGFuZCBkZWNsYXJhdGlvbnNcbiAgICAvLyBkb24ndCBhZmZlY3QgdGhlIGV4cG9ydCBzY29wZS5cbiAgICBmb3IgKGNvbnN0IGV4cG9ydFJlZiBvZiBtZXRhLmV4cG9ydHMpIHtcbiAgICAgIC8vIEF0dGVtcHQgdG8gcHJvY2VzcyB0aGUgZXhwb3J0IGFzIGEgZGlyZWN0aXZlLlxuICAgICAgY29uc3QgZGlyZWN0aXZlID0gdGhpcy5kdHNNZXRhUmVhZGVyLmdldERpcmVjdGl2ZU1ldGFkYXRhKGV4cG9ydFJlZik7XG4gICAgICBpZiAoZGlyZWN0aXZlICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGlzUmVFeHBvcnQgPSAhZGVjbGFyYXRpb25zLmhhcyhleHBvcnRSZWYubm9kZSk7XG4gICAgICAgIGRpcmVjdGl2ZXMucHVzaCh0aGlzLm1heWJlQWxpYXMoZGlyZWN0aXZlLCBzb3VyY2VGaWxlLCBpc1JlRXhwb3J0KSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBBdHRlbXB0IHRvIHByb2Nlc3MgdGhlIGV4cG9ydCBhcyBhIHBpcGUuXG4gICAgICBjb25zdCBwaXBlID0gdGhpcy5kdHNNZXRhUmVhZGVyLmdldFBpcGVNZXRhZGF0YShleHBvcnRSZWYpO1xuICAgICAgaWYgKHBpcGUgIT09IG51bGwpIHtcbiAgICAgICAgY29uc3QgaXNSZUV4cG9ydCA9ICFkZWNsYXJhdGlvbnMuaGFzKGV4cG9ydFJlZi5ub2RlKTtcbiAgICAgICAgcGlwZXMucHVzaCh0aGlzLm1heWJlQWxpYXMocGlwZSwgc291cmNlRmlsZSwgaXNSZUV4cG9ydCkpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gQXR0ZW1wdCB0byBwcm9jZXNzIHRoZSBleHBvcnQgYXMgYSBtb2R1bGUuXG4gICAgICBjb25zdCBleHBvcnRTY29wZSA9IHRoaXMucmVzb2x2ZShleHBvcnRSZWYpO1xuICAgICAgaWYgKGV4cG9ydFNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgIC8vIEl0IGlzIGEgbW9kdWxlLiBBZGQgZXhwb3J0ZWQgZGlyZWN0aXZlcyBhbmQgcGlwZXMgdG8gdGhlIGN1cnJlbnQgc2NvcGUuIFRoaXMgbWlnaHRcbiAgICAgICAgLy8gaW52b2x2ZSByZXdyaXRpbmcgdGhlIGBSZWZlcmVuY2VgcyB0byB0aG9zZSB0eXBlcyB0byBoYXZlIGFuIGFsaWFzIGV4cHJlc3Npb24gaWYgb25lIGlzXG4gICAgICAgIC8vIHJlcXVpcmVkLlxuICAgICAgICBpZiAodGhpcy5hbGlhc2luZ0hvc3QgPT09IG51bGwpIHtcbiAgICAgICAgICAvLyBGYXN0IHBhdGggd2hlbiBhbGlhc2VzIGFyZW4ndCByZXF1aXJlZC5cbiAgICAgICAgICBkaXJlY3RpdmVzLnB1c2goLi4uZXhwb3J0U2NvcGUuZXhwb3J0ZWQuZGlyZWN0aXZlcyk7XG4gICAgICAgICAgcGlwZXMucHVzaCguLi5leHBvcnRTY29wZS5leHBvcnRlZC5waXBlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gSXQncyBuZWNlc3NhcnkgdG8gcmV3cml0ZSB0aGUgYFJlZmVyZW5jZWBzIHRvIGFkZCBhbGlhcyBleHByZXNzaW9ucy4gVGhpcyB3YXksIGltcG9ydHNcbiAgICAgICAgICAvLyBnZW5lcmF0ZWQgdG8gdGhlc2UgZGlyZWN0aXZlcyBhbmQgcGlwZXMgd2lsbCB1c2UgYSBzaGFsbG93IGltcG9ydCB0byBgc291cmNlRmlsZWBcbiAgICAgICAgICAvLyBpbnN0ZWFkIG9mIGEgZGVlcCBpbXBvcnQgZGlyZWN0bHkgdG8gdGhlIGRpcmVjdGl2ZSBvciBwaXBlIGNsYXNzLlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gT25lIGltcG9ydGFudCBjaGVjayBoZXJlIGlzIHdoZXRoZXIgdGhlIGRpcmVjdGl2ZS9waXBlIGlzIGRlY2xhcmVkIGluIHRoZSBzYW1lXG4gICAgICAgICAgLy8gc291cmNlIGZpbGUgYXMgdGhlIHJlLWV4cG9ydGluZyBOZ01vZHVsZS4gVGhpcyBjYW4gaGFwcGVuIGlmIGJvdGggYSBkaXJlY3RpdmUsIGl0c1xuICAgICAgICAgIC8vIE5nTW9kdWxlLCBhbmQgdGhlIHJlLWV4cG9ydGluZyBOZ01vZHVsZSBhcmUgYWxsIGluIHRoZSBzYW1lIGZpbGUuIEluIHRoaXMgY2FzZSxcbiAgICAgICAgICAvLyBubyBpbXBvcnQgYWxpYXMgaXMgbmVlZGVkIGFzIGl0IHdvdWxkIGdvIHRvIHRoZSBzYW1lIGZpbGUgYW55d2F5LlxuICAgICAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGV4cG9ydFNjb3BlLmV4cG9ydGVkLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgICAgIGRpcmVjdGl2ZXMucHVzaCh0aGlzLm1heWJlQWxpYXMoZGlyZWN0aXZlLCBzb3VyY2VGaWxlLCAvKiBpc1JlRXhwb3J0ICovIHRydWUpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yIChjb25zdCBwaXBlIG9mIGV4cG9ydFNjb3BlLmV4cG9ydGVkLnBpcGVzKSB7XG4gICAgICAgICAgICBwaXBlcy5wdXNoKHRoaXMubWF5YmVBbGlhcyhwaXBlLCBzb3VyY2VGaWxlLCAvKiBpc1JlRXhwb3J0ICovIHRydWUpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yIChjb25zdCBuZ01vZHVsZSBvZiBleHBvcnRTY29wZS5leHBvcnRlZC5uZ01vZHVsZXMpIHtcbiAgICAgICAgICAgIG5nTW9kdWxlcy5hZGQobmdNb2R1bGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29udGludWU7XG5cbiAgICAgIC8vIFRoZSBleHBvcnQgd2FzIG5vdCBhIGRpcmVjdGl2ZSwgYSBwaXBlLCBvciBhIG1vZHVsZS4gVGhpcyBpcyBhbiBlcnJvci5cbiAgICAgIC8vIFRPRE8oYWx4aHViKTogcHJvZHVjZSBhIHRzLkRpYWdub3N0aWNcbiAgICB9XG5cbiAgICBjb25zdCBleHBvcnRTY29wZTogRXhwb3J0U2NvcGUgPSB7XG4gICAgICBleHBvcnRlZDoge1xuICAgICAgICBkaXJlY3RpdmVzLFxuICAgICAgICBwaXBlcyxcbiAgICAgICAgbmdNb2R1bGVzOiBBcnJheS5mcm9tKG5nTW9kdWxlcyksXG4gICAgICAgIGlzUG9pc29uZWQ6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9O1xuICAgIHRoaXMuY2FjaGUuc2V0KGNsYXp6LCBleHBvcnRTY29wZSk7XG4gICAgcmV0dXJuIGV4cG9ydFNjb3BlO1xuICB9XG5cbiAgcHJpdmF0ZSBtYXliZUFsaWFzPFQgZXh0ZW5kcyBEaXJlY3RpdmVNZXRhfFBpcGVNZXRhPihcbiAgICAgIGRpck9yUGlwZTogVCwgbWF5YmVBbGlhc0Zyb206IHRzLlNvdXJjZUZpbGUsIGlzUmVFeHBvcnQ6IGJvb2xlYW4pOiBUIHtcbiAgICBjb25zdCByZWYgPSBkaXJPclBpcGUucmVmO1xuICAgIGlmICh0aGlzLmFsaWFzaW5nSG9zdCA9PT0gbnVsbCB8fCByZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkgPT09IG1heWJlQWxpYXNGcm9tKSB7XG4gICAgICByZXR1cm4gZGlyT3JQaXBlO1xuICAgIH1cblxuICAgIGNvbnN0IGFsaWFzID0gdGhpcy5hbGlhc2luZ0hvc3QuZ2V0QWxpYXNJbihyZWYubm9kZSwgbWF5YmVBbGlhc0Zyb20sIGlzUmVFeHBvcnQpO1xuICAgIGlmIChhbGlhcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGRpck9yUGlwZTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgLi4uZGlyT3JQaXBlLFxuICAgICAgcmVmOiByZWYuY2xvbmVXaXRoQWxpYXMoYWxpYXMpLFxuICAgIH07XG4gIH1cbn1cbiJdfQ==