import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { format, subDays, subMonths, subYears } from "date-fns";
import { Clock, Search as SearchIcon, Filter, Heart, MessageSquare } from "lucide-react";
import { BlogCardSkeleton } from "../components/Skeleton";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "";
  const initialTag = searchParams.get("tag") || "";
  const initialDate = searchParams.get("date") || "all";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [tag, setTag] = useState(initialTag);
  const [dateRange, setDateRange] = useState(initialDate);
  
  const [blogs, setBlogs] = useState<any[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesQuery = query(collection(db, "categories"), orderBy("createdAt", "desc"));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        setCategories(categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchBlogs();
  }, [category, tag, dateRange]);

  useEffect(() => {
    // Client-side filtering for search query
    if (searchQuery.trim() === "") {
      setFilteredBlogs(blogs);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = blogs.filter(
        (blog) =>
          blog.title?.toLowerCase().includes(lowerQuery) ||
          blog.content?.toLowerCase().includes(lowerQuery)
      );
      setFilteredBlogs(filtered);
    }
  }, [searchQuery, blogs]);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      data = data.filter((blog: any) => blog.status === "published");

      if (category) {
        data = data.filter((blog: any) => blog.category === category);
      }

      if (tag) {
        data = data.filter((blog: any) => blog.tags?.includes(tag));
      }

      if (dateRange !== "all") {
        let fromDate = new Date();
        if (dateRange === "week") fromDate = subDays(new Date(), 7);
        else if (dateRange === "month") fromDate = subMonths(new Date(), 1);
        else if (dateRange === "year") fromDate = subYears(new Date(), 1);
        
        data = data.filter((blog: any) => blog.createdAt >= fromDate.getTime());
      }
      
      setBlogs(data);
    } catch (error) {
      console.error("Error fetching blogs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({
      ...(searchQuery && { q: searchQuery }),
      ...(category && { category }),
      ...(tag && { tag }),
      ...(dateRange !== "all" && { date: dateRange }),
    });
  };

  const calculateReadingTime = (text: string) => {
    if (!text) return 1;
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Search Stories
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Find exactly what you're looking for by title, category, or tags.
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-4 border border-gray-300 dark:border-gray-700 rounded-full leading-5 bg-white dark:bg-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow shadow-sm hover:shadow-md dark:text-white"
            placeholder="Search by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="absolute inset-y-2 right-2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Tag
              </label>
              <input
                type="text"
                placeholder="e.g. react"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Date
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Time</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
              </select>
            </div>
          </div>
        )}
      </form>

      <div className="pt-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-800 pb-2">
          {loading ? "Searching..." : `${filteredBlogs.length} Results`}
        </h2>

        {loading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <BlogCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No stories found matching your criteria.
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredBlogs.map((blog) => (
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
        )}
      </div>
    </div>
  );
}
