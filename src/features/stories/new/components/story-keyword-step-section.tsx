import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function StoryKeywordStepSection() {
  return (
    <main className="flex flex-1 flex-col pb-16">
      <section className="flex flex-1 flex-col">
        <Tabs defaultValue="GENRE">
          <TabsList variant="line">
            <TabsTrigger value="GENRE" className="gap-0.5">
              장르 <span className="text-destructive">*</span>
            </TabsTrigger>
            <TabsTrigger value="PROTAGONIST" className="gap-0.5">
              주인공 <span className="text-destructive">*</span>
            </TabsTrigger>
            <TabsTrigger value="SUPPORTING_CHARACTER">주변 인물</TabsTrigger>
          </TabsList>
          <TabsContent value="GENRE">
            <div className="flex flex-col gap-2 px-4 pb-4">
              <p className="text-sm text-foreground-secondary">
                최대 5개까지 선택할 수 있어요
              </p>
            </div>
          </TabsContent>
          <TabsContent value="PROTAGONIST">
            <div className="flex flex-col gap-2 px-4 pb-4">
              <p className="text-sm text-foreground-secondary">
                최대 5개까지 선택할 수 있어요
              </p>
            </div>
          </TabsContent>
          <TabsContent value="SUPPORTING_CHARACTER">
            <div className="flex flex-col gap-2 px-4 pb-4">
              <p className="text-sm text-foreground-secondary">
                최대 10개까지 선택할 수 있어요
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto h-16 max-w-md border-t border-border bg-background px-4">
        <div className="flex h-full w-full items-center justify-between">
          <p className="text-sm font-medium">1 / 3</p>
          <Button size="lg">스토리라인 만들기</Button>
        </div>
      </nav>
    </main>
  );
}
