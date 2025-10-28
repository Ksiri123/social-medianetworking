import Navigation from "@/components/Navigation";
import Post from "@/components/Post";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Calendar, Link as LinkIcon } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [profileData, setProfileData] = useState({
    display_name: "",
    username: "",
    bio: "",
    avatar_url: "",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    fetchProfile(session.user.id);
    fetchMyPosts(session.user.id);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setProfileData({
        display_name: data.display_name || "",
        username: data.username || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
      });
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Error loading profile");
    }
  };

  const fetchMyPosts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', userId)
        .single();

      // Merge posts with profile
      const postsWithProfile = data?.map(post => ({
        ...post,
        profiles: profileData
      })) || [];

      setMyPosts(postsWithProfile);
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      toast.error("Error loading posts");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    try {
      setUploading(true);

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath);

      setProfileData({ ...profileData, avatar_url: publicUrl });
      toast.success("Profile picture uploaded!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Error uploading image");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profileData.display_name,
          bio: profileData.bio,
          avatar_url: profileData.avatar_url,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      setIsDialogOpen(false);
      fetchProfile(user.id);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Error updating profile");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Profile Header */}
        <div className="card-elevated bg-card overflow-hidden mb-6 animate-fade-in">
          {/* Gradient Cover */}
          <div className="h-48 gradient-bg-vertical relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />
          </div>
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16 mb-4">
              <Avatar className="w-32 h-32 ring-4 ring-card shadow-xl">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="gradient-bg text-white text-4xl">
                  {profile?.display_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">{profile?.display_name}</h1>
                <p className="text-muted-foreground">@{profile?.username}</p>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="gradient" className="rounded-full">
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] bg-card">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Edit Profile</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Update your profile information here
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="avatar" className="text-foreground">Profile Picture</Label>
                      <div className="flex items-center gap-4">
                        <Avatar className="w-20 h-20">
                          <AvatarImage src={profileData.avatar_url} />
                          <AvatarFallback className="gradient-bg text-white text-2xl">
                            {profileData.display_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <Input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={uploading}
                          className="bg-muted border-0"
                        />
                      </div>
                      {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="display_name" className="text-foreground">Display Name</Label>
                      <Input
                        id="display_name"
                        value={profileData.display_name}
                        onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                        className="bg-muted border-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-foreground">Username</Label>
                      <Input
                        id="username"
                        value={profileData.username}
                        disabled
                        className="bg-muted border-0 opacity-60"
                      />
                      <p className="text-xs text-muted-foreground">Username cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-foreground">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        className="bg-muted border-0 min-h-[80px]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="gradient" onClick={handleSaveProfile}>
                      Save Changes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {profile?.bio && (
              <p className="text-foreground mb-4">
                {profile.bio}
              </p>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(profile?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
            
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-bold text-foreground">{myPosts.length}</span>{" "}
                <span className="text-muted-foreground">Posts</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* User Posts */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-6">My Posts</h2>
          <div className="space-y-6">
            {myPosts.length > 0 ? (
              myPosts.map((post) => (
                <Post 
                  key={post.id}
                  id={post.id}
                  author={post.profiles?.display_name || 'Unknown'}
                  username={post.profiles?.username || 'unknown'}
                  avatar={post.profiles?.avatar_url || ''}
                  content={post.content}
                  image={post.image_url}
                  createdAt={post.created_at}
                  showDelete={true}
                  onDelete={() => fetchMyPosts(user.id)}
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No posts yet. Create your first post!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
