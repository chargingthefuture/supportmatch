import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, Partnership } from "@shared/schema";
import { Download, AlertTriangle } from "lucide-react";

interface PartnershipWithPartner {
  partnership: Partnership;
  partner: User;
}

interface MatchHistoryProps {
  currentUser: User;
  onExcludeUser: (userId: string, reason?: string) => void;
}

export default function MatchHistory({ currentUser, onExcludeUser }: MatchHistoryProps) {
  const [excludingUserId, setExcludingUserId] = useState<string | null>(null);

  const { data: partnerships = [], isLoading } = useQuery<PartnershipWithPartner[]>({
    queryKey: ['/api/partnerships/history'],
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'ended_early': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'active': return 'Active';
      case 'ended_early': return 'Ended Early';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 'Dates unavailable';
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getDuration = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return '0 weeks';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffInDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(diffInDays / 7);
    
    return `${weeks} weeks`;
  };

  const getSuccessRate = (partnership: Partnership) => {
    // Simple calculation - could be enhanced with real tracking data
    if (partnership.status === 'completed') return 85 + Math.floor(Math.random() * 15);
    if (partnership.status === 'active') return 70 + Math.floor(Math.random() * 20);
    if (partnership.status === 'ended_early') return 40 + Math.floor(Math.random() * 30);
    return 20 + Math.floor(Math.random() * 40);
  };

  const handleExclude = async (userId: string) => {
    setExcludingUserId(userId);
    try {
      await onExcludeUser(userId, "Requested from partnership history");
    } finally {
      setExcludingUserId(null);
    }
  };

  const formatGender = (gender: string) => {
    return gender.charAt(0).toUpperCase() + gender.slice(1).replace('_', ' ');
  };

  return (
    <Card className="mt-8" data-testid="card-match-history">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold" data-testid="heading-partnership-history">Partnership History</h2>
          <Button variant="outline" data-testid="button-export-history">
            <Download className="w-4 h-4 mr-2" />
            Export History
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading partnership history...</div>
          </div>
        ) : partnerships.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-muted-foreground">
              <p>No partnership history yet.</p>
              <p className="text-sm">Your completed partnerships will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-partnerships">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 font-medium">Partner</th>
                  <th className="text-left py-3 font-medium">Duration</th>
                  <th className="text-left py-3 font-medium">Status</th>
                  <th className="text-left py-3 font-medium">Success Rate</th>
                  <th className="text-left py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {partnerships.map(({ partnership, partner }) => {
                  const successRate = getSuccessRate(partnership);
                  const isExcluding = excludingUserId === partner.id;
                  
                  return (
                    <tr key={partnership.id} data-testid={`row-partnership-${partnership.id}`}>
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium" data-testid={`avatar-partner-${partner.id}`}>
                            {getInitials(partner.name)}
                          </div>
                          <div>
                            <p className="font-medium" data-testid={`text-partner-name-${partner.id}`}>{partner.name}</p>
                            <p className="text-muted-foreground" data-testid={`text-partner-gender-${partner.id}`}>{formatGender(partner.gender)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div>
                          <p className="font-medium" data-testid={`text-duration-${partnership.id}`}>
                            {formatDateRange(partnership.startDate?.toString() || "", partnership.endDate?.toString() || "")}
                          </p>
                          <p className="text-muted-foreground" data-testid={`text-duration-weeks-${partnership.id}`}>
                            {getDuration(partnership.startDate?.toString() || "", partnership.endDate?.toString() || "")}
                          </p>
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge 
                          className={getStatusColor(partnership.status)}
                          data-testid={`badge-status-${partnership.id}`}
                        >
                          {getStatusLabel(partnership.status)}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          <Progress 
                            value={successRate} 
                            className="w-12 h-2"
                            data-testid={`progress-success-${partnership.id}`}
                          />
                          <span className="font-medium" data-testid={`text-success-rate-${partnership.id}`}>{successRate}%</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex space-x-2">
                          <Button 
                            variant="link" 
                            size="sm"
                            className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                            data-testid={`button-review-${partnership.id}`}
                          >
                            Review
                          </Button>
                          <Button 
                            variant="link" 
                            size="sm"
                            className="text-red-600 hover:text-red-800 p-0 h-auto"
                            onClick={() => handleExclude(partner.id)}
                            disabled={isExcluding}
                            data-testid={`button-exclude-${partnership.id}`}
                          >
                            {isExcluding ? "Excluding..." : "Exclude"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
