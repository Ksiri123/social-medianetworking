import Navigation from "@/components/Navigation";
import CreatePost from "@/components/CreatePost";
import Post from "@/components/Post";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Index = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    fetchPosts();

    // Subscribe to real-time post changes
    const channel = supabase
      .channel('posts-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        setLoading(false);
        return;
      }

      // Fetch profiles separately
      const userIds = [...new Set(data?.map(post => post.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      // Merge posts with profiles
      const postsWithProfiles = data?.map(post => ({
        ...post,
        profiles: profilesData?.find(profile => profile.id === post.user_id)
      })) || [];

      setPosts(postsWithProfiles);
    } catch (error: any) {
      toast.error("Error loading posts");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading posts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <CreatePost onPostCreated={fetchPosts} />
        
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Create the first one!</p>
            </div>
          ) : (
            posts.map((post) => (
              <Post 
                key={post.id} 
                id={post.id}
                author={post.profiles?.display_name || 'Unknown'}
                username={post.profiles?.username || 'unknown'}
                avatar={post.profiles?.avatar_url || ''}
                content={post.content}
                image={post.image_url}
                createdAt={post.created_at}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
