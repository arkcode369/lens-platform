'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=/pricing`);
      return;
    }

    setLoading(planId);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/billing/success`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to create checkout session. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      ...SUBSCRIPTION_PLANS.FREE,
      popular: false,
      buttonText: 'Current Plan',
      disabled: true,
    },
    {
      ...SUBSCRIPTION_PLANS.INDIVIDUAL,
      popular: true,
      buttonText: 'Get Started',
      disabled: false,
    },
    {
      ...SUBSCRIPTION_PLANS.TEAM,
      popular: false,
      buttonText: 'Get Started',
      disabled: false,
    },
    {
      ...SUBSCRIPTION_PLANS.ENTERPRISE,
      popular: false,
      buttonText: 'Contact Sales',
      disabled: false,
      custom: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose the Perfect Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Start free and scale as you grow. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 ${
                plan.popular ? 'ring-2 ring-indigo-500 transform scale-105' : ''
              } ${plan.custom ? 'lg:col-span-1' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${plan.price / 100}
                  </span>
                  <span className="ml-2 text-gray-500 dark:text-gray-400">
                    /month
                  </span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {plan.features.validationsPerMonth === Infinity
                    ? 'Unlimited validations'
                    : `${plan.features.validationsPerMonth} validations/month`}
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {plan.features.maxTeamMembers === Infinity
                    ? 'Unlimited team members'
                    : `${plan.features.maxTeamMembers} team members`}
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {plan.features.advancedFeatures
                    ? 'Advanced AI features'
                    : 'Basic features'}
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {plan.features.prioritySupport
                    ? 'Priority support'
                    : 'Standard support'}
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={plan.disabled || loading === plan.id}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  plan.disabled
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                    : 'bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white'
                }`}
              >
                {loading === plan.id ? 'Processing...' : plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes! You can upgrade or downgrade your plan at any time from your
                billing settings. Changes take effect immediately with prorated
                billing.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                We accept all major credit cards (Visa, Mastercard, American
                Express) through Stripe. Enterprise plans can also pay via invoice.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes! All paid plans come with a 14-day free trial. No credit card
                required to start.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                What happens if I exceed my limits?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                You'll be notified when you're approaching your limits. Once you
                reach the limit, you'll need to upgrade your plan or wait until the
                next billing cycle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
