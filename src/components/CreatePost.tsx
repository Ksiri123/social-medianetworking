import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Smile, X, FileText } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface CreatePostProps {
  onPostCreated?: () => void;
}

const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setUserProfile(data);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setContent(content + emojiData.emoji);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + uploadedFiles.length > 4) {
      toast.error("Maximum 4 files allowed!");
      return;
    }

    const newFiles = [...uploadedFiles, ...files];
    setUploadedFiles(newFiles);

    // Create preview URLs for images
    const newUrls = files.map(file => {
      if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
      }
      return '';
    });
    setPreviewUrls([...previewUrls, ...newUrls]);
    
    toast.success(`${files.length} file(s) added!`);
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  const handlePost = async () => {
    if (!content.trim() && uploadedFiles.length === 0) {
      toast.error("Please write something or upload a file!");
      return;
    }

    setIsPosting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to post");
        return;
      }

      // Upload image if exists
      let imageUrl = undefined;
      if (uploadedFiles.length > 0 && uploadedFiles[0].type.startsWith('image/')) {
        const file = uploadedFiles[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, file);

        if (uploadError) {
          toast.error("Error uploading image");
          console.error(uploadError);
          setIsPosting(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Create post
      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content,
          image_url: imageUrl
        })
        .select()
        .single();

      if (error) throw error;

      // Generate 1-2 random engagement notifications
      if (newPost) {
        const notificationTypes = ['like', 'comment'];
        const numNotifications = Math.floor(Math.random() * 2) + 1; // 1 or 2
        
        for (let i = 0; i < numNotifications; i++) {
          const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
          
          await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              actor_id: user.id, // Using same user as demo
              type: randomType,
              post_id: newPost.id
            });
        }
      }

      toast.success("Post created successfully!");
      setContent("");
      setUploadedFiles([]);
      setPreviewUrls([]);
      
      // Trigger refresh on parent
      onPostCreated?.();
    } catch (error: any) {
      toast.error("Error creating post");
      console.error(error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="card-elevated bg-card p-6 mb-6 animate-fade-in">
      <div className="flex gap-4">
        <Avatar className="w-12 h-12 ring-2 ring-primary/20">
          <AvatarImage src={userProfile?.avatar_url} />
          <AvatarFallback className="gradient-bg text-white">
            {userProfile?.username?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-24 resize-none border-0 bg-muted focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
          />
          
          {/* File Previews */}
          {uploadedFiles.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="relative group">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={previewUrls[index]}
                      alt={file.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-32 bg-muted rounded-lg flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate max-w-[90%]">
                        {file.name}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="hover:text-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="w-5 h-5" />
              </Button>
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="hover:text-accent">
                    <Smile className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 border-0" align="start">
                  <EmojiPicker onEmojiClick={handleEmojiClick} width={350} height={400} />
                </PopoverContent>
              </Popover>
            </div>
            
            <Button variant="gradient" onClick={handlePost} disabled={isPosting}>
              {isPosting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
