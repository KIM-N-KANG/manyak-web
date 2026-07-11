// 이 파일의 next-auth/@auth/core 이중 증강 쌍(Session·JWT 각각 두 모듈 선언)은
// next-auth@5 beta의 선언 병합 버그 워크어라운드다. next-auth 또는 @auth/core
// 버전을 올릴 때는 두 쌍이 여전히 필요한지(단일 선언으로 타입이 반영되는지)
// 재검증할 것 — devDependency의 @auth/core 버전 핀도 함께 갱신해야 한다.
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
    inviteOnboardingPending: boolean;
  }
}

declare module '@auth/core/types' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
    inviteOnboardingPending: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    nickname?: string;
    profileImageUrl?: string | null;
    inviteOnboardingPending?: boolean;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string;
    nickname?: string;
    profileImageUrl?: string | null;
    inviteOnboardingPending?: boolean;
  }
}
