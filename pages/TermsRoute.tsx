import { Layout } from './Layout';

export function TermsRoute() {
  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
        <div className="space-y-4 text-gray-700">
          <section>
            <p>
              By using Sendly, you agree to these terms. The service allows you to create and send gift cards on the blockchain.
            </p>
          </section>
          
          <section>
            <p>
              You are responsible for your account and all transactions. Blockchain transactions are final and cannot be reversed.
            </p>
          </section>
          
          <section>
            <p>
              We may update these terms at any time. Continued use of the service means you accept the updated terms.
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




