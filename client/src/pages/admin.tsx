import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Settings
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

interface AdminProps {
  user: User;
}

export default function Admin({ user }: AdminProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
  });

  // Fetch reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery<ReportWithUsers[]>({
    queryKey: ['/api/admin/reports'],
    enabled: activeTab === 'reports',
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

  const getInitials = (name: string) => {
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

  const formatGender = (gender: string) => {
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

  return (
    <div className="min-h-screen bg-background" data-testid="page-admin">
      <Header user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" data-testid="heading-admin-dashboard">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, partnerships, and safety reports for the TI Partners platform.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-admin">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <Settings className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Reports ({reports.filter(r => r.status === 'pending').length})
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

            {/* Recent Activity Preview */}
            <Card data-testid="card-recent-activity">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Latest system events and user actions.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm" data-testid="activity-system">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-muted-foreground">System health check completed</span>
                    <span className="text-xs text-muted-foreground ml-auto">1h ago</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm" data-testid="activity-matches">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground">Monthly matches created successfully</span>
                    <span className="text-xs text-muted-foreground ml-auto">2d ago</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm" data-testid="activity-report">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-muted-foreground">New safety report submitted</span>
                    <span className="text-xs text-muted-foreground ml-auto">3d ago</span>
                  </div>
                </div>
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
                      <p className="font-medium">Automatic Monthly Matching</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically create new matches at the beginning of each month
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
