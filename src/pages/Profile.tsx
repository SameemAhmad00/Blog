import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { format } from "date-fns";
import { User as UserIcon, Calendar, BookOpen, LayoutDashboard, Settings as SettingsIcon, UserCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Dashboard from "./Dashboard";
import Settings from "./Settings";
import { ProfileSkeleton } from "../components/Skeleton";

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isOwnProfile = user?.uid === id;
  const activeTab = isOwnProfile ? (searchParams.get("tab") || "profile") : "profile";

  const [userProfile, setUserProfile] = useState<any>(null);
  const [userBlogs, setUserBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndBlogs = async () => {
      try {
        if (!id) return;
        
        // Fetch user profile
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists()) {
          setUserProfile({ id: userDoc.id, ...userDoc.data() });
        }

        // Fetch user's published blogs
        const q = query(
          collection(db, "blogs"),
          where("authorId", "==", id)
        );
        const snapshot = await getDocs(q);
        const blogsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((blog: any) => blog.status === "published")
          .sort((a: any, b: any) => b.createdAt - a.createdAt);
        setUserBlogs(blogsData);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndBlogs();
  }, [id]);

  const calculateReadingTime = (text: string) => {
    if (!text) return 1;
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!userProfile) {
    return <div className="text-center py-20 text-gray-500">User not found</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
        <div className="mx-auto h-32 w-32 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden mb-6 border-4 border-white dark:border-gray-950 shadow-lg">
          {userProfile.profileImage ? (
            <img src={userProfile.profileImage} alt={userProfile.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-500"><UserIcon className="h-16 w-16" /></div>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{userProfile.name}</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-6">
          {userProfile.bio || "This user hasn't added a bio yet."}
        </p>
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Joined {userProfile.createdAt ? format(new Date(userProfile.createdAt), "MMMM yyyy") : "Unknown date"}
          </span>
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {userBlogs.length} Published Stories
          </span>
        </div>
      </div>

      {/* Tabs */}
      {isOwnProfile && (
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setSearchParams({ tab: "profile" })}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === "profile"
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <UserCircle className="h-5 w-5" />
              Public Profile
            </button>
            <button
              onClick={() => setSearchParams({ tab: "dashboard" })}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === "dashboard"
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </button>
            <button
              onClick={() => setSearchParams({ tab: "settings" })}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === "settings"
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <SettingsIcon className="h-5 w-5" />
              Settings
            </button>
          </nav>
        </div>
      )}

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === "profile" && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-4">
              Latest Stories by {userProfile.name}
            </h2>
            
            <div className="grid gap-8 md:grid-cols-2">
              {userBlogs.length === 0 ? (
                <p className="text-gray-500 col-span-2 text-center py-8">No published stories yet.</p>
              ) : (
                userBlogs.map((blog) => (
                  <article key={blog.id} className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {blog.category || "General"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
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
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}

        {isOwnProfile && activeTab === "dashboard" && (
          <Dashboard />
        )}

        {isOwnProfile && activeTab === "settings" && (
          <Settings />
        )}
      </div>
    </div>
  );
}
