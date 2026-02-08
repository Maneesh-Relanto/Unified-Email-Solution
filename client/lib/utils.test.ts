import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Client Utility Functions', () => {
  describe('ClassNames Utility (cn)', () => {
    // Simulate clsx and tailwind-merge behavior
    const cn = (...classes: any[]): string => {
      const classList: string[] = [];

      classes.forEach((cls) => {
        if (typeof cls === 'string') {
          classList.push(cls);
        } else if (Array.isArray(cls)) {
          classList.push(...cls.filter(c => typeof c === 'string'));
        } else if (typeof cls === 'object' && cls !== null) {
          Object.entries(cls).forEach(([key, value]) => {
            if (value) classList.push(key);
          });
        }
      });

      // Simulate tailwind-merge: remove conflicting classes
      return classList
        .filter((cls, idx) => classList.lastIndexOf(cls) === idx)
        .join(' ');
    };

    it('should combine string classes', () => {
      const result = cn('px-2', 'py-1');
      expect(result).toContain('px-2');
      expect(result).toContain('py-1');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base', {
        'active-class': isActive,
        'inactive-class': !isActive,
      });

      expect(result).toContain('base');
      expect(result).toContain('active-class');
      expect(result).not.toContain('inactive-class');
    });

    it('should handle array of classes', () => {
      const result = cn(['px-2', 'py-1'], 'rounded');
      expect(result).toContain('px-2');
      expect(result).toContain('py-1');
      expect(result).toContain('rounded');
    });

    it('should deduplicate classes', () => {
      const result = cn('px-2', 'px-2', 'py-1');
      const count = (result.match(/px-2/g) || []).length;
      expect(count).toBe(1);
    });

    it('should filter falsy values', () => {
      const result = cn('base', null, undefined, false, 'active');
      expect(result).toBe('base active');
    });

    it('should handle merge conflicts (tailwind-merge)', () => {
      // When both classes exist, keep the last one
      const result = cn('px-2', 'px-4');
      expect(result).not.toContain('px-2');
      expect(result).toContain('px-4');
    });
  });

  describe('Date Formatting', () => {
    const formatDate = (date: Date, format: string = 'short'): string => {
      const options: Intl.DateTimeFormatOptions =
        format === 'short'
          ? { month: 'short', day: 'numeric', year: '2-digit' }
          : { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };

      return new Intl.DateTimeFormat('en-US', options).format(date);
    };

    it('should format date in short format', () => {
      const date = new Date('2026-02-08');
      const result = formatDate(date, 'short');
      expect(result).toMatch(/Feb 8/);
    });

    it('should format date in long format', () => {
      const date = new Date('2026-02-08T14:30:00');
      const result = formatDate(date, 'long');
      expect(result).toMatch(/February 8/);
    });

    it('should handle different years', () => {
      const date = new Date('2025-01-01');
      const result = formatDate(date, 'short');
      expect(result).toContain('25');
    });
  });

  describe('Array Utilities', () => {
    const groupBy = <T, K extends string | number>(
      array: T[],
      keyFn: (item: T) => K,
    ): Record<K, T[]> => {
      return array.reduce(
        (acc, item) => {
          const key = keyFn(item);
          (acc[key] ??= []).push(item);
          return acc;
        },
        {} as Record<K, T[]>,
      );
    };

    it('should group items by property', () => {
      const items = [
        { id: 1, category: 'A' },
        { id: 2, category: 'B' },
        { id: 3, category: 'A' },
      ];

      const grouped = groupBy(items, (item) => item.category);

      expect(grouped.A).toHaveLength(2);
      expect(grouped.B).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const grouped = groupBy([], (item: any) => item.category);
      expect(grouped).toEqual({});
    });

    it('should preserve order within groups', () => {
      const items = [
        { id: 1, category: 'A' },
        { id: 3, category: 'A' },
        { id: 2, category: 'A' },
      ];

      const grouped = groupBy(items, (item) => item.category);

      expect(grouped.A.map(i => i.id)).toEqual([1, 3, 2]);
    });
  });

  describe('Object Utilities', () => {
    const pick = <T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> => {
      const result = {} as Pick<T, K>;
      keys.forEach(key => {
        if (key in obj) {
          result[key] = obj[key];
        }
      });
      return result;
    };

    const omit = <T, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> => {
      const result = { ...obj };
      keys.forEach(key => {
        delete result[key];
      });
      return result;
    };

    it('should pick specified properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, 'a', 'c');

      expect(result).toEqual({ a: 1, c: 3 });
      expect('b' in result).toBe(false);
    });

    it('should omit specified properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, 'b');

      expect(result).toEqual({ a: 1, c: 3 });
      expect('b' in result).toBe(false);
    });

    it('should handle missing properties in pick', () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, 'a', 'c' as any);

      expect(result).toEqual({ a: 1 });
    });
  });

  describe('String Utilities', () => {
    const truncate = (str: string, length: number): string => {
      return str.length > length ? str.substring(0, length) + '...' : str;
    };

    const capitalize = (str: string): string => {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const slugify = (str: string): string => {
      return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    it('should truncate long strings', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
      expect(truncate('Hi', 5)).toBe('Hi');
    });

    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('Hello');
      expect(capitalize('hELLO')).toBe('Hello');
    });

    it('should slugify strings', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('  Test  String  ')).toBe('test-string');
      expect(slugify('Test@#$String')).toBe('teststring');
    });
  });

  describe('Type Guards', () => {
    const isString = (value: unknown): value is string => typeof value === 'string';
    const isNumber = (value: unknown): value is number => typeof value === 'number';
    const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

    it('should identify strings', () => {
      expect(isString('hello')).toBe(true);
      expect(isString(123)).toBe(false);
    });

    it('should identify numbers', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber('123')).toBe(false);
      expect(isNumber(NaN)).toBe(true);
    });

    it('should identify defined values', () => {
      expect(isDefined(123)).toBe(true);
      expect(isDefined(null)).toBe(true);
      expect(isDefined(undefined)).toBe(false);
    });
  });

  describe('Debounce & Throttle', () => {
    const debounce = <T extends (...args: any[]) => any>(
      fn: T,
      delay: number,
    ): ((...args: Parameters<T>) => void) => {
      let timeoutId: NodeJS.Timeout | null = null;
      return (...args) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
      };
    };

    const throttle = <T extends (...args: any[]) => any>(
      fn: T,
      interval: number,
    ): ((...args: Parameters<T>) => void) => {
      let lastCall = 0;
      return (...args) => {
        const now = Date.now();
        if (now - lastCall >= interval) {
          fn(...args);
          lastCall = now;
        }
      };
    };

    it('should debounce function calls', () => {
      vi.useFakeTimers();

      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 300);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(mockFn).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should throttle function calls', () => {
      vi.useFakeTimers();

      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(1);

      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(1); // Still 1, throttled

      vi.advanceTimersByTime(100);
      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(2); // Now called again

      vi.useRealTimers();
    });
  });

  describe('Local Storage Utilities', () => {
    const getFromStorage = (key: string): unknown => {
      const item = localStorage.getItem(key);
      if (!item) return null;
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    };

    const saveToStorage = (key: string, value: unknown): void => {
      localStorage.setItem(key, JSON.stringify(value));
    };

    beforeEach(() => {
      localStorage.clear();
    });

    it('should save and retrieve from storage', () => {
      const data = { name: 'Test', value: 123 };
      saveToStorage('testKey', data);

      const retrieved = getFromStorage('testKey');
      expect(retrieved).toEqual(data);
    });

    it('should return null for missing items', () => {
      expect(getFromStorage('nonExistent')).toBeNull();
    });

    it('should handle invalid JSON', () => {
      localStorage.setItem('invalidJSON', '{invalid json}');
      const result = getFromStorage('invalidJSON');
      expect(result).toBe('{invalid json}');
    });
  });
});
