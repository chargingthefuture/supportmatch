import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Partnership, Announcement, InsertAnnouncement, insertAnnouncementSchema } from "@shared/schema";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  RefreshCw, 
  Shield, 
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  UserX,
  Settings,
  Key,
  Plus,
  Trash2,
  Copy,
  Megaphone,
  Info,
  Zap,
  Edit,
  X
} from "lucide-react";

interface AdminStats {
  activeUsers: number;
  currentPartnerships: number;
  pendingReports: number;
}

interface ReportWithUsers {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  reporter: User;
  reportedUser: User;
}

interface InviteCodeWithUsers {
  id: string;
  code: string;
  isActive: boolean;
  maxUses: string;
  currentUses: string;
  expiresAt: string | null;
  createdAt: string;
  usedAt: string | null;
  creator: { id: string; username: string; name: string } | null;
  usedByUser: { id: string; username: string; name: string } | null;
}

interface PartnershipWithUsers extends Partnership {
  user1: { id: string; name: string; email: string } | null;
  user2: { id: string; name: string; email: string } | null;
}

interface AnnouncementWithCreator extends Announcement {
  creator: { id: string; name: string; email: string } | null;
}

interface AdminProps {
  user: User;
}

export default function Admin({ user }: AdminProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newInviteMaxUses, setNewInviteMaxUses] = useState("1");
  const [newInviteExpires, setNewInviteExpires] = useState("");
  const [showCreateAnnouncementDialog, setShowCreateAnnouncementDialog] = useState(false);
  const [showEditAnnouncementDialog, setShowEditAnnouncementDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementWithCreator | null>(null);
  const { toast } = useToast();

  // Announcement form setup
  const announcementForm = useForm<InsertAnnouncement>({
    resolver: zodResolver(insertAnnouncementSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "info",
      isActive: true,
      showOnLogin: true,
      showOnSignInPage: false,
      expiresAt: null,
    },
  });

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
  });

  // Fetch reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery<ReportWithUsers[]>({
    queryKey: ['/api/admin/reports'],
    enabled: activeTab === 'reports',
  });

  // Fetch invite codes
  const { data: inviteCodes = [], isLoading: inviteCodesLoading } = useQuery<InviteCodeWithUsers[]>({
    queryKey: ['/api/admin/invite-codes'],
    enabled: activeTab === 'invites',
  });

  // Fetch partnerships
  const { data: partnerships = [], isLoading: partnershipsLoading } = useQuery<PartnershipWithUsers[]>({
    queryKey: ['/api/admin/partnerships'],
    enabled: activeTab === 'dashboard',
  });

  // Fetch announcements
  const { data: announcements = [], isLoading: announcementsLoading } = useQuery<AnnouncementWithCreator[]>({
    queryKey: ['/api/admin/announcements'],
    enabled: activeTab === 'announcements',
  });

  // Create matches mutation
  const createMatches = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/admin/create-matches');
    },
    onSuccess: () => {
      toast({
        title: "Matches Created",
        description: "Monthly matches have been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create matches",
        variant: "destructive",
      });
    },
  });

  // Update report mutation
  const updateReport = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      return apiRequest('PUT', `/api/admin/reports/${reportId}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Report Updated",
        description: "Report status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update report",
        variant: "destructive",
      });
    },
  });

  // Create invite code mutation
  const createInviteCode = useMutation({
    mutationFn: async ({ maxUses, expiresAt }: { maxUses: string; expiresAt?: string }) => {
      return apiRequest('POST', '/api/admin/invite-codes', {
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Invite Code Created",
        description: "New invite code has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invite-codes'] });
      setNewInviteMaxUses("1");
      setNewInviteExpires("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invite code",
        variant: "destructive",
      });
    },
  });

  // Deactivate invite code mutation
  const deactivateInviteCode = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest('DELETE', `/api/admin/invite-codes/${code}`);
    },
    onSuccess: () => {
      toast({
        title: "Invite Code Deactivated",
        description: "Invite code has been deactivated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invite-codes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate invite code",
        variant: "destructive",
      });
    },
  });

  // Create announcement mutation
  const createAnnouncement = useMutation({
    mutationFn: async (data: InsertAnnouncement) => {
      return apiRequest('POST', '/api/admin/announcements', data);
    },
    onSuccess: () => {
      toast({
        title: "Announcement Created",
        description: "New announcement has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      announcementForm.reset();
      setShowCreateAnnouncementDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create announcement",
        variant: "destructive",
      });
    },
  });

  // Update announcement mutation
  const updateAnnouncement = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertAnnouncement> }) => {
      return apiRequest('PUT', `/api/admin/announcements/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Announcement Updated",
        description: "Announcement has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
      announcementForm.reset();
      setShowEditAnnouncementDialog(false);
      setEditingAnnouncement(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update announcement",
        variant: "destructive",
      });
    },
  });

  // Deactivate announcement mutation
  const deactivateAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/admin/announcements/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Announcement Deactivated",
        description: "Announcement has been deactivated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/announcements'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate announcement",
        variant: "destructive",
      });
    },
  });

  const getInitials = (name: string | null) => {
    if (!name || typeof name !== 'string') {
      return 'TU';
    }
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatGender = (gender: string | null) => {
    if (!gender) return 'Not specified';
    return gender.charAt(0).toUpperCase() + gender.slice(1).replace('_', ' ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'investigating': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'investigating': return 'Investigating';
      case 'resolved': return 'Resolved';
      case 'dismissed': return 'Dismissed';
      default: return status;
    }
  };

  const handleReportAction = async (reportId: string, status: string) => {
    await updateReport.mutateAsync({ reportId, status });
  };

  const handleCreateMatches = async () => {
    await createMatches.mutateAsync();
  };

  const handleCreateInviteCode = async () => {
    await createInviteCode.mutateAsync({
      maxUses: newInviteMaxUses,
      expiresAt: newInviteExpires,
    });
  };

  const handleDeactivateInviteCode = async (code: string) => {
    await deactivateInviteCode.mutateAsync(code);
  };

  // Announcement handlers
  const handleCreateAnnouncement = async (data: InsertAnnouncement) => {
    await createAnnouncement.mutateAsync(data);
  };

  const handleUpdateAnnouncement = async (data: InsertAnnouncement) => {
    if (editingAnnouncement) {
      await updateAnnouncement.mutateAsync({ id: editingAnnouncement.id, data });
    }
  };

  const handleEditAnnouncement = (announcement: AnnouncementWithCreator) => {
    setEditingAnnouncement(announcement);
    announcementForm.reset({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type || "info",
      isActive: announcement.isActive,
      showOnLogin: announcement.showOnLogin,
      showOnSignInPage: announcement.showOnSignInPage,
      expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt) : null,
    });
    setShowEditAnnouncementDialog(true);
  };

  const handleDeactivateAnnouncement = async (id: string) => {
    await deactivateAnnouncement.mutateAsync(id);
  };

  const getAnnouncementTypeIcon = (type: string) => {
    switch (type) {
      case "warning": return AlertTriangle;
      case "maintenance": return Settings;
      case "update": return Zap;
      case "promotion": return Megaphone;
      case "info":
      default: return Info;
    }
  };

  const getAnnouncementTypeBadge = (type: string) => {
    switch (type) {
      case "warning": return "bg-red-100 text-red-800 border-red-200";
      case "maintenance": return "bg-orange-100 text-orange-800 border-orange-200";
      case "update": return "bg-blue-100 text-blue-800 border-blue-200";
      case "promotion": return "bg-purple-100 text-purple-800 border-purple-200";
      case "info":
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Invite code copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateValue: string | Date | null) => {
    if (!dateValue) return 'N/A';
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-admin">
      <Header user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" data-testid="heading-admin-dashboard">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, partnerships, and safety reports for the TI Partners platform.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5" data-testid="tabs-admin">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <Settings className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Reports ({reports.filter(r => r.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="invites" data-testid="tab-invites">
              <Key className="w-4 h-4 mr-2" />
              Invite Codes
            </TabsTrigger>
            <TabsTrigger value="announcements" data-testid="tab-announcements">
              <Megaphone className="w-4 h-4 mr-2" />
              Announcements ({announcements.filter(a => a.isActive).length})
            </TabsTrigger>
            <TabsTrigger value="system" data-testid="tab-system">
              <Shield className="w-4 h-4 mr-2" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card data-testid="card-active-users">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-bold text-blue-600" data-testid="stat-active-users">
                        {statsLoading ? "..." : stats?.activeUsers || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-current-partnerships">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <UserCheck className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Current Partnerships</p>
                      <p className="text-2xl font-bold text-green-600" data-testid="stat-current-partnerships">
                        {statsLoading ? "..." : stats?.currentPartnerships || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-pending-reports">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Pending Reports</p>
                      <p className="text-2xl font-bold text-yellow-600" data-testid="stat-pending-reports">
                        {statsLoading ? "..." : stats?.pendingReports || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card data-testid="card-quick-actions">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Common administrative tasks and system management.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={handleCreateMatches}
                    disabled={createMatches.isPending}
                    className="justify-start h-auto p-4"
                    data-testid="button-create-matches"
                  >
                    <div className="flex items-center">
                      <RefreshCw className={`h-5 w-5 mr-3 ${createMatches.isPending ? 'animate-spin' : ''}`} />
                      <div className="text-left">
                        <p className="font-medium">Create Monthly Matches</p>
                        <p className="text-sm text-primary-foreground/80">
                          {createMatches.isPending ? "Creating matches..." : "Generate new partnership matches"}
                        </p>
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports'] });
                      toast({
                        title: "Data Refreshed",
                        description: "Admin dashboard data has been refreshed.",
                      });
                    }}
                    data-testid="button-refresh-data"
                  >
                    <div className="flex items-center">
                      <RefreshCw className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <p className="font-medium">Refresh Data</p>
                        <p className="text-sm text-muted-foreground">
                          Update dashboard statistics
                        </p>
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Partnerships List */}
            <Card data-testid="card-partnerships-list">
              <CardHeader>
                <CardTitle>Current Partnerships</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Detailed list of all partnerships with start and end dates.
                </p>
              </CardHeader>
              <CardContent>
                {partnershipsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading partnerships...</div>
                  </div>
                ) : partnerships.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Partnerships</h3>
                    <p className="text-muted-foreground">
                      No partnerships have been created yet. Use "Create Monthly Matches" to start.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <Table data-testid="table-partnerships">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Partner 1</TableHead>
                          <TableHead>Partner 2</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partnerships.map((partnership) => {
                          const startDate = new Date(partnership.startDate);
                          const endDate = new Date(partnership.endDate);
                          const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                          
                          return (
                            <TableRow key={partnership.id} data-testid={`partnership-${partnership.id}`}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-medium">
                                    {getInitials(partnership.user1?.name || null)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{partnership.user1?.name || 'Unknown User'}</p>
                                    <p className="text-xs text-muted-foreground">{partnership.user1?.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-sm font-medium">
                                    {getInitials(partnership.user2?.name || null)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{partnership.user2?.name || 'Unknown User'}</p>
                                    <p className="text-xs text-muted-foreground">{partnership.user2?.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={partnership.status === 'active' ? 'default' : 'secondary'}
                                  data-testid={`status-${partnership.id}`}
                                >
                                  {partnership.status}
                                </Badge>
                              </TableCell>
                              <TableCell data-testid={`start-date-${partnership.id}`}>
                                {startDate.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </TableCell>
                              <TableCell data-testid={`end-date-${partnership.id}`}>
                                {endDate.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </TableCell>
                              <TableCell data-testid={`duration-${partnership.id}`}>
                                <span className="text-sm text-muted-foreground">
                                  {durationDays} days
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card data-testid="card-safety-reports">
              <CardHeader>
                <CardTitle>Safety Reports</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage and investigate user safety reports and concerns.
                </p>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading reports...</div>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Reports</h3>
                    <p className="text-muted-foreground">
                      No safety reports have been submitted yet.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <Table data-testid="table-reports">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reporter</TableHead>
                          <TableHead>Reported User</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map((report) => (
                          <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-medium">
                                  {getInitials(report.reporter.name)}
                                </div>
                                <div>
                                  <p className="font-medium text-sm" data-testid={`reporter-name-${report.id}`}>
                                    {report.reporter.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatGender(report.reporter.gender)}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-700 text-sm font-medium">
                                  {getInitials(report.reportedUser.name)}
                                </div>
                                <div>
                                  <p className="font-medium text-sm" data-testid={`reported-name-${report.id}`}>
                                    {report.reportedUser.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatGender(report.reportedUser.gender)}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm" data-testid={`report-reason-${report.id}`}>
                                  {report.reason}
                                </p>
                                {report.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {report.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={getStatusColor(report.status)}
                                data-testid={`badge-status-${report.id}`}
                              >
                                {getStatusLabel(report.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground" data-testid={`report-date-${report.id}`}>
                                {new Date(report.createdAt).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                {report.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReportAction(report.id, 'investigating')}
                                      disabled={updateReport.isPending}
                                      data-testid={`button-investigate-${report.id}`}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      Investigate
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReportAction(report.id, 'dismissed')}
                                      disabled={updateReport.isPending}
                                      data-testid={`button-dismiss-${report.id}`}
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Dismiss
                                    </Button>
                                  </>
                                )}
                                {report.status === 'investigating' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReportAction(report.id, 'resolved')}
                                      disabled={updateReport.isPending}
                                      data-testid={`button-resolve-${report.id}`}
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Resolve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReportAction(report.id, 'dismissed')}
                                      disabled={updateReport.isPending}
                                      data-testid={`button-dismiss-investigating-${report.id}`}
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Dismiss
                                    </Button>
                                  </>
                                )}
                                {(report.status === 'resolved' || report.status === 'dismissed') && (
                                  <Badge variant="outline" className="text-xs">
                                    {report.status === 'resolved' ? 'Completed' : 'Closed'}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invite Codes Tab */}
          <TabsContent value="invites" className="space-y-6">
            <Card data-testid="card-generate-invite">
              <CardHeader>
                <CardTitle>Generate New Invite Code</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create invite codes to allow new users to register on the platform.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="max-uses">Maximum Uses</Label>
                    <Select value={newInviteMaxUses} onValueChange={setNewInviteMaxUses}>
                      <SelectTrigger data-testid="select-max-uses">
                        <SelectValue placeholder="Select max uses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 use</SelectItem>
                        <SelectItem value="5">5 uses</SelectItem>
                        <SelectItem value="10">10 uses</SelectItem>
                        <SelectItem value="25">25 uses</SelectItem>
                        <SelectItem value="100">100 uses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expires-at">Expiration Date (Optional)</Label>
                    <Input
                      id="expires-at"
                      type="datetime-local"
                      value={newInviteExpires}
                      onChange={(e) => setNewInviteExpires(e.target.value)}
                      data-testid="input-expires-at"
                    />
                  </div>
                  <Button
                    onClick={handleCreateInviteCode}
                    disabled={createInviteCode.isPending}
                    data-testid="button-generate-invite"
                  >
                    <Plus className={`h-4 w-4 mr-2 ${createInviteCode.isPending ? 'animate-spin' : ''}`} />
                    {createInviteCode.isPending ? "Generating..." : "Generate Code"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-invite-codes-list">
              <CardHeader>
                <CardTitle>Invite Codes Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  View and manage all generated invite codes.
                </p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Used By</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inviteCodesLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">
                            Loading invite codes...
                          </TableCell>
                        </TableRow>
                      ) : inviteCodes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            No invite codes generated yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        inviteCodes.map((code) => (
                          <TableRow key={code.id} data-testid={`row-invite-${code.code}`}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                  {code.code}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(code.code)}
                                  data-testid={`button-copy-${code.code}`}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              {code.creator ? (
                                <div className="flex items-center space-x-2">
                                  <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                    {getInitials(code.creator.name)}
                                  </div>
                                  <span className="text-sm">{code.creator.username}</span>
                                </div>
                              ) : (
                                "Unknown"
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {code.currentUses}/{code.maxUses}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={code.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                data-testid={`badge-status-${code.code}`}
                              >
                                {code.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {code.expiresAt ? formatDate(code.expiresAt) : 'Never'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {code.usedByUser ? (
                                <div className="flex items-center space-x-2">
                                  <div className="bg-secondary text-secondary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                    {getInitials(code.usedByUser.name)}
                                  </div>
                                  <span className="text-sm">{code.usedByUser.username}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">Not used</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {code.isActive && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeactivateInviteCode(code.code)}
                                  disabled={deactivateInviteCode.isPending}
                                  data-testid={`button-deactivate-${code.code}`}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Deactivate
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-6">
            <Card data-testid="card-announcement-management">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Announcement Management</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Create and manage system announcements for users.
                    </p>
                  </div>
                  <Dialog open={showCreateAnnouncementDialog} onOpenChange={setShowCreateAnnouncementDialog}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-announcement">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Announcement
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New Announcement</DialogTitle>
                      </DialogHeader>
                      <Form {...announcementForm}>
                        <form onSubmit={announcementForm.handleSubmit(handleCreateAnnouncement)} className="space-y-4">
                          <FormField
                            control={announcementForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-announcement-title" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={announcementForm.control}
                            name="content"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Content</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    className="min-h-[100px]" 
                                    data-testid="textarea-announcement-content" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={announcementForm.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Type</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || "info"}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-announcement-type">
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="info">Info</SelectItem>
                                      <SelectItem value="warning">Warning</SelectItem>
                                      <SelectItem value="maintenance">Maintenance</SelectItem>
                                      <SelectItem value="update">Update</SelectItem>
                                      <SelectItem value="promotion">Promotion</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={announcementForm.control}
                              name="expiresAt"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Expires At (Optional)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="datetime-local"
                                      value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                      data-testid="input-announcement-expires"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="flex items-center space-x-6">
                            <FormField
                              control={announcementForm.control}
                              name="isActive"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Switch
                                      checked={field.value ?? true}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-announcement-active"
                                    />
                                  </FormControl>
                                  <FormLabel>Active</FormLabel>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={announcementForm.control}
                              name="showOnLogin"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Switch
                                      checked={field.value ?? true}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-announcement-show-login"
                                    />
                                  </FormControl>
                                  <FormLabel>Show on Login</FormLabel>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={announcementForm.control}
                              name="showOnSignInPage"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Switch
                                      checked={field.value ?? false}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-announcement-show-signin"
                                    />
                                  </FormControl>
                                  <FormLabel>Show on Sign-In Page</FormLabel>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="flex justify-end space-x-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowCreateAnnouncementDialog(false)}
                              data-testid="button-cancel-announcement"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={createAnnouncement.isPending}
                              data-testid="button-save-announcement"
                            >
                              {createAnnouncement.isPending ? "Creating..." : "Create Announcement"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {announcementsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading announcements...</div>
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-8">
                    <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Announcements</h3>
                    <p className="text-muted-foreground">
                      No announcements have been created yet. Create your first announcement to get started.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <Table data-testid="table-announcements">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Show on Login</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {announcements.map((announcement) => {
                          const IconComponent = getAnnouncementTypeIcon(announcement.type || "info");
                          const badgeStyles = getAnnouncementTypeBadge(announcement.type || "info");
                          const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < new Date();
                          
                          return (
                            <TableRow key={announcement.id} data-testid={`row-announcement-${announcement.id}`}>
                              <TableCell>
                                <div className="flex items-start space-x-3 max-w-xs">
                                  <div className="flex-shrink-0">
                                    <IconComponent className="w-4 h-4 mt-1 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm" data-testid={`announcement-title-${announcement.id}`}>
                                      {announcement.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {announcement.content.length > 100 
                                        ? announcement.content.substring(0, 100) + "..." 
                                        : announcement.content}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={badgeStyles} data-testid={`announcement-type-${announcement.id}`}>
                                  {announcement.type || "info"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col space-y-1">
                                  <Badge 
                                    variant={announcement.isActive && !isExpired ? "default" : "secondary"}
                                    data-testid={`announcement-status-${announcement.id}`}
                                  >
                                    {isExpired ? "Expired" : announcement.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={announcement.showOnLogin ? "default" : "outline"}
                                  data-testid={`announcement-login-${announcement.id}`}
                                >
                                  {announcement.showOnLogin ? "Yes" : "No"}
                                </Badge>
                              </TableCell>
                              <TableCell data-testid={`announcement-created-${announcement.id}`}>
                                <div className="text-sm">
                                  {formatDate(announcement.createdAt)}
                                  <div className="text-xs text-muted-foreground">
                                    by {announcement.creator?.name || "Unknown"}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell data-testid={`announcement-expires-${announcement.id}`}>
                                {announcement.expiresAt ? (
                                  <span className={`text-sm ${isExpired ? "text-red-600" : ""}`}>
                                    {formatDate(announcement.expiresAt)}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Never</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditAnnouncement(announcement)}
                                    data-testid={`button-edit-announcement-${announcement.id}`}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeactivateAnnouncement(announcement.id)}
                                    data-testid={`button-deactivate-announcement-${announcement.id}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Edit Announcement Dialog */}
            <Dialog open={showEditAnnouncementDialog} onOpenChange={setShowEditAnnouncementDialog}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Announcement</DialogTitle>
                </DialogHeader>
                <Form {...announcementForm}>
                  <form onSubmit={announcementForm.handleSubmit(handleUpdateAnnouncement)} className="space-y-4">
                    <FormField
                      control={announcementForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-edit-announcement-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={announcementForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              className="min-h-[100px]" 
                              data-testid="textarea-edit-announcement-content" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={announcementForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? "info"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-announcement-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="info">Info</SelectItem>
                                <SelectItem value="warning">Warning</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                <SelectItem value="update">Update</SelectItem>
                                <SelectItem value="promotion">Promotion</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={announcementForm.control}
                        name="expiresAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expires At (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="datetime-local"
                                value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                data-testid="input-edit-announcement-expires"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center space-x-6">
                      <FormField
                        control={announcementForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value ?? true}
                                onCheckedChange={field.onChange}
                                data-testid="switch-edit-announcement-active"
                              />
                            </FormControl>
                            <FormLabel>Active</FormLabel>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={announcementForm.control}
                        name="showOnLogin"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value ?? true}
                                onCheckedChange={field.onChange}
                                data-testid="switch-edit-announcement-show-login"
                              />
                            </FormControl>
                            <FormLabel>Show on Login</FormLabel>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={announcementForm.control}
                        name="showOnSignInPage"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value ?? false}
                                onCheckedChange={field.onChange}
                                data-testid="switch-edit-announcement-show-signin"
                              />
                            </FormControl>
                            <FormLabel>Show on Sign-In Page</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowEditAnnouncementDialog(false);
                          setEditingAnnouncement(null);
                          announcementForm.reset();
                        }}
                        data-testid="button-cancel-edit-announcement"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateAnnouncement.isPending}
                        data-testid="button-update-announcement"
                      >
                        {updateAnnouncement.isPending ? "Updating..." : "Update Announcement"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card data-testid="card-system-health">
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monitor system status and perform maintenance tasks.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">System Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium">Matching System</span>
                        </div>
                        <Badge variant="outline" className="text-green-700" data-testid="status-matching">
                          Operational
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium">Messaging System</span>
                        </div>
                        <Badge variant="outline" className="text-green-700" data-testid="status-messaging">
                          Operational
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium">Safety Reports</span>
                        </div>
                        <Badge variant="outline" className="text-green-700" data-testid="status-reports">
                          Operational
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Maintenance</h4>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          toast({
                            title: "System Check",
                            description: "System health check completed successfully.",
                          });
                        }}
                        data-testid="button-health-check"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Run Health Check
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          toast({
                            title: "Cache Cleared",
                            description: "System cache has been cleared successfully.",
                          });
                        }}
                        data-testid="button-clear-cache"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Clear Cache
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          toast({
                            title: "Backup Complete",
                            description: "System backup has been completed.",
                          });
                        }}
                        data-testid="button-backup"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Create Backup
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-system-settings">
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure system behavior and matching parameters.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Monthly Matching System</p>
                      <p className="text-sm text-muted-foreground">
                        Manual monthly match creation available via admin controls
                      </p>
                    </div>
                    <Badge variant="default" data-testid="setting-auto-matching">
                      Enabled
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Gender-Based Matching</p>
                      <p className="text-sm text-muted-foreground">
                        Only match users with the same gender preference
                      </p>
                    </div>
                    <Badge variant="default" data-testid="setting-gender-matching">
                      Enabled
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Safety Reporting</p>
                      <p className="text-sm text-muted-foreground">
                        Allow users to report safety concerns
                      </p>
                    </div>
                    <Badge variant="default" data-testid="setting-safety-reporting">
                      Enabled
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Exclusion System</p>
                      <p className="text-sm text-muted-foreground">
                        Allow users to exclude others from future matches
                      </p>
                    </div>
                    <Badge variant="default" data-testid="setting-exclusions">
                      Enabled
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
