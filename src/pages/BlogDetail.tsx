import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { collection, query, where, getDocs, doc, updateDoc, increment, addDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Heart, MessageSquare, Share2, Bookmark, User as UserIcon, Trash2, Edit, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { Helmet } from "react-helmet-async";
import { ConfirmationModal } from "../components/Modal";
import { BlogDetailSkeleton } from "../components/Skeleton";

export default function BlogDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [blog, setBlog] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const q = query(collection(db, "blogs"), where("slug", "==", slug));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const docData = snapshot.docs[0];
          const data = { id: docData.id, ...docData.data() };
          setBlog(data);
          
          // Increment views
          await updateDoc(doc(db, "blogs", data.id), {
            views: increment(1)
          });

          // Fetch comments realtime
          const commentsQuery = query(
            collection(db, "comments"),
            where("blogId", "==", data.id)
          );
          
          const unsubscribe = onSnapshot(commentsQuery, (querySnapshot) => {
            const commentsData = querySnapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data()
              }))
              .sort((a: any, b: any) => b.createdAt - a.createdAt);
            setComments(commentsData);
          });

          return () => unsubscribe();
        } else {
          toast.error("Blog not found");
        }
      } catch (error) {
        console.error("Error fetching blog:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchBlog();
  }, [slug]);

  const handleLike = async () => {
    if (!user) {
      toast.error("Please login to like");
      return;
    }
    if (hasLiked) return;

    try {
      await updateDoc(doc(db, "blogs", blog.id), {
        likes: increment(1)
      });
      setBlog({ ...blog, likes: (blog.likes || 0) + 1 });
      setHasLiked(true);
      toast.success("Liked!");
    } catch (error) {
      console.error("Error liking blog:", error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to comment");
      return;
    }
    if (!newComment.trim()) return;

    try {
      await addDoc(collection(db, "comments"), {
        blogId: blog.id,
        userId: user.uid,
        userName: profile?.name || user.displayName || "Anonymous",
        userImage: profile?.profileImage || user.photoURL || "",
        comment: newComment,
        createdAt: Date.now(),
        likes: 0
      });
      
      await updateDoc(doc(db, "blogs", blog.id), {
        commentsCount: increment(1)
      });
      
      setNewComment("");
      toast.success("Comment added");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: blog.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "blogs", blog.id));
      toast.success("Story deleted successfully");
      navigate(`/profile/${user?.uid}?tab=dashboard`);
    } catch (error) {
      console.error("Error deleting blog:", error);
      toast.error("Failed to delete story");
    }
  };

  const calculateReadingTime = (text: string) => {
    if (!text) return 1;
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  if (loading) {
    return <BlogDetailSkeleton />;
  }

  if (!blog) {
    return <div className="text-center py-20 text-gray-500">Blog not found</div>;
  }

  const readingTime = calculateReadingTime(blog.content || "");
  const excerpt = blog.content ? blog.content.substring(0, 160).replace(/[#*`_]/g, "") + "..." : "Read this amazing blog post on Fav Animals.";
  const currentUrl = window.location.href;

  return (
    <article className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <Helmet>
        <title>{blog.title} | Fav Animals</title>
        <meta name="description" content={excerpt} />
      </Helmet>

      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
            {blog.category || "General"}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {blog.createdAt ? format(new Date(blog.createdAt), "MMMM d, yyyy") : "Unknown date"}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            • {readingTime} min read
          </span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-8">
          {blog.title}
        </h1>

        <div className="flex items-center justify-between">
          <Link to={`/profile/${blog.authorId}`} className="flex items-center gap-3 group">
            <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden ring-2 ring-white dark:ring-gray-900">
              {blog.authorImage ? (
                <img src={blog.authorImage} alt={blog.authorName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500"><UserIcon /></div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                {blog.authorName || "Anonymous"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Author</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-3">
            {user?.uid === blog.authorId && (
              <>
                <Link to={`/edit/${blog.id}`} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  <Edit className="h-5 w-5" />
                </Link>
                <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            )}
            <button onClick={handleShare} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="prose prose-lg dark:prose-invert max-w-none prose-img:rounded-2xl prose-a:text-indigo-600 dark:prose-a:text-indigo-400 mb-12">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {blog.content}
        </ReactMarkdown>
      </div>

      <div className="flex items-center gap-6 py-8 border-y border-gray-100 dark:border-gray-800 mb-12">
        <button onClick={handleLike} className={`flex items-center gap-2 text-sm font-semibold ${hasLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400'} transition-colors`}>
          <Heart className={`h-6 w-6 ${hasLiked ? 'fill-current' : ''}`} />
          <span>{blog.likes || 0} Likes</span>
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
          <MessageSquare className="h-6 w-6" />
          <span>{blog.commentsCount || 0} Responses</span>
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Responses ({comments.length})</h3>
        
        {user ? (
          <form onSubmit={handleComment} className="flex gap-4">
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
              {profile?.profileImage ? (
                <img src={profile.profileImage} alt={profile.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500"><UserIcon className="h-5 w-5" /></div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="What are your thoughts?"
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white min-h-[100px] resize-y"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Post Response
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">You must be logged in to leave a comment.</p>
            <Link to="/login" className="inline-flex rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Log in to comment
            </Link>
          </div>
        )}

        <div className="space-y-8 pt-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-4">
              <Link to={`/profile/${comment.userId}`} className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                {comment.userImage ? (
                  <img src={comment.userImage} alt={comment.userName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-500"><UserIcon className="h-5 w-5" /></div>
                )}
              </Link>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <Link to={`/profile/${comment.userId}`} className="font-semibold text-gray-900 dark:text-white hover:underline">
                    {comment.userName}
                  </Link>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {comment.createdAt ? format(new Date(comment.createdAt), "MMM d, yyyy") : "Just now"}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{comment.comment}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Story"
        confirmText="Delete"
        confirmVariant="danger"
      >
        Are you sure you want to delete this story? This action cannot be undone.
      </ConfirmationModal>
    </article>
  );
}
