/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { getFileSystem } from '../../file_system';
import { isNonDeclarationTsPath } from '../../util/src/typescript';
export function findFlatIndexEntryPoint(rootFiles) {
    // There are two ways for a file to be recognized as the flat module index:
    // 1) if it's the only file!!!!!!
    // 2) (deprecated) if it's named 'index.ts' and has the shortest path of all such files.
    const tsFiles = rootFiles.filter(file => isNonDeclarationTsPath(file));
    let resolvedEntryPoint = null;
    if (tsFiles.length === 1) {
        // There's only one file - this is the flat module index.
        resolvedEntryPoint = tsFiles[0];
    }
    else {
        // In the event there's more than one TS file, one of them can still be selected as the
        // flat module index if it's named 'index.ts'. If there's more than one 'index.ts', the one
        // with the shortest path wins.
        //
        // This behavior is DEPRECATED and only exists to support existing usages.
        for (const tsFile of tsFiles) {
            if (getFileSystem().basename(tsFile) === 'index.ts' &&
                (resolvedEntryPoint === null || tsFile.length <= resolvedEntryPoint.length)) {
                resolvedEntryPoint = tsFile;
            }
        }
    }
    return resolvedEntryPoint;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2VudHJ5X3BvaW50L3NyYy9sb2dpYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQWlCLGFBQWEsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBRWpFLE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxTQUF3QztJQUU5RSwyRUFBMkU7SUFDM0UsaUNBQWlDO0lBQ2pDLHdGQUF3RjtJQUN4RixNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN2RSxJQUFJLGtCQUFrQixHQUF3QixJQUFJLENBQUM7SUFFbkQsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUN4Qix5REFBeUQ7UUFDekQsa0JBQWtCLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2pDO1NBQU07UUFDTCx1RkFBdUY7UUFDdkYsMkZBQTJGO1FBQzNGLCtCQUErQjtRQUMvQixFQUFFO1FBQ0YsMEVBQTBFO1FBQzFFLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO1lBQzVCLElBQUksYUFBYSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLFVBQVU7Z0JBQy9DLENBQUMsa0JBQWtCLEtBQUssSUFBSSxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksa0JBQWtCLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQy9FLGtCQUFrQixHQUFHLE1BQU0sQ0FBQzthQUM3QjtTQUNGO0tBQ0Y7SUFFRCxPQUFPLGtCQUFrQixDQUFDO0FBQzVCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgZ2V0RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtpc05vbkRlY2xhcmF0aW9uVHNQYXRofSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRGbGF0SW5kZXhFbnRyeVBvaW50KHJvb3RGaWxlczogUmVhZG9ubHlBcnJheTxBYnNvbHV0ZUZzUGF0aD4pOiBBYnNvbHV0ZUZzUGF0aHxcbiAgICBudWxsIHtcbiAgLy8gVGhlcmUgYXJlIHR3byB3YXlzIGZvciBhIGZpbGUgdG8gYmUgcmVjb2duaXplZCBhcyB0aGUgZmxhdCBtb2R1bGUgaW5kZXg6XG4gIC8vIDEpIGlmIGl0J3MgdGhlIG9ubHkgZmlsZSEhISEhIVxuICAvLyAyKSAoZGVwcmVjYXRlZCkgaWYgaXQncyBuYW1lZCAnaW5kZXgudHMnIGFuZCBoYXMgdGhlIHNob3J0ZXN0IHBhdGggb2YgYWxsIHN1Y2ggZmlsZXMuXG4gIGNvbnN0IHRzRmlsZXMgPSByb290RmlsZXMuZmlsdGVyKGZpbGUgPT4gaXNOb25EZWNsYXJhdGlvblRzUGF0aChmaWxlKSk7XG4gIGxldCByZXNvbHZlZEVudHJ5UG9pbnQ6IEFic29sdXRlRnNQYXRofG51bGwgPSBudWxsO1xuXG4gIGlmICh0c0ZpbGVzLmxlbmd0aCA9PT0gMSkge1xuICAgIC8vIFRoZXJlJ3Mgb25seSBvbmUgZmlsZSAtIHRoaXMgaXMgdGhlIGZsYXQgbW9kdWxlIGluZGV4LlxuICAgIHJlc29sdmVkRW50cnlQb2ludCA9IHRzRmlsZXNbMF07XG4gIH0gZWxzZSB7XG4gICAgLy8gSW4gdGhlIGV2ZW50IHRoZXJlJ3MgbW9yZSB0aGFuIG9uZSBUUyBmaWxlLCBvbmUgb2YgdGhlbSBjYW4gc3RpbGwgYmUgc2VsZWN0ZWQgYXMgdGhlXG4gICAgLy8gZmxhdCBtb2R1bGUgaW5kZXggaWYgaXQncyBuYW1lZCAnaW5kZXgudHMnLiBJZiB0aGVyZSdzIG1vcmUgdGhhbiBvbmUgJ2luZGV4LnRzJywgdGhlIG9uZVxuICAgIC8vIHdpdGggdGhlIHNob3J0ZXN0IHBhdGggd2lucy5cbiAgICAvL1xuICAgIC8vIFRoaXMgYmVoYXZpb3IgaXMgREVQUkVDQVRFRCBhbmQgb25seSBleGlzdHMgdG8gc3VwcG9ydCBleGlzdGluZyB1c2FnZXMuXG4gICAgZm9yIChjb25zdCB0c0ZpbGUgb2YgdHNGaWxlcykge1xuICAgICAgaWYgKGdldEZpbGVTeXN0ZW0oKS5iYXNlbmFtZSh0c0ZpbGUpID09PSAnaW5kZXgudHMnICYmXG4gICAgICAgICAgKHJlc29sdmVkRW50cnlQb2ludCA9PT0gbnVsbCB8fCB0c0ZpbGUubGVuZ3RoIDw9IHJlc29sdmVkRW50cnlQb2ludC5sZW5ndGgpKSB7XG4gICAgICAgIHJlc29sdmVkRW50cnlQb2ludCA9IHRzRmlsZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzb2x2ZWRFbnRyeVBvaW50O1xufVxuIl19