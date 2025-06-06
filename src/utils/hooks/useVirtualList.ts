import type { MutableRefObject } from 'react';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useSize } from 'ahooks';

export interface OptionType<T> {
  itemHeight: number | ((index: number, data?: T) => number);
  overscan?: number;
}

export const useVirtualList = <T = any>(list: T[], options: OptionType<T>) => {
  const containerRef = useRef<HTMLElement | null>();
  const size = useSize(containerRef as MutableRefObject<HTMLElement>);
  // 暂时禁止 cache
  // const distanceCache = useRef<{ [key: number]: number }>({});
  const [state, setState] = useState({ start: 0, end: 10 });
  const { itemHeight, overscan = 5 } = options;

  if (!itemHeight) {
    console.warn('please enter a valid itemHeight');
  }

  const getViewCapacity = (containerHeight: number) => {
    if (typeof itemHeight === 'number') {
      return Math.ceil(containerHeight / itemHeight);
    }
    const { start = 0 } = state;
    let sum = 0;
    let capacity = 0;
    for (let i = start; i < list.length; i++) {
      const height = (itemHeight as (index: number, data?: T) => number)(i, list[i]);
      sum += height;
      if (sum >= containerHeight) {
        capacity = i;
        break;
      }
    }
    return capacity - start;
  };

  const getOffset = (scrollTop: number) => {
    if (typeof itemHeight === 'number') {
      return Math.floor(scrollTop / itemHeight) + 1;
    }
    let sum = 0;
    let offset = 0;
    for (let i = 0; i < list.length; i++) {
      const height = (itemHeight as (index: number, data?: T) => number)(i, list[i]);
      sum += height;
      if (sum >= scrollTop) {
        offset = i;
        break;
      }
    }
    return offset + 1;
  };

  const calculateRange = () => {
    const element = containerRef.current;
    if (element) {
      const offset = getOffset(element.scrollTop);
      const viewCapacity = getViewCapacity(element.clientHeight);

      const from = offset - overscan;
      const to = offset + viewCapacity + overscan;
      const nextState = {
        start: from < 0 ? 0 : from,
        end: to > list.length ? list.length : to,
      };
      if (nextState.start - nextState.end !== viewCapacity + overscan * 2) {
        if (nextState.end <= viewCapacity + overscan * 2) {
          nextState.start = 0;
        } else {
          nextState.start = nextState.end - (viewCapacity + overscan * 2);
        }
      }
      setState(nextState);
    }
  };

  useEffect(() => {
    calculateRange();
  }, [size.width, size.height, list.length]);

  const totalHeight = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return list.length * itemHeight;
    }
    return list.reduce((sum, _, index) => sum + itemHeight(index, list[index]), 0);
  }, [list.length]);

  const getDistanceTop = (index: number) => {
    // 如果有缓存，优先返回缓存值
    // if (enableCache && distanceCache.current[index]) {
    //   return distanceCache.current[index];
    // }
    if (typeof itemHeight === 'number') {
      const height = index * itemHeight;
      // if (enableCache) {
      //   distanceCache.current[index] = height;
      // }
      return height;
    }
    const height = list.slice(0, index).reduce((sum, _, i) => sum + itemHeight(i, list[i]), 0);
    // if (enableCache) {
    //   distanceCache.current[index] = height;
    // }
    return height;
  };

  const scrollTo = (index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = getDistanceTop(index);
      calculateRange();
    }
  };

  const offsetTop = useMemo(() => getDistanceTop(state.start), [state.start]);

  return {
    list: list.slice(state.start, state.end).map((ele, index) => ({
      data: ele,
      index: index + state.start,
    })),
    scrollTo,
    containerProps: {
      ref: (ele: any) => {
        containerRef.current = ele;
      },
      onScroll: (e: any) => {
        e.preventDefault();
        calculateRange();
      },
      style: { overflowY: 'auto' as const },
    },
    wrapperProps: {
      style: {
        width: '100%',
        height: totalHeight - offsetTop,
        marginTop: offsetTop,
      },
    },
  };
};
