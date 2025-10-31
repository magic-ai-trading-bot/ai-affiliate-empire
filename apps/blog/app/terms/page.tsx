export default function Terms() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Terms of Service
        </h1>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Agreement to Terms
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              By accessing and using AI Affiliate Empire, you agree to be bound by these Terms of Service and all
              applicable laws and regulations.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Affiliate Disclosure
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              As an Amazon Associate and affiliate of other programs, we earn from qualifying purchases. This means
              we may receive a commission when you click on or make purchases via our affiliate links. This comes at
              no additional cost to you.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Content Accuracy
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              While we strive to provide accurate and up-to-date information, product details, prices, and availability
              may change. Always verify information on the merchant&apos;s website before making a purchase.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
