import ts from 'typescript';

const DIRECTIVE_RE =
  /^(eslint-disable|eslint-enable|@ts-expect-error|@ts-ignore|@ts-nocheck|biome-ignore)/;

/**
 * 훅 검사 대상 파일인지 판별한다.
 *
 * @param {string} fileName 절대 또는 상대 파일 경로
 * @returns {boolean} src 아래 .ts/.tsx 이면서 생성/테스트 코드가 아니면 true
 */
export function shouldCheckFile(fileName) {
  const norm = fileName.replace(/\\/g, '/');

  if (!/\.(ts|tsx)$/.test(norm)) return false;

  if (!norm.includes('/src/')) return false;

  if (norm.includes('/src/api/generated/')) return false;

  if (/\.(test|spec)\.tsx?$/.test(norm)) return false;

  if (norm.includes('/tests/') || norm.includes('/e2e/')) return false;

  return true;
}

function stripComment(text) {
  return text
    .replace(/^\/\/+/, '')
    .replace(/^\/\*+/, '')
    .replace(/\*+\/$/, '')
    .trim();
}

function isDirective(text) {
  return DIRECTIVE_RE.test(stripComment(text));
}

function isOwnLine(sourceText, pos) {
  let i = pos - 1;

  while (i >= 0 && sourceText[i] !== '\n') {
    const ch = sourceText[i];

    if (ch !== ' ' && ch !== '\t' && ch !== '\r') return false;

    i -= 1;
  }

  return true;
}

function isAdjacent(sourceText, commentEnd, nodeStart) {
  const gap = sourceText.slice(commentEnd, nodeStart);

  if (!/^\s*$/.test(gap)) return false;

  return (gap.match(/\n/g) || []).length <= 1;
}

function lineOf(sf, pos) {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}

function callName(expr) {
  if (ts.isIdentifier(expr)) return expr.text;

  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;

  return '';
}

function isComponentWrapperCall(node) {
  if (!ts.isCallExpression(node)) return false;

  const n = callName(node.expression);

  return n === 'forwardRef' || n === 'memo';
}

function isFunctionLike(node) {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}

function collectDeclarations(stmt) {
  const out = [];

  if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.body) {
    out.push({
      name: stmt.name.text,
      fnNode: stmt,
      commentNode: stmt,
      wrapper: false,
    });
  } else if (ts.isVariableStatement(stmt)) {
    for (const d of stmt.declarationList.declarations) {
      if (!d.name || !ts.isIdentifier(d.name) || !d.initializer) continue;

      const init = d.initializer;

      if (isFunctionLike(init)) {
        out.push({
          name: d.name.text,
          fnNode: init,
          commentNode: stmt,
          wrapper: false,
        });
      } else if (isComponentWrapperCall(init)) {
        out.push({
          name: d.name.text,
          fnNode: null,
          commentNode: stmt,
          wrapper: true,
        });
      }
    }
  }

  return out;
}

function containsJsx(node) {
  let found = false;
  const visit = (n) => {
    if (found) return;

    if (
      ts.isJsxElement(n) ||
      ts.isJsxSelfClosingElement(n) ||
      ts.isJsxFragment(n)
    ) {
      found = true;

      return;
    }

    if (isFunctionLike(n) || ts.isFunctionDeclaration(n)) return;

    ts.forEachChild(n, visit);
  };

  visit(node);

  return found;
}

function returnsJsx(fn) {
  const body = fn.body;

  if (!body) return false;

  if (!ts.isBlock(body)) return containsJsx(body);

  let found = false;
  const visit = (n) => {
    if (found) return;

    if (isFunctionLike(n) || ts.isFunctionDeclaration(n)) return;

    if (ts.isReturnStatement(n) && n.expression && containsJsx(n.expression)) {
      found = true;

      return;
    }

    ts.forEachChild(n, visit);
  };

  ts.forEachChild(body, visit);

  return found;
}

function classify(decl) {
  if (decl.wrapper) return 'component';

  const fn = decl.fnNode;

  if (!fn) return 'other';

  if (returnsJsx(fn)) return 'component';

  if (/^[A-Z]/.test(decl.name)) return 'component';

  if (/^use[A-Z]/.test(decl.name)) return 'hook';

  return 'util';
}

function leadingComments(node, sourceText) {
  return ts.getLeadingCommentRanges(sourceText, node.getFullStart()) || [];
}

function innerComments(node, sourceText, sf) {
  const start = node.getStart(sf);
  const end = node.getEnd();
  const seen = new Map();
  const collect = (ranges) => {
    for (const r of ranges || []) {
      if (r.pos > start && r.end < end) seen.set(r.pos, r);
    }
  };
  const visit = (n) => {
    collect(ts.getLeadingCommentRanges(sourceText, n.getFullStart()));
    collect(ts.getTrailingCommentRanges(sourceText, n.getEnd()));
    ts.forEachChild(n, visit);
  };

  ts.forEachChild(node, visit);

  return [...seen.values()];
}

function checkComponent(decl, sourceText, sf, violations) {
  const node = decl.commentNode;
  const nodeStart = node.getStart(sf);
  const leads = leadingComments(node, sourceText);
  let nextStart = nodeStart;

  for (let idx = leads.length - 1; idx >= 0; idx -= 1) {
    const r = leads[idx];

    if (
      !isOwnLine(sourceText, r.pos) ||
      !isAdjacent(sourceText, r.end, nextStart)
    )
      break;

    const text = sourceText.slice(r.pos, r.end);

    if (!isDirective(text)) {
      violations.push({
        line: lineOf(sf, r.pos),
        kind: 'component-comment',
        name: decl.name,
        message: `컴포넌트 \`${decl.name}\` 위의 설명 주석을 제거하세요 (도구 지시자 외 주석 금지).`,
      });
    }

    nextStart = r.pos;
  }

  for (const r of innerComments(node, sourceText, sf)) {
    const text = sourceText.slice(r.pos, r.end);

    if (isDirective(text)) continue;

    violations.push({
      line: lineOf(sf, r.pos),
      kind: 'component-comment',
      name: decl.name,
      message: `컴포넌트 \`${decl.name}\` 내부의 주석을 제거하세요 (도구 지시자 외 주석 금지).`,
    });
  }
}

/**
 * 소스 텍스트를 AST 파싱해 주석 컨벤션 위반 목록을 반환한다.
 *
 * @param {string} sourceText 검사할 소스 코드 전체
 * @param {string} fileName 파일명 (확장자로 TS/TSX 판별에 사용)
 * @returns {Array<{ line: number, kind: string, name: string, message: string }>} 라인 오름차순 위반 목록
 */
export function analyzeSource(sourceText, fileName) {
  const isTsx = /\.tsx$/.test(fileName);
  const sf = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations = [];

  for (const stmt of sf.statements) {
    for (const decl of collectDeclarations(stmt)) {
      const kind = classify(decl);

      if (kind === 'component')
        checkComponent(decl, sourceText, sf, violations);
    }
  }

  return violations.sort((a, b) => a.line - b.line);
}
