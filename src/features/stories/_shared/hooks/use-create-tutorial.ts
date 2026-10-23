'use client';

import { useEffect, useState } from 'react';

import { useSession } from 'next-auth/react';

import { track } from '@/observability/analytics';

import {
  CREATE_TUTORIAL_DONE,
  type CreateTutorialStage,
} from '../constants/create-tutorial';
import {
  type CreateTutorialScreen,
  getNextCreateTutorialStage,
  markCreateTutorialStage,
  readNextCreateTutorialStage,
  resolveCreateTutorialStage,
} from '../utils/create-tutorial-storage';

/** 화면이 준비된 뒤 여는 지연(ms)이다. 채팅 첫 진입 안내와 같다. */
const AUTO_OPEN_DELAY_MS = 200;

/**
 * 간편 제작 첫 진입 안내의 열림 상태를 관리하는 훅. 화면이 안내를 받을 수 있는 상태가 되면 다음 단계를 열고,
 * 버튼이나 뒤로가기로 닫을 때 마친 단계를 기록한다. 열기만 하고 떠나면 다음 진입에 같은 단계를 다시 보인다.
 * 신규 가입 초대 코드 시트가 남아 있는 동안은 겹치지 않게 열지 않는다.
 *
 * @param screen 지금 화면이 안내를 받을 수 있는 상태(없으면 null)
 * @returns 열린 단계와 주 버튼, 보조 버튼 핸들러
 */
export function useCreateTutorial(screen: CreateTutorialScreen | null) {
  const { data: session } = useSession();
  const [next, setNext] = useState(readNextCreateTutorialStage);
  const [stage, setStage] = useState<CreateTutorialStage | null>(null);
  const isBlocked = session?.inviteOnboardingPending === true;
  const ready = isBlocked ? null : resolveCreateTutorialStage(next, screen);

  useEffect(() => {
    if (stage !== null || ready === null) return;

    const timer = setTimeout(() => {
      track('client_storyCreate_tutorialStep_viewed', { stage: ready });
      setStage(ready);
    }, AUTO_OPEN_DELAY_MS);

    return () => clearTimeout(timer);
  }, [ready, stage]);

  const finish = (value: CreateTutorialStage | typeof CREATE_TUTORIAL_DONE) => {
    markCreateTutorialStage(value);
    setNext(
      value === CREATE_TUTORIAL_DONE ? null : getNextCreateTutorialStage(value),
    );
    setStage(null);
  };

  const handlePrimary = () => {
    if (stage === null) return;

    // 시작하기는 대화창을 닫지 않고 키워드 안내로 이어 간다.
    if (stage === 'intro') {
      markCreateTutorialStage('intro');
      setNext('keyword');
      track('client_storyCreate_tutorialStep_viewed', { stage: 'keyword' });
      setStage('keyword');

      return;
    }

    if (stage === 'completing') {
      track('client_storyCreate_tutorial_completed', { action: 'originals' });
      finish(CREATE_TUTORIAL_DONE);

      return;
    }

    finish(stage);
  };

  const handleSecondary = () => {
    if (stage === 'intro') {
      track('client_storyCreate_tutorialSkipButton_clicked', { stage });
      finish(CREATE_TUTORIAL_DONE);
    } else if (stage === 'completing') {
      track('client_storyCreate_tutorial_completed', { action: 'close' });
      finish(CREATE_TUTORIAL_DONE);
    }
  };

  return { stage, handlePrimary, handleSecondary };
}
