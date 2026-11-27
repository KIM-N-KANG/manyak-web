import { describe, expect, it } from 'vitest';

import { SITE_CONTACT_EMAIL } from '@/constants/site';
import { guestConsentSections } from '@/features/legal/content/guest-consent-content';
import { privacyContent } from '@/features/legal/content/privacy-content';
import { termsContent } from '@/features/legal/content/terms-content';
import type { LegalDocument } from '@/features/legal/types';
import { PUSH_CONSENT_NOTICE_COPY } from '@/features/my/_shared/constants/push-copy';

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
    expect(termsContent.effectiveDate).toBe('2026-12-25');
    expect(termsContent.version).toBe('v1.5');

    const headings = termsContent.sections.map((section) => section.heading);

    for (const required of [
      '제1조 (목적)',
      '제3조 (운영자와 이용 자격)',
      '제6조 (게스트 데이터와 회원 전환)',
      '제8조 (이프 및 보상)',
      '제8조의2 (유상 이프의 구매, 청약철회와 환불)',
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

    expect(text).toContain(
      '나그네랩(대표 강경현, 사업자등록번호 202-04-55303)이 운영합니다',
    );
    expect(text).not.toContain('사업자 등록을 하지 않은');
    expect(text).not.toContain('사이드 프로젝트');
    expect(text).toContain('만 14세 이상');
    expect(text).toContain('Google 또는 Kakao');
    expect(text).toContain('계정당 1회');
    expect(text).not.toContain('유상 구매 기능을 제공하지 않습니다');
    expect(text).toContain('부여일로부터 30일, 유상 이프는 적립일로부터 5년');
    expect(text).not.toContain('{{');
  });

  it('약관은 유상 이프의 구매, 청약철회, 환불과 미성년자 취소 조건을 고지한다', () => {
    const text = collectText(termsContent);

    expect(text).toContain(
      '"보상 이프"와 회원이 대금을 지급하고 구매하는 "유상 이프"',
    );
    expect(text).toContain(
      '그로블은 통신판매중개자이고 유상 이프의 판매자는 운영자',
    );
    expect(text).toContain('Android 앱에서는 유상 이프를 구매할 수 없습니다');
    expect(text).toContain('보너스 이프는 기본 이프와 함께 하나의 구매분');
    expect(text).toContain(
      '7일 이내이고 해당 구매분의 이프를 전혀 사용하지 않은 경우',
    );
    expect(text).toContain(
      '구매분의 이프를 일부라도 사용한 경우에는 청약을 철회할 수 없습니다',
    );
    expect(text).toContain('관련 법령에 따라 청약철회나 환불이 인정되는 경우');
    expect(text).toContain('적립일로부터 3개월 이내');
    expect(text).toContain('요청을 받은 날부터 3영업일 이내');
    expect(text).toContain('만 19세 미만 회원이 법정대리인의 동의 없이');
    expect(text).toContain('탈퇴 전에 환불을 요청해야 합니다');
    expect(text).toContain('보너스를 포함한 적립 총량으로 나눈 값');
    expect(text).toContain('종료 후 30일 이상 환불 요청을 받습니다');
    expect(text).toContain('잘못 낸 대금을 환급합니다');
    expect(text).toContain(
      '상품별 가격(원)과 적립되는 이프 수량은 구매 전에 이프 충전 화면에 표시',
    );
    expect(text).toContain('만료일이 가까운 것부터 사용됩니다');
    expect(text).toContain('알 수 있었던 날부터 30일 이내에 청약을 철회');
    expect(text).toContain(
      '결제일부터 7일(이프가 그보다 늦게 적립된 경우 적립일부터 7일)이 지났거나',
    );
    expect(text).not.toContain('제4항의 기간');
    expect(text).not.toContain('무료·시험적 서비스의 특성상');
  });

  it('약관은 개정 공지의 간주 동의와 시행 전 구매분의 경과 규정을 둔다', () => {
    const text = collectText(termsContent);

    expect(text).toContain('개정 전후 내용을 비교하여');
    expect(text).toContain(
      '회원에게는 서비스 화면의 알림 등으로 따로 알립니다',
    );
    expect(text).toContain('적용일 전날까지 거부 의사를 표시하지 않으면');
    expect(text).toContain('개정 약관에 동의한 것으로 봅니다');
    expect(text).toContain(
      '이 약관 시행 전에 구매한 유상 이프에도 이 약관을 적용합니다',
    );
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
    expect(privacyContent.effectiveDate).toBe('2026-12-04');
    expect(privacyContent.version).toBe('v1.12');

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
      '13. 광고성 정보의 수신 동의 (선택)',
      '14. AI 처리와 평가 데이터 활용',
      '15. 만 14세 미만 아동의 개인정보',
      '16. 자동화된 결정에 관한 사항',
      '17. 개인정보 보호책임자와 열람청구 접수',
      '18. 권익침해 구제기관',
      '19. 개인정보 처리방침의 변경',
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
    expect(text).toContain(
      'privacy@amplitude.com): 기기 식별자, 로그인한 경우 회원 공개 식별자',
    );
    expect(text).not.toContain('회원 공개 식별자 또는 기기 식별자 해시');
    expect(text).toContain('마스킹된 화면 구조·클릭·스크롤');
    expect(text).toContain('Android Keystore로 암호화한 로그인 토큰');
    expect(text).toContain(
      '광고 식별자(AAID) 외에 연락처, 위치, 카메라와 마이크 권한을 요청하지 않습니다',
    );
  });

  it('개인정보 처리방침은 앱 푸시와 광고성 정보 수신 동의를 별도로 고지한다', () => {
    const text = collectText(privacyContent);

    expect(text).toContain('푸시 등록 토큰');
    expect(text).toContain('광고성 정보 수신 동의 여부와 동의 일시');
    expect(text).toContain('명시적 사전 동의');
    expect(text).toContain('기기의 알림 권한 허용과 별개');
    expect(text).toContain('오후 9시부터 다음 날 오전 8시');
    expect(text).toContain('동의를 철회하거나 회원을 탈퇴할 때까지');
    expect(text).toContain('전송자, 의사 표시 일시, 처리 내용');
    expect(text).toContain('동의일부터 2년마다');
  });

  it('개인정보 처리방침은 웹 브라우저 푸시와 브라우저 저장 항목을 Android와 함께 고지한다', () => {
    const text = collectText(privacyContent);

    expect(text).toContain('알림 정보(Android 앱·웹 브라우저)');
    expect(text).toContain('웹 브라우저(홈 화면 설치본 포함)의 푸시 알림');
    expect(text).toContain('"[선택] 광고성 알림 수신 동의"');
    expect(text).toContain('앱·웹 화면에서 전송자, 의사 표시 일시, 처리 내용');
    expect(text).toContain('웹 푸시 등록 토큰');
    expect(text).toContain('앱·웹 로그아웃 시 해당 기기(브라우저)의 토큰');
    expect(text).not.toContain('알림 정보(Android 앱):');
  });

  it('개인정보 처리방침은 삭제·피드백·로그·백업 보유기간을 구체적으로 고지한다', () => {
    const text = collectText(privacyContent);

    expect(text).toContain('삭제일부터 1년 후 관련 하위 콘텐츠와 함께 파기');
    expect(text).toContain(
      '제출일부터 1년 후 서비스 데이터베이스, Slack, Google Forms·Sheets에서 파기',
    );
    expect(text).toContain('OpenSearch에서 14일 보관 후 삭제');
    expect(text).not.toContain('CloudWatch에서 30일');
    expect(text).toContain('최대 7일 동안 복구 제한 상태');
    expect(text).not.toContain('탈퇴 시 지체 없이 파기합니다');
  });

  it('개인정보 처리방침은 유상 이프 결제 정보와 거래기록 보존 기간을 고지한다', () => {
    const text = collectText(privacyContent);

    expect(text).not.toContain('유상 결제 기능이 없으므로');
    expect(text).toContain('유상 이프 구매 정보: 주문 공개 식별자');
    expect(text).toContain('판매자인 운영자에게 제공하는 휴대전화번호');
    expect(text).toContain('카드번호 등 결제수단 정보는 받지 않습니다');
    expect(text).toContain(
      '판매자가 수집하도록 설정한 경우의 주문자명과 이메일',
    );
    expect(text).toContain('Kakao 공유, 그로블 결제창, 외부 웹사이트');
    expect(text).toContain(
      '그로블의 판매 관리 화면에서 주문을 확인할 때 그로블로부터 제공받고',
    );
    expect(text).toContain('유상 이프의 결제 확인과 적립, 청약철회와 환불');
    expect(text).toContain('같은 법 시행령 제6조');
    expect(text).toContain('대금결제 및 재화 등의 공급에 관한 기록은 5년');
    expect(text).toContain('소비자의 불만 또는 분쟁처리에 관한 기록은 3년');
    expect(text).toContain(
      '회원 탈퇴 후에도 이 기간 동안 다른 정보와 분리하여 보관',
    );
    expect(text).toContain('주문 공개 식별자를 그로블 결제창 주소에 담아 전달');
    expect(text).toContain(
      '통신판매중개자로서 자체 개인정보 처리방침에 따라 결제 정보를 처리하므로 수탁자에 포함하지 않습니다',
    );
    expect(text).toContain(
      '보존해야 하는 거래기록은 다른 정보와 분리하여 제4항의 기간 동안 보관',
    );
  });

  it('개인정보 처리방침은 문의처 이메일 요청의 수집, 보관과 Gmail 국외 이전을 고지한다', () => {
    const text = collectText(privacyContent);

    expect(text).toContain(
      '이메일 문의와 요청 정보: 문의처 이메일로 권리 행사',
    );
    expect(text).toContain('이용자가 문의처로 이메일을 보낼 때 수집됩니다');
    expect(text).toContain(
      '청약철회와 환불 요청은 위 계약 또는 청약철회 등에 관한 기록으로 5년',
    );
    expect(text).toContain('처리 완료일부터 1년 보관한 후 Gmail에서 파기');
    expect(text).toContain(
      '확인을 마친 뒤 지체 없이 파기하고 처리 결과만 보관',
    );
    expect(text).toContain('문의처 이메일의 수신과 보관');
    expect(text).toContain(
      'Gmail 수신과 보관 / 이용자가 이메일을 보낼 때 전송',
    );
  });

  it('개인정보 처리방침은 실제 수탁자와 국외 이전 항목을 고지한다', () => {
    const text = collectText(privacyContent);

    for (const processor of [
      'Oracle Corporation (Oracle Cloud Infrastructure)',
      'Vercel, Inc.',
      'Cloudflare, Inc.',
      'OpenAI, L.L.C.',
      'Hangzhou DeepSeek Artificial Intelligence Co., Ltd.',
      'Langfuse GmbH',
      'Amplitude, Inc.',
      'Functional Software, Inc. (Sentry)',
      'Slack Technologies, LLC',
      'Google LLC (Google Forms·Sheets, Gmail)',
    ]) {
      expect(text).toContain(processor);
    }

    expect(text).toContain('제28조의8제1항제3호');
    expect(text).toContain('일본 리전 저장');
    expect(text).toContain('기능 요청 시 API 전송');
    expect(text).toContain('기본 API 악용 방지 로그 최대 30일');
    expect(text).toContain('privacy@deepseek.com');
  });

  it('개인정보 처리방침은 일본 오사카 리전의 서버와 R2 저장을 국외 이전으로 고지한다', () => {
    const text = collectText(privacyContent);

    expect(text).toContain(
      'Oracle Corporation (Oracle Cloud Infrastructure): 일본 오사카 리전의 서버',
    );
    expect(text).toContain(
      'Oracle Corporation (일본, oracle.com/kr/legal/privacy)',
    );
    expect(text).toContain('서비스 이용 시 네트워크 전송과 상시 저장');
    expect(text).toContain('이미지 파일과 데이터베이스 백업 저장, CDN 운영');
    expect(text).toContain('아시아 태평양 지역(R2 저장)');
    expect(text).toContain(
      '서비스 접속 시 네트워크 전송과 상시 저장, 이용자가 문의처로 이메일을 보낼 때 전송 / 네트워크 정보는',
    );
    expect(text).toContain(
      '이미지 파일은 제4항 보유기간 종료 시까지, 데이터베이스 백업은 최대 7일',
    );
    expect(text).toContain('서버와 데이터베이스 운영, 웹 호스팅');
    expect(text).not.toContain('회원 탈퇴 또는 제4항 보유기간');
    expect(text).toContain('Vercel, Inc. (일본(오사카 리전에서 처리), 미국');
    expect(text).not.toContain('Amazon Web Services');
    expect(text).not.toContain('한국 리전');
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

  it('개인정보 처리방침은 Android 앱 Meta SDK의 광고 식별자 수집과 거부 방법을 고지한다', () => {
    const text = collectText(privacyContent);

    expect(text).toContain('Android 앱에서는 Meta SDK');
    expect(text).toContain('광고 식별자(AAID), 앱 설치와 앱 실행 이벤트');
    expect(text).toContain(
      '앱에 포함된 Meta SDK가 암호화된 통신으로 Meta에 직접 전송',
    );
    expect(text).toContain(
      '설정 > Google > 광고에서 광고 ID를 삭제하거나 재설정',
    );
    expect(text).not.toContain('광고 ID 수집 SDK가 구현되어 있지 않습니다');
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

  it('게스트 동의 문서는 처리방침과 같은 애플리케이션 로그 보관 기간을 고지한다', () => {
    const text = collectText({
      ...privacyContent,
      sections: guestConsentSections,
    });

    expect(text).toContain('애플리케이션 로그는 OpenSearch에서 14일 보관해요');
    expect(text).not.toContain('CloudWatch');
  });

  it('약관은 운영자 변경 조항만 2026-12-04에 먼저 시행하고 기존 계약의 승계를 고지한다', () => {
    const text = collectText(termsContent);

    expect(text).toContain('나그네랩(대표 강경현, 이하 "운영자")');
    expect(text).toContain(
      '운영자를 나그네랩으로 바꾸는 제1조, 제3조와 제16조는 2026-12-04부터 시행',
    );
    expect(text).toContain('같은 날 나그네랩이 이어받습니다');
    expect(text).toContain('마이 화면 하단에서 확인할 수 있습니다');
  });

  it('개인정보 처리방침은 사업자 나그네랩을 처리자와 보호책임자로 고지하고 이전 거부 방법을 안내한다', () => {
    const text = collectText(privacyContent);

    expect(privacyContent.intro).toContain('나그네랩(대표 강경현');
    expect(text).toContain('개인정보처리자: 나그네랩(대표 강경현)');
    expect(text).toContain(
      '개인정보 보호책임자·열람청구 담당자: 강경현(나그네랩 대표)',
    );
    expect(text).toContain('전송자: 마냑 운영자 나그네랩');
    expect(text).toContain('같은 날 나그네랩으로 이전됩니다');
    expect(text).toContain('2026-12-03까지 마이 > 회원 탈퇴로 탈퇴하거나');
    expect(text).not.toContain('사업자 정보는 별도로');
    expect(text).not.toContain('개인 사이드 프로젝트');
  });

  it('법적 문서와 게스트 동의 문서의 문의처는 공식 문의 이메일과 같다', () => {
    const texts = [
      collectText(termsContent),
      collectText(privacyContent),
      collectText({ ...privacyContent, sections: guestConsentSections }),
    ];

    for (const text of texts) {
      expect(text).toContain(SITE_CONTACT_EMAIL);
      expect(text).not.toContain('manyak.help');
    }

    expect(collectText(privacyContent)).toContain(
      '문의처 이메일(contact@manyak.app)의 Gmail 전달',
    );
  });

  it('광고 동의 처리 결과 통지의 전송자는 처리방침 13항의 전송자와 같다', () => {
    expect(collectText(privacyContent)).toContain(
      `전송자: ${PUSH_CONSENT_NOTICE_COPY.sender}.`,
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
