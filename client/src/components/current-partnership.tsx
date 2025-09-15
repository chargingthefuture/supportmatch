import { User, Partnership } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, AlertTriangle, Clock, MapPin } from "lucide-react";
import { useState } from "react";

interface CurrentPartnershipProps {
  partnership: Partnership;
  partner: User;
  currentUser: User;
  onSendMessage: () => void;
  onReportIssue: (partnerId: string) => void;
}

export default function CurrentPartnership({ 
  partnership, 
  partner, 
  currentUser, 
  onSendMessage, 
  onReportIssue 
}: CurrentPartnershipProps) {
  const [isReporting, setIsReporting] = useState(false);

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

  const getWeekProgress = () => {
    const start = new Date(partnership.startDate);
    const end = new Date(partnership.endDate);
    const now = new Date();
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const progress = Math.min(Math.max(elapsed / totalDuration, 0), 1);
    
    const totalWeeks = Math.ceil(totalDuration / (7 * 24 * 60 * 60 * 1000));
    const currentWeek = Math.ceil(elapsed / (7 * 24 * 60 * 60 * 1000));
    
    return { currentWeek: Math.max(1, currentWeek), totalWeeks, progress };
  };

  const { currentWeek, totalWeeks } = getWeekProgress();

  const formatGender = (gender: string | null) => {
    if (!gender) return 'Not specified';
    return gender.charAt(0).toUpperCase() + gender.slice(1).replace('_', ' ');
  };


  const handleReport = async () => {
    setIsReporting(true);
    try {
      await onReportIssue(partner.id);
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="lg:col-span-2">
      <Card data-testid="card-current-partnership">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold" data-testid="heading-current-partnership">Current Partnership</h2>
            <Badge variant="secondary" data-testid="badge-week-progress">
              Week {currentWeek} of {totalWeeks}
            </Badge>
          </div>

          <div className="partnership-gradient rounded-lg p-6 mb-6" data-testid="section-partner-info">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-semibold" data-testid="avatar-partner">
                <span>{getInitials(partner.name)}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2" data-testid="text-partner-name">{partner.name}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span data-testid="text-partner-gender">{formatGender(partner.gender)}</span>
                  </div>
                  {partner.timezone && (
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2" />
                      <span data-testid="text-partner-timezone">{partner.timezone}</span>
                    </div>
                  )}
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2" />
                    <span data-testid="text-partner-joined">Joined {new Date(partner.createdAt!).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-blue-200">
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={onSendMessage}
                  data-testid="button-send-message"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleReport}
                  disabled={isReporting}
                  className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300"
                  data-testid="button-report-issue"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {isReporting ? "Reporting..." : "Report Issue"}
                </Button>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
