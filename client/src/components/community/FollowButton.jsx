import { useState } from "react";
import { communityApi } from "../../api/community.api";
import Button from "../ui/Button";

export default function FollowButton({ username, initialFollowing = false }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (following) {
        await communityApi.unfollow(username);
        setFollowing(false);
      } else {
        await communityApi.follow(username);
        setFollowing(true);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={following ? "ghost" : "primary"}
      size="sm"
      onClick={onClick}
      loading={loading}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}
