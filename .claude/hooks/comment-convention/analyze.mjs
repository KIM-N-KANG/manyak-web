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
