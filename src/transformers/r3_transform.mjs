/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { updateSourceFile } from './node_emitter';
/**
 * Returns a transformer that adds the requested static methods specified by modules.
 */
export function getAngularClassTransformerFactory(modules, annotateForClosureCompiler) {
    if (modules.length === 0) {
        // If no modules are specified, just return an identity transform.
        return () => sf => sf;
    }
    const moduleMap = new Map(modules.map(m => [m.fileName, m]));
    return function (context) {
        return function (sourceFile) {
            const module = moduleMap.get(sourceFile.fileName);
            if (module && module.statements.length > 0) {
                const [newSourceFile] = updateSourceFile(sourceFile, module, annotateForClosureCompiler);
                return newSourceFile;
            }
            return sourceFile;
        };
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicjNfdHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvcjNfdHJhbnNmb3JtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUtILE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBS2hEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGlDQUFpQyxDQUM3QyxPQUF3QixFQUFFLDBCQUFtQztJQUMvRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ3hCLGtFQUFrRTtRQUNsRSxPQUFPLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0tBQ3ZCO0lBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBMEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RGLE9BQU8sVUFBUyxPQUFpQztRQUMvQyxPQUFPLFVBQVMsVUFBeUI7WUFDdkMsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbEQsSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUMxQyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO2dCQUN6RixPQUFPLGFBQWEsQ0FBQzthQUN0QjtZQUNELE9BQU8sVUFBVSxDQUFDO1FBQ3BCLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtQYXJ0aWFsTW9kdWxlLCBTdGF0ZW1lbnQsIFN0YXRpY1N5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7dXBkYXRlU291cmNlRmlsZX0gZnJvbSAnLi9ub2RlX2VtaXR0ZXInO1xuXG5leHBvcnQgdHlwZSBUcmFuc2Zvcm1lciA9IChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKSA9PiB0cy5Tb3VyY2VGaWxlO1xuZXhwb3J0IHR5cGUgVHJhbnNmb3JtZXJGYWN0b3J5ID0gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT4gVHJhbnNmb3JtZXI7XG5cbi8qKlxuICogUmV0dXJucyBhIHRyYW5zZm9ybWVyIHRoYXQgYWRkcyB0aGUgcmVxdWVzdGVkIHN0YXRpYyBtZXRob2RzIHNwZWNpZmllZCBieSBtb2R1bGVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QW5ndWxhckNsYXNzVHJhbnNmb3JtZXJGYWN0b3J5KFxuICAgIG1vZHVsZXM6IFBhcnRpYWxNb2R1bGVbXSwgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4pOiBUcmFuc2Zvcm1lckZhY3Rvcnkge1xuICBpZiAobW9kdWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAvLyBJZiBubyBtb2R1bGVzIGFyZSBzcGVjaWZpZWQsIGp1c3QgcmV0dXJuIGFuIGlkZW50aXR5IHRyYW5zZm9ybS5cbiAgICByZXR1cm4gKCkgPT4gc2YgPT4gc2Y7XG4gIH1cbiAgY29uc3QgbW9kdWxlTWFwID0gbmV3IE1hcChtb2R1bGVzLm1hcDxbc3RyaW5nLCBQYXJ0aWFsTW9kdWxlXT4obSA9PiBbbS5maWxlTmFtZSwgbV0pKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkge1xuICAgIHJldHVybiBmdW5jdGlvbihzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gICAgICBjb25zdCBtb2R1bGUgPSBtb2R1bGVNYXAuZ2V0KHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgICAgaWYgKG1vZHVsZSAmJiBtb2R1bGUuc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IFtuZXdTb3VyY2VGaWxlXSA9IHVwZGF0ZVNvdXJjZUZpbGUoc291cmNlRmlsZSwgbW9kdWxlLCBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcik7XG4gICAgICAgIHJldHVybiBuZXdTb3VyY2VGaWxlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHNvdXJjZUZpbGU7XG4gICAgfTtcbiAgfTtcbn1cbiJdfQ==