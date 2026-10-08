import { describe, expect, it } from 'vitest';

import { GENERAL_STORY_REGISTER_ERROR_COPY } from '@/features/studio/general/constants';
import {
  type GeneralStoryRegisterForm,
  getRegisterErrors,
  REGISTER_ERROR_KEY,
} from '@/features/studio/general/utils/register-validation';

const validForm = (): GeneralStoryRegisterForm => ({
  texts: {
    title: '노선도에 없는 역',
    oneLineIntro: '막차에서 내린 곳은 존재하지 않는 역이었다',
    world: '유실역은 막차가 끊긴 뒤에만 불이 켜진다.',
    progression: '역무실, 보관소, 개찰구 순서로 탐색한다.',
  },
  protagonist: {
    name: '윤해솔',
    gender: 'FEMALE',
    feature: '막차에서 잘못 내린 회사원',
  },
  supporting: [
    { id: 's1', name: '도하람', gender: 'MALE', description: '', feature: '' },
  ],
  startSettings: [
    {
      id: 'st1',
      name: '불 꺼진 승강장',
      prologue: '막차 문이 닫히는 소리에 잠에서 깼다.',
      situation: '승강장 끝 창구에만 불이 켜져 있다.',
      suggestedInputs: ['여기가 어디예요?', '출구를 찾는다', '전화를 건다'],
      endings: [
        {
          id: 'e1',
          name: '첫차',
          minTurns: '10',
          condition: '첫차에 오른다',
          epilogue: '새벽빛 속에서 마무리한다',
        },
      ],
    },
  ],
  mainEvents: [
    {
      id: 'm1',
      name: '도하람의 장부',
      description: '장부에 기억의 주인이 적혀 있다',
      keySentence: '주인공이 장부를 보여 달라고 한다',
    },
  ],
  genreCount: 1,
  description: '',
});

const messages = (form: GeneralStoryRegisterForm) =>
  Object.fromEntries(
    getRegisterErrors(form).map(({ key, message }) => [key, message]),
  );

describe('getRegisterErrors', () => {
  it('필수 칸이 모두 2자 이상이고 장르가 있으면 오류가 없다', () => {
    expect(getRegisterErrors(validForm())).toEqual([]);
  });

  it('빈 필수 칸은 칸 이름과 받침에 맞는 조사로 입력을 요청한다', () => {
    const form = validForm();

    form.texts.title = ' ';
    form.startSettings[0].prologue = '';
    form.startSettings[0].endings[0].minTurns = '';
    form.startSettings[0].suggestedInputs[0] = '';

    expect(messages(form)).toEqual({
      [REGISTER_ERROR_KEY.text('title')]: '제목을 입력해 주세요',
      [REGISTER_ERROR_KEY.start('st1', 'prologue')]: '프롤로그를 입력해 주세요',
      [REGISTER_ERROR_KEY.suggested('st1', 0)]:
        GENERAL_STORY_REGISTER_ERROR_COPY.suggestedInput,
      [REGISTER_ERROR_KEY.ending('e1', 'minTurns')]:
        '최소 턴 수를 입력해 주세요',
    });
  });

  it('한 글자면 최소 글자 수 오류, 이름이 겹치면 중복 오류를 낸다', () => {
    const form = validForm();

    form.startSettings[0].suggestedInputs[2] = '역';
    form.supporting[0].name = '윤해솔';

    expect(messages(form)).toEqual({
      [REGISTER_ERROR_KEY.suggested('st1', 2)]:
        '추천 입력은 2자 이상 입력해 주세요',
      [REGISTER_ERROR_KEY.supporting('s1', 'name')]: '이미 사용한 이름이에요',
    });
  });

  it('주인공 이름은 비워도 되지만 글에 {username}을 쓰면 이름을 요청한다', () => {
    const form = validForm();

    form.protagonist.name = ' ';
    expect(getRegisterErrors(form)).toEqual([]);

    form.startSettings[0].prologue = '{username}이(가) 잠에서 깼다.';
    expect(messages(form)).toEqual({
      [REGISTER_ERROR_KEY.protagonist('name')]:
        GENERAL_STORY_REGISTER_ERROR_COPY.protagonistNameForToken,
    });

    form.protagonist.name = '해';
    expect(getRegisterErrors(form)).toEqual([]);
  });

  it('선택 칸은 비워도 되지만 쓰면 2자 이상이어야 한다', () => {
    const form = validForm();

    form.description = '역';
    form.supporting[0].description = '역';
    form.supporting[0].feature = '역';

    expect(Object.keys(messages(form))).toEqual([
      REGISTER_ERROR_KEY.supporting('s1', 'description'),
      REGISTER_ERROR_KEY.supporting('s1', 'feature'),
      REGISTER_ERROR_KEY.description,
    ]);
  });

  it('성별과 장르가 없으면 선택을 요청하고, 오류는 탭 순서대로 탭·접는 항목과 함께 돌려준다', () => {
    const form = validForm();

    form.genreCount = 0;
    form.supporting[0].gender = null;
    form.mainEvents[0].keySentence = '';

    expect(getRegisterErrors(form)).toEqual([
      {
        key: REGISTER_ERROR_KEY.supporting('s1', 'gender'),
        tab: 'supporting',
        message: GENERAL_STORY_REGISTER_ERROR_COPY.gender,
        collapsibleId: 'general-story-supporting-s1',
      },
      {
        key: REGISTER_ERROR_KEY.event('m1', 'keySentence'),
        tab: 'event',
        message: '키 문장을 입력해 주세요',
        collapsibleId: 'general-story-event-m1',
      },
      {
        key: REGISTER_ERROR_KEY.genre,
        tab: 'publish',
        message: GENERAL_STORY_REGISTER_ERROR_COPY.genre,
      },
    ]);
  });

  it('엔딩 오류는 시작 상황과 엔딩 항목을 함께 알려 준다', () => {
    const form = validForm();

    form.startSettings[0].endings[0].epilogue = '';

    expect(getRegisterErrors(form)).toEqual([
      {
        key: REGISTER_ERROR_KEY.ending('e1', 'epilogue'),
        tab: 'start',
        message: '에필로그를 입력해 주세요',
        startSettingId: 'st1',
        collapsibleId: 'general-story-ending-e1',
      },
    ]);
  });
});
