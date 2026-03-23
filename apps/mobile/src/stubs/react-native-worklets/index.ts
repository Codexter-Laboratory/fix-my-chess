const noop = (() => undefined) as (...args: unknown[]) => undefined;
const noopReturn = (val: unknown) => val;

export const RuntimeKind = {
  ReactNative: 'ReactNative',
  UI: 'UI',
} as const;

export const WorkletsModule = {
  makeShareableCloneRecursive: noopReturn,
  scheduleOnUI: noop,
  scheduleOnJS: noop,
};

export const Worklets = { defaultContext: {} };
export const runOnJS = noopReturn;
export const runOnUI = noopReturn;
export const runOnUISync = noop;
export const runOnRuntime = noop;
export const executeOnUIRuntimeSync = noop;
export const createWorkletRuntime = noop;
export const createSerializable = noopReturn;
export const createSynchronizable = noopReturn;
export const isWorkletFunction = () => false;
export const makeShareable = noopReturn;
export const makeShareableCloneRecursive = noopReturn;
export const scheduleOnUI = noop;
export const scheduleOnRN = noop;
export const callMicrotasks = noop;
export const serializableMappingCache = new Map();

export default {
  RuntimeKind,
  WorkletsModule,
  Worklets,
  runOnJS,
  runOnUI,
  runOnUISync,
};
