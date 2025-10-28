import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, Hash } from "lucide-react";
import { useState } from "react";

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const trendingTopics = [
    { tag: "WebDevelopment", posts: "45.2K" },
    { tag: "AI", posts: "89.5K" },
    { tag: "ReactJS", posts: "32.1K" },
    { tag: "Design", posts: "56.8K" },
    { tag: "Tech", posts: "124K" },
  ];

  const suggestedUsers = [
    {
      name: "Sarah Chen",
      username: "sarahchen",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarahchen",
      followers: "12.5K",
    },
    {
      name: "Mike Johnson",
      username: "mikej",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mikej",
      followers: "8.3K",
    },
    {
      name: "Emma Wilson",
      username: "emmaw",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emmaw",
      followers: "15.7K",
    },
  ];

  const filteredTopics = trendingTopics.filter(topic =>
    topic.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = suggestedUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Search Bar */}
        <div className="card-elevated bg-card p-4 mb-6 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="search"
              placeholder="Search users, posts, and topics..."
              className="pl-10 border-0 bg-muted focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-muted-foreground">
              Found {filteredTopics.length} topics and {filteredUsers.length} users
            </div>
          )}
        </div>

        {/* Trending Topics */}
        <div className="card-elevated bg-card p-6 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold text-foreground">Trending Topics</h2>
          </div>
          
          <div className="space-y-4">
            {filteredTopics.length > 0 ? (
              filteredTopics.map((topic, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-xl bg-muted hover:bg-muted/80 transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center group-hover:neon-glow-purple transition-all">
                    <Hash className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:gradient-text transition-all">
                      #{topic.tag}
                    </p>
                    <p className="text-sm text-muted-foreground">{topic.posts} posts</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="group-hover:text-primary">
                  View
                </Button>
              </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No topics found</p>
            )}
          </div>
        </div>

        {/* Suggested Users */}
        <div className="card-elevated bg-card p-6 animate-fade-in">
          <h2 className="text-xl font-bold text-foreground mb-4">Suggested Users</h2>
          
          <div className="space-y-4">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-xl bg-muted hover:bg-muted/80 transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="gradient-bg text-white">
                      {user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      @{user.username} · {user.followers} followers
                    </p>
                  </div>
                </div>
                <Button variant="gradient" size="sm" className="rounded-full">
                  Follow
                </Button>
              </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No users found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;
