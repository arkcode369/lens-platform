'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth/client';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';

interface UsageData {
  plan: {
    id: string;
    name: string;
    price: number;
  };
  limits: {
    validationsPerMonth: number;
    maxTeamMembers: number;
    advancedFeatures: boolean;
    prioritySupport: boolean;
  };
  usage: {
    validationsThisMonth: number;
    validationsLimit: number;
    usagePercentage: number;
    remainingValidations: number;
  };
  subscription: {
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export default function BillingSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelMode, setCancelMode] = useState<'none' | 'period' | 'immediate'>('none');

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/billing/usage');
      const data = await response.json();
      setUsage(data);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
      setError('Failed to load billing information');
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/billing`,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      setError('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    try {
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchUsage();
        alert('Subscription upgraded successfully!');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Upgrade error:', error);
      setError(error.message || 'Failed to upgrade subscription');
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    if (cancelMode === 'none') return;

    setLoading('cancel');
    try {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancelAtPeriodEnd: cancelMode === 'period',
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchUsage();
        setCancelMode('none');
        alert(
          data.cancelAtPeriodEnd
            ? 'Subscription will be canceled at the end of the period'
            : 'Subscription canceled immediately'
        );
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Cancel error:', error);
      setError(error.message || 'Failed to cancel subscription');
    } finally {
      setLoading(null);
    }
  };

  if (!usage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const currentPlan = SUBSCRIPTION_PLANS[usage.plan.id as keyof typeof SUBSCRIPTION_PLANS];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Billing Settings
        </h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Current Plan
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {usage.plan.name}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                ${usage.plan.price / 100}/month
              </p>
              {usage.subscription?.cancelAtPeriodEnd && (
                <p className="text-orange-600 dark:text-orange-400 mt-2">
                  Will cancel on{' '}
                  {new Date(usage.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
            >
              {portalLoading ? 'Loading...' : 'Manage Billing'}
            </button>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Usage This Month
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">
                  Validations
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {usage.usage.validationsThisMonth} /{' '}
                  {usage.usage.validationsLimit === Infinity
                    ? 'Unlimited'
                    : usage.usage.validationsLimit}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-indigo-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min(usage.usage.usagePercentage, 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {usage.usage.remainingValidations === Infinity
                  ? 'Unlimited validations available'
                  : `${usage.usage.remainingValidations} validations remaining`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Team Members
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {usage.limits.maxTeamMembers === Infinity
                    ? 'Unlimited'
                    : usage.limits.maxTeamMembers}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Advanced Features
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {usage.limits.advancedFeatures ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Options */}
        {usage.plan.id !== 'enterprise' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Upgrade Plan
            </h2>
            <div className="space-y-4">
              {['individual', 'team', 'enterprise'].map((planId) => {
                const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
                if (usage.plan.id === planId) return null;
                if (
                  ['team', 'enterprise'].includes(usage.plan.id) &&
                  planId === 'individual'
                )
                  return null;

                return (
                  <div
                    key={planId}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {plan.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ${plan.price / 100}/month
                      </p>
                    </div>
                    <button
                      onClick={() => handleUpgrade(planId)}
                      disabled={loading === planId}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                    >
                      {loading === planId ? 'Processing...' : 'Upgrade'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancel Subscription */}
        {usage.subscription && usage.subscription.status !== 'canceled' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
              Cancel Subscription
            </h2>
            {cancelMode === 'none' ? (
              <button
                onClick={() => setCancelMode('period')}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Cancel Subscription
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Are you sure you want to cancel your subscription?
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setCancelMode('period')}
                    disabled={loading === 'cancel'}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                  >
                    Cancel at Period End
                  </button>
                  <button
                    onClick={() => setCancelMode('immediate')}
                    disabled={loading === 'cancel'}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    Cancel Immediately
                  </button>
                  <button
                    onClick={() => setCancelMode('none')}
                    disabled={loading === 'cancel'}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Keep Subscription
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
