import { useState, useEffect } from "react";
import { Link } from "react-router";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { format } from "date-fns";
import { Clock, TrendingUp, MessageSquare, Heart, User as UserIcon } from "lucide-react";
import { BlogCardSkeleton, TrendingBlogSkeleton } from "../components/Skeleton";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [trendingBlogs, setTrendingBlogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch categories
        const categoriesQuery = query(collection(db, "categories"), orderBy("createdAt", "desc"));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        setCategories(categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch trending blogs
        const trendingQ = query(
          collection(db, "blogs"),
          orderBy("views", "desc")
        );
        const trendingSnapshot = await getDocs(trendingQ);
        const trendingData = trendingSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((blog: any) => blog.status === "published")
          .slice(0, 3);
        setTrendingBlogs(trendingData);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "blogs"),
          orderBy("createdAt", "desc"),
          limit(100)
        );

        const snapshot = await getDocs(q);
        let data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        
        // Filter by status client-side to avoid composite index requirement
        data = data.filter((blog: any) => blog.status === "published");

        if (selectedCategory) {
          data = data.filter((blog: any) => blog.category === selectedCategory);
        }

        setBlogs(data.slice(0, 10));
      } catch (error) {
        console.error("Error fetching blogs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, [selectedCategory]);

  const calculateReadingTime = (text: string) => {
    if (!text) return 1;
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  if (loading) {
    return (
      <div className="space-y-12">
        <section className="text-center py-12 sm:py-20">
          <div className="h-16 w-3/4 mx-auto bg-gray-200 dark:bg-gray-800 rounded-xl mb-6 animate-pulse" />
          <div className="h-6 w-1/2 mx-auto bg-gray-200 dark:bg-gray-800 rounded-lg mb-8 animate-pulse" />
          <div className="h-12 w-40 mx-auto bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
        </section>

        <section className="mb-16">
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-8 animate-pulse" />
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <TrendingBlogSkeleton key={i} />
            ))}
          </div>
        </section>

        <section>
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-8 animate-pulse" />
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <BlogCardSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="text-center py-12 sm:py-20">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
          Write, read, and connect
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          A modern publishing platform for developers, designers, and creators.
        </p>
        <Link
          to={user ? "/create" : "/register"}
          className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Start writing
        </Link>
      </section>

      <section className="mb-16">
        <div className="flex items-center gap-2 mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          <h2 className="text-2xl font-bold">Trending Posts</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {trendingBlogs.map((blog, index) => (
            <Link key={blog.id} to={`/blog/${blog.slug}`} className="flex items-start gap-4 group">
              <span className="text-4xl font-bold text-gray-200 dark:text-gray-800 group-hover:text-indigo-100 dark:group-hover:text-indigo-900/30 transition-colors">
                0{index + 1}
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 mb-1">
                  {blog.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{blog.authorName || "Anonymous"}</span>
                  <span>•</span>
                  <span>{blog.createdAt ? format(new Date(blog.createdAt), "MMM d") : ""}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            <h2 className="text-2xl font-bold">Latest Posts</h2>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === null
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.name
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
            <article key={blog.id} className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {blog.category || "General"}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {blog.createdAt ? format(new Date(blog.createdAt), "MMM d, yyyy") : "Unknown date"} • {calculateReadingTime(blog.content || "")} min read
                  </span>
                </div>
                <Link to={`/blog/${blog.slug}`} className="group block mb-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2">
                    {blog.title}
                  </h3>
                </Link>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 flex-1">
                  {blog.content ? blog.content.substring(0, 150).replace(/[#*`_]/g, "") : ""}...
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      {blog.authorImage ? (
                        <img src={blog.authorImage} alt={blog.authorName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-500"><UserIcon className="h-5 w-5" /></div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {blog.authorName || "Anonymous"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-sm">
                    <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {blog.likes || 0}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> {blog.commentsCount || 0}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        {blogs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No posts published yet. Be the first!
          </div>
        )}
      </section>
    </div>
  );
}
