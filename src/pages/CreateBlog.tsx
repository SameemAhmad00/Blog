import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import slugify from "slugify";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Image as ImageIcon, Loader2 } from "lucide-react";

export default function CreateBlog() {
  const { id } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }

    const fetchInitialData = async () => {
      try {
        // Fetch categories
        const categoriesQuery = query(collection(db, "categories"), orderBy("createdAt", "desc"));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setCategories(categoriesData);
        
        if (categoriesData.length > 0 && !category) {
          setCategory(categoriesData[0].name);
        }

        if (id && user) {
          const docRef = doc(db, "blogs", id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.authorId !== user.uid && profile?.role !== "admin") {
              toast.error("You don't have permission to edit this blog");
              navigate("/dashboard");
              return;
            }
            setTitle(data.title);
            setContent(data.content);
            setCategory(data.category || (categoriesData.length > 0 ? categoriesData[0].name : ""));
            setTags(data.tags?.join(", ") || "");
          } else {
            toast.error("Blog not found");
            navigate("/dashboard");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchInitialData();
    }
  }, [id, user, authLoading, navigate, profile]);

  const handleSave = async (status: "draft" | "published") => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    setSaving(true);
    try {
      const blogId = id || doc(collection(db, "blogs")).id;
      const slug = slugify(title, { lower: true, strict: true }) + "-" + Math.random().toString(36).substring(2, 8);
      
      const blogData: any = {
        id: blogId,
        title,
        content,
        authorId: user!.uid,
        authorName: profile?.name || user!.displayName || "Anonymous",
        authorImage: profile?.profileImage || user!.photoURL || "",
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        category,
        status,
        updatedAt: Date.now(),
      };

      if (!id) {
        blogData.slug = slug;
        blogData.createdAt = Date.now();
        blogData.views = 0;
        blogData.likes = 0;
        blogData.commentsCount = 0;
      }

      await setDoc(doc(db, "blogs", blogId), blogData, { merge: true });
      
      toast.success(`Blog ${status === "published" ? "published" : "saved as draft"} successfully!`);
      navigate(`/profile/${user!.uid}?tab=dashboard`);
    } catch (error: any) {
      console.error("Error saving blog:", error);
      toast.error(error.message || "Failed to save blog");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {id ? "Edit Story" : "Write a Story"}
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPreview(!isPreview)}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            {isPreview ? "Edit" : "Preview"}
          </button>
          <button
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave("published")}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <input
            type="text"
            placeholder="Story Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-4xl font-bold bg-transparent border-none focus:ring-0 placeholder-gray-300 dark:placeholder-gray-700 text-gray-900 dark:text-white px-0"
          />

          {isPreview ? (
            <div className="prose prose-lg dark:prose-invert max-w-none min-h-[500px] p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {content || "*Nothing to preview yet...*"}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              placeholder="Tell your story... (Markdown supported)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[500px] p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y font-mono text-sm"
            />
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {categories.length === 0 ? (
                  <option value="">No categories available</option>
                ) : (
                  categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="react, javascript, webdev"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
