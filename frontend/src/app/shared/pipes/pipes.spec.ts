import { CellValuePipe } from './cell-value.pipe';
import { DurationPipe } from './duration.pipe';
import { SqlHighlightPipe } from './sql-highlight.pipe';

describe('DurationPipe', () => {
  const pipe = new DurationPipe();

  it('formats milliseconds and seconds', () => {
    expect(pipe.transform(849.6)).toBe('850 ms');
    expect(pipe.transform(1234)).toBe('1.23 s');
  });

  it('handles missing values', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
  });
});

describe('CellValuePipe', () => {
  const pipe = new CellValuePipe();

  it('formats nulls, booleans, integers and floats', () => {
    expect(pipe.transform(null)).toBe('NULL');
    expect(pipe.transform(true)).toBe('true');
    expect(pipe.transform(42)).toBe('42');
    expect(pipe.transform(3.14159265)).toBe('3.1416');
    expect(pipe.transform('text')).toBe('text');
  });
});

describe('SqlHighlightPipe', () => {
  const pipe = new SqlHighlightPipe();

  it('wraps keywords, strings and numbers', () => {
    const html = pipe.transform("select * from t where a = 'b' limit 5");
    expect(html).toContain('<span class="kw">SELECT</span>');
    expect(html).toContain('<span class="kw">LIMIT</span>');
    expect(html).toContain(`<span class="str">'b'</span>`);
    expect(html).toContain('<span class="num">5</span>');
  });

  it('escapes HTML so query text cannot inject markup', () => {
    const html = pipe.transform("SELECT '<img src=x onerror=alert(1)>'");
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('does not highlight keywords inside identifiers', () => {
    expect(pipe.transform('SELECT selected_at FROM t')).toContain('selected_at');
    expect(pipe.transform('SELECT selected_at FROM t')).not.toContain('<span class="kw">SELECT</span>ed_at');
  });

  it('returns an empty string for empty input', () => {
    expect(pipe.transform(null)).toBe('');
  });
});
