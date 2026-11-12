import { describe, expect, it } from 'vitest';
import { createSeedState } from '../store/seed';
import { matchesQuery, parseQuery } from './query';

const TODAY = '2026-03-10';
const { projects, tasks } = createSeedState(TODAY);
const ctx = { today: TODAY, projects, allTasks: tasks };

function search(input: string): string[] {
  const query = parseQuery(input);
  return tasks.filter((t) => matchesQuery(t, query, ctx)).map((t) => t.id);
}

describe('parseQuery', () => {
  it('parses fields, aliases, negation and quoted phrases', () => {
    expect(parseQuery('p:hi -tag:design "pricing page" #bug').clauses).toEqual([
      { field: 'priority', value: 'high', negate: false },
      { field: 'tag', value: 'design', negate: true },
      { field: 'text', value: 'pricing page', negate: false },
      { field: 'tag', value: 'bug', negate: false },
    ]);
  });

  it('parses due expressions', () => {
    expect(parseQuery('due:<=7d due:>2026-03-01 due:none').clauses.map((c) => c.value)).toEqual([
      { kind: 'relative', op: '<=', days: 7 },
      { kind: 'compare', op: '>', date: '2026-03-01' },
      { kind: 'keyword', keyword: 'none' },
    ]);
  });

  it('reports invalid values and treats unknown prefixes as text', () => {
    const parsed = parseQuery('priority:urgent re:launch');
    expect(parsed.errors).toEqual(['Unknown priority value "urgent"']);
    expect(parsed.clauses).toEqual([{ field: 'text', value: 're:launch', negate: false }]);
  });
});

describe('matchesQuery', () => {
  it('matches free text across title, description, tags and checklist', () => {
    expect(search('apple')).toEqual(['t5']);
    expect(search('moodboard')).toEqual(['t2']);
  });

  it('combines terms with AND', () => {
    expect(search('priority:high status:todo')).toEqual(['t7']);
    expect(search('#infra -is:done')).toEqual(['t10', 't11']);
  });

  it('supports is: flags', () => {
    expect(search('is:overdue')).toEqual(['t7']);
    expect(search('is:blocked')).toEqual(['t8']);
    expect(search('is:recurring')).toEqual(['t11']);
    expect(search('is:unscheduled')).toEqual(['t4']);
    expect(search('is:subtasks')).toEqual(['t2', 't5']);
  });

  it('filters by project name', () => {
    expect(search('project:mobile priority:high')).toEqual(['t5', 't7']);
    expect(search('project:"website redesign" status:done')).toEqual(['t1']);
  });

  it('filters by due date', () => {
    expect(search('due:today')).toEqual(['t10']);
    expect(search('due:tomorrow')).toEqual(['t5']);
    expect(search('due:<0d')).toEqual(['t1', 't7', 't9']);
    expect(search('due:>=14d')).toEqual(['t8', 't11']);
    expect(search(`due:${TODAY}`)).toEqual(['t10']);
  });

  it('ignores invalid terms instead of hiding everything', () => {
    expect(search('priority:urgent')).toHaveLength(tasks.length);
  });
});
