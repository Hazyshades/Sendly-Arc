import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, BookOpen, Calendar, ArrowRight, Tag, Clock } from 'lucide-react';

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tags: string[];
  image?: string;
  readTime?: string;
}

const blogPosts: BlogPost[] = [
  {
    slug: 'testnet',
    title: 'Testnet Tutorial: How to work with Sendly',
    description: '',
    date: '2026-01-07',
    category: 'Tutorial',
    tags: ['Testnet', 'Tutorial', 'ARC'],
    readTime: '5 min'
  },
  {
    slug: 'privy_results',
    title: 'Privy testnet results: metrics, methodology, and takeaways',
    description:
      'Testnet metrics, the Privy + OAuth token workflow, how we verify data, and main practical takeaways.',
    date: '2026-02-10',
    category: 'Technology',
    tags: ['Privy', 'OAuth', 'Testnet'],
    readTime: '8 min'
  }
];

const categories = ['All', 'Announcements', 'Features', 'Technology', 'Tutorial', 'Security'];

export function BlogRoute() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredPosts = selectedCategory === 'All' 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen" style={{ 
      background: 'linear-gradient(135deg, #fef2f2 0%, #e0e7ff 100%)'
    }}>
      {/* Simple Header */}
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
              to="/" 
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
            >
              ← Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Blog Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            Blog
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            News, updates and guides for Sendly
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {filteredPosts.map((post) => (
            <Link 
              key={post.slug} 
              to={`/blog/${post.slug}`}
              className="group"
            >
              <article className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col border border-gray-100">
                {/* Image placeholder */}
                <div className="w-full h-48 bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-purple-400 opacity-50" />
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  {/* Meta info */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                      {post.category}
                    </span>
                    {post.readTime && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {post.title}
                  </h2>

                  {/* Date */}
                  <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(post.date)}
                  </p>

                  {/* Description */}
                  <p className="text-gray-600 mb-4 line-clamp-3 flex-1">
                    {post.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 2).map((tag) => (
                        <span 
                          key={tag}
                          className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md flex items-center gap-1"
                        >
                          <Tag className="w-2 h-2" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-purple-600 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">
              No posts in this category yet
            </p>
          </div>
        )}

  
       
      </main>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            
            <div className="text-sm text-gray-500">
              © 2026 Sendly. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
