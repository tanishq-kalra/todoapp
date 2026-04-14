import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { CheckSquare, Crown, User } from 'lucide-react';
import PlanInfo from './PlanInfo';

const Profile = ({ user, stats, onClose, isOpen }) => {
  const [upgradeInProgress, setUpgradeInProgress] = useState(false);

  const handleUpgradeToPremium = () => {
    setUpgradeInProgress(true);
    // TODO: Integrate Razorpay here
    // For now, just show a message
    setTimeout(() => {
      alert('Premium upgrade will be available soon! Razorpay integration coming.');
      setUpgradeInProgress(false);
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Profile</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-6">
          {/* User Info Card */}
          <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-2xl border border-border">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary uppercase tracking-wide">
              {user?.plan === 'premium' ? <Crown className="w-3.5 h-3.5" /> : null}
              <span>{user?.plan || 'normal'} PLAN</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-card border border-border p-3 rounded-xl">
              <p className="text-3xl font-bold text-primary" data-testid="profile-total-tasks">{stats?.total || 0}</p>
              <p className="text-xs text-muted-foreground uppercase mt-1 tracking-wider">Created</p>
            </div>
            <div className="bg-card border border-border p-3 rounded-xl">
              <p className="text-3xl font-bold text-green-600" data-testid="profile-completed-tasks">{stats?.completed || 0}</p>
              <p className="text-xs text-muted-foreground uppercase mt-1 tracking-wider">Completed</p>
            </div>
            <div className="bg-card border border-border p-3 rounded-xl">
              <p className="text-3xl font-bold text-amber-600" data-testid="profile-pending-tasks">{stats?.pending || 0}</p>
              <p className="text-xs text-muted-foreground uppercase mt-1 tracking-wider">Pending</p>
            </div>
          </div>

          {/* Plan Info Component */}
          <PlanInfo 
            plan={user?.plan} 
            totalTasks={stats?.total || 0}
            onUpgrade={handleUpgradeToPremium}
            isUpgrading={upgradeInProgress}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Profile;
