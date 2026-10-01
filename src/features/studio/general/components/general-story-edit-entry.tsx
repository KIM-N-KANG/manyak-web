'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useGetSimpleStoryTags } from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import { useGetEditForm } from '@/api/generated/endpoints/stories/stories';
import type {
  SimpleStoryTagListItemResponse,
  StoryEditFormResponse,
} from '@/api/generated/models';
import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { buildLoginUrl } from '@/features/auth/_shared/utils/login-callback-url';
import { GENERAL_STORY_CREATE_COPY } from '@/features/studio/general/constants';
import { readStoryEdit } from '@/features/studio/general/utils/edit-form';

import { GeneralStoryCreateForm } from './general-story-create-screen';

type GeneralStoryEditEntryProps = {
  storyId: string;
};

export function GeneralStoryEditEntry({ storyId }: GeneralStoryEditEntryProps) {
  const { isMember, isGuest } = useMemberAccess();
  const router = useRouter();

  // 수정은 회원 소유자만 할 수 있어 게스트는 로그인 화면으로 보내고, 로그인하면 수정 화면으로 돌아온다.
  useEffect(() => {
    if (isGuest) router.replace(buildLoginUrl(APP_PATH.STORY_EDIT(storyId)));
  }, [isGuest, router, storyId]);

  if (isMember) {
    return <EditFormLoader storyId={storyId} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageLoadingSpinner aria-label={GENERAL_STORY_CREATE_COPY.checking} />
    </div>
  );
}

function EditFormLoader({ storyId }: GeneralStoryEditEntryProps) {
  const router = useRouter();
  const query = useGetEditForm(storyId, {
    query: { refetchOnMount: 'always', retry: false },
  });
  const tags = useGetSimpleStoryTags();
  const data = query.data?.status === 200 ? query.data.data : null;
  const failed = query.isError || (query.isSuccess && !data);

  // 내 스토리가 아니거나(403) 없으면(404) 폼을 열지 않고 상세로 돌려보낸다.
  useEffect(() => {
    if (!failed) return;

    toast(TOAST_MESSAGE.STORY_SUBMISSION_LOAD_FAILED);
    router.replace(APP_PATH.STORY_DETAIL(storyId));
  }, [failed, router, storyId]);

  // 폼은 처음 값으로 굳으므로 캐시가 아니라 이번에 새로 받은 수정 폼으로만 연다(반려·검토 중 상태가 바뀌었을 수 있음).
  // 장르 이름을 제공 장르로 되돌리도록 장르 목록도 기다린다. 받지 못하면 모두 직접 추가한 장르로 둔다.
  if (data && query.isFetchedAfterMount && !tags.isPending) {
    return (
      <EditForm
        storyId={storyId}
        data={data}
        tags={tags.data?.status === 200 ? tags.data.data : []}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageLoadingSpinner aria-label={GENERAL_STORY_CREATE_COPY.loading} />
    </div>
  );
}

type EditFormProps = {
  storyId: string;
  data: StoryEditFormResponse;
  tags: SimpleStoryTagListItemResponse[];
};

function EditForm({ storyId, data, tags }: EditFormProps) {
  const [edit] = useState(() => readStoryEdit(data, tags));

  return (
    <GeneralStoryCreateForm
      initial={edit.initial}
      edit={{ storyId, base: edit.base, submission: edit.submission }}
    />
  );
}
