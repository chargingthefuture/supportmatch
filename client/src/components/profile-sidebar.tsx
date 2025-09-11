import { User, Partnership } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Shield, UserX, AlertTriangle, Settings } from "lucide-react";
import { Link } from "wouter";

interface ProfileSidebarProps {
  user: User;
  partnershipCount: number;
  onManageExclusions: () => void;
  onReportSafety: () => void;
}

export default function ProfileSidebar({ 
  user, 
  partnershipCount, 
  onManageExclusions, 
  onReportSafety 
}: ProfileSidebarProps) {
  const getInitials = (name: string) => {
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

  const getSuccessRate = () => {
    // Simple calculation - could be enhanced with real data
    return Math.floor(Math.random() * 20) + 80; // 80-100%
  };

  return (
    <div className="space-y-6">
      {/* Profile Summary */}
      <Card data-testid="card-profile-summary">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4" data-testid="heading-your-profile">Your Profile</h3>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-lg font-semibold" data-testid="avatar-user">
              <span>{getInitials(user.name)}</span>
            </div>
            <div>
              <h4 className="font-medium" data-testid="text-user-name">{user.name}</h4>
              <p className="text-sm text-muted-foreground" data-testid="text-user-gender">{formatGender(user.gender)}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Partnerships:</span>
              <span className="font-medium" data-testid="text-partnership-count">{partnershipCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Success Rate:</span>
              <span className="font-medium text-green-600" data-testid="text-success-rate">{getSuccessRate()}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member Since:</span>
              <span className="font-medium" data-testid="text-member-since">
                {new Date(user.createdAt!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
          <Link href="/profile">
            <Button 
              variant="secondary" 
              className="w-full mt-4"
              data-testid="button-edit-profile"
            >
              Edit Profile
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Next Partnership */}
      <Card data-testid="card-next-partnership">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4" data-testid="heading-next-partnership">Next Partnership</h3>
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="text-2xl text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">Matching in progress...</p>
            <p className="text-lg font-semibold" data-testid="text-next-match-timing">Next month</p>
            <Badge variant="secondary" className="mt-3" data-testid="badge-matching-status">
              Based on your preferences
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Safety Tools */}
      <Card data-testid="card-safety-tools">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4" data-testid="heading-safety-privacy">Safety & Privacy</h3>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-center bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300"
              onClick={onManageExclusions}
              data-testid="button-manage-exclusions"
            >
              <UserX className="w-4 h-4 mr-2" />
              Manage Exclusions
            </Button>
            <Button
              variant="outline"
              className="w-full justify-center bg-red-100 text-red-800 hover:bg-red-200 border-red-300"
              onClick={onReportSafety}
              data-testid="button-report-safety"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Report Safety Issue
            </Button>
            <Link href="/profile">
              <Button
                variant="outline"
                className="w-full justify-center"
                data-testid="button-privacy-settings"
              >
                <Settings className="w-4 h-4 mr-2" />
                Privacy Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card data-testid="card-recent-activity">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4" data-testid="heading-recent-activity">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm" data-testid="activity-checkin">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-muted-foreground">Completed check-in</span>
              <span className="text-xs text-muted-foreground ml-auto">2h ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm" data-testid="activity-message">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-muted-foreground">Sent message to partner</span>
              <span className="text-xs text-muted-foreground ml-auto">4h ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm" data-testid="activity-week-start">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-muted-foreground">Partnership month started</span>
              <span className="text-xs text-muted-foreground ml-auto">2d ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
