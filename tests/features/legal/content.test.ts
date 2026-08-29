import { describe, expect, it } from 'vitest';

import { privacyContent } from '@/features/legal/content/privacy-content';
import { termsContent } from '@/features/legal/content/terms-content';
import type { LegalDocument } from '@/features/legal/types';

function collectText(doc: LegalDocument): string {
  return doc.sections
    .flatMap((section) => [
      section.heading,
      ...section.blocks.flatMap((block) =>
        block.type === 'paragraph' ? [block.text] : block.items,
      ),
    ])
    .join('\n');
}

describe('법적 문서 콘텐츠', () => {
  it('약관은 제목·시행일·버전과 필수 조항을 갖는다', () => {
    expect(termsContent.title).toBe('서비스 이용약관');
    expect(termsContent.effectiveDate).not.toHaveLength(0);
    expect(termsContent.version).not.toHaveLength(0);

    const text = collectText(termsContent);
    const headings = termsContent.sections.map((section) => section.heading);

    for (const required of [
      '제1조 (목적)',
      '제2조 (정의)',
      '제5조 (게스트 데이터의 이관)',
      '제7조 (크레딧 및 보상)',
      '제11조 (면책조항)',
      '제12조 (준거법 및 관할)',
    ]) {
      expect(headings).toContain(required);
    }

    // 이관 1회 제한이 약관 본문에 명시돼야 한다.
    expect(text).toContain('계정당 1회');
    // 최종본이므로 placeholder가 남아 있으면 안 된다.
    expect(text).not.toContain('{{');
  });

  it('약관은 게스트 데이터·콘텐츠 이용·면책 범위를 좁혀 고지한다', () => {
    const text = collectText(termsContent);

    expect(text).toContain(
      '브라우저에는 해당 콘텐츠를 다시 불러오기 위한 식별자',
    );
    expect(text).not.toContain('기기(브라우저)에만 저장');
    expect(text).toContain('홍보·마케팅 목적으로');
    expect(text).toContain('별도 동의');
    expect(text).not.toContain('서비스 운영·개선 및 홍보 목적');
    expect(text).not.toContain('손해를 배상할 책임이 없습니다');
    expect(text).toContain('회사의 고의 또는 중대한 과실');
  });

  it('개인정보 처리방침은 제목·시행일·버전과 필수 항목을 갖는다', () => {
    expect(privacyContent.title).toBe('개인정보 처리방침');
    expect(privacyContent.effectiveDate).not.toHaveLength(0);
    expect(privacyContent.version).not.toHaveLength(0);

    const text = collectText(privacyContent);
    const headings = privacyContent.sections.map((section) => section.heading);

    for (const required of [
      '1. 수집하는 개인정보 항목',
      '3. 개인정보의 이용 목적',
      '4. 개인정보의 보유 및 이용 기간',
      '7. 개인정보의 국외 이전',
      '12. 행태정보의 수집 및 맞춤형 광고',
      '13. AI 품질 관리 및 학습 데이터 활용',
      '14. 개인정보 보호책임자 및 문의처',
    ]) {
      expect(headings).toContain(required);
    }

    expect(text).not.toContain('{{');
  });

  it('개인정보 처리방침은 보유·파기와 쿠키·분석 도구를 구체적으로 고지한다', () => {
    const text = collectText(privacyContent);

    expect(text).toContain('분리 보관한 뒤 파기합니다');
    expect(text).toContain('서비스 화면과 목록에서 제외');
    expect(text).toContain('페이지 조회, 세션 정보, 유입 경로');
    expect(text).toContain(
      '채팅 메시지·피드백 원문은 행태 분석 도구(Amplitude)에 수집하지 않습니다',
    );
    expect(text).not.toContain('탈퇴 시 지체 없이 파기합니다');
  });

  it('개인정보 처리방침은 AI 품질 관리·학습 데이터 활용을 고지한다', () => {
    const text = collectText(privacyContent);

    // 수탁·국외 이전 상대방과 저장 위치가 명시돼야 한다.
    expect(text).toContain('Langfuse GmbH');
    expect(text).toContain('데이터 저장: 일본');
    // 저장 항목과 이용 방법(학습 활용)이 고지돼야 한다.
    expect(text).toContain('스토리 설정·채팅 메시지');
    expect(text).toContain('AI 모델의 학습·개선');
    // 보유 기간은 확정값이어야 하고 무기한 표현이 남으면 안 된다.
    expect(text).toContain('수집일로부터 1년');
    expect(text).not.toContain('무기한');
    // 이용자 통제 수단(학습 제외·삭제 요청)이 고지돼야 한다.
    expect(text).toContain('학습 활용에서 제외하거나 삭제');
  });

  it('개인정보 처리방침은 Meta 픽셀 행태정보 수집을 고지한다', () => {
    const text = collectText(privacyContent);

    // 광고 사업자 명칭과 국외 이전 대상에 Meta가 명시돼야 한다.
    expect(text).toContain('Meta Platforms, Inc.');
    // 수집 도구(픽셀)와 수집 목적이 고지돼야 한다.
    expect(text).toContain('Meta 픽셀');
    expect(text).toContain('광고 성과 측정');
    // 입력 원문 제외 원칙은 행태정보에도 유지돼야 한다.
    expect(text).toContain('이용자가 입력한 원문 제외');
    // 이용자 통제 수단이 고지돼야 한다.
    expect(text).toContain('맞춤형 광고를 차단');
  });

  it('모든 섹션은 최소 한 개의 콘텐츠 블록을 갖는다', () => {
    for (const doc of [termsContent, privacyContent]) {
      for (const section of doc.sections) {
        expect(section.blocks.length).toBeGreaterThan(0);
      }
    }
  });
});
