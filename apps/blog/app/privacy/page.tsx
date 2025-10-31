export default function Privacy() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Privacy Policy
        </h1>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Information We Collect
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              We collect information that you provide directly to us, including when you subscribe to our newsletter,
              create an account, or contact us for support.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              How We Use Your Information
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              We use the information we collect to provide, maintain, and improve our services, send you newsletters
              and updates, and respond to your requests.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Data Security
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              We implement appropriate security measures to protect your personal information against unauthorized access,
              alteration, disclosure, or destruction.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
