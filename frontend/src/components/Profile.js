import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Crown, User } from 'lucide-react';
import PlanInfo from './PlanInfo';
import { useAuth, api } from '../contexts/AuthContext';

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Profile = ({ user, stats, onClose, isOpen }) => {
  const { setUser } = useAuth();
  const [upgradeInProgress, setUpgradeInProgress] = useState(false);

  const handleUpgradeToPremium = async () => {
    setUpgradeInProgress(true);
    
    // Load Razorpay script
    const isLoaded = await loadRazorpay();
    if (!isLoaded) {
      alert("Razorpay SDK failed to load. Are you online?");
      setUpgradeInProgress(false);
      return;
    }

    try {
      // 1. Create order on backend
      const response = await api.post('/api/payment/create-order');
      const { order_id, amount, currency, key_id } = response.data;

      // 2. Open Razorpay Checkout
      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "Todo SaaS",
        description: "Premium Plan Upgrade",
        order_id: order_id,
        handler: async function (res) {
          try {
            // 3. Verify payment on backend
            const verifyResponse = await api.post('/api/payment/verify', {
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
            });

            if (verifyResponse.data.status === "success") {
              alert("Payment successful! You are now a Premium user.");
              // Update global user state seamlessly
              setUser(prev => ({ ...prev, plan: "premium" }));
            }
          } catch (err) {
            console.error(err);
            alert("Payment verification failed! " + (err.response?.data?.detail || ""));
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: "#000000",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on("payment.failed", function (response) {
        alert("Payment failed! Please try again.");
      });
      paymentObject.open();

    } catch (error) {
       console.error("Error creating order:", error);
       alert("Error creating order: " + (error.response?.data?.detail || error.message));
    } finally {
      setUpgradeInProgress(false);
    }
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
