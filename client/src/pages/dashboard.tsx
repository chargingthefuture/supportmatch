import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Partnership } from "@shared/schema";
import Header from "@/components/header";
import CurrentPartnership from "@/components/current-partnership";
import Messaging from "@/components/messaging";
import ProfileSidebar from "@/components/profile-sidebar";
import MatchHistory from "@/components/match-history";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CurrentPartnershipData {
  partnership: Partnership;
  partner: User;
}

interface PartnershipWithPartner {
  partnership: Partnership;
  partner: User;
}

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [showMessaging, setShowMessaging] = useState(false);
  const { toast } = useToast();

  // Fetch current partnership
  const { data: currentPartnership, isLoading: partnershipLoading } = useQuery<CurrentPartnershipData | null>({
    queryKey: ['/api/partnerships/current'],
  });

  // Fetch partnership history for count
  const { data: partnershipHistory = [] } = useQuery<PartnershipWithPartner[]>({
    queryKey: ['/api/partnerships/history'],
  });

  // Create exclusion mutation
  const createExclusion = useMutation({
    mutationFn: async ({ excludedUserId, reason }: { excludedUserId: string; reason?: string }) => {
      return apiRequest('POST', '/api/exclusions', {
        excludedUserId,
        reason: reason || "User preference"
      });
    },
    onSuccess: () => {
      toast({
        title: "User Excluded",
        description: "This user will not be matched with you in the future.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/partnerships/history'] });
    },
    onError: (error: any) => {
      const message = error.message || "Failed to exclude user";
      const isAlreadyExcluded = error.message === "User is already excluded";
      
      toast({
        title: isAlreadyExcluded ? "Already Excluded" : "Error",
        description: isAlreadyExcluded ? "This user has already been excluded." : message,
        variant: isAlreadyExcluded ? "default" : "destructive",
      });
      
      // Invalidate exclusions query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/exclusions'] });
    },
  });

  // Create report mutation
  const createReport = useMutation({
    mutationFn: async ({ reportedUserId, partnershipId, reason, description }: {
      reportedUserId: string;
      partnershipId?: string;
      reason: string;
      description?: string;
    }) => {
      return apiRequest('POST', '/api/reports', {
        reportedUserId,
        partnershipId,
        reason,
        description
      });
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Your safety report has been submitted. An admin will review it shortly.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    setShowMessaging(true);
  };

  const handleReportIssue = async (partnerId: string) => {
    if (!currentPartnership) return;
    
    await createReport.mutateAsync({
      reportedUserId: partnerId,
      partnershipId: currentPartnership.partnership.id,
      reason: "Partnership issue",
      description: "Issue reported from partnership dashboard"
    });
  };

  const handleManageExclusions = () => {
    // Navigate to profile page with exclusions tab
    window.location.href = '/profile?tab=exclusions';
  };

  const handleReportSafety = () => {
    toast({
      title: "Safety Report",
      description: "Safety reporting interface would open here.",
    });
  };


  const handleExcludeUser = async (userId: string, reason?: string) => {
    await createExclusion.mutateAsync({ excludedUserId: userId, reason });
  };

  if (partnershipLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-muted-foreground">Loading dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-dashboard">
      <Header user={user} hasActiveMatch={!!currentPartnership} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {currentPartnership ? (
            <>
              <CurrentPartnership 
                partnership={currentPartnership.partnership}
                partner={currentPartnership.partner}
                currentUser={user}
                onSendMessage={handleSendMessage}
                onReportIssue={handleReportIssue}
              />

              {showMessaging && (
                <div className="lg:col-span-2">
                  <Messaging 
                    partnership={currentPartnership.partnership}
                    currentUser={user}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="lg:col-span-2">
              <div className="bg-card rounded-lg border border-border p-8 text-center" data-testid="no-current-partnership">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">No Active Partnership</h3>
                <p className="text-muted-foreground mb-4">
                  You'll be matched with an accountability partner when new matches are created.
                </p>
                <p className="text-sm text-muted-foreground">
                  Matching is based on your gender preferences and safety settings.
                </p>
              </div>
            </div>
          )}

          <ProfileSidebar 
            user={user}
            partnershipCount={partnershipHistory.length}
            onManageExclusions={handleManageExclusions}
            onReportSafety={handleReportSafety}
          />
        </div>

        <MatchHistory 
          currentUser={user}
          onExcludeUser={handleExcludeUser}
        />
      </div>
    </div>
  );
}
