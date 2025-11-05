import { Layout } from './Layout';

export function PrivacyRoute() {
  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <div className="space-y-4 text-gray-700">
          <section>
            <p>
              We collect information you provide when using Sendly, such as wallet addresses and account information.
            </p>
          </section>
          
          <section>
            <p>
              We use this information to provide and improve our services. Blockchain transactions are public and visible on the blockchain.
            </p>
          </section>
          
          <section>
            <p>
              We use third-party services for authentication. These services may collect information according to their own privacy policies.
            </p>
          </section>
          
          <section>
            <p>
              We protect your information with security measures, but no method is 100% secure. You can contact us to update or delete your information.
            </p>
          </section>
          
          <section>
            <p>
              We may update this policy from time to time. Changes will be posted on this page.
            </p>
          </section>
          
          <section>
            <p className="text-sm text-gray-500 mt-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}




