import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Announcement } from "@shared/schema";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Info, 
  AlertTriangle, 
  Settings, 
  Zap, 
  Megaphone,
  Search,
  Calendar,
  Filter,
  Eye
} from "lucide-react";

interface AnnouncementsPageProps {
  user: User;
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

const getTypeColor = (type: string) => {
  switch (type) {
    case "warning":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
    case "maintenance":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
    case "update":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    case "promotion":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
    case "info":
    default:
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "warning":
      return "Warning";
    case "maintenance":
      return "Maintenance";
    case "update":
      return "Update";
    case "promotion":
      return "Promotion";
    case "info":
    default:
      return "Info";
  }
};

export default function AnnouncementsPage({ user }: AnnouncementsPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showExpired, setShowExpired] = useState(false);

  // Fetch all active announcements
  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements/active'],
  });

  // Filter announcements based on search and type filter
  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = !searchTerm || 
      announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || announcement.type === typeFilter;
    
    const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < new Date();
    const matchesExpiration = showExpired || !isExpired;
    
    return matchesSearch && matchesType && matchesExpiration;
  });

  // Group announcements by type for stats
  const announcementStats = announcements.reduce((stats, announcement) => {
    const type = announcement.type || "info";
    stats[type] = (stats[type] || 0) + 1;
    return stats;
  }, {} as Record<string, number>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-announcements">
      <Header user={user} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" data-testid="heading-announcements">
            Announcements
          </h1>
          <p className="text-muted-foreground">
            Stay up to date with the latest news and updates from TI Partners.
          </p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search announcements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-announcements"
                />
              </div>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="select-type-filter">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="info">Info ({announcementStats.info || 0})</SelectItem>
                  <SelectItem value="warning">Warning ({announcementStats.warning || 0})</SelectItem>
                  <SelectItem value="maintenance">Maintenance ({announcementStats.maintenance || 0})</SelectItem>
                  <SelectItem value="update">Update ({announcementStats.update || 0})</SelectItem>
                  <SelectItem value="promotion">Promotion ({announcementStats.promotion || 0})</SelectItem>
                </SelectContent>
              </Select>

              {/* Show Expired Toggle */}
              <div className="flex items-center space-x-2">
                <Button
                  variant={showExpired ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowExpired(!showExpired)}
                  data-testid="button-toggle-expired"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showExpired ? "Hide Expired" : "Show Expired"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-muted-foreground">Loading announcements...</div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredAnnouncements.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Announcements Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || typeFilter !== "all"
                    ? "No announcements match your current filters."
                    : "There are no active announcements at this time."
                  }
                </p>
                {(searchTerm || typeFilter !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setTypeFilter("all");
                    }}
                    className="mt-4"
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Announcements Grid */}
        {!isLoading && filteredAnnouncements.length > 0 && (
          <div className="space-y-4" data-testid="announcements-list">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">
                {filteredAnnouncements.length} announcement{filteredAnnouncements.length === 1 ? '' : 's'} found
              </h2>
            </div>

            <ScrollArea className="max-h-[800px]">
              <div className="space-y-4">
                {filteredAnnouncements.map((announcement) => {
                  const IconComponent = getAnnouncementIcon(announcement.type || "info");
                  const typeColor = getTypeColor(announcement.type || "info");
                  const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < new Date();

                  return (
                    <Card 
                      key={announcement.id}
                      className={`${isExpired ? "opacity-60" : ""}`}
                      data-testid={`announcement-card-${announcement.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-full ${typeColor.replace('text-', 'bg-').replace('border-', '').split(' ')[0]} ${typeColor.split(' ')[0]}/20`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-1" data-testid={`announcement-title-${announcement.id}`}>
                                {announcement.title}
                                {isExpired && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    Expired
                                  </Badge>
                                )}
                              </CardTitle>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <Badge className={typeColor} data-testid={`announcement-type-${announcement.id}`}>
                                  {getTypeLabel(announcement.type || "info")}
                                </Badge>
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span data-testid={`announcement-date-${announcement.id}`}>
                                    {formatDate(announcement.createdAt)}
                                  </span>
                                </div>
                                {announcement.expiresAt && (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs">Expires:</span>
                                    <span className="text-xs" data-testid={`announcement-expires-${announcement.id}`}>
                                      {formatDate(announcement.expiresAt)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div 
                          className="whitespace-pre-wrap text-sm leading-relaxed"
                          data-testid={`announcement-content-${announcement.id}`}
                        >
                          {announcement.content}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}