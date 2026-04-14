import React from 'react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { CheckSquare, Crown } from 'lucide-react';

const PlanInfo = ({ plan, totalTasks, onUpgrade, isUpgrading = false }) => {
  const MAX_TASKS_NORMAL = 5;
  const isPremium = plan === 'premium';
  const tasksRemaining = Math.max(0, MAX_TASKS_NORMAL - totalTasks);
  const progressPercentage = isPremium ? 100 : (totalTasks / MAX_TASKS_NORMAL) * 100;

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-xl border border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-primary/20 rounded-lg">
          <Crown className={`w-4 h-4 ${isPremium ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <h3 className="font-semibold text-sm">
          {isPremium ? 'Premium Plan' : 'Normal Plan'}
        </h3>
      </div>

      {isPremium ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary flex items-center gap-2">
            <CheckSquare className="w-4 h-4" /> Unlimited tasks
          </p>
          <p className="text-xs text-muted-foreground">
            You have full access to all features without any limits.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-foreground">
                Tasks left: <span className="text-primary font-bold">{tasksRemaining}</span> / {MAX_TASKS_NORMAL}
              </p>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground">
            {totalTasks >= MAX_TASKS_NORMAL 
              ? "Task limit reached. Upgrade to create more tasks." 
              : `Create ${tasksRemaining} more task${tasksRemaining !== 1 ? 's' : ''} before reaching your limit.`}
          </p>
          <Button 
            className="w-full text-sm mt-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            onClick={onUpgrade}
            disabled={isUpgrading}
            data-testid="upgrade-to-premium-btn"
          >
            {isUpgrading ? 'Processing...' : 'Upgrade to Premium'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PlanInfo;
