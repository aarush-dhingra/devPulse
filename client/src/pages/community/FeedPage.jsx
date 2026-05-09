import PostComposer from "../../components/community/feed/PostComposer";
import FeedFilters from "../../components/community/feed/FeedFilters";
import FeedContainer from "../../components/community/feed/FeedContainer";
import SuggestedPeople from "../../components/community/profile/SuggestedPeople";

export default function FeedPage() {
  return (
    <div className="flex gap-6 items-start">
      {/* Main feed column */}
      <div className="flex-1 min-w-0">
        <PostComposer />
        <FeedFilters />
        <FeedContainer />
      </div>

      {/* Right rail */}
      <div className="hidden lg:flex flex-col gap-4 w-72 shrink-0 sticky top-20">
        <SuggestedPeople />
      </div>
    </div>
  );
}
