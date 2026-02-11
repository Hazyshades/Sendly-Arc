import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Gift, BookOpen, Calendar, ArrowLeft, Tag, Clock } from 'lucide-react';

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tags: string[];
  readTime?: string;
  content: string;
  sections?: BlogSection[];
  images?: BlogImage[];
}

interface BlogSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  imageId?: string;
}

interface BlogImage {
  id: string;
  src: string;
  alt: string;
  caption: string;
}

const blogPosts: Record<string, BlogPost> = {
  testnet: {
    slug: 'testnet',
    title: 'Testnet Tutorial: How to work with Sendly',
    description:
      'A quick overview of what is live on the Sendly testnet and how payments stay fast, predictable, and cheap.',
    date: '2026-01-07',
    category: 'Tutorial',
    tags: ['Testnet', 'Tutorial', 'ARC'],
    readTime: '5 min',
    images: [
      {
        id: 'lanes',
        src: '/images/blog/testnet-lanes.svg',
        alt: 'Dedicated payment lanes diagram',
        caption: 'Dedicated lanes keep payment traffic isolated.'
      },
      {
        id: 'fees',
        src: '/images/blog/testnet-fees.svg',
        alt: 'Stablecoin gas fee flow',
        caption: 'Fees paid directly in USD stablecoins.'
      },
      {
        id: 'dex',
        src: '/images/blog/testnet-dex.svg',
        alt: 'Built-in stable asset DEX',
        caption: 'Native DEX routes stable asset swaps.'
      }
    ],
    sections: [
      {
        id: 'whats-live',
        title: "What's live on the testnet",
        paragraphs: [
          'Sendly testnet focuses on reliable, high-throughput payments with predictable fees.',
          'Below is a quick overview of the core capabilities that are already live.'
        ]
      },
      {
        id: 'dedicated-payment-lanes',
        title: 'Dedicated payment lanes',
        paragraphs: [
          'Payments have guaranteed blockspace reserved at the protocol level.',
          'They do not compete with NFT mints, liquidations, or high-frequency contract calls.',
          'Fees stay low and stable even when other network activity spikes.'
        ],
        bullets: [
          'Target fee: one‑tenth of a cent per payment.',
          'Predictable economics for high-volume flows.',
          'No congestion-driven downtime for processors.'
        ],
        imageId: 'lanes'
      },
      {
        id: 'stablecoin-native-gas',
        title: 'Stablecoin-native gas',
        paragraphs: [
          'Transaction fees can be paid directly in USD‑denominated stablecoins.',
          'This removes the need for volatile gas tokens and keeps costs predictable.',
          'Wallets and custodians no longer need to hold extra assets just for gas.'
        ],
        imageId: 'fees'
      },
      {
        id: 'built-in-stable-asset-dex',
        title: 'Built‑in stable asset DEX',
        paragraphs: [
          'Sendly includes a native DEX optimized for stablecoins and tokenized deposits.',
          'Users can pay fees in any USD stablecoin, and validators can receive fees in any USD stablecoin.',
          'The protocol automatically routes to the best stable asset pool.'
        ],
        imageId: 'dex'
      },
      {
        id: 'payments-metadata',
        title: 'Payments and transfers metadata',
        paragraphs: [
          'Attach metadata to payments and transfers for richer reconciliation.',
          'Use structured references to power dashboards, invoices, or dispute flows.'
        ]
      },
      {
        id: 'fast-finality',
        title: 'Fast, deterministic finality',
        paragraphs: [
          'Finality is quick and deterministic, so payment status updates are immediate.',
          'This makes it safer to build real‑time payout and merchant experiences.'
        ]
      },
      {
        id: 'wallet-signing',
        title: 'Modern wallet signing methods',
        paragraphs: [
          'Support for modern signing schemes improves UX across desktop and mobile.',
          'Built‑in account abstraction workflows reduce friction for first‑time users.'
        ]
      }
    ],
    content: `
# Testnet Tutorial: How to work with Sendly

We are happy to announce the launch of Sendly on ARC Testnet!

## How it works?
   `
  }
};

export function BlogPostRoute() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [activeImage, setActiveImage] = useState<BlogImage | null>(null);

  const post = slug ? blogPosts[slug] : null;

  if (!post) {
    return (
      <div className="min-h-screen" style={{ 
        background: 'linear-gradient(135deg, #fef2f2 0%, #e0e7ff 100%)'
      }}>
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <span className="text-gray-900 text-xl font-semibold">Sendly</span>
              </Link>
              <Link 
                to="/blog" 
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                ← Back to blog
              </Link>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-6 py-12 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Post Not Found</h1>
            <p className="text-gray-600 mb-6">The requested post does not exist.</p>
            <button
              onClick={() => navigate('/blog')}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to blog
            </button>
          </div>
        </main>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Simple markdown-like content rendering
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: ReactNode[] = [];
    let currentParagraph: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let currentList: string[] = [];
    let listKey = 0;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        elements.push(
          <p key={`p-${elements.length}`} className="mb-4 text-gray-700 leading-relaxed text-lg">
            {currentParagraph.join(' ')}
          </p>
        );
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${listKey++}`} className="list-disc list-inside mb-6 space-y-2 text-gray-700 text-lg ml-4">
            {currentList.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, index) => {
      if (line.trim().startsWith('```')) {
        flushList();
        flushParagraph();
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-6">
              <code className="text-sm">{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      if (line.trim().startsWith('# ')) {
        flushList();
        flushParagraph();
        elements.push(
          <h2 key={`h2-${index}`} className="text-4xl font-bold text-gray-900 mt-12 mb-6">
            {line.replace('# ', '')}
          </h2>
        );
      } else if (line.trim().startsWith('## ')) {
        flushList();
        flushParagraph();
        elements.push(
          <h3 key={`h3-${index}`} className="text-3xl font-semibold text-gray-900 mt-8 mb-4">
            {line.replace('## ', '')}
          </h3>
        );
      } else if (line.trim().startsWith('### ')) {
        flushList();
        flushParagraph();
        elements.push(
          <h4 key={`h4-${index}`} className="text-2xl font-semibold text-gray-900 mt-6 mb-3">
            {line.replace('### ', '')}
          </h4>
        );
      } else if (line.trim().startsWith('- ')) {
        flushParagraph();
        currentList.push(line.replace('- ', ''));
      } else if (/^\d+\./.test(line.trim())) {
        flushParagraph();
        currentList.push(line.replace(/^\d+\.\s*/, ''));
      } else if (line.trim() === '') {
        flushList();
        flushParagraph();
      } else {
        flushList();
        currentParagraph.push(line.trim());
      }
    });

    flushList();
    flushParagraph();

    return <div className="prose prose-lg max-w-none">{elements}</div>;
  };

  useEffect(() => {
    if (!activeImage) {
      return;
    }

    // Close the image preview on Escape for better accessibility.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveImage(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeImage]);

  const renderSections = (sections: BlogSection[], images: BlogImage[]) => {
    const imageMap = new Map(images.map((image) => [image.id, image]));

    return (
      <div className="space-y-12">
        {sections.map((section, index) => {
          const sectionImage = section.imageId ? imageMap.get(section.imageId) : null;
          const isLastSection = index === sections.length - 1;

          return (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-[280px,minmax(0,1fr)] gap-10"
            >
              <div>
                {sectionImage && (
                  <button
                    type="button"
                    onClick={() => setActiveImage(sectionImage)}
                    className="w-full text-left"
                    aria-label={`Open image: ${sectionImage.caption}`}
                  >
                    <img
                      src={sectionImage.src}
                      alt={sectionImage.alt}
                      loading="lazy"
                      className="w-full h-40 object-cover rounded-xl"
                    />
                    <div className="mt-3 text-sm text-gray-600">{sectionImage.caption}</div>
                  </button>
                )}
              </div>
              <div className={`px-12 md:px-22 ${isLastSection ? 'pb-12 md:pb-22' : ''}`}>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {section.title}
                </h2>
                <div className="space-y-4 text-gray-700 text-lg leading-relaxed">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="list-disc list-inside mt-6 space-y-2 text-gray-700 text-lg">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  const hasEnhancedLayout = Boolean(post.sections?.length && post.images?.length);

  return (
    <div className="min-h-screen" style={{ 
      background: 'linear-gradient(135deg, #fef2f2 0%, #e0e7ff 100%)'
    }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <span className="text-gray-900 text-xl font-semibold">Sendly</span>
            </Link>
            <Link 
              to="/blog" 
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to blog
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-[1450px]">
        {hasEnhancedLayout ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-10">
            {/* Center Content */}
            <article
              className="relative"
              style={{ ['--content-gap' as string]: '2.5rem' }}
            >
              <div className="absolute inset-y-0 right-0 rounded-2xl bg-white shadow-lg border border-gray-100" style={{ left: 'calc(280px + var(--content-gap))' }} />
              <div className="relative space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-[280px,minmax(0,1fr)] gap-10">
                  <div />
                  <div className="px-12 md:px-22 pt-12 md:pt-22">
                    {/* Meta info */}
                    <div className="flex items-center gap-3 mb-6">
                      <span className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                        {post.category}
                      </span>
                      {post.readTime && (
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {post.readTime}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                      {post.title}
                    </h1>

                    {/* Description */}
                    <p className="text-xl text-gray-600 mb-8">
                      {post.description}
                    </p>

                    {/* Date and Tags */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-200 mb-10">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(post.date)}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-gray-50 text-gray-600 text-sm rounded-md flex items-center gap-1"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Article Content */}
                {post.sections && post.images
                  ? renderSections(post.sections, post.images)
                  : renderContent(post.content)}

                {/* Footer */}
                <div className="grid grid-cols-1 lg:grid-cols-[280px,minmax(0,1fr)] gap-10">
                  <div />
                  <div className="px-12 md:px-22 pb-12 md:pb-22">
                    <div className="mt-12 pt-8 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => navigate('/blog')}
                          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          All posts
                        </button>
                        <div className="text-sm text-gray-500">
                          Published {formatDate(post.date)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Right Table of Contents */}
            <aside className="lg:sticky lg:top-24 h-fit">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
                  Contents
                </p>
                <nav className="space-y-2 text-sm">
                  {post.sections?.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block px-3 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        ) : (
          <article className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            {/* Header Image */}
            <div className="w-full h-64 bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 flex items-center justify-center">
              <BookOpen className="w-24 h-24 text-purple-400 opacity-50" />
            </div>

            {/* Content */}
            <div className="p-12 md:p-22">
              {/* Meta info */}
              <div className="flex items-center gap-3 mb-6">
                <span className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                  {post.category}
                </span>
                {post.readTime && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {post.readTime}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                {post.title}
              </h1>

              {/* Description */}
              <p className="text-xl text-gray-600 mb-6">
                {post.description}
              </p>

              {/* Date and Tags */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-200 mb-8">
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(post.date)}
                </span>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="px-3 py-1 bg-gray-50 text-gray-600 text-sm rounded-md flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Article Content */}
              <div className="article-content">
                {renderContent(post.content)}
              </div>

              {/* Footer */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigate('/blog')}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    All posts
                  </button>
                  <div className="text-sm text-gray-500">
                    Published {formatDate(post.date)}
                  </div>
                </div>
              </div>
            </div>
          </article>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <span className="text-gray-900 font-semibold">Sendly</span>
            </div>
            <div className="text-sm text-gray-500">
              © 2025 Sendly. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {activeImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-white rounded-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className="absolute right-4 top-4 z-10 bg-white/90 text-gray-700 rounded-full px-3 py-1 text-sm hover:bg-white"
            >
              Close
            </button>
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="w-full max-h-[75vh] object-contain bg-gray-900"
            />
            <div className="p-4 text-sm text-gray-600">{activeImage.caption}</div>
          </div>
        </div>
      )}
    </div>
  );
}
