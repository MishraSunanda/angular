/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {SimpleChange} from '../change_detection/change_detection_util';
import {OnChanges, SimpleChanges} from '../metadata/lifecycle_hooks';
import {RendererType2} from '../render/api';
import {Type} from '../type';
import {resolveRendererType2} from '../view/util';

import {diPublic} from './di';
import {ComponentDef, ComponentDefArgs, DirectiveDef, DirectiveDefArgs} from './interfaces/definition';



/**
 * Create a component definition object.
 *
 *
 * # Example
 * ```
 * class MyDirective {
 *   // Generated by Angular Template Compiler
 *   // [Symbol] syntax will not be supported by TypeScript until v2.7
 *   static [COMPONENT_DEF_SYMBOL] = defineComponent({
 *     ...
 *   });
 * }
 * ```
 */
export function defineComponent<T>(componentDefinition: ComponentDefArgs<T>): ComponentDef<T> {
  const type = componentDefinition.type;
  const def = <ComponentDef<any>>{
    type: type,
    diPublic: null,
    n: componentDefinition.factory,
    tag: (componentDefinition as ComponentDefArgs<T>).tag || null !,
    template: (componentDefinition as ComponentDefArgs<T>).template || null !,
    h: componentDefinition.hostBindings || noop,
    inputs: invertObject(componentDefinition.inputs),
    outputs: invertObject(componentDefinition.outputs),
    methods: invertObject(componentDefinition.methods),
    rendererType: resolveRendererType2(componentDefinition.rendererType) || null,
    exportAs: componentDefinition.exportAs,
    onInit: type.prototype.ngOnInit || null,
    doCheck: type.prototype.ngDoCheck || null,
    afterContentInit: type.prototype.ngAfterContentInit || null,
    afterContentChecked: type.prototype.ngAfterContentChecked || null,
    afterViewInit: type.prototype.ngAfterViewInit || null,
    afterViewChecked: type.prototype.ngAfterViewChecked || null,
    onDestroy: type.prototype.ngOnDestroy || null
  };
  const feature = componentDefinition.features;
  feature && feature.forEach((fn) => fn(def));
  return def;
}


const PRIVATE_PREFIX = '__ngOnChanges_';

type OnChangesExpando = OnChanges & {
  __ngOnChanges_: SimpleChanges|null|undefined;
  [key: string]: any;
};

export function NgOnChangesFeature<T>(type: Type<T>): (definition: DirectiveDef<any>) => void {
  return function(definition: DirectiveDef<any>): void {
    const inputs = definition.inputs;
    const proto = type.prototype;
    // Place where we will store SimpleChanges if there is a change
    Object.defineProperty(proto, PRIVATE_PREFIX, {value: undefined, writable: true});
    for (let pubKey in inputs) {
      const minKey = inputs[pubKey];
      const privateMinKey = PRIVATE_PREFIX + minKey;
      // Create a place where the actual value will be stored and make it non-enumerable
      Object.defineProperty(proto, privateMinKey, {value: undefined, writable: true});

      const existingDesc = Object.getOwnPropertyDescriptor(proto, minKey);

      // create a getter and setter for property
      Object.defineProperty(proto, minKey, {
        get: function(this: OnChangesExpando) {
          return (existingDesc && existingDesc.get) ? existingDesc.get.call(this) :
                                                      this[privateMinKey];
        },
        set: function(this: OnChangesExpando, value: any) {
          let simpleChanges = this[PRIVATE_PREFIX];
          let isFirstChange = simpleChanges === undefined;
          if (simpleChanges == null) {
            simpleChanges = this[PRIVATE_PREFIX] = {};
          }
          simpleChanges[pubKey] = new SimpleChange(this[privateMinKey], value, isFirstChange);
          (existingDesc && existingDesc.set) ? existingDesc.set.call(this, value) :
                                               this[privateMinKey] = value;
        }
      });
    }
    definition.doCheck = (function(delegateDoCheck) {
      return function(this: OnChangesExpando) {
        let simpleChanges = this[PRIVATE_PREFIX];
        if (simpleChanges != null) {
          this.ngOnChanges(simpleChanges);
          this[PRIVATE_PREFIX] = null;
        }
        delegateDoCheck && delegateDoCheck.apply(this);
      };
    })(proto.ngDoCheck);
  };
}


export function PublicFeature<T>(definition: DirectiveDef<T>) {
  definition.diPublic = diPublic;
}

const EMPTY = {};

function noop() {}

/** Swaps the keys and values of an object. */
function invertObject(obj: any): any {
  if (obj == null) return EMPTY;
  const newObj: any = {};
  for (let minifiedKey in obj) {
    newObj[obj[minifiedKey]] = minifiedKey;
  }
  return newObj;
}

/**
 * Create a directive definition object.
 *
 * # Example
 * ```
 * class MyDirective {
 *   // Generated by Angular Template Compiler
 *   // [Symbol] syntax will not be supported by TypeScript until v2.7
 *   static [DIRECTIVE_DEF_SYMBOL] = defineDirective({
 *     ...
 *   });
 * }
 * ```
 */
export const defineDirective = defineComponent as<T>(directiveDefinition: DirectiveDefArgs<T>) =>
    DirectiveDef<T>;
