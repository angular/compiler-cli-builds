/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ModelMapping } from '../../../metadata';
import { ClassMember, ReflectionHost } from '../../../reflection';
/**
 * Attempts to parse a model class member. Returns the parsed model mapping if possible.
 */
export declare function tryParseSignalModelMapping(member: Pick<ClassMember, 'name' | 'value'>, reflector: ReflectionHost, isCore: boolean): ModelMapping | null;
