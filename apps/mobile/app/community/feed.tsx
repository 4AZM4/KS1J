import { CommunityGate } from '@/components/Community';
import { PostList } from '@/components/Posts';
import { Screen } from '@/components/Screen';

/** The community feed: posts for every verified member. */
export default function FeedScreen() {
  return (
    <Screen title="Community feed" intro="News, thanks and achievements from verified members. Text only, kind words only.">
      <CommunityGate>
        <PostList groupId={null} canPost />
      </CommunityGate>
    </Screen>
  );
}

