import type { Dispatch, SetStateAction } from 'react';
import { useState, useCallback } from 'react';
import useLatest from './useLatest';

type GetStateAction<S> = () => S;

function useGetState<S>(
  initialState: S | (() => S),
): [S, Dispatch<SetStateAction<S>>, GetStateAction<S>];
function useGetState<S = undefined>(): [
  S | undefined,
  Dispatch<SetStateAction<S | undefined>>,
  GetStateAction<S | undefined>,
];
function useGetState<S>(initialState?: S) {
  const [state, _setState] = useState(initialState);
  const stateRef = useLatest(state);

  const setState = (value: any) => {
    stateRef.current = value;
    _setState(value);
  };

  const getState = useCallback(() => stateRef.current, []);

  return [state, setState, getState];
}

export default useGetState;
