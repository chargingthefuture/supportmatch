import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Info, AlertTriangle, Settings, Zap, Megaphone } from "lucide-react";
import { Announcement } from "@shared/schema";

interface AnnouncementDisplayProps {
  /** Whether to show login announcements or all active ones */
  showLoginOnly?: boolean;
  /** Whether to show sign-in page announcements (pre-login) */
  showSignInOnly?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Maximum number of announcements to show */
  maxCount?: number;
}

const getAnnouncementIcon = (type: string) => {
  switch (type) {
    case "warning":
      return AlertTriangle;
    case "maintenance":
      return Settings;
    case "update":
      return Zap;
    case "promotion":
      return Megaphone;
    case "info":
    default:
      return Info;
  }
};

const getAnnouncementVariant = (type: string): "default" | "destructive" => {
  switch (type) {
    case "warning":
      return "destructive";
    case "maintenance":
    case "update":
    case "promotion":
    case "info":
    default:
      return "default";
  }
};

const getAnnouncementStyles = (type: string) => {
  switch (type) {
    case "warning":
      return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30";
    case "maintenance":
      return "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30";
    case "update":
      return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30";
    case "promotion":
      return "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30";
    case "info":
    default:
      return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30";
  }
};

const getAnnouncementTextColor = (type: string) => {
  switch (type) {
    case "warning":
      return "text-red-800 dark:text-red-200";
    case "maintenance":
      return "text-orange-800 dark:text-orange-200";
    case "update":
      return "text-blue-800 dark:text-blue-200";
    case "promotion":
      return "text-purple-800 dark:text-purple-200";
    case "info":
    default:
      return "text-blue-800 dark:text-blue-200";
  }
};

export default function AnnouncementDisplay({ 
  showLoginOnly = false,
  showSignInOnly = false, 
  className = "",
  maxCount 
}: AnnouncementDisplayProps) {
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());

  // Load dismissed announcements from localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem('dismissedAnnouncements');
    if (dismissed) {
      try {
        setDismissedAnnouncements(new Set(JSON.parse(dismissed)));
      } catch (error) {
        console.warn('Failed to parse dismissed announcements from localStorage');
      }
    }
  }, []);

  // Fetch announcements based on context
  const getQueryKey = () => {
    if (showSignInOnly) {
      return ['/api/announcements/signin'];
    }
    if (showLoginOnly === false) {
      return ['/api/announcements/login']; // Post-login announcements
    }
    return ['/api/announcements/active']; // Default to all active
  };

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: getQueryKey(),
  });

  const dismissAnnouncement = (announcementId: string) => {
    const newDismissed = new Set(dismissedAnnouncements);
    newDismissed.add(announcementId);
    setDismissedAnnouncements(newDismissed);
    
    // Save to localStorage
    try {
      localStorage.setItem('dismissedAnnouncements', JSON.stringify(Array.from(newDismissed)));
    } catch (error) {
      console.warn('Failed to save dismissed announcements to localStorage');
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="animate-pulse">
          <div className="h-20 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Filter out dismissed announcements and apply max count
  const visibleAnnouncements = announcements
    .filter(announcement => !dismissedAnnouncements.has(announcement.id))
    .slice(0, maxCount);

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`} data-testid="announcement-display">
      {visibleAnnouncements.map((announcement) => {
        const announcementType = announcement.type || "info";
        const IconComponent = getAnnouncementIcon(announcementType);
        const variant = getAnnouncementVariant(announcementType);
        const customStyles = getAnnouncementStyles(announcementType);
        const textColor = getAnnouncementTextColor(announcementType);

        return (
          <Card
            key={announcement.id}
            className={`relative ${customStyles}`}
            data-testid={`announcement-${announcement.id}`}
          >
            <Alert variant={variant} className="border-0 bg-transparent">
              <IconComponent className="h-4 w-4" />
              <div className="flex-1">
                <AlertTitle className={`${textColor} font-semibold mb-1`}>
                  {announcement.title}
                </AlertTitle>
                <AlertDescription className={`${textColor} whitespace-pre-wrap`}>
                  {announcement.content}
                </AlertDescription>
                {announcement.expiresAt && (
                  <AlertDescription className={`${textColor} text-sm mt-2 opacity-75`}>
                    Expires: {new Date(announcement.expiresAt).toLocaleDateString()}
                  </AlertDescription>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={`absolute top-2 right-2 h-6 w-6 p-0 ${textColor} hover:bg-white/20`}
                onClick={() => dismissAnnouncement(announcement.id)}
                data-testid={`dismiss-announcement-${announcement.id}`}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Dismiss announcement</span>
              </Button>
            </Alert>
          </Card>
        );
      })}
    </div>
  );
}