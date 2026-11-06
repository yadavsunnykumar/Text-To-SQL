import { toCsv } from './csv.util';

describe('toCsv', () => {
  it('writes a header row and data rows', () => {
    expect(toCsv(['id', 'name'], [[1, 'Ana'], [2, 'Raj']])).toBe('id,name\r\n1,Ana\r\n2,Raj');
  });

  it('quotes commas, quotes and newlines', () => {
    expect(toCsv(['v'], [['a,b'], ['say "hi"'], ['line1\nline2']])).toBe(
      'v\r\n"a,b"\r\n"say ""hi"""\r\n"line1\nline2"',
    );
  });

  it('writes nulls as empty cells', () => {
    expect(toCsv(['a', 'b'], [[null, false]])).toBe('a,b\r\n,false');
  });
});
