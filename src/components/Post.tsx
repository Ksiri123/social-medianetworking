import { Heart, MessageCircle, Share2, Bookmark, Send, Image, X, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PostProps {
  id: string;
  author: string;
  username: string;
  avatar: string;
  content: string;
  image?: string;
  createdAt: string;
  showDelete?: boolean;
  onDelete?: () => void;
}

interface Comment {
  id: string;
  author: string;
  username: string;
  avatar: string;
  content: string;
  time: string;
  files?: { name: string; url: string; type: string }[];
}

const Post = ({ id, author, username, avatar, content, image, createdAt, showDelete, onDelete }: PostProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [commentPreviews, setCommentPreviews] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLikes();
    fetchComments();
    getCurrentUser();
  }, [id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchLikes = async () => {
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', id);

    if (!error && data) {
      setLikeCount(data.length);
      
      // Check if current user liked this post
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userLike = data.find(like => like.user_id === user.id);
        setIsLiked(!!userLike);
      }
    }
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch profile data for each comment
      const commentsWithProfiles = await Promise.all(
        data.map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', comment.user_id)
            .single();

          return {
            id: comment.id,
            author: profile?.display_name || 'Unknown',
            username: profile?.username || 'unknown',
            avatar: profile?.avatar_url || '',
            content: comment.content,
            time: formatTime(comment.created_at),
            files: []
          };
        })
      );
      
      setCommentsList(commentsWithProfiles);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleLike = async () => {
    if (!currentUser) {
      toast.error("You must be logged in to like posts");
      return;
    }

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikeCount(newLikedState ? likeCount + 1 : likeCount - 1);
    
    if (newLikedState) {
      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: currentUser.id,
          post_id: id
        });

      if (error) {
        toast.error("Error liking post");
        setIsLiked(false);
        setLikeCount(likeCount);
      } else {
        // Get the post owner to create notification
        const { data: postData } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', id)
          .single();

        // Create notification if post owner is different from liker
        if (postData && postData.user_id !== currentUser.id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: postData.user_id,
              actor_id: currentUser.id,
              type: 'like',
              post_id: id
            });
        }
        
        toast.success("Post liked!");
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('post_id', id);

      if (error) {
        toast.error("Error unliking post");
        setIsLiked(true);
        setLikeCount(likeCount + 1);
      }
    }
  };

  const handleCommentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + commentFiles.length > 2) {
      toast.error("Maximum 2 files per comment!");
      return;
    }

    const newFiles = [...commentFiles, ...files];
    setCommentFiles(newFiles);

    const newUrls = files.map(file => {
      if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
      }
      return '';
    });
    setCommentPreviews([...commentPreviews, ...newUrls]);
  };

  const removeCommentFile = (index: number) => {
    setCommentFiles(commentFiles.filter((_, i) => i !== index));
    setCommentPreviews(commentPreviews.filter((_, i) => i !== index));
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && commentFiles.length === 0) {
      toast.error("Please write something or upload a file!");
      return;
    }

    if (!currentUser) {
      toast.error("You must be logged in to comment");
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          user_id: currentUser.id,
          post_id: id,
          content: newComment
        });

      if (error) throw error;

      // Get the post owner to create notification
      const { data: postData } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', id)
        .single();

      // Create notification if post owner is different from commenter
      if (postData && postData.user_id !== currentUser.id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: postData.user_id,
            actor_id: currentUser.id,
            type: 'comment',
            post_id: id
          });
      }

      toast.success("Comment added!");
      setNewComment("");
      setCommentFiles([]);
      setCommentPreviews([]);
      
      // Refresh comments
      fetchComments();
    } catch (error: any) {
      toast.error("Error adding comment");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!currentUser) return;
    
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Post deleted successfully!");
      onDelete?.();
    } catch (error) {
      toast.error("Error deleting post");
      console.error(error);
    }
  };

  return (
    <div className="card-elevated bg-card p-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <Avatar className="w-12 h-12 ring-2 ring-primary/20">
          <AvatarImage src={avatar} />
          <AvatarFallback className="gradient-bg text-white">
            {author[0]}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-foreground">{author}</h3>
              <p className="text-sm text-muted-foreground">@{username} · {formatTime(createdAt)}</p>
            </div>
            {showDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <p className="text-foreground mb-4">{content}</p>
          
          {image && (
            <img
              src={image}
              alt="Post content"
              className="w-full rounded-xl mb-4 object-cover max-h-96"
            />
          )}
          
          <div className="flex items-center gap-6 text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`gap-2 hover:text-accent ${isLiked ? "text-accent" : ""}`}
            >
              <Heart className={isLiked ? "fill-current" : ""} />
              <span>{likeCount}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 hover:text-secondary"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle />
              <span>{commentsList.length}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="hover:text-teal">
              <Share2 />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSaved(!isSaved)}
              className={`ml-auto hover:text-primary ${isSaved ? "text-primary" : ""}`}
            >
              <Bookmark className={isSaved ? "fill-current" : ""} />
            </Button>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="mt-6 pt-6 border-t border-border">
              {/* Add Comment */}
              <div className="mb-4">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-20 resize-none border-0 bg-muted focus-visible:ring-1 focus-visible:ring-primary rounded-xl mb-2"
                />
                
                {/* Comment File Previews */}
                {commentFiles.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    {commentFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        {file.type.startsWith('image/') ? (
                          <img
                            src={commentPreviews[index]}
                            alt={file.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-muted rounded-lg flex flex-col items-center justify-center">
                            <FileText className="w-6 h-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate max-w-[90%] mt-1">
                              {file.name.slice(0, 8)}...
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => removeCommentFile(index)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <input
                    ref={commentFileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleCommentFileUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => commentFileInputRef.current?.click()}
                    className="hover:text-secondary"
                  >
                    <Image className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="gradient" 
                    size="sm"
                    onClick={handleAddComment}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Comment
                  </Button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {commentsList.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.avatar} />
                      <AvatarFallback className="gradient-bg text-white text-xs">
                        {comment.author[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-muted rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-foreground">
                            {comment.author}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            @{comment.username} · {comment.time}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{comment.content}</p>
                        
                        {/* Comment Files */}
                        {comment.files && comment.files.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {comment.files.map((file, idx) => (
                              <div key={idx}>
                                {file.type.startsWith('image/') ? (
                                  <img
                                    src={file.url}
                                    alt={file.name}
                                    className="w-24 h-24 object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-24 h-24 bg-background rounded-lg flex flex-col items-center justify-center p-2">
                                    <FileText className="w-6 h-6 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground truncate max-w-full mt-1">
                                      {file.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Post;
