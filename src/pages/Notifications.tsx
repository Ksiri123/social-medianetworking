import Navigation from "@/components/Navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, UserPlus, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    markNotificationsAsRead();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markNotificationsAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch actor profiles for each notification
      const notificationsWithProfiles = await Promise.all(
        (data || []).map(async (notification) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, username, avatar_url')
            .eq('id', notification.actor_id)
            .single();

          return {
            ...notification,
            actor_name: profile?.display_name || 'Unknown',
            actor_username: profile?.username || 'unknown',
            actor_avatar: profile?.avatar_url || ''
          };
        })
      );

      setNotifications(notificationsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast.error('Error loading notifications');
    } finally {
      setLoading(false);
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

  const getNotificationDetails = (type: string) => {
    switch (type) {
      case 'like':
        return {
          icon: Heart,
          action: 'liked your post',
          color: 'text-accent',
          bgColor: 'bg-accent/10'
        };
      case 'comment':
        return {
          icon: MessageCircle,
          action: 'commented on your post',
          color: 'text-secondary',
          bgColor: 'bg-secondary/10'
        };
      case 'follow':
        return {
          icon: UserPlus,
          action: 'started following you',
          color: 'text-primary',
          bgColor: 'bg-primary/10'
        };
      default:
        return {
          icon: Heart,
          action: 'interacted with your content',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 gradient-text animate-fade-in">
          Notifications
        </h1>
        
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const details = getNotificationDetails(notification.type);
              const Icon = details.icon;
              return (
                <div
                  key={notification.id}
                  className="card-elevated bg-card p-6 animate-fade-in hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full ${details.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${details.color}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                          <AvatarImage src={notification.actor_avatar} />
                          <AvatarFallback className="gradient-bg text-white text-xs">
                            {notification.actor_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-semibold text-foreground">
                            {notification.actor_name}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {details.action}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
