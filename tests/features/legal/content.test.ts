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
  it('약관은 확정된 시행일·버전과 주요 조항을 갖는다', () => {
    expect(termsContent.title).toBe('서비스 이용약관');
    expect(termsContent.effectiveDate).toBe('2026-09-01');
    expect(termsContent.version).toBe('v1.2');

    const headings = termsContent.sections.map((section) => section.heading);

    for (const required of [
      '제1조 (목적)',
      '제3조 (운영자와 이용 자격)',
      '제6조 (게스트 데이터와 회원 전환)',
      '제8조 (이프 및 보상)',
      '제10조 (콘텐츠의 권리와 공개)',
      '제11조 (AI 생성 콘텐츠와 평가 데이터)',
      '제14조 (책임의 범위)',
      '제15조 (준거법 및 분쟁 해결)',
      '제16조 (문의처)',
    ]) {
      expect(headings).toContain(required);
    }
  });

  it('약관은 실제 운영 주체·대상·로그인·이프 정책을 고지한다', () => {
    const text = collectText(termsContent);

    expect(text).toContain('개인 운영자 강동우');
    expect(text).toContain('사업자 등록을 하지 않은');
    expect(text).toContain('만 14세 이상');
    expect(text).toContain('Google 또는 Kakao');
    expect(text).toContain('계정당 1회');
    expect(text).toContain('유상 구매 기능을 제공하지 않습니다');
    expect(text).toContain('부여일로부터 30일 후 만료');
    expect(text).not.toContain('{{');
  });

  it('약관은 콘텐츠 공개·AI 평가·책임 범위를 좁혀 고지한다', () => {
    const text = collectText(termsContent);

    expect(text).toContain(
      '브라우저에는 해당 콘텐츠를 다시 불러오기 위한 공개 식별자',
    );
    expect(text).toContain('검색 엔진에 노출될 수 있고');
    expect(text).toContain('평가 데이터 구성, 평가 지표 생성');
    expect(text).toContain('자체 AI 모델을 훈련하는 데에는 사용하지 않습니다');
    expect(text).toContain('식별 가능한 홍보 목적으로');
    expect(text).toContain('사전에 동의를 받습니다');
    expect(text).toContain('운영자의 고의 또는 중대한 과실');
    expect(text).not.toContain('손해를 배상할 책임이 없습니다');
  });

  it('개인정보 처리방침은 확정된 시행일·버전과 법정 항목을 갖는다', () => {
    expect(privacyContent.title).toBe('개인정보 처리방침');
    expect(privacyContent.effectiveDate).toBe('2026-09-01');
    expect(privacyContent.version).toBe('v1.3');

    const headings = privacyContent.sections.map((section) => section.heading);

    for (const required of [
      '1. 개인정보처리자와 적용 범위',
      '2. 처리하는 개인정보 항목과 수집 방법',
      '3. 개인정보의 처리 목적',
      '4. 개인정보의 처리 및 보유 기간',
      '5. 개인정보의 제3자 제공과 이용자 공개',
      '6. 개인정보 처리업무의 위탁',
      '7. 개인정보의 국외 이전',
      '8. 이용자의 권리와 행사 방법',
      '9. 개인정보의 파기 절차 및 방법',
      '10. 개인정보의 안전성 확보 조치',
      '11. 쿠키·브라우저 저장소와 앱 단말 저장',
      '12. 행태정보의 수집 및 맞춤형 광고',
      '13. AI 처리와 평가 데이터 활용',
      '14. 만 14세 미만 아동의 개인정보',
      '15. 자동화된 결정에 관한 사항',
      '16. 개인정보 보호책임자와 열람청구 접수',
      '17. 권익침해 구제기관',
      '18. 개인정보 처리방침의 변경',
    ]) {
      expect(headings).toContain(required);
    }

    expect(collectText(privacyContent)).not.toContain('{{');
  });

  it('개인정보 처리방침은 웹·Android의 실제 수집 항목과 저장 방식을 고지한다', () => {
    const text = collectText(privacyContent);

    expect(text).toContain('로그인 제공자(Google·Kakao)');
    expect(text).toContain(
      '소셜 프로필 이름과 사진은 회원 프로필로 저장하지 않습니다',
    );
    expect(text).toContain('Sentry가 표본 수집하는 오류 맥락');
    expect(text).toContain('마스킹된 화면 구조·클릭·스크롤');
    expect(text).toContain('Android Keystore로 암호화한 로그인 토큰');
    expect(text).toContain(
      '광고 ID, 연락처, 위치, 카메라·마이크 권한을 요청하지 않습니다',
    );
  });

  it('개인정보 처리방침은 삭제·피드백·로그·백업 보유기간을 구체적으로 고지한다', () => {
    const text = collectText(privacyContent);

    expect(text).toContain('삭제일부터 1년 후 관련 하위 콘텐츠와 함께 파기');
    expect(text).toContain(
      '제출일부터 1년 후 서비스 데이터베이스, Slack, Google Forms·Sheets에서 파기',
    );
    expect(text).toContain('OpenSearch에서 14일');
    expect(text).toContain('CloudWatch에서 30일');
    expect(text).toContain('최대 7일 동안 복구 제한 상태');
    expect(text).not.toContain('탈퇴 시 지체 없이 파기합니다');
  });

  it('개인정보 처리방침은 실제 수탁자와 국외 이전 항목을 고지한다', () => {
    const text = collectText(privacyContent);

    for (const processor of [
      'Amazon Web Services, Inc.',
      'Vercel, Inc.',
      'Cloudflare, Inc.',
      'OpenAI, L.L.C.',
      'Hangzhou DeepSeek Artificial Intelligence Co., Ltd.',
      'Langfuse GmbH',
      'Amplitude, Inc.',
      'Functional Software, Inc. (Sentry)',
      'Slack Technologies, LLC',
      'Google LLC (Google Forms·Sheets)',
    ]) {
      expect(text).toContain(processor);
    }

    expect(text).toContain('제28조의8제1항제3호');
    expect(text).toContain('일본 리전 저장');
    expect(text).toContain('기능 요청 시 API 전송');
    expect(text).toContain('기본 API 악용 방지 로그 최대 30일');
    expect(text).toContain('privacy@deepseek.com');
  });

  it('개인정보 처리방침은 AI 평가 활용과 외부 제공자 훈련 조건을 구분한다', () => {
    const text = collectText(privacyContent);

    expect(text).toContain('평가 데이터 구성, 평가 지표 생성');
    expect(text).toContain('자체 AI 모델을 훈련하지 않습니다');
    expect(text).toContain(
      'API 입력·출력은 기본적으로 OpenAI 모델 훈련에 사용되지 않습니다',
    );
    expect(text).toContain(
      'DeepSeek는 제공자 정책에 따라 입력을 모델 최적화·훈련에 사용할 수 있으며',
    );
    expect(text).toContain('AI 평가 활용 제외');
    expect(text).not.toContain('AI 모델의 학습·개선');
  });

  it('개인정보 처리방침은 Meta 픽셀과 이용자 통제 수단을 고지한다', () => {
    const text = collectText(privacyContent);

    expect(text).toContain('Meta Platforms, Inc.');
    expect(text).toContain('Meta 픽셀');
    expect(text).toContain('광고 성과 측정');
    expect(text).toContain('채팅 메시지나 스토리 자유입력 원문은');
    expect(text).toContain('서드 파티 쿠키·추적을 차단');
  });

  it('개인정보 처리방침은 연령 제한과 자동화된 결정 비적용을 고지한다', () => {
    const text = collectText(privacyContent);

    expect(text).toContain('서비스는 만 14세 이상만 이용할 수 있으며');
    expect(text).toContain(
      '만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다',
    );
    expect(text).toContain(
      '권리 또는 의무에 중대한 영향을 미치는 결정을 완전히 자동화하여 내리지 않습니다',
    );
  });

  it('모든 섹션은 최소 한 개의 콘텐츠 블록을 갖는다', () => {
    for (const doc of [termsContent, privacyContent]) {
      for (const section of doc.sections) {
        expect(section.blocks.length).toBeGreaterThan(0);
      }
    }
  });
});
