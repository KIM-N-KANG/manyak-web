'use client';

import { cn } from '@/lib/utils';

import { CREATE_STORY_MODE_ILLUSTRATION_COPY as COPY } from '../constants';
import {
  all,
  one,
  type Timeline,
  useIllustrationTimeline,
} from '../hooks/use-illustration-timeline';
import styles from './create-story-mode-illustrations.module.css';

// 마크업·루프는 시안(manyak-marketing/story-create-mode-dialog.html)을 그대로 옮긴다.
const PICKS = COPY.pickedGenres.map((genre) => COPY.genres.indexOf(genre));

/**
 * 스토리라인 탭 하나를 고르고 밑줄을 그 탭 아래로 옮긴다.
 *
 * @param sheet 간편 제작 앱 화면 시트
 * @param index 고를 탭 순서
 */
function selectTab(sheet: HTMLElement, index: number) {
  const tabs = one(sheet, styles.tabs);

  tabs
    .querySelectorAll('span')
    .forEach((tab, i) => tab.classList.toggle(styles.on, i === index));
  tabs.querySelectorAll('b').forEach((bar) => {
    bar.style.transform = `translateX(${index * 100}%)`;
  });
}

/**
 * 동작 줄이기 설정에서 간편 제작의 완성 상태를 그린다.
 *
 * @param sheet 간편 제작 앱 화면 시트
 */
function stillSimple(sheet: HTMLElement) {
  const chips = all(sheet, styles.chip);

  PICKS.forEach((i) => chips[i].classList.add(styles.on));
  sheet.classList.add(styles.picked);
  one(sheet, styles.indicator).children[1].classList.add(styles.on);
  selectTab(sheet, 0);

  const storyline = one(sheet, styles.storyline);

  storyline.textContent = COPY.storylines[0];
  storyline.classList.add(styles.shown);
}

/**
 * 간편 제작 루프(한 바퀴 약 11초). 키워드 세 개를 누르고 스토리라인 단계로 넘어가 두 번째 탭을 본다.
 *
 * @param sheet 간편 제작 앱 화면 시트
 * @param timeline 중단 가능한 대기 함수 묶음
 */
async function playSimple(sheet: HTMLElement, { wait, frame }: Timeline) {
  const chips = all(sheet, styles.chip);
  const steps = one(sheet, styles.indicator).children;
  const tabs = one(sheet, styles.tabs).querySelectorAll('span');
  const storyline = one(sheet, styles.storyline);
  const touch = one(sheet, styles.touch);

  // 터치 표시를 대상 요소 가운데로 옮긴다(시트 기준 좌표).
  const moveTo = (el: Element) => {
    const s = sheet.getBoundingClientRect();
    const r = el.getBoundingClientRect();

    touch.style.translate = `${r.left - s.left + r.width / 2}px ${r.top - s.top + r.height / 2}px`;
  };
  const tap = async (el: Element, onTap: () => void) => {
    moveTo(el);
    await wait(620);
    touch.classList.add(styles.down);
    el.classList.add(styles.press);
    await wait(130);
    onTap();
    touch.classList.remove(styles.down);
    el.classList.remove(styles.press);
  };
  // 스토리라인을 어절 단위로 나눠 순서대로 번지게 한다. 시안처럼 기다리지 않고 흘려보낸다.
  const writeStoryline = (text: string) => {
    storyline.classList.remove(styles.shown);
    storyline.replaceChildren(
      ...text.split(' ').flatMap((word, i) => {
        const span = document.createElement('span');

        span.className = styles.w;
        span.style.transitionDelay = `${i * 45}ms`;
        span.textContent = word;

        return i === 0 ? [span] : [' ', span];
      }),
    );
    frame().then(
      () => storyline.classList.add(styles.shown),
      () => {},
    );
  };

  for (;;) {
    touch.style.transition = 'none';
    moveTo(chips[PICKS[0]]);
    await frame();
    touch.style.transition = '';
    touch.classList.add(styles.show);

    for (const i of PICKS) {
      await tap(chips[i], () => chips[i].classList.add(styles.on));
    }

    await wait(450);
    touch.classList.remove(styles.show);
    // 키워드 단계가 빠르게 빠진 뒤 스토리라인 단계가 들어온다.
    sheet.classList.add(styles.picked);
    steps[1].classList.add(styles.on);
    await wait(300);
    writeStoryline(COPY.storylines[0]);
    await wait(2600);

    // 두 번째 탭을 눌러 다른 스토리라인을 본다.
    const tab2 = tabs[1];

    touch.style.transition = 'none';
    moveTo(tab2);
    await frame();
    touch.style.transition = '';
    touch.classList.add(styles.show);
    await wait(350);
    await tap(tab2, () => selectTab(sheet, 1));
    storyline.classList.add(styles.gone);
    await wait(200);
    storyline.classList.remove(styles.gone);
    writeStoryline(COPY.storylines[1]);
    await wait(300);
    touch.classList.remove(styles.show);
    await wait(2800);

    // 처음 상태로 조용히 되돌린다.
    sheet.classList.add(styles.rest);
    await wait(320);
    sheet.classList.add(styles.noAnim);
    sheet.classList.remove(styles.picked);
    steps[1].classList.remove(styles.on);
    chips.forEach((chip) => chip.classList.remove(styles.on));
    selectTab(sheet, 0);
    storyline.classList.remove(styles.shown);
    await frame();
    sheet.classList.remove(styles.noAnim, styles.rest);
    // 쉬는 박자는 되돌린 뒤에 두어 화면을 열면 바로 시작한다.
    await wait(500);
  }
}

export function SimpleCreateIllustration() {
  const ref = useIllustrationTimeline(playSimple, stillSimple);

  return (
    <div className={styles.art} aria-hidden="true">
      <div ref={ref} className={styles.sheet}>
        <span className={styles.touch} />
        <div className={styles.indicator}>
          <i className={styles.on} />
          <i />
          <i />
        </div>
        <div className={cn(styles.phase, styles.keywordPhase)}>
          <p className={styles.title}>
            {COPY.keywordTitleLines[0]}
            <br />
            {COPY.keywordTitleLines[1]}
          </p>
          <p className={styles.hint}>{COPY.genreLabel}</p>
          <div className={styles.chips}>
            {COPY.genres.map((genre) => (
              <span key={genre} className={styles.chip}>
                {genre}
              </span>
            ))}
          </div>
        </div>
        <div className={cn(styles.phase, styles.storylinePhase)}>
          <p className={styles.title}>
            {COPY.storylineTitleLines[0]}
            <br />
            {COPY.storylineTitleLines[1]}
          </p>
          <div className={styles.tabs}>
            {COPY.storylineTabs.map((tab, i) => (
              <span key={tab} className={i === 0 ? styles.on : undefined}>
                {tab}
              </span>
            ))}
            <b />
          </div>
          <p className={styles.storyline} />
        </div>
      </div>
    </div>
  );
}

/**
 * 사람이 치는 것처럼 글자 간격을 흔들고, 띄어쓰기와 쉼표에서 잠깐 멈춘다.
 *
 * @param ch 방금 입력한 글자
 * @returns 다음 글자까지 기다릴 시간(ms)
 */
function typeDelay(ch: string) {
  return (
    45 + Math.random() * 50 + (ch === ' ' ? 60 : 0) + (ch === ',' ? 220 : 0)
  );
}

/**
 * 동작 줄이기 설정에서 일반 제작의 완성 상태를 그린다.
 *
 * @param form 일반 제작 폼
 */
function stillGeneral(form: HTMLElement) {
  for (const f of all(form, styles.field)) {
    f.classList.remove(styles.empty);
    f.querySelectorAll<HTMLElement>('[data-text]').forEach((v) => {
      v.textContent = v.dataset.text ?? '';
    });
    all(f, styles.pop).forEach((p) => p.classList.add(styles.in));
  }
}

/**
 * 일반 제작 루프. 제목·한 줄 소개를 한 글자씩 입력하고 장르·인물을 하나씩 띄운 뒤 처음으로 돌아간다.
 *
 * @param form 일반 제작 폼
 * @param timeline 중단 가능한 대기 함수 묶음
 */
async function playGeneral(form: HTMLElement, { wait, frame }: Timeline) {
  const fields = all(form, styles.field);

  await wait(300); // 두 일러스트가 동시에 바뀌지 않도록 박자를 엇갈린다.

  for (;;) {
    for (const f of fields) {
      f.classList.add(styles.active);
      await wait(280);

      if (f.dataset.type === 'text') {
        const v = one(f, styles.val);

        f.classList.remove(styles.empty);
        v.classList.add(styles.caret, styles.typing);

        for (const ch of v.dataset.text ?? '') {
          v.textContent += ch;
          await wait(typeDelay(ch));
        }

        v.classList.remove(styles.typing);
        await wait(650);
        v.classList.remove(styles.caret);
      } else {
        for (const p of all(f, styles.pop)) {
          p.classList.add(styles.in);
          await wait(180);
        }

        await wait(450);
      }

      f.classList.remove(styles.active);
      await wait(120);
    }

    await wait(2800);
    form.classList.add(styles.rest);
    await wait(320);
    fields.forEach((f) => {
      if (f.dataset.type === 'text') {
        f.classList.add(styles.empty);
        one(f, styles.val).textContent = '';
      }

      all(f, styles.pop).forEach((p) => p.classList.remove(styles.in));
    });
    form.classList.add(styles.noAnim);
    await frame();
    form.classList.remove(styles.noAnim, styles.rest);
    await wait(700);
  }
}

export function GeneralCreateIllustration() {
  const ref = useIllustrationTimeline(playGeneral, stillGeneral);

  return (
    <div className={styles.art} aria-hidden="true">
      <div className={styles.sheet}>
        <div ref={ref} className={styles.form}>
          <div className={cn(styles.field, styles.empty)} data-type="text">
            <span className={styles.hint}>{COPY.titleLabel}</span>
            <span className={styles.box}>
              <span className={styles.val} data-text={COPY.title} />
            </span>
          </div>
          <div className={cn(styles.field, styles.empty)} data-type="text">
            <span className={styles.hint}>{COPY.introLabel}</span>
            <span className={styles.box}>
              <span className={styles.val} data-text={COPY.intro} />
            </span>
          </div>
          <div className={cn(styles.field, styles.select)} data-type="pop">
            <span className={styles.hint}>{COPY.genreLabel}</span>
            <div className={cn(styles.chips, styles.slot)}>
              {COPY.pickedGenres.map((genre) => (
                <span
                  key={genre}
                  className={cn(styles.chip, styles.on, styles.pop)}>
                  {genre}
                </span>
              ))}
            </div>
          </div>
          <div className={cn(styles.field, styles.select)} data-type="pop">
            <span className={styles.hint}>{COPY.charactersLabel}</span>
            <div className={cn(styles.people, styles.slot)}>
              {COPY.characters.map((character) => (
                <span
                  key={character.name}
                  className={cn(styles.person, styles.pop)}>
                  <span
                    className={cn(
                      styles.avatar,
                      character.isProtagonist && styles.me,
                    )}>
                    {character.avatar}
                  </span>
                  {character.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
